from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from influxdb_client import InfluxDBClient
from influxdb_client.client.query_api import QueryApi
from sqlalchemy.orm import Session

from app.config import settings
from app.models.schemas import LoadPrediction
from app.services.ml_service import MLService
from app.services.analytics import AnalyticsService
from app.database import get_db

router = APIRouter(prefix="/api/v1/predictions", tags=["predictions"])

# Initialize services
ml_service = MLService()
analytics_service = AnalyticsService()

# InfluxDB client
influx_client = InfluxDBClient(
    url=settings.INFLUXDB_URL,
    token=settings.INFLUXDB_TOKEN,
    org=settings.INFLUXDB_ORG
)
query_api = influx_client.query_api()


@router.get("/live")
async def get_live_predictions(device_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Get current load predictions based on recent data"""
    try:
        # Get recent sensor data (last 5 seconds)
        try:
            end_time = datetime.now()
            start_time = end_time - timedelta(seconds=5)
            
            query = f'''
            from(bucket: "{settings.INFLUXDB_BUCKET}")
              |> range(start: {start_time.isoformat()}, stop: {end_time.isoformat()})
              |> filter(fn: (r) => r._measurement == "sensor_reading")
              |> filter(fn: (r) => r._field == "current" or r._field == "voltage" or r._field == "power")
            '''
            
            if device_id:
                query += f'|> filter(fn: (r) => r.device_id == "{device_id}")'
            
            query += '''
              |> sort(columns: ["_time"])
            '''
            
            result = query_api.query(query)
        except Exception as e:
            # Return empty data if InfluxDB is not available
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"InfluxDB not available for predictions: {str(e)}")
            result = []
        
        # Collect data window
        data_window = []
        current_record = {}
        
        if not result:
            # Return no prediction if no data available
            return {
                "prediction": None,
                "message": "No sensor data available (InfluxDB not connected)",
                "data_points": 0
            }
        
        for table in result:
            for record in table.records:
                time = record.get_time()
                field = record.get_field()
                value = record.get_value()
                
                timestamp_key = int(time.timestamp() * 1000)
                
                if timestamp_key not in [r.get('timestamp') for r in data_window]:
                    current_record = {
                        'timestamp': timestamp_key,
                        'current': 0.0,
                        'voltage': 0.0,
                        'power': 0.0
                    }
                    data_window.append(current_record)
                else:
                    current_record = next(r for r in data_window if r['timestamp'] == timestamp_key)
                
                if value is not None:
                    current_record[field] = float(value)
        
        # Convert to format expected by ML service
        ml_data_window = [
            {
                'current': r['current'],
                'voltage': r['voltage'],
                'power': r['power']
            }
            for r in data_window
        ]
        
        # Make prediction (with database for load matching)
        prediction = ml_service.predict(ml_data_window, db=db)
        
        if prediction:
            return {
                "prediction": prediction.dict(),
                "data_points": len(data_window)
            }
        else:
            return {
                "prediction": None,
                "message": "Insufficient data for prediction",
                "data_points": len(data_window)
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting live predictions: {str(e)}")


@router.post("/predict")
async def predict_from_data(data: List[Dict], db: Session = Depends(get_db)):
    """Make prediction from provided sensor data"""
    try:
        if len(data) < 5:
            raise HTTPException(status_code=400, detail="Need at least 5 data points")
        
        # Validate data format
        for point in data:
            if not all(key in point for key in ['current', 'voltage', 'power']):
                raise HTTPException(status_code=400, detail="Each data point must have current, voltage, and power")
        
        prediction = ml_service.predict(data, db=db)
        
        if prediction:
            return prediction.dict()
        else:
            raise HTTPException(status_code=500, detail="Prediction failed")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error making prediction: {str(e)}")

