"""
API routes for training data collection and model training
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.database import get_db
from app.models.schemas import (
    TrainingDataCreate, TrainingDataResponse, TrainingStatusResponse, TrainingTriggerRequest
)
from app.services.training_service import TrainingService

router = APIRouter(prefix="/api/training", tags=["training"])
logger = logging.getLogger(__name__)

training_service = TrainingService()


@router.post("/data", response_model=TrainingDataResponse, status_code=status.HTTP_201_CREATED)
def create_training_data(data: TrainingDataCreate, db: Session = Depends(get_db)):
    """Create training data entry"""
    try:
        training_data = training_service.create_training_data(db, data)
        return TrainingDataResponse(
            id=training_data.id,
            device_id=training_data.device_id,
            label=training_data.label,
            load_id=training_data.load_id,
            timestamp=training_data.timestamp,
            samples_count=len(training_data.data_window) if training_data.data_window else 0
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/data")
def get_training_data(label: Optional[str] = None, limit: int = 100, include_data_window: bool = False, db: Session = Depends(get_db)):
    """Get training data"""
    records = training_service.get_training_data(db, label=label, limit=limit)
    return [
        {
            "id": r.id,
            "device_id": r.device_id,
            "label": r.label,
            "load_id": r.load_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "samples_count": len(r.data_window) if r.data_window else 0,
            "data_window": r.data_window if include_data_window else None
        }
        for r in records
    ]


@router.get("/stats")
def get_training_stats(db: Session = Depends(get_db)):
    """Get training data statistics"""
    return training_service.get_training_stats(db)


@router.get("/ready")
def check_training_ready(min_samples: int = 100, db: Session = Depends(get_db)):
    """Check if enough data is collected for training"""
    return training_service.check_training_ready(db, min_samples_per_class=min_samples)


@router.post("/trigger", response_model=TrainingStatusResponse)
def trigger_training(
    request: TrainingTriggerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Trigger model training"""
    # Check if training is ready
    ready_status = training_service.check_training_ready(
        db, min_samples_per_class=request.min_samples_per_class
    )
    
    if not ready_status["is_ready"] and not request.force_retrain:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Insufficient training data",
                "details": ready_status
            }
        )
    
    # Check if training is already running
    current_status = training_service.get_training_status(db)
    if current_status and current_status.status == "running":
        raise HTTPException(
            status_code=409,
            detail="Training is already in progress"
        )
    
    # Start training in background
    from app.database import SessionLocal
    
    def train_in_background():
        session = SessionLocal()
        try:
            training_service.train_model(session)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Background training failed: {e}")
        finally:
            session.close()
    
    background_tasks.add_task(train_in_background)
    
    # Return initial status
    return TrainingStatusResponse(
        status="running",
        progress_percent=0.0,
        samples_used=0
    )


@router.get("/status", response_model=TrainingStatusResponse)
def get_training_status(db: Session = Depends(get_db)):
    """Get current training status"""
    return training_service.get_training_status(db)


@router.get("/data/json")
def get_training_data_from_json(
    label: Optional[str] = None,
    limit: Optional[int] = None,
    json_path: Optional[str] = None
):
    """Get training data directly from JSON file for visualization"""
    import json
    from pathlib import Path
    
    # Default path to Training_data.json
    if not json_path:
        # Try multiple possible paths
        possible_paths = [
            Path(__file__).parent.parent.parent.parent / "ml-training" / "data" / "Training_data.json",
            Path(__file__).parent.parent.parent.parent.parent / "ml-training" / "data" / "Training_data.json",
            Path("/Users/pratikkumar/Desktop/NILM/ml-training/data/Training_data.json"),
        ]
        json_path = None
        for path in possible_paths:
            if path.exists():
                json_path = path
                break
        if not json_path:
            raise HTTPException(
                status_code=404,
                detail=f"Training data file not found. Tried: {[str(p) for p in possible_paths]}"
            )
    else:
        json_path = Path(json_path)
        if not json_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Training data file not found at {json_path}"
            )
    
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        # Filter by label if provided
        if label:
            data = [item for item in data if item.get('label') == label]
        
        # Limit results if provided
        if limit:
            data = data[:limit]
        
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read training data: {str(e)}"
        )


@router.post("/load-from-json")
def load_training_data_from_json(
    json_path: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Load training data from JSON file into database"""
    import json
    from pathlib import Path
    from datetime import datetime
    
    # Default path to Training_data.json
    if not json_path:
        json_path = Path(__file__).parent.parent.parent.parent / "ml-training" / "data" / "Training_data.json"
    else:
        json_path = Path(json_path)
    
    if not json_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Training data file not found at {json_path}"
        )
    
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        loaded_count = 0
        skipped_count = 0
        
        for item in data:
            try:
                # Check if this record already exists (by checking data_window hash or label+timestamp)
                # For simplicity, we'll just create all records
                training_data_create = TrainingDataCreate(
                    device_id="MOCK_DEVICE",
                    data_window=item.get('data_window', []),
                    label=item.get('label', 'unknown'),
                    notes=f"Loaded from {json_path.name}"
                )
                
                training_service.create_training_data(db, training_data_create)
                loaded_count += 1
            except Exception as e:
                # Skip duplicates or errors
                skipped_count += 1
                logger.warning(f"Failed to load record: {e}")
        
        return {
            "message": f"Successfully loaded {loaded_count} records from {json_path.name}",
            "loaded": loaded_count,
            "skipped": skipped_count,
            "total_in_file": len(data)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load training data: {str(e)}"
        )

