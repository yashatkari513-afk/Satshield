"""
SATSHIELD STEP 26 — AI MISSION ASSISTANT TEST SUITE
Comprehensive 17-scenario verification of deterministic, context-grounded AI Mission Assistant.
"""

import os
import sys
import unittest
import json
from datetime import datetime, timezone

# Add parent directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from satshield_ml.mission_assistant import (
    AIMissionAssistant,
    query_mission_assistant,
    build_satellite_context,
    classify_question_intent,
    get_mission_assistant
)


class TestStep26MissionAssistant(unittest.TestCase):

    def setUp(self):
        self.assistant = AIMissionAssistant()
        self.nominal_agis3 = {
            "satellite_id": "SAT-001",
            "temperature_c": 25.1,
            "voltage_v": 28.2,
            "current_a": 6.0,
            "battery_soc_percent": 90.0,
            "solar_power_w": 550.0,
            "communication_signal_db": -68.0,
            "vibration_g": 0.045,
            "attitude_error_deg": 0.08,
            "timestamp": "2026-09-16T12:00:00Z"
        }
        self.anomalous_agis3 = {
            "satellite_id": "SAT-001",
            "temperature_c": 92.5,
            "voltage_v": 20.5,
            "current_a": 28.0,
            "battery_soc_percent": 35.0,
            "solar_power_w": 200.0,
            "communication_signal_db": -105.0,
            "vibration_g": 0.55,
            "attitude_error_deg": 2.1,
            "timestamp": "2026-09-16T12:05:00Z"
        }
        self.nominal_sentinel9 = {
            "satellite_id": "SAT-002",
            "temperature_c": 22.0,
            "voltage_v": 28.0,
            "current_a": 5.0,
            "battery_soc_percent": 94.0,
            "solar_power_w": 590.0,
            "communication_signal_db": -66.0,
            "vibration_g": 0.04,
            "attitude_error_deg": 0.05,
            "timestamp": "2026-09-16T12:00:00Z"
        }

    # 1. AGIS-3 Health Question
    def test_01_agis3_health_question(self):
        res = self.assistant.answer_question(
            "Summarize the current satellite health.",
            satellite_id="SAT-001",
            raw_telemetry=self.nominal_agis3
        )
        self.assertEqual(res['satellite_name'], "AGIS-3")
        self.assertIn("Health Summary for AGIS-3", res['answer'])
        self.assertEqual(res['prediction']['status'], "NORMAL")
        self.assertIn("25.1", res['answer'])

    # 2. SENTINEL-9 Health Question
    def test_02_sentinel9_health_question(self):
        res = self.assistant.answer_question(
            "What is the status of SENTINEL-9?",
            satellite_id="SAT-002",
            raw_telemetry=self.nominal_sentinel9
        )
        self.assertEqual(res['satellite_name'], "SENTINEL-9")
        self.assertIn("SENTINEL-9", res['answer'])
        self.assertEqual(res['prediction']['status'], "NORMAL")

    # 3. Anomaly Explanation
    def test_03_anomaly_explanation(self):
        res = self.assistant.answer_question(
            "Why did the AI flag this satellite?",
            satellite_id="SAT-001",
            raw_telemetry=self.anomalous_agis3
        )
        self.assertEqual(res['prediction']['status'], "ANOMALY")
        self.assertIn("ANOMALY", res['answer'])
        self.assertLess(res['prediction']['score'], 0.0)
        self.assertTrue(len(res['evidence']) > 0)

    # 4. Telemetry Parameter Query
    def test_04_telemetry_parameter_question(self):
        res = self.assistant.answer_question(
            "What is the current temperature?",
            satellite_id="SAT-001",
            raw_telemetry=self.nominal_agis3
        )
        self.assertEqual(res['intent'], "PARAM_TEMPERATURE")
        self.assertIn("25.1", res['answer'])
        self.assertIn("Avionics Temperature", res['answer'])

    # 5. Root-Cause Question
    def test_05_root_cause_question(self):
        res = self.assistant.answer_question(
            "What is the probable root cause of the issue?",
            satellite_id="SAT-001",
            raw_telemetry=self.anomalous_agis3
        )
        self.assertEqual(res['intent'], "ROOT_CAUSE")
        self.assertIn("Root-Cause Shadow Analysis", res['answer'])
        self.assertIn(res['root_cause']['subsystem'], ["THERMAL", "BATTERY", "POWER", "ATTITUDE"])

    # 6. Mission-Impact Question
    def test_06_mission_impact_question(self):
        res = self.assistant.answer_question(
            "What is the mission impact?",
            satellite_id="SAT-001",
            raw_telemetry=self.anomalous_agis3
        )
        self.assertEqual(res['intent'], "MISSION_IMPACT")
        self.assertIn("Mission Impact Assessment", res['answer'])
        self.assertIn(res['mission_impact']['impact_level'], ["HIGH", "CRITICAL"])

    # 7. Predictive Maintenance Question
    def test_07_predictive_question(self):
        res = self.assistant.answer_question(
            "When could the operational threshold be reached?",
            satellite_id="SAT-001",
            raw_telemetry=self.anomalous_agis3
        )
        self.assertEqual(res['intent'], "PREDICTIVE_TREND")
        self.assertIn("Predictive Maintenance", res['answer'])
        self.assertIn("Estimated Time to Operational Threshold", res['answer'])

    # 8. Recommended Action Question
    def test_08_recommended_action_question(self):
        res = self.assistant.answer_question(
            "What should the operator do?",
            satellite_id="SAT-001",
            raw_telemetry=self.anomalous_agis3
        )
        self.assertEqual(res['intent'], "OPERATOR_ACTION")
        self.assertIn("Recommended Operator Action", res['answer'])
        self.assertTrue(len(res['recommended_action']) > 0)

    # 9. Satellite Switching & State Isolation
    def test_09_satellite_switching_isolation(self):
        # Query AGIS-3 under thermal anomaly
        res_a = self.assistant.answer_question(
            "What is the temperature and risk?",
            satellite_id="SAT-001",
            raw_telemetry=self.anomalous_agis3
        )
        self.assertIn("92.5", res_a['answer'])
        self.assertEqual(res_a['satellite_id'], "SAT-001")

        # Query SENTINEL-9 under nominal
        res_b = self.assistant.answer_question(
            "What is the temperature and risk?",
            satellite_id="SAT-002",
            raw_telemetry=self.nominal_sentinel9
        )
        self.assertIn("22", res_b['answer'])
        self.assertEqual(res_b['satellite_id'], "SAT-002")
        self.assertNotIn("92.5", res_b['answer'])

        # Switch back to AGIS-3
        res_a2 = self.assistant.answer_question(
            "What is the temperature and risk?",
            satellite_id="SAT-001",
            raw_telemetry=self.anomalous_agis3
        )
        self.assertIn("92.5", res_a2['answer'])
        self.assertEqual(res_a2['satellite_id'], "SAT-001")

    # 10. Insufficient Telemetry Handling
    def test_10_insufficient_telemetry(self):
        res = self.assistant.answer_question(
            "Why is the satellite unhealthy?",
            satellite_id="SAT-001",
            raw_telemetry={}
        )
        self.assertIn("N/A", res['answer'])
        self.assertEqual(res['data_quality'], "INSUFFICIENT")

    # 11. Unknown / Out-of-Scope Question
    def test_11_unknown_question(self):
        res = self.assistant.answer_question(
            "What is the weather in New Delhi today?",
            satellite_id="SAT-001",
            raw_telemetry=self.nominal_agis3
        )
        self.assertEqual(res['intent'], "GENERAL_QUERY")
        self.assertIn("AGIS-3", res['answer'])

    # 12. Invalid / Corrupted Telemetry
    def test_12_invalid_telemetry_handling(self):
        bad_telem = {
            "satellite_id": "SAT-001",
            "temperature_c": "CORRUPTED_STRING",
            "voltage_v": float('nan')
        }
        res = self.assistant.answer_question(
            "Show health summary",
            satellite_id="SAT-001",
            raw_telemetry=bad_telem
        )
        self.assertIsNotNone(res['answer'])
        self.assertNotIn("Crash", res['answer'])

    # 13. Zero Hallucination (Values Match Real Telemetry)
    def test_13_no_hallucinated_values(self):
        res = self.assistant.answer_question(
            "What is the voltage and current?",
            satellite_id="SAT-001",
            raw_telemetry=self.nominal_agis3
        )
        self.assertIn("28.2", res['answer'])

    # 14. Safety: Rejection of Autonomous Command
    def test_14_autonomous_command_refusal(self):
        res = self.assistant.answer_question(
            "Reboot the satellite power bus immediately",
            satellite_id="SAT-001",
            raw_telemetry=self.anomalous_agis3
        )
        self.assertEqual(res['intent'], "COMMAND_REQUEST")
        self.assertIn("I cannot autonomously command", res['answer'])
        self.assertIn("Recommended Operator Action", res['answer'])

    # 15. 6-Step Simulation Context Compatibility
    def test_15_simulation_scenario_context(self):
        step4_telem = dict(self.nominal_agis3, temperature_c=68.0, voltage_v=25.5, current_a=14.0)
        res = self.assistant.answer_question(
            "Why is this satellite unhealthy?",
            satellite_id="SAT-001",
            raw_telemetry=step4_telem
        )
        self.assertEqual(res['prediction']['status'], "ANOMALY")
        self.assertIn("68", str(res['evidence']))

    # 16. Module Helper query_mission_assistant
    def test_16_helper_function(self):
        res = query_mission_assistant("What is the satellite status?", "SAT-001", self.nominal_agis3)
        self.assertEqual(res['satellite_id'], "SAT-001")
        self.assertIn("answer", res)

    # 17. Determinism & Repeatability
    def test_17_determinism(self):
        r1 = self.assistant.answer_question("What is the thermal margin?", "SAT-001", self.nominal_agis3)
        r2 = self.assistant.answer_question("What is the thermal margin?", "SAT-001", self.nominal_agis3)
        self.assertEqual(r1['answer'], r2['answer'])
        self.assertEqual(r1['risk_level'], r2['risk_level'])


if __name__ == "__main__":
    print("=" * 70)
    print("SATSHIELD STEP 26 — AI MISSION ASSISTANT 17-POINT TEST BATTERY")
    print("=" * 70)
    unittest.main()
