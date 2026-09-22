"""
SATSHIELD - Synthetic Satellite Telemetry Dataset Generator
Generates realistic multivariate telemetry records for ML model training and validation.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os

def generate_dataset(num_records=6000, random_seed=42):
    np.random.seed(random_seed)
    
    satellite_ids = ['SAT-001', 'SAT-002', 'SAT-003', 'SAT-004', 'INSAT-3D', 'GSAT-30']
    subsystems = ['POWER', 'BATTERY', 'THERMAL', 'COMMUNICATION', 'ATTITUDE', 'PAYLOAD']
    
    start_time = datetime(2026, 3, 1, 0, 0, 0)
    records = []
    
    # Target distribution: ~75% Normal, ~25% Anomaly
    # Anomaly categories:
    # 1. Battery Degradation
    # 2. Overheating
    # 3. Voltage Drop
    # 4. High Current Surge
    # 5. Communication Signal Degradation
    # 6. Vibration / Mechanical Anomaly
    # 7. Attitude Pointing Error
    
    anomaly_types = [
        'BATTERY_DEGRADATION',
        'OVERHEATING',
        'VOLTAGE_DROP',
        'HIGH_CURRENT',
        'COMMUNICATION_DROP',
        'VIBRATION_SPIKE',
        'ATTITUDE_ERROR'
    ]
    
    for i in range(num_records):
        sat_id = satellite_ids[i % len(satellite_ids)]
        timestamp = (start_time + timedelta(seconds=i * 60)).strftime("%Y-%m-%d %H:%M:%S")
        
        # Decide if this sample is normal or anomaly
        # Ensure a balanced mix across satellite orbits and scenarios
        is_anomaly = (i % 4 == 0) # 25% anomalies
        
        if not is_anomaly:
            # === NOMINAL SATELLITE TELEMETRY ===
            subsystem = np.random.choice(subsystems)
            label = 'NORMAL'
            
            # Nominal ranges:
            # Temperature: 18.0°C to 35.0°C (mean ~25°C)
            temperature_c = np.clip(np.random.normal(25.0, 3.5), 15.0, 38.0)
            
            # Voltage: 28.0V bus (27.8V to 28.8V)
            voltage_v = np.clip(np.random.normal(28.2, 0.25), 27.5, 29.0)
            
            # Current: 4.0A to 8.5A
            current_a = np.clip(np.random.normal(6.2, 0.8), 3.5, 9.5)
            
            # Battery State of Charge: 75% to 98%
            battery_soc_percent = np.clip(np.random.normal(88.0, 5.0), 70.0, 99.5)
            
            # Solar Power: 450W to 650W (sunlit phase) with slight orbit variation
            solar_power_w = np.clip(np.random.normal(540.0, 35.0), 400.0, 680.0)
            
            # Comm Signal: -75.0 dBm to -60.0 dBm (strong link)
            communication_signal_db = np.clip(np.random.normal(-68.0, 3.0), -80.0, -55.0)
            
            # Vibration: 0.02g to 0.08g (micro-vibration baseline)
            vibration_g = np.clip(np.random.normal(0.045, 0.012), 0.015, 0.085)
            
            # Attitude Error: 0.02° to 0.18° (nominal 3-axis stabilized)
            attitude_error_deg = np.clip(np.random.normal(0.08, 0.03), 0.01, 0.22)
            
        else:
            # === ANOMALOUS SATELLITE TELEMETRY ===
            label = 'ANOMALY'
            anomaly_type = anomaly_types[(i // 4) % len(anomaly_types)]
            
            # Base nominal baseline
            temperature_c = np.random.normal(26.0, 3.0)
            voltage_v = np.random.normal(28.2, 0.3)
            current_a = np.random.normal(6.5, 0.8)
            battery_soc_percent = np.random.normal(85.0, 5.0)
            solar_power_w = np.random.normal(530.0, 30.0)
            communication_signal_db = np.random.normal(-68.0, 3.0)
            vibration_g = np.random.normal(0.045, 0.01)
            attitude_error_deg = np.random.normal(0.08, 0.03)
            
            if anomaly_type == 'BATTERY_DEGRADATION':
                subsystem = 'BATTERY'
                # Rapid SoC drain, elevated current draw, slightly depressed voltage
                battery_soc_percent = np.clip(np.random.uniform(22.0, 48.0), 15.0, 52.0)
                current_a = np.clip(np.random.uniform(10.5, 14.8), 9.5, 16.0)
                voltage_v = np.clip(np.random.uniform(24.5, 26.2), 24.0, 26.8)
                temperature_c = np.clip(temperature_c + 8.5, 32.0, 46.0)
                
            elif anomaly_type == 'OVERHEATING':
                subsystem = 'THERMAL'
                # Temperature spikes far beyond thermal safe envelope (>55°C up to 88°C)
                temperature_c = np.clip(np.random.uniform(58.0, 84.0), 54.0, 92.0)
                # Slight secondary voltage droop due to thermal resistance
                voltage_v = np.clip(voltage_v - 0.8, 25.5, 27.5)
                
            elif anomaly_type == 'VOLTAGE_DROP':
                subsystem = 'POWER'
                # Main bus collapse below 23.5V critical threshold
                voltage_v = np.clip(np.random.uniform(19.2, 23.8), 18.0, 24.2)
                solar_power_w = np.clip(np.random.uniform(110.0, 260.0), 80.0, 310.0)
                
            elif anomaly_type == 'HIGH_CURRENT':
                subsystem = 'POWER'
                # Extreme electrical current surge (>18A up to 34A)
                current_a = np.clip(np.random.uniform(18.5, 32.0), 17.0, 36.0)
                temperature_c = np.clip(temperature_c + 12.0, 38.0, 58.0)
                voltage_v = np.clip(voltage_v - 1.5, 24.0, 26.8)
                
            elif anomaly_type == 'COMMUNICATION_DROP':
                subsystem = 'COMMUNICATION'
                # Signal strength collapses to extreme attenuation (-105 dBm to -128 dBm)
                communication_signal_db = np.clip(np.random.uniform(-125.0, -102.0), -135.0, -98.0)
                
            elif anomaly_type == 'VIBRATION_SPIKE':
                subsystem = 'ATTITUDE'
                # Reaction wheel structural resonance / gyro vibration (0.35g to 1.85g)
                vibration_g = np.clip(np.random.uniform(0.35, 1.75), 0.28, 2.10)
                attitude_error_deg = np.clip(attitude_error_deg + 0.6, 0.4, 1.8)
                
            elif anomaly_type == 'ATTITUDE_ERROR':
                subsystem = 'ATTITUDE'
                # Star tracker loss of lock / attitude error spike (2.5° to 14.5°)
                attitude_error_deg = np.clip(np.random.uniform(2.8, 12.5), 2.2, 16.0)
                solar_power_w = np.clip(solar_power_w * 0.45, 150.0, 320.0) # Misaligned solar arrays
        
        records.append({
            'timestamp': timestamp,
            'satellite_id': sat_id,
            'temperature_c': round(float(temperature_c), 2),
            'voltage_v': round(float(voltage_v), 2),
            'current_a': round(float(current_a), 2),
            'battery_soc_percent': round(float(battery_soc_percent), 2),
            'solar_power_w': round(float(solar_power_w), 2),
            'communication_signal_db': round(float(communication_signal_db), 2),
            'vibration_g': round(float(vibration_g), 4),
            'attitude_error_deg': round(float(attitude_error_deg), 3),
            'subsystem': subsystem,
            'label': label
        })
        
    df = pd.DataFrame(records)
    
    # Save to CSV
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, 'satellite_telemetry.csv')
    df.to_csv(output_path, index=False)
    
    print(f"Generated {len(df)} records saved to {output_path}")
    return df

if __name__ == '__main__':
    generate_dataset(6000)
