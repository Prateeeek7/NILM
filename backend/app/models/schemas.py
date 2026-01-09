from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class SensorReading(BaseModel):
    device_id: str
    timestamp: int
    current: float = Field(..., description="Current in Amperes")
    voltage: float = Field(..., description="Voltage in Volts")
    power: float = Field(..., description="Power in Watts")


class LoadPrediction(BaseModel):
    load_type: str = Field(..., description="Identified load type (fan, motor, bulb, etc.)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0-1")
    timestamp: datetime
    features: Optional[dict] = None
    load_id: Optional[int] = None  # Reference to specific load if matched


class EnergyBreakdown(BaseModel):
    load_type: str
    energy_kwh: float
    percentage: float
    cost_usd: Optional[float] = None


class AnalyticsResponse(BaseModel):
    total_energy_kwh: float
    breakdown: List[EnergyBreakdown]
    time_range: dict
    total_cost_usd: Optional[float] = None


class HistoricalDataRequest(BaseModel):
    start_time: datetime
    end_time: datetime
    device_id: Optional[str] = None


class ModelInfo(BaseModel):
    model_type: str
    version: str
    accuracy: Optional[float] = None
    trained_at: Optional[datetime] = None
    feature_count: int


# Load Management Schemas
class LoadCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    load_type: str = Field(..., min_length=1, max_length=50)
    expected_power_watts: float = Field(..., gt=0)
    expected_current_amps: float = Field(..., gt=0)
    power_tolerance_percent: float = Field(default=10.0, ge=0, le=50)
    current_tolerance_percent: float = Field(default=10.0, ge=0, le=50)
    min_power_watts: Optional[float] = None
    max_power_watts: Optional[float] = None
    min_current_amps: Optional[float] = None
    max_current_amps: Optional[float] = None
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None


class LoadUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    load_type: Optional[str] = Field(None, min_length=1, max_length=50)
    expected_power_watts: Optional[float] = Field(None, gt=0)
    expected_current_amps: Optional[float] = Field(None, gt=0)
    power_tolerance_percent: Optional[float] = Field(None, ge=0, le=50)
    current_tolerance_percent: Optional[float] = Field(None, ge=0, le=50)
    min_power_watts: Optional[float] = None
    max_power_watts: Optional[float] = None
    min_current_amps: Optional[float] = None
    max_current_amps: Optional[float] = None
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class LoadResponse(BaseModel):
    id: int
    name: str
    load_type: str
    expected_power_watts: float
    expected_current_amps: float
    power_tolerance_percent: float
    current_tolerance_percent: float
    min_power_watts: Optional[float]
    max_power_watts: Optional[float]
    min_current_amps: Optional[float]
    max_current_amps: Optional[float]
    description: Optional[str]
    manufacturer: Optional[str]
    model_number: Optional[str]
    specifications: Optional[Dict[str, Any]]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Training Data Schemas
class TrainingDataCreate(BaseModel):
    device_id: str
    data_window: List[Dict[str, Any]]  # List of sensor readings
    label: str
    load_id: Optional[int] = None
    notes: Optional[str] = None


class TrainingDataResponse(BaseModel):
    id: int
    device_id: str
    label: str
    load_id: Optional[int]
    timestamp: datetime
    samples_count: int
    
    class Config:
        from_attributes = True


class TrainingStatusResponse(BaseModel):
    session_id: Optional[int]
    status: str  # pending, running, completed, failed
    progress_percent: float
    samples_used: int
    accuracy: Optional[float]
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class TrainingTriggerRequest(BaseModel):
    min_samples_per_class: int = Field(default=100, ge=10)
    force_retrain: bool = False

