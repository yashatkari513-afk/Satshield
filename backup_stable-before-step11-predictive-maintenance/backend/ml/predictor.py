"""
Real Early Anomaly Prediction and Telemetry Trend Analysis Engine
Analyzes time-series sequences of satellite telemetry to detect early drift, rate of change,
rolling volatility, and compute multivariate early risk scores.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

class EarlyAnomalyPredictor:
    """
    Temporal Trend Analyzer & Early Risk Predictor for Satellite Telemetry.
    Combines rolling time-series statistics, linear drift velocities, run-length persistence,
    and Isolation Forest ML scoring to forecast subsystem degradation before catastrophic failure.
    """

    DEFAULT_MODEL_PATH = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'models',
        'isolation_forest_model.joblib'
    )

    FEATURE_NAMES = [
        'battery_voltage',
        'battery_current',
        'temperature',
        'solar_power',
        'communication_signal'
    ]

    MIN_HISTORY_REQUIRED = 3

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or self.DEFAULT_MODEL_PATH
        self.model = None
        self.scaler = None
        self.baseline_stats = {}
        self.metadata = {}
        self._load_model()

    def _load_model(self):
        """Loads model and baseline distribution statistics from saved joblib artifact."""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model artifact not found at {self.model_path}")
        
        artifact = joblib.load(self.model_path)
        self.model = artifact['model']
        self.scaler = artifact['scaler']
        self.baseline_stats = artifact['baseline_stats']
        self.metadata = artifact.get('metadata', {})
        self.artifact_feature_names = artifact.get('feature_names', list(self.baseline_stats.keys()))

    def _calculate_linear_slope(self, series: np.ndarray) -> float:
        """Calculates linear regression slope (rate of change per time step)."""
        n = len(series)
        if n < 2:
            return 0.0
        x = np.arange(n)
        # Using least squares slope: cov(x, y) / var(x)
        x_mean = np.mean(x)
        y_mean = np.mean(y) if 'y' in locals() else np.mean(series)
        slope = np.sum((x - x_mean) * (series - y_mean)) / np.sum((x - x_mean) ** 2)
        return float(slope)

    def analyze_sequence(self, telemetry_sequence: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes a sequence of historical telemetry frames.
        
        Parameters:
            telemetry_sequence: Ordered list of telemetry dicts (oldest to newest).
            
        Returns:
            dict containing risk_level, risk_score, overall_trend, parameter_trends, evidence.
        """
        num_frames = len(telemetry_sequence)

        # 1. Check for insufficient historical data
        if num_frames < self.MIN_HISTORY_REQUIRED:
            return {
                'status': 'unknown',
                'risk_level': 'INSUFFICIENT_DATA',
                'risk_score': 0.0,
                'overall_trend': 'UNKNOWN',
                'parameter_trends': [],
                'affected_parameters': [],
                'evidence': [
                    f"Insufficient historical data: received {num_frames} frames (minimum {self.MIN_HISTORY_REQUIRED} required for temporal trend analysis)."
                ],
                'isolation_forest_score': None,
                'sample_count': num_frames,
                'model': 'TemporalTrendAnalyzer + IsolationForest'
            }

        # 2. Extract DataFrame
        rows = []
        for frame in telemetry_sequence:
            row = {}
            for feat in self.FEATURE_NAMES:
                if feat not in frame:
                    raise ValueError(f"Telemetry frame missing feature: '{feat}'")
                row[feat] = float(frame[feat])
            rows.append(row)

        df = pd.DataFrame(rows)
        latest_frame = rows[-1]

        # 3. Compute per-parameter temporal features
        param_trends = []
        affected_params = []
        evidence_list = []
        param_risk_contributions = []

        degrading_param_count = 0
        accelerating_param_count = 0

        for feat in self.FEATURE_NAMES:
            series = df[feat].values
            stats = self.baseline_stats.get(feat, {})
            b_mean = stats.get('mean', float(np.mean(series)))
            b_std = stats.get('std', float(np.std(series))) or 1.0
            p01 = stats.get('p01', b_mean - 3 * b_std)
            p99 = stats.get('p99', b_mean + 3 * b_std)

            latest_val = float(series[-1])
            rolling_mean = float(np.mean(series))
            rolling_std = float(np.std(series)) if len(series) > 1 else 0.0
            slope = self._calculate_linear_slope(series)
            z_score = float((latest_val - b_mean) / b_std)

            # Check consecutive out-of-bounds readings from tail
            consecutive_abnormal = 0
            for val in reversed(series):
                if val < p01 or val > p99 or abs((val - b_mean) / b_std) >= 2.0:
                    consecutive_abnormal += 1
                else:
                    break

            # Determine degradation behavior per metric
            is_degrading = False
            trend_dir = "STABLE"
            
            # Metric specific degradation rules
            if feat == 'battery_voltage':
                if slope <= -0.05 or z_score < -1.8:
                    is_degrading = True
                    trend_dir = "DEGRADING_DOWN" if slope < 0 else "DEVIATED_LOW"
            elif feat == 'battery_current':
                if slope >= 0.25 or z_score > 1.8:
                    is_degrading = True
                    trend_dir = "SURGING_UP" if slope > 0 else "ELEVATED_HIGH"
            elif feat == 'temperature':
                if slope >= 0.35 or z_score > 1.8:
                    is_degrading = True
                    trend_dir = "HEATING_UP" if slope > 0 else "ELEVATED_HIGH"
            elif feat == 'solar_power':
                if slope <= -10.0 or z_score < -1.8:
                    is_degrading = True
                    trend_dir = "DECAYING_DOWN" if slope < 0 else "DEGRADED_LOW"
            elif feat == 'communication_signal':
                if slope <= -0.6 or z_score < -1.8:
                    is_degrading = True
                    trend_dir = "FADING_DOWN" if slope < 0 else "WEAK_SIGNAL"

            # Check if accelerating degradation
            if is_degrading:
                degrading_param_count += 1
                affected_params.append(feat)
                if abs(slope / b_std) > 0.4:
                    accelerating_param_count += 1

            # Sub-risk score for this parameter (0.0 to 1.0)
            z_severity = min(1.0, max(0.0, (abs(z_score) - 1.0) / 4.0)) if abs(z_score) > 1.0 else 0.0
            slope_severity = min(1.0, max(0.0, abs(slope / b_std) * 0.8))
            persistence_severity = min(1.0, consecutive_abnormal / num_frames)
            
            param_risk = 0.45 * z_severity + 0.35 * slope_severity + 0.20 * persistence_severity
            param_risk_contributions.append(param_risk)

            param_trends.append({
                'parameter': feat,
                'current_value': round(latest_val, 2),
                'rolling_mean': round(rolling_mean, 2),
                'rolling_std': round(rolling_std, 2),
                'rate_of_change': round(slope, 3),
                'z_score': round(z_score, 2),
                'consecutive_abnormal': consecutive_abnormal,
                'trend_direction': trend_dir,
                'is_degrading': is_degrading
            })

            # Generate precise evidence description for degrading parameters
            if is_degrading:
                readable_name = feat.replace('_', ' ').capitalize()
                slope_str = f"{slope:+.2f} unit/step"
                evidence_list.append(
                    f"{readable_name} shows active degradation: {slope_str}, currently at {latest_val} (Baseline nominal: [{p01:.1f}, {p99:.1f}], Z: {z_score:+.2f})."
                )

        # 4. Evaluate latest frame with Isolation Forest
        vec_features = []
        for feat in getattr(self, 'artifact_feature_names', self.FEATURE_NAMES):
            if feat in latest_frame:
                vec_features.append(latest_frame[feat])
            else:
                b_stat = self.baseline_stats.get(feat, {})
                vec_features.append(b_stat.get('mean', 0.0))
        latest_vec = np.array([vec_features], dtype=np.float64)
        latest_scaled = self.scaler.transform(latest_vec)
        iso_score = float(self.model.decision_function(latest_scaled)[0])
        is_iso_anomaly = bool(self.model.predict(latest_scaled)[0] == -1)

        # 5. Composite Early-Risk Score Calculation (0.0 to 1.0)
        # Combines parameter risks with Isolation Forest anomaly score
        avg_param_risk = float(np.mean(param_risk_contributions))
        max_param_risk = float(np.max(param_risk_contributions))
        
        # Isolation Forest penalty: map decision score (nominal > 0 to +0.2, outlier < 0 to -0.25) into 0.0-1.0
        iso_risk = min(1.0, max(0.0, (-iso_score + 0.05) / 0.25))

        # Composite risk formula
        raw_risk = (
            0.40 * max_param_risk +
            0.30 * avg_param_risk +
            0.30 * iso_risk
        )
        composite_risk_score = round(float(np.clip(raw_risk, 0.0, 1.0)), 4)

        # 6. Map to Risk Level
        if composite_risk_score >= 0.70 or is_iso_anomaly and degrading_param_count >= 2:
            risk_level = "CRITICAL"
        elif composite_risk_score >= 0.45 or degrading_param_count >= 1 and is_iso_anomaly:
            risk_level = "HIGH"
        elif composite_risk_score >= 0.20 or degrading_param_count >= 1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # 7. Overall Trend Classification
        if accelerating_param_count >= 2 or (degrading_param_count >= 2 and composite_risk_score > 0.6):
            overall_trend = "CRITICAL_ACCELERATING"
        elif degrading_param_count > 0:
            overall_trend = "DEGRADING"
        else:
            overall_trend = "STABLE"

        # If nominal, provide nominal summary evidence
        if not evidence_list:
            evidence_list.append(
                "All 5 telemetry parameters demonstrate stable moving averages and remain within nominal baseline quantile boundaries."
            )
        
        # Add ML isolation score evidence
        evidence_list.append(
            f"Isolation Forest anomaly decision score: {iso_score:+.4f} (Status: {'ANOMALY' if is_iso_anomaly else 'NOMINAL'})."
        )

        status = "anomaly" if (is_iso_anomaly or risk_level in ["HIGH", "CRITICAL"]) else "normal"

        return {
            'status': status,
            'risk_level': risk_level,
            'risk_score': composite_risk_score,
            'overall_trend': overall_trend,
            'parameter_trends': param_trends,
            'affected_parameters': affected_params,
            'evidence': evidence_list,
            'isolation_forest_score': round(iso_score, 4),
            'sample_count': num_frames,
            'model': 'TemporalTrendAnalyzer + IsolationForest'
        }
