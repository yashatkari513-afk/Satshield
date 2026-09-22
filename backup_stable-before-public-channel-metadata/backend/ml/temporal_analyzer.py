"""
Real Time-Series Temporal Telemetry Anomaly Analyzer & Early Risk Predictor
Performs sequential trend analysis, moving average tracking, rate of change (dX/dt),
rolling standard deviation volatility, and baseline Z-score deviation calculations.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

class TemporalTelemetryAnalyzer:
    """
    Time-Series Early Anomaly Risk Predictor for Satellite Telemetry.
    Analyzes historical sequences using deterministic statistical and ML methods.
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

    MIN_HISTORY_FRAMES = 3

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or self.DEFAULT_MODEL_PATH
        self.model = None
        self.scaler = None
        self.baseline_stats = {}
        self.metadata = {}
        self._load_model()

    def _load_model(self):
        """Loads trained Isolation Forest and baseline statistics from Joblib."""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found at {self.model_path}")
        
        artifact = joblib.load(self.model_path)
        self.model = artifact['model']
        self.scaler = artifact['scaler']
        self.baseline_stats = artifact['baseline_stats']
        self.metadata = artifact.get('metadata', {})
        self.artifact_feature_names = artifact.get('feature_names', list(self.baseline_stats.keys()))

    def _calculate_slope(self, series: np.ndarray) -> float:
        """Calculates deterministic linear rate of change (dX/dt)."""
        n = len(series)
        if n < 2:
            return 0.0
        t = np.arange(n, dtype=np.float64)
        t_mean = np.mean(t)
        s_mean = np.mean(series)
        numerator = np.sum((t - t_mean) * (series - s_mean))
        denominator = np.sum((t - t_mean) ** 2)
        if denominator == 0:
            return 0.0
        return float(numerator / denominator)

    def analyze_sequence(self, sequence: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes a sequence of historical telemetry frames (ordered oldest to newest).
        
        Returns:
            Dict conforming to:
            {
                "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
                "risk_score": float,
                "trend_status": str,
                "early_warning": bool,
                "affected_parameters": List[str],
                "evidence": List[str],
                "recommended_monitoring": List[str]
            }
        """
        num_samples = len(sequence)

        # 1. Check minimum historical window
        if num_samples < self.MIN_HISTORY_FRAMES:
            return {
                "risk_level": "LOW",
                "risk_score": 0.0,
                "trend_status": "INSUFFICIENT_DATA",
                "early_warning": False,
                "affected_parameters": [],
                "evidence": [
                    f"Sequence contains {num_samples} frame(s). Minimum {self.MIN_HISTORY_FRAMES} frames required for temporal trend analysis."
                ],
                "recommended_monitoring": [
                    "Collect additional telemetry frames to establish moving average baseline."
                ]
            }

        # 2. Extract DataFrame
        df = pd.DataFrame(sequence)[self.FEATURE_NAMES].astype(np.float64)
        latest_row = df.iloc[-1].to_dict()

        param_risk_scores = []
        affected_parameters = []
        evidence = []
        recommended_monitoring = []
        degrading_count = 0
        accelerating_count = 0

        # 3. Analyze each telemetry parameter
        for feat in self.FEATURE_NAMES:
            series = df[feat].values
            stats = self.baseline_stats.get(feat, {})
            b_mean = stats.get('mean', float(np.mean(series)))
            b_std = stats.get('std', float(np.std(series))) or 1.0
            p01 = stats.get('p01', b_mean - 3 * b_std)
            p99 = stats.get('p99', b_mean + 3 * b_std)

            latest_val = float(series[-1])
            rolling_mean = float(np.mean(series))
            rolling_std = float(np.std(series, ddof=1)) if num_samples > 1 else 0.0
            slope = self._calculate_slope(series)  # dX/dt
            z_score = float((latest_val - b_mean) / b_std)

            # Check consecutive tail out-of-nominal run-length
            consecutive_abnormal = 0
            for val in reversed(series):
                if val < p01 or val > p99 or abs((val - b_mean) / b_std) >= 1.8:
                    consecutive_abnormal += 1
                else:
                    break

            # Degradation velocity & direction
            is_degrading = False
            deg_velocity = 0.0
            direction_desc = "STABLE"

            if feat == 'battery_voltage':
                if slope <= -0.04 or z_score < -1.5:
                    is_degrading = True
                    deg_velocity = max(0.0, -slope / b_std)
                    direction_desc = "DROPPING"
            elif feat == 'battery_current':
                if slope >= 0.20 or z_score > 1.5:
                    is_degrading = True
                    deg_velocity = max(0.0, slope / b_std)
                    direction_desc = "SURGING"
            elif feat == 'temperature':
                if slope >= 0.30 or z_score > 1.5:
                    is_degrading = True
                    deg_velocity = max(0.0, slope / b_std)
                    direction_desc = "HEATING"
            elif feat == 'solar_power':
                if slope <= -8.0 or z_score < -1.5:
                    is_degrading = True
                    deg_velocity = max(0.0, -slope / b_std)
                    direction_desc = "DECAYING"
            elif feat == 'communication_signal':
                if slope <= -0.5 or z_score < -1.5:
                    is_degrading = True
                    deg_velocity = max(0.0, -slope / b_std)
                    direction_desc = "FADING"

            if is_degrading:
                degrading_count += 1
                affected_parameters.append(feat)
                if deg_velocity > 0.6:
                    accelerating_count += 1

                # Generate domain evidence
                readable_feat = feat.replace('_', ' ').title()
                evidence.append(
                    f"{readable_feat} is {direction_desc}: rate of change dX/dt = {slope:+.2f}/step, latest value {latest_val:.1f} (Nominal: [{p01:.1f}, {p99:.1f}], Z-score: {z_score:+.2f}, rolling std: {rolling_std:.2f})."
                )

                # Parameter-specific recommended monitoring
                if feat == 'battery_voltage':
                    recommended_monitoring.append("Initiate battery cell charge priority and inspect EPS bus shunt regulators.")
                elif feat == 'battery_current':
                    recommended_monitoring.append("Check for internal subsystem short-circuit or excessive payload draw.")
                elif feat == 'temperature':
                    recommended_monitoring.append("Verify radiator panel thermal dissipation and inspect active thermal louvers.")
                elif feat == 'solar_power':
                    recommended_monitoring.append("Check solar array Sun-pointing attitude gimbal and solar cell occlusion.")
                elif feat == 'communication_signal':
                    recommended_monitoring.append("Re-align high-gain antenna azimuth/elevation toward active ground station.")

            # Calculate deterministic sub-risk score (0.0 to 1.0)
            z_risk = min(1.0, max(0.0, (abs(z_score) - 0.8) / 3.2)) if abs(z_score) > 0.8 else 0.0
            velocity_risk = min(1.0, deg_velocity * 0.75)
            persistence_risk = min(1.0, consecutive_abnormal / num_samples)

            param_risk = 0.40 * z_risk + 0.35 * velocity_risk + 0.25 * persistence_risk
            param_risk_scores.append(param_risk)

        # 4. Evaluate latest reading with Isolation Forest
        vec_features = []
        for feat in getattr(self, 'artifact_feature_names', self.FEATURE_NAMES):
            if feat in latest_row:
                vec_features.append(latest_row[feat])
            else:
                b_stat = self.baseline_stats.get(feat, {})
                vec_features.append(b_stat.get('mean', 0.0))
        latest_vec = np.array([vec_features], dtype=np.float64)
        latest_scaled = self.scaler.transform(latest_vec)
        iso_score = float(self.model.decision_function(latest_scaled)[0])
        is_iso_anomaly = bool(self.model.predict(latest_scaled)[0] == -1)

        # 5. Composite Early-Risk Score (Deterministic mathematical weighting)
        max_risk = float(np.max(param_risk_scores)) if param_risk_scores else 0.0
        avg_risk = float(np.mean(param_risk_scores)) if param_risk_scores else 0.0
        
        # Isolation Forest decision score penalty (mapped into 0.0 - 1.0)
        iso_penalty = min(1.0, max(0.0, (-iso_score + 0.03) / 0.20))

        composite_risk = (
            0.45 * max_risk +
            0.30 * avg_risk +
            0.25 * iso_penalty
        )
        composite_risk_score = round(float(np.clip(composite_risk, 0.0, 1.0)), 4)

        # 6. Early Risk Level Classification
        if composite_risk_score >= 0.70 or (is_iso_anomaly and degrading_count >= 2):
            risk_level = "CRITICAL"
            trend_status = "CRITICAL_ACCELERATING"
            early_warning = True
        elif composite_risk_score >= 0.45 or (degrading_count >= 1 and is_iso_anomaly):
            risk_level = "HIGH"
            trend_status = "DEGRADING_RAPIDLY"
            early_warning = True
        elif composite_risk_score >= 0.20 or degrading_count >= 1:
            risk_level = "MEDIUM"
            trend_status = "EARLY_DRIFT_DETECTED"
            early_warning = True
        else:
            risk_level = "LOW"
            trend_status = "NOMINAL_STABLE"
            early_warning = False

        # If nominal, add baseline confirmation
        if not evidence:
            evidence.append(
                "All 5 telemetry parameters are stable with rolling moving averages within nominal baseline bounds."
            )
            evidence.append(
                f"Isolation Forest ML score: {iso_score:+.4f} (Status: NOMINAL)."
            )
        else:
            evidence.append(
                f"Isolation Forest ML anomaly score: {iso_score:+.4f} ({'ANOMALOUS OUTLIER' if is_iso_anomaly else 'INLIER'})."
            )

        if not recommended_monitoring:
            recommended_monitoring.append("Maintain nominal orbital pass telemetry sampling.")

        return {
            "risk_level": risk_level,
            "risk_score": composite_risk_score,
            "trend_status": trend_status,
            "early_warning": early_warning,
            "affected_parameters": affected_parameters,
            "evidence": evidence,
            "recommended_monitoring": recommended_monitoring
        }
