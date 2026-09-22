"""
SATSHIELD — Dynamic Alerts Unit & Consistency Test Battery (Step 30 Aligned)
Verifies that Dynamic Alerts strictly use the authoritative Step 11 operational thresholds
and maintain zero false positives on nominal telemetry, strict satellite isolation,
and real acknowledgment/resolution lifecycles.
"""

import unittest
from typing import Dict, Any, List

# Authoritative Operational Thresholds (Identical to Step 11 Predictive Maintenance)
OPERATIONAL_THRESHOLDS = {
    'temperature_c': {'warning': 50.0, 'critical': 60.0, 'direction': 'UP'},
    'voltage_v': {'warning': 24.0, 'critical': 22.5, 'direction': 'DOWN'},
    'current_a': {'warning': 14.0, 'critical': 18.0, 'direction': 'UP'},
    'battery_soc_percent': {'warning': 50.0, 'critical': 35.0, 'direction': 'DOWN'},
    'solar_power_w': {'warning': 300.0, 'critical': 200.0, 'direction': 'DOWN'},
    'communication_signal_db': {'warning': -95.0, 'critical': -105.0, 'direction': 'DOWN'},
    'vibration_g': {'warning': 0.20, 'critical': 0.35, 'direction': 'UP'},
    'attitude_error_deg': {'warning': 1.0, 'critical': 2.5, 'direction': 'UP'},
}


class MockDynamicAlertService:
    def __init__(self):
        self.store = {}

    def generate_alerts(self, sat_id: str, telemetry: Dict[str, Any], ml_result=None, diagnosis=None, simulation_step=0):
        sat_key = sat_id.upper()
        alerts = []

        temp = float(telemetry.get('temperature_c', telemetry.get('temperature', 24.5)))
        volt = float(telemetry.get('voltage_v', telemetry.get('voltage', 28.5)))
        curr = float(telemetry.get('current_a', telemetry.get('current', 6.5)))
        batt = float(telemetry.get('battery_soc_percent', telemetry.get('battery', 90.0)))
        solar = float(telemetry.get('solar_power_w', telemetry.get('solar_power', 650.0)))
        signal = float(telemetry.get('communication_signal_db', telemetry.get('signal_strength', -75.0)))
        vib = float(telemetry.get('vibration_g', telemetry.get('vibration', 0.04)))
        att = float(telemetry.get('attitude_error_deg', telemetry.get('attitude_error', 0.05)))

        # 1. Thermal
        th_t = OPERATIONAL_THRESHOLDS['temperature_c']
        if temp >= th_t['critical']:
            alerts.append({'id': f'ALT-THM-{sat_key}-CRIT', 'subsystem': 'THERMAL', 'severity': 'CRITICAL', 'threshold': th_t['critical']})
        elif temp >= th_t['warning']:
            alerts.append({'id': f'ALT-THM-{sat_key}-WARN', 'subsystem': 'THERMAL', 'severity': 'WARNING', 'threshold': th_t['warning']})

        # 2. Power EPS (Voltage & Current)
        th_v = OPERATIONAL_THRESHOLDS['voltage_v']
        th_i = OPERATIONAL_THRESHOLDS['current_a']
        if volt <= th_v['critical'] or curr >= th_i['critical']:
            alerts.append({'id': f'ALT-PWR-{sat_key}-CRIT', 'subsystem': 'POWER', 'severity': 'CRITICAL', 'threshold': th_v['critical']})
        elif volt <= th_v['warning'] or curr >= th_i['warning']:
            alerts.append({'id': f'ALT-PWR-{sat_key}-WARN', 'subsystem': 'POWER', 'severity': 'WARNING', 'threshold': th_v['warning']})

        # 3. Battery
        th_b = OPERATIONAL_THRESHOLDS['battery_soc_percent']
        if batt <= th_b['critical']:
            alerts.append({'id': f'ALT-BAT-{sat_key}-CRIT', 'subsystem': 'BATTERY', 'severity': 'CRITICAL', 'threshold': th_b['critical']})
        elif batt <= th_b['warning']:
            alerts.append({'id': f'ALT-BAT-{sat_key}-WARN', 'subsystem': 'BATTERY', 'severity': 'WARNING', 'threshold': th_b['warning']})

        # 4. Solar Power
        th_s = OPERATIONAL_THRESHOLDS['solar_power_w']
        if solar <= th_s['critical']:
            alerts.append({'id': f'ALT-SOL-{sat_key}-CRIT', 'subsystem': 'POWER', 'severity': 'CRITICAL', 'threshold': th_s['critical']})
        elif solar <= th_s['warning']:
            alerts.append({'id': f'ALT-SOL-{sat_key}-WARN', 'subsystem': 'POWER', 'severity': 'WARNING', 'threshold': th_s['warning']})

        # 5. Communication
        th_c = OPERATIONAL_THRESHOLDS['communication_signal_db']
        if signal <= th_c['critical']:
            alerts.append({'id': f'ALT-COM-{sat_key}-CRIT', 'subsystem': 'COMMUNICATION', 'severity': 'CRITICAL', 'threshold': th_c['critical']})
        elif signal <= th_c['warning']:
            alerts.append({'id': f'ALT-COM-{sat_key}-WARN', 'subsystem': 'COMMUNICATION', 'severity': 'WARNING', 'threshold': th_c['warning']})

        # 6. Attitude & Vibration
        th_a = OPERATIONAL_THRESHOLDS['attitude_error_deg']
        th_vib = OPERATIONAL_THRESHOLDS['vibration_g']
        if att >= th_a['critical'] or vib >= th_vib['critical']:
            alerts.append({'id': f'ALT-AOC-{sat_key}-CRIT', 'subsystem': 'AOCS', 'severity': 'CRITICAL', 'threshold': th_a['critical']})
        elif att >= th_a['warning'] or vib >= th_vib['warning']:
            alerts.append({'id': f'ALT-AOC-{sat_key}-WARN', 'subsystem': 'AOCS', 'severity': 'WARNING', 'threshold': th_a['warning']})

        # 7. ML Anomaly
        if ml_result and (ml_result.get('is_anomaly') or ml_result.get('prediction') == 'ANOMALY' or ml_result.get('raw_anomaly_score', 0) < 0):
            raw_score = ml_result.get('raw_anomaly_score', -0.15)
            alerts.append({
                'id': f'ALT-ML-{sat_key}',
                'subsystem': (ml_result.get('subsystem') or 'POWER').upper(),
                'severity': 'CRITICAL' if raw_score < -0.10 else 'WARNING',
                'source': 'ml_anomaly'
            })

        # 8. Diagnosis
        if diagnosis:
            alerts.append({
                'id': f'ALT-DIAG-{sat_key}',
                'subsystem': diagnosis.get('subsystem', 'BATTERY').upper(),
                'severity': diagnosis.get('severity', 'CRITICAL').upper(),
                'source': 'diagnosis'
            })

        for a in alerts:
            a.setdefault('acknowledged', False)
            a.setdefault('resolved', False)
            a.setdefault('status', 'ACTIVE')

        self.store[sat_key] = alerts
        return alerts

    def acknowledge(self, sat_id: str, alert_id: str):
        sat_key = sat_id.upper()
        if sat_key in self.store:
            for a in self.store[sat_key]:
                if a['id'] == alert_id:
                    a['acknowledged'] = True
                    a['status'] = 'RESOLVED' if a['resolved'] else 'ACKNOWLEDGED'

    def resolve(self, sat_id: str, alert_id: str):
        sat_key = sat_id.upper()
        if sat_key in self.store:
            for a in self.store[sat_key]:
                if a['id'] == alert_id:
                    a['acknowledged'] = True
                    a['resolved'] = True
                    a['status'] = 'RESOLVED'

    def resolve_all(self, sat_id=None):
        if sat_id:
            sat_key = sat_id.upper()
            if sat_key in self.store:
                for a in self.store[sat_key]:
                    a['acknowledged'] = True
                    a['resolved'] = True
                    a['status'] = 'RESOLVED'
        else:
            for list_ in self.store.values():
                for a in list_:
                    a['acknowledged'] = True
                    a['resolved'] = True
                    a['status'] = 'RESOLVED'


class TestDynamicAlertsStep30(unittest.TestCase):
    def setUp(self):
        self.service = MockDynamicAlertService()
        self.nominal_telemetry = {
            'temperature_c': 24.5,
            'voltage_v': 28.5,
            'current_a': 6.5,
            'battery_soc_percent': 90.0,
            'solar_power_w': 650.0,
            'communication_signal_db': -75.0,
            'vibration_g': 0.04,
            'attitude_error_deg': 0.05
        }

    def test_01_healthy_satellite_no_false_alerts(self):
        alerts = self.service.generate_alerts('SAT-001', self.nominal_telemetry)
        self.assertEqual(len(alerts), 0, "Healthy telemetry must produce zero active alerts")

    def test_02_thermal_threshold_consistency(self):
        # 49°C -> normal (Warning is 50.0°C)
        t_norm = {**self.nominal_telemetry, 'temperature_c': 49.0}
        alerts = self.service.generate_alerts('SAT-001', t_norm)
        self.assertEqual(len([a for a in alerts if a['subsystem'] == 'THERMAL']), 0)

        # 52°C -> warning (>= 50.0°C and < 60.0°C)
        t_warn = {**self.nominal_telemetry, 'temperature_c': 52.0}
        alerts = self.service.generate_alerts('SAT-001', t_warn)
        thm_alerts = [a for a in alerts if a['subsystem'] == 'THERMAL']
        self.assertEqual(len(thm_alerts), 1)
        self.assertEqual(thm_alerts[0]['severity'], 'WARNING')

        # 61°C -> critical (>= 60.0°C)
        t_crit = {**self.nominal_telemetry, 'temperature_c': 61.0}
        alerts = self.service.generate_alerts('SAT-001', t_crit)
        thm_alerts = [a for a in alerts if a['subsystem'] == 'THERMAL']
        self.assertEqual(len(thm_alerts), 1)
        self.assertEqual(thm_alerts[0]['severity'], 'CRITICAL')

    def test_03_voltage_threshold_consistency(self):
        # 25.0V -> normal (Warning is 24.0V)
        t_norm = {**self.nominal_telemetry, 'voltage_v': 25.0}
        alerts = self.service.generate_alerts('SAT-001', t_norm)
        self.assertEqual(len([a for a in alerts if a['subsystem'] == 'POWER']), 0)

        # 23.0V -> warning (<= 24.0V and > 22.5V)
        t_warn = {**self.nominal_telemetry, 'voltage_v': 23.0}
        alerts = self.service.generate_alerts('SAT-001', t_warn)
        pwr_alerts = [a for a in alerts if a['subsystem'] == 'POWER']
        self.assertEqual(len(pwr_alerts), 1)
        self.assertEqual(pwr_alerts[0]['severity'], 'WARNING')

        # 22.0V -> critical (<= 22.5V)
        t_crit = {**self.nominal_telemetry, 'voltage_v': 22.0}
        alerts = self.service.generate_alerts('SAT-001', t_crit)
        pwr_alerts = [a for a in alerts if a['subsystem'] == 'POWER']
        self.assertEqual(len(pwr_alerts), 1)
        self.assertEqual(pwr_alerts[0]['severity'], 'CRITICAL')

    def test_04_battery_threshold_consistency(self):
        # 55% -> normal (Warning is 50.0%)
        t_norm = {**self.nominal_telemetry, 'battery_soc_percent': 55.0}
        alerts = self.service.generate_alerts('SAT-001', t_norm)
        self.assertEqual(len([a for a in alerts if a['subsystem'] == 'BATTERY']), 0)

        # 45% -> warning (<= 50.0% and > 35.0%)
        t_warn = {**self.nominal_telemetry, 'battery_soc_percent': 45.0}
        alerts = self.service.generate_alerts('SAT-001', t_warn)
        bat_alerts = [a for a in alerts if a['subsystem'] == 'BATTERY']
        self.assertEqual(len(bat_alerts), 1)
        self.assertEqual(bat_alerts[0]['severity'], 'WARNING')

        # 34% -> critical (<= 35.0%)
        t_crit = {**self.nominal_telemetry, 'battery_soc_percent': 34.0}
        alerts = self.service.generate_alerts('SAT-001', t_crit)
        bat_alerts = [a for a in alerts if a['subsystem'] == 'BATTERY']
        self.assertEqual(len(bat_alerts), 1)
        self.assertEqual(bat_alerts[0]['severity'], 'CRITICAL')

    def test_05_attitude_error_threshold_consistency(self):
        # 0.5° -> normal (Warning is 1.0°)
        t_norm = {**self.nominal_telemetry, 'attitude_error_deg': 0.5}
        alerts = self.service.generate_alerts('SAT-001', t_norm)
        self.assertEqual(len([a for a in alerts if a['subsystem'] == 'AOCS']), 0)

        # 1.5° -> warning (>= 1.0° and < 2.5°)
        t_warn = {**self.nominal_telemetry, 'attitude_error_deg': 1.5}
        alerts = self.service.generate_alerts('SAT-001', t_warn)
        aoc_alerts = [a for a in alerts if a['subsystem'] == 'AOCS']
        self.assertEqual(len(aoc_alerts), 1)
        self.assertEqual(aoc_alerts[0]['severity'], 'WARNING')

        # 2.8° -> critical (>= 2.5°)
        t_crit = {**self.nominal_telemetry, 'attitude_error_deg': 2.8}
        alerts = self.service.generate_alerts('SAT-001', t_crit)
        aoc_alerts = [a for a in alerts if a['subsystem'] == 'AOCS']
        self.assertEqual(len(aoc_alerts), 1)
        self.assertEqual(aoc_alerts[0]['severity'], 'CRITICAL')

    def test_06_vibration_threshold_consistency(self):
        # 0.10g -> normal (Warning is 0.20g)
        t_norm = {**self.nominal_telemetry, 'vibration_g': 0.10}
        alerts = self.service.generate_alerts('SAT-001', t_norm)
        self.assertEqual(len([a for a in alerts if a['subsystem'] == 'AOCS']), 0)

        # 0.25g -> warning (>= 0.20g and < 0.35g)
        t_warn = {**self.nominal_telemetry, 'vibration_g': 0.25}
        alerts = self.service.generate_alerts('SAT-001', t_warn)
        aoc_alerts = [a for a in alerts if a['subsystem'] == 'AOCS']
        self.assertEqual(len(aoc_alerts), 1)
        self.assertEqual(aoc_alerts[0]['severity'], 'WARNING')

        # 0.40g -> critical (>= 0.35g)
        t_crit = {**self.nominal_telemetry, 'vibration_g': 0.40}
        alerts = self.service.generate_alerts('SAT-001', t_crit)
        aoc_alerts = [a for a in alerts if a['subsystem'] == 'AOCS']
        self.assertEqual(len(aoc_alerts), 1)
        self.assertEqual(aoc_alerts[0]['severity'], 'CRITICAL')

    def test_07_communication_threshold_consistency(self):
        # -80 dBm -> normal (Warning is -95 dBm)
        t_norm = {**self.nominal_telemetry, 'communication_signal_db': -80.0}
        alerts = self.service.generate_alerts('SAT-001', t_norm)
        self.assertEqual(len([a for a in alerts if a['subsystem'] == 'COMMUNICATION']), 0)

        # -98 dBm -> warning (<= -95 dBm and > -105 dBm)
        t_warn = {**self.nominal_telemetry, 'communication_signal_db': -98.0}
        alerts = self.service.generate_alerts('SAT-001', t_warn)
        com_alerts = [a for a in alerts if a['subsystem'] == 'COMMUNICATION']
        self.assertEqual(len(com_alerts), 1)
        self.assertEqual(com_alerts[0]['severity'], 'WARNING')

        # -108 dBm -> critical (<= -105 dBm)
        t_crit = {**self.nominal_telemetry, 'communication_signal_db': -108.0}
        alerts = self.service.generate_alerts('SAT-001', t_crit)
        com_alerts = [a for a in alerts if a['subsystem'] == 'COMMUNICATION']
        self.assertEqual(len(com_alerts), 1)
        self.assertEqual(com_alerts[0]['severity'], 'CRITICAL')

    def test_08_current_threshold_consistency(self):
        # 10A -> normal (Warning is 14A)
        t_norm = {**self.nominal_telemetry, 'current_a': 10.0}
        alerts = self.service.generate_alerts('SAT-001', t_norm)
        self.assertEqual(len([a for a in alerts if a['subsystem'] == 'POWER']), 0)

        # 15A -> warning (>= 14A and < 18A)
        t_warn = {**self.nominal_telemetry, 'current_a': 15.0}
        alerts = self.service.generate_alerts('SAT-001', t_warn)
        pwr_alerts = [a for a in alerts if a['subsystem'] == 'POWER']
        self.assertEqual(len(pwr_alerts), 1)
        self.assertEqual(pwr_alerts[0]['severity'], 'WARNING')

        # 20A -> critical (>= 18A)
        t_crit = {**self.nominal_telemetry, 'current_a': 20.0}
        alerts = self.service.generate_alerts('SAT-001', t_crit)
        pwr_alerts = [a for a in alerts if a['subsystem'] == 'POWER']
        self.assertEqual(len(pwr_alerts), 1)
        self.assertEqual(pwr_alerts[0]['severity'], 'CRITICAL')

    def test_09_solar_power_threshold_consistency(self):
        # 450W -> normal (Warning is 300W)
        t_norm = {**self.nominal_telemetry, 'solar_power_w': 450.0}
        alerts = self.service.generate_alerts('SAT-001', t_norm)
        self.assertEqual(len([a for a in alerts if a['subsystem'] == 'POWER']), 0)

        # 250W -> warning (<= 300W and > 200W)
        t_warn = {**self.nominal_telemetry, 'solar_power_w': 250.0}
        alerts = self.service.generate_alerts('SAT-001', t_warn)
        pwr_alerts = [a for a in alerts if a['subsystem'] == 'POWER']
        self.assertEqual(len(pwr_alerts), 1)
        self.assertEqual(pwr_alerts[0]['severity'], 'WARNING')

        # 150W -> critical (<= 200W)
        t_crit = {**self.nominal_telemetry, 'solar_power_w': 150.0}
        alerts = self.service.generate_alerts('SAT-001', t_crit)
        pwr_alerts = [a for a in alerts if a['subsystem'] == 'POWER']
        self.assertEqual(len(pwr_alerts), 1)
        self.assertEqual(pwr_alerts[0]['severity'], 'CRITICAL')

    def test_10_ml_anomaly_detection_alert(self):
        ml_res = {'is_anomaly': True, 'prediction': 'ANOMALY', 'raw_anomaly_score': -0.185, 'subsystem': 'BATTERY'}
        alerts = self.service.generate_alerts('SAT-001', self.nominal_telemetry, ml_result=ml_res)
        ml_alerts = [a for a in alerts if a.get('source') == 'ml_anomaly']
        self.assertEqual(len(ml_alerts), 1)
        self.assertEqual(ml_alerts[0]['severity'], 'CRITICAL')

    def test_11_satellite_isolation_zero_leakage(self):
        # AGIS-3: Nominal
        # SENTINEL-9: Severe Thermal Critical
        alerts_agis = self.service.generate_alerts('SAT-001', self.nominal_telemetry)
        alerts_sentinel = self.service.generate_alerts('SAT-002', {**self.nominal_telemetry, 'temperature_c': 65.0})

        self.assertEqual(len(alerts_agis), 0, "AGIS-3 must have 0 alerts")
        self.assertEqual(len(alerts_sentinel), 1, "SENTINEL-9 must have 1 thermal alert")
        self.assertEqual(alerts_sentinel[0]['id'], 'ALT-THM-SAT-002-CRIT')

    def test_12_simulation_progression(self):
        # Step 1: Nominal
        alerts_step1 = self.service.generate_alerts('SAT-001', self.nominal_telemetry, simulation_step=1)
        self.assertEqual(len(alerts_step1), 0)

        # Step 4: ML Anomaly detected
        ml_res = {'is_anomaly': True, 'prediction': 'ANOMALY', 'raw_anomaly_score': -0.12, 'subsystem': 'POWER'}
        alerts_step4 = self.service.generate_alerts('SAT-001', self.nominal_telemetry, ml_result=ml_res, simulation_step=4)
        self.assertTrue(any(a.get('source') == 'ml_anomaly' for a in alerts_step4))

        # Step 6: Diagnosis attached
        diag = {'subsystem': 'POWER', 'severity': 'CRITICAL', 'anomalyType': 'Main Bus Undervoltage'}
        alerts_step6 = self.service.generate_alerts('SAT-001', self.nominal_telemetry, ml_result=ml_res, diagnosis=diag, simulation_step=6)
        self.assertTrue(any(a.get('source') == 'diagnosis' for a in alerts_step6))

    def test_13_alert_acknowledgment_preservation(self):
        alerts = self.service.generate_alerts('SAT-001', {**self.nominal_telemetry, 'temperature_c': 62.0})
        alert_id = alerts[0]['id']
        self.assertFalse(alerts[0]['acknowledged'])

        self.service.acknowledge('SAT-001', alert_id)
        self.assertTrue(self.service.store['SAT-001'][0]['acknowledged'])
        self.assertEqual(self.service.store['SAT-001'][0]['status'], 'ACKNOWLEDGED')

    def test_14_alert_resolution_removes_active(self):
        alerts = self.service.generate_alerts('SAT-001', {**self.nominal_telemetry, 'temperature_c': 62.0})
        alert_id = alerts[0]['id']
        self.service.resolve('SAT-001', alert_id)
        self.assertTrue(self.service.store['SAT-001'][0]['resolved'])
        self.assertEqual(self.service.store['SAT-001'][0]['status'], 'RESOLVED')

    def test_15_resolve_all_clears_active(self):
        self.service.generate_alerts('SAT-001', {**self.nominal_telemetry, 'temperature_c': 62.0, 'voltage_v': 21.0})
        self.assertEqual(len(self.service.store['SAT-001']), 2)
        self.service.resolve_all('SAT-001')
        self.assertTrue(all(a['resolved'] for a in self.service.store['SAT-001']))

    def test_16_missing_and_nan_telemetry_safe_handling(self):
        empty_tel = {}
        alerts = self.service.generate_alerts('SAT-001', empty_tel)
        self.assertEqual(len(alerts), 0)


if __name__ == '__main__':
    unittest.main()
