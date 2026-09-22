"""
SATSHIELD Step 22: Root-Cause Analysis Shadow Mode Integration Test Suite
Validates all 17 required integration, safety, isolation, and regression test cases.
"""
import os
import sys
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any

# Ensure satshield_ml, backend and project root in sys.path
test_dir = os.path.dirname(os.path.abspath(__file__))
satshield_ml_dir = os.path.dirname(os.path.dirname(test_dir))
project_root = os.path.dirname(satshield_ml_dir)
backend_dir = os.path.join(project_root, "backend")

if satshield_ml_dir not in sys.path:
    sys.path.insert(0, satshield_ml_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from satshield_ml.ml_service import run_ml_inference, normalize_telemetry_payload
from satshield_ml.root_cause_service import reset_satellite_root_cause_state
from satshield_ml.predict import get_predictor


def get_file_sha256(filepath: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def run_all_shadow_integration_tests():
    print("=" * 80)
    print("SATSHIELD STEP 22: ROOT-CAUSE SHADOW MODE INTEGRATION TEST SUITE")
    print("=" * 80)

    # 0. Check production model hash
    model_path = os.path.join(satshield_ml_dir, "models", "isolation_forest.joblib")
    initial_hash = get_file_sha256(model_path)
    expected_hash = "12d956daa955157b3aa7a85f955301136373d41ec3b11d6c00c21e4b70237fdc"
    assert initial_hash == expected_hash, f"Hash mismatch: {initial_hash} vs {expected_hash}"
    print(f"[*] Production IsolationForest SHA256: {initial_hash} (VERIFIED UNCHANGED)")

    reset_satellite_root_cause_state()
    nom_base = {
        'temperature_c': 25.0, 'voltage_v': 28.2, 'current_a': 5.8,
        'battery_soc_percent': 88.0, 'solar_power_w': 550.0,
        'communication_signal_db': -68.0, 'vibration_g': 0.04, 'attitude_error_deg': 0.08
    }

    results = []

    # 1. AGIS-3 normal
    r1 = run_ml_inference(dict(nom_base), satellite_id="AGIS-3")
    rc1 = r1.get("root_cause_analysis", {})
    t1_pass = r1["prediction"] == "NORMAL" and rc1.get("affected_subsystem") == "NOMINAL"
    results.append({"id": 1, "name": "AGIS-3 normal baseline", "passed": t1_pass, "details": f"Pred={r1['prediction']}, RC={rc1.get('affected_subsystem')}"})

    # 2. AGIS-3 thermal anomaly
    f2 = dict(nom_base); f2['temperature_c'] = 68.0; f2['current_a'] = 16.0
    r2 = run_ml_inference(f2, satellite_id="AGIS-3")
    rc2 = r2.get("root_cause_analysis", {})
    t2_pass = r2["prediction"] == "ANOMALY" and rc2.get("affected_subsystem") == "THERMAL" and rc2.get("evidence_strength") in ["MODERATE", "STRONG"]
    results.append({"id": 2, "name": "AGIS-3 thermal anomaly", "passed": t2_pass, "details": f"Pred={r2['prediction']}, RC={rc2.get('affected_subsystem')} ({rc2.get('evidence_strength')})"})

    # 3. SENTINEL-9 battery anomaly
    f3 = dict(nom_base); f3['battery_soc_percent'] = 32.0; f3['voltage_v'] = 21.5; f3['current_a'] = 18.0; f3['solar_power_w'] = 140.0
    r3 = run_ml_inference(f3, satellite_id="SENTINEL-9")
    rc3 = r3.get("root_cause_analysis", {})
    t3_pass = r3["prediction"] == "ANOMALY" and rc3.get("affected_subsystem") == "BATTERY" and rc3.get("evidence_strength") in ["MODERATE", "STRONG"]
    results.append({"id": 3, "name": "SENTINEL-9 battery anomaly", "passed": t3_pass, "details": f"Pred={r3['prediction']}, RC={rc3.get('affected_subsystem')} ({rc3.get('evidence_strength')})"})

    # 4. ORBCOM-7 communication anomaly
    f4 = dict(nom_base); f4['communication_signal_db'] = -115.0
    r4 = run_ml_inference(f4, satellite_id="ORBCOM-7")
    rc4 = r4.get("root_cause_analysis", {})
    t4_pass = rc4.get("affected_subsystem") == "COMMUNICATION" and rc4.get("evidence_strength") in ["WEAK", "MODERATE", "STRONG"]
    results.append({"id": 4, "name": "ORBCOM-7 communication anomaly", "passed": t4_pass, "details": f"Pred={r4['prediction']}, RC={rc4.get('affected_subsystem')} ({rc4.get('evidence_strength')})"})

    # 5. HELIOS-1 normal
    r5 = run_ml_inference(dict(nom_base), satellite_id="HELIOS-1")
    rc5 = r5.get("root_cause_analysis", {})
    t5_pass = r5["prediction"] == "NORMAL" and rc5.get("affected_subsystem") == "NOMINAL"
    results.append({"id": 5, "name": "HELIOS-1 normal baseline", "passed": t5_pass, "details": f"Pred={r5['prediction']}, RC={rc5.get('affected_subsystem')}"})

    # 6. Combined battery + power anomaly
    f6 = dict(nom_base); f6['battery_soc_percent'] = 28.0; f6['voltage_v'] = 19.5; f6['current_a'] = 24.0
    r6 = run_ml_inference(f6, satellite_id="COMB-01")
    rc6 = r6.get("root_cause_analysis", {})
    t6_pass = r6["prediction"] == "ANOMALY" and rc6.get("affected_subsystem") in ["BATTERY", "POWER"] and rc6.get("evidence_strength") in ["MODERATE", "STRONG"]
    results.append({"id": 6, "name": "Combined battery + power anomaly", "passed": t6_pass, "details": f"Pred={r6['prediction']}, RC={rc6.get('affected_subsystem')} ({rc6.get('evidence_strength')})"})

    # 7. Ambiguous single-sensor anomaly
    f7 = dict(nom_base); f7['temperature_c'] = 48.0; f7['vibration_g'] = 0.15
    r7 = run_ml_inference(f7, satellite_id="AMB-01")
    rc7 = r7.get("root_cause_analysis", {})
    t7_pass = rc7.get("affected_subsystem") == "AMBIGUOUS / INSUFFICIENT EVIDENCE" and rc7.get("evidence_strength") == "AMBIGUOUS"
    results.append({"id": 7, "name": "Ambiguous single-sensor anomaly (refusal to hallucinate)", "passed": t7_pass, "details": f"RC={rc7.get('affected_subsystem')} ({rc7.get('evidence_strength')})"})

    # 8. Anomaly followed by recovery
    run_ml_inference(f2, satellite_id="REC-01")
    # Feed recovery sequence
    for _ in range(4):
        r8_rec = run_ml_inference(dict(nom_base), satellite_id="REC-01")
    rc8_rec = r8_rec.get("root_cause_analysis", {})
    t8_pass = r8_rec["prediction"] == "NORMAL" and rc8_rec.get("affected_subsystem") == "NOMINAL"
    results.append({"id": 8, "name": "Anomaly followed by recovery", "passed": t8_pass, "details": f"Post-recovery Pred={r8_rec['prediction']}, RC={rc8_rec.get('affected_subsystem')}"})

    # 9. Insufficient telemetry (< 3 physical channels)
    f9 = {"temperature": 25.0, "satellite_id": "INSUFF-01"}
    r9 = run_ml_inference(f9, satellite_id="INSUFF-01")
    rc9 = r9.get("root_cause_analysis", {})
    t9_pass = rc9.get("affected_subsystem") == "AMBIGUOUS / INSUFFICIENT EVIDENCE" and r9.get("data_quality") == "INSUFFICIENT"
    results.append({"id": 9, "name": "Insufficient telemetry handling", "passed": t9_pass, "details": f"DataQuality={r9.get('data_quality')}, RC={rc9.get('affected_subsystem')}"})

    # 10. Invalid NaN / Inf telemetry
    f10 = dict(nom_base); f10['temperature_c'] = float('nan')
    r10 = run_ml_inference(f10, satellite_id="NAN-01")
    rc10 = r10.get("root_cause_analysis", {})
    t10_pass = rc10.get("data_quality") == "INVALID" or r10.get("data_quality") == "INVALID" or r10.get("prediction") == "ERROR"
    results.append({"id": 10, "name": "Safe rejection of NaN/Inf telemetry", "passed": t10_pass, "details": f"Prediction={r10.get('prediction')}, DataQuality={rc10.get('data_quality') or r10.get('data_quality')}"})

    # 11. Cross-satellite isolation
    # Run heavy anomaly on SAT-A, then run nominal on SAT-B
    run_ml_inference(f3, satellite_id="ISOL-A")
    r11_b = run_ml_inference(dict(nom_base), satellite_id="ISOL-B")
    rc11_b = r11_b.get("root_cause_analysis", {})
    t11_pass = r11_b["prediction"] == "NORMAL" and rc11_b.get("affected_subsystem") == "NOMINAL" and rc11_b.get("persistence") == "0 frames"
    results.append({"id": 11, "name": "Strict cross-satellite isolation", "passed": t11_pass, "details": f"SAT-B Pred={r11_b['prediction']}, RC={rc11_b.get('affected_subsystem')}, Persistence={rc11_b.get('persistence')}"})

    # 12. Deterministic repeatability
    reset_satellite_root_cause_state()
    r12_1 = run_ml_inference(f2, satellite_id="DET-01A")
    r12_2 = run_ml_inference(f2, satellite_id="DET-01B")
    rc12_1 = r12_1.get("root_cause_analysis", {})
    rc12_2 = r12_2.get("root_cause_analysis", {})
    t12_pass = (
        r12_1["raw_anomaly_score"] == r12_2["raw_anomaly_score"] and
        r12_1["prediction"] == r12_2["prediction"] and
        rc12_1.get("affected_subsystem") == rc12_2.get("affected_subsystem") and
        rc12_1.get("evidence_strength") == rc12_2.get("evidence_strength")
    )
    results.append({"id": 12, "name": "Deterministic inference output repeatability", "passed": t12_pass, "details": f"Scores match: {r12_1['raw_anomaly_score']} == {r12_2['raw_anomaly_score']}"})

    # 13. Existing 6-step simulation compatibility
    from ml.scenarios import generate_scenario_telemetry
    sim_frames = [generate_scenario_telemetry("battery_degradation", step=s) for s in range(1, 7)]
    step6_res = run_ml_inference(sim_frames[-1], satellite_id="SIM-STEP6")
    rc_sim = step6_res.get("root_cause_analysis", {})
    t13_pass = step6_res["prediction"] == "ANOMALY" and rc_sim.get("affected_subsystem") in ["BATTERY", "POWER"]
    results.append({"id": 13, "name": "Existing 6-step simulation pipeline", "passed": t13_pass, "details": f"Step 6 Pred={step6_res['prediction']}, RC={rc_sim.get('affected_subsystem')}"})

    # 14. Automatic diagnosis after Step 6 payload integrity
    t14_pass = "root_cause_analysis" in step6_res and "evidence" in rc_sim and "contributing_factors" in rc_sim
    results.append({"id": 14, "name": "Automatic diagnosis payload after Step 6", "passed": t14_pass, "details": f"Fields: {list(rc_sim.keys())}"})

    # 15. Manual View Diagnosis payload structure
    req_fields = [
        "satellite_id", "affected_subsystem", "primary_probable_cause", "evidence",
        "contributing_factors", "evidence_strength", "severity", "persistence",
        "trend_summary", "data_quality", "analysis_method", "limitations"
    ]
    t15_pass = all(k in rc_sim for k in req_fields)
    results.append({"id": 15, "name": "Manual View Diagnosis 12-field schema compliance", "passed": t15_pass, "details": f"All 12 fields present: {t15_pass}"})

    # 16. Existing predictive-maintenance flow non-interference
    pm_res = step6_res.get("predictive_maintenance", {})
    t16_pass = "risk_level" in pm_res and "status" in pm_res and step6_res.get("risk_level") is not None
    results.append({"id": 16, "name": "Predictive maintenance non-interference", "passed": t16_pass, "details": f"RiskLevel={step6_res.get('risk_level')}, PM Status={pm_res.get('status')}"})

    # 17. Existing SET/mitigation flow compatibility
    # Simulate post-mitigation stabilization frames
    for _ in range(3):
        r17_mit = run_ml_inference(dict(nom_base), satellite_id="SIM-STEP6")
    rc17_mit = r17_mit.get("root_cause_analysis", {})
    t17_pass = r17_mit["prediction"] == "NORMAL" and rc17_mit.get("affected_subsystem") == "NOMINAL"
    results.append({"id": 17, "name": "SET / mitigation stabilization flow", "passed": t17_pass, "details": f"Post-mitigation Pred={r17_mit['prediction']}, RC={rc17_mit.get('affected_subsystem')}"})

    # Output test matrix
    all_passed = True
    print("\n[+] TEST RESULTS MATRIX:")
    print("-" * 80)
    for t in results:
        status_str = "[PASS]" if t["passed"] else "[FAIL]"
        if not t["passed"]:
            all_passed = False
        print(f"  {status_str} Test {t['id']:2d}: {t['name']}")
        print(f"         -> {t['details']}")

    # Check final hash
    final_hash = get_file_sha256(model_path)
    assert initial_hash == final_hash, "CRITICAL: Model hash changed!"
    print(f"\n[*] Final Production Model SHA256: {final_hash} (VERIFIED 100% UNCHANGED)")

    print("=" * 80)
    if all_passed:
        print(f"SUCCESS: ALL {len(results)}/{len(results)} SHADOW MODE INTEGRATION TESTS PASSED.")
    else:
        print(f"FAILURE: Some integration tests failed.")
    print("=" * 80)

    return results


if __name__ == '__main__':
    run_all_shadow_integration_tests()
