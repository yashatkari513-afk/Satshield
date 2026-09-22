"""
FastAPI Request and Response Schemas for SATSHIELD AI API
Defines Pydantic v2 schemas for real ML anomaly detection, 10 anomaly scenarios,
structured anomaly event history, and multi-subsystem telemetry streams.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ----------------- ML Anomaly Schemas -----------------
# ----------------- ML Anomaly Schemas -----------------
class TelemetryInput(BaseModel):
    satellite_id: Optional[str] = Field(default=None, description="Active spacecraft registration identifier (e.g. AGIS-3, SENTINEL-9, SAT-001)")
    subsystem: Optional[str] = Field(default=None, description="Monitored subsystem tag")
    battery_voltage: Optional[float] = Field(default=None, description="Main EPS bus voltage in Volts (nominal: 28.0 - 32.5V)")
    battery_current: Optional[float] = Field(default=None, description="Battery charge/discharge current in Amperes")
    battery_charge: Optional[float] = Field(default=None, description="Battery state of charge in %")
    temperature: Optional[float] = Field(default=None, description="Internal subsystem temperature in Celsius")
    solar_power: Optional[float] = Field(default=None, description="Solar array generated power in Watts")
    communication_signal: Optional[float] = Field(default=None, description="RF carrier link signal in dBm")
    packet_loss: Optional[float] = Field(default=None, description="Downlink packet loss in %")
    pitch: Optional[float] = Field(default=None, description="Attitude pitch angle in degrees")
    yaw: Optional[float] = Field(default=None, description="Attitude yaw angle in degrees")
    roll: Optional[float] = Field(default=None, description="Attitude roll angle in degrees")
    payload_temp: Optional[float] = Field(default=None, description="Payload electronics temperature in Celsius")
    # Canonical 8-field names
    temperature_c: Optional[float] = Field(default=None, description="Core thermal sensor temperature in Celsius")
    voltage_v: Optional[float] = Field(default=None, description="EPS power bus voltage in Volts")
    current_a: Optional[float] = Field(default=None, description="Power bus current draw in Amperes")
    battery_soc_percent: Optional[float] = Field(default=None, description="Battery State of Charge %")
    solar_power_w: Optional[float] = Field(default=None, description="Photovoltaic power in Watts")
    communication_signal_db: Optional[float] = Field(default=None, description="Downlink RF signal in dBm")
    vibration_g: Optional[float] = Field(default=None, description="Accelerometer vibration reading in g")
    attitude_error_deg: Optional[float] = Field(default=None, description="3-axis attitude pointing error in degrees")

    class Config:
        json_schema_extra = {
            "example": {
                "satellite_id": "SAT-001",
                "temperature_c": 24.8,
                "voltage_v": 28.3,
                "current_a": 6.2,
                "battery_soc_percent": 91.5,
                "solar_power_w": 560.0,
                "communication_signal_db": -67.4,
                "vibration_g": 0.042,
                "attitude_error_deg": 0.075
            }
        }

class TelemetrySequenceInput(BaseModel):
    sequence: List[TelemetryInput] = Field(..., description="Ordered list of historical telemetry readings")

class ParameterDeviationInfo(BaseModel):
    parameter: str
    subsystem: str
    observed_value: float
    baseline_mean: float
    normal_range: List[float]
    z_score: float
    rate_of_change: Optional[float] = 0.0
    deviation_direction: str

class AffectedTelemetry(BaseModel):
    parameter: str
    observed: float
    nominal_range: List[float]
    z_score: float
    direction: str

class TelemetryEvidenceItemSchema(BaseModel):
    parameter: str
    parameter_key: Optional[str] = None
    value: float
    reference: float
    deviation: str
    raw_deviation: Optional[float] = None
    direction: str
    unit: str
    subsystem: str
    nominal_range: str
    status: str

class ContributingFactorSchema(BaseModel):
    type: str
    title: str
    description: str

class AnomalyDetectionResponse(BaseModel):
    satellite_id: Optional[str] = None
    status: str
    prediction: Optional[str] = None
    is_anomaly: bool
    anomaly_score: float = Field(..., description="Continuous calibrated anomaly score (0.00 to 1.00)")
    raw_decision_score: Optional[float] = None
    raw_anomaly_score: Optional[float] = None
    confidence: float = Field(default=90.0, description="Model confidence in anomaly pattern (0 to 100%)")
    severity: str = Field(default="INFO", description="INFO, WARNING, CRITICAL")
    subsystem: str = Field(default="POWER", description="POWER, BATTERY, THERMAL, COMMUNICATION, ATTITUDE, PAYLOAD, SENSOR")
    anomaly_type: str = "Nominal Operations"
    model_type: Optional[str] = "IsolationForest"
    model_status: Optional[str] = "trained_model_loaded"
    feature_count: Optional[int] = 42
    affected_parameters: List[str] = Field(default_factory=list)
    affected_telemetry: List[AffectedTelemetry] = Field(default_factory=list)
    parameter_deviations: Optional[Dict[str, Any]] = None
    evidence: List[str] = Field(default_factory=list)
    evidence_items: Optional[List[Dict[str, Any]]] = None
    contributing_factors: Optional[List[Dict[str, str]]] = None
    probable_root_cause: Optional[str] = None
    mission_impact: Optional[str] = None
    explanation: str
    probable_causes: List[str] = Field(default_factory=list)
    recommended_action: str = "Maintain nominal telemetry monitoring."
    explanation_method: Optional[str] = "IsolationForest 42-Feature Empirical Grounding"
    explainability: Optional[Dict[str, Any]] = None
    predictive_maintenance: Optional[Dict[str, Any]] = None
    root_cause_analysis: Optional[Dict[str, Any]] = None
    mission_impact_analysis: Optional[Dict[str, Any]] = None
    risk_level: Optional[str] = "NOMINAL"
    early_warning: Optional[str] = None
    estimated_time_to_threshold: Optional[float] = None
    estimated_time_formatted: Optional[str] = None
    timestamp: str
    model: str = "IsolationForest"
    sanitized_telemetry: Optional[Dict[str, float]] = None
    data_quality: Optional[str] = "GOOD"

class EarlyRiskResponse(BaseModel):
    status: str = "ok"
    risk_level: str
    risk_score: float
    trend_status: str
    overall_trend: Optional[str] = None
    early_warning: bool
    affected_parameters: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    recommended_monitoring: List[str] = Field(default_factory=list)
    isolation_forest_score: Optional[float] = None
    sample_count: Optional[int] = None
    timestamp: Optional[str] = None
    model: str = "TemporalTrendAnalyzer-v2"

class HealthResponse(BaseModel):
    status: str = "ok"
    database: str = "connected"
    ml_model: str = "loaded"
    temporal_analyzer: str = "loaded"
    total_features_monitored: int = 11

# ----------------- Scenario Schemas (Step 5 & 16) -----------------
class ScenarioInfo(BaseModel):
    id: str
    key: str
    name: str
    subsystem: str
    expected_severity: str
    description: str

class ScenarioTriggerRequest(BaseModel):
    scenario_id_or_key: str = Field(..., description="ID (1-10) or scenario key name")
    step: int = Field(default=5, description="Progression step (1=mild, 6=severe)")
    satellite_id: Optional[str] = Field(default="SAT-002", description="Target satellite")

class ScenarioResponse(BaseModel):
    scenario: ScenarioInfo
    satellite_id: str
    telemetry: Dict[str, Any]
    detection: AnomalyDetectionResponse

# ----------------- Anomaly Event History Schemas (Step 14) -----------------
class AnomalyEventRecord(BaseModel):
    id: str
    satellite_id: str
    satellite_name: Optional[str] = None
    timestamp: str
    subsystem: str
    anomaly_type: str
    severity: str
    anomaly_score: float
    confidence: float
    affected_parameters: List[str] = Field(default_factory=list)
    explanation: str
    probable_cause: Optional[str] = None
    recommended_action: str
    status: str
    created_at: Optional[str] = None

class AnomalyLogCreateRequest(BaseModel):
    satellite_id: str
    satellite_name: Optional[str] = None
    subsystem: str
    anomaly_type: str
    severity: str
    anomaly_score: float
    confidence: float
    affected_parameters: List[str] = Field(default_factory=list)
    explanation: str
    probable_cause: Optional[str] = None
    recommended_action: str

# ----------------- Model Validation Schemas (Step 17) -----------------
class ModelValidationResponse(BaseModel):
    dataset_type: str
    total_samples: int
    normal_samples: int
    anomaly_samples: int
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    false_positive_rate: float
    false_negative_rate: float
    mean_anomaly_score_normal: float
    mean_anomaly_score_anomaly: float
    confusion_matrix: Dict[str, int]

# ----------------- Satellite Management Schemas -----------------
class SatelliteCreateRequest(BaseModel):
    name: str = Field(..., description="Satellite Name e.g. INSAT-X")
    id: str = Field(..., description="Unique Satellite ID e.g. SAT-005")
    operator: str = Field(..., description="Operator e.g. ISRO, NASA, ESA, JAXA")
    mission: str = Field(..., description="Mission Purpose e.g. Earth Observation")
    orbit_type: str = Field(..., description="Orbit Type: LEO, MEO, GEO, SSO, Other")
    ground_station: Optional[str] = Field(default="GS-Bangalore", description="Primary Ground Station")
    launch_date: Optional[str] = Field(default=None, description="Launch Date")
    telemetry_source: str = Field(default="Demo Simulation", description="Demo Simulation, CSV Upload, JSON Upload, Live API")
    norad_id: Optional[int] = None
    callsign: Optional[str] = None
    baseline_ranges: Optional[Dict[str, List[float]]] = None

class SatelliteResponse(BaseModel):
    id: str
    name: str
    norad_id: Optional[int]
    callsign: Optional[str]
    operator: str
    mission: str
    orbit_type: str
    launch_date: Optional[str]
    ground_station: Optional[str]
    telemetry_source: str
    status: str
    overall_health: float
    health_status: str
    color: str
    altitude_km: float
    inclination_deg: float
    baseline_ranges: Optional[Dict[str, Any]] = None
    created_at: str

# ----------------- Telemetry Ingestion Schemas -----------------
class TelemetryDataPoint(BaseModel):
    satellite_id: str
    battery_charge: float
    battery_voltage: float
    battery_current: float = 6.5
    temperature: float
    power_output: float
    signal_strength: float = 90.0
    packet_loss: float = 0.01
    cpu_load: float = 25.0
    memory_usage: float = 35.0
    status: str = "NOMINAL"
    timestamp: str

class TelemetryUploadRequest(BaseModel):
    file_type: str = Field(..., description="'csv' or 'json'")
    content: str = Field(..., description="Raw text content of the CSV or JSON file")

# ----------------- Report & Organization Schemas -----------------
class ReportGenerateRequest(BaseModel):
    satellite_id: str
    report_type: Optional[str] = "Health & Anomaly Analysis Report"

class ReportResponse(BaseModel):
    id: str
    satellite_id: str
    satellite_name: str
    report_type: str
    health_score: float
    health_status: str
    risk_level: str
    status: str
    summary: Optional[str]
    recipient_email: Optional[str]
    sent_at: Optional[str]
    created_at: str
    metadata: Optional[Dict[str, Any]] = None

class SendReportRequest(BaseModel):
    recipient_email: str
    recipient_name: Optional[str] = None
    cc_emails: Optional[List[str]] = None
    subject: Optional[str] = None
    message: Optional[str] = None

class OrganizationContactResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    email: str
    role: str
    status: str

class OrganizationResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str]
    contacts: List[OrganizationContactResponse] = []

class ContactCreateRequest(BaseModel):
    organization_id: str
    name: str
    email: str
    role: str

class SimulateAnomalyRequest(BaseModel):
    satellite_id: str
    anomaly_type: str = Field(..., description="e.g. Battery Degradation, Overheating, Voltage Instability")
    severity: str = Field(default="WARNING", description="INFO, WARNING, CRITICAL")


# ----------------- AI Mission Assistant Schemas (Step 26) -----------------
class AssistantQueryRequest(BaseModel):
    question: str
    satellite_id: Optional[str] = "SAT-001"
    telemetry: Optional[Dict[str, Any]] = None
    context_override: Optional[Dict[str, Any]] = None

class AssistantQueryResponse(BaseModel):
    satellite_id: str
    satellite_name: str
    question: str
    intent: Optional[str] = None
    answer: str
    risk_level: str
    evidence: List[str] = []
    prediction: Dict[str, Any] = {}
    root_cause: Dict[str, Any] = {}
    mission_impact: Dict[str, Any] = {}
    what_if_scenario: Optional[Dict[str, Any]] = None
    recommended_action: str
    data_quality: str = "GOOD"
    method: str = "Telemetry-grounded SATSHIELD decision-support analysis"
    disclaimer: str = "Synthetic / simulated telemetry — demonstration and validation dataset."


# ----------------- What-If Scenario Analysis Schemas (Step 27) -----------------
class WhatIfRequest(BaseModel):
    satellite_id: Optional[str] = "SAT-001"
    parameter: Optional[str] = None
    telemetry: Optional[Dict[str, Any]] = None
    projection_horizon_minutes: Optional[float] = 10.0
    scenario_multiplier: Optional[float] = 1.0

class WhatIfResponse(BaseModel):
    satellite_id: str
    parameter: str
    parameter_key: str
    subsystem: str
    current_value: Optional[float] = None
    unit: str
    trend_slope: float
    trend_slope_formatted: str
    trend_direction: str
    operational_threshold: Optional[float] = None
    warning_threshold: Optional[float] = None
    projected_value: Optional[float] = None
    projection_horizon_minutes: float
    estimated_time_to_threshold: Optional[float] = None
    estimated_time_formatted: str
    current_risk: str
    projected_risk: str
    scenario_status: str
    explanation: str
    impact: str
    recommended_action: str
    multi_parameter_assessment: Optional[Dict[str, Any]] = None
    prediction_method: str = "Trend-based temporal projection"
    data_quality: str = "GOOD"
    disclaimer: str = "Synthetic / simulated telemetry — demonstration and validation dataset."
