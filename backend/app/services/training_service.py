"""
Service for training data collection and model training
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import logging
import json
from pathlib import Path

from app.models.database_models import TrainingData, ModelVersion, TrainingSession, Load
from app.models.schemas import TrainingDataCreate, TrainingStatusResponse
from app.services.feature_extractor import FeatureExtractor
from app.config import settings

logger = logging.getLogger(__name__)


class TrainingService:
    """Service for training data collection and model training"""
    
    def __init__(self):
        self.feature_extractor = FeatureExtractor(window_size=settings.FEATURE_WINDOW_SIZE)
    
    def create_training_data(self, db: Session, data: TrainingDataCreate) -> TrainingData:
        """Create training data entry"""
        # Extract features
        features = self.feature_extractor.extract_features(data.data_window)
        
        training_data = TrainingData(
            device_id=data.device_id,
            data_window=data.data_window,
            features=features,
            label=data.label,
            load_id=data.load_id,
            notes=data.notes
        )
        
        db.add(training_data)
        db.commit()
        db.refresh(training_data)
        
        logger.info(f"Created training data: label={data.label}, samples={len(data.data_window)}")
        return training_data
    
    def get_training_data(self, db: Session, label: Optional[str] = None, 
                         limit: int = 1000) -> List[TrainingData]:
        """Get training data"""
        query = db.query(TrainingData).filter(TrainingData.is_labeled == True)
        
        if label:
            query = query.filter(TrainingData.label == label)
        
        return query.order_by(TrainingData.timestamp.desc()).limit(limit).all()
    
    def get_training_stats(self, db: Session) -> Dict:
        """Get training data statistics"""
        total = db.query(func.count(TrainingData.id)).scalar() or 0
        
        # Count by label
        label_counts = db.query(
            TrainingData.label,
            func.count(TrainingData.id)
        ).filter(
            TrainingData.is_labeled == True
        ).group_by(TrainingData.label).all()
        
        stats = {
            "total_samples": total,
            "samples_by_label": {label: count for label, count in label_counts},
            "unique_labels": len(label_counts)
        }
        
        return stats
    
    def check_training_ready(self, db: Session, min_samples_per_class: int = 100) -> Dict:
        """Check if enough data is collected for training"""
        label_counts = db.query(
            TrainingData.label,
            func.count(TrainingData.id)
        ).filter(
            TrainingData.is_labeled == True
        ).group_by(TrainingData.label).all()
        
        ready_labels = []
        insufficient_labels = []
        
        for label, count in label_counts:
            if count >= min_samples_per_class:
                ready_labels.append({"label": label, "samples": count})
            else:
                insufficient_labels.append({"label": label, "samples": count, "needed": min_samples_per_class - count})
        
        is_ready = len(ready_labels) >= 3 and all(count >= min_samples_per_class for _, count in label_counts)
        
        return {
            "is_ready": is_ready,
            "ready_labels": ready_labels,
            "insufficient_labels": insufficient_labels,
            "min_samples_per_class": min_samples_per_class
        }
    
    def prepare_training_data(self, db: Session) -> tuple:
        """Prepare training data for model training"""
        from app.ml.preprocessor import DataPreprocessor
        import numpy as np
        
        training_records = self.get_training_data(db, limit=10000)
        
        if len(training_records) < 100:
            raise ValueError("Insufficient training data. Need at least 100 samples.")
        
        # Prepare data windows and labels
        labeled_data = []
        for record in training_records:
            labeled_data.append({
                "data_window": record.data_window,
                "label": record.label
            })
        
        # Preprocess
        preprocessor = DataPreprocessor()
        X, y = preprocessor.prepare_training_data(labeled_data)
        
        # Get label mapping
        label_mapping = preprocessor.get_label_mapping()
        
        logger.info(f"Prepared training data: {X.shape[0]} samples, {len(label_mapping)} classes")
        
        return X, y, preprocessor, label_mapping
    
    def train_model(self, db: Session, session_name: str = None) -> TrainingSession:
        """Train a new model"""
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
        import joblib
        
        # Create training session
        session = TrainingSession(
            session_name=session_name or f"training_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            status="running",
            started_at=datetime.now()
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        try:
            # Prepare data
            X, y, preprocessor, label_mapping = self.prepare_training_data(db)
            
            # Scale features
            X_scaled = preprocessor.scale_features(X, fit=True)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=0.2, random_state=42, stratify=y
            )
            
            session.samples_used = len(X_train)
            session.progress_percent = 50.0
            db.commit()
            
            # Train model
            logger.info("Training Random Forest classifier...")
            model = RandomForestClassifier(
                n_estimators=100,
                max_depth=None,
                random_state=42,
                n_jobs=-1,
                verbose=1
            )
            
            model.fit(X_train, y_train)
            session.progress_percent = 80.0
            db.commit()
            
            # Evaluate
            y_pred = model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
            recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
            f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            
            session.accuracy = accuracy
            session.progress_percent = 90.0
            db.commit()
            
            # Save model
            model_dir = Path(__file__).parent.parent.parent / "app" / "ml" / "models"
            model_dir.mkdir(exist_ok=True, parents=True)
            
            version = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            model_path = model_dir / f"load_classifier_{version}.pkl"
            
            # Get feature names
            from app.ml.features import get_feature_names
            feature_names = get_feature_names()
            
            # Save model with metadata
            model_data = {
                'model': model,
                'feature_names': feature_names,
                'scaler': preprocessor.scaler,
                'label_encoder': preprocessor.label_encoder,
                'label_mapping': label_mapping,
                'version': version,
                'trained_at': datetime.now().isoformat(),
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1
            }
            
            joblib.dump(model_data, model_path)
            
            # Create model version record
            model_version = ModelVersion(
                version=version,
                model_path=str(model_path),
                training_samples=len(X_train),
                accuracy=accuracy,
                precision=precision,
                recall=recall,
                f1_score=f1,
                feature_names=feature_names,
                label_mapping=label_mapping,
                is_active=False  # Will be activated manually or by latest
            )
            db.add(model_version)
            
            # Deactivate old models
            db.query(ModelVersion).filter(ModelVersion.is_active == True).update({"is_active": False})
            model_version.is_active = True
            
            # Update default model path (symlink or copy)
            default_model_path = model_dir / "load_classifier.pkl"
            if default_model_path.exists():
                default_model_path.unlink()
            import shutil
            shutil.copy(model_path, default_model_path)
            
            session.status = "completed"
            session.completed_at = datetime.now()
            session.progress_percent = 100.0
            session.model_version_id = model_version.id
            db.commit()
            
            logger.info(f"Model training completed: accuracy={accuracy:.4f}, version={version}")
            
            return session
            
        except Exception as e:
            session.status = "failed"
            session.error_message = str(e)
            session.completed_at = datetime.now()
            db.commit()
            logger.error(f"Model training failed: {e}")
            raise
    
    def get_training_status(self, db: Session) -> Optional[TrainingStatusResponse]:
        """Get current training status"""
        session = db.query(TrainingSession).order_by(
            TrainingSession.created_at.desc()
        ).first()
        
        if not session:
            return TrainingStatusResponse(
                status="pending",
                progress_percent=0.0,
                samples_used=0
            )
        
        return TrainingStatusResponse(
            session_id=session.id,
            status=session.status,
            progress_percent=session.progress_percent,
            samples_used=session.samples_used,
            accuracy=session.accuracy,
            error_message=session.error_message,
            started_at=session.started_at,
            completed_at=session.completed_at
        )





