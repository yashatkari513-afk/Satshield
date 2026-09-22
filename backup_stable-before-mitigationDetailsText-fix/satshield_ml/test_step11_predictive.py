"""
SATSHIELD ML Pipeline — Step 11: Unit & Integration Test Suite for Real Predictive Maintenance
Tests all 12 mandatory test cases from the Step 11 specification.
"""
import unittest
import numpy as np
from predictive_maintenance import (
    SatellitePredictiveMaintenanceEngine,
    get_predictive_engine,
    analyze_predictive_maintenance,
    OPERATIONAL_THRESHOLDS
)

class TestStep11PredictiveMaintenance(unittest.TestCase):

    def setUp(self):
        self.engine = SatellitePredictiveMaintenanceEngine()
        self.engine.reset_history()

    # TEST 1: Normal Stable Telemetry -> NOMINAL
    def test_01_normal_stable_telemetry(self):
        sat_id = 'AGIS-3'
        nominal_frame = {
            'satellite_id': sat_id,
            'temperature_c': 24.5,
            'voltage_v': 28.2,
            'current_a': 6.5,
            'battery_soc_percent': 88.0,
            'solar_power_w': 650.0,
            'communication_signal_db': -75.0,
            'vibration_g': 0.04,
            'attitude_error_deg': 0.05
        }
        for _ in range(5):
            res = self.engine.analyze(sat_id, nominal_frame)

        self.assertEqual(res['risk_level'], 'NOMINAL')
        self.assertEqual(res['overall_trend'], 'STABLE')
        self.assertFalse(res['early_warning_active'])
        self.assertIn('NOMINAL', res['early_warning'])
        self.assertEqual(res['data_quality'], 'GOOD')

    # TEST 2: Increasing Temperature -> Thermal Trend Detected
    def test_02_increasing_temperature_trend(self):
        sat_id = 'SENTINEL-9'
        temps = [35.0, 38.0, 41.0, 44.0, 47.0] # Trending up at +3.0°C/min toward 60°C
        for t in temps:
            res = self.engine.analyze(sat_id, {
                'satellite_id': sat_id,
                'temperature_c': t,
                'voltage_v': 28.2,
                'current_a': 6.5,
                'battery_soc_percent': 88.0,
                'solar_power_w': 650.0,
                'communication_signal_db': -75.0,
                'vibration_g': 0.04,
                'attitude_error_deg': 0.05
            })

        self.assertIn(res['risk_level'], ['ELEVATED', 'HIGH', 'CRITICAL'])
        self.assertEqual(res['subsystem'], 'THERMAL')
        self.assertGreater(res['trend_slope'], 0.0)
        self.assertIsNotNone(res['estimated_time_to_threshold'])
        self.assertIn('min', res['estimated_time_formatted'])
        self.assertTrue('Thermal' in res['early_warning'] or 'temperature' in res['early_warning'].lower())

    # TEST 3: Declining Battery SOC -> Battery Degradation Warning
    def test_03_declining_battery_soc(self):
        sat_id = 'SAT-001'
        socs = [85.0, 78.0, 71.0, 64.0, 57.0] # Trending down at -7.0%/min toward 35% critical threshold
        for s in socs:
            res = self.engine.analyze(sat_id, {
                'satellite_id': sat_id,
                'temperature_c': 25.0,
                'voltage_v': 28.2,
                'current_a': 6.5,
                'battery_soc_percent': s,
                'solar_power_w': 650.0,
                'communication_signal_db': -75.0,
                'vibration_g': 0.04,
                'attitude_error_deg': 0.05
            })

        self.assertIn(res['risk_level'], ['ELEVATED', 'HIGH', 'CRITICAL'])
        self.assertEqual(res['subsystem'], 'BATTERY')
        self.assertLess(res['trend_slope'], 0.0)
        self.assertIsNotNone(res['estimated_time_to_threshold'])
        self.assertTrue('Battery' in res['early_warning'] or 'charge' in res['early_warning'].lower())

    # TEST 4: Increasing Current + Declining Voltage -> Power Risk
    def test_04_power_bus_degradation(self):
        sat_id = 'ORBCOM-7'
        volts = [27.5, 26.8, 26.0, 25.2, 24.4] # Trending down toward 22.5V critical
        currs = [7.0, 8.5, 10.0, 11.5, 13.0]   # Trending up toward 18.0A critical
        for v, c in zip(volts, currs):
            res = self.engine.analyze(sat_id, {
                'satellite_id': sat_id,
                'temperature_c': 25.0,
                'voltage_v': v,
                'current_a': c,
                'battery_soc_percent': 80.0,
                'solar_power_w': 600.0,
                'communication_signal_db': -75.0,
                'vibration_g': 0.04,
                'attitude_error_deg': 0.05
            })

        self.assertIn(res['risk_level'], ['ELEVATED', 'HIGH', 'CRITICAL'])
        self.assertEqual(res['subsystem'], 'POWER')
        self.assertTrue(res['early_warning_active'])

    # TEST 5: Communication Degradation -> Communication Early Warning
    def test_05_communication_degradation(self):
        sat_id = 'HELIOS-1'
        signals = [-76.0, -82.0, -88.0, -94.0, -98.0] # Fading toward -105 dBm critical
        for sig in signals:
            res = self.engine.analyze(sat_id, {
                'satellite_id': sat_id,
                'temperature_c': 25.0,
                'voltage_v': 28.2,
                'current_a': 6.5,
                'battery_soc_percent': 88.0,
                'solar_power_w': 650.0,
                'communication_signal_db': sig,
                'vibration_g': 0.04,
                'attitude_error_deg': 0.05
            })

        self.assertIn(res['risk_level'], ['ELEVATED', 'HIGH', 'CRITICAL'])
        self.assertEqual(res['subsystem'], 'COMMUNICATION')
        self.assertIsNotNone(res['estimated_time_to_threshold'])
        self.assertTrue('RF' in res['early_warning'] or 'signal' in res['early_warning'].lower() or 'downlink' in res['early_warning'].lower())

    # TEST 6: Increasing Attitude Error -> Attitude / AOCS Warning
    def test_06_attitude_pointing_error(self):
        sat_id = 'SAT-004'
        errors = [0.10, 0.45, 0.80, 1.15, 1.50] # Trending up toward 2.5° critical
        for err in errors:
            res = self.engine.analyze(sat_id, {
                'satellite_id': sat_id,
                'temperature_c': 25.0,
                'voltage_v': 28.2,
                'current_a': 6.5,
                'battery_soc_percent': 88.0,
                'solar_power_w': 650.0,
                'communication_signal_db': -75.0,
                'vibration_g': 0.05,
                'attitude_error_deg': err
            })

        self.assertIn(res['risk_level'], ['ELEVATED', 'HIGH', 'CRITICAL'])
        self.assertEqual(res['subsystem'], 'ATTITUDE')
        self.assertIsNotNone(res['estimated_time_to_threshold'])

    # TEST 7: Threshold Already Crossed -> No Invalid Future-Time Calculation
    def test_07_threshold_already_crossed(self):
        sat_id = 'TEST-CROSSED'
        # Temperature already at 75°C (critical threshold is 60°C)
        crossed_frames = [65.0, 70.0, 75.0]
        for t in crossed_frames:
            res = self.engine.analyze(sat_id, {
                'satellite_id': sat_id,
                'temperature_c': t,
                'voltage_v': 28.2,
                'current_a': 6.5,
                'battery_soc_percent': 88.0,
                'solar_power_w': 650.0,
                'communication_signal_db': -75.0,
                'vibration_g': 0.04,
                'attitude_error_deg': 0.05
            })

        self.assertEqual(res['risk_level'], 'CRITICAL')
        self.assertIn('already exceeded', res['estimated_time_formatted'].lower())

    # TEST 8: Flat Trend -> N/A Time-To-Threshold
    def test_08_flat_trend(self):
        sat_id = 'TEST-FLAT'
        for _ in range(5):
            res = self.engine.analyze(sat_id, {
                'satellite_id': sat_id,
                'temperature_c': 25.0,
                'voltage_v': 28.2,
                'current_a': 6.5,
                'battery_soc_percent': 88.0,
                'solar_power_w': 650.0,
                'communication_signal_db': -75.0,
                'vibration_g': 0.04,
                'attitude_error_deg': 0.05
            })

        self.assertEqual(res['estimated_time_to_threshold'], None)
        self.assertIn('N/A', res['estimated_time_formatted'])

    # TEST 9: Insufficient History (<3 frames) -> N/A / Insufficient Evidence
    def test_09_insufficient_history(self):
        sat_id = 'TEST-INSUFF'
        res = self.engine.analyze(sat_id, {
            'satellite_id': sat_id,
            'temperature_c': 35.0,
            'voltage_v': 28.2,
            'current_a': 6.5,
            'battery_soc_percent': 88.0,
            'solar_power_w': 650.0,
            'communication_signal_db': -75.0,
            'vibration_g': 0.04,
            'attitude_error_deg': 0.05
        })

        self.assertEqual(res['status'], 'INSUFFICIENT_DATA')
        self.assertIn('insufficient', res['estimated_time_formatted'].lower())
        self.assertEqual(res['data_quality'], 'INSUFFICIENT')

    # TEST 10: Missing/NaN/Invalid Telemetry -> Safe Handling
    def test_10_invalid_telemetry_safe_handling(self):
        sat_id = 'TEST-INVALID'
        # NaN or non-numeric values
        res = self.engine.analyze(sat_id, {
            'satellite_id': sat_id,
            'temperature_c': np.nan,
            'voltage_v': "CORRUPT",
            'current_a': None
        })

        self.assertEqual(res['status'], 'INSUFFICIENT_DATA')
        self.assertEqual(res['risk_level'], 'NOMINAL')
        self.assertFalse(res['early_warning_active'])

    # TEST 11: Multi-Satellite Isolation (AGIS-3 vs SENTINEL-9 vs ORBCOM-7 vs HELIOS-1)
    def test_11_multi_satellite_isolation(self):
        # Feed nominal to AGIS-3
        for _ in range(4):
            self.engine.analyze('AGIS-3', {
                'satellite_id': 'AGIS-3',
                'temperature_c': 24.5,
                'voltage_v': 28.2,
                'current_a': 6.5,
                'battery_soc_percent': 88.0,
                'solar_power_w': 650.0,
                'communication_signal_db': -75.0,
                'vibration_g': 0.04,
                'attitude_error_deg': 0.05
            })

        # Feed degrading thermal to SENTINEL-9
        for t in [35.0, 40.0, 45.0, 50.0]:
            self.engine.analyze('SENTINEL-9', {
                'satellite_id': 'SENTINEL-9',
                'temperature_c': t,
                'voltage_v': 28.2,
                'current_a': 6.5,
                'battery_soc_percent': 88.0,
                'solar_power_w': 650.0,
                'communication_signal_db': -75.0,
                'vibration_g': 0.04,
                'attitude_error_deg': 0.05
            })

        res_agis = self.engine.analyze('AGIS-3', {
            'satellite_id': 'AGIS-3',
            'temperature_c': 24.5,
            'voltage_v': 28.2,
            'current_a': 6.5,
            'battery_soc_percent': 88.0,
            'solar_power_w': 650.0,
            'communication_signal_db': -75.0,
            'vibration_g': 0.04,
            'attitude_error_deg': 0.05
        })
        res_sentinel = self.engine.analyze('SENTINEL-9', {
            'satellite_id': 'SENTINEL-9',
            'temperature_c': 55.0,
            'voltage_v': 28.2,
            'current_a': 6.5,
            'battery_soc_percent': 88.0,
            'solar_power_w': 650.0,
            'communication_signal_db': -75.0,
            'vibration_g': 0.04,
            'attitude_error_deg': 0.05
        })

        self.assertEqual(res_agis['risk_level'], 'NOMINAL')
        self.assertIn(res_sentinel['risk_level'], ['HIGH', 'CRITICAL'])
        self.assertEqual(res_sentinel['subsystem'], 'THERMAL')

    # TEST 12: 6-Step Simulation Telemetry Sequence Integration
    def test_12_simulation_sequence_integration(self):
        sat_id = 'AGIS-3'
        sim_sequence = [
            {'satellite_id': sat_id, 'temperature_c': 25.0, 'voltage_v': 28.2, 'current_a': 6.5, 'battery_soc_percent': 88.0, 'solar_power_w': 650.0, 'communication_signal_db': -75.0, 'vibration_g': 0.04, 'attitude_error_deg': 0.05}, # Step 1: Baseline
            {'satellite_id': sat_id, 'temperature_c': 32.0, 'voltage_v': 28.0, 'current_a': 7.0, 'battery_soc_percent': 86.0, 'solar_power_w': 640.0, 'communication_signal_db': -75.0, 'vibration_g': 0.04, 'attitude_error_deg': 0.05}, # Step 2: Drift
            {'satellite_id': sat_id, 'temperature_c': 42.0, 'voltage_v': 27.8, 'current_a': 7.5, 'battery_soc_percent': 84.0, 'solar_power_w': 630.0, 'communication_signal_db': -75.0, 'vibration_g': 0.04, 'attitude_error_deg': 0.05}, # Step 3: Threshold approach
            {'satellite_id': sat_id, 'temperature_c': 52.0, 'voltage_v': 27.5, 'current_a': 8.0, 'battery_soc_percent': 82.0, 'solar_power_w': 620.0, 'communication_signal_db': -75.0, 'vibration_g': 0.04, 'attitude_error_deg': 0.05}, # Step 4: ML Anomaly
            {'satellite_id': sat_id, 'temperature_c': 62.0, 'voltage_v': 27.0, 'current_a': 8.5, 'battery_soc_percent': 80.0, 'solar_power_w': 600.0, 'communication_signal_db': -75.0, 'vibration_g': 0.04, 'attitude_error_deg': 0.05}, # Step 5: Risk
            {'satellite_id': sat_id, 'temperature_c': 72.0, 'voltage_v': 26.5, 'current_a': 9.0, 'battery_soc_percent': 78.0, 'solar_power_w': 580.0, 'communication_signal_db': -75.0, 'vibration_g': 0.04, 'attitude_error_deg': 0.05}  # Step 6: Diagnosis
        ]
        
        # Test step-by-step progress
        for i, frame in enumerate(sim_sequence):
            res = self.engine.analyze(sat_id, frame)
            if i >= 2:
                # Step 3+ should detect thermal trend
                self.assertEqual(res['subsystem'], 'THERMAL')
                self.assertGreater(res['trend_slope'], 0.0)

        # Final step should show critical risk with thermal action
        self.assertEqual(res['risk_level'], 'CRITICAL')
        self.assertTrue('radiator' in res['recommended_action'].lower() or 'thermal' in res['recommended_action'].lower())

if __name__ == '__main__':
    unittest.main()
