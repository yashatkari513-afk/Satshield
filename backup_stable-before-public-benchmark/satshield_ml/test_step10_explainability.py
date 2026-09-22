"""
Test Suite for Step 10: Real Explainable AI (XAI) Root-Cause & Evidence Layer
"""
import unittest
from explainability import (
    extract_telemetry_evidence,
    identify_affected_subsystem,
    compute_contributing_factors,
    generate_probable_root_cause,
    generate_mission_impact,
    generate_recommended_operator_action,
    build_explainability_report
)
from predict import get_predictor, predict_telemetry

class TestStep10Explainability(unittest.TestCase):

    def test_nominal_telemetry_explainability(self):
        """Tests explainability report for nominal telemetry."""
        nominal_data = {
            'satellite_id': 'AGIS-3',
            'temperature_c': 24.5,
            'voltage_v': 28.5,
            'current_a': 6.5,
            'battery_soc_percent': 90.0,
            'solar_power_w': 680.0,
            'communication_signal_db': -72.0,
            'vibration_g': 0.035,
            'attitude_error_deg': 0.04
        }
        res = predict_telemetry(nominal_data)
        self.assertEqual(res['prediction'], 'NORMAL')
        self.assertGreater(res['raw_anomaly_score'], 0.0)
        self.assertIn('Nominal', res['probable_root_cause'])
        self.assertEqual(res['data_quality'], 'GOOD')
        self.assertGreaterEqual(len(res['contributing_factors']), 1)

    def test_thermal_anomaly_explainability(self):
        """Tests explainability report for thermal overheating anomaly."""
        thermal_data = {
            'satellite_id': 'SENTINEL-9',
            'temperature_c': 72.4,
            'voltage_v': 28.0,
            'current_a': 7.2,
            'battery_soc_percent': 85.0,
            'solar_power_w': 620.0,
            'communication_signal_db': -74.0,
            'vibration_g': 0.04,
            'attitude_error_deg': 0.05
        }
        report = build_explainability_report(
            raw_telemetry=thermal_data,
            raw_score=-0.065,
            prediction="ANOMALY",
            satellite_id="SENTINEL-9",
            severity="CRITICAL",
            data_quality="GOOD"
        )
        self.assertEqual(report['subsystem'], 'THERMAL')
        self.assertGreaterEqual(len(report['evidence']), 1)
        self.assertTrue(any('Temperature' in item['parameter'] for item in report['evidence']))
        self.assertTrue('Thermal' in report['probable_root_cause'] or 'temperature' in report['probable_root_cause'].lower())
        self.assertIn('thermal', report['mission_impact'].lower())
        self.assertTrue('thermal' in report['recommended_action'].lower() or 'radiator' in report['recommended_action'].lower())
        self.assertEqual(report['contributing_factors'][0]['type'], 'PRIMARY')

    def test_battery_anomaly_explainability(self):
        """Tests explainability report for battery degradation & bus undervoltage."""
        battery_data = {
            'satellite_id': 'SAT-001',
            'temperature_c': 26.0,
            'voltage_v': 22.4,
            'current_a': 18.5,
            'battery_soc_percent': 32.0,
            'solar_power_w': 600.0,
            'communication_signal_db': -75.0,
            'vibration_g': 0.038,
            'attitude_error_deg': 0.04
        }
        res = predict_telemetry(battery_data)
        self.assertEqual(res['prediction'], 'ANOMALY')
        self.assertIn(res['subsystem'], ['BATTERY', 'POWER'])
        self.assertGreaterEqual(len(res['evidence_items']), 1)
        self.assertTrue('battery' in res['probable_root_cause'].lower() or 'voltage' in res['probable_root_cause'].lower())
        self.assertTrue('power' in res['mission_impact'].lower() or 'energy' in res['mission_impact'].lower())

    def test_communication_anomaly_explainability(self):
        """Tests explainability report for RF downlink attenuation."""
        comm_data = {
            'satellite_id': 'ORBCOM-7',
            'temperature_c': 24.0,
            'voltage_v': 28.2,
            'current_a': 6.5,
            'battery_soc_percent': 88.0,
            'solar_power_w': 650.0,
            'communication_signal_db': -108.5,
            'vibration_g': 0.04,
            'attitude_error_deg': 0.05
        }
        report = build_explainability_report(
            raw_telemetry=comm_data,
            raw_score=-0.052,
            prediction="ANOMALY",
            satellite_id="ORBCOM-7",
            severity="CRITICAL",
            data_quality="GOOD"
        )
        self.assertEqual(report['subsystem'], 'COMMUNICATION')
        self.assertTrue(any('Signal' in item['parameter'] or 'RF' in item['parameter'] for item in report['evidence']))
        self.assertTrue('RF' in report['probable_root_cause'] or 'carrier' in report['probable_root_cause'].lower())
        self.assertTrue('link' in report['mission_impact'].lower() or 'telemetry' in report['mission_impact'].lower())

    def test_attitude_anomaly_explainability(self):
        """Tests explainability report for attitude pointing drift."""
        att_data = {
            'satellite_id': 'HELIOS-1',
            'temperature_c': 25.0,
            'voltage_v': 28.2,
            'current_a': 6.5,
            'battery_soc_percent': 88.0,
            'solar_power_w': 650.0,
            'communication_signal_db': -75.0,
            'vibration_g': 0.65,
            'attitude_error_deg': 8.45
        }
        report = build_explainability_report(
            raw_telemetry=att_data,
            raw_score=-0.078,
            prediction="ANOMALY",
            satellite_id="HELIOS-1",
            severity="CRITICAL",
            data_quality="GOOD"
        )
        self.assertEqual(report['subsystem'], 'ATTITUDE')
        self.assertTrue(any('Pointing' in item['parameter'] or 'Attitude' in item['parameter'] for item in report['evidence']))
        self.assertTrue('pointing' in report['probable_root_cause'].lower() or 'reaction wheel' in report['probable_root_cause'].lower())

    def test_invalid_telemetry_handling(self):
        """Tests guardrail handling when telemetry fields are missing or invalid."""
        invalid_data = {
            'satellite_id': 'TEST-SAT',
            'temperature_c': 'invalid_string'
        }
        res = predict_telemetry(invalid_data)
        self.assertEqual(res['prediction'], 'ERROR')
        self.assertEqual(res['data_quality'], 'INVALID')
        self.assertTrue('rejected' in res['explanation'].lower() or 'invalid' in res['explanation'].lower())

if __name__ == '__main__':
    unittest.main()
