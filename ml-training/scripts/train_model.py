"""
Wrapper script to train model using the backend training module
"""
import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.ml.train import train_model
import argparse


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train NILM load classification model")
    parser.add_argument("--data", type=str, required=True, help="Path to labeled training data JSON")
    parser.add_argument("--output", type=str, default="backend/app/ml/models/load_classifier.pkl", help="Output model path")
    parser.add_argument("--test-size", type=float, default=0.2, help="Test set fraction")
    parser.add_argument("--n-estimators", type=int, default=100, help="Number of trees")
    parser.add_argument("--max-depth", type=int, default=None, help="Max tree depth")
    parser.add_argument("--random-state", type=int, default=42, help="Random seed")
    
    args = parser.parse_args()
    
    train_model(
        training_data_path=args.data,
        model_output_path=args.output,
        test_size=args.test_size,
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        random_state=args.random_state
    )

