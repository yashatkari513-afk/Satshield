"""
SATSHIELD ML Pipeline - Step 22: Root-Cause Analysis Shadow Mode Service
Provides a non-blocking shadow analysis adapter that encapsulates the multi-signal
telemetry correlation engine to determine affected subsystems, telemetry-grounded
probable causes, evidence strength, and persistence metrics in parallel with primary ML inference.
"""
import os
import sys
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Ensure satshield_ml directory is in sys.path
ml_dir = os.path.dirname(os.path.abspath(__file__))
if ml_dir not in sys.path:
    sys.path.insert(0, ml_dir)

root_dir = os.path.dirname(ml_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

logger = logging.getLogger("satshield_ml.root_cause")

# Import the isolated Step 22 Root-Cause Correlator
try:
    from satshield_ml.experiments.root_cause.root_cause_experiment import SatelliteRootCauseCorrelator
    ROOT_CAUSE_ENGINE_AVAILABLE = True
except Exception as e:
    logger.warning(f"[RootCause Shadow Init] Could not load experiment correlator: {e}")
    try:
        from experiments.root_cause.root_cause_experiment import SatelliteRootCauseCorrelator
        ROOT_CAUSE_ENGINE_AVAILABLE = True
    except Exception as e2:
        logger.error(f"[RootCause Shadow Init] Fatal load failure: {e2}")
        ROOT_CAUSE_ENGINE_AVAILABLE = False
        SatelliteRootCauseCorrelator = None

# Strict per-satellite isolated correlator instances
_SATELLITE_CORRELATORS: Dict[str, Any] = {}


def get_correlator_for_satellite(sat_id: str) -> Optional[Any]:
    """Retrieves or instantiates an isolated correlator instance for the given satellite."""
    if not ROOT_CAUSE_ENGINE_AVAILABLE or SatelliteRootCauseCorrelator is None:
        return None
    sat_id = str(sat_id).strip()
    if sat_id not in _SATELLITE_CORRELATORS:
        _SATELLITE_CORRELATORS[sat_id] = SatelliteRootCauseCorrelator(satellite_id=sat_id)
    return _SATELLITE_CORRELATORS[sat_id]


def reset_satellite_root_cause_state(sat_id: Optional[str] = None):
    """Resets historical telemetry streak state for a specific satellite or all satellites."""
    if sat_id:
        if sat_id in _SATELLITE_CORRELATORS:
            _SATELLITE_CORRELATORS[sat_id].reset()
    else:
        for c in _SATELLITE_CORRELATORS.values():
            c.reset()


def analyze_root_cause_shadow(
    satellite_id: str,
    raw_telemetry: Dict[str, Any],
    norm_payload: Optional[Dict[str, Any]] = None,
    timestamp: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Executes non-blocking shadow root-cause analysis for the active satellite.
    Guarantees safe fallback on any telemetry irregularity, insufficient fields, or runtime exception.
    """
    sat_id = str(satellite_id or raw_telemetry.get("satellite_id", "SAT-001")).strip()
    
    # 1. Fallback if engine unavailable
    if not ROOT_CAUSE_ENGINE_AVAILABLE:
        return _build_fallback_response(
            sat_id,
            subsystem="AMBIGUOUS / INSUFFICIENT EVIDENCE",
            probable_cause="Root cause not determined — root-cause engine unavailable.",
            evidence_strength="AMBIGUOUS",
            severity="LOW",
            data_quality="UNAVAILABLE"
        )

    # 2. Check for sufficient physical telemetry fields
    physical_keys = {
        'temperature_c', 'voltage_v', 'current_a', 'battery_soc_percent',
        'solar_power_w', 'communication_signal_db', 'vibration_g', 'attitude_error_deg',
        'temperature', 'voltage', 'current', 'battery', 'power', 'signalStrength', 'vibration', 'attitude_error',
        'battery_voltage', 'battery_current', 'battery_charge', 'solar_power', 'communication_signal',
        'payload_temp', 'battery_temp', 'solarOutput', 'signal_strength'
    }
    present_physical = [k for k, v in raw_telemetry.items() if k in physical_keys and v is not None]
    if len(present_physical) < 3:
        return _build_fallback_response(
            sat_id,
            subsystem="AMBIGUOUS / INSUFFICIENT EVIDENCE",
            probable_cause="Root cause not determined — insufficient corroborating telemetry.",
            evidence_strength="AMBIGUOUS",
            severity="LOW",
            data_quality="INSUFFICIENT"
        )

    # 3. Execute isolated multi-signal correlation
    try:
        correlator = get_correlator_for_satellite(sat_id)
        if correlator is None:
            return _build_fallback_response(
                sat_id,
                subsystem="AMBIGUOUS / INSUFFICIENT EVIDENCE",
                probable_cause="Root cause not determined — correlator instance unavailable.",
                evidence_strength="AMBIGUOUS",
                severity="LOW",
                data_quality="UNAVAILABLE"
            )

        payload_to_analyze = norm_payload if norm_payload is not None else raw_telemetry
        result = correlator.analyze_frame(payload_to_analyze, timestamp=timestamp)
        return result

    except Exception as e:
        logger.warning(f"[RootCause Shadow Exception] {e}")
        return _build_fallback_response(
            sat_id,
            subsystem="AMBIGUOUS / INSUFFICIENT EVIDENCE",
            probable_cause=f"Root cause not determined — telemetry analysis exception ({e}).",
            evidence_strength="AMBIGUOUS",
            severity="LOW",
            data_quality="DEGRADED"
        )


def _build_fallback_response(
    sat_id: str,
    subsystem: str,
    probable_cause: str,
    evidence_strength: str,
    severity: str,
    data_quality: str
) -> Dict[str, Any]:
    return {
        "satellite_id": sat_id,
        "affected_subsystem": subsystem,
        "primary_probable_cause": probable_cause,
        "evidence": [probable_cause],
        "contributing_factors": ["insufficient multi-signal correlation window"],
        "evidence_strength": evidence_strength,
        "severity": severity,
        "persistence": "0 frames",
        "trend_summary": "Insufficient temporal telemetry progression",
        "data_quality": data_quality,
        "analysis_method": "Multi-Signal Temporal Correlation & Subsystem Envelope Matrix (Shadow Layer)",
        "limitations": "Telemetry-grounded probable assessment based on physical correlation; not a confirmed hardware failure."
    }
