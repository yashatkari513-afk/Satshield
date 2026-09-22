"""
SATSHIELD ML Pipeline - Step 7: Automated Tests for Inference Service
Verifies model loading, feature schema integrity, prediction correctness, error handling, and determinism.
"""
import os
import sys
import numpy as np

# Add base directory to path
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base_dir)

from predict import SatelliteAnomalyPredictor, predict_telemetry, RAW_TELEMETRY_FIELDS

def run_tests():
    print("=" * 70)
    print("SATSHIELD ML INFERENCE SERVICE UNIT & INTEGRATION TESTS")
    print("=" * 70)

    # 1. Test Model and Feature Schema Loading
    print("[TEST 1] Testing model and feature schema loading...")
    predictor = SatelliteAnomalyPredictor()
    assert predictor.is_loaded is True, "Predictor failed to report is_loaded = True"
    assert predictor.model is not None, "Predictor model artifact is None"
    assert len(predictor.feature_columns) == 42, f"Expected 42 feature columns, got {len(predictor.feature_columns)}"
    print("  -> [PASS] Trained IsolationForest model and 42 feature schema loaded successfully.")

    # 2. Test Normal Sample Processing
    print("\n[TEST 2] Testing normal telemetry sample inference...")
    normal_sample = {
        'satellite_id': 'GSAT-30',
        'subsystem': 'BATTERY',
        'temperature_c': 25.1,
        'voltage_v': 28.2,
        'current_a': 6.0,
        'battery_soc_percent': 90.0,
        'solar_power_w': 550.0,
        'communication_signal_db': -68.0,
        'vibration_g': 0.045,
        'attitude_error_deg': 0.08,
        'timestamp': '2026-03-01 10:00:00'
    }
    res_norm = predictor.predict(normal_sample)
    assert res_norm['prediction'] == 'NORMAL', f"Expected NORMAL, got {res_norm['prediction']}"
    assert res_norm['raw_anomaly_score'] > 0.0, f"Expected positive score for inlier, got {res_norm['raw_anomaly_score']}"
    assert res_norm['data_quality'] == 'GOOD', "Data quality not marked GOOD"
    print(f"  -> [PASS] Normal sample evaluated: Prediction={res_norm['prediction']}, Raw Score={res_norm['raw_anomaly_score']:+.6f}")

    # 3. Test Anomaly Sample Processing
    print("\n[TEST 3] Testing anomaly telemetry sample inference...")
    anomaly_sample = {
        'satellite_id': 'INSAT-3D',
        'subsystem': 'THERMAL',
        'temperature_c': 78.4, # Severe Overheating
        'voltage_v': 21.8,     # Undervoltage
        'current_a': 28.5,     # Current surge
        'battery_soc_percent': 30.0,
        'solar_power_w': 150.0,
        'communication_signal_db': -120.0,
        'vibration_g': 0.85,
        'attitude_error_deg': 8.5,
        'timestamp': '2026-03-01 10:01:00'
    }
    res_anom = predictor.predict(anomaly_sample)
    assert res_anom['prediction'] == 'ANOMALY', f"Expected ANOMALY, got {res_anom['prediction']}"
    assert res_anom['raw_anomaly_score'] < 0.0, f"Expected negative score for outlier, got {res_anom['raw_anomaly_score']}"
    assert len(res_anom['evidence']) > 0, "Expected evidence strings for anomaly"
    print(f"  -> [PASS] Anomaly sample evaluated: Prediction={res_anom['prediction']}, Raw Score={res_anom['raw_anomaly_score']:+.6f}")
    print(f"            Evidence: {res_anom['evidence']}")

    # 4. Test Output Required Fields
    print("\n[TEST 4] Testing output structure for required fields...")
    required_keys = [
        'satellite_id', 'prediction', 'raw_anomaly_score', 'subsystem',
        'model_type', 'model_status', 'feature_count', 'data_quality',
        'evidence', 'explanation', 'timestamp'
    ]
    for k in required_keys:
        assert k in res_norm, f"Missing key in response: '{k}'"
    print(f"  -> [PASS] All {len(required_keys)} required output fields present in prediction response.")

    # 5. Test Invalid Telemetry Handling (Safe Error Handling, No Crashes)
    print("\n[TEST 5] Testing invalid telemetry input handling...")
    
    # Missing required field
    bad_sample_1 = {'satellite_id': 'SAT-001', 'temperature_c': 25.0} # Missing voltage, current, etc.
    res_bad_1 = predictor.predict(bad_sample_1)
    assert res_bad_1['prediction'] == 'ERROR', f"Expected ERROR for missing fields, got {res_bad_1['prediction']}"
    assert 'Missing required telemetry field' in res_bad_1['error']

    # Non-numeric string value
    bad_sample_2 = dict(normal_sample)
    bad_sample_2['voltage_v'] = "CORRUPTED_STRING"
    res_bad_2 = predictor.predict(bad_sample_2)
    assert res_bad_2['prediction'] == 'ERROR', f"Expected ERROR for non-numeric field, got {res_bad_2['prediction']}"

    # NaN value
    bad_sample_3 = dict(normal_sample)
    bad_sample_3['temperature_c'] = np.nan
    res_bad_3 = predictor.predict(bad_sample_3)
    assert res_bad_3['prediction'] == 'ERROR', f"Expected ERROR for NaN field, got {res_bad_3['prediction']}"

    # Infinite value
    bad_sample_4 = dict(normal_sample)
    bad_sample_4['vibration_g'] = np.inf
    res_bad_4 = predictor.predict(bad_sample_4)
    assert res_bad_4['prediction'] == 'ERROR', f"Expected ERROR for inf field, got {res_bad_4['prediction']}"

    print("  -> [PASS] All invalid telemetry inputs handled safely without runtime exceptions.")

    # 6. Test Determinism (No random value generation)
    print("\n[TEST 6] Testing inference determinism (zero random generation)...")
    res_run1 = predictor.predict(normal_sample)
    res_run2 = predictor.predict(normal_sample)
    assert res_run1['raw_anomaly_score'] == res_run2['raw_anomaly_score'], "Scores differ across identical runs"
    assert res_run1['prediction'] == res_run2['prediction'], "Predictions differ across identical runs"
    print("  -> [PASS] Model inference is strictly deterministic.")

    # 7. Test Public API Wrapper
    print("\n[TEST 7] Testing public predict_telemetry() wrapper...")
    res_api = predict_telemetry(normal_sample)
    assert res_api['prediction'] == 'NORMAL', "Public wrapper returned unexpected result"
    print("  -> [PASS] Public API wrapper predict_telemetry() working properly.")

    print("-" * 70)
    print("RESULT: ALL 7 INFERENCE SERVICE TESTS PASSED.")
    print("=" * 70)

if __name__ == '__main__':
    run_tests()
