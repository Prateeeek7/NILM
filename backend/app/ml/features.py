"""
Feature definitions for ML model training
"""
from typing import List, Dict
import numpy as np
from app.services.feature_extractor import FeatureExtractor


def get_feature_names() -> List[str]:
    """Get list of feature names used in training"""
    # These should match the features extracted by FeatureExtractor
    return [
        'current_mean',
        'current_std',
        'current_max',
        'current_min',
        'current_range',
        'current_rms',
        'voltage_mean',
        'voltage_std',
        'power_mean',
        'power_std',
        'power_max',
        'power_integral',
        'current_rise',
        'current_rise_rate',
        'current_peak_index',
        'current_peak_magnitude',
        'current_variance',
        'current_skewness',
        'current_kurtosis',
        'power_current_ratio'
    ]


def extract_features_for_training(data_window: List[Dict]) -> np.ndarray:
    """Extract features in the same format as training"""
    extractor = FeatureExtractor()
    features = extractor.extract_features(data_window)
    
    # Convert to numpy array in correct order
    feature_names = get_feature_names()
    feature_vector = []
    
    for name in feature_names:
        feature_vector.append(features.get(name, 0.0))
    
    return np.array(feature_vector)





