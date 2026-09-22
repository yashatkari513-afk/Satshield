"""
SATSHIELD ML Pipeline - Step 26: AI Mission Assistant Decision-Support Service
Deterministic, explainable, and telemetry-grounded mission assistant for satellite health analysis.

Core Principles:
1. Decision-Support Only: Does not issue autonomous spacecraft commands or execute SET actions.
2. 100% Context-Grounded: All answers derived strictly from current telemetry, real IsolationForest scores,
   XAI evidence, Step 22 root-cause shadow analysis, Step 23 mission impact shadow analysis, and
   Step 11 predictive maintenance ETT projections.
3. Scientific Honesty: Uses "Telemetry-grounded probable root cause", "Estimated Time to Operational Threshold",
   and explicitly avoids unvalidated failure probabilities or guaranteed failure times.
4. Satellite Isolation: Strictly isolated per satellite ID with zero cross-vehicle state bleed.
5. Insufficient Data Handling: Explicitly returns "N/A — insufficient evidence" when data is unavailable.
"""

import os
import sys
import re
import math
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone

# Add parent directory for module resolution
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from satshield_ml.ml_service import run_ml_inference, normalize_telemetry_payload
from satshield_ml.predictive_maintenance import analyze_predictive_maintenance
from satshield_ml.root_cause_service import analyze_root_cause_shadow
from satshield_ml.mission_impact_service import analyze_mission_impact_shadow

# Nominal envelopes for reference & margin computations
PHYSICAL_LIMITS = {
    'temperature_c': {'min': 10.0, 'max': 45.0, 'nominal': 25.0, 'unit': '°C', 'name': 'Avionics Temperature'},
    'voltage_v': {'min': 26.0, 'max': 32.0, 'nominal': 28.2, 'unit': 'V', 'name': 'EPS Bus Voltage'},
    'current_a': {'min': 2.0, 'max': 12.0, 'nominal': 5.8, 'unit': 'A', 'name': 'Bus Current Draw'},
    'battery_soc_percent': {'min': 65.0, 'max': 100.0, 'nominal': 88.0, 'unit': '%', 'name': 'Battery State of Charge'},
    'solar_power_w': {'min': 400.0, 'max': 800.0, 'nominal': 550.0, 'unit': 'W', 'name': 'Solar Array Power'},
    'communication_signal_db': {'min': -85.0, 'max': -50.0, 'nominal': -68.0, 'unit': 'dBm', 'name': 'RF Downlink Signal'},
    'vibration_g': {'min': 0.0, 'max': 0.12, 'nominal': 0.04, 'unit': 'g', 'name': 'Structural Vibration'},
    'attitude_error_deg': {'min': 0.0, 'max': 0.50, 'nominal': 0.08, 'unit': '°', 'name': 'Attitude Pointing Error'}
}

SATELLITE_NAMES = {
    'SAT-001': 'AGIS-3',
    'SAT-002': 'SENTINEL-9',
    'SAT-003': 'ORBCOM-7',
    'SAT-004': 'HELIOS-1',
    'AGIS-3': 'AGIS-3',
    'SENTINEL-9': 'SENTINEL-9',
    'ORBCOM-7': 'ORBCOM-7',
    'HELIOS-1': 'HELIOS-1',
}


def extract_telemetry_snapshot(norm_payload: Dict[str, Any]) -> Dict[str, float]:
    """Extracts numeric telemetry channels safely."""
    snapshot = {}
    for k in PHYSICAL_LIMITS.keys():
        val = norm_payload.get(k)
        if val is not None:
            try:
                fval = float(val)
                if not (math.isnan(fval) or math.isinf(fval)):
                    snapshot[k] = round(fval, 2)
            except (ValueError, TypeError):
                pass
    return snapshot


def build_satellite_context(
    satellite_id: str,
    raw_telemetry: Optional[Dict[str, Any]] = None,
    ml_result_override: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Constructs unified, fully grounded satellite context combining:
    - Normalization
    - IsolationForest inference
    - XAI Explainability
    - Step 22 Root-Cause analysis
    - Step 23 Mission Impact analysis
    - Step 11 Predictive Maintenance
    """
    sat_id = satellite_id or "SAT-001"
    sat_name = SATELLITE_NAMES.get(sat_id, sat_id)
    telem = raw_telemetry or {}

    try:
        norm_payload = normalize_telemetry_payload(telem, sat_id)
    except Exception:
        norm_payload = {'satellite_id': sat_id, 'timestamp': datetime.now(timezone.utc).isoformat()}

    # Use existing ML result if provided, else execute live ML inference pipeline
    if ml_result_override and isinstance(ml_result_override, dict) and 'raw_anomaly_score' in ml_result_override:
        ml_res = ml_result_override
    else:
        ml_res = run_ml_inference(norm_payload, sat_id)

    snapshot = extract_telemetry_snapshot(norm_payload)
    is_anomaly = ml_res.get('prediction') == 'ANOMALY'
    raw_score = ml_res.get('raw_anomaly_score', 0.0)

    rc = ml_res.get('root_cause_analysis') or {}
    mi = ml_res.get('mission_impact_analysis') or {}
    pm = ml_res.get('predictive_maintenance') or {}

    # Check physical input richness
    present_physical_keys = [
        k for k, v in telem.items()
        if v is not None and k not in {'satellite_id', 'satId', 'id', 'subsystem', 'timestamp', 'name', 'satellite_name'}
    ]
    if len(present_physical_keys) < 3:
        data_quality = "INSUFFICIENT"
    else:
        data_quality = ml_res.get('data_quality', 'GOOD')

    rec_ops = mi.get('recommended_operator_response') or []
    default_act = rec_ops[0] if len(rec_ops) > 0 else 'Maintain routine monitoring.'

    return {
        'satellite_id': sat_id,
        'satellite_name': sat_name,
        'is_anomaly': is_anomaly,
        'prediction': ml_res.get('prediction', 'NORMAL'),
        'raw_anomaly_score': raw_score,
        'subsystem': ml_res.get('subsystem', 'SYSTEM'),
        'data_quality': data_quality,
        'evidence': ml_res.get('evidence', []),
        'contributing_factors': ml_res.get('contributing_factors', []),
        'probable_root_cause': ml_res.get('probable_root_cause') or rc.get('primary_probable_cause', 'Nominal operations.'),
        'root_cause_analysis': rc,
        'mission_impact_analysis': mi,
        'predictive_maintenance': pm,
        'risk_level': pm.get('risk_level') or ml_res.get('risk_level', 'NOMINAL'),
        'early_warning': pm.get('early_warning') or ml_res.get('early_warning', 'Nominal.'),
        'estimated_time_formatted': pm.get('estimated_time_formatted') or ml_res.get('estimated_time_formatted', 'N/A'),
        'recommended_action': ml_res.get('recommended_action') or default_act,
        'telemetry_snapshot': snapshot,
        'raw_payload': norm_payload,
    }


def classify_question_intent(question: str) -> str:
    """Classifies user natural-language questions into deterministic intent categories."""
    q = question.strip().lower()

    if not q:
        return "EMPTY"

    # 1. Safety refusal / command execution
    if re.search(r'\b(fix|repair|reboot|command|execute|override|shutdown|kill|fire|thruster|set\s+action)\b', q):
        if not re.search(r'\b(why|what|explain|how)\b', q):
            return "COMMAND_REQUEST"

    # 2. Health & Summary questions
    if re.search(r'\b(why.*(unhealthy|flagged|alarm|bad|broken|anomaly|risk|critical|warning))\b', q):
        return "WHY_UNHEALTHY"
    if re.search(r'\b(is.*safe|is.*healthy|is.*nominal|status|health\s*summary|summarize)\b', q):
        return "HEALTH_SUMMARY"
    if re.search(r'\b(what\s+anomaly|why\s+flagged|anomaly\s+detected)\b', q):
        return "ANOMALY_EXPLANATION"

    # 3. Root Cause questions
    if re.search(r'\b(root\s*cause|what.*causing|source\s+of|why.*happening|origin|subsystem.*failing)\b', q):
        return "ROOT_CAUSE"

    # 4. Mission Impact questions
    if re.search(r'\b(mission\s*impact|operational\s*impact|consequence|how\s+serious|urgency|capabilities?\s*affected)\b', q):
        return "MISSION_IMPACT"

    # 5. Predictive / Trend / ETT questions
    if re.search(r'\b(when.*fail|when.*threshold|ett|time\s*to|degrad|getting\s*worse|trend|faster|fastest|slope|trajectory)\b', q):
        return "PREDICTIVE_TREND"
    if re.search(r'\b(margin|thermal\s*margin|voltage\s*margin|battery\s*margin|headroom)\b', q):
        return "MARGINS"

    # 6. Specific Parameter questions
    if re.search(r'\b(temp|temperature|thermal|heat|hot)\b', q):
        return "PARAM_TEMPERATURE"
    if re.search(r'\b(volt|voltage|eps|bus\s*voltage)\b', q):
        return "PARAM_VOLTAGE"
    if re.search(r'\b(current|amperage|amp|amps|power\s*draw)\b', q):
        return "PARAM_CURRENT"
    if re.search(r'\b(battery|soc|charge|deplet)\b', q):
        return "PARAM_BATTERY"
    if re.search(r'\b(solar|array|photovoltaic|sun\s*power)\b', q):
        return "PARAM_SOLAR"
    if re.search(r'\b(signal|comm|communication|downlink|rf|dbm)\b', q):
        return "PARAM_COMM"
    if re.search(r'\b(attitude|pointing|adcs|aocs|drift|gyro|degrees?)\b', q):
        return "PARAM_ATTITUDE"
    if re.search(r'\b(vibration|jitter|structural|g-force)\b', q):
        return "PARAM_VIBRATION"

    # 7. Action / What to do questions
    if re.search(r'\b(what\s*should|how\s*to\s*respond|mitigat|operator\s*action|recommendation|advice)\b', q):
        return "OPERATOR_ACTION"

    # 8. AI/ML technical proof questions
    if re.search(r'\b(model|isolation\s*forest|score|feature|algorithm|dataset|how\s+does\s+ai)\b', q):
        return "ML_EXPLANATION"

    return "GENERAL_QUERY"


class AIMissionAssistant:
    """Deterministic, context-grounded AI Mission Assistant."""

    def __init__(self):
        pass

    def answer_question(
        self,
        question: str,
        satellite_id: str = "SAT-001",
        raw_telemetry: Optional[Dict[str, Any]] = None,
        ml_result_override: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Processes user question against current satellite context and returns a structured response."""
        context = build_satellite_context(satellite_id, raw_telemetry, ml_result_override)
        intent = classify_question_intent(question)
        sat_name = context['satellite_name']
        sat_id = context['satellite_id']

        # Handle Insufficient / Degraded Telemetry Check
        if context.get('data_quality') in ('INSUFFICIENT', 'INVALID_INPUT') or len(context['telemetry_snapshot']) == 0:
            return {
                "satellite_id": sat_id,
                "satellite_name": sat_name,
                "question": question,
                "intent": intent,
                "answer": f"N/A — Insufficient telemetry evidence available for {sat_name}. Telemetry stream is missing or incomplete.",
                "risk_level": "NOMINAL",
                "evidence": ["No valid numerical telemetry channels detected."],
                "prediction": {"status": "ERROR", "score": 0.0, "estimated_time_to_threshold": "N/A"},
                "root_cause": {"subsystem": "AMBIGUOUS", "probable_cause": "N/A — insufficient telemetry.", "strength": "AMBIGUOUS"},
                "mission_impact": {"impact_level": "LOW", "operational_consequences": ["Telemetry unavailable."], "urgency": "ROUTINE"},
                "recommended_action": "Restore telemetry downlink reception and re-evaluate spacecraft health.",
                "data_quality": "INSUFFICIENT",
                "method": "Telemetry-grounded SATSHIELD decision-support analysis",
                "disclaimer": "Synthetic / simulated telemetry — demonstration and validation dataset."
            }

        # Route to Intent Handlers
        if intent == "COMMAND_REQUEST":
            ans, ev = self._handle_command_safety(context)
        elif intent == "WHY_UNHEALTHY":
            ans, ev = self._handle_why_unhealthy(context)
        elif intent == "HEALTH_SUMMARY":
            ans, ev = self._handle_health_summary(context)
        elif intent == "ANOMALY_EXPLANATION":
            ans, ev = self._handle_anomaly_explanation(context)
        elif intent == "ROOT_CAUSE":
            ans, ev = self._handle_root_cause(context)
        elif intent == "MISSION_IMPACT":
            ans, ev = self._handle_mission_impact(context)
        elif intent == "PREDICTIVE_TREND":
            ans, ev = self._handle_predictive_trend(context)
        elif intent == "MARGINS":
            ans, ev = self._handle_margins(context)
        elif intent.startswith("PARAM_"):
            param_key = intent.replace("PARAM_", "").lower()
            ans, ev = self._handle_parameter_query(param_key, context)
        elif intent == "OPERATOR_ACTION":
            ans, ev = self._handle_operator_action(context)
        elif intent == "ML_EXPLANATION":
            ans, ev = self._handle_ml_explanation(context)
        else:
            ans, ev = self._handle_general_query(question, context)

        # Assemble Standardized Response Structure
        rc_data = context.get('root_cause_analysis') or {}
        mi_data = context.get('mission_impact_analysis') or {}
        pm_data = context.get('predictive_maintenance') or {}

        return {
            "satellite_id": sat_id,
            "satellite_name": sat_name,
            "question": question,
            "intent": intent,
            "answer": ans,
            "risk_level": context['risk_level'],
            "evidence": ev or context.get('evidence', []),
            "prediction": {
                "status": context['prediction'],
                "score": context['raw_anomaly_score'],
                "estimated_time_to_threshold": context['estimated_time_formatted']
            },
            "root_cause": {
                "subsystem": rc_data.get('affected_subsystem', context['subsystem']),
                "probable_cause": rc_data.get('primary_probable_cause', context['probable_root_cause']),
                "strength": rc_data.get('evidence_strength', 'NOMINAL' if not context['is_anomaly'] else 'MODERATE')
            },
            "mission_impact": {
                "impact_level": mi_data.get('mission_impact_level', 'LOW' if not context['is_anomaly'] else 'HIGH'),
                "operational_consequences": mi_data.get('potential_mission_consequences', ["Routine telemetry monitoring."]),
                "urgency": mi_data.get('urgency', 'ROUTINE')
            },
            "recommended_action": context['recommended_action'],
            "data_quality": context['data_quality'],
            "method": "Telemetry-grounded SATSHIELD decision-support analysis",
            "disclaimer": "Synthetic / simulated telemetry — demonstration and validation dataset."
        }

    # =========================================================================
    # INTENT HANDLERS (STRICTLY GROUNDED IN CONTEXT)
    # =========================================================================

    def _handle_command_safety(self, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        action = ctx['recommended_action']
        ans = (
            f"I cannot autonomously command {sat}. As an AI decision-support assistant, I do not possess direct spacecraft control authority.\n\n"
            f"Recommended Operator Action:\n• {action}\n\n"
            f"Please verify ground telemetry pass verification before confirming mitigation in the Mission Control Console."
        )
        return ans, ["Autonomous command execution prohibited by flight safety constraints."]

    def _handle_why_unhealthy(self, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        if not ctx['is_anomaly']:
            return (
                f"{sat} is currently operating within nominal multi-dimensional baseline parameters.\n\n"
                f"• Anomaly State: NOMINAL (Raw IsolationForest Score: {ctx['raw_anomaly_score']:+.4f})\n"
                f"• Operational Risk: {ctx['risk_level']}\n"
                f"• Subsystem Status: All 8 primary telemetry channels tracking inside flight operational limits.",
                ["Telemetry features within nominal inlier envelope."]
            )

        ev_lines = "\n".join([f"• {e}" for e in ctx['evidence']]) if ctx['evidence'] else "• Multi-feature deviation detected across operational envelope."
        rc = ctx['root_cause_analysis'].get('primary_probable_cause', ctx['probable_root_cause'])
        ett = ctx['estimated_time_formatted']
        act = ctx['recommended_action']

        ans = (
            f"Risk: {ctx['risk_level']} | Subsystem: {ctx['subsystem']}\n\n"
            f"Primary Reason:\n{rc}\n\n"
            f"Telemetry Evidence:\n{ev_lines}\n\n"
            f"Trend & Timing Projection:\n• Estimated Time to Operational Threshold: {ett}\n"
            f"• IsolationForest Outlier Score: {ctx['raw_anomaly_score']:+.4f}\n\n"
            f"Recommended Action:\n{act}"
        )
        return ans, ctx['evidence']

    def _handle_health_summary(self, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        snap = ctx['telemetry_snapshot']
        state = "ANOMALY DETECTED" if ctx['is_anomaly'] else "NOMINAL OPERATIONS"
        score = ctx['raw_anomaly_score']

        lines = [
            f"Health Summary for {sat} ({ctx['satellite_id']}):",
            f"• Operational State: {state}",
            f"• Model Score: {score:+.4f} ({'Outlier' if ctx['is_anomaly'] else 'Inlier'})",
            f"• Risk Level: {ctx['risk_level']}",
            f"• Estimated Time to Threshold: {ctx['estimated_time_formatted']}",
            "",
            "Telemetry Snapshot:"
        ]
        for k, v in snap.items():
            info = PHYSICAL_LIMITS.get(k, {})
            name = info.get('name', k)
            unit = info.get('unit', '')
            lines.append(f"  - {name}: {v} {unit}")

        return "\n".join(lines), ctx['evidence']

    def _handle_anomaly_explanation(self, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        if not ctx['is_anomaly']:
            return (
                f"No anomaly is currently detected on {sat}. The IsolationForest model classified the current 42-feature telemetry vector as an inlier with a score of {ctx['raw_anomaly_score']:+.4f}.",
                ["No anomalous telemetry detected."]
            )

        ev_lines = "\n".join([f"• {e}" for e in ctx['evidence']])
        ans = (
            f"Anomaly Detection Details for {sat}:\n\n"
            f"• Classification: ANOMALY (IsolationForest 42-Feature Ensemble)\n"
            f"• Raw Outlier Decision Score: {ctx['raw_anomaly_score']:+.4f} (Negative indicates out-of-distribution state)\n"
            f"• Impacted Subsystem: {ctx['subsystem']}\n"
            f"• Probable Root Cause: {ctx['root_cause_analysis'].get('primary_probable_cause', ctx['probable_root_cause'])}\n\n"
            f"Physical Evidence Items:\n{ev_lines}"
        )
        return ans, ctx['evidence']

    def _handle_root_cause(self, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        rc = ctx['root_cause_analysis']
        sub = rc.get('affected_subsystem', ctx['subsystem'])
        cause = rc.get('primary_probable_cause', ctx['probable_root_cause'])
        strength = rc.get('evidence_strength', 'MODERATE' if ctx['is_anomaly'] else 'NOMINAL')
        factors = rc.get('contributing_factors', [])
        factors_text = ", ".join(factors) if factors else "Multi-parameter telemetry correlation"
        limitations = rc.get('limitations', "Telemetry-grounded probable root cause based on multi-signal physical correlation; not a confirmed hardware failure.")

        ans = (
            f"Root-Cause Shadow Analysis for {sat}:\n\n"
            f"• Affected Subsystem: {sub}\n"
            f"• Probable Root Cause: {cause}\n"
            f"• Evidence Strength: {strength}\n"
            f"• Contributing Factors: {factors_text}\n\n"
            f"Analysis Grounding:\n{limitations}"
        )
        return ans, rc.get('evidence', ctx['evidence'])

    def _handle_mission_impact(self, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        mi = ctx['mission_impact_analysis']
        level = mi.get('mission_impact_level', 'LOW' if not ctx['is_anomaly'] else 'HIGH')
        urgency = mi.get('urgency', 'ROUTINE')
        op_impact = mi.get('primary_operational_impact', 'Spacecraft capabilities within nominal operational margin.')
        consequences = mi.get('potential_mission_consequences', ['Maintain standard telemetry tracking.'])
        consequences_lines = "\n".join([f"• {c}" for c in consequences])

        ans = (
            f"Mission Impact Assessment for {sat}:\n\n"
            f"• Operational Risk Level: {level}\n"
            f"• Response Urgency: {urgency}\n"
            f"• Primary Consequence:\n{op_impact}\n\n"
            f"Potential Mission Constraints:\n{consequences_lines}\n\n"
            f"Recommended Operator Action:\n• {ctx['recommended_action']}"
        )
        return ans, ctx['evidence']

    def _handle_predictive_trend(self, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        pm = ctx['predictive_maintenance']
        ett = ctx['estimated_time_formatted']
        early_warn = ctx['early_warning']
        trend_status = pm.get('overall_trend', 'STABLE')
        param = pm.get('primary_affected_parameter', 'N/A')

        ans = (
            f"Predictive Maintenance & Trend Projection for {sat}:\n\n"
            f"• Risk State: {ctx['risk_level']}\n"
            f"• Overall Trend Trajectory: {trend_status}\n"
            f"• Primary Degrading Channel: {param}\n"
            f"• Estimated Time to Operational Threshold: {ett}\n\n"
            f"Early Warning Assessment:\n{early_warn}\n\n"
            f"Method: Telemetry-grounded linear regression slope extrapolation (Step 11 Temporal Analyzer)."
        )
        return ans, ctx['evidence']

    def _handle_margins(self, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        snap = ctx['telemetry_snapshot']
        lines = [f"Operational Safety Margins for {sat}:"]

        temp = snap.get('temperature_c')
        if temp is not None:
            max_t = PHYSICAL_LIMITS['temperature_c']['max']
            margin_t = max_t - temp
            lines.append(f"• Thermal Margin: {margin_t:+.1f} °C (Current: {temp:.1f} °C, Upper Threshold: {max_t:.1f} °C)")

        volt = snap.get('voltage_v')
        if volt is not None:
            min_v = PHYSICAL_LIMITS['voltage_v']['min']
            margin_v = volt - min_v
            lines.append(f"• EPS Voltage Margin: {margin_v:+.2f} V (Current: {volt:.2f} V, Lower Threshold: {min_v:.2f} V)")

        soc = snap.get('battery_soc_percent')
        if soc is not None:
            min_soc = PHYSICAL_LIMITS['battery_soc_percent']['min']
            margin_soc = soc - min_soc
            lines.append(f"• Battery Capacity Margin: {margin_soc:+.1f} % (Current: {soc:.1f} %, Lower Threshold: {min_soc:.1f} %)")

        lines.append(f"\nEstimated Time to Operational Threshold: {ctx['estimated_time_formatted']}")
        return "\n".join(lines), ctx['evidence']

    def _handle_parameter_query(self, param_type: str, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        snap = ctx['telemetry_snapshot']

        channel_map = {
            'temperature': 'temperature_c',
            'voltage': 'voltage_v',
            'current': 'current_a',
            'battery': 'battery_soc_percent',
            'solar': 'solar_power_w',
            'comm': 'communication_signal_db',
            'attitude': 'attitude_error_deg',
            'vibration': 'vibration_g'
        }

        key = channel_map.get(param_type)
        if not key or key not in snap:
            return f"Telemetry channel for '{param_type}' is unavailable on {sat}.", []

        val = snap[key]
        limits = PHYSICAL_LIMITS[key]
        min_v, max_v, nom_v = limits['min'], limits['max'], limits['nominal']
        unit = limits['unit']
        name = limits['name']

        is_out = val < min_v or val > max_v
        status = "EXCEEDED LIMIT" if is_out else "NOMINAL"

        ans = (
            f"{name} on {sat}:\n\n"
            f"• Current Telemetry Reading: {val} {unit}\n"
            f"• Flight Operational Envelope: {min_v} to {max_v} {unit} (Nominal Baseline: {nom_v} {unit})\n"
            f"• Status: {status}\n"
            f"• Deviation from Nominal: {val - nom_v:+.2f} {unit}"
        )
        return ans, [f"{name} reading: {val} {unit}"]

    def _handle_operator_action(self, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        act = ctx['recommended_action']
        sub = ctx['subsystem']
        risk = ctx['risk_level']

        ans = (
            f"Recommended Operator Action for {sat}:\n\n"
            f"Current Context: Subsystem={sub} | Risk={risk}\n\n"
            f"Procedure:\n• {act}\n\n"
            f"Execution Steps:\n"
            f"1. Cross-verify multi-station telemetry confirmation.\n"
            f"2. Review auxiliary power / thermal loop status in Subsystems Panel.\n"
            f"3. Utilize Mission Control Console to initiate simulated mitigation (SET workflow)."
        )
        return ans, ctx['evidence']

    def _handle_ml_explanation(self, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        score = ctx['raw_anomaly_score']
        ans = (
            f"SATSHIELD AI Anomaly Detection Architecture:\n\n"
            f"• Active Spacecraft: {sat}\n"
            f"• Algorithm: scikit-learn IsolationForest (150 decision trees, unsupervised ensemble)\n"
            f"• Feature Space: 42 Engineered Features (8 raw channels + 8 deltas + 8 rolling means + 8 rolling stds + 8 nominal z-scores + power draw & net power)\n"
            f"• Current Decision Score: {score:+.4f} (> 0: Inlier / Normal, < 0: Outlier / Anomaly)\n"
            f"• Classification: {ctx['prediction']}\n"
            f"• Shadow Layers: Multi-Signal Root-Cause Correlation (Step 22) + Capability Dependency Mission Impact Matrix (Step 23)"
        )
        return ans, ctx['evidence']

    def _handle_general_query(self, question: str, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
        sat = ctx['satellite_name']
        snap = ctx['telemetry_snapshot']
        ans = (
            f"Context for {sat} ({ctx['satellite_id']}):\n"
            f"• Status: {ctx['prediction']} (Score: {ctx['raw_anomaly_score']:+.4f})\n"
            f"• Risk Level: {ctx['risk_level']}\n"
            f"• Subsystem: {ctx['subsystem']}\n"
            f"• Estimated Time to Threshold: {ctx['estimated_time_formatted']}\n"
            f"• Recommended Action: {ctx['recommended_action']}\n\n"
            f"You can ask me specific questions such as:\n"
            f"- 'Why is {sat} at risk?'\n"
            f"- 'What is the probable root cause?'\n"
            f"- 'What is the mission impact?'\n"
            f"- 'Show current thermal and voltage margins'\n"
            f"- 'What should the operator do?'"
        )
        return ans, ctx['evidence']


# Global Singleton
_mission_assistant_instance: Optional[AIMissionAssistant] = None

def get_mission_assistant() -> AIMissionAssistant:
    global _mission_assistant_instance
    if _mission_assistant_instance is None:
        _mission_assistant_instance = AIMissionAssistant()
    return _mission_assistant_instance


def query_mission_assistant(
    question: str,
    satellite_id: str = "SAT-001",
    raw_telemetry: Optional[Dict[str, Any]] = None,
    ml_result_override: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Helper function to query the AI Mission Assistant."""
    assistant = get_mission_assistant()
    return assistant.answer_question(
        question=question,
        satellite_id=satellite_id,
        raw_telemetry=raw_telemetry,
        ml_result_override=ml_result_override
    )
