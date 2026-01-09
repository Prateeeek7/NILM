from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Optional
import json
import asyncio
import logging
from datetime import datetime, timedelta

from app.config import settings
from app.services.ml_service import MLService

logger = logging.getLogger(__name__)

# Suppress WebSocket disconnection errors from underlying libraries
logging.getLogger("websockets").setLevel(logging.ERROR)
logging.getLogger("uvicorn.protocols.websockets").setLevel(logging.ERROR)
logging.getLogger("uvicorn.protocols.websockets.websockets_impl").setLevel(logging.ERROR)

# Define normal disconnection exceptions (these are expected and shouldn't be logged)
try:
    from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
    NORMAL_DISCONNECT_EXCEPTIONS = (WebSocketDisconnect, asyncio.CancelledError, ConnectionClosedOK, ConnectionClosedError)
except ImportError:
    # If websockets library exceptions aren't available, just use FastAPI/async exceptions
    NORMAL_DISCONNECT_EXCEPTIONS = (WebSocketDisconnect, asyncio.CancelledError)

# Lazy InfluxDB client initialization
_influx_client = None
_query_api = None
_influxdb_available = False
_last_influxdb_check = None

def get_influxdb_client():
    """Lazy initialization of InfluxDB client"""
    global _influx_client, _query_api, _influxdb_available, _last_influxdb_check
    
    # Check if we should retry (only check every 30 seconds)
    if _last_influxdb_check:
        time_since_check = (datetime.now() - _last_influxdb_check).total_seconds()
        if time_since_check < 30 and not _influxdb_available:
            return None, None
    
    try:
        if _influx_client is None:
            from influxdb_client import InfluxDBClient
            from influxdb_client.client.query_api import QueryApi
            
            _influx_client = InfluxDBClient(
                url=settings.INFLUXDB_URL,
                token=settings.INFLUXDB_TOKEN,
                org=settings.INFLUXDB_ORG,
                timeout=2000  # 2 second timeout
            )
            _query_api = _influx_client.query_api()
        
        # Test connection
        _influx_client.ping()
        _influxdb_available = True
        _last_influxdb_check = datetime.now()
        return _influx_client, _query_api
    except Exception:
        _influxdb_available = False
        _last_influxdb_check = datetime.now()
        # Silently fail - InfluxDB is optional
        return None, None

# ML service
ml_service = MLService()


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except (WebSocketDisconnect, RuntimeError, ConnectionError) as e:
                # Normal disconnection - don't log
                disconnected.append(connection)
            except Exception as e:
                error_str = str(e).lower()
                # Only log unexpected errors
                if not any(phrase in error_str for phrase in [
                    "going away", "no status received", "service restart",
                    "connection closed", "1001", "1005", "1012", "cancelled"
                ]):
                    logger.error(f"Error sending to WebSocket: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, device_id: str = None):
    """WebSocket endpoint for real-time data streaming"""
    await manager.connect(websocket)
    
    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connected",
            "timestamp": datetime.now().isoformat()
        })
        
        # Start streaming data
        while True:
            try:
                # Get InfluxDB client (lazy initialization)
                influx_client, query_api = get_influxdb_client()
                
                # Get latest sensor data
                sensor_data = {
                    "device_id": device_id or "NILM_ESP32_001",
                    "timestamp": datetime.now().isoformat(),
                    "current": 0.0,
                    "voltage": 12.0,
                    "power": 0.0
                }
                
                if influx_client and query_api:
                    try:
                        end_time = datetime.now()
                        start_time = end_time - timedelta(seconds=1)
                        
                        query = f'''
                        from(bucket: "{settings.INFLUXDB_BUCKET}")
                          |> range(start: {start_time.isoformat()}, stop: {end_time.isoformat()})
                          |> filter(fn: (r) => r._measurement == "sensor_reading")
                          |> filter(fn: (r) => r._field == "current" or r._field == "voltage" or r._field == "power")
                        '''
                        
                        if device_id:
                            query += f'|> filter(fn: (r) => r.device_id == "{device_id}")'
                        
                        query += '''
                          |> last()
                        '''
                        
                        result = query_api.query(query)
                        
                        for table in result:
                            for record in table.records:
                                field = record.get_field()
                                value = record.get_value()
                                if value is not None:
                                    sensor_data[field] = float(value)
                    except Exception:
                        # Silently use mock data if query fails
                        pass
                
                # Get prediction if we have enough data
                prediction = None
                if sensor_data['current'] > 0 and influx_client and query_api:
                    try:
                        end_time = datetime.now()
                        # Get recent data window for prediction
                        data_window_query = f'''
                        from(bucket: "{settings.INFLUXDB_BUCKET}")
                          |> range(start: {(end_time - timedelta(seconds=5)).isoformat()}, stop: {end_time.isoformat()})
                          |> filter(fn: (r) => r._measurement == "sensor_reading")
                          |> filter(fn: (r) => r._field == "current" or r._field == "voltage" or r._field == "power")
                        '''
                        
                        if device_id:
                            data_window_query += f'|> filter(fn: (r) => r.device_id == "{device_id}")'
                        
                        data_window_query += '''
                          |> sort(columns: ["_time"])
                        '''
                        
                        window_result = query_api.query(data_window_query)
                        
                        ml_data_window = []
                        current_record = {}
                        
                        for table in window_result:
                            for record in table.records:
                                time = record.get_time()
                                field = record.get_field()
                                value = record.get_value()
                                
                                timestamp_key = int(time.timestamp() * 1000)
                                
                                if timestamp_key not in [r.get('timestamp') for r in ml_data_window]:
                                    current_record = {
                                        'timestamp': timestamp_key,
                                        'current': 0.0,
                                        'voltage': 0.0,
                                        'power': 0.0
                                    }
                                    ml_data_window.append(current_record)
                                else:
                                    current_record = next(r for r in ml_data_window if r['timestamp'] == timestamp_key)
                                
                                if value is not None:
                                    current_record[field] = float(value)
                        
                        if len(ml_data_window) >= 5:
                            ml_window = [
                                {
                                    'current': r['current'],
                                    'voltage': r['voltage'],
                                    'power': r['power']
                                }
                                for r in ml_data_window
                            ]
                            pred = ml_service.predict(ml_window)
                            if pred:
                                prediction = pred.dict()
                    except Exception:
                        # Silently skip prediction if InfluxDB query fails
                        pass
                
                # Send data to client
                message = {
                    "type": "sensor_data",
                    "data": sensor_data,
                    "prediction": prediction,
                    "timestamp": datetime.now().isoformat()
                }
                
                await websocket.send_json(message)
                
                # Wait before next update (1 second)
                await asyncio.sleep(1)
                
            except NORMAL_DISCONNECT_EXCEPTIONS:
                raise  # Re-raise to be caught by outer handler
            except (RuntimeError, ConnectionError) as e:
                # Normal disconnection errors - don't log
                raise WebSocketDisconnect
            except Exception as e:
                error_str = str(e).lower()
                # Only log truly unexpected errors (not disconnections or InfluxDB issues)
                if not any(phrase in error_str for phrase in [
                    "going away", "no status received", "service restart",
                    "connection refused", "influxdb", "connection closed",
                    "1001", "1005", "1012", "cancelled", "websocket"
                ]):
                    logger.error(f"Unexpected WebSocket error: {e}")
                # Check if connection is still open before continuing
                try:
                    await asyncio.sleep(1)
                except asyncio.CancelledError:
                    raise
                
    except NORMAL_DISCONNECT_EXCEPTIONS:
        manager.disconnect(websocket)
        # Normal disconnection or cancellation - no logging needed
    except (RuntimeError, ConnectionError) as e:
        manager.disconnect(websocket)
        # Normal disconnection errors - no logging needed
    except Exception as e:
        error_str = str(e).lower()
        # Only log unexpected errors
        if not any(phrase in error_str for phrase in [
            "going away", "no status received", "service restart",
            "connection refused", "influxdb", "connection closed",
            "1001", "1005", "1012", "cancelled", "websocket"
        ]):
            logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

