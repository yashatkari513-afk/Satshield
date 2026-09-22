"""
SATSHIELD Step 28 — Real Before vs After Satellite Health Reports Test Suite
Validates snapshot immutability, separate report cards, delta calculations,
satellite isolation, and 6-step simulation integration.
"""

import unittest
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from satshield_ml.before_after_report_service import (
    BeforeAfterReportService,
    get_before_after_service
)


class TestStep28BeforeAfterReports(unittest.TestCase):

    def setUp(self):
        self.service = BeforeAfterReportService()

    def test_01_before_report_generated_from_baseline(self):
        """1. BEFORE report is generated from baseline telemetry."""
        tel = {'temperature': 24.5, 'voltage': 28.5, 'current': 6.5, 'battery': 90.0, 'solar_power': 650.0}
        report = self.service.capture_before_snapshot('AGIS-3', tel, health_score=95.0, risk_level='NOMINAL')

        self.assertEqual(report['report_type'], 'BEFORE')
        self.assertEqual(report['satellite_id'], 'AGIS-3')
        self.assertEqual(report['health_state'], 'HEALTHY / NOMINAL')
        self.assertEqual(report['risk_level'], 'NOMINAL')
        self.assertEqual(report['telemetry']['temperature'], 24.5)
        self.assertIn("Synthetic / simulated telemetry", report['disclaimer'])

    def test_02_before_snapshot_remains_unchanged(self):
        """2. BEFORE snapshot remains immutable after subsequent AFTER capture."""
        tel_before = {'temperature': 24.0, 'voltage': 28.5, 'battery': 92.0}
        self.service.capture_before_snapshot('AGIS-3', tel_before, health_score=96.0, risk_level='NOMINAL')

        # Capture AFTER with severe anomaly telemetry
        tel_after = {'temperature': 61.2, 'voltage': 22.4, 'battery': 34.0}
        self.service.capture_after_snapshot('AGIS-3', tel_after, health_score=35.0, risk_level='CRITICAL')

        reports = self.service.get_reports('AGIS-3')
        before = reports['before_report']
        after = reports['after_report']

        # Ensure BEFORE was NOT modified
        self.assertEqual(before['telemetry']['temperature'], 24.0)
        self.assertEqual(before['telemetry']['voltage'], 28.5)
        self.assertEqual(before['risk_level'], 'NOMINAL')
        self.assertEqual(before['health_score'], 96.0)

        # Ensure AFTER holds post-anomaly values
        self.assertEqual(after['telemetry']['temperature'], 61.2)
        self.assertEqual(after['telemetry']['voltage'], 22.4)
        self.assertEqual(after['risk_level'], 'CRITICAL')

    def test_03_after_report_generated_after_simulation(self):
        """3. AFTER report is created with post-anomaly diagnostics."""
        tel_after = {'temperature': 58.5, 'voltage': 23.0, 'battery': 40.0}
        report = self.service.capture_after_snapshot(
            'SENTINEL-9',
            tel_after,
            health_score=42.0,
            risk_level='HIGH',
            detected_anomaly='EPS Bus Sudden Undervoltage',
            probable_root_cause='Solar array tracking fault causing bus undervoltage.',
            mission_impact='Payload power reduced; battery discharge accelerated.'
        )

        self.assertEqual(report['report_type'], 'AFTER')
        self.assertEqual(report['satellite_id'], 'SENTINEL-9')
        self.assertEqual(report['detected_anomaly'], 'EPS Bus Sudden Undervoltage')
        self.assertIn('Solar array', report['probable_root_cause'])
        self.assertEqual(report['risk_level'], 'HIGH')

    def test_04_before_and_after_are_separate(self):
        """4. BEFORE and AFTER are distinct report objects."""
        self.service.capture_before_snapshot('ORBCOM-7', {'temperature': 25.0})
        self.service.capture_after_snapshot('ORBCOM-7', {'temperature': 55.0})

        reports = self.service.get_reports('ORBCOM-7')
        self.assertTrue(reports['has_before'])
        self.assertTrue(reports['has_after'])
        self.assertNotEqual(reports['before_report']['report_type'], reports['after_report']['report_type'])
        self.assertEqual(reports['before_report']['label'], 'BASELINE / BEFORE ANOMALY')
        self.assertEqual(reports['after_report']['label'], 'POST-ANOMALY / AFTER')

    def test_05_before_telemetry_differs_from_after_telemetry(self):
        """5. BEFORE telemetry != AFTER telemetry when simulation runs."""
        b = self.service.capture_before_snapshot('HELIOS-1', {'temperature': 24.0, 'voltage': 28.5})
        a = self.service.capture_after_snapshot('HELIOS-1', {'temperature': 52.0, 'voltage': 25.0})

        self.assertNotEqual(b['telemetry'], a['telemetry'])
        self.assertNotEqual(b['telemetry']['temperature'], a['telemetry']['temperature'])

    def test_06_comparison_values_calculated_correctly(self):
        """6. Parameter differences are calculated as AFTER - BEFORE."""
        b = {'temperature': 25.0, 'voltage': 28.0, 'battery': 90.0, 'current': 6.0}
        a = {'temperature': 55.0, 'voltage': 23.0, 'battery': 50.0, 'current': 14.0}
        
        snap_b = self.service.capture_before_snapshot('AGIS-3', b, health_score=95.0)
        snap_a = self.service.capture_after_snapshot('AGIS-3', a, health_score=40.0)

        comp = self.service.compare_snapshots(snap_b, snap_a, 'AGIS-3')
        self.assertEqual(comp['status'], 'COMPLETE')

        row_map = {r['parameter_key']: r for r in comp['parameter_comparisons']}

        # Temperature: 55.0 - 25.0 = +30.0
        self.assertAlmostEqual(row_map['temperature']['delta'], 30.0, places=2)
        self.assertEqual(row_map['temperature']['status'], 'DEGRADING')

        # Voltage: 23.0 - 28.0 = -5.0
        self.assertAlmostEqual(row_map['voltage']['delta'], -5.0, places=2)
        self.assertEqual(row_map['voltage']['status'], 'DEGRADING')

        # Battery: 50.0 - 90.0 = -40.0
        self.assertAlmostEqual(row_map['battery']['delta'], -40.0, places=1)
        self.assertEqual(row_map['battery']['status'], 'DEGRADING')

        # Current: 14.0 - 6.0 = +8.0
        self.assertAlmostEqual(row_map['current']['delta'], 8.0, places=2)
        self.assertEqual(row_map['current']['status'], 'DEGRADING')

        # Overall Health Score: 40.0 - 95.0 = -55.0
        self.assertAlmostEqual(row_map['health_score']['delta'], -55.0, places=1)

    def test_07_missing_values_handled_safely(self):
        """7. Missing or incomplete telemetry handles gracefully without crash."""
        snap_b = self.service.capture_before_snapshot('SAT-001', {})
        snap_a = self.service.capture_after_snapshot('SAT-001', {})

        comp = self.service.compare_snapshots(snap_b, snap_a, 'SAT-001')
        self.assertEqual(comp['status'], 'COMPLETE')
        self.assertGreater(len(comp['parameter_comparisons']), 0)

    def test_08_insufficient_evidence_handled_safely(self):
        """8. Comparison with single snapshot returns INCOMPLETE gracefully."""
        comp = self.service.compare_snapshots(None, {'telemetry': {}}, 'AGIS-3')
        self.assertEqual(comp['status'], 'INCOMPLETE')

    def test_09_agis3_report_isolation(self):
        """9. AGIS-3 report state is strictly isolated."""
        self.service.capture_before_snapshot('AGIS-3', {'temperature': 24.5})
        reports = self.service.get_reports('AGIS-3')
        self.assertEqual(reports['satellite_id'], 'AGIS-3')
        self.assertEqual(reports['satellite_name'], 'AGIS-3')
        self.assertTrue(reports['has_before'])

    def test_10_sentinel9_report_isolation(self):
        """10. SENTINEL-9 report state is strictly isolated from AGIS-3."""
        self.service.capture_before_snapshot('AGIS-3', {'temperature': 24.5})
        self.service.capture_before_snapshot('SENTINEL-9', {'temperature': 21.0})

        rep_agis = self.service.get_reports('AGIS-3')
        rep_sent = self.service.get_reports('SENTINEL-9')

        self.assertEqual(rep_agis['before_report']['telemetry']['temperature'], 24.5)
        self.assertEqual(rep_sent['before_report']['telemetry']['temperature'], 21.0)
        self.assertNotEqual(rep_agis['satellite_id'], rep_sent['satellite_id'])

    def test_11_orbcom7_report_isolation(self):
        """11. ORBCOM-7 report state is isolated."""
        self.service.capture_before_snapshot('ORBCOM-7', {'signal_strength': -70.0})
        reports = self.service.get_reports('ORBCOM-7')
        self.assertEqual(reports['satellite_id'], 'ORBCOM-7')
        self.assertEqual(reports['before_report']['telemetry']['signal_strength'], -70.0)

    def test_12_helios1_report_isolation(self):
        """12. HELIOS-1 report state is isolated."""
        self.service.capture_before_snapshot('HELIOS-1', {'attitude_error': 0.04})
        reports = self.service.get_reports('HELIOS-1')
        self.assertEqual(reports['satellite_id'], 'HELIOS-1')
        self.assertEqual(reports['before_report']['telemetry']['attitude_error'], 0.04)

    def test_13_reset_creates_clean_report_state(self):
        """13. Reset clears the report state for new baseline."""
        self.service.capture_before_snapshot('AGIS-3', {'temperature': 25.0})
        self.service.capture_after_snapshot('AGIS-3', {'temperature': 60.0})
        
        self.service.reset_reports('AGIS-3')
        reports = self.service.get_reports('AGIS-3')
        self.assertFalse(reports['has_before'])
        self.assertFalse(reports['has_after'])
        self.assertIsNone(reports['before_report'])
        self.assertIsNone(reports['after_report'])

    def test_14_six_step_simulation_produces_after_report(self):
        """14. Completed simulation populates AFTER report with root cause and ETT."""
        self.service.capture_before_snapshot('AGIS-3', {'temperature': 24.0}, health_score=96.0)
        
        after = self.service.capture_after_snapshot(
            'AGIS-3',
            {'temperature': 62.4, 'voltage': 26.8, 'current': 14.5},
            health_score=34.0,
            risk_level='CRITICAL',
            detected_anomaly='Sustained Subsystem Overheating',
            probable_root_cause='Radiator occlusion causing thermal accumulation.',
            estimated_time_to_threshold='2.5 min to 65.0°C',
            what_if_result='If thermal slope continues, core electronics damage is projected at T+10m.'
        )

        self.assertEqual(after['report_type'], 'AFTER')
        self.assertEqual(after['estimated_time_to_threshold'], '2.5 min to 65.0°C')
        self.assertIn('Radiator occlusion', after['probable_root_cause'])

    def test_15_diagnosis_data_in_after_report_only(self):
        """15. Diagnostic details appear in AFTER report, while BEFORE remains baseline."""
        b = self.service.capture_before_snapshot('AGIS-3', {'temperature': 24.0})
        a = self.service.capture_after_snapshot('AGIS-3', {'temperature': 60.0}, detected_anomaly='Thermal Runaway')

        self.assertIsNone(b['detected_anomaly'])
        self.assertEqual(a['detected_anomaly'], 'Thermal Runaway')

    def test_16_predictive_data_appears_when_supported(self):
        """16. Predictive maintenance ETT is present when supported."""
        a = self.service.capture_after_snapshot(
            'AGIS-3',
            {'temperature': 54.0},
            estimated_time_to_threshold='4.2 min'
        )
        self.assertEqual(a['estimated_time_to_threshold'], '4.2 min')

    def test_17_what_if_data_appears_when_available(self):
        """17. What-If scenario assessment is included in AFTER report."""
        a = self.service.capture_after_snapshot(
            'AGIS-3',
            {'temperature': 54.0},
            what_if_result='Projected temperature: 68.0°C at T+10m.'
        )
        self.assertIn('68.0°C', a['what_if_result'])

    def test_18_existing_report_format_and_disclaimer(self):
        """18. Both reports contain the required scientific disclosure."""
        b = self.service.capture_before_snapshot('AGIS-3', {'temperature': 24.5})
        a = self.service.capture_after_snapshot('AGIS-3', {'temperature': 58.0})

        self.assertIn("Synthetic / simulated telemetry", b['disclaimer'])
        self.assertIn("Synthetic / simulated telemetry", a['disclaimer'])


if __name__ == '__main__':
    print("=" * 70)
    print("SATSHIELD STEP 28 — REAL BEFORE vs AFTER SATELLITE HEALTH REPORTS TEST BATTERY")
    print("=" * 70)
    unittest.main()
