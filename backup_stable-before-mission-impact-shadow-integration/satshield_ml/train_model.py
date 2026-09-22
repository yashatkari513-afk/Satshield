"""
SATSHIELD ML Pipeline - Step 5: Isolation Forest Anomaly Detection Model Training
Trains an unsupervised IsolationForest model strictly on nominal (NORMAL) satellite telemetry,
saving the model artifact, feature list, and training metadata.
"""
import os
import sys
import json
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

def train_model():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, 'data', 'satellite_features.csv')
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    model_output_path = os.path.join(models_dir, 'isolation_forest.joblib')
    features_output_path = os.path.join(models_dir, 'feature_columns.json')
    metadata_output_path = os.path.join(models_dir, 'training_metadata.json')

    print("=" * 75)
    print("SATSHIELD ML PIPELINE — STEP 5: ISOLATION FOREST MODEL TRAINING")
    print("=" * 75)

    # 1. Load feature dataset
    if not os.path.exists(data_path):
        print(f"[FAIL] Features file not found at: {data_path}")
        sys.exit(1)

    df = pd.read_csv(data_path)
    print(f"Loaded dataset from: {data_path} ({len(df)} total rows)")

    # 2. Sort chronologically per satellite
    df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
    df = df.sort_values(by=['satellite_id', 'timestamp']).reset_index(drop=True)

    # 3. Identify feature columns (exclude non-feature metadata)
    exclude_cols = {'timestamp', 'satellite_id', 'subsystem', 'label'}
    feature_cols = [col for col in df.columns if col not in exclude_cols]
    
    print(f"Identified {len(feature_cols)} numerical telemetry & engineered features.")

    # 4. Perform Time-Aware Split per Satellite
    # IsolationForest is trained ONLY on NORMAL telemetry observations.
    # Earlier NORMAL frames form the training baseline; later NORMAL + all ANOMALY form validation.
    train_dfs = []
    val_dfs = []
    split_ratio = 0.80

    for sat_id, sat_group in df.groupby('satellite_id', sort=False):
        normal_samples = sat_group[sat_group['label'] == 'NORMAL'].copy()
        anomaly_samples = sat_group[sat_group['label'] == 'ANOMALY'].copy()

        n_train = int(len(normal_samples) * split_ratio)
        train_normal = normal_samples.iloc[:n_train]
        val_normal = normal_samples.iloc[n_train:]

        train_dfs.append(train_normal)
        val_dfs.append(val_normal)
        val_dfs.append(anomaly_samples)

    train_df = pd.concat(train_dfs, ignore_index=True)
    val_df = pd.concat(val_dfs, ignore_index=True)

    X_train = train_df[feature_cols].copy()
    X_val = val_df[feature_cols].copy()

    satellites_list = sorted(list(df['satellite_id'].unique()))
    normal_train_count = len(train_df)
    val_normal_count = int((val_df['label'] == 'NORMAL').sum())
    val_anomaly_count = int((val_df['label'] == 'ANOMALY').sum())
    total_val_count = len(val_df)

    print("-" * 75)
    print("Dataset Split Summary:")
    print(f"  • Training Samples (NORMAL only)     : {normal_train_count:,}")
    print(f"  • Validation Samples (Held-out)     : {total_val_count:,}")
    print(f"      - Held-out Normal Telemetry     : {val_normal_count:,}")
    print(f"      - Held-out Anomaly Telemetry    : {val_anomaly_count:,}")
    print(f"  • Total Dataset Accounted For       : {normal_train_count + total_val_count:,}")
    print(f"  • Satellites Included               : {', '.join(satellites_list)}")
    print("-" * 75)

    # 5. Initialize and Train IsolationForest
    # Unsupervised Anomaly Detection: Learns nominal multi-dimensional subspace boundaries
    print("Training scikit-learn IsolationForest (contamination='auto', random_state=42)...")
    iso_forest = IsolationForest(
        n_estimators=150,
        max_samples='auto',
        contamination='auto',
        max_features=1.0,
        bootstrap=False,
        n_jobs=-1,
        random_state=42,
        verbose=0
    )

    training_start = datetime.now()
    iso_forest.fit(X_train)
    training_duration_ms = (datetime.now() - training_start).total_seconds() * 1000.0
    print(f"[PASS] Model training completed in {training_duration_ms:.2f} ms")

    # 6. Save Model Artifact
    joblib.dump(iso_forest, model_output_path)
    print(f"[PASS] Model artifact saved to: {model_output_path}")

    # 7. Save Feature Columns JSON
    with open(features_output_path, 'w', encoding='utf-8') as f:
        json.dump(feature_cols, f, indent=2)
    print(f"[PASS] Feature list saved to: {features_output_path}")

    # 8. Save Training Metadata JSON
    metadata = {
        "model_type": "Unsupervised Anomaly Detection",
        "algorithm": "scikit-learn IsolationForest",
        "training_timestamp": datetime.now().isoformat(),
        "training_sample_count": normal_train_count,
        "validation_sample_count": total_val_count,
        "feature_count": len(feature_cols),
        "feature_names": feature_cols,
        "satellites_used": satellites_list,
        "normal_training_samples": normal_train_count,
        "validation_normal_samples": val_normal_count,
        "validation_anomaly_samples": val_anomaly_count,
        "random_state": 42,
        "contamination": "auto",
        "n_estimators": 150,
        "data_source": "satshield_ml/data/satellite_features.csv",
        "data_type": "synthetic/demo telemetry",
        "note": "IsolationForest trained strictly on nominal (NORMAL) telemetry frames without access to anomaly labels."
    }

    with open(metadata_output_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"[PASS] Training metadata saved to: {metadata_output_path}")

    # 9. Perform Basic Smoke Test
    print("-" * 75)
    print("EXECUTING IN-MEMORY SMOKE TEST...")
    
    # Reload model and feature list from disk using joblib
    loaded_model = joblib.load(model_output_path)
    with open(features_output_path, 'r', encoding='utf-8') as f:
        loaded_features = json.load(f)

    if loaded_features != feature_cols:
        print("[FAIL] Loaded feature list does not match training feature list!")
        sys.exit(1)

    # Sample normal and anomaly test instances from validation set
    sample_normal = val_df[val_df['label'] == 'NORMAL'].head(3)
    sample_anomaly = val_df[val_df['label'] == 'ANOMALY'].head(3)

    print("\n--- Smoke Test: Normal Telemetry Inference ---")
    norm_scores = loaded_model.decision_function(sample_normal[loaded_features])
    norm_preds = loaded_model.predict(sample_normal[loaded_features]) # 1 = inlier (normal), -1 = outlier (anomaly)
    for idx, (sat, sub) in enumerate(zip(sample_normal['satellite_id'], sample_normal['subsystem'])):
        status_str = "Inlier (Normal)" if norm_preds[idx] == 1 else "Outlier (Flagged)"
        print(f"  [Normal Sample {idx+1}] Sat: {sat:<10} | Subsystem: {sub:<14} | Raw Score: {norm_scores[idx]:+.4f} | Prediction: {status_str}")

    print("\n--- Smoke Test: Anomaly Telemetry Inference ---")
    anom_scores = loaded_model.decision_function(sample_anomaly[loaded_features])
    anom_preds = loaded_model.predict(sample_anomaly[loaded_features])
    for idx, (sat, sub) in enumerate(zip(sample_anomaly['satellite_id'], sample_anomaly['subsystem'])):
        status_str = "Inlier (Normal)" if anom_preds[idx] == 1 else "Outlier (Anomaly)"
        print(f"  [Anomaly Sample {idx+1}] Sat: {sat:<10} | Subsystem: {sub:<14} | Raw Score: {anom_scores[idx]:+.4f} | Prediction: {status_str}")

    print("-" * 75)
    print("SMOKE TEST RESULT: MODEL LOADED & INFERRED RAW ANOMALY SCORES SUCCESSFULLY.")
    print("=" * 75)

    return {
        "status": "PASS",
        "training_samples": normal_train_count,
        "validation_samples": total_val_count,
        "feature_count": len(feature_cols),
        "model_path": model_output_path,
        "feature_list_path": features_output_path,
        "metadata_path": metadata_output_path
    }

if __name__ == '__main__':
    train_model()
