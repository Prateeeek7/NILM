from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    
    # MQTT Configuration
    MQTT_BROKER_HOST: str = "10.231.103.132"  # Your laptop's IP on WiFi network
    MQTT_BROKER_PORT: int = 1883
    MQTT_USERNAME: Optional[str] = None
    MQTT_PASSWORD: Optional[str] = None
    MQTT_TOPIC_PREFIX: str = "nilm/sensor"
    
    # InfluxDB Configuration
    INFLUXDB_URL: str = "http://localhost:8086"
    INFLUXDB_TOKEN: str = "nilm_token_change_me"
    INFLUXDB_ORG: str = "nilm_org"
    INFLUXDB_BUCKET: str = "nilm_data"
    
    # ML Configuration
    ML_MODEL_PATH: str = "app/ml/models/load_classifier.pkl"
    FEATURE_WINDOW_SIZE: int = 50  # Number of samples for feature extraction (5 seconds at 10Hz)
    
    # Data Collection
    EVENT_DETECTION_THRESHOLD: float = 0.1  # Amperes - minimum change to detect event
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

