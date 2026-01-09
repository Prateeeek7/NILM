# ESP32 NILM Firmware

Firmware for ESP32-S WROOM to collect current, voltage, and power data from INA219 sensor and publish to MQTT broker.

## Hardware Setup

See main project README for detailed wiring instructions.

## Configuration

1. Edit `src/wifi_config.h`:
   - Set your WiFi SSID and password
   - Set MQTT broker IP address and port
   - Configure MQTT credentials if needed

2. Edit `src/main.cpp`:
   - Change `DEVICE_ID` if you have multiple devices

## Building and Uploading

### Using PlatformIO

```bash
cd hardware/esp32
pio run -t upload
pio device monitor
```

### Using Arduino IDE

1. Install ESP32 board support
2. Install required libraries:
   - PubSubClient
   - ArduinoJson
3. Open `src/main.cpp` and upload

## MQTT Topics

- **Publish**: `nilm/sensor/{DEVICE_ID}` - Sensor data (JSON)
- **Subscribe**: `nilm/command/{DEVICE_ID}` - Commands (future use)

## Data Format

```json
{
  "device_id": "NILM_ESP32_001",
  "timestamp": 12345678,
  "current": 0.523,
  "voltage": 12.05,
  "power": 6.30
}
```

## Troubleshooting

- **INA219 not detected**: Check I2C connections (SDA/SCL) and power
- **WiFi connection fails**: Verify SSID and password
- **MQTT connection fails**: Check broker IP and network connectivity
- **No data**: Verify INA219 is connected in series with load circuit





