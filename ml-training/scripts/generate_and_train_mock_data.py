"""
Generate 3 hours of mock training data and train the model
"""
import json
import numpy as np
from pathlib import Path
import sys
from datetime import datetime

# Add backend to path
backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.ml.train import train_model

def generate_sensor_readings(duration_seconds=10800, sample_rate_hz=10, 
                             voltage=12.0, current=0.18, noise_level=0.01):
    """
    Generate sensor readings with realistic noise
    
    Args:
        duration_seconds: Duration in seconds (3 hours = 10800 seconds)
        sample_rate_hz: Samples per second (10Hz)
        voltage: Base voltage
        current: Base current
        noise_level: Noise amplitude (fraction of base value)
    
    Returns:
        List of sensor readings
    """
    num_samples = duration_seconds * sample_rate_hz
    base_timestamp = int(datetime.now().timestamp() * 1000)
    
    readings = []
    for i in range(num_samples):
        # Add small random noise to voltage (±2%)
        v_noise = np.random.normal(0, voltage * 0.02)
        voltage_reading = voltage + v_noise
        
        # Add small random noise to current (±1%)
        c_noise = np.random.normal(0, current * noise_level)
        current_reading = max(0, current + c_noise)  # Ensure non-negative
        
        # Calculate power
        power_reading = voltage_reading * current_reading
        
        readings.append({
            "timestamp": base_timestamp + (i * 100),  # 100ms intervals (10Hz)
            "current": round(current_reading, 3),
            "voltage": round(voltage_reading, 2),
            "power": round(power_reading, 3)
        })
    
    return readings

def create_training_windows(readings, window_size=50, interval_minutes=2, sample_rate_hz=10):
    """
    Create training windows by sampling every 2 minutes
    
    Args:
        readings: List of sensor readings
        window_size: Number of readings per window (50 = 5 seconds at 10Hz)
        interval_minutes: Sample interval in minutes (2 minutes)
        sample_rate_hz: Sample rate in Hz (10Hz)
    
    Returns:
        List of data windows, one per interval
    """
    windows = []
    interval_samples = interval_minutes * 60 * sample_rate_hz  # 2 minutes = 1200 readings at 10Hz
    total_intervals = len(readings) // interval_samples
    
    for i in range(total_intervals):
        # Start of this 2-minute interval
        start_idx = i * interval_samples
        
        # Take a window of 50 readings from within this 2-minute period
        # Sample from the middle of the interval for more stable readings
        window_start = start_idx + (interval_samples - window_size) // 2
        window_end = window_start + window_size
        
        if window_end <= len(readings):
            window = readings[window_start:window_end]
            windows.append(window)
    
    return windows

def generate_training_data():
    """Generate complete training dataset with 3 hours of data per scenario"""
    
    print("="*60)
    print("Generating 3 hours of mock training data per scenario...")
    print("="*60)
    
    duration_seconds = 3 * 60 * 60  # 3 hours
    window_size = 50
    sample_rate = 10
    
    total_readings = duration_seconds * sample_rate
    interval_minutes = 2
    samples_per_interval = interval_minutes * 60 * sample_rate  # 1200 readings per 2-minute interval
    total_intervals = duration_seconds // (interval_minutes * 60)  # 90 intervals in 3 hours
    
    print(f"\nConfiguration:")
    print(f"  - Duration: 3 hours ({duration_seconds} seconds)")
    print(f"  - Sample rate: {sample_rate} Hz")
    print(f"  - Total readings per scenario: {total_readings:,}")
    print(f"  - Sampling interval: {interval_minutes} minutes")
    print(f"  - Readings per interval: {samples_per_interval} readings")
    print(f"  - Window size per sample: {window_size} readings (5 seconds)")
    print(f"  - Expected samples per scenario: {total_intervals} (one per 2-minute interval)")
    
    # 1. Fan alone - 3 hours, sampled every 2 minutes
    print("\n  [1/3] Generating fan data (3 hours, 0.18A @ 12V)...")
    print(f"       Sampling every {interval_minutes} minutes...")
    fan_readings = generate_sensor_readings(
        duration_seconds=duration_seconds,
        voltage=12.0,
        current=0.18,
        noise_level=0.01
    )
    fan_windows = create_training_windows(
        fan_readings, 
        window_size=window_size,
        interval_minutes=interval_minutes,
        sample_rate_hz=sample_rate
    )
    print(f"    ✓ Created {len(fan_windows)} samples (one per 2-minute interval)")
    print(f"    ✓ Total readings: {len(fan_readings):,}")
    
    # 2. Bulb alone - 3 hours, sampled every 2 minutes
    print("\n  [2/3] Generating bulb data (3 hours, 0.5A @ 12V)...")
    print(f"       Sampling every {interval_minutes} minutes...")
    bulb_readings = generate_sensor_readings(
        duration_seconds=duration_seconds,
        voltage=12.0,
        current=0.5,
        noise_level=0.01
    )
    bulb_windows = create_training_windows(
        bulb_readings, 
        window_size=window_size,
        interval_minutes=interval_minutes,
        sample_rate_hz=sample_rate
    )
    print(f"    ✓ Created {len(bulb_windows)} samples (one per 2-minute interval)")
    print(f"    ✓ Total readings: {len(bulb_readings):,}")
    
    # 3. Combined (Fan + Bulb) - 3 hours, sampled every 2 minutes
    print("\n  [3/3] Generating combined (fan+bulb) data (3 hours, 0.68A @ 12V)...")
    print(f"       Sampling every {interval_minutes} minutes...")
    combined_current = 0.18 + 0.5  # 0.68A total
    combined_readings = generate_sensor_readings(
        duration_seconds=duration_seconds,
        voltage=12.0,
        current=combined_current,
        noise_level=0.01
    )
    combined_windows = create_training_windows(
        combined_readings, 
        window_size=window_size,
        interval_minutes=interval_minutes,
        sample_rate_hz=sample_rate
    )
    print(f"    ✓ Created {len(combined_windows)} samples (one per 2-minute interval)")
    print(f"    ✓ Total readings: {len(combined_readings):,}")
    
    # Create training data format
    print("\n  Creating training data structure...")
    training_data = []
    
    # Add fan windows
    for window in fan_windows:
        training_data.append({
            "data_window": window,
            "label": "fan"
        })
    
    # Add bulb windows
    for window in bulb_windows:
        training_data.append({
            "data_window": window,
            "label": "bulb"
        })
    
    # Add combined windows
    for window in combined_windows:
        training_data.append({
            "data_window": window,
            "label": "fan+bulb"
        })
    
    print(f"\n✓ Generated {len(training_data):,} total training samples:")
    print(f"  - Fan: {len(fan_windows)} samples (one per 2-minute interval)")
    print(f"  - Bulb: {len(bulb_windows)} samples (one per 2-minute interval)")
    print(f"  - Combined: {len(combined_windows)} samples (one per 2-minute interval)")
    print(f"\n  Each sample contains {window_size} readings (5 seconds of data)")
    print(f"  Total: {len(training_data)} samples from 3 hours of recording")
    
    return training_data

def main():
    # Generate training data
    training_data = generate_training_data()
    
    # Save to JSON
    output_path = Path(__file__).parent.parent / "data" / "mock_training_data_3hrs.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"\n  Saving training data to: {output_path}")
    with open(output_path, 'w') as f:
        json.dump(training_data, f, indent=2)
    
    file_size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"  ✓ Saved ({file_size_mb:.2f} MB)")
    
    # Train model
    print("\n" + "="*60)
    print("Training Random Forest model...")
    print("="*60)
    
    model_output = Path(__file__).parent.parent.parent / "backend" / "app" / "ml" / "models" / "load_classifier.pkl"
    model_output.parent.mkdir(parents=True, exist_ok=True)
    
    train_model(
        training_data_path=str(output_path),
        model_output_path=str(model_output),
        test_size=0.2,
        n_estimators=100,
        max_depth=None,
        random_state=42
    )
    
    print("\n" + "="*60)
    print("✓ Model training completed!")
    print(f"✓ Model saved to: {model_output}")
    print("="*60)

if __name__ == "__main__":
    main()

