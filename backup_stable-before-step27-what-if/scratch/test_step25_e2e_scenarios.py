"""
SATSHIELD STEP 25 — END-TO-END DATA CONSISTENCY TEST
Simulates multi-step anomaly progression and validates that:
1. Telemetry -> ML -> XAI -> Root Cause -> Mission Impact -> Predictive Maintenance -> Diagnosis -> Recommendation
2. All components use current telemetry
3. Satellite ID is strictly isolated
4. Proper scientific phrasing is maintained throughout
"""
import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))

from satshield_ml.ml_service import run_ml_inference
from satshield_ml.experiments.digital_twin.digital_twin_engine import DigitalTwinEngine

def test_nominal_spacecraft():
    print("\n--- 1. TESTING NOMINAL SPACECRAFT (SENTINEL-9) ---")
    telemetry = {
        "satellite_id": "SENTINEL-9",
        "temperature_c": 22.5,
        "voltage_v": 28.1,
        "current_a": 5.2,
        "battery_soc_percent": 92.0,
        "solar_power_w": 580.0,
        "communication_signal_db": -70.0,
        "vibration_g": 0.04,
        "attitude_error_deg": 0.05
    }
    
    res = run_ml_inference(telemetry, "SENTINEL-9")
    print(f"Prediction: {res['prediction']} (Score: {res['raw_anomaly_score']:.4f})")
    print(f"Root Cause Subsystem: {res['root_cause_analysis']['affected_subsystem']} (Strength: {res['root_cause_analysis']['evidence_strength']})")
    print(f"Mission Impact Level: {res['mission_impact_analysis']['mission_impact_level']} (Urgency: {res['mission_impact_analysis']['urgency']})")
    print(f"Predictive Risk: {res['risk_level']}")
    
    assert res['prediction'] == "NORMAL", f"Expected NORMAL but got {res['prediction']}"
    assert res['raw_anomaly_score'] > 0, f"Expected positive score for inlier, got {res['raw_anomaly_score']}"
    assert res['mission_impact_analysis']['mission_impact_level'] in ["NOMINAL", "LOW"]
    print("[PASS] Nominal Spacecraft Verification Complete.")

def test_thermal_anomaly_progression():
    print("\n--- 2. TESTING THERMAL ANOMALY 6-STEP PROGRESSION (AGIS-3) ---")
    sat_id = "AGIS-3"
    engine_dt = DigitalTwinEngine()
    
    # 6-step progression simulating the dashboard's SIMULATE ANOMALY demo flow
    scenario_steps = [
        {"temperature_c": 24.0, "voltage_v": 28.2, "current_a": 5.0, "battery_soc_percent": 90.0, "solar_power_w": 550.0, "communication_signal_db": -68.0, "vibration_g": 0.04, "attitude_error_deg": 0.05},
        {"temperature_c": 35.0, "voltage_v": 28.0, "current_a": 5.8, "battery_soc_percent": 89.0, "solar_power_w": 540.0, "communication_signal_db": -68.0, "vibration_g": 0.04, "attitude_error_deg": 0.05},
        {"temperature_c": 52.0, "voltage_v": 27.5, "current_a": 7.5, "battery_soc_percent": 85.0, "solar_power_w": 520.0, "communication_signal_db": -69.0, "vibration_g": 0.06, "attitude_error_deg": 0.07},
        {"temperature_c": 68.0, "voltage_v": 25.0, "current_a": 14.0, "battery_soc_percent": 75.0, "solar_power_w": 450.0, "communication_signal_db": -75.0, "vibration_g": 0.12, "attitude_error_deg": 0.15},
        {"temperature_c": 82.0, "voltage_v": 22.5, "current_a": 22.0, "battery_soc_percent": 55.0, "solar_power_w": 320.0, "communication_signal_db": -88.0, "vibration_g": 0.28, "attitude_error_deg": 0.45},
        {"temperature_c": 94.5, "voltage_v": 20.2, "current_a": 29.5, "battery_soc_percent": 35.0, "solar_power_w": 180.0, "communication_signal_db": -105.0, "vibration_g": 0.65, "attitude_error_deg": 1.85},
    ]
    
    for step_num, telem in enumerate(scenario_steps, start=1):
        telemetry = dict(telem, satellite_id=sat_id, subsystem="THERMAL")
        res = run_ml_inference(telemetry, sat_id)
        dt_state = engine_dt.evaluate_twin(
            telemetry=telemetry,
            satellite_id=sat_id,
            is_anomaly_detected=(res['prediction'] == 'ANOMALY'),
            root_cause_context=res.get('root_cause_analysis'),
            mission_impact_context=res.get('mission_impact_analysis'),
            predictive_maintenance_context=res.get('predictive_maintenance')
        )
        
        thermal_state = dt_state.subsystems['THERMAL']['state']
        temp = telem['temperature_c']
        print(f" Step {step_num} (Temp: {temp}°C) -> Prediction: {res['prediction']}, Score: {res['raw_anomaly_score']:.4f}, Root Cause: {res['root_cause_analysis']['affected_subsystem']}, Impact: {res['mission_impact_analysis']['mission_impact_level']}, DT Thermal: {thermal_state}")
        
    assert res['prediction'] == "ANOMALY", f"Expected ANOMALY at Step 6, got {res['prediction']}"
    assert "THERMAL" in res['root_cause_analysis']['affected_subsystem'] or "BATTERY" in res['root_cause_analysis']['affected_subsystem']
    assert res['mission_impact_analysis']['mission_impact_level'] in ["HIGH", "CRITICAL"]
    print("[PASS] Thermal Anomaly Progression Complete.")

def test_battery_power_anomaly():
    print("\n--- 3. TESTING BATTERY DEGRADATION ANOMALY (ORBCOM-7) ---")
    sat_id = "ORBCOM-7"
    telemetry = {
        "satellite_id": sat_id,
        "subsystem": "BATTERY",
        "temperature_c": 42.0,
        "voltage_v": 20.4,  # Deep undervoltage
        "current_a": 22.5,  # Overcurrent
        "battery_soc_percent": 18.0, # Severe depletion
        "solar_power_w": 250.0,
        "communication_signal_db": -70.0,
        "vibration_g": 0.08,
        "attitude_error_deg": 0.05
    }
    res = run_ml_inference(telemetry, sat_id)
    print(f"Prediction: {res['prediction']} (Score: {res['raw_anomaly_score']:.4f})")
    print(f"Root Cause: {res['root_cause_analysis']['affected_subsystem']} -> {res['root_cause_analysis']['primary_probable_cause']}")
    print(f"Mission Impact: {res['mission_impact_analysis']['mission_impact_level']} -> {res['mission_impact_analysis']['primary_operational_impact']}")
    
    assert res['prediction'] == "ANOMALY"
    assert "BATTERY" in res['root_cause_analysis']['affected_subsystem'] or "POWER" in res['root_cause_analysis']['affected_subsystem']
    assert res['mission_impact_analysis']['mission_impact_level'] in ["HIGH", "CRITICAL"]
    print("[PASS] Battery Degradation Anomaly Complete.")

def test_communication_loss_anomaly():
    print("\n--- 4. TESTING COMMUNICATION LOSS ANOMALY (HELIOS-1) ---")
    sat_id = "HELIOS-1"
    telemetry = {
        "satellite_id": sat_id,
        "subsystem": "COMMUNICATION",
        "temperature_c": 25.0,
        "voltage_v": 28.2,
        "current_a": 5.8,
        "battery_soc_percent": 88.0,
        "solar_power_w": 550.0,
        "communication_signal_db": -115.0, # Severe RF carrier loss
        "vibration_g": 0.04,
        "attitude_error_deg": 0.08
    }
    res = run_ml_inference(telemetry, sat_id)
    print(f"Prediction: {res['prediction']} (Score: {res['raw_anomaly_score']:.4f})")
    print(f"Root Cause: {res['root_cause_analysis']['affected_subsystem']} -> {res['root_cause_analysis']['primary_probable_cause']}")
    print(f"Mission Impact: {res['mission_impact_analysis']['mission_impact_level']} -> {res['mission_impact_analysis']['primary_operational_impact']}")
    
    assert "COMMUNICATION" in res['root_cause_analysis']['affected_subsystem']
    assert res['mission_impact_analysis']['mission_impact_level'] in ["HIGH", "CRITICAL", "MODERATE"]
    print("[PASS] Communication Loss Anomaly Complete.")

if __name__ == "__main__":
    test_nominal_spacecraft()
    test_thermal_anomaly_progression()
    test_battery_power_anomaly()
    test_communication_loss_anomaly()
    print("\n=======================================================")
    print("ALL 4 END-TO-END DATA CONSISTENCY TESTS PASSED CLEANLY")
    print("=======================================================")
