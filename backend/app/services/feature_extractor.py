import numpy as np
import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class FeatureExtractor:
    """Extract features from sensor data for ML model"""
    
    def __init__(self, window_size: int = 50):
        self.window_size = window_size
    
    def extract_features(self, data_window: List[Dict]) -> Dict[str, float]:
        """
        Extract features from a window of sensor readings
        
        Args:
            data_window: List of sensor readings with 'current', 'voltage', 'power'
        
        Returns:
            Dictionary of extracted features
        """
        if len(data_window) < 5:
            logger.warning("Insufficient data for feature extraction")
            return {}
        
        # Convert to numpy arrays for easier computation
        currents = np.array([d['current'] for d in data_window])
        voltages = np.array([d['voltage'] for d in data_window])
        powers = np.array([d['power'] for d in data_window])
        
        features = {}
        
        # Current features
        features['current_mean'] = float(np.mean(currents))
        features['current_std'] = float(np.std(currents))
        features['current_max'] = float(np.max(currents))
        features['current_min'] = float(np.min(currents))
        features['current_range'] = features['current_max'] - features['current_min']
        features['current_rms'] = float(np.sqrt(np.mean(currents ** 2)))
        
        # Voltage features
        features['voltage_mean'] = float(np.mean(voltages))
        features['voltage_std'] = float(np.std(voltages))
        
        # Power features
        features['power_mean'] = float(np.mean(powers))
        features['power_std'] = float(np.std(powers))
        features['power_max'] = float(np.max(powers))
        features['power_integral'] = float(np.trapz(powers))  # Energy approximation
        
        # Transient features (first vs last half of window)
        mid_point = len(currents) // 2
        if mid_point > 0:
            first_half = currents[:mid_point]
            second_half = currents[mid_point:]
            
            features['current_rise'] = float(np.mean(second_half) - np.mean(first_half))
            features['current_rise_rate'] = features['current_rise'] / (len(currents) * 0.1)  # Assuming 10Hz
            
            # Peak detection
            if len(currents) > 10:
                features['current_peak_index'] = float(np.argmax(currents) / len(currents))
                features['current_peak_magnitude'] = float(np.max(currents) - np.min(currents))
        
        # Statistical features
        if len(currents) > 1:
            features['current_variance'] = float(np.var(currents))
            features['current_skewness'] = float(self._skewness(currents))
            features['current_kurtosis'] = float(self._kurtosis(currents))
        
        # Power factor approximation (for DC, this is simplified)
        features['power_current_ratio'] = (
            features['power_mean'] / features['current_mean'] 
            if features['current_mean'] > 0 else 0
        )
        
        return features
    
    def extract_event_features(self, pre_event: List[Dict], event: List[Dict], 
                              post_event: List[Dict]) -> Dict[str, float]:
        """
        Extract features from an event (ON/OFF transition)
        
        Args:
            pre_event: Sensor readings before event
            event: Sensor readings during event
            post_event: Sensor readings after event
        
        Returns:
            Dictionary of event-based features
        """
        features = {}
        
        if pre_event:
            pre_current = np.mean([d['current'] for d in pre_event])
        else:
            pre_current = 0.0
        
        if event:
            event_current = np.mean([d['current'] for d in event])
            event_max = np.max([d['current'] for d in event])
        else:
            event_current = pre_current
            event_max = pre_current
        
        if post_event:
            post_current = np.mean([d['current'] for d in post_event])
        else:
            post_current = event_current
        
        features['event_magnitude'] = float(event_max - pre_current)
        features['event_duration'] = float(len(event) * 0.1)  # Assuming 10Hz
        features['event_rise_time'] = float(self._calculate_rise_time(event, pre_current))
        features['event_settling_time'] = float(self._calculate_settling_time(post_event, event_current))
        features['pre_event_baseline'] = float(pre_current)
        features['post_event_steady'] = float(post_current)
        
        return features
    
    def _calculate_rise_time(self, event_data: List[Dict], baseline: float) -> float:
        """Calculate time to reach 90% of peak"""
        if not event_data:
            return 0.0
        
        currents = np.array([d['current'] for d in event_data])
        peak = np.max(currents)
        target = baseline + 0.9 * (peak - baseline)
        
        indices = np.where(currents >= target)[0]
        if len(indices) > 0:
            return float(indices[0] * 0.1)  # Assuming 10Hz
        return 0.0
    
    def _calculate_settling_time(self, post_event: List[Dict], target: float) -> float:
        """Calculate time to settle within 5% of target"""
        if not post_event:
            return 0.0
        
        currents = np.array([d['current'] for d in post_event])
        tolerance = 0.05 * target
        
        for i, current in enumerate(currents):
            if abs(current - target) <= tolerance:
                return float(i * 0.1)  # Assuming 10Hz
        
        return float(len(currents) * 0.1)
    
    def _skewness(self, data: np.ndarray) -> float:
        """Calculate skewness"""
        if len(data) < 3:
            return 0.0
        mean = np.mean(data)
        std = np.std(data)
        if std == 0:
            return 0.0
        return float(np.mean(((data - mean) / std) ** 3))
    
    def _kurtosis(self, data: np.ndarray) -> float:
        """Calculate kurtosis"""
        if len(data) < 4:
            return 0.0
        mean = np.mean(data)
        std = np.std(data)
        if std == 0:
            return 0.0
        return float(np.mean(((data - mean) / std) ** 4)) - 3.0





