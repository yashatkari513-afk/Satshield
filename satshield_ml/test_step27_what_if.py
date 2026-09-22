import unittest
import math
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from typing import Dict, Any, List
from satshield_ml.what_if_analysis import (
    WhatIfScenarioEngine,
    analyze_what_if,
    get_what_if_engine
)
from satshield_ml.predictive_maintenance import SatellitePredictiveMaintenanceEngine
from satshield_ml.mission_assistant import query_mission_assistant


class TestStep27WhatIfAnalysis(unittest.TestCase):

    def setUp(self):
        # Create isolated predictive engine & what-if engine for test independence
        self.pred_engine = SatellitePredictiveMaintenanceEngine(max_history=30)
        self.what_if_engine = WhatIfScenarioEngine(predictive_engine=self.pred_engine)

    def test_01_stable_temperature_nominal(self):
        """1. Stable temperature trend yields NOMINAL status."""
        sat_id = "SAT-001"
        history = [
            {'temperature_c': 25.0, 'voltage_v': 28.2, 'current_a': 6.5, 'battery_soc_percent': 88.0},
            {'temperature_c': 25.1, 'voltage_v': 28.2, 'current_a': 6.5, 'battery_soc_percent': 88.0},
            {'temperature_c': 25.0, 'voltage_v': 28.2, 'current_a': 6.5, 'battery_soc_percent': 88.0},
            {'temperature_c': 25.0, 'voltage_v': 28.2, 'current_a': 6.5, 'battery_soc_percent': 88.0},
        ]
        res = self.what_if_engine.analyze_scenario(
            satellite_id=sat_id,
            parameter='temperature_c',
            sequence_history=history,
            projection_horizon_minutes=10.0
        )
        self.assertEqual(res['satellite_id'], sat_id)
        self.assertEqual(res['parameter_key'], 'temperature_c')
        self.assertEqual(res['scenario_status'], 'STABLE_OR_RECOVERING')
        self.assertIn(res['projected_risk'], ['NOMINAL', 'WATCH'])
        self.assertIn("nominal flight envelope", res['explanation'])

    def test_02_increasing_temperature_thermal_risk(self):
        """2. Persistent increasing temperature produces projected thermal risk."""
        sat_id = "AGIS-3"
        history = [
            {'temperature_c': 40.0, 'voltage_v': 28.0, 'current_a': 8.0},
            {'temperature_c': 45.0, 'voltage_v': 28.0, 'current_a': 9.0},
            {'temperature_c': 50.0, 'voltage_v': 28.0, 'current_a': 10.0},
            {'temperature_c': 55.0, 'voltage_v': 28.0, 'current_a': 11.0},
        ]
        res = self.what_if_engine.analyze_scenario(
            satellite_id=sat_id,
            parameter='temperature_c',
            sequence_history=history,
            projection_horizon_minutes=10.0
        )
        self.assertEqual(res['satellite_id'], sat_id)
        self.assertEqual(res['subsystem'], 'THERMAL')
        self.assertGreater(res['trend_slope'], 0.05)
        self.assertEqual(res['trend_direction'], 'INCREASING')
        self.assertEqual(res['scenario_status'], 'DEGRADING_TREND')
        self.assertIn(res['projected_risk'], ['HIGH', 'CRITICAL'])
        self.assertIn("Thermal margin depletion", res['impact'])

    def test_03_declining_battery_soc(self):
        """3. Declining battery SOC detects battery capacity scenario."""
        sat_id = "SENTINEL-9"
        history = [
            {'battery_soc_percent': 75.0, 'solar_power_w': 300.0},
            {'battery_soc_percent': 65.0, 'solar_power_w': 280.0},
            {'battery_soc_percent': 55.0, 'solar_power_w': 250.0},
            {'battery_soc_percent': 45.0, 'solar_power_w': 200.0},
        ]
        res = self.what_if_engine.analyze_scenario(
            satellite_id=sat_id,
            parameter='battery_soc_percent',
            sequence_history=history,
            projection_horizon_minutes=10.0
        )
        self.assertEqual(res['subsystem'], 'BATTERY')
        self.assertLess(res['trend_slope'], -0.10)
        self.assertEqual(res['trend_direction'], 'DECREASING')
        self.assertIn(res['projected_risk'], ['HIGH', 'CRITICAL'])
        self.assertIn("battery", res['impact'].lower())

    def test_04_declining_voltage_increasing_current(self):
        """4. Declining voltage + increasing current detects compound power scenario."""
        sat_id = "SAT-001"
        history = [
            {'voltage_v': 28.0, 'current_a': 10.0},
            {'voltage_v': 26.5, 'current_a': 12.0},
            {'voltage_v': 25.0, 'current_a': 14.5},
            {'voltage_v': 23.5, 'current_a': 16.0},
        ]
        res = self.what_if_engine.analyze_scenario(
            satellite_id=sat_id,
            parameter='voltage_v',
            sequence_history=history,
            projection_horizon_minutes=10.0
        )
        self.assertEqual(res['subsystem'], 'POWER')
        self.assertIn(res['projected_risk'], ['HIGH', 'CRITICAL'])
        multi = res.get('multi_parameter_assessment', {})
        self.assertEqual(multi.get('compounding_risk'), 'CRITICAL')
        self.assertTrue(any("EPS Bus Sag" in item for item in multi.get('interactions', [])))

    def test_05_communication_degradation(self):
        """5. Degrading RF signal detects communication scenario."""
        sat_id = "ORBCOM-7"
        history = [
            {'communication_signal_db': -70.0},
            {'communication_signal_db': -80.0},
            {'communication_signal_db': -90.0},
            {'communication_signal_db': -98.0},
        ]
        res = self.what_if_engine.analyze_scenario(
            satellite_id=sat_id,
            parameter='communication_signal_db',
            sequence_history=history,
            projection_horizon_minutes=10.0
        )
        self.assertEqual(res['subsystem'], 'COMMUNICATION')
        self.assertIn(res['projected_risk'], ['HIGH', 'CRITICAL'])
        self.assertIn("downlink", res['impact'].lower())

    def test_06_increasing_attitude_error(self):
        """6. Increasing pointing deviation detects attitude scenario."""
        sat_id = "HELIOS-1"
        history = [
            {'attitude_error_deg': 0.1},
            {'attitude_error_deg': 0.6},
            {'attitude_error_deg': 1.2},
            {'attitude_error_deg': 1.8},
        ]
        res = self.what_if_engine.analyze_scenario(
            satellite_id=sat_id,
            parameter='attitude_error_deg',
            sequence_history=history,
            projection_horizon_minutes=10.0
        )
        self.assertEqual(res['subsystem'], 'ATTITUDE')
        self.assertIn(res['projected_risk'], ['HIGH', 'CRITICAL'])
        self.assertIn("pointing", res['impact'].lower())

    def test_07_threshold_already_crossed_no_invalid_future_time(self):
        """7. If threshold is already crossed, returns THRESHOLD_ALREADY_CROSSED with no negative time."""
        sat_id = "AGIS-3"
        history = [
            {'temperature_c': 55.0},
            {'temperature_c': 62.0},
            {'temperature_c': 68.0},
            {'temperature_c': 75.0},
        ]
        res = self.what_if_engine.analyze_scenario(
            satellite_id=sat_id,
            parameter='temperature_c',
            sequence_history=history
        )
        self.assertEqual(res['scenario_status'], 'THRESHOLD_ALREADY_CROSSED')
        self.assertIsNone(res['estimated_time_to_threshold'])
        self.assertEqual(res['estimated_time_formatted'], 'Critical threshold already crossed')
        self.assertEqual(res['projected_risk'], 'CRITICAL')

    def test_08_flat_trend_insufficient_evidence(self):
        """8. Perfectly flat trend returns stable report without alarming projection."""
        sat_id = "SAT-001"
        history = [
            {'temperature_c': 25.0},
            {'temperature_c': 25.0},
            {'temperature_c': 25.0},
            {'temperature_c': 25.0},
        ]
        res = self.what_if_engine.analyze_scenario(
            satellite_id=sat_id,
            parameter='temperature_c',
            sequence_history=history
        )
        self.assertEqual(res['scenario_status'], 'STABLE_OR_RECOVERING')
        self.assertEqual(res['projected_risk'], 'NOMINAL')

    def test_09_insufficient_history(self):
        """9. Fewer than 3 history frames returns N/A insufficient evidence."""
        sat_id = "SAT-001"
        history = [{'temperature_c': 25.0}]
        res = self.what_if_engine.analyze_scenario(
            satellite_id=sat_id,
            parameter='temperature_c',
            sequence_history=history
        )
        self.assertEqual(res['scenario_status'], 'INSUFFICIENT_DATA')
        self.assertIn("N/A", res['explanation'])

    def test_10_missing_or_nan_telemetry_safe_handling(self):
        """10. Missing or NaN telemetry is handled gracefully without exception."""
        sat_id = "SAT-001"
        res = self.what_if_engine.analyze_scenario(
            satellite_id=sat_id,
            parameter='temperature_c',
            current_telemetry={'temperature_c': float('nan'), 'voltage_v': float('inf')}
        )
        self.assertEqual(res['scenario_status'], 'INSUFFICIENT_DATA')
        self.assertIn("N/A", res['explanation'])

    def test_11_agis3_scenario_isolation(self):
        """11. AGIS-3 scenario uses only AGIS-3 context."""
        self.pred_engine.record_telemetry("AGIS-3", {'temperature_c': 50.0, 'voltage_v': 28.0})
        self.pred_engine.record_telemetry("AGIS-3", {'temperature_c': 55.0, 'voltage_v': 28.0})
        self.pred_engine.record_telemetry("AGIS-3", {'temperature_c': 60.0, 'voltage_v': 28.0})

        res = self.what_if_engine.analyze_scenario("AGIS-3", parameter='temperature_c')
        self.assertEqual(res['satellite_id'], "AGIS-3")
        self.assertAlmostEqual(res['current_value'], 60.0, delta=0.5)

    def test_12_sentinel9_scenario_isolation(self):
        """12. SENTINEL-9 scenario uses only SENTINEL-9 context."""
        self.pred_engine.record_telemetry("SENTINEL-9", {'battery_soc_percent': 70.0})
        self.pred_engine.record_telemetry("SENTINEL-9", {'battery_soc_percent': 50.0})
        self.pred_engine.record_telemetry("SENTINEL-9", {'battery_soc_percent': 30.0})

        res = self.what_if_engine.analyze_scenario("SENTINEL-9", parameter='battery_soc_percent')
        self.assertEqual(res['satellite_id'], "SENTINEL-9")
        self.assertAlmostEqual(res['current_value'], 30.0, delta=0.5)

    def test_13_orbcom7_scenario_isolation(self):
        """13. ORBCOM-7 scenario uses only ORBCOM-7 context."""
        self.pred_engine.record_telemetry("ORBCOM-7", {'communication_signal_db': -60.0})
        self.pred_engine.record_telemetry("ORBCOM-7", {'communication_signal_db': -75.0})
        self.pred_engine.record_telemetry("ORBCOM-7", {'communication_signal_db': -90.0})

        res = self.what_if_engine.analyze_scenario("ORBCOM-7", parameter='communication_signal_db')
        self.assertEqual(res['satellite_id'], "ORBCOM-7")
        self.assertAlmostEqual(res['current_value'], -90.0, delta=0.5)

    def test_14_helios1_scenario_isolation(self):
        """14. HELIOS-1 scenario uses only HELIOS-1 context."""
        self.pred_engine.record_telemetry("HELIOS-1", {'attitude_error_deg': 0.05})
        self.pred_engine.record_telemetry("HELIOS-1", {'attitude_error_deg': 0.20})
        self.pred_engine.record_telemetry("HELIOS-1", {'attitude_error_deg': 0.40})

        res = self.what_if_engine.analyze_scenario("HELIOS-1", parameter='attitude_error_deg')
        self.assertEqual(res['satellite_id'], "HELIOS-1")
        self.assertAlmostEqual(res['current_value'], 0.40, delta=0.1)

    def test_15_multi_parameter_scenario_determinism(self):
        """15. Multi-parameter compounding analysis is strictly deterministic."""
        tel = {'temperature_c': 58.0, 'current_a': 16.5, 'voltage_v': 23.0, 'battery_soc_percent': 40.0, 'solar_power_w': 180.0}
        eval1 = WhatIfScenarioEngine._evaluate_multi_parameter("SAT-001", tel, {})
        eval2 = WhatIfScenarioEngine._evaluate_multi_parameter("SAT-001", tel, {})
        self.assertEqual(eval1, eval2)
        self.assertEqual(eval1['compounding_risk'], 'CRITICAL')
        self.assertGreaterEqual(len(eval1['interactions']), 2)

    def test_16_mission_assistant_what_if_question(self):
        """16. Mission Assistant handles What-If questions using real scenario engine."""
        from satshield_ml.predictive_maintenance import get_predictive_engine
        pred = get_predictive_engine()
        pred.record_telemetry("AGIS-3", {'temperature_c': 42.0, 'voltage_v': 28.0, 'current_a': 10.0, 'battery_soc_percent': 85.0})
        pred.record_telemetry("AGIS-3", {'temperature_c': 47.0, 'voltage_v': 27.8, 'current_a': 11.0, 'battery_soc_percent': 80.0})
        pred.record_telemetry("AGIS-3", {'temperature_c': 52.0, 'voltage_v': 27.5, 'current_a': 12.0, 'battery_soc_percent': 75.0})

        tel = {
            'battery_temp': 52.0,
            'bus_voltage': 27.5,
            'current_draw': 12.0,
            'battery_soc': 75.0,
            'solar_power': 550.0,
            'signal_dbm': -75.0,
            'gyro_drift': 0.04,
            'vibration': 0.05
        }
        res = query_mission_assistant(
            question="What happens if temperature continues increasing?",
            satellite_id="AGIS-3",
            raw_telemetry=tel
        )
        self.assertEqual(res['satellite_id'], "AGIS-3")
        self.assertEqual(res['intent'], "WHAT_IF_SCENARIO")
        self.assertIn("What-If Scenario", res['answer'])
        self.assertIn("what_if_scenario", res)
        self.assertIn("Operational Impact", res['answer'])

    def test_17_no_random_values_strict_determinism(self):
        """17. Identical input sequence produces byte-for-byte identical output."""
        history = [
            {'temperature_c': 30.0, 'voltage_v': 28.0},
            {'temperature_c': 35.0, 'voltage_v': 27.5},
            {'temperature_c': 40.0, 'voltage_v': 27.0},
        ]
        res1 = self.what_if_engine.analyze_scenario("SAT-001", 'temperature_c', sequence_history=history)
        res2 = self.what_if_engine.analyze_scenario("SAT-001", 'temperature_c', sequence_history=history)
        self.assertEqual(res1, res2)

    def test_18_no_autonomous_command_generation(self):
        """18. Recommended action is purely advisory and contains no executable commands."""
        history = [
            {'temperature_c': 50.0},
            {'temperature_c': 55.0},
            {'temperature_c': 60.0},
        ]
        res = self.what_if_engine.analyze_scenario("SAT-001", 'temperature_c', sequence_history=history)
        rec = res['recommended_action'].lower()
        self.assertFalse(rec.startswith("exec"))
        self.assertFalse(rec.startswith("cmd"))
        self.assertIn("review", rec)


if __name__ == '__main__':
    print("=" * 70)
    print("SATSHIELD STEP 27 — WHAT-IF SCENARIO ANALYSIS 18-POINT TEST BATTERY")
    print("=" * 70)
    unittest.main()
