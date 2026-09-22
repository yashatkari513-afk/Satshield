"""
SATSHIELD AI - Satellite Telemetry Baseline Dataset Generator
Generates realistic multi-subsystem normal-state telemetry representing a LEO/GEO spacecraft
over orbital cycles (e.g. eclipse/sunlit transitions, thermal balance, attitude stability).

Features:
- battery_voltage (V): nominal 28.0 - 32.5V
- battery_current (A): nominal 2.0 - 10.0A
- battery_charge (%): nominal 70.0 - 100.0%
- temperature (°C): nominal 16.0 - 32.0°C
- solar_power (W): nominal 450.0 - 850.0W
- communication_signal (dBm): nominal -92.0 to -70.0 dBm
- packet_loss (%): nominal 0.00 - 0.50%
- pitch (°): nominal -2.5 to +2.5°
- yaw (°): nominal -2.5 to +2.5°
- roll (°): nominal -2.5 to +2.5°
- payload_temp (°C): nominal 18.0 - 35.0°C
"""

import os
import numpy as np
import pandas as pd

FEATURE_NAMES = [
    'battery_voltage',
    'battery_current',
    'battery_charge',
    'temperature',
    'solar_power',
    'communication_signal',
    'packet_loss',
    'pitch',
    'yaw',
    'roll',
    'payload_temp'
]

CORE_5_FEATURES = [
    'battery_voltage',
    'battery_current',
    'temperature',
    'solar_power',
    'communication_signal'
]

def generate_normal_telemetry(num_samples: int = 15000, random_state: int = 42) -> pd.DataFrame:
    """
    Generates realistic normal baseline telemetry for a spacecraft under nominal orbital operations.
    """
    np.random.seed(random_state)
    t = np.linspace(0, 150 * np.pi, num_samples)

    # Solar power with orbital illumination cycles (day/night transition smoothness)
    solar_base = 650.0 + 160.0 * np.sin(t)
    solar_noise = np.random.normal(0, 10.0, num_samples)
    solar_power = np.clip(solar_base + solar_noise, 450.0, 850.0)

    # Battery voltage correlated with solar charging and load
    voltage_base = 29.8 + 1.1 * np.sin(t + 0.15)
    voltage_noise = np.random.normal(0, 0.12, num_samples)
    battery_voltage = np.clip(voltage_base + voltage_noise, 28.0, 32.2)

    # Battery current (A)
    current_base = 6.2 + 2.0 * np.cos(t * 1.2)
    current_noise = np.random.normal(0, 0.30, num_samples)
    battery_current = np.clip(current_base + current_noise, 2.5, 9.5)

    # Battery charge state (%)
    charge_base = 88.0 + 8.0 * np.sin(t + 0.1)
    charge_noise = np.random.normal(0, 0.8, num_samples)
    battery_charge = np.clip(charge_base + charge_noise, 72.0, 99.5)

    # Internal bus temperature (°C) with thermal inertia lag
    temp_base = 24.2 + 4.8 * np.sin(t - 0.35)
    temp_noise = np.random.normal(0, 0.35, num_samples)
    temperature = np.clip(temp_base + temp_noise, 16.5, 32.0)

    # Payload electronics temperature (°C)
    payload_base = 25.5 + 5.2 * np.sin(t - 0.30)
    payload_noise = np.random.normal(0, 0.40, num_samples)
    payload_temp = np.clip(payload_base + payload_noise, 18.0, 34.5)

    # Communication signal strength (dBm)
    signal_base = -81.5 + 5.5 * np.sin(t * 0.8)
    signal_noise = np.random.normal(0, 1.5, num_samples)
    communication_signal = np.clip(signal_base + signal_noise, -92.0, -70.0)

    # Packet loss (%) - nominal low with occasional minor noise
    packet_loss = np.clip(np.random.exponential(scale=0.03, size=num_samples), 0.0, 0.45)

    # AOCS attitude angles (pitch, yaw, roll in degrees)
    pitch = np.clip(np.random.normal(0.0, 0.6, num_samples), -2.5, 2.5)
    yaw = np.clip(np.random.normal(0.0, 0.6, num_samples), -2.5, 2.5)
    roll = np.clip(np.random.normal(0.0, 0.5, num_samples), -2.0, 2.0)

    data = pd.DataFrame({
        'battery_voltage': np.round(battery_voltage, 2),
        'battery_current': np.round(battery_current, 2),
        'battery_charge': np.round(battery_charge, 1),
        'temperature': np.round(temperature, 2),
        'solar_power': np.round(solar_power, 2),
        'communication_signal': np.round(communication_signal, 2),
        'packet_loss': np.round(packet_loss, 3),
        'pitch': np.round(pitch, 2),
        'yaw': np.round(yaw, 2),
        'roll': np.round(roll, 2),
        'payload_temp': np.round(payload_temp, 2)
    })

    return data

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, 'telemetry_data.csv')
    
    print(f"Generating realistic normal satellite baseline telemetry...")
    df = generate_normal_telemetry(num_samples=15000)
    df.to_csv(output_path, index=False)
    
    print(f"Successfully generated {len(df)} samples saved to: {output_path}")
    print("\nDataset Summary Statistics:")
    print(df.describe().T[['mean', 'std', 'min', '50%', 'max']])
