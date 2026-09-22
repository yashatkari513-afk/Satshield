"""
SATSHIELD AI - Realistic Satellite Anomaly Scenarios Engine
Provides 10 controlled, physically grounded satellite anomaly scenarios for SIH judging and evaluation.
Each scenario modifies underlying physical telemetry streams rather than applying a static label.
"""

from typing import Dict, Any, List, Optional
import numpy as np

SCENARIO_METADATA = {
    "1": {
        "id": "1",
        "key": "battery_degradation",
        "name": "Battery Degradation & Capacity Decay",
        "subsystem": "BATTERY",
        "expected_severity": "WARNING",
        "description": "Gradual electrochemical degradation leading to capacity loss, elevated internal resistance, and higher current draw."
    },
    "2": {
        "id": "2",
        "key": "battery_voltage_drop",
        "name": "EPS Bus Sudden Undervoltage",
        "subsystem": "POWER",
        "expected_severity": "CRITICAL",
        "description": "Severe main power distribution bus undervoltage below safe operational threshold (23.5V)."
    },
    "3": {
        "id": "3",
        "key": "solar_power_degradation",
        "name": "Solar Array Occlusion & Power Drop",
        "subsystem": "POWER",
        "expected_severity": "WARNING",
        "description": "Solar panel tracking misalignment or partial array shadowing causing power generation collapse."
    },
    "4": {
        "id": "4",
        "key": "overheating",
        "name": "Sustained Subsystem Overheating",
        "subsystem": "THERMAL",
        "expected_severity": "CRITICAL",
        "description": "Internal avionics temperature sustained above safe thermal limits (52°C) due to radiator degradation."
    },
    "5": {
        "id": "5",
        "key": "rapid_temperature_increase",
        "name": "Rapid Thermal Rate of Change Surge",
        "subsystem": "THERMAL",
        "expected_severity": "CRITICAL",
        "description": "High thermal derivative (dT/dt > 3.5°C/step) indicating thermal runaway or heater control latch-up."
    },
    "6": {
        "id": "6",
        "key": "communication_signal_degradation",
        "name": "RF Downlink Signal Loss",
        "subsystem": "COMMUNICATION",
        "expected_severity": "WARNING",
        "description": "Carrier signal strength dropping below -105 dBm from antenna gimbal mispointing or ionospheric disturbance."
    },
    "7": {
        "id": "7",
        "key": "packet_loss_spike",
        "name": "Downlink Packet Loss Surge",
        "subsystem": "COMMUNICATION",
        "expected_severity": "WARNING",
        "description": "Bit error rate degradation leading to packet loss spike above 8% on payload downlinks."
    },
    "8": {
        "id": "8",
        "key": "attitude_instability",
        "name": "AOCS Attitude Drift & Wheel Saturation",
        "subsystem": "ATTITUDE",
        "expected_severity": "CRITICAL",
        "description": "Reaction wheel saturation causing pitch/yaw pointing errors exceeding satellite payload tolerances."
    },
    "9": {
        "id": "9",
        "key": "sensor_drift",
        "name": "Telemetry Sensor Calibration Drift",
        "subsystem": "SENSOR",
        "expected_severity": "WARNING",
        "description": "Slow continuous bias drift in telemetry analog-to-digital converter sensors exceeding 2.5 sigma."
    },
    "10": {
        "id": "10",
        "key": "sudden_telemetry_spike",
        "name": "Transient Electrical / Thermal Spike",
        "subsystem": "POWER",
        "expected_severity": "WARNING",
        "description": "Momentary electrostatic discharge or current surge in the main electronics distribution unit."
    }
}

def generate_scenario_telemetry(scenario_key_or_id: str, step: int = 5) -> Dict[str, Any]:
    """
    Generates a single realistic telemetry frame corresponding to the chosen anomaly scenario.
    """
    key = scenario_key_or_id.lower()
    for meta in SCENARIO_METADATA.values():
        if meta["id"] == scenario_key_or_id or meta["key"] == key:
            key = meta["key"]
            break

    # Baseline nominal values
    frame = {
        "battery_voltage": 29.80,
        "battery_current": 6.20,
        "battery_charge": 88.0,
        "temperature": 24.20,
        "solar_power": 650.0,
        "communication_signal": -81.5,
        "packet_loss": 0.02,
        "pitch": 0.2,
        "yaw": -0.1,
        "roll": 0.0,
        "payload_temp": 25.5
    }

    if key == "battery_degradation":
        frame["battery_voltage"] = round(29.8 - (0.9 * step), 2)  # e.g., 25.3V at step 5
        frame["battery_charge"] = max(15.0, round(88.0 - (10.0 * step), 1))  # 38%
        frame["battery_current"] = round(6.2 + (1.8 * step), 2)  # 15.2A
        frame["temperature"] = round(24.2 + (1.2 * step), 2)  # 30.2°C

    elif key == "battery_voltage_drop":
        frame["battery_voltage"] = 22.40  # Deep undervoltage
        frame["battery_current"] = 17.80  # Heavy discharge
        frame["battery_charge"] = 32.0
        frame["temperature"] = 28.50

    elif key == "solar_power_degradation":
        frame["solar_power"] = max(50.0, round(650.0 - (100.0 * step), 2))  # 150W
        frame["battery_voltage"] = round(29.8 - (0.5 * step), 2)  # 27.3V
        frame["battery_charge"] = max(40.0, round(88.0 - (7.0 * step), 1))  # 53%

    elif key == "overheating":
        frame["temperature"] = min(75.0, round(24.2 + (6.0 * step), 2))  # 54.2°C
        frame["payload_temp"] = min(80.0, round(25.5 + (6.5 * step), 2))  # 58.0°C
        frame["battery_current"] = round(6.2 + (1.2 * step), 2)  # 12.2A

    elif key == "rapid_temperature_increase":
        frame["temperature"] = 58.40
        frame["payload_temp"] = 62.10
        frame["battery_current"] = 14.50

    elif key == "communication_signal_degradation":
        frame["communication_signal"] = max(-130.0, round(-81.5 - (7.0 * step), 2))  # -116.5 dBm
        frame["packet_loss"] = min(15.0, round(0.02 + (1.5 * step), 2))  # 7.5%

    elif key == "packet_loss_spike":
        frame["packet_loss"] = 12.80
        frame["communication_signal"] = -98.40

    elif key == "attitude_instability":
        frame["pitch"] = 18.50
        frame["yaw"] = -16.20
        frame["roll"] = 9.80
        frame["communication_signal"] = -96.0  # Antenna pointing loss

    elif key == "sensor_drift":
        frame["battery_voltage"] = 34.20  # Over-range reading from sensor drift
        frame["temperature"] = 43.50
        frame["battery_current"] = 13.80

    elif key == "sudden_telemetry_spike":
        frame["battery_current"] = 24.50  # Instantaneous current spike
        frame["battery_voltage"] = 24.80
        frame["temperature"] = 38.20

    return frame

def generate_scenario_sequence(scenario_key_or_id: str, num_steps: int = 6) -> List[Dict[str, Any]]:
    """
    Generates an ordered progression sequence from nominal to full anomaly state.
    """
    sequence = []
    for step in range(1, num_steps + 1):
        sequence.append(generate_scenario_telemetry(scenario_key_or_id, step=step))
    return sequence
