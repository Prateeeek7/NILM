# API Documentation

Complete API reference for the NILM DC System backend.

## Base URL

- Development: `http://localhost:8000`
- Production: `https://your-domain.com`

## Authentication

Currently, the API does not require authentication. For production, implement API keys or JWT tokens.

## Endpoints

### Health Check

#### GET `/health`

Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "data_collector": true,
    "ml_service": true
  }
}
```

### Data Endpoints

#### GET `/api/v1/data/realtime`

Get the latest sensor reading.

**Query Parameters:**
- `device_id` (optional): Filter by device ID

**Response:**
```json
{
  "device_id": "NILM_ESP32_001",
  "timestamp": 1704067200000,
  "current": 0.523,
  "voltage": 12.05,
  "power": 6.30
}
```

#### GET `/api/v1/data/historical`

Get historical sensor data.

**Query Parameters:**
- `start_time` (required): Start time in ISO format (e.g., `2024-01-01T00:00:00`)
- `end_time` (required): End time in ISO format
- `device_id` (optional): Filter by device ID
- `limit` (optional): Maximum number of records (default: 1000, max: 10000)

**Response:**
```json
{
  "count": 100,
  "data": [
    {
      "device_id": "NILM_ESP32_001",
      "timestamp": 1704067200000,
      "current": 0.523,
      "voltage": 12.05,
      "power": 6.30
    }
  ],
  "start_time": "2024-01-01T00:00:00",
  "end_time": "2024-01-01T23:59:59"
}
```

### Prediction Endpoints

#### GET `/api/v1/predictions/live`

Get current load predictions based on recent sensor data.

**Query Parameters:**
- `device_id` (optional): Filter by device ID

**Response:**
```json
{
  "prediction": {
    "load_type": "fan",
    "confidence": 0.94,
    "timestamp": "2024-01-01T12:00:00",
    "features": {
      "current_mean": 0.523,
      "current_std": 0.012,
      ...
    }
  },
  "data_points": 50
}
```

#### POST `/api/v1/predictions/predict`

Make prediction from provided sensor data.

**Request Body:**
```json
[
  {
    "current": 0.523,
    "voltage": 12.05,
    "power": 6.30
  },
  ...
]
```

**Response:**
```json
{
  "load_type": "fan",
  "confidence": 0.94,
  "timestamp": "2024-01-01T12:00:00"
}
```

### Analytics Endpoints

#### GET `/api/v1/analytics/energy`

Get energy consumption breakdown by load type.

**Query Parameters:**
- `start_time` (required): Start time in ISO format
- `end_time` (required): End time in ISO format
- `device_id` (optional): Filter by device ID

**Response:**
```json
{
  "total_energy_kwh": 2.345,
  "breakdown": [
    {
      "load_type": "fan",
      "energy_kwh": 1.234,
      "percentage": 52.6,
      "cost_usd": 0.148
    },
    {
      "load_type": "motor",
      "energy_kwh": 1.111,
      "percentage": 47.4,
      "cost_usd": 0.133
    }
  ],
  "time_range": {
    "start": "2024-01-01T00:00:00",
    "end": "2024-01-01T23:59:59"
  },
  "total_cost_usd": 0.281
}
```

#### GET `/api/v1/analytics/cost`

Get cost estimation for energy consumption.

**Query Parameters:**
- `start_time` (required): Start time in ISO format
- `end_time` (required): End time in ISO format
- `device_id` (optional): Filter by device ID
- `rate_per_kwh` (optional): Electricity rate per kWh (default: 0.12)

**Response:** Same as `/api/v1/analytics/energy` with custom rate applied.

#### GET `/api/v1/analytics/realtime`

Get real-time statistics.

**Query Parameters:**
- `device_id` (optional): Filter by device ID

**Response:**
```json
{
  "current": 0.523,
  "voltage": 12.05,
  "power": 6.30,
  "timestamp": "2024-01-01T12:00:00"
}
```

### ML Model Endpoints

#### GET `/api/v1/ml/model/info`

Get ML model information.

**Response:**
```json
{
  "model_type": "RandomForestClassifier",
  "version": "1.0.0",
  "loaded": true,
  "feature_count": 20,
  "feature_names": ["current_mean", "current_std", ...]
}
```

## WebSocket API

### Connection

**Endpoint:** `ws://localhost:8000/ws`

**Query Parameters:**
- `device_id` (optional): Filter by device ID

**Example:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws?device_id=NILM_ESP32_001');
```

### Message Format

**Connection Message:**
```json
{
  "type": "connected",
  "message": "WebSocket connected",
  "timestamp": "2024-01-01T12:00:00"
}
```

**Sensor Data Message:**
```json
{
  "type": "sensor_data",
  "data": {
    "device_id": "NILM_ESP32_001",
    "timestamp": 1704067200000,
    "current": 0.523,
    "voltage": 12.05,
    "power": 6.30
  },
  "prediction": {
    "load_type": "fan",
    "confidence": 0.94,
    "timestamp": "2024-01-01T12:00:00"
  },
  "timestamp": "2024-01-01T12:00:00"
}
```

### Client Example

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'sensor_data') {
    console.log('Current:', data.data.current);
    console.log('Prediction:', data.prediction);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "detail": "Error message description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error

## Rate Limiting

Currently, there is no rate limiting implemented. For production, implement rate limiting to prevent abuse.

## CORS

CORS is enabled for all origins in development. For production, configure allowed origins in `app/main.py`.

## Examples

### cURL Examples

```bash
# Get realtime data
curl http://localhost:8000/api/v1/data/realtime

# Get historical data
curl "http://localhost:8000/api/v1/data/historical?start_time=2024-01-01T00:00:00&end_time=2024-01-01T23:59:59"

# Get energy breakdown
curl "http://localhost:8000/api/v1/analytics/energy?start_time=2024-01-01T00:00:00&end_time=2024-01-01T23:59:59"

# Make prediction
curl -X POST http://localhost:8000/api/v1/predictions/predict \
  -H "Content-Type: application/json" \
  -d '[{"current":0.5,"voltage":12.0,"power":6.0}]'
```

### Python Examples

```python
import requests

# Get realtime data
response = requests.get('http://localhost:8000/api/v1/data/realtime')
data = response.json()
print(f"Current: {data['current']}A")

# Get predictions
response = requests.get('http://localhost:8000/api/v1/predictions/live')
prediction = response.json()
print(f"Load: {prediction['prediction']['load_type']}")
```

## OpenAPI Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`





