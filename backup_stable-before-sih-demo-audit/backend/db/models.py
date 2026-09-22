"""
SQLAlchemy Models for SATSHIELD AI Database
Supports Satellites, Telemetry, Anomalies, Health Scores, Predictions, Reports, and Organizations.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from db.database import Base

def get_utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

class OrganizationModel(Base):
    __tablename__ = "organizations"

    id = Column(String(50), primary_key=True, index=True) # e.g. "ORG-ISRO"
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False) # "ISRO", "NASA"
    description = Column(Text, nullable=True)
    created_at = Column(String(30), default=get_utc_now)

    contacts = relationship("OrganizationContactModel", back_populates="organization", cascade="all, delete-orphan")

class OrganizationContactModel(Base):
    __tablename__ = "organization_contacts"

    id = Column(String(50), primary_key=True, index=True)
    organization_id = Column(String(50), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    role = Column(String(80), nullable=False)
    status = Column(String(30), default="VERIFIED") # "VERIFIED", "PENDING"
    created_at = Column(String(30), default=get_utc_now)

    organization = relationship("OrganizationModel", back_populates="contacts")

class SatelliteModel(Base):
    __tablename__ = "satellites"

    id = Column(String(50), primary_key=True, index=True) # "SAT-001", "SAT-005"
    name = Column(String(100), nullable=False) # "INSAT-X"
    norad_id = Column(Integer, nullable=True) # 43205
    callsign = Column(String(50), nullable=True) # "IN-05"
    operator = Column(String(100), nullable=False) # "ISRO"
    mission = Column(String(150), nullable=False) # "Earth Observation"
    orbit_type = Column(String(30), nullable=False) # "LEO", "MEO", "GEO", "SSO", "Other"
    launch_date = Column(String(30), nullable=True)
    ground_station = Column(String(100), nullable=True) # "GS-Bangalore"
    telemetry_source = Column(String(50), default="Demo Simulation") # "Demo Simulation", "CSV Upload", "JSON Upload", "Live API"
    status = Column(String(30), default="NOMINAL") # "NOMINAL", "WARNING", "CRITICAL"
    overall_health = Column(Float, default=95.0)
    health_status = Column(String(30), default="nominal") # "nominal", "warning", "critical"
    color = Column(String(20), default="#00BFFF")
    altitude_km = Column(Float, default=500.0)
    inclination_deg = Column(Float, default=45.0)
    baseline_ranges_json = Column(Text, nullable=True) # JSON object of normal limits
    created_at = Column(String(30), default=get_utc_now)

    telemetry_records = relationship("TelemetryRecord", back_populates="satellite", cascade="all, delete-orphan")
    anomalies = relationship("AnomalyRecord", back_populates="satellite", cascade="all, delete-orphan")
    reports = relationship("ReportRecord", back_populates="satellite", cascade="all, delete-orphan")

class TelemetryRecord(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    satellite_id = Column(String(50), ForeignKey("satellites.id"), nullable=False, index=True)
    timestamp = Column(String(30), default=get_utc_now)
    battery_charge = Column(Float, nullable=False) # %
    battery_voltage = Column(Float, nullable=False) # V
    battery_current = Column(Float, default=6.5) # A
    temperature = Column(Float, nullable=False) # °C
    power_output = Column(Float, nullable=False) # W
    signal_strength = Column(Float, nullable=False) # % or dBm
    packet_loss = Column(Float, default=0.01) # %
    cpu_load = Column(Float, default=25.0) # %
    memory_usage = Column(Float, default=35.0) # %
    attitude_pitch = Column(Float, default=0.0)
    attitude_yaw = Column(Float, default=0.0)
    attitude_roll = Column(Float, default=0.0)
    status = Column(String(30), default="NOMINAL")

    satellite = relationship("SatelliteModel", back_populates="telemetry_records")

class AnomalyRecord(Base):
    __tablename__ = "anomalies"

    id = Column(String(50), primary_key=True, index=True)
    satellite_id = Column(String(50), ForeignKey("satellites.id"), nullable=False, index=True)
    anomaly_type = Column(String(100), nullable=False) # "Battery Degradation", "Overheating"
    severity = Column(String(20), nullable=False) # "INFO", "WARNING", "CRITICAL"
    probability = Column(Float, default=95.0)
    timestamp = Column(String(30), default=get_utc_now)
    explanation = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    status = Column(String(30), default="ACTIVE") # "ACTIVE", "ACKNOWLEDGED", "RESOLVED"

    satellite = relationship("SatelliteModel", back_populates="anomalies")

class HealthScoreRecord(Base):
    __tablename__ = "health_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    satellite_id = Column(String(50), ForeignKey("satellites.id"), nullable=False, index=True)
    timestamp = Column(String(30), default=get_utc_now)
    overall_score = Column(Float, nullable=False)
    health_status = Column(String(30), nullable=False)
    subsystem_scores_json = Column(Text, nullable=False) # JSON breakdown of power, thermal, aocs, comm, payload, computing
    health_trend = Column(String(30), default="STABLE") # "IMPROVING", "STABLE", "DEGRADING"

class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    satellite_id = Column(String(50), ForeignKey("satellites.id"), nullable=False, index=True)
    timestamp = Column(String(30), default=get_utc_now)
    potential_issue = Column(String(150), nullable=False)
    probability = Column(Float, nullable=False)
    estimated_time_days = Column(Float, nullable=False)
    recommended_action = Column(Text, nullable=False)

class ReportRecord(Base):
    __tablename__ = "reports"

    id = Column(String(50), primary_key=True, index=True) # "REP-101"
    satellite_id = Column(String(50), ForeignKey("satellites.id"), nullable=False, index=True)
    satellite_name = Column(String(100), nullable=False)
    report_type = Column(String(80), default="Health Report")
    health_score = Column(Float, nullable=False)
    health_status = Column(String(30), nullable=False)
    risk_level = Column(String(20), default="LOW")
    status = Column(String(30), default="GENERATED") # "GENERATED", "SENT"
    summary = Column(Text, nullable=True)
    recipient_email = Column(String(150), nullable=True)
    sent_at = Column(String(30), nullable=True)
    created_at = Column(String(30), default=get_utc_now)
    metadata_json = Column(Text, nullable=True)

    satellite = relationship("SatelliteModel", back_populates="reports")
