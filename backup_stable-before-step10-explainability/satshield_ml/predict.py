"""
SATSHIELD ML Pipeline - Step 7: Real-Time Inference Service
Provides a production-grade inference service that loads the trained scikit-learn IsolationForest model,
validates incoming telemetry, prepares identical feature schemas, and returns empirical anomaly predictions.
"""
import os
import sys
import json
from collections import deque
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple, Union
import joblib
import numpy as np
import pandas as pd

# Core 8 raw telemetry measurement fields
RAW_TELEMETRY_FIELDS = [
    'temperature_c',
    'voltage_v',
    'current_a',
    'battery_soc_percent',
    'solar_power_w',
    'communication_signal_db',
    'vibration_g',
    'attitude_error_deg'
]

# Physical nominal operational boundaries for telemetry validation & evidence extraction
PHYSICAL_NOMINAL_RANGES = {
    'temperature_c': (15.0, 45.0, 'Thermal sensor operating envelope'),
    'voltage_v': (25.0, 30.0, 'EPS main power distribution bus voltage'),
    'current_a': (2.0, 12.0, 'Total power bus current draw'),
    'battery_soc_percent': (60.0, 100.0, 'Battery State of Charge'),
    'solar_power_w': (350.0, 750.0, 'Photovoltaic generation capacity'),
    'communication_signal_db': (-90.0, -50.0, 'RF downlink receiver power'),
    'vibration_g': (0.01, 0.15, 'Structural accelerometer vibration baseline'),
    'attitude_error_deg': (0.00, 0.50, '3-axis attitude pointing deviation')
}


class SatelliteAnomalyPredictor:
    """
    Inference service for SATSHIELD IsolationForest anomaly detector.
    Manages model lifecycle, telemetry buffering, feature extraction, and evidence grounding.
    """

    def __init__(self, model_path: Optional[str] = None, feature_columns_path: Optional[str] = None):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = model_path or os.path.join(base_dir, 'models', 'isolation_forest.joblib')
        self.feature_columns_path = feature_columns_path or os.path.join(base_dir, 'models', 'feature_columns.json')
        
        self.model = None
        self.feature_columns = []
        self.is_loaded = False
        self.history_buffers: Dict[str, deque] = {} # Key: satellite_id -> deque of recent raw frames
        
        self._load_model_artifacts()

    def _load_model_artifacts(self) -> None:
        """Loads trained IsolationForest model artifact and exact feature schema from disk."""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Trained model artifact not found at: {self.model_path}")
        if not os.path.exists(self.feature_columns_path):
            raise FileNotFoundError(f"Feature columns schema not found at: {self.feature_columns_path}")

        try:
            self.model = joblib.load(self.model_path)
            with open(self.feature_columns_path, 'r', encoding='utf-8') as f:
                self.feature_columns = json.load(f)
            self.is_loaded = True
        except Exception as e:
            self.is_loaded = False
            raise RuntimeError(f"Failed to initialize IsolationForest inference service: {e}")

    def validate_telemetry_input(self, data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Strict telemetry validation: ensures all required fields exist, are numeric,
        and do not contain NaN or infinite values.
        """
        if not isinstance(data, dict):
            return False, "Telemetry input must be a dictionary object"

        # Check required raw fields
        for field in RAW_TELEMETRY_FIELDS:
            if field not in data:
                return False, f"Missing required telemetry field: '{field}'"
            
            val = data[field]
            if val is None or isinstance(val, (bool, str)):
                try:
                    val = float(val)
                except (ValueError, TypeError):
                    return False, f"Field '{field}' has invalid non-numeric value: {data[field]}"
            
            if np.isnan(val):
                return False, f"Field '{field}' contains NaN value"
            if np.isinf(val):
                return False, f"Field '{field}' contains infinite value (inf/-inf)"

        return True, None

    def _prepare_features(self, sat_id: str, raw_data: Dict[str, float]) -> pd.DataFrame:
        """
        Constructs the exact 42-feature vector required by the trained IsolationForest model.
        Uses recent telemetry history for the specific satellite to compute deltas and rolling deviations.
        """
        if sat_id not in self.history_buffers:
            self.history_buffers[sat_id] = deque(maxlen=5)

        buffer = self.history_buffers[sat_id]
        
        # Current raw values
        current_raw = {k: float(raw_data[k]) for k in RAW_TELEMETRY_FIELDS}
        
        # Previous frame for Delta (first difference) calculation
        if len(buffer) > 0:
            prev_raw = buffer[-1]
        else:
            prev_raw = current_raw

        # Add current frame to history buffer
        buffer.append(current_raw)
        
        # Create rolling window dataframe
        window_df = pd.DataFrame(list(buffer))

        # Build feature dictionary
        features: Dict[str, float] = {}

        # 1. Raw Telemetry values
        for k in RAW_TELEMETRY_FIELDS:
            features[k] = current_raw[k]

        # 2. Rate of Change / Delta features
        for k in RAW_TELEMETRY_FIELDS:
            base_name = k.replace('_c', '').replace('_v', '').replace('_a', '').replace('_percent', '').replace('_w', '').replace('_db', '').replace('_g', '').replace('_deg', '')
            features[f"{base_name}_change"] = current_raw[k] - prev_raw[k]

        # 3. Rolling Baseline Statistics & Deviations
        for k in RAW_TELEMETRY_FIELDS:
            base_name = k.replace('_c', '').replace('_v', '').replace('_a', '').replace('_percent', '').replace('_w', '').replace('_db', '').replace('_g', '').replace('_deg', '')
            r_mean = float(window_df[k].mean())
            r_std = float(window_df[k].std()) if len(window_df) > 1 else 0.0
            
            features[f"{base_name}_deviation"] = round(current_raw[k] - r_mean, 4)
            features[f"{base_name}_rolling_mean"] = round(r_mean, 4)
            features[f"{base_name}_rolling_std"] = round(r_std, 4)

        # 4. Domain-Specific Physical Metrics
        power_draw = round(current_raw['voltage_v'] * current_raw['current_a'], 2)
        net_power = round(current_raw['solar_power_w'] - power_draw, 2)
        features['power_draw_w'] = power_draw
        features['net_power_w'] = net_power

        # Construct single-row DataFrame aligned strictly with feature_columns order
        feature_vector = pd.DataFrame([features])[self.feature_columns]
        return feature_vector

    def _extract_evidence_and_explanation(self, raw_data: Dict[str, float], prediction: str) -> Tuple[List[str], str]:
        """
        Extracts factual physical telemetry evidence based strictly on observed deviations
        from nominal operating bounds.
        """
        evidence = []

        # Temperature
        temp = float(raw_data['temperature_c'])
        if temp > PHYSICAL_NOMINAL_RANGES['temperature_c'][1]:
            evidence.append(f"Temperature elevated at {temp:.1f}°C (exceeds nominal {PHYSICAL_NOMINAL_RANGES['temperature_c'][1]:.1f}°C limit)")
        elif temp < PHYSICAL_NOMINAL_RANGES['temperature_c'][0]:
            evidence.append(f"Temperature depressed at {temp:.1f}°C (below nominal {PHYSICAL_NOMINAL_RANGES['temperature_c'][0]:.1f}°C limit)")

        # Voltage
        volt = float(raw_data['voltage_v'])
        if volt < PHYSICAL_NOMINAL_RANGES['voltage_v'][0]:
            evidence.append(f"Bus voltage depressed at {volt:.2f}V (below nominal {PHYSICAL_NOMINAL_RANGES['voltage_v'][0]:.1f}V threshold)")
        elif volt > PHYSICAL_NOMINAL_RANGES['voltage_v'][1]:
            evidence.append(f"Bus voltage elevated at {volt:.2f}V (exceeds nominal {PHYSICAL_NOMINAL_RANGES['voltage_v'][1]:.1f}V threshold)")

        # Current
        curr = float(raw_data['current_a'])
        if curr > PHYSICAL_NOMINAL_RANGES['current_a'][1]:
            evidence.append(f"Current draw surged to {curr:.2f}A (exceeds nominal {PHYSICAL_NOMINAL_RANGES['current_a'][1]:.1f}A limit)")

        # Battery SoC
        soc = float(raw_data['battery_soc_percent'])
        if soc < PHYSICAL_NOMINAL_RANGES['battery_soc_percent'][0]:
            evidence.append(f"Battery SoC depleted to {soc:.1f}% (below nominal {PHYSICAL_NOMINAL_RANGES['battery_soc_percent'][0]:.1f}% floor)")

        # Comm Signal
        comm = float(raw_data['communication_signal_db'])
        if comm < PHYSICAL_NOMINAL_RANGES['communication_signal_db'][0]:
            evidence.append(f"RF signal degraded to {comm:.1f} dBm (below nominal {PHYSICAL_NOMINAL_RANGES['communication_signal_db'][0]:.1f} dBm link threshold)")

        # Vibration
        vib = float(raw_data['vibration_g'])
        if vib > PHYSICAL_NOMINAL_RANGES['vibration_g'][1]:
            evidence.append(f"Vibration level spiked to {vib:.4f}g (exceeds nominal {PHYSICAL_NOMINAL_RANGES['vibration_g'][1]:.2f}g baseline)")

        # Attitude Error
        att = float(raw_data['attitude_error_deg'])
        if att > PHYSICAL_NOMINAL_RANGES['attitude_error_deg'][1]:
            evidence.append(f"Attitude pointing error at {att:.3f}° (exceeds nominal {PHYSICAL_NOMINAL_RANGES['attitude_error_deg'][1]:.2f}° fine-pointing limit)")

        if prediction == "ANOMALY":
            if evidence:
                explanation = "Anomaly detected by IsolationForest: " + "; ".join(evidence) + "."
            else:
                explanation = "Anomaly detected by IsolationForest: Multi-variate sub-system correlation deviation from learned nominal envelope."
        else:
            explanation = "Nominal operating telemetry: All parameters lie within learned multidimensional operational boundaries."

        return evidence, explanation

    def predict(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes end-to-end anomaly prediction on incoming satellite telemetry.
        """
        # 1. Validate Input
        is_valid, err_msg = self.validate_telemetry_input(telemetry)
        if not is_valid:
            return {
                "satellite_id": str(telemetry.get("satellite_id", "UNKNOWN")),
                "prediction": "ERROR",
                "raw_anomaly_score": 0.0,
                "subsystem": telemetry.get("subsystem"),
                "model_type": "IsolationForest",
                "model_status": "trained_model_loaded" if self.is_loaded else "not_loaded",
                "feature_count": len(self.feature_columns),
                "data_quality": "INVALID",
                "error": err_msg,
                "evidence": [],
                "explanation": f"Inference rejected: {err_msg}",
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            }

        sat_id = str(telemetry.get('satellite_id', 'SAT-001'))
        subsystem = telemetry.get('subsystem', 'UNKNOWN')

        # 2. Feature Preparation
        try:
            X = self._prepare_features(sat_id, telemetry)
        except Exception as e:
            return {
                "satellite_id": sat_id,
                "prediction": "ERROR",
                "raw_anomaly_score": 0.0,
                "subsystem": subsystem,
                "model_type": "IsolationForest",
                "model_status": "trained_model_loaded",
                "feature_count": len(self.feature_columns),
                "data_quality": "FEATURE_EXTRACTION_ERROR",
                "error": str(e),
                "evidence": [],
                "explanation": f"Feature engineering failed: {e}",
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            }

        # 3. Model Inference
        # decision_function: positive = inlier (nominal), negative = outlier (anomaly)
        raw_score = float(self.model.decision_function(X)[0])
        raw_pred = int(self.model.predict(X)[0]) # 1 = inlier, -1 = outlier
        prediction = "ANOMALY" if raw_pred == -1 else "NORMAL"

        # 4. Telemetry Evidence & Explanation
        evidence, explanation = self._extract_evidence_and_explanation(telemetry, prediction)

        return {
            "satellite_id": sat_id,
            "prediction": prediction,
            "raw_anomaly_score": round(raw_score, 6),
            "subsystem": subsystem,
            "model_type": "IsolationForest",
            "model_status": "trained_model_loaded",
            "feature_count": len(self.feature_columns),
            "data_quality": "GOOD",
            "evidence": evidence,
            "explanation": explanation,
            "timestamp": telemetry.get("timestamp", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"))
        }


# Global Singleton Predictor Instance
_GLOBAL_PREDICTOR: Optional[SatelliteAnomalyPredictor] = None

def get_predictor() -> SatelliteAnomalyPredictor:
    """Returns the singleton predictor instance, loading artifacts on first call."""
    global _GLOBAL_PREDICTOR
    if _GLOBAL_PREDICTOR is None:
        _GLOBAL_PREDICTOR = SatelliteAnomalyPredictor()
    return _GLOBAL_PREDICTOR

def predict_telemetry(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Public reusable API function for satellite telemetry anomaly prediction.
    Accepts telemetry dictionary and returns structured inference results.
    """
    predictor = get_predictor()
    return predictor.predict(telemetry)


def run_cli_test():
    """Executes the standard CLI inference test on normal and anomalous samples."""
    print("=" * 70)
    print("SATSHIELD AI/ML INFERENCE TEST")
    print("=" * 70)
    
    predictor = get_predictor()
    print("Model: IsolationForest")
    print(f"Model Loaded: {'YES' if predictor.is_loaded else 'NO'}")
    print(f"Feature Count: {len(predictor.feature_columns)}")
    print("-" * 70)

    # 1. Normal Sample
    normal_sample = {
        'satellite_id': 'INSAT-3D',
        'subsystem': 'POWER',
        'temperature_c': 24.8,
        'voltage_v': 28.3,
        'current_a': 6.2,
        'battery_soc_percent': 91.5,
        'solar_power_w': 560.0,
        'communication_signal_db': -67.4,
        'vibration_g': 0.042,
        'attitude_error_deg': 0.075,
        'timestamp': '2026-03-01 12:00:00'
    }

    res_normal = predictor.predict(normal_sample)

    print("Normal Sample:")
    print(f"  Satellite: {res_normal['satellite_id']}")
    print(f"  Prediction: {res_normal['prediction']}")
    print(f"  Raw Score: {res_normal['raw_anomaly_score']:+.6f}")
    print(f"  Explanation: {res_normal['explanation']}")
    print("-" * 70)

    # 2. Anomaly Sample (Sustained Overheating & Voltage Depressed)
    anomaly_sample = {
        'satellite_id': 'SAT-001',
        'subsystem': 'THERMAL',
        'temperature_c': 74.5, # Severe overheating
        'voltage_v': 22.4,     # Critical bus drop
        'current_a': 26.8,     # Current surge
        'battery_soc_percent': 34.0, # Rapid depletion
        'solar_power_w': 180.0,
        'communication_signal_db': -118.0, # RF fade
        'vibration_g': 0.78,   # Reaction wheel vibration
        'attitude_error_deg': 6.4, # Attitude deviation
        'timestamp': '2026-03-01 12:01:00'
    }

    res_anomaly = predictor.predict(anomaly_sample)

    print("Anomaly Sample:")
    print(f"  Satellite: {res_anomaly['satellite_id']}")
    print(f"  Prediction: {res_anomaly['prediction']}")
    print(f"  Raw Score: {res_anomaly['raw_anomaly_score']:+.6f}")
    print(f"  Evidence: {res_anomaly['evidence']}")
    print(f"  Explanation: {res_anomaly['explanation']}")
    print("=" * 70)

if __name__ == '__main__':
    run_cli_test()
