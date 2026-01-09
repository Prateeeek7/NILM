"""
Script to label collected sensor data for training
"""
import json
import argparse
import logging
from pathlib import Path
from typing import List, Dict
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_labeled_dataset(
    raw_data_file: str,
    labels_file: str,
    window_size: int = 50,
    output_file: str = "labeled_training_data.json"
):
    """
    Create labeled dataset from raw data and time-based labels
    
    Args:
        raw_data_file: Path to raw sensor data JSON
        labels_file: Path to labels JSON with format:
            [
                {
                    "start_time": "2024-01-01T10:00:00",
                    "end_time": "2024-01-01T10:05:00",
                    "label": "fan"
                },
                ...
            ]
        window_size: Number of samples per window
        output_file: Output file path
    """
    # Load raw data
    logger.info(f"Loading raw data from {raw_data_file}...")
    with open(raw_data_file, 'r') as f:
        raw_data = json.load(f)
    
    # Load labels
    logger.info(f"Loading labels from {labels_file}...")
    with open(labels_file, 'r') as f:
        labels = json.load(f)
    
    # Convert timestamps
    for item in raw_data:
        item['datetime'] = datetime.fromtimestamp(item['timestamp'] / 1000)
    
    for label in labels:
        label['start_datetime'] = datetime.fromisoformat(label['start_time'])
        label['end_datetime'] = datetime.fromisoformat(label['end_time'])
    
    # Create labeled windows
    logger.info("Creating labeled data windows...")
    labeled_windows = []
    
    for label in labels:
        start_time = label['start_datetime']
        end_time = label['end_datetime']
        label_name = label['label']
        
        # Find data points in this time range
        matching_data = [
            d for d in raw_data
            if start_time <= d['datetime'] <= end_time
        ]
        
        if len(matching_data) < window_size:
            logger.warning(f"Insufficient data for label {label_name}: {len(matching_data)} < {window_size}")
            continue
        
        # Create windows
        for i in range(0, len(matching_data) - window_size + 1, window_size // 2):
            window = matching_data[i:i + window_size]
            
            # Convert to format expected by training
            data_window = [
                {
                    'current': d['current'],
                    'voltage': d['voltage'],
                    'power': d['power']
                }
                for d in window
            ]
            
            labeled_windows.append({
                'data_window': data_window,
                'label': label_name,
                'start_time': window[0]['timestamp'],
                'end_time': window[-1]['timestamp']
            })
    
    logger.info(f"Created {len(labeled_windows)} labeled windows")
    
    # Count by label
    label_counts = {}
    for item in labeled_windows:
        label = item['label']
        label_counts[label] = label_counts.get(label, 0) + 1
    
    logger.info("Label distribution:")
    for label, count in label_counts.items():
        logger.info(f"  {label}: {count}")
    
    # Save labeled data
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(labeled_windows, f, indent=2)
    
    logger.info(f"Saved labeled data to {output_file}")
    return labeled_windows


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Label sensor data for training")
    parser.add_argument("--raw-data", type=str, required=True, help="Raw sensor data JSON")
    parser.add_argument("--labels", type=str, required=True, help="Labels JSON file")
    parser.add_argument("--window-size", type=int, default=50, help="Samples per window")
    parser.add_argument("--output", type=str, default="data/labeled/training_data.json")
    
    args = parser.parse_args()
    
    create_labeled_dataset(
        raw_data_file=args.raw_data,
        labels_file=args.labels,
        window_size=args.window_size,
        output_file=args.output
    )





