# Satellite Health Monitor - Phase 1: Python ML Anomaly Detection Foundation

This backend module provides real machine learning anomaly detection for satellite telemetry using Scikit-Learn's **Isolation Forest** algorithm.

## Architecture

```
backend/
├── data/
│   ├── generate_dataset.py       # Generates realistic normal baseline satellite telemetry
│   └── telemetry_data.csv        # 10,000 normal baseline telemetry samples
├── models/
│   └── isolation_forest_model.joblib  # Trained model, Scaler, statistical baselines, and metadata
├── ml/
│   ├── __init__.py               # Exposes SatelliteAnomalyDetector
│   ├── train.py                  # Training pipeline using Scikit-learn & Joblib
│   └── detector.py               # Real ML inference engine with telemetry attribution
├── test_detector.py              # Test suite evaluating 5 core operational scenarios
└── README.md                     # Documentation & usage guide
```

## Monitored Telemetry Parameters

The ML model is trained on 5 telemetry parameters:
1. **`battery_voltage`**: Satellite main electrical bus voltage (Nominal: ~28.0V - 32.5V)
2. **`battery_current`**: Main battery charge/discharge current (Nominal: ~2.0A - 12.0A)
3. **`temperature`**: Subsystem internal bus temperature (Nominal: ~15.0°C - 35.0°C)
4. **`solar_power`**: Solar array electrical power output (Nominal: ~450.0W - 850.0W)
5. **`communication_signal`**: RF carrier signal strength (Nominal: ~ -95.0 dBm to -70.0 dBm)

---

## Quick Start & Usage

### 1. (Optional) Re-generate Dataset
```bash
python backend/data/generate_dataset.py
```

### 2. Train the Isolation Forest Model
```bash
python backend/ml/train.py
```
This fits `StandardScaler` and `IsolationForest` on normal operational data, calculates statistical quantile bounds, and serializes the complete artifact to `backend/models/isolation_forest_model.joblib`.

### 3. Run the Test Suite (5 Scenarios)
```bash
python backend/test_detector.py
```

---

## Python API Usage

```python
from backend.ml.detector import SatelliteAnomalyDetector

# Initialize the detector (loads model automatically from backend/models/)
detector = SatelliteAnomalyDetector()

# Example telemetry frame
sample_telemetry = {
    "battery_voltage": 20.50,       # Degraded undervoltage
    "battery_current": 18.20,       # High draw
    "temperature": 25.00,
    "solar_power": 650.00,
    "communication_signal": -82.00
}

# Run real ML inference
result = detector.analyze_frame(sample_telemetry)

print("Status:", result["status"])                    # 'anomaly' or 'normal'
print("Is Anomaly:", result["is_anomaly"])            # True or False
print("Anomaly Score:", result["anomaly_score"])      # Real ML decision score (< 0 is anomaly)
print("Affected Telemetry:", result["affected_telemetry"])
```

### Result Schema:
```json
{
  "status": "anomaly",
  "is_anomaly": true,
  "anomaly_score": -0.1824,
  "affected_telemetry": {
    "battery_voltage": {
      "observed_value": 20.5,
      "baseline_mean": 29.8,
      "normal_range": [28.14, 31.67],
      "z_score": -10.74,
      "deviation_direction": "DEGRADED_LOW"
    },
    "battery_current": {
      "observed_value": 18.2,
      "baseline_mean": 6.5,
      "normal_range": [2.89, 10.11],
      "z_score": 6.49,
      "deviation_direction": "ELEVATED_HIGH"
    }
  },
  "feature_count": 5,
  "input_telemetry": { ... }
}
```
