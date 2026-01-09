# ESP32-S3 Flashing Guide

## ✅ Pre-Flash Checklist

### 1. Update WiFi Configuration
**File:** `src/wifi_config.h`

**REQUIRED CHANGES:**
```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";        // ← Change this
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // ← Change this
const char* MQTT_BROKER = "192.168.1.100";       // ← Change to your MQTT broker IP
```

**Example:**
```cpp
const char* WIFI_SSID = "MyHomeWiFi";
const char* WIFI_PASSWORD = "MyPassword123";
const char* MQTT_BROKER = "192.168.1.50";  // Your MQTT broker IP
```

### 2. Verify Hardware Connections
Before flashing, ensure:
- [ ] ESP32-S3 is connected via USB
- [ ] INA219 sensor is connected (GPIO 8, 9)
- [ ] Relay module is connected (GPIO 4, 5) - optional for initial test
- [ ] Power supply (LM2596) is set to 3.3V

### 3. Install PlatformIO (if not already installed)

**Option A: VS Code Extension**
1. Open VS Code
2. Install "PlatformIO IDE" extension
3. PlatformIO will install automatically

**Option B: Command Line**
```bash
pip install platformio
```

### 4. Install Dependencies
PlatformIO will automatically install libraries from `platformio.ini`:
- PubSubClient (MQTT)
- ArduinoJson (JSON parsing)

## 🚀 Flashing Steps

### Method 1: Using PlatformIO (Recommended)

1. **Open Project in PlatformIO**
   ```bash
   cd /Users/pratikkumar/Desktop/NILM/hardware/esp32
   ```

2. **Connect ESP32-S3 via USB**

3. **Build the Project**
   ```bash
   pio run
   ```
   Or click the "Build" button in PlatformIO toolbar

4. **Upload to ESP32-S3**
   ```bash
   pio run -t upload
   ```
   Or click the "Upload" button in PlatformIO toolbar

5. **Monitor Serial Output**
   ```bash
   pio device monitor
   ```
   Or click the "Monitor" button in PlatformIO toolbar

### Method 2: Using Arduino IDE

1. **Install ESP32 Board Support**
   - File → Preferences → Additional Board Manager URLs
   - Add: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools → Board → Boards Manager → Search "ESP32" → Install

2. **Select Board**
   - Tools → Board → ESP32 Arduino → ESP32S3 Dev Module

3. **Install Libraries**
   - Sketch → Include Library → Manage Libraries
   - Install: "PubSubClient" by Nick O'Leary
   - Install: "ArduinoJson" by Benoit Blanchon

4. **Configure Board Settings**
   - Tools → USB Speed → 921600
   - Tools → Upload Speed → 921600
   - Tools → CPU Frequency → 240MHz
   - Tools → Flash Size → 4MB (or your board's size)
   - Tools → Partition Scheme → Default 4MB with spiffs

5. **Open and Upload**
   - File → Open → Select `main.cpp`
   - Note: You may need to combine all header files into one file for Arduino IDE
   - Click Upload button

## 📊 Expected Serial Output

After successful upload, you should see:

```
=== NILM ESP32 System Starting ===
INA219 sensor initialized successfully
Relay control initialized
  Channel 1: GPIO 4
  Channel 2: GPIO 5
Connecting to WiFi: YourWiFiName
........
WiFi connected!
IP address: 192.168.1.xxx
Attempting MQTT connection...
MQTT connected!
Subscribed to: nilm/command/NILM_ESP32_001
System ready!
Relay control active - listening for commands
I=0.000A, V=12.00V, P=0.00W
Published sensor data to MQTT
Published relay status to MQTT
```

## 🔧 Troubleshooting

### Upload Fails
- **Check USB cable**: Use a data cable, not charge-only
- **Press BOOT button**: Hold BOOT button while clicking Upload
- **Check COM port**: Verify correct port in PlatformIO/Arduino IDE
- **Try different USB port**: Some ports may not work

### WiFi Connection Fails
- **Check credentials**: Verify SSID and password in `wifi_config.h`
- **Check signal strength**: Ensure ESP32 is within WiFi range
- **Check 2.4GHz**: ESP32 only supports 2.4GHz WiFi (not 5GHz)

### MQTT Connection Fails
- **Check broker IP**: Verify MQTT broker IP address
- **Check broker running**: Ensure MQTT broker (Mosquitto) is running
- **Check network**: Ensure ESP32 and broker are on same network
- **Check firewall**: Ensure port 1883 is not blocked

### INA219 Not Detected
- **Check I2C connections**: Verify GPIO 8 (SDA) and GPIO 9 (SCL)
- **Check pull-up resistors**: Ensure 100kΩ resistors are connected
- **Check power**: Verify INA219 VCC is connected to 3.3V
- **Check address**: Default I2C address is 0x40

### Relay Not Working
- **Check GPIO connections**: Verify GPIO 4 and GPIO 5
- **Check relay VCC**: Ensure relay module has power (3.3V or 5V)
- **Check relay logic**: Some relays are active LOW (inverted)
- **Test with direct GPIO control**: Use simple HIGH/LOW test

## 📝 Post-Flash Verification

1. **Check Serial Monitor**: Should show sensor readings
2. **Check MQTT**: Verify messages on `nilm/sensor/NILM_ESP32_001`
3. **Test Relay Control**: Send MQTT command to `nilm/command/NILM_ESP32_001`
   ```json
   {"relay_ch1": true}
   ```
4. **Check Backend**: Verify backend receives sensor data

## 🎯 Quick Test Commands

**Test Relay Channel 1:**
```bash
mosquitto_pub -h localhost -t "nilm/command/NILM_ESP32_001" -m '{"relay_ch1": true}'
```

**Test Relay Channel 2:**
```bash
mosquitto_pub -h localhost -t "nilm/command/NILM_ESP32_001" -m '{"relay_ch2": true}'
```

**Turn All Relays OFF:**
```bash
mosquitto_pub -h localhost -t "nilm/command/NILM_ESP32_001" -m '{"all_off": true}'
```

## ⚠️ Important Notes

1. **First Time Setup**: Update WiFi credentials BEFORE first flash
2. **Power Supply**: Ensure LM2596 is set to exactly 3.3V before connecting ESP32
3. **GPIO Pins**: Do not use GPIO 4/5 for other purposes (reserved for relays)
4. **I2C Pins**: GPIO 8/9 are for INA219 (do not change)
5. **Device ID**: Can be changed in `main.cpp` if needed

## 📦 File Structure

```
hardware/esp32/
├── platformio.ini          # PlatformIO configuration
├── src/
│   ├── main.cpp            # Main firmware code
│   ├── wifi_config.h       # WiFi & MQTT config (UPDATE THIS!)
│   ├── mqtt_client.h       # MQTT client functions
│   ├── ina219.h            # INA219 sensor library
│   └── relay_control.h      # Relay control library
└── FLASHING_GUIDE.md       # This file
```

## ✅ Ready to Flash!

Once you've updated `wifi_config.h` with your credentials, you're ready to flash!

**Quick Start:**
```bash
cd /Users/pratikkumar/Desktop/NILM/hardware/esp32
pio run -t upload
pio device monitor
```

Good luck! 🚀





