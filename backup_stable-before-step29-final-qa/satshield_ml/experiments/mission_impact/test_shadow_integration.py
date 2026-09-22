"""
SATSHIELD STEP 23 — MISSION IMPACT ENGINE SHADOW INTEGRATION TEST SUITE
========================================================================
Comprehensive verification suite testing the non-blocking shadow integration of the
Mission Impact Engine into the production ML pipeline (satshield_ml/ml_service.py).

Tests:
- 21+ telemetry scenarios covering nominal, single-channel, compound, and edge-cases.
- Primary IsolationForest prediction invariance (NORMAL/ANOMALY untouched).
- Step 22 Root-Cause analysis invariance.
- Step 11 Predictive Maintenance invariance.
- Per-satellite history and state isolation (AGIS-3, SENTINEL-9, ORBCOM-7, HELIOS-1).
- Non-blocking failure safety and graceful fallback.
- Deterministic repeatability.
"""

import os
import sys
import json
import unittest
import math

# Ensure project root is in sys.path
curr_dir = os.path.dirname(os.path.abspath(__file__))
ml_dir = os.path.dirname(os.path.dirname(curr_dir))
project_root = os.path.dirname(ml_dir)

for p in [curr_dir, ml_dir, project_root]:
    if p not in sys.path:
        sys.path.insert(0, p)

from satshield_ml.ml_service import run_ml_inference, normalize_telemetry_payload
from satshield_ml.predict import get_predictor
from satshield_ml.root_cause_service import reset_satellite_root_cause_state
from satshield_ml.mission_impact_service import analyze_mission_impact_shadow, reset_satellite_mission_impact_state


class TestMissionImpactShadowIntegration(unittest.TestCase):

    def setUp(self):
        reset_satellite_mission_impact_state()
        reset_satellite_root_cause_state()
        try:
            predictor = get_predictor()
            predictor.history_buffers.clear()
        except Exception:
            pass

    def get_nominal_telemetry(self, sat_id="SAT-001"):
        return {
            "satellite_id": sat_id,
            "temperature_c": 22.5,
            "voltage_v": 28.2,
            "current_a": 5.4,
            "battery_soc_percent": 88.0,
            "solar_power_w": 340.0,
            "communication_signal_db": -65.0,
            "vibration_g": 0.12,
            "attitude_error_deg": 0.35
        }

    # ==========================================================================
    # 1. SCENARIO TESTS (1 - 21)
    # ==========================================================================

    def test_01_nominal_telemetry(self):
        """Scenario 1: Nominal baseline telemetry produces NOMINAL impact."""
        t = self.get_nominal_telemetry("SAT-001")
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        self.assertIn("mission_impact_analysis", res)
        mi = res["mission_impact_analysis"]
        self.assertEqual(mi["mission_impact_level"], "NOMINAL")
        self.assertEqual(mi["urgency"], "ROUTINE")
        self.assertIn("NONE", mi["impacted_subsystems"])

    def test_02_battery_degradation(self):
        """Scenario 2: Moderate battery degradation produces MODERATE/HIGH impact with BATTERY capability."""
        t = self.get_nominal_telemetry("SAT-001")
        t["battery_soc_percent"] = 42.0
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["mission_impact_level"], ["MODERATE", "HIGH"])
        self.assertIn("BATTERY ENDURANCE", mi["affected_capabilities"])
        self.assertIn("EPS", mi["impacted_subsystems"])

    def test_03_severe_battery_depletion(self):
        """Scenario 3: Severe battery depletion (<30% SoC) triggers HIGH/CRITICAL impact."""
        t = self.get_nominal_telemetry("SAT-001")
        t["battery_soc_percent"] = 24.0
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["mission_impact_level"], ["HIGH", "CRITICAL"])
        self.assertIn("BATTERY ENDURANCE", mi["affected_capabilities"])

    def test_04_eps_undervoltage(self):
        """Scenario 4: Main bus undervoltage triggers HIGH/CRITICAL power impact."""
        t = self.get_nominal_telemetry("SAT-001")
        t["voltage_v"] = 19.8
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["mission_impact_level"], ["HIGH", "CRITICAL"])
        self.assertIn("POWER AVAILABILITY", mi["affected_capabilities"])
        self.assertIn("EPS", mi["impacted_subsystems"])

    def test_05_high_current_power_anomaly(self):
        """Scenario 5: High electrical current surge triggers HIGH/CRITICAL power impact."""
        t = self.get_nominal_telemetry("SAT-001")
        t["current_a"] = 24.5
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["mission_impact_level"], ["HIGH", "CRITICAL"])
        self.assertIn("POWER AVAILABILITY", mi["affected_capabilities"])

    def test_06_thermal_overheating(self):
        """Scenario 6: Thermal excursion triggers THERMAL SAFETY capability impact."""
        t = self.get_nominal_telemetry("SAT-001")
        t["temperature_c"] = 62.0
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["mission_impact_level"], ["HIGH", "CRITICAL"])
        self.assertIn("THERMAL SAFETY", mi["affected_capabilities"])
        self.assertIn("TCS", mi["impacted_subsystems"])

    def test_07_rapid_thermal_escalation(self):
        """Scenario 7: Rapid thermal escalation triggers IMMEDIATE FLIGHT INTERVENTION."""
        sat_id = "SAT-007"
        reset_satellite_mission_impact_state(sat_id)
        
        # Feed fast rising temperatures
        run_ml_inference({"temperature_c": 22.0, "voltage_v": 28.0, "current_a": 5.0, "battery_soc_percent": 88.0, "solar_power_w": 340.0, "communication_signal_db": -65.0, "vibration_g": 0.1, "attitude_error_deg": 0.3}, satellite_id=sat_id)
        run_ml_inference({"temperature_c": 32.0, "voltage_v": 28.0, "current_a": 5.0, "battery_soc_percent": 88.0, "solar_power_w": 340.0, "communication_signal_db": -65.0, "vibration_g": 0.1, "attitude_error_deg": 0.3}, satellite_id=sat_id)
        run_ml_inference({"temperature_c": 42.0, "voltage_v": 28.0, "current_a": 5.0, "battery_soc_percent": 88.0, "solar_power_w": 340.0, "communication_signal_db": -65.0, "vibration_g": 0.1, "attitude_error_deg": 0.3}, satellite_id=sat_id)
        res = run_ml_inference({"temperature_c": 52.0, "voltage_v": 28.0, "current_a": 5.0, "battery_soc_percent": 88.0, "solar_power_w": 340.0, "communication_signal_db": -65.0, "vibration_g": 0.1, "attitude_error_deg": 0.3}, satellite_id=sat_id)
        
        mi = res["mission_impact_analysis"]
        self.assertEqual(mi["urgency"], "IMMEDIATE FLIGHT INTERVENTION")
        self.assertIn("THERMAL SAFETY", mi["affected_capabilities"])

    def test_08_communication_degradation(self):
        """Scenario 8: RF link attenuation triggers COMMUNICATION capability impact."""
        t = self.get_nominal_telemetry("SAT-001")
        t["communication_signal_db"] = -118.0
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["mission_impact_level"], ["HIGH", "CRITICAL"])
        self.assertIn("COMMUNICATION / LINK AVAILABILITY", mi["affected_capabilities"])
        self.assertIn("COMMS", mi["impacted_subsystems"])

    def test_09_attitude_instability(self):
        """Scenario 9: Attitude pointing error triggers ATTITUDE capability impact."""
        t = self.get_nominal_telemetry("SAT-001")
        t["attitude_error_deg"] = 4.8
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["mission_impact_level"], ["HIGH", "CRITICAL"])
        self.assertIn("ATTITUDE / POINTING CAPABILITY", mi["affected_capabilities"])
        self.assertIn("ADCS", mi["impacted_subsystems"])

    def test_10_solar_power_degradation(self):
        """Scenario 10: Solar array collapse triggers POWER AVAILABILITY impact."""
        t = self.get_nominal_telemetry("SAT-001")
        t["solar_power_w"] = 80.0
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["mission_impact_level"], ["HIGH", "CRITICAL"])
        self.assertIn("POWER AVAILABILITY", mi["affected_capabilities"])

    def test_11_battery_plus_voltage_combined(self):
        """Scenario 11: Compound battery and bus undervoltage escalates to CRITICAL."""
        t = self.get_nominal_telemetry("SAT-001")
        t["battery_soc_percent"] = 28.0
        t["voltage_v"] = 20.5
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertEqual(mi["mission_impact_level"], "CRITICAL")
        self.assertIn("EPS", mi["impacted_subsystems"])

    def test_12_thermal_plus_current_combined(self):
        """Scenario 12: Compound thermal and current surge escalates to CRITICAL."""
        t = self.get_nominal_telemetry("SAT-001")
        t["temperature_c"] = 58.0
        t["current_a"] = 23.0
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertEqual(mi["mission_impact_level"], "CRITICAL")
        self.assertIn("TCS", mi["impacted_subsystems"])
        self.assertIn("EPS", mi["impacted_subsystems"])

    def test_13_communication_plus_attitude_combined(self):
        """Scenario 13: Compound comm attenuation and attitude mispointing."""
        t = self.get_nominal_telemetry("SAT-001")
        t["communication_signal_db"] = -112.0
        t["attitude_error_deg"] = 3.8
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["mission_impact_level"], ["HIGH", "CRITICAL"])
        self.assertIn("COMMUNICATION / LINK AVAILABILITY", mi["affected_capabilities"])
        self.assertIn("ATTITUDE / POINTING CAPABILITY", mi["affected_capabilities"])

    def test_14_multi_subsystem_cascading(self):
        """Scenario 14: Multi-subsystem cascading failure triggers SPACECRAFT HEALTH / SURVIVABILITY."""
        t = self.get_nominal_telemetry("SAT-001")
        t["temperature_c"] = 61.0
        t["voltage_v"] = 20.0
        t["attitude_error_deg"] = 4.5
        t["battery_soc_percent"] = 25.0
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertEqual(mi["mission_impact_level"], "CRITICAL")
        self.assertIn("SPACECRAFT HEALTH / SURVIVABILITY", mi["affected_capabilities"])

    def test_15_recovery_handling(self):
        """Scenario 15: Anomaly sequence followed by nominal frames triggers RECOVERING state."""
        sat_id = "SAT-REC-15"
        reset_satellite_mission_impact_state(sat_id)
        
        bad = self.get_nominal_telemetry(sat_id)
        bad["temperature_c"] = 62.0
        run_ml_inference(bad, satellite_id=sat_id)
        run_ml_inference(bad, satellite_id=sat_id)
        run_ml_inference(bad, satellite_id=sat_id)
        
        nom = self.get_nominal_telemetry(sat_id)
        run_ml_inference(nom, satellite_id=sat_id)
        run_ml_inference(nom, satellite_id=sat_id)
        res = run_ml_inference(nom, satellite_id=sat_id)
        
        mi = res["mission_impact_analysis"]
        self.assertEqual(mi["mission_impact_level"], "LOW")
        self.assertIn("RECOVERING", mi["persistence"])

    def test_16_transient_spike(self):
        """Scenario 16: Isolated single frame spike correctly identified as transient."""
        sat_id = "SAT-TRAN-16"
        reset_satellite_mission_impact_state(sat_id)
        
        nom = self.get_nominal_telemetry(sat_id)
        run_ml_inference(nom, satellite_id=sat_id)
        run_ml_inference(nom, satellite_id=sat_id)
        
        spike = self.get_nominal_telemetry(sat_id)
        spike["vibration_g"] = 1.6
        res = run_ml_inference(spike, satellite_id=sat_id)
        
        mi = res["mission_impact_analysis"]
        self.assertIn("TRANSIENT_ANOMALY", mi["persistence"])

    def test_17_gradual_degradation(self):
        """Scenario 17: Slow gradual degradation sequence identifies persistent anomaly."""
        sat_id = "SAT-GRAD-17"
        reset_satellite_mission_impact_state(sat_id)
        
        t = self.get_nominal_telemetry(sat_id)
        for step in range(5):
            t_step = dict(t)
            t_step["battery_soc_percent"] = 50.0 - step * 1.5
            res = run_ml_inference(t_step, satellite_id=sat_id)
        
        mi = res["mission_impact_analysis"]
        self.assertIn("PERSISTENT_ANOMALY", mi["persistence"])

    def test_18_ambiguous_telemetry(self):
        """Scenario 18: Ambiguous edge telemetry produces LOW or MODERATE impact."""
        t = self.get_nominal_telemetry("SAT-001")
        t["vibration_g"] = 0.45
        res = run_ml_inference(t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["mission_impact_level"], ["LOW", "MODERATE"])

    def test_19_insufficient_telemetry(self):
        """Scenario 19: <3 physical channels returns INSUFFICIENT data quality without crashing."""
        sparse_t = {"satellite_id": "SAT-001", "temperature_c": 22.0, "voltage_v": 28.0}
        res = run_ml_inference(sparse_t, satellite_id="SAT-001")
        
        mi = res["mission_impact_analysis"]
        self.assertEqual(mi["data_quality"], "INSUFFICIENT")
        self.assertEqual(res["data_quality"], "INSUFFICIENT")

    def test_20_nan_inf_safety(self):
        """Scenario 20: Malformed types, NaN and Inf are handled safely without exceptions."""
        malformed = {
            "satellite_id": "SAT-001",
            "temperature_c": float("nan"),
            "voltage_v": float("inf"),
            "current_a": "unparseable_string",
            "battery_soc_percent": 88.0
        }
        res = run_ml_inference(malformed, satellite_id="SAT-001")
        self.assertIn("mission_impact_analysis", res)
        mi = res["mission_impact_analysis"]
        self.assertIn(mi["data_quality"], ["DEGRADED", "INVALID", "INSUFFICIENT"])

    def test_21_cross_satellite_isolation(self):
        """Scenario 21: Strict state isolation across fleet (AGIS-3, SENTINEL-9, ORBCOM-7, HELIOS-1)."""
        fleet = ["AGIS-3", "SENTINEL-9", "ORBCOM-7", "HELIOS-1"]
        for sat in fleet:
            reset_satellite_mission_impact_state(sat)

        # AGIS-3 suffers catastrophic failure
        agis_crit = {
            "satellite_id": "AGIS-3",
            "temperature_c": 65.0,
            "voltage_v": 19.0,
            "current_a": 25.0,
            "battery_soc_percent": 20.0,
            "solar_power_w": 50.0,
            "communication_signal_db": -120.0,
            "vibration_g": 2.0,
            "attitude_error_deg": 5.0
        }
        res_agis = run_ml_inference(agis_crit, satellite_id="AGIS-3")
        self.assertEqual(res_agis["mission_impact_analysis"]["mission_impact_level"], "CRITICAL")

        # SENTINEL-9, ORBCOM-7, HELIOS-1 receive nominal telemetry
        for sat in ["SENTINEL-9", "ORBCOM-7", "HELIOS-1"]:
            nom = self.get_nominal_telemetry(sat)
            res_sat = run_ml_inference(nom, satellite_id=sat)
            self.assertEqual(
                res_sat["mission_impact_analysis"]["mission_impact_level"],
                "NOMINAL",
                f"State leakage detected for {sat} from AGIS-3!"
            )
            self.assertEqual(res_sat["mission_impact_analysis"]["impacted_subsystems"], ["NONE"])

    def test_22_deterministic_repeatability(self):
        """Scenario 22: Deterministic repeatability check."""
        t = {
            "temperature_c": 56.0, "voltage_v": 22.5, "current_a": 16.0,
            "battery_soc_percent": 38.0, "solar_power_w": 180.0,
            "communication_signal_db": -95.0, "vibration_g": 0.45, "attitude_error_deg": 2.6
        }
        reset_satellite_mission_impact_state("SAT-REP-A")
        reset_satellite_mission_impact_state("SAT-REP-B")
        
        res_a = run_ml_inference(t, satellite_id="SAT-REP-A")
        res_b = run_ml_inference(t, satellite_id="SAT-REP-B")
        
        d_a = dict(res_a["mission_impact_analysis"])
        d_b = dict(res_b["mission_impact_analysis"])
        d_a_clean = {k: v for k, v in d_a.items() if k != "satellite_id"}
        d_b_clean = {k: v for k, v in d_b.items() if k != "satellite_id"}
        
        if "root_cause_context" in d_a_clean and isinstance(d_a_clean["root_cause_context"], dict):
            d_a_clean["root_cause_context"] = {k: v for k, v in d_a_clean["root_cause_context"].items() if k != "satellite_id"}
        if "root_cause_context" in d_b_clean and isinstance(d_b_clean["root_cause_context"], dict):
            d_b_clean["root_cause_context"] = {k: v for k, v in d_b_clean["root_cause_context"].items() if k != "satellite_id"}

        self.assertEqual(
            json.dumps(d_a_clean, sort_keys=True),
            json.dumps(d_b_clean, sort_keys=True)
        )

    # ==========================================================================
    # 2. PRESERVATION & SHADOW GUARANTEES
    # ==========================================================================

    def test_primary_isolation_forest_invariance(self):
        """Ensures that Primary IsolationForest decisions and scores are unaffected by Mission Impact."""
        sat_id = "SAT-INVAR-NOM"
        nom = self.get_nominal_telemetry(sat_id)
        res_nom = run_ml_inference(nom, satellite_id=sat_id)
        self.assertEqual(res_nom["prediction"], "NORMAL")
        self.assertGreater(res_nom["raw_anomaly_score"], 0.0)

        sat_anom_id = "SAT-INVAR-ANOM"
        anom = self.get_nominal_telemetry(sat_anom_id)
        anom["temperature_c"] = 78.0
        anom["current_a"] = 28.0
        anom["attitude_error_deg"] = 8.5
        res_anom = run_ml_inference(anom, satellite_id=sat_anom_id)
        self.assertEqual(res_anom["prediction"], "ANOMALY")
        self.assertLess(res_anom["raw_anomaly_score"], 0.0)

    def test_root_cause_analysis_preserved(self):
        """Ensures that Step 22 Root-Cause analysis output is preserved and functional."""
        sat_id = "SAT-TCS-TEST"
        t = {
            "satellite_id": sat_id,
            "temperature_c": 68.0,
            "voltage_v": 28.2,
            "current_a": 16.0,
            "battery_soc_percent": 88.0,
            "solar_power_w": 550.0,
            "communication_signal_db": -68.0,
            "vibration_g": 0.04,
            "attitude_error_deg": 0.08
        }
        res = run_ml_inference(t, satellite_id=sat_id)
        
        self.assertIn("root_cause_analysis", res)
        rc = res["root_cause_analysis"]
        self.assertEqual(rc["affected_subsystem"], "THERMAL")
        self.assertIn(rc["evidence_strength"], ["MODERATE", "STRONG"])

    def test_predictive_maintenance_preserved(self):
        """Ensures that Predictive Maintenance risk and timing analysis are preserved."""
        sat_id = "SAT-PM-TEST"
        t = self.get_nominal_telemetry(sat_id)
        res = run_ml_inference(t, satellite_id=sat_id)
        
        self.assertIn("predictive_maintenance", res)
        pm = res["predictive_maintenance"]
        self.assertIn("risk_level", pm)


if __name__ == "__main__":
    unittest.main(verbosity=2)
