"""
SATSHIELD AI - Real ML Anomaly Detection & Inference Engine
Implements Isolation Forest ML inference, multi-channel statistical deviation analysis,
explainable AI (XAI) natural language reasoning, and subsystem-level root-cause identification.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

class SatelliteAnomalyDetector:
    """
    Modular Production-Grade Satellite Telemetry Anomaly Detector.
    Integrates Scikit-Learn Isolation Forest with time-series deviation tracking.
    """
    
    DEFAULT_MODEL_PATH = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'models',
        'isolation_forest_model.joblib'
    )

    # Subsystem telemetry parameter routing
    SUBSYSTEM_MAP = {
        'battery_voltage': 'BATTERY',
        'battery_current': 'BATTERY',
        'battery_charge': 'BATTERY',
        'solar_power': 'POWER',
        'temperature': 'THERMAL',
        'payload_temp': 'THERMAL',
        'communication_signal': 'COMMUNICATION',
        'packet_loss': 'COMMUNICATION',
        'pitch': 'ATTITUDE',
        'yaw': 'ATTITUDE',
        'roll': 'ATTITUDE',
    }

    # Physical safety and clipping boundaries
    PHYSICAL_BOUNDS = {
        'battery_voltage': (15.0, 45.0),
        'battery_current': (0.0, 50.0),
        'battery_charge': (0.0, 100.0),
        'temperature': (-50.0, 120.0),
        'solar_power': (0.0, 1500.0),
        'communication_signal': (-140.0, -40.0),
        'packet_loss': (0.0, 100.0),
        'pitch': (-180.0, 180.0),
        'yaw': (-180.0, 180.0),
        'roll': (-180.0, 180.0),
        'payload_temp': (-50.0, 120.0),
    }

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or self.DEFAULT_MODEL_PATH
        self.model = None
        self.scaler = None
        self.feature_names = []
        self.baseline_stats = {}
        self.threshold_info = {}
        self.metadata = {}
        self._load_model()

    def _load_model(self):
        """Loads serialized Isolation Forest artifact and learned statistics."""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Model file not found at '{self.model_path}'. "
                "Please run backend/ml/train.py first."
            )
        
        artifact = joblib.load(self.model_path)
        self.model = artifact['model']
        self.scaler = artifact['scaler']
        self.feature_names = artifact['feature_names']
        self.baseline_stats = artifact['baseline_stats']
        self.threshold_info = artifact.get('threshold_info', {})
        self.metadata = artifact.get('metadata', {})

    def _validate_and_sanitize(self, telemetry: Dict[str, Any]) -> Dict[str, float]:
        """
        Validates, imputes missing telemetry, and clamps values to physical safety limits.
        """
        sanitized = {}
        for feat in self.feature_names:
            raw_val = telemetry.get(feat)
            if raw_val is None or (isinstance(raw_val, float) and (np.isnan(raw_val) or np.isinf(raw_val))):
                # Impute with baseline mean if missing
                mean_val = self.baseline_stats.get(feat, {}).get('mean', 0.0)
                sanitized[feat] = float(mean_val)
            else:
                try:
                    val = float(raw_val)
                    # Clamp to physical boundaries
                    if feat in self.PHYSICAL_BOUNDS:
                        low, high = self.PHYSICAL_BOUNDS[feat]
                        val = max(low, min(high, val))
                    sanitized[feat] = val
                except (ValueError, TypeError):
                    mean_val = self.baseline_stats.get(feat, {}).get('mean', 0.0)
                    sanitized[feat] = float(mean_val)
        return sanitized

    def _compute_parameter_deviations(
        self,
        sanitized_telemetry: Dict[str, float],
        history: Optional[List[Dict[str, Any]]] = None,
        z_threshold: float = 2.0
    ) -> Dict[str, Any]:
        """
        Computes Z-scores, normal baseline ranges, rate of change (dX/dt), and deviation directions.
        """
        deviations = {}
        for feat in self.feature_names:
            val = sanitized_telemetry[feat]
            stats = self.baseline_stats.get(feat, {})
            if not stats:
                continue

            mean = stats['mean']
            std = stats['std'] if stats['std'] > 0 else 1.0
            p01 = stats.get('p01', mean - 2.5 * std)
            p99 = stats.get('p99', mean + 2.5 * std)

            z_score = (val - mean) / std

            # Calculate rate of change if history provided
            rate_of_change = 0.0
            if history and len(history) >= 2:
                prev_val = float(history[-1].get(feat, val))
                rate_of_change = round(val - prev_val, 3)

            is_deviated = (val < p01) or (val > p99) or (abs(z_score) >= z_threshold)

            if is_deviated:
                direction = "ELEVATED_HIGH" if val > mean else "DEGRADED_LOW"
                deviations[feat] = {
                    'parameter': feat,
                    'subsystem': self.SUBSYSTEM_MAP.get(feat, 'GENERAL'),
                    'observed_value': round(val, 2),
                    'baseline_mean': round(mean, 2),
                    'normal_range': [round(p01, 2), round(p99, 2)],
                    'z_score': round(float(z_score), 2),
                    'rate_of_change': rate_of_change,
                    'deviation_direction': direction
                }

        return deviations

    def _generate_explanation(
        self,
        deviations: Dict[str, Any],
        is_anomaly: bool,
        anomaly_score: float
    ) -> Tuple[str, str, List[str], str]:
        """
        Generates Explainable AI (XAI) natural language description, probable causes,
        primary subsystem, and recommended operational action.
        """
        if not is_anomaly or not deviations:
            return (
                "All telemetry channels are operating within learned baseline parameters. No anomalies detected.",
                "System Operating Nominally",
                ["Nominal space environment operations"],
                "Maintain standard orbital tracking and routine pass schedule."
            )

        # Identify primary parameter with highest absolute Z-score
        sorted_devs = sorted(deviations.values(), key=lambda d: abs(d['z_score']), reverse=True)
        primary = sorted_devs[0]
        param_name = primary['parameter'].replace('_', ' ').title()
        p_sub = primary['subsystem']
        obs = primary['observed_value']
        n_low, n_high = primary['normal_range']
        z = primary['z_score']
        d_dir = "above" if primary['deviation_direction'] == "ELEVATED_HIGH" else "below"
        roc = primary['rate_of_change']

        # Build telemetry-backed explanation
        explanation_parts = [
            f"{param_name} observed at {obs} (learned nominal: [{n_low}, {n_high}], Z-score: {z:+.2f})."
        ]
        if roc != 0.0:
            explanation_parts.append(f"Rate of change is {roc:+.2f}/step.")

        if len(sorted_devs) > 1:
            secondary_names = [d['parameter'].replace('_', ' ') for d in sorted_devs[1:3]]
            explanation_parts.append(f"Correlated deviations detected in: {', '.join(secondary_names)}.")

        explanation = " ".join(explanation_parts)

        # Determine anomaly type, causes & recommendations
        if p_sub in ['POWER', 'BATTERY']:
            if 'voltage' in primary['parameter']:
                anomaly_type = "EPS Main Bus Undervoltage" if primary['deviation_direction'] == "DEGRADED_LOW" else "Bus Overvoltage Surge"
                probable_causes = [
                    "High payload power draw exceeding solar generation",
                    "Battery cell internal resistance degradation",
                    "Shunt voltage regulator failure"
                ]
                rec_action = "Initiate battery cell charge priority and shed non-essential payload heaters."
            elif 'solar' in primary['parameter']:
                anomaly_type = "Solar Array Power Generation Decay"
                probable_causes = [
                    "Solar panel Sun-pointing gimbal error",
                    "Earth/Moon eclipse shadow entry",
                    "Array surface micro-meteorite damage"
                ]
                rec_action = "Re-orient solar array drive mechanism toward sun-vector."
            else:
                anomaly_type = "Battery Subsystem Abnormal Load"
                probable_causes = ["Payload component short-circuit", "Battery charging controller malfunction"]
                rec_action = "Inspect power distribution unit telemetry and cycle redundant power converters."

        elif p_sub == 'THERMAL':
            anomaly_type = "Subsystem Thermal Runaway" if primary['deviation_direction'] == "ELEVATED_HIGH" else "Subsystem Excessive Cooling"
            probable_causes = [
                "Thermal radiator panel dissipation degradation",
                "Heater element control latch-up",
                "High electronics duty-cycle heat dissipation"
            ]
            rec_action = "Deploy auxiliary radiator louvers and reorient attitude to shade avionics bay."

        elif p_sub == 'COMMUNICATION':
            anomaly_type = "RF Downlink Carrier Attenuation"
            probable_causes = [
                "High-gain dish antenna autotracking misalignment",
                "Atmospheric/ionospheric rain fade",
                "Traveling-wave tube amplifier (TWTA) output drop"
            ]
            rec_action = "Re-calibrate dish azimuth/elevation autotrack and increase ground station uplink power."

        elif p_sub == 'ATTITUDE':
            anomaly_type = "AOCS Gyroscopic Attitude Drift"
            probable_causes = [
                "Reaction wheel momentum saturation",
                "Star tracker optical blinding",
                "Magnetic torquer desaturation delay"
            ]
            rec_action = "Execute magnetic torquer momentum desaturation routine."

        else:
            anomaly_type = "Sensor Telemetry Calibration Drift"
            probable_causes = ["ADC reference voltage drift", "Analog sensor transducer aging"]
            rec_action = "Verify analog sensor calibration and switch to redundant telemetry sensor line."

        return explanation, anomaly_type, probable_causes, rec_action

    def detect_anomaly(
        self,
        telemetry: Dict[str, Any],
        history: Optional[List[Dict[str, Any]]] = None,
        z_threshold: float = 2.0
    ) -> Dict[str, Any]:
        """
        Primary interface: Analyzes a telemetry frame using the ML Isolation Forest
        and statistical time-series engine.

        Returns:
            Dict conforming to:
            {
                "is_anomaly": bool,
                "anomaly_score": float (0.00 to 1.00 continuous scale),
                "raw_decision_score": float,
                "confidence": float (0 to 100%),
                "severity": "INFO" | "WARNING" | "CRITICAL",
                "subsystem": str,
                "anomaly_type": str,
                "affected_parameters": List[str],
                "parameter_deviations": Dict[str, Any],
                "explanation": str,
                "probable_causes": List[str],
                "recommended_action": str,
                "model": str,
                "sanitized_telemetry": Dict[str, float]
            }
        """
        sanitized = self._validate_and_sanitize(telemetry)

        # 1. Prepare feature vector for Isolation Forest
        vector = np.array([[sanitized[f] for f in self.feature_names]], dtype=np.float64)
        scaled_vector = self.scaler.transform(vector)

        # 2. ML Inference from Isolation Forest
        raw_prediction = self.model.predict(scaled_vector)[0]  # +1 for normal, -1 for anomaly
        raw_score = float(self.model.decision_function(scaled_vector)[0])
        is_ml_anomaly = bool(raw_prediction == -1)

        # 3. Compute parameter deviations and Z-scores
        deviations = self._compute_parameter_deviations(sanitized, history=history, z_threshold=z_threshold)
        has_z_deviations = len(deviations) > 0

        # If model flagged anomaly but strict threshold was too high, check lower threshold
        if is_ml_anomaly and not deviations:
            deviations = self._compute_parameter_deviations(sanitized, history=history, z_threshold=1.5)

        is_anomaly = is_ml_anomaly or has_z_deviations

        # 4. Map continuous Anomaly Score to [0.00, 1.00] scale
        # Normal baseline decision score is around +0.03 to +0.08
        # Outlier scores drop into negative (-0.05 to -0.25)
        offset = self.threshold_info.get('offset', -0.5)
        mean_normal = self.threshold_info.get('decision_score_mean', 0.03)
        
        # Mathematical sigmoid / piece-wise mapping to [0.00, 1.00]
        if raw_score >= mean_normal:
            # Deep inlier: score 0.02 - 0.20
            norm_score = max(0.01, 0.20 - (raw_score - mean_normal) * 2.0)
        elif raw_score >= 0.0:
            # Mild variance: score 0.20 - 0.45
            norm_score = 0.20 + (mean_normal - raw_score) * 8.0
        else:
            # Clear outlier: score 0.45 - 0.98
            norm_score = min(0.98, 0.45 + abs(raw_score) * 3.5)

        # Factor in extreme Z-scores if any
        if deviations:
            max_z = max(abs(d['z_score']) for d in deviations.values())
            if max_z > 4.0:
                norm_score = max(norm_score, 0.78 + min(0.20, (max_z - 4.0) * 0.04))
            elif max_z > 2.5:
                norm_score = max(norm_score, 0.58 + (max_z - 2.5) * 0.12)

        continuous_anomaly_score = round(float(np.clip(norm_score, 0.01, 0.99)), 4)

        # 5. Determine Severity Classification
        if continuous_anomaly_score >= 0.75:
            severity = "CRITICAL"
        elif continuous_anomaly_score >= 0.50 or is_anomaly:
            severity = "WARNING"
        elif continuous_anomaly_score >= 0.30:
            severity = "INFO"
        else:
            severity = "INFO"

        # 6. Model Confidence (Certainty that observed pattern is anomalous or normal)
        # Note: Model confidence is NOT failure probability
        if is_anomaly:
            confidence = round(min(99.0, max(75.0, 70.0 + continuous_anomaly_score * 30.0)), 1)
        else:
            confidence = round(min(99.5, max(85.0, 100.0 - continuous_anomaly_score * 40.0)), 1)

        # 7. Generate Explanations, Probable Causes, and Recommendations
        explanation, anomaly_type, probable_causes, rec_action = self._generate_explanation(
            deviations, is_anomaly, continuous_anomaly_score
        )

        # Subsystem identification
        if deviations:
            subsystem = sorted(deviations.values(), key=lambda d: abs(d['z_score']), reverse=True)[0]['subsystem']
        else:
            subsystem = "POWER"

        return {
            "status": "anomaly" if is_anomaly else "normal",
            "is_anomaly": is_anomaly,
            "anomaly_score": continuous_anomaly_score,
            "raw_decision_score": round(raw_score, 4),
            "confidence": confidence,
            "severity": severity if is_anomaly else "INFO",
            "subsystem": subsystem,
            "anomaly_type": anomaly_type,
            "affected_parameters": list(deviations.keys()),
            "parameter_deviations": deviations,
            "explanation": explanation,
            "probable_causes": probable_causes,
            "recommended_action": rec_action,
            "model": "IsolationForest-ML-v2",
            "sanitized_telemetry": sanitized
        }

    def analyze_frame(self, telemetry: Dict[str, Any], z_threshold: float = 2.0) -> Dict[str, Any]:
        """Backward-compatible helper for legacy callers."""
        return self.detect_anomaly(telemetry, z_threshold=z_threshold)

    def detect_batch(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Ultra-fast vectorized batch detection for model validation benchmarks.
        Returns (is_anomaly_array, anomaly_scores_array).
        """
        # Sanitize dataframe columns
        X_mat = np.zeros((len(df), len(self.feature_names)), dtype=np.float64)
        for i, feat in enumerate(self.feature_names):
            if feat in df.columns:
                X_mat[:, i] = df[feat].fillna(self.baseline_stats.get(feat, {}).get('mean', 0.0)).values
            else:
                X_mat[:, i] = self.baseline_stats.get(feat, {}).get('mean', 0.0)

        # Scale and predict in a single vectorized BLAS call
        scaled = self.scaler.transform(X_mat)
        raw_preds = self.model.predict(scaled)  # +1 / -1
        raw_scores = self.model.decision_function(scaled)

        # Compute Z-score deviations vectorized
        means = np.array([self.baseline_stats[f]['mean'] for f in self.feature_names])
        stds = np.array([self.baseline_stats[f]['std'] if self.baseline_stats[f]['std'] > 0 else 1.0 for f in self.feature_names])
        z_scores = np.abs((X_mat - means) / stds)
        max_z_per_row = np.max(z_scores, axis=1)

        is_anom = (raw_preds == -1) | (max_z_per_row >= 2.0)

        # Score mapping
        mean_normal = self.threshold_info.get('decision_score_mean', 0.03)
        scores = np.where(
            raw_scores >= mean_normal,
            np.maximum(0.01, 0.20 - (raw_scores - mean_normal) * 2.0),
            np.where(
                raw_scores >= 0.0,
                0.20 + (mean_normal - raw_scores) * 8.0,
                np.minimum(0.98, 0.45 + np.abs(raw_scores) * 3.5)
            )
        )
        scores = np.where(max_z_per_row > 4.0, np.maximum(scores, 0.78 + np.minimum(0.20, (max_z_per_row - 4.0) * 0.04)), scores)
        scores = np.where((max_z_per_row > 2.5) & (max_z_per_row <= 4.0), np.maximum(scores, 0.58 + (max_z_per_row - 2.5) * 0.12), scores)
        clipped_scores = np.clip(scores, 0.01, 0.99)

        return is_anom.astype(int), np.round(clipped_scores, 4)
