"""
SATSHIELD ML Pipeline - Step 23: Mission Impact Engine Shadow Mode Service
=========================================================================
Provides a non-blocking shadow analysis adapter that encapsulates the deterministic
Mission Impact Engine to assess degraded operational capabilities, mission-level
consequences, urgency, and recommended operator responses in parallel with primary
ML anomaly detection and Step 22 Root-Cause analysis.

Guarantees:
- Primary anomaly detection (IsolationForest) is never blocked or overridden.
- Step 22 Root-Cause analysis is preserved and optionally ingested as corroboration.
- Predictive maintenance calculations are untouched.
- State and historical trend buffers are strictly isolated per satellite.
- Safe fallback on any malformed input, missing fields, or runtime exceptions.
"""

import os
import sys
import logging
from typing import Dict, Any, Optional

# Ensure satshield_ml directory is in sys.path
ml_dir = os.path.dirname(os.path.abspath(__file__))
if ml_dir not in sys.path:
    sys.path.insert(0, ml_dir)

root_dir = os.path.dirname(ml_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

logger = logging.getLogger("satshield_ml.mission_impact")

# Import the isolated Step 23 Mission Impact Engine
try:
    from satshield_ml.experiments.mission_impact.mission_impact_engine import MissionImpactEngine
    MISSION_IMPACT_ENGINE_AVAILABLE = True
except Exception as e:
    logger.warning(f"[MissionImpact Shadow Init] Could not load experiment engine: {e}")
    try:
        from experiments.mission_impact.mission_impact_engine import MissionImpactEngine
        MISSION_IMPACT_ENGINE_AVAILABLE = True
    except Exception as e2:
        logger.error(f"[MissionImpact Shadow Init] Fatal load failure: {e2}")
        MISSION_IMPACT_ENGINE_AVAILABLE = False
        MissionImpactEngine = None

# Global singleton MissionImpactEngine instance (which manages isolated per-satellite history)
_MISSION_IMPACT_ENGINE: Optional[Any] = None


def get_mission_impact_engine() -> Optional[Any]:
    """Retrieves or instantiates the global singleton Mission Impact Engine."""
    global _MISSION_IMPACT_ENGINE
    if not MISSION_IMPACT_ENGINE_AVAILABLE or MissionImpactEngine is None:
        return None
    if _MISSION_IMPACT_ENGINE is None:
        _MISSION_IMPACT_ENGINE = MissionImpactEngine(history_buffer_size=30)
    return _MISSION_IMPACT_ENGINE


def reset_satellite_mission_impact_state(sat_id: Optional[str] = None):
    """Resets historical telemetry trend state for a specific satellite or all satellites."""
    engine = get_mission_impact_engine()
    if engine is not None:
        engine.clear_history(sat_id)


def analyze_mission_impact_shadow(
    satellite_id: str,
    raw_telemetry: Dict[str, Any],
    norm_payload: Optional[Dict[str, Any]] = None,
    timestamp: Optional[float] = None,
    root_cause_context: Optional[Dict[str, Any]] = None,
    is_anomaly_detected: Optional[bool] = None
) -> Dict[str, Any]:
    """
    Executes non-blocking shadow mission impact assessment for the active satellite.
    Guarantees safe fallback on any telemetry irregularity, insufficient fields, or runtime exception.
    """
    sat_id = str(satellite_id or raw_telemetry.get("satellite_id", "SAT-001")).strip()

    # 1. Fallback if engine unavailable
    if not MISSION_IMPACT_ENGINE_AVAILABLE:
        return _build_fallback_response(
            sat_id,
            impact_level="NOMINAL",
            capabilities=["UNKNOWN / UNVERIFIED"],
            primary_impact="Mission impact engine unavailable; assessment skipped.",
            urgency="ROUTINE",
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
            impact_level="LOW",
            capabilities=["UNKNOWN / UNVERIFIED"],
            primary_impact="Assessment constrained: insufficient corroborating telemetry channels provided.",
            urgency="WATCH",
            data_quality="INSUFFICIENT"
        )

    # 3. Execute isolated mission impact evaluation
    try:
        engine = get_mission_impact_engine()
        if engine is None:
            return _build_fallback_response(
                sat_id,
                impact_level="NOMINAL",
                capabilities=["UNKNOWN / UNVERIFIED"],
                primary_impact="Mission impact engine instance unavailable.",
                urgency="ROUTINE",
                data_quality="UNAVAILABLE"
            )

        payload_to_analyze = norm_payload if norm_payload is not None else raw_telemetry
        assessment = engine.assess_impact(
            telemetry=payload_to_analyze,
            satellite_id=sat_id,
            timestamp=timestamp,
            root_cause_context=root_cause_context,
            is_anomaly_detected=is_anomaly_detected
        )
        return assessment.to_dict()

    except Exception as e:
        logger.warning(f"[MissionImpact Shadow Exception] {e}")
        return _build_fallback_response(
            sat_id,
            impact_level="LOW",
            capabilities=["UNKNOWN / UNVERIFIED"],
            primary_impact=f"Mission impact assessment exception: {e}",
            urgency="ROUTINE",
            data_quality="DEGRADED"
        )


def _build_fallback_response(
    sat_id: str,
    impact_level: str,
    capabilities: list,
    primary_impact: str,
    urgency: str,
    data_quality: str
) -> Dict[str, Any]:
    return {
        "satellite_id": sat_id,
        "mission_impact_level": impact_level,
        "affected_capabilities": capabilities,
        "primary_operational_impact": primary_impact,
        "potential_mission_consequences": [
            "Operator visibility constrained due to telemetry stream or engine limitations."
        ],
        "impacted_subsystems": ["TELEMETRY_PROCESSING"],
        "risk_drivers": ["Insufficient multi-channel data or shadow analysis exception."],
        "persistence": "UNAVAILABLE",
        "trend_summary": "Unavailable",
        "urgency": urgency,
        "recommended_operator_response": [
            "Verify telemetry downlink stream and sensor communication interface.",
            "Maintain standard routine telemetry monitoring."
        ],
        "root_cause_context": {},
        "data_quality": data_quality,
        "analysis_method": "Deterministic Subsystem Capability & Mission Dependency Matrix (Shadow Layer)",
        "limitations": (
            "Mission impact assessment is a telemetry-grounded operational risk assessment "
            "for decision support. It does not represent a validated flight-certification model."
        )
    }
