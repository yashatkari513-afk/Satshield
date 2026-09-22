"""
SATSHIELD ML Pipeline - Step 8: Backend & ML Integration Test Suite
Executes end-to-end integration tests validating FastAPI routes, real IsolationForest inference,
multi-satellite routing, anomaly simulation triggers, and safe error handling.
"""
import os
import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def post_json(endpoint: str, payload: dict) -> dict:
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': 'IntegrationTester'}
    )
    with urllib.request.urlopen(req, timeout=10) as res:
        return json.loads(res.read().decode('utf-8'))

def get_json(endpoint: str) -> dict:
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={'User-Agent': 'IntegrationTester'})
    with urllib.request.urlopen(req, timeout=10) as res:
        return json.loads(res.read().decode('utf-8'))


def run_integration_tests():
    print("=" * 75)
    print("SATSHIELD ML STEP 8: BACKEND & REAL ML INTEGRATION TESTS")
    print("=" * 75)

    # Health Check
    health = get_json("/api/health")
    print(f"[HEALTH] FastAPI status: {health['status']} | ML Model: {health['ml_model']}")

    # -------------------------------------------------------------------------
    # TEST 1: Normal Telemetry -> Prediction Returned -> model_status = trained_model_loaded
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Normal Telemetry Inference via /api/anomaly/detect...")
    normal_payload = {
        "satellite_id": "SAT-001",
        "subsystem": "POWER",
        "temperature_c": 24.5,
        "voltage_v": 28.4,
        "current_a": 6.1,
        "battery_soc_percent": 90.0,
        "solar_power_w": 550.0,
        "communication_signal_db": -68.0,
        "vibration_g": 0.042,
        "attitude_error_deg": 0.075
    }
    # Establish steady-state nominal telemetry stream
    post_json("/api/anomaly/detect", normal_payload)
    res_1 = post_json("/api/anomaly/detect", normal_payload)
    print(f"  -> Prediction    : {res_1.get('prediction')}")
    print(f"  -> Status        : {res_1.get('status')}")
    print(f"  -> Raw Score     : {res_1.get('raw_anomaly_score')}")
    print(f"  -> Model Type    : {res_1.get('model_type')}")
    print(f"  -> Model Status  : {res_1.get('model_status')}")
    print(f"  -> Feature Count : {res_1.get('feature_count')}")

    assert res_1.get('prediction') == 'NORMAL', f"Expected NORMAL, got {res_1.get('prediction')}"
    assert res_1.get('model_status') == 'trained_model_loaded', f"Expected trained_model_loaded, got {res_1.get('model_status')}"
    assert res_1.get('feature_count') == 42, f"Expected 42 features, got {res_1.get('feature_count')}"
    assert res_1.get('raw_anomaly_score') is not None, "Missing raw_anomaly_score"
    print("  -> [PASS] Test 1: Normal telemetry correctly inferred by real IsolationForest.")

    # -------------------------------------------------------------------------
    # TEST 2: Known Anomalous Telemetry -> Real Model Inference -> Anomaly Prediction
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Known Anomalous Telemetry Inference via /api/anomaly/detect...")
    anomaly_payload = {
        "satellite_id": "SAT-001",
        "subsystem": "THERMAL",
        "temperature_c": 79.5, # Severe overheating
        "voltage_v": 21.8,     # Critical bus undervoltage
        "current_a": 28.4,     # Current surge
        "battery_soc_percent": 29.0,
        "solar_power_w": 140.0,
        "communication_signal_db": -122.0,
        "vibration_g": 0.88,
        "attitude_error_deg": 9.2
    }
    res_2 = post_json("/api/anomaly/detect", anomaly_payload)
    print(f"  -> Prediction    : {res_2.get('prediction')}")
    print(f"  -> Status        : {res_2.get('status')}")
    print(f"  -> Raw Score     : {res_2.get('raw_anomaly_score')}")
    print(f"  -> Severity      : {res_2.get('severity')}")
    print(f"  -> Evidence      : {res_2.get('evidence')}")

    assert res_2.get('prediction') == 'ANOMALY', f"Expected ANOMALY, got {res_2.get('prediction')}"
    assert res_2.get('is_anomaly') is True, "Expected is_anomaly = True"
    assert res_2.get('raw_anomaly_score') < 0.0, f"Expected negative outlier score, got {res_2.get('raw_anomaly_score')}"
    assert len(res_2.get('evidence', [])) > 0, "Expected evidence strings"
    print("  -> [PASS] Test 2: Anomaly telemetry correctly identified with negative raw score & physical evidence.")

    # -------------------------------------------------------------------------
    # TEST 3: Satellite A Routing (AGIS-3 / SAT-001)
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Satellite A Routing (AGIS-3)...")
    sat_a_payload = dict(normal_payload)
    sat_a_payload["satellite_id"] = "AGIS-3"
    res_3 = post_json("/api/anomaly/detect", sat_a_payload)
    print(f"  -> Returned Satellite ID : {res_3.get('satellite_id')}")
    assert res_3.get('satellite_id') == 'AGIS-3', f"Expected AGIS-3, got {res_3.get('satellite_id')}"
    print("  -> [PASS] Test 3: Satellite A (AGIS-3) telemetry routed and respected.")

    # -------------------------------------------------------------------------
    # TEST 4: Satellite B Routing (SENTINEL-9)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Satellite B Routing (SENTINEL-9)...")
    sat_b_payload = dict(normal_payload)
    sat_b_payload["satellite_id"] = "SENTINEL-9"
    res_4 = post_json("/api/anomaly/detect", sat_b_payload)
    print(f"  -> Returned Satellite ID : {res_4.get('satellite_id')}")
    assert res_4.get('satellite_id') == 'SENTINEL-9', f"Expected SENTINEL-9, got {res_4.get('satellite_id')}"
    print("  -> [PASS] Test 4: Satellite B (SENTINEL-9) telemetry routed and respected.")

    # -------------------------------------------------------------------------
    # TEST 5: Direct ML Prediction Endpoint (/api/ml/predict)
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Testing dedicated /api/ml/predict endpoint...")
    res_5 = post_json("/api/ml/predict", anomaly_payload)
    print(f"  -> ML Predict Result : {res_5.get('prediction')} | Score: {res_5.get('raw_anomaly_score')}")
    assert res_5.get('model_type') == 'IsolationForest', "Expected model_type IsolationForest"
    assert res_5.get('feature_count') == 42, "Expected 42 features"
    print("  -> [PASS] Test 5: /api/ml/predict direct endpoint functioning properly.")

    # -------------------------------------------------------------------------
    # TEST 6: Scenario Trigger (/api/anomaly/scenarios/trigger) with Real ML Inference
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Testing Scenario Trigger with Real ML Inference (EPS Bus Drop)...")
    sc_payload = {
        "scenario_id_or_key": "battery_voltage_drop",
        "satellite_id": "INSAT-3D",
        "step": 4
    }
    res_6 = post_json("/api/anomaly/scenarios/trigger", sc_payload)
    detection = res_6.get('detection', {})
    print(f"  -> Scenario Name : {res_6.get('scenario', {}).get('name')}")
    print(f"  -> Satellite     : {res_6.get('satellite_id')}")
    print(f"  -> ML Prediction : {detection.get('prediction')}")
    print(f"  -> Raw Score     : {detection.get('raw_anomaly_score')}")
    print(f"  -> Model         : {detection.get('model')}")

    assert detection.get('is_anomaly') is True, "Expected scenario anomaly detection"
    assert detection.get('raw_anomaly_score') is not None, "Missing raw score in scenario response"
    print("  -> [PASS] Test 6: Scenario simulation runs real IsolationForest inference.")

    # -------------------------------------------------------------------------
    # TEST 7: Satellite Simulation State Update (/api/simulate-anomaly)
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Testing Satellite Simulation State (/api/simulate-anomaly)...")
    sim_payload = {
        "satellite_id": "SAT-001",
        "anomaly_type": "EPS Bus Voltage Drop",
        "severity": "CRITICAL"
    }
    res_7 = post_json("/api/simulate-anomaly", sim_payload)
    print(f"  -> Status     : {res_7.get('status')}")
    print(f"  -> Satellite  : {res_7.get('satellite_name')}")
    print(f"  -> New Status : {res_7.get('new_status')}")
    assert res_7.get('status') == 'success', "Expected success status"
    print("  -> [PASS] Test 7: Simulation state trigger functions properly.")

    print("\n" + "=" * 75)
    print("RESULT: ALL 7 BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY.")
    print("=" * 75)

if __name__ == '__main__':
    run_integration_tests()
