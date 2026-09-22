"""
Database Manager for SATSHIELD AI using Python standard library sqlite3
Provides zero-dependency, robust, ACID SQLite database access for:
- satellites
- telemetry
- anomalies (Extended structured anomaly events)
- health_scores
- predictions
- reports
- organizations
- organization_contacts
"""

import os
import json
import sqlite3
import random
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'satshield.db')

def get_utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

def get_connection():
    """Returns a SQLite connection with dict-like row access."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Creates tables if they don't exist and migrates schema fields."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Organizations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 2. Organization Contacts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS organization_contacts (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT DEFAULT 'VERIFIED',
        created_at TEXT NOT NULL,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    )
    """)

    # 3. Satellites Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS satellites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        norad_id INTEGER,
        callsign TEXT,
        operator TEXT NOT NULL,
        mission TEXT NOT NULL,
        orbit_type TEXT NOT NULL,
        launch_date TEXT,
        ground_station TEXT,
        telemetry_source TEXT DEFAULT 'Demo Simulation',
        status TEXT DEFAULT 'NOMINAL',
        overall_health REAL DEFAULT 95.0,
        health_status TEXT DEFAULT 'nominal',
        color TEXT DEFAULT '#00BFFF',
        altitude_km REAL DEFAULT 500.0,
        inclination_deg REAL DEFAULT 51.6,
        baseline_ranges_json TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 4. Telemetry Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        satellite_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        battery_charge REAL NOT NULL,
        battery_voltage REAL NOT NULL,
        battery_current REAL DEFAULT 6.5,
        temperature REAL NOT NULL,
        power_output REAL NOT NULL,
        signal_strength REAL NOT NULL,
        packet_loss REAL DEFAULT 0.01,
        cpu_load REAL DEFAULT 25.0,
        memory_usage REAL DEFAULT 35.0,
        status TEXT DEFAULT 'NOMINAL',
        FOREIGN KEY (satellite_id) REFERENCES satellites(id) ON DELETE CASCADE
    )
    """)

    # 5. Anomalies Table (Step 14 - Full Structured Event History)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anomalies (
        id TEXT PRIMARY KEY,
        satellite_id TEXT NOT NULL,
        satellite_name TEXT,
        timestamp TEXT NOT NULL,
        subsystem TEXT NOT NULL DEFAULT 'POWER',
        anomaly_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'WARNING',
        anomaly_score REAL DEFAULT 0.50,
        confidence REAL DEFAULT 90.0,
        affected_parameters_json TEXT,
        explanation TEXT NOT NULL,
        probable_cause TEXT,
        recommended_action TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL,
        FOREIGN KEY (satellite_id) REFERENCES satellites(id) ON DELETE CASCADE
    )
    """)

    # Migration check for existing anomalies table columns
    cursor.execute("PRAGMA table_info(anomalies)")
    existing_cols = [col["name"] for col in cursor.fetchall()]
    migration_cols = [
        ("satellite_name", "TEXT"),
        ("subsystem", "TEXT DEFAULT 'POWER'"),
        ("anomaly_score", "REAL DEFAULT 0.50"),
        ("confidence", "REAL DEFAULT 90.0"),
        ("affected_parameters_json", "TEXT"),
        ("probable_cause", "TEXT"),
        ("created_at", "TEXT")
    ]
    for col_name, col_def in migration_cols:
        if col_name not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE anomalies ADD COLUMN {col_name} {col_def}")
            except Exception:
                pass

    # 6. Predictions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        satellite_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        potential_issue TEXT NOT NULL,
        probability REAL NOT NULL,
        estimated_time_days REAL NOT NULL,
        recommended_action TEXT NOT NULL,
        FOREIGN KEY (satellite_id) REFERENCES satellites(id) ON DELETE CASCADE
    )
    """)

    # 7. Reports Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        satellite_id TEXT NOT NULL,
        satellite_name TEXT NOT NULL,
        report_type TEXT NOT NULL,
        health_score REAL NOT NULL,
        health_status TEXT NOT NULL,
        risk_level TEXT DEFAULT 'LOW',
        status TEXT DEFAULT 'GENERATED',
        summary TEXT,
        recipient_email TEXT,
        sent_at TEXT,
        created_at TEXT NOT NULL,
        metadata_json TEXT,
        FOREIGN KEY (satellite_id) REFERENCES satellites(id) ON DELETE CASCADE
    )
    """)

    conn.commit()

    # ── Pre-seed Organizations ──
    cursor.execute("SELECT COUNT(*) as cnt FROM organizations")
    if cursor.fetchone()['cnt'] == 0:
        orgs = [
            ("ORG-ISRO", "ISRO (Indian Space Research Organisation)", "ISRO", "National space agency of India operating remote sensing and navigation constellations.", get_utc_now()),
            ("ORG-NASA", "NASA (National Aeronautics and Space Administration)", "NASA", "Civil space program and aeronautics and space research agency.", get_utc_now()),
            ("ORG-ESA", "ESA (European Space Agency)", "ESA", "Intergovernmental organisation of 22 member states dedicated to space exploration.", get_utc_now()),
            ("ORG-JAXA", "JAXA (Japan Aerospace Exploration Agency)", "JAXA", "Japanese national aerospace agency for research and orbital monitoring.", get_utc_now()),
        ]
        cursor.executemany("INSERT INTO organizations (id, name, code, description, created_at) VALUES (?, ?, ?, ?, ?)", orgs)

        contacts = [
            ("CONT-001", "ORG-ISRO", "Mission Operations Control (ISTRAC)", "istrac.ops@isro.gov.in", "Primary Flight Director", "VERIFIED", get_utc_now()),
            ("CONT-002", "ORG-ISRO", "Ground Station Bangalore (GS-Bangalore)", "gs.bangalore@isro.gov.in", "Telemetry Engineer", "VERIFIED", get_utc_now()),
            ("CONT-003", "ORG-NASA", "JPL Mission Operations", "mission.ops@jpl.nasa.gov", "Payload Specialist", "VERIFIED", get_utc_now()),
            ("CONT-004", "ORG-ESA", "ESOC Flight Control Centre", "esoc.flight@esa.int", "Mission Director", "VERIFIED", get_utc_now()),
            ("CONT-005", "ORG-JAXA", "Tsukuba Space Center", "tsukuba.ops@jaxa.jp", "Orbital Safety Engineer", "VERIFIED", get_utc_now()),
        ]
        cursor.executemany("INSERT INTO organization_contacts (id, organization_id, name, email, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", contacts)
        conn.commit()

    # ── Pre-seed Default Satellites ──
    cursor.execute("SELECT COUNT(*) as cnt FROM satellites")
    if cursor.fetchone()['cnt'] == 0:
        sats = [
            (
                "SAT-001", "AGIS-3", 43205, "AG-03", "ISRO", "COMMS SATELLITE", "LEO", "2022-06-15",
                "GS-Bangalore", "Demo Simulation", "NOMINAL", 96.0, "nominal", "#00BFFF", 405.2, 51.6,
                json.dumps({"battery_voltage": [27.0, 30.0], "battery_charge": [70.0, 100.0], "temperature": [18.0, 32.0], "power_output": [420.0, 600.0], "signal_strength": [80.0, 100.0]}),
                get_utc_now()
            ),
            (
                "SAT-002", "SENTINEL-9", 43015, "SN-09", "ESA", "EARTH OBSERVATION", "LEO", "2021-11-20",
                "GS-Madrid", "Demo Simulation", "NOMINAL", 91.0, "nominal", "#EF4444", 520.6, 97.8,
                json.dumps({"battery_voltage": [26.5, 29.5], "battery_charge": [65.0, 98.0], "temperature": [20.0, 42.0], "power_output": [500.0, 750.0], "signal_strength": [75.0, 100.0]}),
                get_utc_now()
            ),
            (
                "SAT-003", "ORBCOM-7", 38902, "OB-07", "NASA", "COMMUNICATIONS", "GEO", "2020-04-12",
                "GS-New York", "Demo Simulation", "NOMINAL", 84.0, "warning", "#8B5CF6", 35786.0, 0.1,
                json.dumps({"battery_voltage": [26.0, 30.0], "battery_charge": [70.0, 100.0], "temperature": [18.0, 36.0], "power_output": [700.0, 950.0], "signal_strength": [85.0, 100.0]}),
                get_utc_now()
            ),
            (
                "SAT-004", "HELIOS-1", 51094, "HL-01", "JAXA", "IMAGING SATELLITE", "SSO", "2023-08-30",
                "GS-Singapore", "Demo Simulation", "WARNING", 87.0, "warning", "#F59E0B", 408.8, 82.4,
                json.dumps({"battery_voltage": [26.0, 29.5], "battery_charge": [60.0, 95.0], "temperature": [20.0, 45.0], "power_output": [600.0, 850.0], "signal_strength": [70.0, 100.0]}),
                get_utc_now()
            ),
        ]
        cursor.executemany("""
        INSERT INTO satellites (id, name, norad_id, callsign, operator, mission, orbit_type, launch_date, ground_station, telemetry_source, status, overall_health, health_status, color, altitude_km, inclination_deg, baseline_ranges_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sats)

        init_reports = [
            ("REP-SAT-001-INIT", "SAT-001", "AGIS-3", "Periodic Health Audit", 96.0, "nominal", "LOW", "GENERATED", "All 7 subsystems operating within nominal baseline parameters.", None, None, get_utc_now(), None),
            ("REP-SAT-002-INIT", "SAT-002", "SENTINEL-9", "Anomaly Diagnostic Report", 82.0, "warning", "HIGH", "SENT", "EPS battery cell #3 degradation detected during high-load pass.", "esoc.flight@esa.int", get_utc_now(), get_utc_now(), None),
        ]
        cursor.executemany("""
        INSERT INTO reports (id, satellite_id, satellite_name, report_type, health_score, health_status, risk_level, status, summary, recipient_email, sent_at, created_at, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, init_reports)
        conn.commit()

    # ── Pre-seed initial active anomaly events ──
    cursor.execute("SELECT COUNT(*) as cnt FROM anomalies")
    if cursor.fetchone()['cnt'] == 0:
        init_anomalies = [
            (
                "ANOM-INIT-101", "SAT-002", "SENTINEL-9", "2m ago", "BATTERY", "Battery Degradation & Bus Undervoltage",
                "CRITICAL", 0.88, 96.2, json.dumps(["battery_voltage", "battery_current"]),
                "Bus voltage (21.3V) dropped below threshold with battery discharge current surging to 18.5A. Deep discharge risk.",
                "Battery cell internal resistance degradation or shorted string.",
                "Inspect battery subsystem and activate autonomous power-saving mode.",
                "ACTIVE", get_utc_now()
            ),
            (
                "ANOM-INIT-102", "SAT-004", "HELIOS-1", "8m ago", "THERMAL", "Subsystem Thermal Overheating",
                "WARNING", 0.68, 91.5, json.dumps(["temperature", "payload_temp"]),
                "Internal temperature reached 48.2°C exceeding nominal baseline limits [18.0, 36.0].",
                "Thermal radiator panel dissipation degradation or high electronics duty-cycle.",
                "Deploy auxiliary radiator louvers and reorient attitude to shade avionics bay.",
                "ACTIVE", get_utc_now()
            ),
            (
                "ANOM-INIT-103", "SAT-003", "ORBCOM-7", "12m ago", "POWER", "Solar Array Power Generation Decay",
                "WARNING", 0.58, 88.0, json.dumps(["solar_power", "battery_voltage"]),
                "Solar array power dropped to 180W due to partial array shadowing.",
                "Solar panel Sun-pointing gimbal tracking error.",
                "Re-orient solar array drive mechanism toward sun-vector.",
                "ACKNOWLEDGED", get_utc_now()
            )
        ]
        cursor.executemany("""
        INSERT INTO anomalies (id, satellite_id, satellite_name, timestamp, subsystem, anomaly_type, severity, anomaly_score, confidence, affected_parameters_json, explanation, probable_cause, recommended_action, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, init_anomalies)
        conn.commit()

    conn.close()

def get_db():
    """FastAPI generator dependency yielding a database connection."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
