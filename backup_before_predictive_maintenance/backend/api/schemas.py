"""
FastAPI Request and Response Schemas for SATSHIELD AI API
Defines Pydantic v2 schemas for real ML anomaly detection, 10 anomaly scenarios,
structured anomaly event history, and multi-subsystem telemetry streams.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ----------------- ML Anomaly Schemas -----------------
class TelemetryInput(BaseModel):
    battery_voltage: Optional[float] = Field(default=29.8, description="Main EPS bus voltage in Volts (nominal: 28.0 - 32.5V)")
    battery_current: Optional[float] = Field(default=6.2, description="Battery charge/discharge current in Amperes")
    battery_charge: Optional[float] = Field(default=88.0, description="Battery state of charge in %")
    temperature: Optional[float] = Field(default=24.2, description="Internal subsystem temperature in Celsius")
    solar_power: Optional[float] = Field(default=650.0, description="Solar array generated power in Watts")
    communication_signal: Optional[float] = Field(default=-81.5, description="RF carrier link signal in dBm")
    packet_loss: Optional[float] = Field(default=0.02, description="Downlink packet loss in %")
    pitch: Optional[float] = Field(default=0.0, description="Attitude pitch angle in degrees")
    yaw: Optional[float] = Field(default=0.0, description="Attitude yaw angle in degrees")
    roll: Optional[float] = Field(default=0.0, description="Attitude roll angle in degrees")
    payload_temp: Optional[float] = Field(default=25.5, description="Payload electronics temperature in Celsius")

    class Config:
        json_schema_extra = {
            "example": {
                "battery_voltage": 29.8,
                "battery_current": 6.2,
                "battery_charge": 88.0,
                "temperature": 24.2,
                "solar_power": 650.0,
                "communication_signal": -81.5,
                "packet_loss": 0.02,
                "pitch": 0.2,
                "yaw": -0.1,
                "roll": 0.0,
                "payload_temp": 25.5
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

class AnomalyDetectionResponse(BaseModel):
    status: str
    is_anomaly: bool
    anomaly_score: float = Field(..., description="Continuous calibrated anomaly score (0.00 to 1.00)")
    raw_decision_score: Optional[float] = None
    confidence: float = Field(..., description="Model confidence in anomaly pattern (0 to 100%)")
    severity: str = Field(..., description="INFO, WARNING, CRITICAL")
    subsystem: str = Field(..., description="POWER, BATTERY, THERMAL, COMMUNICATION, ATTITUDE, PAYLOAD, SENSOR")
    anomaly_type: str
    affected_parameters: List[str] = Field(default_factory=list)
    affected_telemetry: List[AffectedTelemetry] = Field(default_factory=list)
    parameter_deviations: Optional[Dict[str, Any]] = None
    explanation: str
    probable_causes: List[str] = Field(default_factory=list)
    recommended_action: str
    timestamp: str
    model: str = "IsolationForest-ML-v2"
    sanitized_telemetry: Optional[Dict[str, float]] = None

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
