"""
Database models for load management and training data
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from app.database import Base


class Load(Base):
    """Load configuration model"""
    __tablename__ = "loads"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    load_type = Column(String(50), nullable=False)  # fan, motor, bulb, heater, etc.
    
    # Specifications
    expected_power_watts = Column(Float, nullable=False)  # Expected power consumption
    expected_current_amps = Column(Float, nullable=False)  # Expected current draw
    power_tolerance_percent = Column(Float, default=10.0)  # ±10% tolerance
    current_tolerance_percent = Column(Float, default=10.0)
    
    # Electrical characteristics
    min_power_watts = Column(Float)  # Minimum power in operating range
    max_power_watts = Column(Float)  # Maximum power in operating range
    min_current_amps = Column(Float)  # Minimum current in operating range
    max_current_amps = Column(Float)  # Maximum current in operating range
    
    # Additional metadata
    description = Column(Text, nullable=True)
    manufacturer = Column(String(100), nullable=True)
    model_number = Column(String(100), nullable=True)
    specifications = Column(JSON, nullable=True)  # Additional specs as JSON
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Load(id={self.id}, name='{self.name}', type='{self.load_type}')>"


class TrainingData(Base):
    """Training data collection model"""
    __tablename__ = "training_data"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    
    # Data window
    data_window = Column(JSON, nullable=False)  # List of sensor readings
    features = Column(JSON, nullable=True)  # Extracted features
    
    # Labels
    label = Column(String(50), nullable=False, index=True)  # Load type label
    load_id = Column(Integer, nullable=True)  # Reference to Load.id
    is_labeled = Column(Boolean, default=True)
    
    # Metadata
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    collected_by = Column(String(100), nullable=True)  # User/system identifier
    notes = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<TrainingData(id={self.id}, label='{self.label}', timestamp='{self.timestamp}')>"


class ModelVersion(Base):
    """Model version tracking"""
    __tablename__ = "model_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(20), nullable=False, unique=True)
    model_path = Column(String(255), nullable=False)
    
    # Training metadata
    training_samples = Column(Integer, nullable=False)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    
    # Training configuration
    feature_names = Column(JSON, nullable=True)
    label_mapping = Column(JSON, nullable=True)  # Map of class indices to load types
    
    # Status
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    trained_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ModelVersion(id={self.id}, version='{self.version}', accuracy={self.accuracy})>"


class TrainingSession(Base):
    """Training session tracking"""
    __tablename__ = "training_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_name = Column(String(100), nullable=False)
    
    # Status
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    progress_percent = Column(Float, default=0.0)
    
    # Data
    samples_used = Column(Integer, default=0)
    model_version_id = Column(Integer, nullable=True)  # Reference to ModelVersion.id
    
    # Results
    accuracy = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<TrainingSession(id={self.id}, status='{self.status}', accuracy={self.accuracy})>"





