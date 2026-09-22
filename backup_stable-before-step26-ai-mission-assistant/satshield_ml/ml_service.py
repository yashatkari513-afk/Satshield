"""
SATSHIELD ML Pipeline - Step 8: ML Service Backend Adapter
Connects incoming satellite telemetry from FastAPI / backend services to the real
trained scikit-learn IsolationForest inference engine (satshield_ml/predict.py).
"""
import os
import sys
import math
import logging
from typing import Dict, Any, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("satshield_ml.service")

# Ensure base satshield_ml directory is in sys.path
ml_dir = os.path.dirname(os.path.abspath(__file__))
if ml_dir not in sys.path:
    sys.path.insert(0, ml_dir)

try:
    from predict import SatelliteAnomalyPredictor, get_predictor, predict_telemetry
    ML_ENGINE_AVAILABLE = True
except Exception as e:
    logger.error(f"[ML Init Error] Failed to load IsolationForest inference engine: {e}")
    ML_ENGINE_AVAILABLE = False


def normalize_telemetry_payload(telemetry: Dict[str, Any], satellite_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Normalizes multi-format incoming telemetry (frontend, database, or simulation)
    into the canonical 8-field raw schema required by the 42-feature ML model.
    """
    data = dict(telemetry)

    # 1. Satellite ID (strict preservation of active/selected satellite)
    sat_id = satellite_id or data.get('satellite_id') or data.get('satId') or data.get('id') or 'SAT-001'
    sat_id = str(sat_id).strip()

    # 2. Temperature (°C)
    temp = data.get('temperature_c')
    if temp is None:
        temp = data.get('temperature')
    if temp is None:
        temp = data.get('payload_temp')
    if temp is None:
        temp = data.get('battery_temp', 25.0)
    try:
        temp = float(temp)
    except (ValueError, TypeError):
        temp = 25.0

    # 3. Voltage (V)
    volt = data.get('voltage_v')
    if volt is None:
        volt = data.get('battery_voltage')
    if volt is None:
        volt = data.get('voltage', 28.2)
    try:
        volt = float(volt)
    except (ValueError, TypeError):
        volt = 28.2

    # 4. Current (A)
    curr = data.get('current_a')
    if curr is None:
        curr = data.get('battery_current')
    if curr is None:
        curr = data.get('current', 6.2)
    try:
        curr = float(curr)
    except (ValueError, TypeError):
        curr = 6.2

    # 5. Battery SoC (%)
    soc = data.get('battery_soc_percent')
    if soc is None:
        soc = data.get('battery_charge')
    if soc is None:
        soc = data.get('battery', 88.0)
    try:
        soc = float(soc)
    except (ValueError, TypeError):
        soc = 88.0

    # 6. Solar Power (W)
    solar = data.get('solar_power_w')
    if solar is None:
        solar = data.get('solar_power')
    if solar is None:
        solar = data.get('solarOutput')
    if solar is None:
        # If power is provided as normalized score (e.g. 0-100), scale to Watts (~550W baseline)
        p = data.get('power', 90.0)
        solar = p * 6.0 if p <= 100.0 else p
    try:
        solar = float(solar)
    except (ValueError, TypeError):
        solar = 540.0

    # 7. Communication Signal (dBm)
    sig = data.get('communication_signal_db')
    if sig is None:
        sig = data.get('communication_signal')
    if sig is None:
        sig_str = data.get('signalStrength') or data.get('signal_strength')
        if sig_str is not None:
            try:
                # Convert 0-100% signal strength to dBm (-115 to -55 dBm)
                sig_val = float(sig_str)
                sig = -115.0 + (sig_val * 0.60)
            except Exception:
                sig = -68.0
        else:
            sig = -68.0
    try:
        sig = float(sig)
    except (ValueError, TypeError):
        sig = -68.0

    # 8. Vibration (g)
    vib = data.get('vibration_g')
    if vib is None:
        vib = data.get('vibration', 0.045)
    try:
        vib = float(vib)
    except (ValueError, TypeError):
        vib = 0.045

    # 9. Attitude Error (deg)
    att = data.get('attitude_error_deg')
    if att is None:
        att = data.get('attitude_error')
    if att is None:
        # Check 3-axis angles if available
        pitch = data.get('pitch', 0.0)
        yaw = data.get('yaw', 0.0)
        roll = data.get('roll', 0.0)
        try:
            p, y, r = float(pitch), float(yaw), float(roll)
            if p != 0.0 or y != 0.0 or r != 0.0:
                att = math.sqrt(p**2 + y**2 + r**2)
            else:
                att = 0.08
        except Exception:
            att = 0.08
    try:
        att = float(att)
    except (ValueError, TypeError):
        att = 0.08

    # 10. Subsystem routing
    subsystem = data.get('subsystem')
    if not subsystem:
        # Route based on prominent variance or default to POWER
        if temp > 45.0:
            subsystem = 'THERMAL'
        elif volt < 25.0 or curr > 15.0 or soc < 50.0:
            subsystem = 'BATTERY'
        elif sig < -95.0:
            subsystem = 'COMMUNICATION'
        elif att > 1.5 or vib > 0.20:
            subsystem = 'ATTITUDE'
        else:
            subsystem = 'POWER'

    return {
        'satellite_id': sat_id,
        'temperature_c': round(temp, 2),
        'voltage_v': round(volt, 2),
        'current_a': round(curr, 2),
        'battery_soc_percent': round(soc, 2),
        'solar_power_w': round(solar, 2),
        'communication_signal_db': round(sig, 2),
        'vibration_g': round(vib, 4),
        'attitude_error_deg': round(att, 3),
        'subsystem': str(subsystem).upper(),
        'timestamp': data.get('timestamp')
    }


def run_ml_inference(telemetry: Dict[str, Any], satellite_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Executes real IsolationForest machine learning inference for any satellite telemetry.
    Normalizes input, computes 42 temporal & statistical features, runs trained model,
    and returns a structured result without fabricating probabilities or confidence.
    """
    if not ML_ENGINE_AVAILABLE:
        logger.error("[ML Error] Machine learning inference engine unavailable.")
        return {
            "satellite_id": str(satellite_id or telemetry.get("satellite_id", "SAT-001")),
            "prediction": "ERROR",
            "raw_anomaly_score": 0.0,
            "subsystem": telemetry.get("subsystem", "POWER"),
            "model_type": "IsolationForest",
            "model_status": "model_not_found",
            "feature_count": 0,
            "data_quality": "UNAVAILABLE",
            "error": "Trained IsolationForest model artifact not loaded.",
            "evidence": [],
            "explanation": "ML inference unavailable: Model artifact missing.",
        }

    # 1. Normalize Telemetry
    try:
        norm_payload = normalize_telemetry_payload(telemetry, satellite_id)
    except Exception as e:
        logger.error(f"[ML Normalization Error] {e}")
        return {
            "satellite_id": str(satellite_id or "SAT-001"),
            "prediction": "ERROR",
            "raw_anomaly_score": 0.0,
            "subsystem": "POWER",
            "model_type": "IsolationForest",
            "model_status": "trained_model_loaded",
            "feature_count": 42,
            "data_quality": "INVALID_INPUT",
            "error": str(e),
            "evidence": [],
            "explanation": f"Invalid telemetry format: {e}",
        }

    # 2. Log Inference Execution
    sat_id = norm_payload['satellite_id']
    logger.info(f"[ML] Executing IsolationForest inference for satellite: {sat_id}")

    # 3. Execute Real ML Inference
    try:
        predictor = get_predictor()
        result = predictor.predict(norm_payload)

        # Check for insufficient telemetry input (< 3 physical fields supplied)
        present_telemetry_keys = [
            k for k, v in telemetry.items()
            if v is not None and k not in {'satellite_id', 'satId', 'id', 'subsystem', 'timestamp', 'name'}
        ]
        if len(present_telemetry_keys) < 3:
            result['data_quality'] = "INSUFFICIENT"
            result['probable_root_cause'] = "Insufficient telemetry for reliable root-cause assessment."
            result['mission_impact'] = "Unable to reliably assess subsystem mission impact due to incomplete telemetry stream."
            result['recommended_action'] = "Restore nominal telemetry downlink channels and re-evaluate spacecraft health."
            if result.get('explainability'):
                result['explainability']['data_quality'] = "INSUFFICIENT"
                result['explainability']['probable_root_cause'] = "Insufficient telemetry for reliable root-cause assessment."
                result['explainability']['mission_impact'] = "Unable to reliably assess subsystem mission impact due to incomplete telemetry stream."
                result['explainability']['recommended_action'] = "Restore nominal telemetry downlink channels and re-evaluate spacecraft health."

        # 4. Step 11: Execute Real Predictive Maintenance Analysis
        try:
            from satshield_ml.predictive_maintenance import analyze_predictive_maintenance
            pred_maint = analyze_predictive_maintenance(sat_id, norm_payload)
            result['predictive_maintenance'] = pred_maint
            result['risk_level'] = pred_maint.get('risk_level', 'NOMINAL')
            result['early_warning'] = pred_maint.get('early_warning')
            result['estimated_time_to_threshold'] = pred_maint.get('estimated_time_to_threshold')
            result['estimated_time_formatted'] = pred_maint.get('estimated_time_formatted')
        except Exception as p_err:
            logger.warning(f"[PredictiveMaintenance Warning] {p_err}")
            result['predictive_maintenance'] = {
                'status': 'INSUFFICIENT_DATA',
                'risk_level': 'NOMINAL',
                'early_warning': 'NOMINAL — Predictive assessment initializing.',
                'estimated_time_formatted': 'N/A — insufficient evidence'
            }

        # 5. Step 22: Execute Root-Cause Shadow Mode Analysis (Non-blocking)
        try:
            from satshield_ml.root_cause_service import analyze_root_cause_shadow
            rc_analysis = analyze_root_cause_shadow(sat_id, telemetry, norm_payload=norm_payload)
            result['root_cause_analysis'] = rc_analysis
        except Exception as rc_err:
            logger.warning(f"[RootCause Shadow Warning] {rc_err}")
            result['root_cause_analysis'] = {
                "satellite_id": sat_id,
                "affected_subsystem": "AMBIGUOUS / INSUFFICIENT EVIDENCE",
                "primary_probable_cause": "Root cause not determined — shadow analysis exception.",
                "evidence": ["Shadow root-cause execution caught exception."],
                "contributing_factors": ["shadow analysis failure"],
                "evidence_strength": "AMBIGUOUS",
                "severity": "LOW",
                "persistence": "0 frames",
                "trend_summary": "Unavailable",
                "data_quality": "DEGRADED",
                "analysis_method": "Multi-Signal Temporal Correlation & Subsystem Envelope Matrix (Shadow Layer)",
                "limitations": "Telemetry-grounded probable assessment based on physical correlation; not a confirmed hardware failure."
            }

        # 6. Step 23: Execute Mission Impact Shadow Mode Analysis (Non-blocking)
        try:
            from satshield_ml.mission_impact_service import analyze_mission_impact_shadow
            mi_analysis = analyze_mission_impact_shadow(
                sat_id,
                telemetry,
                norm_payload=norm_payload,
                root_cause_context=result.get('root_cause_analysis'),
                is_anomaly_detected=(result.get('prediction') == 'ANOMALY')
            )
            result['mission_impact_analysis'] = mi_analysis
        except Exception as mi_err:
            logger.warning(f"[MissionImpact Shadow Warning] {mi_err}")
            result['mission_impact_analysis'] = {
                "satellite_id": sat_id,
                "mission_impact_level": "LOW",
                "affected_capabilities": ["UNKNOWN / UNVERIFIED"],
                "primary_operational_impact": f"Mission impact shadow layer exception: {mi_err}",
                "potential_mission_consequences": ["Telemetry-grounded assessment unavailable."],
                "impacted_subsystems": ["TELEMETRY_PROCESSING"],
                "risk_drivers": [str(mi_err)],
                "persistence": "UNAVAILABLE",
                "trend_summary": "Unavailable",
                "urgency": "ROUTINE",
                "recommended_operator_response": ["Maintain standard routine telemetry monitoring."],
                "root_cause_context": {},
                "data_quality": "DEGRADED",
                "analysis_method": "Deterministic Subsystem Capability & Mission Dependency Matrix (Shadow Layer)",
                "limitations": (
                    "Mission impact assessment is a telemetry-grounded operational risk assessment "
                    "for decision support. It does not represent a validated flight-certification model."
                )
            }

        # 7. Log Real Results
        logger.info(f"[ML] Satellite: {sat_id}")
        logger.info(f"[ML] Features: {result['feature_count']}")
        logger.info(f"[ML] Prediction: {result['prediction']}")
        logger.info(f"[ML] Raw score: {result['raw_anomaly_score']:+.6f}")
        logger.info(f"[ML] Predictive Risk: {result.get('risk_level', 'NOMINAL')}")
        logger.info(f"[ML] Root-Cause Shadow: {result['root_cause_analysis'].get('affected_subsystem')} ({result['root_cause_analysis'].get('evidence_strength')})")
        logger.info(f"[ML] Mission Impact Shadow: {result['mission_impact_analysis'].get('mission_impact_level')} ({result['mission_impact_analysis'].get('urgency')})")

        return result

    except Exception as e:
        logger.error(f"[ML Inference Error] Failed to execute model prediction: {e}")
        return {
            "satellite_id": sat_id,
            "prediction": "ERROR",
            "raw_anomaly_score": 0.0,
            "subsystem": norm_payload.get('subsystem', 'POWER'),
            "model_type": "IsolationForest",
            "model_status": "inference_exception",
            "feature_count": 42,
            "data_quality": "RUNTIME_ERROR",
            "error": str(e),
            "evidence": [],
            "explanation": f"ML inference failed: {e}",
        }
