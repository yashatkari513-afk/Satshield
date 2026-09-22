"""
FastAPI Backend for SATSHIELD AI Satellite Monitoring Platform
Includes Real ML Anomaly Detection (Isolation Forest), 10 Physical Anomaly Scenarios,
Multi-Subsystem Telemetry, Structured Anomaly Event History, Report Center, and Email Dispatch.
"""

import os
import sys
import json
import sqlite3
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from db.database import init_db, get_db, get_utc_now
from ml.detector import SatelliteAnomalyDetector
from ml.temporal_analyzer import TemporalTelemetryAnalyzer
from ml.scenarios import SCENARIO_METADATA, generate_scenario_telemetry
from ml.validate_model import evaluate_anomaly_detector
from services import satellite_service, telemetry_service, ai_analysis_service, report_service, email_service
from api.schemas import (
    TelemetryInput,
    TelemetrySequenceInput,
    AnomalyDetectionResponse,
    AffectedTelemetry,
    EarlyRiskResponse,
    HealthResponse,
    SatelliteCreateRequest,
    SatelliteResponse,
    TelemetryUploadRequest,
    ReportGenerateRequest,
    ReportResponse,
    SendReportRequest,
    OrganizationResponse,
    OrganizationContactResponse,
    ContactCreateRequest,
    SimulateAnomalyRequest,
    ScenarioInfo,
    ScenarioTriggerRequest,
    ScenarioResponse,
    AnomalyEventRecord,
    AnomalyLogCreateRequest,
    ModelValidationResponse
)

# Global ML instances
detector: Optional[SatelliteAnomalyDetector] = None
temporal_analyzer: Optional[TemporalTelemetryAnalyzer] = None
cached_metrics: Optional[dict] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global detector, temporal_analyzer, cached_metrics
    print("[API Startup] Initializing SQLite Database & Seed Records...")
    init_db()
    
    print("[API Startup] Loading Isolation Forest ML detector into memory...")
    try:
        detector = SatelliteAnomalyDetector()
    except Exception as e:
        print(f"[API Startup] ML detector status: {e}")
        detector = None

    print("[API Startup] Loading Temporal Telemetry Analyzer into memory...")
    try:
        temporal_analyzer = TemporalTelemetryAnalyzer()
    except Exception as e:
        print(f"[API Startup] Temporal analyzer status: {e}")
        temporal_analyzer = None

    print("[API Startup] SATSHIELD AI Backend Ready.")
    yield
    print("[API Shutdown] Releasing resources...")

app = FastAPI(
    title="SATSHIELD AI - Satellite Health & Autonomous Defense API",
    description="Multi-asset satellite telemetry analysis, Isolation Forest ML anomaly detection, Report Center & Email Dispatch",
    version="4.3.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# HEALTH CHECK & BENCHMARK METRICS
# ============================================================================
@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def get_health():
    """Confirms API, Database, and ML model availability."""
    global detector, temporal_analyzer
    return HealthResponse(
        status="ok",
        database="connected",
        ml_model="loaded" if detector is not None and detector.model is not None else "simulated_fallback",
        temporal_analyzer="loaded" if temporal_analyzer is not None and temporal_analyzer.model is not None else "simulated_fallback",
        total_features_monitored=len(detector.feature_names) if detector else 11
    )

@app.get("/api/anomaly/metrics", response_model=ModelValidationResponse, tags=["Anomaly Detection"])
async def get_model_validation_metrics():
    """Returns real quantitative benchmark metrics (Precision, Recall, F1, FPR, FNR, Accuracy)."""
    global cached_metrics
    if cached_metrics is None:
        cached_metrics = evaluate_anomaly_detector()
    return ModelValidationResponse(**cached_metrics)

# ============================================================================
# 10 ANOMALY SCENARIOS (STEP 5 & 16)
# ============================================================================
@app.get("/api/anomaly/scenarios", response_model=List[ScenarioInfo], tags=["Anomaly Scenarios"])
async def list_anomaly_scenarios():
    """Returns the catalog of 10 realistic anomaly scenarios for SIH demonstration."""
    return [ScenarioInfo(**meta) for meta in SCENARIO_METADATA.values()]

@app.post("/api/anomaly/scenarios/trigger", response_model=ScenarioResponse, tags=["Anomaly Scenarios"])
async def trigger_anomaly_scenario(payload: ScenarioTriggerRequest):
    """Generates scenario telemetry for the selected step and runs full ML anomaly detection."""
    global detector
    sc_meta = None
    for meta in SCENARIO_METADATA.values():
        if meta["id"] == payload.scenario_id_or_key or meta["key"] == payload.scenario_id_or_key.lower():
            sc_meta = meta
            break
    if not sc_meta:
        raise HTTPException(status_code=404, detail=f"Scenario '{payload.scenario_id_or_key}' not found.")

    telemetry = generate_scenario_telemetry(sc_meta["key"], step=payload.step)
    
    if detector is not None and detector.model is not None:
        det_result = detector.detect_anomaly(telemetry)
    else:
        # Fallback detection
        det_result = {
            "status": "anomaly",
            "is_anomaly": True,
            "anomaly_score": 0.85,
            "raw_decision_score": -0.12,
            "confidence": 94.0,
            "severity": sc_meta["expected_severity"],
            "subsystem": sc_meta["subsystem"],
            "anomaly_type": sc_meta["name"],
            "affected_parameters": list(telemetry.keys())[:2],
            "parameter_deviations": {},
            "explanation": f"Statistical variance detected for {sc_meta['name']} on {payload.satellite_id}.",
            "probable_causes": [sc_meta["description"]],
            "recommended_action": "Execute operational mitigation procedure.",
            "model": "IsolationForest-Fallback",
            "sanitized_telemetry": telemetry
        }

    affected_list = [
        AffectedTelemetry(
            parameter=param,
            observed=dev["observed_value"],
            nominal_range=dev["normal_range"],
            z_score=dev["z_score"],
            direction=dev["deviation_direction"]
        )
        for param, dev in det_result.get("parameter_deviations", {}).items()
    ]

    det_response = AnomalyDetectionResponse(
        status=det_result["status"],
        is_anomaly=det_result["is_anomaly"],
        anomaly_score=det_result["anomaly_score"],
        raw_decision_score=det_result.get("raw_decision_score"),
        confidence=det_result["confidence"],
        severity=det_result["severity"],
        subsystem=det_result["subsystem"],
        anomaly_type=det_result["anomaly_type"],
        affected_parameters=det_result["affected_parameters"],
        affected_telemetry=affected_list,
        parameter_deviations=det_result.get("parameter_deviations"),
        explanation=det_result["explanation"],
        probable_causes=det_result.get("probable_causes", []),
        recommended_action=det_result["recommended_action"],
        timestamp=get_utc_now(),
        model=det_result.get("model", "IsolationForest-ML-v2"),
        sanitized_telemetry=det_result.get("sanitized_telemetry")
    )

    return ScenarioResponse(
        scenario=ScenarioInfo(**sc_meta),
        satellite_id=payload.satellite_id,
        telemetry=telemetry,
        detection=det_response
    )

# ============================================================================
# ML ANOMALY DETECTION (STEP 3)
# ============================================================================
@app.post("/api/anomaly/detect", response_model=AnomalyDetectionResponse, tags=["Anomaly Detection"])
async def detect_anomaly(telemetry: TelemetryInput):
    """Analyzes multi-parameter telemetry using Isolation Forest ML and returns explainable results."""
    global detector
    now_utc = get_utc_now()
    telemetry_dict = telemetry.model_dump()

    if detector is not None and detector.model is not None:
        try:
            result = detector.detect_anomaly(telemetry_dict)
            affected_list = [
                AffectedTelemetry(
                    parameter=param,
                    observed=details["observed_value"],
                    nominal_range=details["normal_range"],
                    z_score=details["z_score"],
                    direction=details["deviation_direction"]
                )
                for param, details in result.get("parameter_deviations", {}).items()
            ]
            return AnomalyDetectionResponse(
                status=result["status"],
                is_anomaly=result["is_anomaly"],
                anomaly_score=result["anomaly_score"],
                raw_decision_score=result.get("raw_decision_score"),
                confidence=result["confidence"],
                severity=result["severity"],
                subsystem=result["subsystem"],
                anomaly_type=result["anomaly_type"],
                affected_parameters=result["affected_parameters"],
                affected_telemetry=affected_list,
                parameter_deviations=result.get("parameter_deviations"),
                explanation=result["explanation"],
                probable_causes=result.get("probable_causes", []),
                recommended_action=result["recommended_action"],
                timestamp=now_utc,
                model=result.get("model", "IsolationForest-ML-v2"),
                sanitized_telemetry=result.get("sanitized_telemetry")
            )
        except Exception as e:
            print(f"[AnomalyDetect Error] {e}")

    # Safe deterministic fallback
    is_anom = telemetry.battery_voltage < 25.0 or telemetry.temperature > 45.0
    return AnomalyDetectionResponse(
        status="anomaly" if is_anom else "normal",
        is_anomaly=is_anom,
        anomaly_score=0.82 if is_anom else 0.12,
        raw_decision_score=-0.15 if is_anom else 0.05,
        confidence=92.0 if is_anom else 98.0,
        severity="CRITICAL" if is_anom else "INFO",
        subsystem="BATTERY" if is_anom else "POWER",
        anomaly_type="EPS Bus Voltage Decay" if is_anom else "System Operating Nominally",
        affected_parameters=["battery_voltage"] if is_anom else [],
        affected_telemetry=[],
        explanation="Deterministic heuristic evaluation: Battery voltage below safe baseline." if is_anom else "Nominal operating envelope.",
        probable_causes=["EPS bus load exceeding baseline"] if is_anom else [],
        recommended_action="Inspect battery subsystem and activate autonomous power-saving mode." if is_anom else "Maintain routine monitoring.",
        timestamp=now_utc,
        model="IsolationForest-HeuristicFallback"
    )

@app.post("/api/anomaly/predict", response_model=EarlyRiskResponse, tags=["Early Risk Prediction"])
async def predict_anomaly(payload: TelemetrySequenceInput):
    """Analyzes telemetry sequence for parameter drift."""
    global temporal_analyzer
    now_utc = get_utc_now()
    if temporal_analyzer is not None and temporal_analyzer.model is not None:
        try:
            sequence_dicts = [item.model_dump() for item in payload.sequence]
            result = temporal_analyzer.analyze_sequence(sequence_dicts)
            return EarlyRiskResponse(
                status="normal" if result["risk_level"] == "LOW" else "anomaly",
                risk_level=result["risk_level"],
                risk_score=result["risk_score"],
                trend_status=result["trend_status"],
                overall_trend=result["trend_status"],
                early_warning=result["early_warning"],
                affected_parameters=result["affected_parameters"],
                evidence=result["evidence"],
                recommended_monitoring=result["recommended_monitoring"],
                timestamp=now_utc,
                model="TemporalTrendAnalyzer-v2"
            )
        except Exception:
            pass

    last = payload.sequence[-1] if payload.sequence else None
    high_risk = last is not None and (last.battery_voltage < 25.0 or last.temperature > 45.0)
    return EarlyRiskResponse(
        status="anomaly" if high_risk else "normal",
        risk_level="HIGH" if high_risk else "LOW",
        risk_score=0.85 if high_risk else 0.05,
        trend_status="DEGRADING_RAPIDLY" if high_risk else "NOMINAL_STABLE",
        overall_trend="DEGRADING_RAPIDLY" if high_risk else "NOMINAL_STABLE",
        early_warning=high_risk,
        affected_parameters=["battery_voltage", "temperature"] if high_risk else [],
        evidence=["Telemetry trend analysis indicates bus undervoltage drift"] if high_risk else ["Parameters operating within baseline limits"],
        recommended_monitoring=["EPS Battery Cell Bus", "TCS Heat Exchanger"],
        timestamp=now_utc,
        model="TemporalTrendAnalyzer-Heuristic"
    )

# ============================================================================
# ANOMALY EVENT HISTORY (STEP 14)
# ============================================================================
def _format_anomaly_row(row: sqlite3.Row) -> AnomalyEventRecord:
    affected = []
    if row["affected_parameters_json"]:
        try:
            affected = json.loads(row["affected_parameters_json"])
        except Exception:
            affected = []
    return AnomalyEventRecord(
        id=row["id"],
        satellite_id=row["satellite_id"],
        satellite_name=row["satellite_name"] if "satellite_name" in row.keys() else row["satellite_id"],
        timestamp=row["timestamp"],
        subsystem=row["subsystem"] if "subsystem" in row.keys() else "POWER",
        anomaly_type=row["anomaly_type"],
        severity=row["severity"],
        anomaly_score=float(row["anomaly_score"]) if "anomaly_score" in row.keys() and row["anomaly_score"] is not None else 0.50,
        confidence=float(row["confidence"]) if "confidence" in row.keys() and row["confidence"] is not None else 90.0,
        affected_parameters=affected,
        explanation=row["explanation"],
        probable_cause=row["probable_cause"] if "probable_cause" in row.keys() else None,
        recommended_action=row["recommended_action"],
        status=row["status"],
        created_at=row["created_at"] if "created_at" in row.keys() else None
    )

@app.get("/api/anomalies", response_model=List[AnomalyEventRecord], tags=["Anomaly History"])
async def list_anomalies(
    satellite_id: Optional[str] = None,
    severity: Optional[str] = None,
    subsystem: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    conn: sqlite3.Connection = Depends(get_db)
):
    """Retrieves structured anomaly history events with optional filters."""
    cursor = conn.cursor()
    query = "SELECT * FROM anomalies WHERE 1=1"
    params = []

    if satellite_id:
        query += " AND satellite_id = ?"
        params.append(satellite_id.strip().upper())
    if severity:
        query += " AND UPPER(severity) = ?"
        params.append(severity.strip().upper())
    if subsystem:
        query += " AND UPPER(subsystem) = ?"
        params.append(subsystem.strip().upper())
    if status:
        query += " AND UPPER(status) = ?"
        params.append(status.strip().upper())

    query += " ORDER BY rowid DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    return [_format_anomaly_row(r) for r in rows]

@app.post("/api/anomalies", response_model=AnomalyEventRecord, tags=["Anomaly History"])
async def log_anomaly_event(payload: AnomalyLogCreateRequest, conn: sqlite3.Connection = Depends(get_db)):
    """Persists a new structured anomaly detection event."""
    now_str = get_utc_now()
    anomaly_id = f"ANOM-{int(datetime.now().timestamp())}-{payload.subsystem[:4].upper()}"
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO anomalies (id, satellite_id, satellite_name, timestamp, subsystem, anomaly_type, severity, anomaly_score, confidence, affected_parameters_json, explanation, probable_cause, recommended_action, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        anomaly_id,
        payload.satellite_id.strip().upper(),
        payload.satellite_name or payload.satellite_id,
        now_str,
        payload.subsystem.strip().upper(),
        payload.anomaly_type,
        payload.severity.strip().upper(),
        payload.anomaly_score,
        payload.confidence,
        json.dumps(payload.affected_parameters),
        payload.explanation,
        payload.probable_cause,
        payload.recommended_action,
        "ACTIVE",
        now_str
    ))
    conn.commit()

    cursor.execute("SELECT * FROM anomalies WHERE id = ?", (anomaly_id,))
    row = cursor.fetchone()
    return _format_anomaly_row(row)

@app.patch("/api/anomalies/{anomaly_id}/acknowledge", tags=["Anomaly History"])
async def acknowledge_anomaly(anomaly_id: str, conn: sqlite3.Connection = Depends(get_db)):
    """Acknowledges an active anomaly event."""
    cursor = conn.cursor()
    cursor.execute("UPDATE anomalies SET status = 'ACKNOWLEDGED' WHERE id = ?", (anomaly_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Anomaly event not found.")
    conn.commit()
    return {"status": "success", "anomaly_id": anomaly_id, "new_status": "ACKNOWLEDGED"}

@app.patch("/api/anomalies/{anomaly_id}/resolve", tags=["Anomaly History"])
async def resolve_anomaly(anomaly_id: str, conn: sqlite3.Connection = Depends(get_db)):
    """Resolves an anomaly event."""
    cursor = conn.cursor()
    cursor.execute("UPDATE anomalies SET status = 'RESOLVED' WHERE id = ?", (anomaly_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Anomaly event not found.")
    conn.commit()
    return {"status": "success", "anomaly_id": anomaly_id, "new_status": "RESOLVED"}

# ============================================================================
# SATELLITE MANAGEMENT
# ============================================================================
def _format_satellite(s: dict) -> SatelliteResponse:
    baseline = {}
    if s.get("baseline_ranges_json"):
        try:
            baseline = json.loads(s["baseline_ranges_json"])
        except Exception:
            baseline = {}
    return SatelliteResponse(
        id=s["id"],
        name=s["name"],
        norad_id=s.get("norad_id"),
        callsign=s.get("callsign"),
        operator=s["operator"],
        mission=s["mission"],
        orbit_type=s["orbit_type"],
        launch_date=s.get("launch_date"),
        ground_station=s.get("ground_station"),
        telemetry_source=s.get("telemetry_source", "Demo Simulation"),
        status=s.get("status", "NOMINAL"),
        overall_health=float(s.get("overall_health", 95.0)),
        health_status=s.get("health_status", "nominal"),
        color=s.get("color", "#00BFFF"),
        altitude_km=float(s.get("altitude_km", 500.0)),
        inclination_deg=float(s.get("inclination_deg", 51.6)),
        baseline_ranges=baseline,
        created_at=s.get("created_at", "")
    )

@app.get("/api/satellites", response_model=List[SatelliteResponse], tags=["Satellites"])
async def list_satellites(conn: sqlite3.Connection = Depends(get_db)):
    """Lists all registered satellites."""
    sats = satellite_service.list_satellites(conn)
    return [_format_satellite(s) for s in sats]

@app.post("/api/satellites", response_model=SatelliteResponse, tags=["Satellites"])
async def add_satellite(payload: SatelliteCreateRequest, conn: sqlite3.Connection = Depends(get_db)):
    """Registers a new satellite in the database."""
    try:
        new_sat = satellite_service.create_satellite(
            conn=conn,
            satellite_id=payload.id,
            name=payload.name,
            operator=payload.operator,
            mission=payload.mission,
            orbit_type=payload.orbit_type,
            ground_station=payload.ground_station,
            launch_date=payload.launch_date,
            telemetry_source=payload.telemetry_source,
            norad_id=payload.norad_id,
            callsign=payload.callsign,
            baseline_ranges=payload.baseline_ranges
        )
        return _format_satellite(new_sat)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register satellite: {str(e)}")

@app.get("/api/satellites/{satellite_id}", response_model=SatelliteResponse, tags=["Satellites"])
async def get_satellite(satellite_id: str, conn: sqlite3.Connection = Depends(get_db)):
    """Gets details for a specific satellite."""
    sat = satellite_service.get_satellite_by_id(conn, satellite_id.strip().upper())
    if not sat:
        raise HTTPException(status_code=404, detail=f"Satellite '{satellite_id}' not found.")
    return _format_satellite(sat)

@app.delete("/api/satellites/{satellite_id}", tags=["Satellites"])
async def delete_satellite(satellite_id: str, conn: sqlite3.Connection = Depends(get_db)):
    """Deletes a custom registered satellite."""
    try:
        success = satellite_service.delete_satellite(conn, satellite_id.strip().upper())
        if not success:
            raise HTTPException(status_code=404, detail=f"Satellite '{satellite_id}' not found.")
        return {"status": "success", "message": f"Satellite {satellite_id} deleted."}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

# ============================================================================
# TELEMETRY & HEALTH ANALYSIS
# ============================================================================
@app.get("/api/satellites/{satellite_id}/telemetry", tags=["Telemetry"])
async def get_satellite_telemetry(satellite_id: str, conn: sqlite3.Connection = Depends(get_db)):
    """Generates or fetches latest telemetry for a satellite."""
    sat = satellite_service.get_satellite_by_id(conn, satellite_id.strip().upper())
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found.")
    frame = telemetry_service.generate_deterministic_telemetry(sat)
    return frame

@app.post("/api/satellites/{satellite_id}/telemetry/upload", tags=["Telemetry"])
async def upload_telemetry(
    satellite_id: str,
    payload: TelemetryUploadRequest,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Uploads and parses CSV or JSON telemetry data."""
    sat = satellite_service.get_satellite_by_id(conn, satellite_id.strip().upper())
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found.")

    try:
        if payload.file_type.lower() == "csv":
            records = telemetry_service.parse_and_validate_telemetry_csv(payload.content, sat["id"])
        elif payload.file_type.lower() == "json":
            records = telemetry_service.parse_and_validate_telemetry_json(payload.content, sat["id"])
        else:
            raise ValueError("Supported file types are 'csv' or 'json'.")

        count = telemetry_service.store_telemetry_records(conn, records)
        return {
            "status": "success",
            "message": f"Successfully parsed and ingested {count} telemetry frames for {sat['name']}.",
            "count": count,
            "latest_frame": records[-1] if records else None
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Telemetry upload failed: {str(e)}")

@app.get("/api/satellites/{satellite_id}/health", tags=["Health Analysis"])
async def get_satellite_health(satellite_id: str, conn: sqlite3.Connection = Depends(get_db)):
    """Computes overall and subsystem health score."""
    sat = satellite_service.get_satellite_by_id(conn, satellite_id.strip().upper())
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found.")
    
    tel = telemetry_service.generate_deterministic_telemetry(sat)
    health = ai_analysis_service.calculate_health_score(tel, sat)
    return health

@app.get("/api/satellites/{satellite_id}/analysis", tags=["AI Analysis"])
async def get_satellite_complete_analysis(satellite_id: str, conn: sqlite3.Connection = Depends(get_db)):
    """Runs complete health, anomaly detection, and failure prediction for any satellite."""
    sat = satellite_service.get_satellite_by_id(conn, satellite_id.strip().upper())
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found.")
    
    tel = telemetry_service.generate_deterministic_telemetry(sat)
    health = ai_analysis_service.calculate_health_score(tel, sat)
    anomalies = ai_analysis_service.detect_anomalies(tel, sat, detector)
    prediction = ai_analysis_service.predict_failure(tel, sat, anomalies)

    return {
        "satellite": _format_satellite(sat),
        "telemetry": tel,
        "health": health,
        "anomalies": anomalies,
        "prediction": prediction
    }

# ============================================================================
# REPORT CENTER & DISPATCH
# ============================================================================
def _format_report(r: dict) -> ReportResponse:
    meta = None
    if r.get("metadata_json"):
        try:
            meta = json.loads(r["metadata_json"])
        except Exception:
            meta = None
    return ReportResponse(
        id=r["id"],
        satellite_id=r["satellite_id"],
        satellite_name=r["satellite_name"],
        report_type=r["report_type"],
        health_score=float(r["health_score"]),
        health_status=r["health_status"],
        risk_level=r.get("risk_level", "LOW"),
        status=r.get("status", "GENERATED"),
        summary=r.get("summary"),
        recipient_email=r.get("recipient_email"),
        sent_at=r.get("sent_at"),
        created_at=r.get("created_at", ""),
        metadata=meta
    )

@app.get("/api/reports", response_model=List[ReportResponse], tags=["Reports"])
async def get_reports(satellite_id: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db)):
    """Lists all generated reports."""
    reports = report_service.list_reports(conn, satellite_id)
    return [_format_report(r) for r in reports]

@app.post("/api/reports/generate", response_model=ReportResponse, tags=["Reports"])
async def generate_report(payload: ReportGenerateRequest, conn: sqlite3.Connection = Depends(get_db)):
    """Generates a structured technical health report and stores metadata in DB."""
    sat = satellite_service.get_satellite_by_id(conn, payload.satellite_id.strip().upper())
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found.")

    tel = telemetry_service.generate_deterministic_telemetry(sat)
    health = ai_analysis_service.calculate_health_score(tel, sat)
    anomalies = ai_analysis_service.detect_anomalies(tel, sat, detector)
    prediction = ai_analysis_service.predict_failure(tel, sat, anomalies)

    report_data = report_service.generate_technical_report_data(sat, health, anomalies, prediction, tel)
    report_record = report_service.save_report_to_db(conn, sat, report_data)
    return _format_report(report_record)

@app.post("/api/reports/{report_id}/send", tags=["Reports"])
async def send_report_email_endpoint(
    report_id: str,
    payload: SendReportRequest,
    conn: sqlite3.Connection = Depends(get_db)
):
    """Sends the PDF health report to an authorized contact via backend email."""
    try:
        result = email_service.send_health_report_email(
            conn=conn,
            report_id=report_id,
            recipient_email=payload.recipient_email,
            recipient_name=payload.recipient_name,
            cc_emails=payload.cc_emails,
            custom_subject=payload.subject,
            custom_message=payload.message
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email dispatch error: {str(e)}")

# ============================================================================
# ORGANIZATION DIRECTORY
# ============================================================================
@app.get("/api/organizations", response_model=List[OrganizationResponse], tags=["Organizations"])
async def list_organizations(conn: sqlite3.Connection = Depends(get_db)):
    """Returns directory of space organizations and authorized verified contacts."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM organizations ORDER BY rowid ASC")
    org_rows = cursor.fetchall()
    
    results = []
    for org in org_rows:
        cursor.execute("SELECT * FROM organization_contacts WHERE organization_id = ? ORDER BY rowid ASC", (org["id"],))
        contact_rows = cursor.fetchall()
        contacts = [
            OrganizationContactResponse(
                id=c["id"],
                organization_id=c["organization_id"],
                name=c["name"],
                email=c["email"],
                role=c["role"],
                status=c["status"]
            )
            for c in contact_rows
        ]
        results.append(OrganizationResponse(
            id=org["id"],
            name=org["name"],
            code=org["code"],
            description=org["description"],
            contacts=contacts
        ))
    return results

@app.post("/api/organizations/contacts", response_model=OrganizationContactResponse, tags=["Organizations"])
async def add_organization_contact(payload: ContactCreateRequest, conn: sqlite3.Connection = Depends(get_db)):
    """Adds a new verified contact to an organization."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM organizations WHERE id = ?", (payload.organization_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Organization not found.")

    contact_id = f"CONT-{int(datetime.now().timestamp())}"
    now_str = get_utc_now()
    cursor.execute("""
    INSERT INTO organization_contacts (id, organization_id, name, email, role, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        contact_id, payload.organization_id, payload.name.strip(),
        payload.email.strip(), payload.role.strip(), "VERIFIED", now_str
    ))
    conn.commit()

    return OrganizationContactResponse(
        id=contact_id,
        organization_id=payload.organization_id,
        name=payload.name.strip(),
        email=payload.email.strip(),
        role=payload.role.strip(),
        status="VERIFIED"
    )

# ============================================================================
# ANOMALY SIMULATION TRIGGER (ANY SATELLITE)
# ============================================================================
@app.post("/api/simulate-anomaly", tags=["Simulation"])
async def trigger_simulated_anomaly(payload: SimulateAnomalyRequest, conn: sqlite3.Connection = Depends(get_db)):
    """Injects a simulated anomaly into any selected satellite."""
    sat = satellite_service.get_satellite_by_id(conn, payload.satellite_id.strip().upper())
    if not sat:
        raise HTTPException(status_code=404, detail="Satellite not found.")

    new_status = "CRITICAL" if payload.severity.upper() == "CRITICAL" else "WARNING"
    new_health = 45.0 if payload.severity.upper() == "CRITICAL" else 72.0
    new_health_status = "critical" if payload.severity.upper() == "CRITICAL" else "warning"

    cursor = conn.cursor()
    cursor.execute("""
    UPDATE satellites SET status = ?, overall_health = ?, health_status = ? WHERE id = ?
    """, (new_status, new_health, new_health_status, sat["id"]))
    conn.commit()

    return {
        "status": "success",
        "satellite_id": sat["id"],
        "satellite_name": sat["name"],
        "anomaly_type": payload.anomaly_type,
        "severity": payload.severity,
        "new_health_score": new_health,
        "new_status": new_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=False)
