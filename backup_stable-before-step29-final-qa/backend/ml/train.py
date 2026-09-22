"""
SATSHIELD AI - Satellite Telemetry Isolation Forest Training Pipeline
Trains a robust Scikit-Learn Isolation Forest anomaly detector on normal baseline telemetry,
calculating multivariate distribution bounds, Z-score thresholds, and score calibration.
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Ensure parent directory is in path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from data.generate_dataset import generate_normal_telemetry, FEATURE_NAMES, CORE_5_FEATURES

def train_isolation_forest():
    data_path = os.path.join(backend_dir, 'data', 'telemetry_data.csv')
    models_dir = os.path.join(backend_dir, 'models')
    model_path = os.path.join(models_dir, 'isolation_forest_model.joblib')
    
    os.makedirs(models_dir, exist_ok=True)
    
    # 1. Generate or load baseline dataset
    print(f"Generating comprehensive normal baseline dataset...")
    df = generate_normal_telemetry(num_samples=15000)
    df.to_csv(data_path, index=False)
    
    # Features used for the primary ML vector
    # Support both full features and flexible imputation
    features_to_use = FEATURE_NAMES
    X = df[features_to_use].values
    print(f"Training data shape: {X.shape} with {len(features_to_use)} monitored telemetry features")
    
    # 2. Fit StandardScaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # 3. Train Isolation Forest
    iso_forest = IsolationForest(
        n_estimators=300,
        max_samples=512,
        contamination=0.015, # 1.5% expected nominal boundary variance
        random_state=42,
        n_jobs=-1
    )
    
    print("Training Isolation Forest on normal baseline telemetry...")
    iso_forest.fit(X_scaled)
    
    # 4. Compute baseline statistics for every feature for feature attribution, XAI & Z-scores
    baseline_stats = {}
    for col in df.columns:
        vals = df[col].values
        baseline_stats[col] = {
            'mean': float(np.mean(vals)),
            'std': float(np.std(vals)) if float(np.std(vals)) > 0 else 1.0,
            'min': float(np.min(vals)),
            'max': float(np.max(vals)),
            'p01': float(np.percentile(vals, 1)),
            'p05': float(np.percentile(vals, 5)),
            'p95': float(np.percentile(vals, 95)),
            'p99': float(np.percentile(vals, 99)),
            'median': float(np.median(vals)),
            'q25': float(np.percentile(vals, 25)),
            'q75': float(np.percentile(vals, 75))
        }
    
    # Compute baseline decision score threshold for calibration
    train_scores = iso_forest.decision_function(X_scaled)
    score_min = float(np.min(train_scores))
    score_max = float(np.max(train_scores))
    score_mean = float(np.mean(train_scores))
    score_std = float(np.std(train_scores))
    offset = float(iso_forest.offset_)
    
    model_artifact = {
        'model': iso_forest,
        'scaler': scaler,
        'feature_names': features_to_use,
        'core_5_features': CORE_5_FEATURES,
        'baseline_stats': baseline_stats,
        'threshold_info': {
            'contamination': 0.015,
            'decision_score_min': score_min,
            'decision_score_max': score_max,
            'decision_score_mean': score_mean,
            'decision_score_std': score_std,
            'offset': offset,
            # Continuous score calibration bounds
            'nominal_anchor': score_mean,
            'critical_anchor': offset - 0.15
        },
        'metadata': {
            'algorithm': 'IsolationForest',
            'version': '2.0.0-SIH-STANDARD',
            'n_estimators': 300,
            'max_samples': 512,
            'trained_samples': len(df),
            'training_features': features_to_use,
            'created_at': pd.Timestamp.now(tz='UTC').isoformat()
        }
    }
    
    joblib.dump(model_artifact, model_path)
    print(f"\nModel artifact saved successfully to: {model_path}")
    print(f"Artifact size: {os.path.getsize(model_path) / 1024:.2f} KB")
    print(f"Offset: {offset:.4f} | Decision Score Range: [{score_min:.4f}, {score_max:.4f}]")
    print("\nLearned Subsystem Baselines:")
    for feat in features_to_use:
        s = baseline_stats[feat]
        print(f"  - {feat:22s}: mean={s['mean']:7.2f}, normal range=[{s['p01']:7.2f}, {s['p99']:7.2f}], std={s['std']:.2f}")
    
    return model_path

if __name__ == '__main__':
    train_isolation_forest()
