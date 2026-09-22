"""
Test script for FastAPI Anomaly Detection endpoints
"""

import json
import urllib.request
from datetime import datetime

def test_api():
    print("=" * 80)
    print("TESTING FASTAPI /api/health ENDPOINT")
    print("=" * 80)
    
    health_req = urllib.request.urlopen("http://127.0.0.1:8000/api/health")
    health_data = json.loads(health_req.read().decode('utf-8'))
    print(f"Health Response: {health_data}")
    assert health_data["status"] == "ok"
    assert health_data["ml_model"] == "loaded"
    print("Health check PASSED!\n")
    
    print("=" * 80)
    print("TESTING FASTAPI /api/anomaly/detect ENDPOINT (5 SCENARIOS)")
    print("=" * 80)
    
    test_sat_id = f"SAT-API-{int(datetime.now().timestamp())}"
    cases = [
        (
            "CASE 1: Normal Telemetry",
            {
                "satellite_id": test_sat_id,
                "battery_voltage": 29.8,
                "battery_current": 6.5,
                "temperature": 24.5,
                "solar_power": 650.0,
                "communication_signal": -82.0
            },
            "normal"
        ),
        (
            "CASE 2: Battery Anomaly (Undervoltage & Current Spike)",
            {
                "satellite_id": test_sat_id,
                "battery_voltage": 21.3,
                "battery_current": 18.5,
                "temperature": 24.1,
                "solar_power": 650.0,
                "communication_signal": -82.0
            },
            "anomaly"
        ),
        (
            "CASE 3: Temperature Anomaly (Thermal Runaway)",
            {
                "satellite_id": test_sat_id,
                "battery_voltage": 29.5,
                "battery_current": 6.1,
                "temperature": 68.4,
                "solar_power": 680.0,
                "communication_signal": -80.5
            },
            "anomaly"
        ),
        (
            "CASE 4: Solar Power Anomaly (Array Occlusion/Drop)",
            {
                "satellite_id": test_sat_id,
                "battery_voltage": 28.1,
                "battery_current": 5.8,
                "temperature": 22.0,
                "solar_power": 120.0,
                "communication_signal": -81.0
            },
            "anomaly"
        ),
        (
            "CASE 5: Combined Anomaly (Multi-subsystem Critical Failure)",
            {
                "satellite_id": test_sat_id,
                "battery_voltage": 19.8,
                "battery_current": 22.4,
                "temperature": 74.2,
                "solar_power": 85.0,
                "communication_signal": -118.5
            },
            "anomaly"
        )
    ]
    
    for i, (name, payload, expected_status) in enumerate(cases, 1):
        print(f"\n--- [{i}/5] {name} ---")
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/anomaly/detect",
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read().decode('utf-8'))
        
        print(f"Status           : {result['status'].upper()}")
        print(f"Anomaly Score    : {result['anomaly_score']} (Real ML Isolation Forest score)")
        print(f"Model            : {result['model']}")
        print(f"Affected Metrics : {len(result['affected_telemetry'])}")
        for aff in result['affected_telemetry']:
            print(f"  * {aff['parameter']}: observed={aff['observed']} (nominal: {aff['nominal_range']}), z_score={aff['z_score']}, direction={aff['direction']}")
        
        assert result['status'] == expected_status, f"Expected {expected_status}, got {result['status']}"
        print(f"Result Assertion : PASSED (Expected '{expected_status}', got '{result['status']}')")
    
    print("\n" + "=" * 80)
    print("ALL 5 FASTAPI ANOMALY DETECTION TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == '__main__':
    test_api()
