"""
ML Model Training Script
"""
import argparse
import json
import logging
import joblib
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from app.ml.preprocessor import DataPreprocessor
from app.ml.features import get_feature_names

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_labeled_data(filepath: str) -> list:
    """Load labeled training data from JSON file"""
    with open(filepath, 'r') as f:
        data = json.load(f)
    return data


def train_model(training_data_path: str, 
                model_output_path: str,
                test_size: float = 0.2,
                n_estimators: int = 100,
                max_depth: int = None,
                random_state: int = 42):
    """
    Train Random Forest classifier for load identification
    
    Args:
        training_data_path: Path to JSON file with labeled data
        model_output_path: Path to save trained model
        test_size: Fraction of data to use for testing
        n_estimators: Number of trees in Random Forest
        max_depth: Maximum depth of trees
        random_state: Random seed for reproducibility
    """
    logger.info("Loading training data...")
    labeled_data = load_labeled_data(training_data_path)
    logger.info(f"Loaded {len(labeled_data)} labeled samples")
    
    # Preprocess data
    logger.info("Preprocessing data...")
    preprocessor = DataPreprocessor()
    X, y = preprocessor.prepare_training_data(labeled_data)
    
    logger.info(f"Feature matrix shape: {X.shape}")
    logger.info(f"Number of classes: {len(np.unique(y))}")
    logger.info(f"Classes: {preprocessor.get_label_mapping()}")
    
    # Scale features
    X_scaled = preprocessor.scale_features(X, fit=True)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=test_size, random_state=random_state, stratify=y
    )
    
    logger.info(f"Training set size: {X_train.shape[0]}")
    logger.info(f"Test set size: {X_test.shape[0]}")
    
    # Train model
    logger.info("Training Random Forest classifier...")
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=random_state,
        n_jobs=-1,
        verbose=1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate on test set
    logger.info("Evaluating model...")
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    logger.info(f"Test Accuracy: {accuracy:.4f}")
    logger.info("\nClassification Report:")
    logger.info(classification_report(y_test, y_pred))
    
    # Cross-validation
    logger.info("Performing cross-validation...")
    cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring='accuracy')
    logger.info(f"Cross-validation accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Save model
    logger.info(f"Saving model to {model_output_path}...")
    model_data = {
        'model': model,
        'preprocessor': preprocessor,
        'feature_names': get_feature_names(),
        'label_mapping': preprocessor.get_label_mapping(),
        'accuracy': float(accuracy),
        'cv_accuracy_mean': float(cv_scores.mean()),
        'cv_accuracy_std': float(cv_scores.std())
    }
    
    Path(model_output_path).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model_data, model_output_path)
    
    logger.info("Model training completed successfully!")
    return model, preprocessor, accuracy


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train NILM load classification model")
    parser.add_argument("--data", type=str, required=True, help="Path to labeled training data JSON")
    parser.add_argument("--output", type=str, default="models/load_classifier.pkl", help="Output model path")
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

