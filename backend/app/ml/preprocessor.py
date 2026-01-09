"""
Data preprocessing for ML training
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Tuple
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib


class DataPreprocessor:
    """Preprocess sensor data for ML training"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.is_fitted = False
    
    def prepare_training_data(self, 
                             labeled_data: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare training data from labeled sensor readings
        
        Args:
            labeled_data: List of dicts with 'data_window' and 'label'
        
        Returns:
            X (features), y (labels)
        """
        X_list = []
        y_list = []
        
        for item in labeled_data:
            if 'data_window' not in item or 'label' not in item:
                continue
            
            data_window = item['data_window']
            label = item['label']
            
            # Extract features
            from app.ml.features import extract_features_for_training
            features = extract_features_for_training(data_window)
            
            if features is not None and len(features) > 0:
                X_list.append(features)
                y_list.append(label)
        
        X = np.array(X_list)
        y = np.array(y_list)
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        self.is_fitted = True
        
        return X, y_encoded
    
    def scale_features(self, X: np.ndarray, fit: bool = False) -> np.ndarray:
        """Scale features using StandardScaler"""
        if fit:
            return self.scaler.fit_transform(X)
        else:
            if not hasattr(self.scaler, 'mean_'):
                raise ValueError("Scaler not fitted. Call with fit=True first.")
            return self.scaler.transform(X)
    
    def get_label_mapping(self) -> Dict[int, str]:
        """Get mapping from encoded labels to original labels"""
        if not self.is_fitted:
            return {}
        
        return {
            int(encoded): label 
            for encoded, label in enumerate(self.label_encoder.classes_)
        }
    
    def save(self, filepath: str):
        """Save preprocessor to file"""
        joblib.dump({
            'scaler': self.scaler,
            'label_encoder': self.label_encoder,
            'is_fitted': self.is_fitted
        }, filepath)
    
    def load(self, filepath: str):
        """Load preprocessor from file"""
        data = joblib.load(filepath)
        self.scaler = data['scaler']
        self.label_encoder = data['label_encoder']
        self.is_fitted = data['is_fitted']





