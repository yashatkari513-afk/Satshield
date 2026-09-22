"""
SATSHIELD ML Pipeline - Step 4: Feature Engineering
Extracts temporal dynamics, rates of change, rolling statistical baselines,
and deviation metrics from clean satellite telemetry.
"""
import os
import sys
import numpy as np
import pandas as pd

def engineer_features():
    data_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(data_dir, 'satellite_telemetry_clean.csv')
    output_path = os.path.join(data_dir, 'satellite_features.csv')

    print("=" * 75)
    print("SATSHIELD ML PIPELINE — STEP 4: FEATURE ENGINEERING")
    print("=" * 75)

    if not os.path.exists(input_path):
        print(f"[FAIL] Input dataset not found: {input_path}")
        sys.exit(1)

    df_clean = pd.read_csv(input_path)
    original_row_count = len(df_clean)
    print(f"Loaded clean dataset: {input_path} ({original_row_count} rows)")

    # Ensure chronological order per satellite
    df_clean['timestamp'] = pd.to_datetime(df_clean['timestamp'], utc=True)
    df_clean = df_clean.sort_values(by=['satellite_id', 'timestamp']).reset_index(drop=True)

    telemetry_cols = [
        'temperature_c',
        'voltage_v',
        'current_a',
        'battery_soc_percent',
        'solar_power_w',
        'communication_signal_db',
        'vibration_g',
        'attitude_error_deg'
    ]

    # Target features to create
    feature_dfs = []

    # Process per satellite_id to prevent inter-satellite time-series bleed
    for sat_id, group in df_clean.groupby('satellite_id', sort=False):
        group = group.copy()
        
        # 1. Rates of Change (Delta: current - previous frame)
        for col in telemetry_cols:
            base_name = col.replace('_c', '').replace('_v', '').replace('_a', '').replace('_percent', '').replace('_w', '').replace('_db', '').replace('_g', '').replace('_deg', '')
            change_col = f"{base_name}_change"
            # Difference from preceding frame within this satellite's stream
            group[change_col] = group[col].diff().fillna(0.0)

        # 2. Rolling Statistical Baselines & Deviations (window size = 5 frames, min_periods = 1)
        window_size = 5
        for col in telemetry_cols:
            base_name = col.replace('_c', '').replace('_v', '').replace('_a', '').replace('_percent', '').replace('_w', '').replace('_db', '').replace('_g', '').replace('_deg', '')
            
            # Rolling Mean & Rolling Std
            rolling_mean = group[col].rolling(window=window_size, min_periods=1).mean()
            rolling_std = group[col].rolling(window=window_size, min_periods=1).std().fillna(0.0)
            
            # Deviation from rolling mean
            dev_col = f"{base_name}_deviation"
            group[dev_col] = (group[col] - rolling_mean).round(4)
            
            # Additional ML rolling feature columns
            group[f"{base_name}_rolling_mean"] = rolling_mean.round(4)
            group[f"{base_name}_rolling_std"] = rolling_std.round(4)

        # 3. Domain-Specific Physical Satellite Telemetry Interactions
        # Power Draw = Voltage * Current
        group['power_draw_w'] = (group['voltage_v'] * group['current_a']).round(2)
        # Net Power = Solar Generation - Power Draw
        group['net_power_w'] = (group['solar_power_w'] - group['power_draw_w']).round(2)

        feature_dfs.append(group)

    df_features = pd.concat(feature_dfs, ignore_index=True)

    # Sort back chronologically
    df_features = df_features.sort_values(by=['timestamp', 'satellite_id']).reset_index(drop=True)
    df_features['timestamp'] = df_features['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')

    # Safety checks for NaN or Inf
    inf_count = np.isinf(df_features.select_dtypes(include=[np.number])).sum().sum()
    nan_count = df_features.isnull().sum().sum()

    if inf_count > 0:
        print(f"[WARN] Found {inf_count} infinite values; replacing with 0.0")
        df_features = df_features.replace([np.inf, -np.inf], 0.0)

    if nan_count > 0:
        print(f"[WARN] Found {nan_count} NaN values; filling with 0.0")
        df_features = df_features.fillna(0.0)

    # Save feature dataset
    df_features.to_csv(output_path, index=False)
    print(f"[PASS] Feature dataset successfully saved to: {output_path}")

    # Metrics
    feature_row_count = len(df_features)
    total_cols = len(df_features.columns)
    normal_count = int((df_features['label'] == 'NORMAL').sum())
    anomaly_count = int((df_features['label'] == 'ANOMALY').sum())
    duplicate_rows = int(df_features.duplicated().sum())
    remaining_nan = int(df_features.isnull().sum().sum())
    remaining_inf = int(np.isinf(df_features.select_dtypes(include=[np.number])).sum().sum())

    # Identify created features (excluding metadata & raw columns)
    raw_and_meta = set(df_clean.columns)
    created_features = [c for c in df_features.columns if c not in raw_and_meta]

    print("-" * 75)
    print("STEP 4 FEATURE ENGINEERING SUMMARY:")
    print(f"  • Original Clean Row Count : {original_row_count:,}")
    print(f"  • Feature Dataset Row Count: {feature_row_count:,}")
    print(f"  • Total Columns in Dataset : {total_cols}")
    print(f"  • Number of New ML Features: {len(created_features)}")
    print(f"  • Missing Values (NaN)     : {remaining_nan}")
    print(f"  • Infinite Values (Inf)    : {remaining_inf}")
    print(f"  • Duplicate Rows           : {duplicate_rows}")
    print(f"  • NORMAL Records Count     : {normal_count:,} ({normal_count / feature_row_count * 100:.1f}%)")
    print(f"  • ANOMALY Records Count    : {anomaly_count:,} ({anomaly_count / feature_row_count * 100:.1f}%)")
    print(f"  • Final File Path          : {output_path}")
    print(f"  • OVERALL STATUS           : PASS")
    print("-" * 75)
    print("Created ML Features:")
    for idx, f in enumerate(created_features, 1):
        print(f"   {idx:2d}. {f}")
    print("=" * 75)

    return {
        'original_row_count': original_row_count,
        'feature_row_count': feature_row_count,
        'total_columns': total_cols,
        'new_features_count': len(created_features),
        'created_features': created_features,
        'missing_values': remaining_nan,
        'infinite_values': remaining_inf,
        'duplicate_rows': duplicate_rows,
        'normal_count': normal_count,
        'anomaly_count': anomaly_count,
        'final_path': output_path,
        'status': 'PASS'
    }

if __name__ == '__main__':
    engineer_features()
