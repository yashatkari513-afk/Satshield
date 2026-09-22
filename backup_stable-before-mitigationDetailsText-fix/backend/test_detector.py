"""
Comprehensive Telemetry ML Anomaly Detection Test Suite
Tests the Isolation Forest model across the 5 required satellite health scenarios:
1. Normal telemetry
2. Abnormal battery telemetry
3. Abnormal temperature telemetry
4. Abnormal solar-power telemetry
5. Combined abnormal telemetry
"""

import os
import sys
import json

# Ensure parent directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.detector import SatelliteAnomalyDetector

def format_json(obj):
    return json.dumps(obj, indent=2)

def run_tests():
    print("=" * 80)
    print("SATELLITE HEALTH MONITOR - REAL ML ANOMALY DETECTION TEST RUNNER")
    print("Algorithm: Isolation Forest (Scikit-Learn)")
    print("=" * 80)
    
    detector = SatelliteAnomalyDetector()
    print(f"Loaded ML model successfully from: {detector.model_path}")
    print(f"Features monitored: {detector.feature_names}\n")
    
    test_cases = [
        {
            "name": "Test 1: Normal Telemetry (Standard Operational Baseline)",
            "telemetry": {
                "battery_voltage": 29.85,
                "battery_current": 6.42,
                "temperature": 23.80,
                "solar_power": 670.50,
                "communication_signal": -81.20
            },
            "expected": "normal"
        },
        {
            "name": "Test 2: Abnormal Battery Telemetry (Severe Undervoltage / Bus Degradation)",
            "telemetry": {
                "battery_voltage": 21.30,        # Critical undervoltage (< 28.0V normal)
                "battery_current": 18.50,       # Current surge (> 12.0A normal)
                "temperature": 24.10,
                "solar_power": 650.00,
                "communication_signal": -82.00
            },
            "expected": "anomaly"
        },
        {
            "name": "Test 3: Abnormal Temperature Telemetry (Thermal Runaway)",
            "telemetry": {
                "battery_voltage": 29.50,
                "battery_current": 6.10,
                "temperature": 68.40,           # Severe overheating (> 35°C normal)
                "solar_power": 680.00,
                "communication_signal": -80.50
            },
            "expected": "anomaly"
        },
        {
            "name": "Test 4: Abnormal Solar-Power Telemetry (Array Failure / Occlusion)",
            "telemetry": {
                "battery_voltage": 28.10,
                "battery_current": 5.80,
                "temperature": 22.00,
                "solar_power": 120.00,          # Severe solar generation drop (< 450W normal)
                "communication_signal": -81.00
            },
            "expected": "anomaly"
        },
        {
            "name": "Test 5: Combined Abnormal Telemetry (Multi-Subsystem Critical Anomaly)",
            "telemetry": {
                "battery_voltage": 19.80,        # Severe voltage collapse
                "battery_current": 22.40,       # Extreme overcurrent
                "temperature": 74.20,           # Critical thermal spike
                "solar_power": 85.00,           # Solar generation collapse
                "communication_signal": -118.50  # RF signal loss
            },
            "expected": "anomaly"
        }
    ]
    
    results = []
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n[{i}/5] Executing: {test['name']}")
        print("-" * 70)
        print("Input Telemetry Frame:")
        for k, v in test['telemetry'].items():
            print(f"  - {k:22s}: {v}")
        
        result = detector.analyze_frame(test['telemetry'])
        results.append(result)
        
        status_label = "[!] ANOMALY DETECTED" if result['is_anomaly'] else "[OK] NOMINAL"
        print(f"\nML Inference Output:")
        print(f"  * Status            : {result['status'].upper()} ({status_label})")
        print(f"  * Anomaly Score     : {result['anomaly_score']} (decision_function score; < 0 = anomaly)")
        deviations = result.get('parameter_deviations', {})
        print(f"  * Affected Telemetry: {len(deviations)} parameter(s) deviated")
        
        if deviations:
            for param, details in deviations.items():
                print(f"      - {param}: observed={details['observed_value']} (normal range: {details['normal_range'][0]} to {details['normal_range'][1]}), z_score={details['z_score']}, direction={details['deviation_direction']}")
        else:
            print("      (All parameters within normal baseline statistical bounds)")
        
        # Validation check
        match = (result['status'] == test['expected'])
        print(f"  * Test Assertion    : {'PASSED' if match else 'FAILED'} (Expected: {test['expected']}, Got: {result['status']})")
    
    print("\n" + "=" * 80)
    passed_count = sum(1 for i, r in enumerate(results) if r['status'] == test_cases[i]['expected'])
    print(f"SUMMARY: {passed_count}/{len(test_cases)} Tests Passed with 100% Real ML Inference.")
    print("=" * 80)

if __name__ == '__main__':
    run_tests()
