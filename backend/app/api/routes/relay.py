from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import paho.mqtt.client as mqtt
import json
import logging

from app.config import settings

router = APIRouter(prefix="/api/v1/relay", tags=["relay"])
logger = logging.getLogger(__name__)

# MQTT client for sending commands
_mqtt_client = None

def get_mqtt_client():
    """Get or create MQTT client for sending commands"""
    global _mqtt_client
    if _mqtt_client is None:
        _mqtt_client = mqtt.Client(client_id="nilm_relay_controller")
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            _mqtt_client.username_pw_set(
                settings.MQTT_USERNAME,
                settings.MQTT_PASSWORD
            )
        try:
            _mqtt_client.connect(
                settings.MQTT_BROKER_HOST,
                settings.MQTT_BROKER_PORT,
                60
            )
            _mqtt_client.loop_start()
            logger.info("MQTT client connected for relay control")
        except Exception as e:
            logger.error(f"Failed to connect MQTT client: {e}")
            raise
    return _mqtt_client


class RelayCommand(BaseModel):
    device_id: str = "NILM_ESP32_001"
    relay_ch1: Optional[bool] = None
    relay_ch2: Optional[bool] = None
    toggle_ch1: Optional[bool] = None
    toggle_ch2: Optional[bool] = None
    all_on: Optional[bool] = None
    all_off: Optional[bool] = None


@router.post("/control")
async def control_relay(command: RelayCommand):
    """Send relay control command to ESP32 via MQTT"""
    try:
        client = get_mqtt_client()
        
        # Build command payload
        payload = {}
        if command.relay_ch1 is not None:
            payload["relay_ch1"] = command.relay_ch1
        if command.relay_ch2 is not None:
            payload["relay_ch2"] = command.relay_ch2
        if command.toggle_ch1:
            payload["toggle_ch1"] = True
        if command.toggle_ch2:
            payload["toggle_ch2"] = True
        if command.all_on:
            payload["all_on"] = True
        if command.all_off:
            payload["all_off"] = True
        
        if not payload:
            raise HTTPException(status_code=400, detail="No command specified")
        
        # Publish to command topic
        topic = f"nilm/command/{command.device_id}"
        message = json.dumps(payload)
        
        result = client.publish(topic, message, qos=1)
        
        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to publish MQTT message: {result.rc}"
            )
        
        return {
            "status": "success",
            "device_id": command.device_id,
            "topic": topic,
            "command": payload
        }
        
    except Exception as e:
        logger.error(f"Error controlling relay: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{device_id}")
async def get_relay_status(device_id: str = "NILM_ESP32_001"):
    """Get current relay status from device status endpoint"""
    from app.api.routes.data import get_data_collector
    
    try:
        data_collector = get_data_collector()
        status = data_collector.get_device_status(device_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Device not found")
        
        return {
            "device_id": device_id,
            "online": status.get("online", False),
            "relay_ch1": status.get("relay_ch1", False),
            "relay_ch2": status.get("relay_ch2", False),
        }
    except Exception as e:
        logger.error(f"Error getting relay status: {e}")
        raise HTTPException(status_code=500, detail=str(e))





