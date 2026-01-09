import json
import logging
import paho.mqtt.client as mqtt
from typing import Callable, Optional, Dict
from datetime import datetime, timedelta
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from threading import Lock

from app.config import settings

logger = logging.getLogger(__name__)


class DataCollector:
    """Collects sensor data from MQTT and stores in InfluxDB"""
    
    def __init__(self, on_event_detected: Optional[Callable] = None):
        self.mqtt_client = None
        self.influx_client = None
        self.write_api = None
        self.on_event_detected = on_event_detected
        self.last_current = 0.0
        self.baseline_current = 0.0
        # Device status tracking: {device_id: {last_seen, wifi_info}}
        self.device_status: Dict[str, dict] = {}
        self.device_status_lock = Lock()
        self.mqtt_connected = False
        
    def connect_mqtt(self):
        """Connect to MQTT broker"""
        self.mqtt_client = mqtt.Client(client_id="nilm_data_collector")
        
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.mqtt_client.username_pw_set(
                settings.MQTT_USERNAME, 
                settings.MQTT_PASSWORD
            )
        
        self.mqtt_client.on_connect = self._on_connect
        self.mqtt_client.on_message = self._on_message
        self.mqtt_client.on_disconnect = self._on_disconnect
        
        try:
            self.mqtt_client.connect(
                settings.MQTT_BROKER_HOST,
                settings.MQTT_BROKER_PORT,
                60
            )
            self.mqtt_client.loop_start()
            logger.info("Connected to MQTT broker")
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            raise
    
    def connect_influxdb(self):
        """Connect to InfluxDB"""
        try:
            self.influx_client = InfluxDBClient(
                url=settings.INFLUXDB_URL,
                token=settings.INFLUXDB_TOKEN,
                org=settings.INFLUXDB_ORG
            )
            self.write_api = self.influx_client.write_api(write_options=SYNCHRONOUS)
            logger.info("Connected to InfluxDB")
        except Exception as e:
            logger.error(f"Failed to connect to InfluxDB: {e}")
            raise
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback when MQTT connects"""
        if rc == 0:
            self.mqtt_connected = True
            topic = f"{settings.MQTT_TOPIC_PREFIX}/#"
            client.subscribe(topic)
            logger.info(f"Subscribed to MQTT topic: {topic}")
        else:
            self.mqtt_connected = False
            logger.error(f"Failed to connect to MQTT broker, return code {rc}")
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback when MQTT disconnects"""
        self.mqtt_connected = False
        if rc != 0:
            logger.warning(f"MQTT disconnected unexpectedly (rc={rc})")
    
    def _on_message(self, client, userdata, msg):
        """Callback when MQTT message received"""
        try:
            payload = json.loads(msg.payload.decode())
            self._process_sensor_data(payload)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode MQTT message: {e}")
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
    
    def _process_sensor_data(self, data: dict):
        """Process and store sensor data"""
        # Validate data
        required_fields = ['device_id', 'timestamp', 'current', 'voltage', 'power']
        if not all(field in data for field in required_fields):
            logger.warning(f"Invalid sensor data: missing fields")
            return
        
        # Update device status (last seen timestamp and WiFi info)
        device_id = data['device_id']
        with self.device_status_lock:
            wifi_info = {
                'connected': data.get('wifi_connected', False),
                'ssid': data.get('wifi_ssid', ''),
                'rssi': data.get('wifi_rssi', 0),
                'ip': data.get('wifi_ip', '')
            }
            self.device_status[device_id] = {
                'last_seen': datetime.now(),
                'wifi': wifi_info
            }
        
        # Store in InfluxDB
        point = Point("sensor_reading") \
            .tag("device_id", data['device_id']) \
            .field("current", float(data['current'])) \
            .field("voltage", float(data['voltage'])) \
            .field("power", float(data['power'])) \
            .time(int(data['timestamp']), write_precision='ms')
        
        try:
            self.write_api.write(
                bucket=settings.INFLUXDB_BUCKET,
                org=settings.INFLUXDB_ORG,
                record=point
            )
        except Exception as e:
            logger.error(f"Failed to write to InfluxDB: {e}")
        
        # Detect events (ON/OFF transitions)
        current = float(data['current'])
        if abs(current - self.last_current) > settings.EVENT_DETECTION_THRESHOLD:
            event_type = "ON" if current > self.last_current else "OFF"
            logger.info(f"Event detected: {event_type} - Current: {current:.3f}A")
            
            if self.on_event_detected:
                self.on_event_detected({
                    'type': event_type,
                    'current': current,
                    'voltage': float(data['voltage']),
                    'power': float(data['power']),
                    'timestamp': datetime.fromtimestamp(data['timestamp'] / 1000)
                })
        
        self.last_current = current
    
    def start(self):
        """Start data collection"""
        self.connect_influxdb()
        self.connect_mqtt()
        logger.info("Data collector started")
    
    def get_device_status(self, device_id: Optional[str] = None) -> Dict:
        """Get connection status for device(s)"""
        with self.device_status_lock:
            now = datetime.now()
            timeout = timedelta(seconds=30)  # Consider device offline if no data for 30 seconds
            
            if device_id:
                # Single device status
                if device_id in self.device_status:
                    device_data = self.device_status[device_id]
                    last_seen = device_data.get('last_seen', None)
                    wifi_info = device_data.get('wifi', {})
                    is_online = last_seen and (now - last_seen) < timeout
                    return {
                        "device_id": device_id,
                        "online": is_online,
                        "last_seen": last_seen.isoformat() if last_seen else None,
                        "wifi": wifi_info,
                        "mqtt_connected": self.mqtt_connected
                    }
                else:
                    return {
                        "device_id": device_id,
                        "online": False,
                        "last_seen": None,
                        "wifi": {"connected": False, "ssid": "", "rssi": 0, "ip": ""},
                        "mqtt_connected": self.mqtt_connected
                    }
            else:
                # All devices status
                devices = []
                for dev_id, device_data in self.device_status.items():
                    last_seen = device_data.get('last_seen', None)
                    wifi_info = device_data.get('wifi', {})
                    is_online = last_seen and (now - last_seen) < timeout
                    devices.append({
                        "device_id": dev_id,
                        "online": is_online,
                        "last_seen": last_seen.isoformat() if last_seen else None,
                        "wifi": wifi_info
                    })
                return {
                    "mqtt_connected": self.mqtt_connected,
                    "devices": devices
                }
    
    def stop(self):
        """Stop data collection"""
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
        if self.influx_client:
            self.influx_client.close()
        self.mqtt_connected = False
        logger.info("Data collector stopped")

