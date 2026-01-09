# NILM DC System - Non-Intrusive Load Monitoring

An industry-level AI-powered system for identifying and monitoring DC electrical loads using a single sensor point. This system uses machine learning to recognize different load types (fan, motor, bulb, etc.) from aggregated current and power measurements.

> **🏆 Hackathon Project**  
> This project was built under the **ANRF Sponsored Green Energy Hackathon - IoT for Smart Energy**, conducted by the **School of Electrical Engineering (SELECT), Vellore Institute of Technology, Vellore** on **08.01.2026 - 09.01.2026**.

## 🎯 Project Overview

This project implements a complete NILM (Non-Intrusive Load Monitoring) system for DC loads, featuring:

- **Hardware**: ESP32-S WROOM with INA219 current sensor
- **Backend**: FastAPI with real-time data processing and ML inference
- **Frontend**: React TypeScript dashboard with live monitoring
- **ML Pipeline**: scikit-learn Random Forest classifier
- **Data Storage**: InfluxDB time-series database
- **Real-time Communication**: MQTT and WebSocket

## 🏗️ Architecture

```
Hardware (ESP32 + INA219) 
    ↓ MQTT
MQTT Broker (Mosquitto)
    ↓
Data Collector Service
    ↓
InfluxDB (Time-Series Storage)
    ↓
ML Inference Service
    ↓
FastAPI REST API + WebSocket
    ↓
React Dashboard
```

## 📋 Prerequisites

### Hardware Components
- ESP32-S WROOM-32
- INA219 I2C Current/Power Sensor
- LM2596 DC-DC Buck Converter (3A)
- 10µF Electrolytic Capacitor (25V)
- 1N4148 Zener Diode
- 100kΩ Resistor (x2)
- 0.001µF Capacitor
- 12V DC Power Supply
- DC Loads (fan, motor, 12V bulb)

### Software Requirements
- Docker and Docker Compose
- Python 3.10+ (for local development)
- Node.js 18+ (for frontend development)
- PlatformIO (for ESP32 firmware)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd NILM
```

### 2. Configure ESP32 Firmware

Edit `hardware/esp32/src/wifi_config.h`:
```cpp
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_BROKER = "YOUR_MQTT_BROKER_IP";  // e.g., "192.168.1.100"
```

### 3. Start Services with Docker

```bash
docker-compose up -d
```

This starts:
- Mosquitto MQTT broker (port 1883)
- InfluxDB (port 8086)
- Backend API (port 8000)
- Frontend dashboard (port 3000)

### 4. Access the Dashboard

Open your browser to: `http://localhost:3000`

### 5. Upload ESP32 Firmware

```bash
cd hardware/esp32
pio run -t upload
pio device monitor
```

## 🧪 ML Model Training

### 1. Collect Training Data

```bash
python ml-training/scripts/collect_training_data.py \
  --influxdb-url http://localhost:8086 \
  --token your_token \
  --org nilm_org \
  --bucket nilm_data \
  --start-time "2024-01-01T00:00:00" \
  --end-time "2024-01-01T23:59:59" \
  --output data/raw/training_data.json
```

### 2. Label Data

Create a labels file (`labels.json`):
```json
[
  {
    "start_time": "2024-01-01T10:00:00",
    "end_time": "2024-01-01T10:05:00",
    "label": "fan"
  },
  {
    "start_time": "2024-01-01T10:10:00",
    "end_time": "2024-01-01T10:15:00",
    "label": "motor"
  }
]
```

Then label the data:
```bash
python ml-training/scripts/label_data.py \
  --raw-data data/raw/training_data.json \
  --labels labels.json \
  --output data/labeled/training_data.json
```

### 3. Train Model

```bash
python ml-training/scripts/train_model.py \
  --data data/labeled/training_data.json \
  --output backend/app/ml/models/load_classifier.pkl \
  --n-estimators 100
```

## 🔧 Configuration

### Environment Variables

Backend configuration (`.env` or `docker-compose.yml`):
- `MQTT_BROKER_HOST` - MQTT broker address
- `INFLUXDB_URL` - InfluxDB URL
- `INFLUXDB_TOKEN` - InfluxDB authentication token
- `ML_MODEL_PATH` - Path to trained model file

### InfluxDB Setup

1. Access InfluxDB UI: `http://localhost:8086`
2. Login with:
   - Username: `admin`
   - Password: `adminpassword`
3. Create bucket: `nilm_data` (if not auto-created)
4. Get API token from UI

## 📊 Features

### Dashboard
- Real-time sensor readings (current, voltage, power)
- Live load identification with confidence scores
- Historical energy consumption charts
- Energy breakdown by load type
- Cost estimation

### API Endpoints
- `GET /api/v1/data/realtime` - Latest sensor reading
- `GET /api/v1/data/historical` - Historical data query
- `GET /api/v1/predictions/live` - Current load predictions
- `GET /api/v1/analytics/energy` - Energy breakdown
- `GET /api/v1/analytics/cost` - Cost estimation
- `WebSocket /ws` - Real-time data stream

## 🛠️ Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing

### Test MQTT Connection

```bash
# Subscribe to sensor data
mosquitto_sub -h localhost -t "nilm/sensor/#"

# Publish test message
mosquitto_pub -h localhost -t "nilm/sensor/test" -m '{"device_id":"test","timestamp":123456,"current":0.5,"voltage":12.0,"power":6.0}'
```

### Test API

```bash
# Health check
curl http://localhost:8000/health

# Get realtime data
curl http://localhost:8000/api/v1/data/realtime
```

## 📈 Performance

- **Sampling Rate**: 10 Hz (configurable)
- **Prediction Latency**: < 500ms
- **Accuracy**: > 90% (with trained model)
- **Scalability**: Supports multiple ESP32 devices

## 🔒 Security

For production deployment:
- Enable MQTT authentication
- Use HTTPS for API
- Secure InfluxDB with proper tokens
- Implement API authentication
- Use environment variables for secrets


## 👥 Contributors

- [Ankit Ray](https://github.com/00Ankit00)
- [Tahkur Chand Choudhary](https://github.com/ThakurJandu-8)
- Naman Jain
- Nirbhay Mehta

## 🙏 Acknowledgments

- INA219 sensor library
- FastAPI framework
- React and TypeScript communities





