# SATSHIELD AI / ML Subsystem

Isolated Machine Learning environment for SATSHIELD satellite anomaly detection and health analytics.

## Directory Structure
- `data/`:
  - `satellite_telemetry.csv` (Raw synthetic telemetry)
  - `satellite_telemetry_clean.csv` (Cleaned & typed telemetry)
  - `satellite_features.csv` (Feature-engineered dataset with 42 numerical features)
- `models/`:
  - `isolation_forest.joblib` (Trained scikit-learn IsolationForest model artifact)
  - `feature_columns.json` (Exact 42-feature schema used during training)
  - `training_metadata.json` (Training metadata, sample counts, parameters)
  - `validation_results.json` (Structured JSON validation metrics on 2,400 unseen frames)
  - `validation_report.txt` (Human-readable validation report & breakdown)
- `train_model.py`: Model training & split pipeline (Step 5).
- `validate_model.py`: Empirical model validation & metrics pipeline (Step 6).
- `predict.py`: Reusable real-time anomaly inference service & CLI demo (Step 7).
- `test_predict.py`: Comprehensive test suite for inference pipeline & validation (Step 7).
- `ml_service.py`: Backend integration adapter & telemetry normalizer (Step 8).
- `test_backend_integration.py`: End-to-end integration test suite across FastAPI endpoints (Step 8).
- `requirements.txt`: Python ML dependencies (`numpy`, `pandas`, `scikit-learn`, `joblib`).
- `test_env.py`: Environment verification script.
