"""
SATSHIELD ML Pipeline — Step 27: Real What-If / Scenario Analysis Service

Provides deterministic, explainable, and scientifically honest What-If scenario
projections on live and historical spacecraft telemetry based on physical trends,
operational thresholds, and multi-parameter compounding effects.

Principles & Safeguards:
1. Deterministic linear projection: projected_value = current_value + slope * time
2. Grounded in actual measured slopes from telemetry history buffer (never random).
3. Evaluates multi-parameter interactions (Thermal+Current, Voltage+Current, SOC+Solar, RF, Attitude).
4. Threshold already crossed detection: returns 'Threshold already crossed' without negative time.
5. Strict guardrails: returns 'N/A — insufficient evidence' when data is flat, sparse (<3 frames), or invalid.
6. Discrete risk categorization: NOMINAL, WATCH, ELEVATED, HIGH, CRITICAL.
7. Decision-support only — zero autonomous command authority.
"""

import math
from typing import Dict, Any, List, Optional, Tuple
from satshield_ml.predictive_maintenance import (
    OPERATIONAL_THRESHOLDS,
    MONITORED_PARAMETERS,
    MIN_HISTORY_FRAMES,
    get_predictive_engine,
    SatellitePredictiveMaintenanceEngine
)

# Parameter alias mapping for natural query flexibility
PARAM_ALIAS_MAP = {
    'temp': 'temperature_c',
    'temperature': 'temperature_c',
    'temperature_c': 'temperature_c',
    'thermal': 'temperature_c',
    'battery_temp': 'temperature_c',
    
    'voltage': 'voltage_v',
    'voltage_v': 'voltage_v',
    'bus_voltage': 'voltage_v',
    'eps_voltage': 'voltage_v',
    
    'current': 'current_a',
    'current_a': 'current_a',
    'current_draw': 'current_a',
    'bus_current': 'current_a',
    
    'soc': 'battery_soc_percent',
    'battery_soc': 'battery_soc_percent',
    'battery_soc_percent': 'battery_soc_percent',
    'battery': 'battery_soc_percent',
    
    'solar': 'solar_power_w',
    'solar_power': 'solar_power_w',
    'solar_power_w': 'solar_power_w',
    
    'signal': 'communication_signal_db',
    'signal_dbm': 'communication_signal_db',
    'comm': 'communication_signal_db',
    'communication': 'communication_signal_db',
    'communication_signal_db': 'communication_signal_db',
    'rf': 'communication_signal_db',
    
    'vibration': 'vibration_g',
    'vibration_g': 'vibration_g',
    
    'attitude': 'attitude_error_deg',
    'attitude_error': 'attitude_error_deg',
    'attitude_error_deg': 'attitude_error_deg',
    'pointing': 'attitude_error_deg',
    'gyro': 'attitude_error_deg'
}


class WhatIfScenarioEngine:
    """
    Deterministic What-If Scenario Analysis Engine for SATSHIELD.
    """

    def __init__(self, predictive_engine: Optional[SatellitePredictiveMaintenanceEngine] = None):
        self.predictive_engine = predictive_engine or get_predictive_engine()

    @staticmethod
    def resolve_param_key(param_name: Optional[str]) -> Optional[str]:
        if not param_name:
            return None
        cleaned = str(param_name).strip().lower()
        return PARAM_ALIAS_MAP.get(cleaned, cleaned if cleaned in OPERATIONAL_THRESHOLDS else None)

    def analyze_scenario(
        self,
        satellite_id: str,
        parameter: Optional[str] = None,
        current_telemetry: Optional[Dict[str, Any]] = None,
        sequence_history: Optional[List[Dict[str, Any]]] = None,
        projection_horizon_minutes: float = 10.0,
        scenario_multiplier: float = 1.0
    ) -> Dict[str, Any]:
        """
        Runs deterministic What-If scenario projection for a given satellite and parameter
        (or automatically identifies the primary degrading parameter).
        """
        sat_id = str(satellite_id or 'SAT-001').strip()
        current_tel = dict(current_telemetry) if current_telemetry else {}

        # Check existing buffer in predictive engine
        buf = self.predictive_engine._get_buffer(sat_id)
        has_history = (sequence_history is not None and len(sequence_history) >= MIN_HISTORY_FRAMES) or len(buf) >= MIN_HISTORY_FRAMES

        # If current_tel is empty but sequence_history or buffer is available, use latest frame
        if not current_tel:
            if sequence_history and len(sequence_history) > 0:
                current_tel = dict(sequence_history[-1])
            elif len(buf) > 0:
                current_tel = dict(buf[-1])

        # Validate telemetry values (check for NaN / Inf)
        has_valid_channel = False
        for k, v in current_tel.items():
            if isinstance(v, (int, float)) and not math.isnan(v) and not math.isinf(v):
                has_valid_channel = True
                break

        if not has_valid_channel and not has_history:
            return self._insufficient_evidence_response(
                sat_id, parameter, "N/A — Insufficient or invalid telemetry evidence."
            )

        # Retrieve predictive maintenance report & history
        pred_report = self.predictive_engine.analyze(
            sat_id, current_tel, sequence_history=sequence_history
        )

        param_key = self.resolve_param_key(parameter)
        
        # If no specific parameter requested, select primary affected parameter from predictive report
        if not param_key:
            param_key = pred_report.get('primary_affected_key')
            if not param_key or param_key not in OPERATIONAL_THRESHOLDS:
                # Default to temperature_c if all nominal
                param_key = 'temperature_c'

        meta = OPERATIONAL_THRESHOLDS[param_key]
        param_label = meta['parameter']
        subsystem = meta['subsystem']
        unit = meta['unit']
        crit_thresh = meta['critical_threshold']
        warn_thresh = meta['warning_threshold']
        direction = meta['direction']
        min_slope = meta['min_slope_threshold']

        param_trends = pred_report.get('parameter_trends', {})
        param_info = param_trends.get(param_key)

        # Check if insufficient data
        if not param_info or pred_report.get('status') == 'INSUFFICIENT_DATA' or param_info.get('data_quality') == 'INSUFFICIENT':
            return self._insufficient_evidence_response(
                sat_id, param_label, "N/A — Insufficient telemetry history to construct deterministic projection."
            )

        current_val = param_info.get('current_value')
        if current_val is None or math.isnan(current_val) or math.isinf(current_val):
            return self._insufficient_evidence_response(
                sat_id, param_label, "N/A — Telemetry value unavailable or non-physical."
            )

        measured_slope = float(param_info.get('trend_slope', 0.0))
        effective_slope = measured_slope * max(0.1, min(5.0, scenario_multiplier))
        trend_direction = param_info.get('trend_direction', 'STABLE')
        current_risk = param_info.get('risk_level', 'NOMINAL')
        dist_to_thresh = param_info.get('distance_to_threshold')
        est_time_to_thresh = param_info.get('estimated_time_to_threshold')
        est_time_formatted = param_info.get('estimated_time_formatted', 'N/A')

        # Check if threshold is already crossed
        is_already_crossed = False
        if direction == 'UP' and current_val >= crit_thresh:
            is_already_crossed = True
        elif direction == 'DOWN' and current_val <= crit_thresh:
            is_already_crossed = True

        if is_already_crossed:
            return {
                'satellite_id': sat_id,
                'parameter': param_label,
                'parameter_key': param_key,
                'subsystem': subsystem,
                'current_value': round(current_val, 2),
                'unit': unit,
                'trend_slope': round(measured_slope, 4),
                'trend_slope_formatted': f"{measured_slope:+.3f} {unit}/min",
                'trend_direction': trend_direction,
                'operational_threshold': crit_thresh,
                'warning_threshold': warn_thresh,
                'projected_value': round(current_val, 2),
                'projection_horizon_minutes': projection_horizon_minutes,
                'estimated_time_to_threshold': None,
                'estimated_time_formatted': 'Critical threshold already crossed',
                'current_risk': 'CRITICAL',
                'projected_risk': 'CRITICAL',
                'scenario_status': 'THRESHOLD_ALREADY_CROSSED',
                'explanation': f"{param_label} ({current_val:.2f} {unit}) has already breached the operational limit of {crit_thresh:.1f} {unit}.",
                'impact': f"Immediate flight intervention required to arrest {subsystem} degradation.",
                'recommended_action': pred_report.get('recommended_action', 'Execute emergency procedure for threshold violation.'),
                'multi_parameter_assessment': self._evaluate_multi_parameter(sat_id, current_tel, param_trends),
                'prediction_method': 'Trend-based temporal projection',
                'data_quality': 'GOOD',
                'disclaimer': 'Synthetic / simulated telemetry — demonstration and validation dataset.'
            }

        # Check if trend is flat or moving away from threshold
        is_trending_toward = False
        if direction == 'UP' and effective_slope > min_slope:
            is_trending_toward = True
        elif direction == 'DOWN' and effective_slope < -min_slope:
            is_trending_toward = True

        # Calculate projected value: current + slope * horizon
        projected_val = current_val + (effective_slope * projection_horizon_minutes)

        # Clamp physically (e.g. SOC cannot go below 0% or above 100%, Solar power >= 0)
        if param_key == 'battery_soc_percent':
            projected_val = max(0.0, min(100.0, projected_val))
        elif param_key in ['solar_power_w', 'current_a', 'vibration_g', 'attitude_error_deg']:
            projected_val = max(0.0, projected_val)

        # Determine Projected Risk
        projected_risk = self._calculate_projected_risk(
            param_key, projected_val, is_trending_toward, est_time_to_thresh
        )

        # Multi-parameter cross evaluation
        multi_param_eval = self._evaluate_multi_parameter(sat_id, current_tel, param_trends)

        # If multi-parameter compounding is severe, elevate projected risk if appropriate
        if multi_param_eval.get('compounding_risk') == 'CRITICAL' and projected_risk in ['NOMINAL', 'WATCH', 'ELEVATED']:
            projected_risk = 'HIGH'

        # Generate scenario explanation & why
        if not is_trending_toward:
            scenario_status = 'STABLE_OR_RECOVERING'
            explanation = f"If the current trend continues, {param_label} is projected to remain stable ({projected_val:.2f} {unit} at T+{projection_horizon_minutes:.0f}m) within nominal flight envelope."
            impact = "Subsystem operations remain unimpaired under current trend baseline."
            rec_action = "Maintain routine orbital tracking and standard telemetry health sampling schedule."
        else:
            scenario_status = 'DEGRADING_TREND'
            explanation = (
                f"If the current {param_label.lower()} trend persists ({effective_slope:+.3f} {unit}/min), "
                f"value is projected to reach {projected_val:.2f} {unit} in {projection_horizon_minutes:.0f} minutes "
                f"(Threshold: {crit_thresh:.1f} {unit}, Margin: {abs(crit_thresh - projected_val):.2f} {unit})."
            )
            impact = self._generate_subsystem_impact(subsystem, projected_risk)
            rec_action = pred_report.get('recommended_action', 'Review subsystem operating state and prepare preventative load shedding.')

        return {
            'satellite_id': sat_id,
            'parameter': param_label,
            'parameter_key': param_key,
            'subsystem': subsystem,
            'current_value': round(current_val, 2),
            'unit': unit,
            'trend_slope': round(measured_slope, 4),
            'trend_slope_formatted': f"{measured_slope:+.3f} {unit}/min",
            'trend_direction': trend_direction,
            'operational_threshold': crit_thresh,
            'warning_threshold': warn_thresh,
            'projected_value': round(projected_val, 2),
            'projection_horizon_minutes': projection_horizon_minutes,
            'estimated_time_to_threshold': est_time_to_thresh,
            'estimated_time_formatted': est_time_formatted,
            'current_risk': current_risk,
            'projected_risk': projected_risk,
            'scenario_status': scenario_status,
            'explanation': explanation,
            'impact': impact,
            'recommended_action': rec_action,
            'multi_parameter_assessment': multi_param_eval,
            'prediction_method': 'Trend-based temporal projection',
            'data_quality': 'GOOD',
            'disclaimer': 'Synthetic / simulated telemetry — demonstration and validation dataset.'
        }

    def _calculate_projected_risk(
        self,
        param_key: str,
        projected_val: float,
        is_trending_toward: bool,
        est_time_to_thresh: Optional[float]
    ) -> str:
        meta = OPERATIONAL_THRESHOLDS[param_key]
        crit_thresh = meta['critical_threshold']
        warn_thresh = meta['warning_threshold']
        direction = meta['direction']

        if direction == 'UP':
            if projected_val >= crit_thresh:
                return 'CRITICAL'
            if projected_val >= warn_thresh:
                return 'HIGH'
        else: # DOWN
            if projected_val <= crit_thresh:
                return 'CRITICAL'
            if projected_val <= warn_thresh:
                return 'HIGH'

        if is_trending_toward:
            if est_time_to_thresh is not None and est_time_to_thresh <= 30.0:
                return 'HIGH'
            elif est_time_to_thresh is not None and est_time_to_thresh <= 60.0:
                return 'ELEVATED'
            return 'WATCH'

        return 'NOMINAL'

    @staticmethod
    def _generate_subsystem_impact(subsystem: str, projected_risk: str) -> str:
        sub = subsystem.upper()
        if projected_risk in ['HIGH', 'CRITICAL']:
            if sub == 'THERMAL':
                return "Thermal margin depletion risks core electronics overheating and accelerated component degradation."
            elif sub == 'POWER':
                return "Bus voltage collapse risks spacecraft brownout and unintended payload computer reboot."
            elif sub == 'BATTERY':
                return "Deep battery discharge risks permanent cell capacity loss and uncommanded safe-hold entry."
            elif sub == 'COMMUNICATION':
                return "Downlink margin loss risks telemetry lock loss and loss of mission data downlink."
            elif sub == 'ATTITUDE':
                return "Pointing error growth risks antenna mispointing and solar array power shortfall."
        return "Minor operational margin reduction; subsystem remains within controllable limits."

    @staticmethod
    def _evaluate_multi_parameter(
        satellite_id: str,
        current_tel: Dict[str, Any],
        param_trends: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluates coupled physical interactions across multiple telemetry channels:
        - Thermal + Current (Thermal Runaway / Overload)
        - Voltage + Current (Power Bus Overdraw)
        - Battery SOC + Solar Power (Power Generation Deficit)
        - RF Signal + Comm (Downlink Attenuation)
        - Pointing Error + Vibration (ADCS Stability Loss)
        """
        findings = []
        compounding_risk = 'NOMINAL'

        # 1. Thermal + Current
        temp_val = current_tel.get('temperature_c', current_tel.get('battery_temp', 25.0))
        curr_val = current_tel.get('current_a', current_tel.get('current_draw', 6.5))
        if isinstance(temp_val, (int, float)) and isinstance(curr_val, (int, float)):
            if temp_val >= 50.0 and curr_val >= 14.0:
                findings.append("Coupled Thermal-Power Stress: High core temperature (>50°C) with elevated current draw (>14A).")
                compounding_risk = 'CRITICAL'
            elif temp_val >= 45.0 and curr_val >= 12.0:
                findings.append("Elevated Thermal Load: Temperature and bus current concurrently above nominal baseline.")
                compounding_risk = 'HIGH' if compounding_risk != 'CRITICAL' else compounding_risk

        # 2. Voltage + Current
        volt_val = current_tel.get('voltage_v', current_tel.get('bus_voltage', 28.2))
        if isinstance(volt_val, (int, float)) and isinstance(curr_val, (int, float)):
            if volt_val <= 24.0 and curr_val >= 14.0:
                findings.append("EPS Bus Sag: Main bus voltage falling while current draw remains high.")
                compounding_risk = 'CRITICAL'

        # 3. SOC + Solar Power
        soc_val = current_tel.get('battery_soc_percent', current_tel.get('battery_soc', 88.0))
        solar_val = current_tel.get('solar_power_w', current_tel.get('solar_power', 650.0))
        if isinstance(soc_val, (int, float)) and isinstance(solar_val, (int, float)):
            if soc_val <= 50.0 and solar_val <= 300.0:
                findings.append("Energy Balance Deficit: Battery SOC depleting with substandard solar generation.")
                compounding_risk = 'CRITICAL' if compounding_risk != 'CRITICAL' else compounding_risk

        # 4. RF Signal
        sig_val = current_tel.get('communication_signal_db', current_tel.get('signal_dbm', -75.0))
        if isinstance(sig_val, (int, float)) and sig_val <= -95.0:
            findings.append("RF Link Marginality: Downlink carrier signal approaching demodulation threshold.")
            if compounding_risk not in ['HIGH', 'CRITICAL']:
                compounding_risk = 'ELEVATED'

        # 5. Pointing + Vibration
        att_val = current_tel.get('attitude_error_deg', current_tel.get('gyro_drift', 0.05))
        vib_val = current_tel.get('vibration_g', current_tel.get('vibration', 0.04))
        if isinstance(att_val, (int, float)) and isinstance(vib_val, (int, float)):
            if att_val >= 1.0 or vib_val >= 0.20:
                findings.append("Attitude Perturbation: Pointing deviation or mechanical vibration exceeding nominal tolerances.")
                if compounding_risk not in ['HIGH', 'CRITICAL']:
                    compounding_risk = 'ELEVATED'

        if not findings:
            return {
                'status': 'NOMINAL',
                'compounding_risk': 'NOMINAL',
                'summary': 'All monitored multi-parameter cross-couplings operating within nominal bounds.',
                'interactions': []
            }

        return {
            'status': 'ACTIVE_INTERACTION',
            'compounding_risk': compounding_risk,
            'summary': f"Identified {len(findings)} multi-parameter operational interaction(s).",
            'interactions': findings
        }

    @staticmethod
    def _insufficient_evidence_response(satellite_id: str, parameter: Optional[str], reason: str) -> Dict[str, Any]:
        return {
            'satellite_id': satellite_id,
            'parameter': parameter or 'Telemetry Parameter',
            'parameter_key': 'UNKNOWN',
            'subsystem': 'SYSTEM',
            'current_value': None,
            'unit': 'N/A',
            'trend_slope': 0.0,
            'trend_slope_formatted': '0.000 /min',
            'trend_direction': 'UNKNOWN',
            'operational_threshold': None,
            'warning_threshold': None,
            'projected_value': None,
            'projection_horizon_minutes': 10.0,
            'estimated_time_to_threshold': None,
            'estimated_time_formatted': 'N/A — insufficient evidence',
            'current_risk': 'NOMINAL',
            'projected_risk': 'NOMINAL',
            'scenario_status': 'INSUFFICIENT_DATA',
            'explanation': reason,
            'impact': 'N/A — Insufficient evidence to evaluate future scenario impact.',
            'recommended_action': 'Collect additional consecutive telemetry frames to establish a baseline trend projection.',
            'multi_parameter_assessment': {
                'status': 'INSUFFICIENT_DATA',
                'compounding_risk': 'NOMINAL',
                'summary': 'N/A — insufficient evidence for multi-signal assessment.',
                'interactions': []
            },
            'prediction_method': 'Trend-based temporal projection',
            'data_quality': 'INSUFFICIENT',
            'disclaimer': 'Synthetic / simulated telemetry — demonstration and validation dataset.'
        }


# Global Singleton Instance
_what_if_engine = WhatIfScenarioEngine()

def get_what_if_engine() -> WhatIfScenarioEngine:
    return _what_if_engine

def analyze_what_if(
    satellite_id: str,
    parameter: Optional[str] = None,
    current_telemetry: Optional[Dict[str, Any]] = None,
    sequence_history: Optional[List[Dict[str, Any]]] = None,
    projection_horizon_minutes: float = 10.0,
    scenario_multiplier: float = 1.0
) -> Dict[str, Any]:
    """Public wrapper for What-If scenario analysis."""
    return _what_if_engine.analyze_scenario(
        satellite_id=satellite_id,
        parameter=parameter,
        current_telemetry=current_telemetry,
        sequence_history=sequence_history,
        projection_horizon_minutes=projection_horizon_minutes,
        scenario_multiplier=scenario_multiplier
    )
