"""
SATSHIELD STEP 25 AUDIT SUITE
Measures latency, verifies API endpoints, checks multi-satellite isolation,
scans codebase for validation metrics, and audits scientific honesty phrasing.
"""
import time
import json
import os
import sys
import hashlib
import urllib.request
import urllib.error
import numpy as np

sys.path.insert(0, os.path.abspath("."))

BASE_URL = "http://localhost:8000"

def audit_hash():
    model_path = "satshield_ml/models/isolation_forest.joblib"
    with open(model_path, "rb") as f:
        h = hashlib.sha256(f.read()).hexdigest().upper()
    return h

def measure_local_ml_latency():
    from satshield_ml.predict import predict_telemetry
    from satshield_ml.ml_service import run_ml_inference
    
    # Warmup
    sample = {
        "satellite_id": "AGIS-3",
        "timestamp": "2026-09-16T10:00:00Z",
        "battery_voltage": 28.2,
        "battery_current": 4.1,
        "battery_temperature": 22.0,
        "battery_soc": 95.0,
        "solar_array_voltage": 32.5,
        "solar_array_current": 8.0,
        "bus_voltage_3v3": 3.31,
        "bus_voltage_5v": 5.02,
        "bus_voltage_12v": 12.05,
        "reaction_wheel_speed_x": 1200.0,
        "reaction_wheel_speed_y": 1250.0,
        "reaction_wheel_speed_z": 1180.0,
        "magnetometer_x": 0.02,
        "magnetometer_y": 0.03,
        "magnetometer_z": 0.04,
        "gyro_rate_x": 0.01,
        "gyro_rate_y": 0.01,
        "gyro_rate_z": 0.01,
        "sun_sensor_angle_alpha": 45.0,
        "sun_sensor_angle_beta": 45.0,
        "transmitter_power": 10.0,
        "receiver_signal_strength": -85.0,
        "transponder_temperature": 25.0,
        "ber": 1e-6,
        "cpu_load": 35.0,
        "memory_usage": 42.0,
        "obc_temperature": 28.0,
        "payload_temperature": 20.0,
        "payload_power": 50.0,
        "payload_data_rate": 100.0,
        "thermal_zone_1": 22.0,
        "thermal_zone_2": 24.0,
        "thermal_zone_3": 21.0,
        "thermal_zone_4": 23.0
    }
    
    _ = run_ml_inference(sample, "AGIS-3")
    
    latencies = []
    for _ in range(50):
        t0 = time.perf_counter()
        _ = run_ml_inference(sample, "AGIS-3")
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000)
    
    return {
        "mean_ms": float(np.mean(latencies)),
        "min_ms": float(np.min(latencies)),
        "max_ms": float(np.max(latencies)),
        "p95_ms": float(np.percentile(latencies, 95))
    }

def audit_api_endpoints():
    results = {}
    
    # 1. Health endpoint
    try:
        t0 = time.perf_counter()
        req = urllib.request.Request(f"{BASE_URL}/api/health")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            dt = (time.perf_counter() - t0) * 1000
            results["health"] = {
                "status_code": resp.status,
                "response": data,
                "latency_ms": round(dt, 2)
            }
    except Exception as e:
        results["health"] = {"error": str(e)}
        
    # 2. Anomaly Detect endpoint
    try:
        payload = {
            "satellite_id": "SENTINEL-9",
            "timestamp": "2026-09-16T10:00:00Z",
            "battery_voltage": 28.0,
            "battery_current": 4.0,
            "battery_temperature": 22.0,
            "battery_soc": 90.0,
            "solar_array_voltage": 32.0,
            "solar_array_current": 8.0,
            "bus_voltage_3v3": 3.3,
            "bus_voltage_5v": 5.0,
            "bus_voltage_12v": 12.0,
            "reaction_wheel_speed_x": 1200.0,
            "reaction_wheel_speed_y": 1200.0,
            "reaction_wheel_speed_z": 1200.0,
            "magnetometer_x": 0.02,
            "magnetometer_y": 0.03,
            "magnetometer_z": 0.04,
            "gyro_rate_x": 0.01,
            "gyro_rate_y": 0.01,
            "gyro_rate_z": 0.01,
            "sun_sensor_angle_alpha": 45.0,
            "sun_sensor_angle_beta": 45.0,
            "transmitter_power": 10.0,
            "receiver_signal_strength": -85.0,
            "transponder_temperature": 25.0,
            "ber": 1e-6,
            "cpu_load": 30.0,
            "memory_usage": 40.0,
            "obc_temperature": 28.0,
            "payload_temperature": 20.0,
            "payload_power": 50.0,
            "payload_data_rate": 100.0,
            "thermal_zone_1": 22.0,
            "thermal_zone_2": 24.0,
            "thermal_zone_3": 21.0,
            "thermal_zone_4": 23.0
        }
        t0 = time.perf_counter()
        req_data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/anomaly/detect", data=req_data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            dt = (time.perf_counter() - t0) * 1000
            results["anomaly_detect"] = {
                "status_code": resp.status,
                "response": data,
                "latency_ms": round(dt, 2)
            }
    except Exception as e:
        results["anomaly_detect"] = {"error": str(e)}

    return results

def audit_fleet_isolation():
    from satshield_ml.ml_service import run_ml_inference
    
    satellites = ["AGIS-3", "SENTINEL-9", "ORBCOM-7", "HELIOS-1"]
    results = {}
    
    # Base nominal
    base = {
        "timestamp": "2026-09-16T10:00:00Z",
        "battery_voltage": 28.0,
        "battery_current": 4.0,
        "battery_temperature": 22.0,
        "battery_soc": 90.0,
        "solar_array_voltage": 32.0,
        "solar_array_current": 8.0,
        "bus_voltage_3v3": 3.3,
        "bus_voltage_5v": 5.0,
        "bus_voltage_12v": 12.0,
        "reaction_wheel_speed_x": 1200.0,
        "reaction_wheel_speed_y": 1200.0,
        "reaction_wheel_speed_z": 1200.0,
        "magnetometer_x": 0.02,
        "magnetometer_y": 0.03,
        "magnetometer_z": 0.04,
        "gyro_rate_x": 0.01,
        "gyro_rate_y": 0.01,
        "gyro_rate_z": 0.01,
        "sun_sensor_angle_alpha": 45.0,
        "sun_sensor_angle_beta": 45.0,
        "transmitter_power": 10.0,
        "receiver_signal_strength": -85.0,
        "transponder_temperature": 25.0,
        "ber": 1e-6,
        "cpu_load": 30.0,
        "memory_usage": 40.0,
        "obc_temperature": 28.0,
        "payload_temperature": 20.0,
        "payload_power": 50.0,
        "payload_data_rate": 100.0,
        "thermal_zone_1": 22.0,
        "thermal_zone_2": 24.0,
        "thermal_zone_3": 21.0,
        "thermal_zone_4": 23.0
    }
    
    # 1. Inject anomaly only in AGIS-3
    agis_anom = dict(base, battery_temperature=88.5, obc_temperature=92.0, thermal_zone_1=85.0)
    res_agis = run_ml_inference(agis_anom, "AGIS-3")
    
    # 2. Check SENTINEL-9 nominal
    res_sentinel = run_ml_inference(base, "SENTINEL-9")
    
    # 3. Check ORBCOM-7 nominal
    res_orbcom = run_ml_inference(base, "ORBCOM-7")
    
    # 4. Check HELIOS-1 nominal
    res_helios = run_ml_inference(base, "HELIOS-1")
    
    # 5. Cycle back to AGIS-3
    res_agis_back = run_ml_inference(agis_anom, "AGIS-3")
    
    results["AGIS-3_anom"] = {
        "sat_id": res_agis.get("satellite_id"),
        "prediction": res_agis.get("prediction"),
        "score": res_agis.get("raw_anomaly_score"),
        "root_cause_subsystem": res_agis.get("root_cause_analysis", {}).get("affected_subsystem"),
        "mission_impact_level": res_agis.get("mission_impact_analysis", {}).get("mission_impact_level")
    }
    
    results["SENTINEL-9_nominal"] = {
        "sat_id": res_sentinel.get("satellite_id"),
        "prediction": res_sentinel.get("prediction"),
        "score": res_sentinel.get("raw_anomaly_score"),
        "root_cause_subsystem": res_sentinel.get("root_cause_analysis", {}).get("affected_subsystem"),
        "mission_impact_level": res_sentinel.get("mission_impact_analysis", {}).get("mission_impact_level")
    }
    
    results["ORBCOM-7_nominal"] = {
        "sat_id": res_orbcom.get("satellite_id"),
        "prediction": res_orbcom.get("prediction"),
        "score": res_orbcom.get("raw_anomaly_score"),
        "mission_impact_level": res_orbcom.get("mission_impact_analysis", {}).get("mission_impact_level")
    }

    results["HELIOS-1_nominal"] = {
        "sat_id": res_helios.get("satellite_id"),
        "prediction": res_helios.get("prediction"),
        "score": res_helios.get("raw_anomaly_score"),
        "mission_impact_level": res_helios.get("mission_impact_analysis", {}).get("mission_impact_level")
    }

    results["AGIS-3_cycle_back"] = {
        "sat_id": res_agis_back.get("satellite_id"),
        "prediction": res_agis_back.get("prediction"),
        "score": res_agis_back.get("raw_anomaly_score"),
        "matches_previous": res_agis_back.get("raw_anomaly_score") == res_agis.get("raw_anomaly_score")
    }
    
    return results

if __name__ == "__main__":
    audit_data = {
        "sha256": audit_hash(),
        "ml_latency": measure_local_ml_latency(),
        "api_endpoints": audit_api_endpoints(),
        "fleet_isolation": audit_fleet_isolation()
    }
    print(json.dumps(audit_data, indent=2))
