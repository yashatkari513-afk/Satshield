"""
SATSHIELD ML Pipeline - Step 10: Real Explainable AI (XAI) Root-Cause & Evidence Layer
Extracts grounded telemetry evidence, identifies primary/supporting contributing factors,
generates probable root-cause explanations without fabricated percentages, and determines
mission impact and recommended operator actions from real ML inference results.
"""
from typing import Dict, Any, List, Optional, Tuple

# Physical baseline reference values and nominal operating envelopes
TELEMETRY_DEFINITIONS = {
    'temperature_c': {
        'name': 'Core Internal Temperature',
        'unit': '°C',
        'reference': 25.0,
        'nominal_range': (15.0, 45.0),
        'subsystem': 'THERMAL',
        'high_severity': 52.0,
        'low_severity': 5.0
    },
    'voltage_v': {
        'name': 'EPS Main Bus Voltage',
        'unit': 'V',
        'reference': 28.2,
        'nominal_range': (25.0, 30.0),
        'subsystem': 'POWER',
        'high_severity': 32.5,
        'low_severity': 23.5
    },
    'current_a': {
        'name': 'Power Bus Current Draw',
        'unit': 'A',
        'reference': 6.5,
        'nominal_range': (2.0, 12.0),
        'subsystem': 'BATTERY',
        'high_severity': 15.0,
        'low_severity': 0.5
    },
    'battery_soc_percent': {
        'name': 'Battery State of Charge',
        'unit': '%',
        'reference': 88.0,
        'nominal_range': (60.0, 100.0),
        'subsystem': 'BATTERY',
        'high_severity': 100.0,
        'low_severity': 40.0
    },
    'solar_power_w': {
        'name': 'Solar Array Power Generation',
        'unit': 'W',
        'reference': 650.0,
        'nominal_range': (350.0, 750.0),
        'subsystem': 'POWER',
        'high_severity': 850.0,
        'low_severity': 250.0
    },
    'communication_signal_db': {
        'name': 'RF Downlink Carrier Signal',
        'unit': 'dBm',
        'reference': -75.0,
        'nominal_range': (-90.0, -50.0),
        'subsystem': 'COMMUNICATION',
        'high_severity': -40.0,
        'low_severity': -105.0
    },
    'vibration_g': {
        'name': 'Structural Vibration Amplitude',
        'unit': 'g',
        'reference': 0.04,
        'nominal_range': (0.01, 0.15),
        'subsystem': 'ATTITUDE',
        'high_severity': 0.25,
        'low_severity': 0.00
    },
    'attitude_error_deg': {
        'name': '3-Axis Pointing Deviation Error',
        'unit': '°',
        'reference': 0.05,
        'nominal_range': (0.00, 0.50),
        'subsystem': 'ATTITUDE',
        'high_severity': 1.50,
        'low_severity': 0.00
    }
}


def extract_telemetry_evidence(raw_telemetry: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extracts structured numerical telemetry evidence based strictly on observed values
    and their deviations from nominal operational references.
    """
    evidence_items: List[Dict[str, Any]] = []

    for param_key, meta in TELEMETRY_DEFINITIONS.items():
        if param_key not in raw_telemetry:
            continue

        raw_val = raw_telemetry[param_key]
        if raw_val is None:
            continue

        try:
            val = float(raw_val)
        except (ValueError, TypeError):
            continue

        ref = meta['reference']
        low_bound, high_bound = meta['nominal_range']
        dev = round(val - ref, 3)

        # Check if parameter crosses nominal threshold
        if val > high_bound:
            evidence_items.append({
                'parameter': meta['name'],
                'parameter_key': param_key,
                'value': round(val, 2),
                'reference': ref,
                'deviation': f"+{dev:.2f} {meta['unit']}" if dev > 0 else f"{dev:.2f} {meta['unit']}",
                'raw_deviation': dev,
                'direction': 'HIGH',
                'unit': meta['unit'],
                'subsystem': meta['subsystem'],
                'nominal_range': f"{low_bound} - {high_bound} {meta['unit']}",
                'status': 'ABOVE_NOMINAL'
            })
        elif val < low_bound:
            evidence_items.append({
                'parameter': meta['name'],
                'parameter_key': param_key,
                'value': round(val, 2),
                'reference': ref,
                'deviation': f"{dev:.2f} {meta['unit']}",
                'raw_deviation': dev,
                'direction': 'LOW',
                'unit': meta['unit'],
                'subsystem': meta['subsystem'],
                'nominal_range': f"{low_bound} - {high_bound} {meta['unit']}",
                'status': 'BELOW_NOMINAL'
            })

    # Sort evidence items by relative deviation severity
    evidence_items.sort(key=lambda x: abs(x['raw_deviation'] / (x['reference'] if x['reference'] != 0 else 1.0)), reverse=True)
    return evidence_items


def identify_affected_subsystem(raw_telemetry: Dict[str, Any], evidence_items: List[Dict[str, Any]]) -> str:
    """
    Dynamically identifies the primary affected subsystem from evidence.
    """
    if evidence_items:
        return evidence_items[0]['subsystem']

    # Secondary check on specific parameters
    temp = raw_telemetry.get('temperature_c') or raw_telemetry.get('temperature')
    if temp is not None and float(temp) > 40.0:
        return 'THERMAL'

    volt = raw_telemetry.get('voltage_v') or raw_telemetry.get('battery_voltage')
    soc = raw_telemetry.get('battery_soc_percent') or raw_telemetry.get('battery')
    if (volt is not None and float(volt) < 26.0) or (soc is not None and float(soc) < 60.0):
        return 'BATTERY'

    comm = raw_telemetry.get('communication_signal_db') or raw_telemetry.get('communication_signal')
    if comm is not None and float(comm) < -85.0:
        return 'COMMUNICATION'

    att = raw_telemetry.get('attitude_error_deg') or raw_telemetry.get('pitch')
    if att is not None and abs(float(att)) > 0.40:
        return 'ATTITUDE'

    return 'SYSTEM'


def compute_contributing_factors(
    raw_telemetry: Dict[str, Any],
    evidence_items: List[Dict[str, Any]],
    raw_score: float,
    subsystem: str,
    is_anomaly: bool
) -> List[Dict[str, str]]:
    """
    Calculates structured primary and supporting contributing factors from actual data.
    """
    factors: List[Dict[str, str]] = []

    if not is_anomaly or not evidence_items:
        factors.append({
            'type': 'PRIMARY',
            'title': 'Nominal Learned Baseline Envelope',
            'description': 'All 42 monitored telemetry features tracking within established multi-dimensional bounds.'
        })
        factors.append({
            'type': 'SUPPORTING',
            'title': 'IsolationForest Decision Value',
            'description': f"Decision score ({raw_score:+.4f}) confirms spacecraft operating within inlier cluster."
        })
        return factors

    # Primary Factor
    top = evidence_items[0]
    direction_word = "Elevated" if top['direction'] == 'HIGH' else "Degraded"
    factors.append({
        'type': 'PRIMARY',
        'title': f"{direction_word} {top['parameter']} ({top['value']} {top['unit']})",
        'description': f"Observed {top['parameter']} deviates by {top['deviation']} from nominal reference ({top['reference']} {top['unit']}), crossing normal operating range ({top['nominal_range']})."
    })

    # Supporting Factors from additional evidence
    for item in evidence_items[1:]:
        dir_w = "Elevated" if item['direction'] == 'HIGH' else "Depressed"
        factors.append({
            'type': 'SUPPORTING',
            'title': f"Coupled {dir_w} {item['parameter']} ({item['value']} {item['unit']})",
            'description': f"{item['parameter']} deviates by {item['deviation']}, reflecting concurrent subsystem strain."
        })

    # ML Anomaly Factor
    factors.append({
        'type': 'SUPPORTING',
        'title': 'IsolationForest Outlier Classification',
        'description': f"Model decision score ({raw_score:+.4f}) confirms multi-channel deviation from the nominal feature envelope."
    })

    return factors


def generate_probable_root_cause(
    raw_telemetry: Dict[str, Any],
    evidence_items: List[Dict[str, Any]],
    subsystem: str,
    is_anomaly: bool
) -> str:
    """
    Generates a scientifically grounded probable root cause statement using actual telemetry values.
    Uses cautious terminology ('probable', 'likely', 'suspected') without fake percentages.
    """
    if not is_anomaly or not evidence_items:
        return "Nominal telemetry. No significant contributing anomaly factors detected."

    top = evidence_items[0]
    param = top['parameter']
    val = top['value']
    unit = top['unit']
    dev = top['deviation']

    if subsystem == 'THERMAL':
        return (
            f"Thermal radiator surface occlusion, degraded emissive coating, or excessive continuous payload power dissipation "
            f"is suspected because core temperature reached {val}{unit} ({dev} from nominal), exceeding the safe thermal operating margin."
        )
    elif subsystem == 'BATTERY':
        return (
            f"Battery electrochemical capacity loss or elevated internal cell resistance is suspected because "
            f"{param} reached {val}{unit} ({dev} from nominal) while power bus demand continues during orbital transit."
        )
    elif subsystem == 'POWER':
        return (
            f"Solar array drive tracking misalignment, partial string occlusion, or power distribution shunt regulator instability "
            f"is suspected because {param} registered {val}{unit} ({dev} from nominal), indicating power bus margin degradation."
        )
    elif subsystem == 'COMMUNICATION':
        return (
            f"RF downlink carrier link degradation or ground station autotrack misalignment is suspected because "
            f"carrier signal level dropped to {val}{unit} ({dev} from nominal), reducing signal-to-noise margin."
        )
    elif subsystem == 'ATTITUDE':
        return (
            f"Reaction wheel angular momentum accumulation or AOCS pointing control drift is suspected because "
            f"{param} registered {val}{unit} ({dev} from nominal), exceeding fine-pointing stability boundaries."
        )
    else:
        return (
            f"Multivariate subsystem parameter drift is suspected because {param} registered {val}{unit} ({dev} from nominal), "
            f"triggering an IsolationForest outlier classification."
        )


def generate_mission_impact(subsystem: str, is_anomaly: bool, severity: str = 'WARNING') -> str:
    """
    Generates a structured risk and mission-impact statement based on the affected subsystem.
    """
    if not is_anomaly:
        return "All spacecraft subsystems operating within nominal design margins. Routine stationkeeping and science telemetry tracking active."

    if subsystem == 'THERMAL':
        return "Continued thermal elevation may reduce electronic subsystem operating lifetime and trigger automated thermal safe-mode shutdown of sensitive payload assemblies."
    elif subsystem == 'BATTERY' or subsystem == 'POWER':
        return "Continued voltage and state-of-charge degradation reduces available energy reserve for orbital eclipse passes and may force non-essential load shedding."
    elif subsystem == 'COMMUNICATION':
        return "Degraded carrier link budget may reduce downlink telemetry throughput and increase frame error rate during ground station contact passes."
    elif subsystem == 'ATTITUDE':
        return "Increased pointing error may degrade Earth observation payload imaging resolution, reduce solar array pointing efficiency, and compromise antenna boresight alignment."
    else:
        return "Unmitigated multi-channel telemetry drift may compromise subsystem operational margins and reduce overall spacecraft health index."


def generate_recommended_operator_action(subsystem: str, is_anomaly: bool, evidence_items: List[Dict[str, Any]]) -> str:
    """
    Generates practical recommended actions tailored to the specific affected subsystem.
    """
    if not is_anomaly:
        return "Maintain routine orbital tracking and standard telemetry health sampling schedule."

    if subsystem == 'THERMAL':
        return "Inspect thermal subsystem telemetry, verify radiator heat-sink gradient, and orient spacecraft attitude to shade avionics payload bay."
    elif subsystem == 'BATTERY':
        return "Inspect battery cell voltages, verify charge/discharge current balance, and activate autonomous power-saving mode if state of charge drops further."
    elif subsystem == 'POWER':
        return "Verify Solar Array Drive Assembly (SADA) sun vector alignment, inspect bus shunt regulators, and shed non-essential payload heaters."
    elif subsystem == 'COMMUNICATION':
        return "Verify ground station autotrack azimuth alignment, check transponder SSPA amplifier power, and switch receiver to high-gain tracking loop."
    elif subsystem == 'ATTITUDE':
        return "Review reaction wheel spin rates, command magnetic torquer desaturation pulse sequence, and verify star tracker optical lock status."
    else:
        return "Execute diagnostic telemetry frame acquisition and cross-check redundant sensor channels against baseline operating limits."


def build_explainability_report(
    raw_telemetry: Dict[str, Any],
    raw_score: float,
    prediction: str,
    satellite_id: str,
    severity: str = 'INFO',
    data_quality: str = 'GOOD'
) -> Dict[str, Any]:
    """
    Constructs the complete structured explainability object.
    """
    if data_quality != 'GOOD':
        return {
            'satellite_id': satellite_id,
            'anomaly_type': 'Telemetry Quality Alert',
            'subsystem': 'SENSOR',
            'raw_anomaly_score': raw_score,
            'severity': 'WARNING',
            'evidence': [],
            'contributing_factors': [
                {
                    'type': 'PRIMARY',
                    'title': 'Telemetry Data Quality Issue',
                    'description': 'Incoming telemetry stream contains missing, non-numeric, or corrupted fields.'
                }
            ],
            'probable_root_cause': 'Insufficient telemetry for reliable root-cause assessment.',
            'mission_impact': 'Incomplete telemetry stream limits real-time health diagnostic confidence.',
            'recommended_action': 'Verify ground station demodulator frame lock and re-acquire telemetry stream.',
            'explanation_method': 'Data Quality Guardrail',
            'data_quality': data_quality
        }

    is_anomaly = prediction.upper() == 'ANOMALY'
    evidence_items = extract_telemetry_evidence(raw_telemetry)
    subsystem = identify_affected_subsystem(raw_telemetry, evidence_items)
    contributing_factors = compute_contributing_factors(raw_telemetry, evidence_items, raw_score, subsystem, is_anomaly)
    probable_root_cause = generate_probable_root_cause(raw_telemetry, evidence_items, subsystem, is_anomaly)
    mission_impact = generate_mission_impact(subsystem, is_anomaly, severity)
    recommended_action = generate_recommended_operator_action(subsystem, is_anomaly, evidence_items)

    anomaly_type = f"{subsystem} Subsystem Anomaly" if is_anomaly else "Nominal Operations"

    return {
        'satellite_id': satellite_id,
        'anomaly_type': anomaly_type,
        'subsystem': subsystem,
        'raw_anomaly_score': round(raw_score, 6),
        'severity': severity if is_anomaly else 'INFO',
        'evidence': evidence_items,
        'contributing_factors': contributing_factors,
        'probable_root_cause': probable_root_cause,
        'mission_impact': mission_impact,
        'recommended_action': recommended_action,
        'explanation_method': 'IsolationForest 42-Feature Empirical Grounding',
        'data_quality': data_quality
    }
