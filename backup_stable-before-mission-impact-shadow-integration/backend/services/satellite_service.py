"""
Satellite Service for SATSHIELD AI
Handles satellite registration, queries, baselines, and configuration.
"""

import json
import random
import sqlite3
from typing import List, Optional, Dict, Any
from db.database import get_utc_now

DEFAULT_SATELLITE_COLORS = [
    "#00BFFF", # Electric Cyan
    "#EF4444", # Crimson Red
    "#8B5CF6", # Royal Violet
    "#F59E0B", # Solar Gold
    "#10B981", # Emerald Green
    "#EC4899", # Pink
    "#3B82F6", # Sky Blue
    "#14B8A6", # Teal
]

def get_orbit_params(orbit_type: str) -> Dict[str, float]:
    """Provides nominal altitude & inclination defaults based on orbit type."""
    ot = (orbit_type or "").upper()
    if ot == "GEO":
        return {"altitude_km": 35786.0, "inclination_deg": 0.1}
    elif ot == "MEO":
        return {"altitude_km": 20200.0, "inclination_deg": 55.0}
    elif ot == "SSO":
        return {"altitude_km": 650.0, "inclination_deg": 98.0}
    else: # LEO or Other
        return {"altitude_km": 500.0, "inclination_deg": 51.6}

def get_default_baseline(orbit_type: str) -> Dict[str, List[float]]:
    """Calculates sensible nominal ranges per orbit type."""
    ot = (orbit_type or "").upper()
    if ot == "GEO":
        return {
            "battery_charge": [70.0, 100.0],
            "battery_voltage": [26.0, 30.0],
            "temperature": [15.0, 38.0],
            "power_output": [600.0, 1000.0],
            "signal_strength": [80.0, 100.0]
        }
    else:
        return {
            "battery_charge": [65.0, 100.0],
            "battery_voltage": [26.5, 29.8],
            "temperature": [18.0, 35.0],
            "power_output": [450.0, 800.0],
            "signal_strength": [75.0, 100.0]
        }

def list_satellites(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """Returns all registered satellites."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM satellites ORDER BY rowid ASC")
    rows = cursor.fetchall()
    return [dict(r) for r in rows]

def get_satellite_by_id(conn: sqlite3.Connection, satellite_id: str) -> Optional[Dict[str, Any]]:
    """Finds a satellite by its unique ID."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM satellites WHERE UPPER(id) = ?", (satellite_id.strip().upper(),))
    row = cursor.fetchone()
    return dict(row) if row else None

def create_satellite(
    conn: sqlite3.Connection,
    satellite_id: str,
    name: str,
    operator: str,
    mission: str,
    orbit_type: str,
    ground_station: Optional[str] = None,
    launch_date: Optional[str] = None,
    telemetry_source: str = "Demo Simulation",
    norad_id: Optional[int] = None,
    callsign: Optional[str] = None,
    baseline_ranges: Optional[Dict[str, List[float]]] = None
) -> Dict[str, Any]:
    """Registers a new satellite with database persistence and baseline configuration."""
    clean_id = satellite_id.strip().upper()
    
    # Check duplicate ID
    existing = get_satellite_by_id(conn, clean_id)
    if existing:
        raise ValueError(f"A satellite with ID '{clean_id}' is already registered in the system.")
    
    # Check duplicate name
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM satellites WHERE UPPER(name) = ?", (name.strip().upper(),))
    if cursor.fetchone():
        raise ValueError(f"A satellite with name '{name.strip()}' already exists.")

    orbit_info = get_orbit_params(orbit_type)
    baseline = baseline_ranges or get_default_baseline(orbit_type)

    cursor.execute("SELECT COUNT(*) as cnt FROM satellites")
    existing_count = cursor.fetchone()['cnt']
    assigned_color = DEFAULT_SATELLITE_COLORS[existing_count % len(DEFAULT_SATELLITE_COLORS)]

    assigned_norad = norad_id or (50000 + random.randint(100, 9999))
    assigned_callsign = callsign or f"{name[:2].upper()}-{clean_id[-2:]}"
    now_str = get_utc_now()

    cursor.execute("""
    INSERT INTO satellites (
        id, name, norad_id, callsign, operator, mission, orbit_type,
        launch_date, ground_station, telemetry_source, status, overall_health,
        health_status, color, altitude_km, inclination_deg, baseline_ranges_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        clean_id, name.strip(), assigned_norad, assigned_callsign, operator.strip(),
        mission.strip(), orbit_type.strip().upper(), launch_date or "2024-01-01",
        ground_station or "GS-Bangalore", telemetry_source, "NOMINAL", 95.0,
        "nominal", assigned_color, orbit_info["altitude_km"], orbit_info["inclination_deg"],
        json.dumps(baseline), now_str
    ))
    conn.commit()

    return get_satellite_by_id(conn, clean_id)

def delete_satellite(conn: sqlite3.Connection, satellite_id: str) -> bool:
    """Deletes a custom registered satellite (safeguards defaults SAT-001 through SAT-004)."""
    sat = get_satellite_by_id(conn, satellite_id)
    if not sat:
        return False
    if sat["id"] in ["SAT-001", "SAT-002", "SAT-003", "SAT-004"]:
        raise ValueError("Core demonstration satellites (SAT-001 to SAT-004) are protected and cannot be deleted.")
    
    cursor = conn.cursor()
    cursor.execute("DELETE FROM satellites WHERE id = ?", (sat["id"],))
    conn.commit()
    return True
