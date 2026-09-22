"""
SATSHIELD ML Pipeline — Step 11: Real Early Warning & Predictive Maintenance Service

Provides deterministic, explainable, and scientifically honest early-warning risk
assessment and degradation trend estimation on live and historical spacecraft telemetry.

Key Capabilities:
1. Per-satellite isolated time-series telemetry history buffers.
2. Least-squares linear trend estimation (dX/dt) on active parameters.
3. Physics-based distance to operational thresholds.
4. Estimated Time to Operational Threshold: (Threshold - Current) / Trend Slope.
5. Strict guardrails: returns 'N/A — insufficient evidence' when trends are flat,
   observations are insufficient (<3 frames), or threshold is already crossed.
6. Multi-subsystem early warning and preventive operational recommendations.
"""

import math
from collections import deque
from typing import Dict, Any, List, Optional, Tuple

# Operational thresholds aligned with Step 10 Physical Ranges & Explainability
OPERATIONAL_THRESHOLDS = {
    'temperature_c': {
        'subsystem': 'THERMAL',
        'parameter': 'Core Internal Temperature',
        'unit': '°C',
        'nominal_range': (15.0, 45.0),
        'warning_threshold': 50.0,
        'critical_threshold': 60.0,
        'direction': 'UP',
        'min_slope_threshold': 0.05, # °C per sample/min
        'nominal_ref': 25.0
    },
    'voltage_v': {
        'subsystem': 'POWER',
        'parameter': 'EPS Main Bus Voltage',
        'unit': 'V',
        'nominal_range': (25.0, 30.0),
        'warning_threshold': 24.0,
        'critical_threshold': 22.5,
        'direction': 'DOWN',
        'min_slope_threshold': 0.05, # V per sample/min
        'nominal_ref': 28.2
    },
    'current_a': {
        'subsystem': 'POWER',
        'parameter': 'Power Bus Current Draw',
        'unit': 'A',
        'nominal_range': (2.0, 12.0),
        'warning_threshold': 14.0,
        'critical_threshold': 18.0,
        'direction': 'UP',
        'min_slope_threshold': 0.05, # A per sample/min
        'nominal_ref': 6.5
    },
    'battery_soc_percent': {
        'subsystem': 'BATTERY',
        'parameter': 'Battery State of Charge',
        'unit': '%',
        'nominal_range': (60.0, 100.0),
        'warning_threshold': 50.0,
        'critical_threshold': 35.0,
        'direction': 'DOWN',
        'min_slope_threshold': 0.10, # % per sample/min
        'nominal_ref': 88.0
    },
    'solar_power_w': {
        'subsystem': 'POWER',
        'parameter': 'Solar Array Power Generation',
        'unit': 'W',
        'nominal_range': (350.0, 800.0),
        'warning_threshold': 300.0,
        'critical_threshold': 200.0,
        'direction': 'DOWN',
        'min_slope_threshold': 1.0, # W per sample/min
        'nominal_ref': 650.0
    },
    'communication_signal_db': {
        'subsystem': 'COMMUNICATION',
        'parameter': 'RF Downlink Carrier Signal',
        'unit': 'dBm',
        'nominal_range': (-90.0, -50.0),
        'warning_threshold': -95.0,
        'critical_threshold': -105.0,
        'direction': 'DOWN',
        'min_slope_threshold': 0.10, # dBm per sample/min
        'nominal_ref': -75.0
    },
    'vibration_g': {
        'subsystem': 'ATTITUDE',
        'parameter': 'Structural Vibration Amplitude',
        'unit': 'g',
        'nominal_range': (0.01, 0.15),
        'warning_threshold': 0.20,
        'critical_threshold': 0.35,
        'direction': 'UP',
        'min_slope_threshold': 0.005, # g per sample/min
        'nominal_ref': 0.04
    },
    'attitude_error_deg': {
        'subsystem': 'ATTITUDE',
        'parameter': '3-Axis Pointing Deviation Error',
        'unit': '°',
        'nominal_range': (0.0, 0.5),
        'warning_threshold': 1.0,
        'critical_threshold': 2.5,
        'direction': 'UP',
        'min_slope_threshold': 0.02, # ° per sample/min
        'nominal_ref': 0.05
    }
}

MONITORED_PARAMETERS = list(OPERATIONAL_THRESHOLDS.keys())
MIN_HISTORY_FRAMES = 3


class SatellitePredictiveMaintenanceEngine:
    """
    Maintains telemetry history per satellite and computes deterministic
    time-to-threshold, trend slope, persistence, risk, and early warning.
    """

    def __init__(self, max_history: int = 30):
        self.max_history = max_history
        self.satellite_buffers: Dict[str, deque] = {}

    def _get_buffer(self, satellite_id: str) -> deque:
        sat_key = str(satellite_id).strip()
        if sat_key not in self.satellite_buffers:
            self.satellite_buffers[sat_key] = deque(maxlen=self.max_history)
        return self.satellite_buffers[sat_key]

    def reset_history(self, satellite_id: Optional[str] = None):
        """Clears buffer for a specific satellite or all satellites."""
        if satellite_id:
            sat_key = str(satellite_id).strip()
            if sat_key in self.satellite_buffers:
                self.satellite_buffers[sat_key].clear()
        else:
            self.satellite_buffers.clear()

    def record_telemetry(self, satellite_id: str, telemetry: Dict[str, Any]):
        """Appends a valid telemetry observation frame to the satellite's history buffer."""
        buffer = self._get_buffer(satellite_id)
        # Extract numerical values for monitored fields
        frame = {}
        for param in MONITORED_PARAMETERS:
            val = telemetry.get(param)
            if val is not None and isinstance(val, (int, float)) and not math.isnan(val) and not math.isinf(val):
                frame[param] = float(val)
        if frame:
            frame['timestamp'] = telemetry.get('timestamp')
            buffer.append(frame)

    @staticmethod
    def calculate_linear_slope(values: List[float]) -> float:
        """
        Calculates least-squares linear regression slope (dX/dt) over an index sequence.
        """
        n = len(values)
        if n < 2:
            return 0.0
        x_vals = list(range(n))
        x_mean = sum(x_vals) / n
        y_mean = sum(values) / n
        numerator = sum((x_vals[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x_vals[i] - x_mean) ** 2 for i in range(n))
        if denominator == 0:
            return 0.0
        return float(numerator / denominator)

    def analyze_parameter_trend(
        self,
        satellite_id: str,
        param_key: str,
        history_values: List[float]
    ) -> Dict[str, Any]:
        """
        Computes rate of change, threshold distance, estimated time to threshold,
        and trend direction for a single telemetry parameter.
        """
        meta = OPERATIONAL_THRESHOLDS[param_key]
        unit = meta['unit']
        direction = meta['direction']
        warning_thresh = meta['warning_threshold']
        critical_thresh = meta['critical_threshold']
        min_slope = meta['min_slope_threshold']
        nom_min, nom_max = meta['nominal_range']

        n = len(history_values)
        if n == 0:
            return {
                'parameter_key': param_key,
                'parameter': meta['parameter'],
                'subsystem': meta['subsystem'],
                'current_value': None,
                'unit': unit,
                'data_quality': 'INSUFFICIENT',
                'status': 'INSUFFICIENT_DATA',
                'trend_slope': 0.0,
                'trend_direction': 'UNKNOWN',
                'rate_of_change': 'N/A',
                'distance_to_threshold': None,
                'estimated_time_to_threshold': None,
                'estimated_time_formatted': 'N/A — insufficient evidence',
                'risk_level': 'NOMINAL',
                'early_warning': None
            }

        current_val = float(history_values[-1])
        r_mean = sum(history_values) / n
        r_std = math.sqrt(sum((v - r_mean) ** 2 for v in history_values) / n) if n > 1 else 0.0

        # Linear slope
        slope = self.calculate_linear_slope(history_values) if n >= 2 else 0.0
        
        # Acceleration (change in slope between earlier half and latter half)
        if n >= 4:
            mid = n // 2
            slope_early = self.calculate_linear_slope(history_values[:mid+1])
            slope_late = self.calculate_linear_slope(history_values[mid:])
            accel = slope_late - slope_early
        else:
            accel = 0.0

        # Baseline deviation from nominal reference
        dev_from_baseline = current_val - meta['nominal_ref']

        # Determine target threshold based on direction
        target_threshold = critical_thresh

        # Check if threshold is already crossed
        if direction == 'UP':
            is_already_critical = current_val >= critical_thresh
            is_already_warning = current_val >= warning_thresh
            dist_to_thresh = round(critical_thresh - current_val, 3)
            is_trending_toward = slope > min_slope
            trend_dir_str = "INCREASING" if slope > min_slope else ("DECREASING" if slope < -min_slope else "STABLE")
        else: # DOWN
            is_already_critical = current_val <= critical_thresh
            is_already_warning = current_val <= warning_thresh
            dist_to_thresh = round(current_val - critical_thresh, 3)
            is_trending_toward = slope < -min_slope
            trend_dir_str = "DECREASING" if slope < -min_slope else ("INCREASING" if slope > min_slope else "STABLE")

        # Persistence: count how many consecutive trailing frames exceed warning threshold
        persistence_count = 0
        for val in reversed(history_values):
            if direction == 'UP' and val >= warning_thresh:
                persistence_count += 1
            elif direction == 'DOWN' and val <= warning_thresh:
                persistence_count += 1
            else:
                break

        # Estimated Time to Operational Threshold calculation
        est_time_minutes: Optional[float] = None
        est_time_formatted = "N/A — insufficient evidence"

        if is_already_critical:
            est_time_formatted = "Critical threshold already exceeded"
        elif n < MIN_HISTORY_FRAMES:
            est_time_formatted = "N/A — insufficient evidence"
        elif is_trending_toward and abs(slope) >= min_slope and dist_to_thresh > 0:
            # Time (in sample units / minutes) = Distance / |Slope|
            time_val = dist_to_thresh / abs(slope)
            if time_val < 0.1:
                est_time_minutes = 0.1
                est_time_formatted = "< 1 min (imminent crossing)"
            elif time_val <= 600.0:
                est_time_minutes = round(time_val, 1)
                est_time_formatted = f"{est_time_minutes:.1f} min"
            else:
                est_time_minutes = round(time_val, 1)
                est_time_formatted = f"> {math.floor(time_val / 60)} hrs"
        else:
            if trend_dir_str == "STABLE":
                est_time_formatted = "N/A — stable nominal trend"
            else:
                est_time_formatted = "N/A — trend moving away from threshold"

        # Predictive Risk Categorization
        if is_already_critical:
            risk_level = 'CRITICAL'
            threshold_status = 'CRITICAL_EXCEEDED'
        elif is_already_warning or (is_trending_toward and est_time_minutes is not None and est_time_minutes <= 15.0):
            risk_level = 'HIGH'
            threshold_status = 'WARNING_EXCEEDED' if is_already_warning else 'THRESHOLD_APPROACHING'
        elif is_trending_toward and est_time_minutes is not None and est_time_minutes <= 60.0:
            risk_level = 'ELEVATED'
            threshold_status = 'DEGRADING_TREND'
        elif is_trending_toward or persistence_count > 0:
            risk_level = 'WATCH'
            threshold_status = 'MONITORING'
        else:
            risk_level = 'NOMINAL'
            threshold_status = 'STABLE'

        # Generate Early Warning statement if risk >= WATCH
        early_warning = None
        if risk_level in ['ELEVATED', 'HIGH', 'CRITICAL']:
            if param_key == 'temperature_c':
                early_warning = f"Thermal margin decreasing: Temperature trending at {slope:+.2f}°C/min toward {critical_thresh:.1f}°C threshold."
            elif param_key in ['voltage_v', 'current_a', 'solar_power_w']:
                early_warning = f"Power margin degradation: {meta['parameter']} trending toward operational boundary (slope: {slope:+.2f} {unit}/min)."
            elif param_key == 'battery_soc_percent':
                early_warning = f"Battery capacity depleting: State of charge trending at {slope:+.2f}%/min while bus loads persist."
            elif param_key == 'communication_signal_db':
                early_warning = f"RF downlink attenuation: Signal fading at {slope:+.2f} dBm/min toward {critical_thresh:.1f} dBm floor."
            elif param_key in ['attitude_error_deg', 'vibration_g']:
                early_warning = f"Attitude pointing drift: Pointing error increasing at {slope:+.3f} {unit}/min."
        elif risk_level == 'WATCH':
            early_warning = f"Parameter {meta['parameter']} exhibiting minor drift (slope: {slope:+.3f} {unit}/min)."

        return {
            'parameter_key': param_key,
            'parameter': meta['parameter'],
            'subsystem': meta['subsystem'],
            'current_value': current_val,
            'unit': unit,
            'nominal_range': f"{nom_min} - {nom_max} {unit}",
            'warning_threshold': warning_thresh,
            'critical_threshold': critical_thresh,
            'distance_to_threshold': dist_to_thresh,
            'trend_slope': round(slope, 4),
            'trend_slope_formatted': f"{slope:+.3f} {unit}/min",
            'trend_direction': trend_dir_str,
            'acceleration': round(accel, 4),
            'rolling_mean': round(r_mean, 3),
            'rolling_std': round(r_std, 3),
            'baseline_deviation': round(dev_from_baseline, 3),
            'persistence_count': persistence_count,
            'estimated_time_to_threshold': est_time_minutes,
            'estimated_time_formatted': est_time_formatted,
            'threshold_status': threshold_status,
            'risk_level': risk_level,
            'early_warning': early_warning,
            'data_quality': 'GOOD'
        }

    def analyze(
        self,
        satellite_id: str,
        current_telemetry: Dict[str, Any],
        sequence_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Performs end-to-end predictive maintenance analysis for the specified satellite.
        """
        sat_id = str(satellite_id or current_telemetry.get('satellite_id', 'SAT-001')).strip()

        # Update satellite history buffer
        if sequence_history and len(sequence_history) >= MIN_HISTORY_FRAMES:
            # Explicit sequence provided (e.g. from simulation or batch test)
            buffer_frames = sequence_history
        else:
            self.record_telemetry(sat_id, current_telemetry)
            buffer = self._get_buffer(sat_id)
            buffer_frames = list(buffer)

        # Check for insufficient telemetry history
        if len(buffer_frames) < MIN_HISTORY_FRAMES:
            # Fallback report for insufficient history
            return {
                'satellite_id': sat_id,
                'status': 'INSUFFICIENT_DATA',
                'risk_level': 'NOMINAL',
                'overall_trend': 'STABLE',
                'early_warning': 'NOMINAL — No significant degrading trend detected (insufficient historical telemetry).',
                'early_warning_active': False,
                'estimated_time_to_threshold': None,
                'estimated_time_formatted': 'N/A — Insufficient historical telemetry for predictive assessment.',
                'primary_affected_parameter': 'N/A',
                'subsystem': 'SYSTEM',
                'parameter_trends': {},
                'data_quality': 'INSUFFICIENT',
                'prediction_method': 'Trend-based temporal projection',
                'recommended_action': 'Collect additional consecutive telemetry frames to establish baseline trend projection.',
                'disclaimer': 'Synthetic / simulated telemetry — demonstration and validation dataset.'
            }

        # Analyze each monitored parameter
        param_reports: Dict[str, Dict[str, Any]] = {}
        highest_risk_param = None
        highest_risk_rank = -1
        risk_rank_map = {'NOMINAL': 0, 'WATCH': 1, 'ELEVATED': 2, 'HIGH': 3, 'CRITICAL': 4}

        for param in MONITORED_PARAMETERS:
            # Extract series for this parameter across history
            series = [
                float(f[param]) for f in buffer_frames
                if param in f and isinstance(f[param], (int, float)) and not math.isnan(f[param]) and not math.isinf(f[param])
            ]
            if series:
                rep = self.analyze_parameter_trend(sat_id, param, series)
                param_reports[param] = rep
                rank = risk_rank_map.get(rep['risk_level'], 0)
                if rank > highest_risk_rank:
                    highest_risk_rank = rank
                    highest_risk_param = rep

        # Overall satellite predictive status
        if not highest_risk_param or highest_risk_rank == 0:
            overall_risk = 'NOMINAL'
            overall_trend = 'STABLE'
            early_warning = 'NOMINAL — No significant degrading trend detected across monitored parameters.'
            early_warning_active = False
            rec_action = 'Maintain routine orbital tracking and standard telemetry health sampling schedule.'
            primary_param = 'All Parameters Nominal'
            primary_subsystem = 'SYSTEM'
            est_time = None
            est_time_formatted = 'N/A — stable nominal trend'
        else:
            overall_risk = highest_risk_param['risk_level']
            overall_trend = highest_risk_param['trend_direction']
            early_warning = highest_risk_param['early_warning'] or f"Trend-based risk detected in {highest_risk_param['parameter']}."
            early_warning_active = overall_risk in ['ELEVATED', 'HIGH', 'CRITICAL']
            primary_param = highest_risk_param['parameter']
            primary_subsystem = highest_risk_param['subsystem']
            est_time = highest_risk_param['estimated_time_to_threshold']
            est_time_formatted = highest_risk_param['estimated_time_formatted']

            # Subsystem-specific preventive recommendation
            rec_action = self._generate_preventive_action(primary_subsystem, highest_risk_param)

        return {
            'satellite_id': sat_id,
            'status': highest_risk_param['threshold_status'] if highest_risk_param else 'STABLE',
            'risk_level': overall_risk,
            'overall_trend': overall_trend,
            'early_warning': early_warning,
            'early_warning_active': early_warning_active,
            'estimated_time_to_threshold': est_time,
            'estimated_time_formatted': est_time_formatted,
            'primary_affected_parameter': primary_param,
            'primary_affected_key': highest_risk_param['parameter_key'] if highest_risk_param else None,
            'current_value': highest_risk_param['current_value'] if highest_risk_param else None,
            'reference_threshold': highest_risk_param['critical_threshold'] if highest_risk_param else None,
            'distance_to_threshold': highest_risk_param['distance_to_threshold'] if highest_risk_param else None,
            'trend_slope': highest_risk_param['trend_slope'] if highest_risk_param else 0.0,
            'trend_slope_formatted': highest_risk_param['trend_slope_formatted'] if highest_risk_param else '0.000 /min',
            'subsystem': primary_subsystem,
            'parameter_trends': param_reports,
            'data_quality': 'GOOD',
            'prediction_method': 'Trend-based temporal projection',
            'recommended_action': rec_action,
            'disclaimer': 'Synthetic / simulated telemetry — demonstration and validation dataset.'
        }

    @staticmethod
    def _generate_preventive_action(subsystem: str, param_rep: Dict[str, Any]) -> str:
        """Generates proactive preventive recommendations based on the affected subsystem."""
        sub = subsystem.upper()
        if sub == 'THERMAL':
            return "Inspect thermal subsystem load, verify radiator heat-pipe performance, review heater duty cycles, and prepare attitude solar-offset maneuver if temperature slope persists."
        elif sub == 'BATTERY':
            return "Evaluate non-essential payload load shedding, inspect battery charge regulator current balance, and verify solar array illumination profile before next eclipse transit."
        elif sub == 'POWER':
            return "Inspect EPS distribution bus current draw, verify secondary voltage regulator margins, and shed non-critical auxiliary loads."
        elif sub == 'COMMUNICATION':
            return "Inspect RF transmitter carrier power, review ground-station elevation and link geometry, and verify high-gain antenna boresight alignment."
        elif sub == 'ATTITUDE':
            return "Review reaction wheel spin rates and angular momentum envelope, command magnetic torquer desaturation sequence, and verify star tracker optical lock."
        return "Inspect telemetry trends and maintain standard operator monitoring."


# Global Singleton Instance
_predictive_engine = SatellitePredictiveMaintenanceEngine()

def get_predictive_engine() -> SatellitePredictiveMaintenanceEngine:
    return _predictive_engine

def analyze_predictive_maintenance(
    satellite_id: str,
    current_telemetry: Dict[str, Any],
    sequence_history: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """Public wrapper for predictive maintenance analysis."""
    return _predictive_engine.analyze(satellite_id, current_telemetry, sequence_history)
