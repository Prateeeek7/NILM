from fastapi import APIRouter, Query, HTTPException
from typing import Optional, Tuple
from datetime import datetime, timedelta
import logging

from app.config import settings
from app.models.schemas import SensorReading, HistoricalDataRequest

router = APIRouter(prefix="/api/v1/data", tags=["data"])
logger = logging.getLogger(__name__)

# Function to get data_collector (to avoid circular imports)
def get_data_collector():
    """Get the global data_collector instance"""
    from app.main import data_collector
    return data_collector

# Lazy InfluxDB client initialization
_influx_client = None
_query_api = None
_influxdb_available = False
_last_influxdb_check = None
_last_warning_time = None

def get_influxdb_client() -> Tuple[Optional[object], Optional[object]]:
    """Lazy initialization of InfluxDB client with throttled warnings"""
    global _influx_client, _query_api, _influxdb_available, _last_influxdb_check, _last_warning_time
    
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
    except Exception as e:
        _influxdb_available = False
        _last_influxdb_check = datetime.now()
        
        # Throttle warnings - only log once every 60 seconds
        now = datetime.now()
        if _last_warning_time is None or (now - _last_warning_time).total_seconds() >= 60:
            logger.debug(f"InfluxDB not available: {str(e)}")
            _last_warning_time = now
        
        return None, None


@router.get("/realtime")
async def get_realtime_data(device_id: Optional[str] = None):
    """Get latest sensor reading"""
    influx_client, query_api = get_influxdb_client()
    
    if not influx_client or not query_api:
        # Return mock data if InfluxDB is not available (no logging - already throttled)
        return {
            "device_id": device_id or "NILM_ESP32_001",
            "timestamp": int(datetime.now().timestamp() * 1000),
            "current": 0.0,
            "voltage": 12.0,
            "power": 0.0
        }
    
    try:
        query = f'''
        from(bucket: "{settings.INFLUXDB_BUCKET}")
          |> range(start: -1m)
          |> filter(fn: (r) => r._measurement == "sensor_reading")
          |> filter(fn: (r) => r._field == "current" or r._field == "voltage" or r._field == "power")
        '''
        
        if device_id:
            query += f'|> filter(fn: (r) => r.device_id == "{device_id}")'
        
        query += '''
          |> last()
        '''
        
        result = query_api.query(query)
        
        data = {
            "device_id": device_id or "unknown",
            "timestamp": int(datetime.now().timestamp() * 1000),
            "current": 0.0,
            "voltage": 0.0,
            "power": 0.0
        }
        
        for table in result:
            for record in table.records:
                field = record.get_field()
                value = record.get_value()
                if value is not None:
                    data[field] = float(value)
                if 'device_id' in record.values:
                    data['device_id'] = record.values['device_id']
                if record.get_time():
                    data['timestamp'] = int(record.get_time().timestamp() * 1000)
        
        return data
        
    except Exception:
        # Return mock data if query fails (no logging - already handled)
        return {
            "device_id": device_id or "NILM_ESP32_001",
            "timestamp": int(datetime.now().timestamp() * 1000),
            "current": 0.0,
            "voltage": 12.0,
            "power": 0.0
        }


@router.get("/historical")
async def get_historical_data(
    start_time: datetime = Query(..., description="Start time (ISO format)"),
    end_time: datetime = Query(..., description="End time (ISO format)"),
    device_id: Optional[str] = Query(None, description="Device ID filter"),
    limit: int = Query(1000, ge=1, le=10000, description="Maximum number of records")
):
    """Get historical sensor data"""
    influx_client, query_api = get_influxdb_client()
    
    if not influx_client or not query_api:
        # Return empty data if InfluxDB is not available (no logging - already throttled)
        return {
            "count": 0,
            "data": [],
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        }
    
    try:
        query = f'''
        from(bucket: "{settings.INFLUXDB_BUCKET}")
          |> range(start: {start_time.isoformat()}, stop: {end_time.isoformat()})
          |> filter(fn: (r) => r._measurement == "sensor_reading")
          |> filter(fn: (r) => r._field == "current" or r._field == "voltage" or r._field == "power")
        '''
        
        if device_id:
            query += f'|> filter(fn: (r) => r.device_id == "{device_id}")'
        
        query += f'''
          |> limit(n: {limit})
          |> sort(columns: ["_time"])
        '''
        
        result = query_api.query(query)
        
        readings = []
        current_record = {}
        
        for table in result:
            for record in table.records:
                time = record.get_time()
                field = record.get_field()
                value = record.get_value()
                device = record.values.get('device_id', device_id or 'unknown')
                
                # Group by timestamp
                timestamp_key = int(time.timestamp() * 1000)
                
                if timestamp_key not in [r.get('timestamp') for r in readings]:
                    current_record = {
                        'device_id': device,
                        'timestamp': timestamp_key,
                        'current': 0.0,
                        'voltage': 0.0,
                        'power': 0.0
                    }
                    readings.append(current_record)
                else:
                    current_record = next(r for r in readings if r['timestamp'] == timestamp_key)
                
                if value is not None:
                    current_record[field] = float(value)
        
        return {
            "count": len(readings),
            "data": readings,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        }
        
    except Exception:
        # Return empty data if query fails (no logging - already handled)
        return {
            "count": 0,
            "data": [],
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat()
        }


@router.get("/status")
async def get_device_status(device_id: Optional[str] = Query(None, description="Device ID to check (optional)")):
    """Get ESP32 device connection status"""
    collector = get_data_collector()
    
    if not collector:
        return {
            "mqtt_connected": False,
            "message": "Data collector not initialized",
            "devices": []
        }
    
    try:
        status = collector.get_device_status(device_id)
        return status
    except Exception as e:
        logger.error(f"Error getting device status: {e}")
        return {
            "mqtt_connected": False,
            "error": str(e),
            "devices": []
        }

