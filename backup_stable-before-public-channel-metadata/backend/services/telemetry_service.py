"""
Telemetry Service for SATSHIELD AI
Handles telemetry ingestion (Demo, CSV, JSON, Live API), validation, and deterministic synthesis.
"""

import io
import csv
import json
import math
import time
import sqlite3
from typing import List, Dict, Any, Optional
from db.database import get_utc_now

def generate_deterministic_telemetry(satellite: Dict[str, Any], offset_sec: float = 0.0) -> Dict[str, Any]:
    """
    Generates realistic, deterministic, physically grounded telemetry readings.
    Uses orbital harmonics and sinusoidal physical thermal models.
    """
    now = time.time() + offset_sec
    sat_id = satellite["id"]
    sat_seed = sum(ord(c) for c in sat_id)
    phase = (now / 45.0) + (sat_seed % 10)

    is_geo = satellite.get("orbit_type", "LEO").upper() == "GEO"
    base_solar = 850.0 if is_geo else 580.0
    base_temp = 24.0

    voltage = round(28.4 + 0.3 * math.sin(phase), 2)
    current = round(6.8 + 0.5 * math.cos(phase * 1.2), 2)
    battery = round(max(30.0, min(100.0, 92.0 + 4.0 * math.sin(phase * 0.8))), 1)
    solar = round(max(0.0, base_solar + 60.0 * math.cos(phase * 0.5)), 1)
    temp = round(base_temp + 3.5 * math.sin(phase * 1.5), 1)
    signal = round(max(50.0, min(99.0, 94.0 + 3.0 * math.cos(phase))), 1)
    packet_loss = round(max(0.0, 0.01 + 0.005 * math.sin(phase)), 3)
    cpu_load = round(max(10.0, min(95.0, 28.0 + 6.0 * math.sin(phase * 2.0))), 1)
    memory_usage = round(max(20.0, min(90.0, 42.0 + 3.0 * math.cos(phase))), 1)

    status = "NOMINAL"
    if battery < 40 or temp > 50 or voltage < 24.0:
        status = "CRITICAL"
    elif battery < 65 or temp > 40 or voltage < 26.0:
        status = "WARNING"

    return {
        "satellite_id": sat_id,
        "satellite_name": satellite.get("name", sat_id),
        "battery_charge": battery,
        "battery_voltage": voltage,
        "battery_current": current,
        "temperature": temp,
        "power_output": solar,
        "signal_strength": signal,
        "packet_loss": packet_loss,
        "cpu_load": cpu_load,
        "memory_usage": memory_usage,
        "status": status,
        "timestamp": get_utc_now()
    }

def parse_and_validate_telemetry_csv(csv_content: str, satellite_id: str) -> List[Dict[str, Any]]:
    """Parses and validates CSV telemetry files."""
    if not csv_content or not csv_content.strip():
        raise ValueError("The uploaded CSV file is empty.")

    f = io.StringIO(csv_content.strip())
    reader = csv.DictReader(f)
    
    if not reader.fieldnames:
        raise ValueError("CSV header row is missing or unreadable.")

    header_map = {}
    for col in reader.fieldnames:
        c_clean = col.strip().lower().replace(" ", "_").replace("(", "").replace(")", "").replace("%", "")
        if "batt" in c_clean and "volt" not in c_clean and "curr" not in c_clean:
            header_map["battery_charge"] = col
        elif "volt" in c_clean:
            header_map["battery_voltage"] = col
        elif "curr" in c_clean or "amp" in c_clean:
            header_map["battery_current"] = col
        elif "temp" in c_clean:
            header_map["temperature"] = col
        elif "power" in c_clean or "solar" in c_clean or "watt" in c_clean:
            header_map["power_output"] = col
        elif "sig" in c_clean or "snr" in c_clean or "dbm" in c_clean:
            header_map["signal_strength"] = col
        elif "cpu" in c_clean:
            header_map["cpu_load"] = col
        elif "mem" in c_clean:
            header_map["memory_usage"] = col

    required_fields = ["battery_charge", "battery_voltage", "temperature", "power_output"]
    missing = [req for req in required_fields if req not in header_map]
    if missing:
        raise ValueError(
            f"CSV is missing required telemetry columns: {', '.join(missing)}. "
            f"Found columns: {list(reader.fieldnames)}"
        )

    records = []
    now_str = get_utc_now()
    for row_idx, row in enumerate(reader, start=2):
        try:
            batt = float(row[header_map["battery_charge"]])
            volt = float(row[header_map["battery_voltage"]])
            temp = float(row[header_map["temperature"]])
            power = float(row[header_map["power_output"]])
            curr = float(row.get(header_map.get("battery_current", ""), 6.5))
            signal = float(row.get(header_map.get("signal_strength", ""), 92.0))
            cpu = float(row.get(header_map.get("cpu_load", ""), 25.0))
            mem = float(row.get(header_map.get("memory_usage", ""), 35.0))

            if not (0 <= batt <= 100):
                raise ValueError(f"Battery charge {batt}% out of valid range (0-100%) at row {row_idx}")
            if not (10 <= volt <= 40):
                raise ValueError(f"Battery voltage {volt}V out of realistic bus range (10-40V) at row {row_idx}")

            status = "CRITICAL" if (batt < 40 or temp > 50) else "WARNING" if (batt < 65 or temp > 40) else "NOMINAL"

            records.append({
                "satellite_id": satellite_id,
                "battery_charge": batt,
                "battery_voltage": volt,
                "battery_current": curr,
                "temperature": temp,
                "power_output": power,
                "signal_strength": signal,
                "packet_loss": 0.01,
                "cpu_load": cpu,
                "memory_usage": mem,
                "status": status,
                "timestamp": now_str
            })
        except ValueError as ve:
            if "out of" in str(ve):
                raise ve
            raise ValueError(f"Invalid numeric data at row {row_idx}: {row}")

    if not records:
        raise ValueError("CSV contains no valid telemetry data rows.")

    return records

def parse_and_validate_telemetry_json(json_content: str, satellite_id: str) -> List[Dict[str, Any]]:
    """Parses and validates JSON telemetry array or single frame."""
    try:
        data = json.loads(json_content)
    except Exception as e:
        raise ValueError(f"Invalid JSON format: {str(e)}")

    items = data if isinstance(data, list) else [data]
    if not items:
        raise ValueError("JSON payload contains no telemetry frames.")

    records = []
    now_str = get_utc_now()
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"Frame #{idx+1} is not a valid JSON object.")

        batt = float(item.get("battery_charge", item.get("battery", 85.0)))
        volt = float(item.get("battery_voltage", item.get("voltage", 28.4)))
        temp = float(item.get("temperature", item.get("temp", 24.0)))
        power = float(item.get("power_output", item.get("solar_power", 550.0)))
        curr = float(item.get("battery_current", item.get("current", 6.5)))
        sig = float(item.get("signal_strength", item.get("signal", 90.0)))
        cpu = float(item.get("cpu_load", 25.0))
        mem = float(item.get("memory_usage", 35.0))

        status = "CRITICAL" if (batt < 40 or temp > 50) else "WARNING" if (batt < 65 or temp > 40) else "NOMINAL"

        records.append({
            "satellite_id": satellite_id,
            "battery_charge": batt,
            "battery_voltage": volt,
            "battery_current": curr,
            "temperature": temp,
            "power_output": power,
            "signal_strength": sig,
            "packet_loss": 0.01,
            "cpu_load": cpu,
            "memory_usage": mem,
            "status": status,
            "timestamp": item.get("timestamp", now_str)
        })

    return records

def store_telemetry_records(conn: sqlite3.Connection, records: List[Dict[str, Any]]) -> int:
    """Saves telemetry batch into SQLite database."""
    cursor = conn.cursor()
    params = [
        (
            r["satellite_id"], r["timestamp"], r["battery_charge"], r["battery_voltage"],
            r["battery_current"], r["temperature"], r["power_output"], r["signal_strength"],
            r["packet_loss"], r["cpu_load"], r["memory_usage"], r["status"]
        )
        for r in records
    ]
    cursor.executemany("""
    INSERT INTO telemetry (
        satellite_id, timestamp, battery_charge, battery_voltage, battery_current,
        temperature, power_output, signal_strength, packet_loss, cpu_load,
        memory_usage, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, params)
    conn.commit()
    return len(records)
