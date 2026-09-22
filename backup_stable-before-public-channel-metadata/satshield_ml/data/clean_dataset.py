"""
SATSHIELD ML Pipeline - Step 3: Dataset Cleaning & Validation
Loads, validates, cleans, and standardizes satellite telemetry data for feature engineering and ML.
"""
import os
import sys
import numpy as np
import pandas as pd

def clean_dataset():
    data_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(data_dir, 'satellite_telemetry.csv')
    output_path = os.path.join(data_dir, 'satellite_telemetry_clean.csv')

    print("=" * 70)
    print("SATSHIELD ML PIPELINE — STEP 3: DATASET CLEANING")
    print("=" * 70)

    # 1. Load CSV
    if not os.path.exists(input_path):
        print(f"[FAIL] Input file not found: {input_path}")
        sys.exit(1)
        
    df_raw = pd.read_csv(input_path)
    original_row_count = len(df_raw)
    print(f"Loaded raw dataset from: {input_path}")
    print(f"Original Row Count: {original_row_count}")

    # 2. Required columns check
    numeric_cols = [
        'temperature_c',
        'voltage_v',
        'current_a',
        'battery_soc_percent',
        'solar_power_w',
        'communication_signal_db',
        'vibration_g',
        'attitude_error_deg'
    ]
    meta_cols = ['timestamp', 'satellite_id', 'subsystem', 'label']
    required_cols = meta_cols + numeric_cols

    missing_required = [c for c in required_cols if c not in df_raw.columns]
    if missing_required:
        print(f"[FAIL] Missing required columns: {missing_required}")
        sys.exit(1)
    print("[PASS] All required columns confirmed present.")

    # Create working copy to ensure original CSV is untouched
    df = df_raw.copy()

    # 3. Convert timestamp to proper datetime format
    try:
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce', utc=True)
        invalid_timestamps = df['timestamp'].isnull().sum()
        if invalid_timestamps > 0:
            print(f"[WARN] Found {invalid_timestamps} unparseable timestamps. Dropping them.")
            df = df.dropna(subset=['timestamp'])
        timestamp_status = "Successfully converted to ISO UTC datetime format"
    except Exception as e:
        print(f"[FAIL] Timestamp conversion error: {e}")
        sys.exit(1)

    # 4. Convert telemetry columns to numeric values & detect invalid numeric values
    invalid_numeric_count = 0
    for col in numeric_cols:
        # Coerce any string/corrupt values to numeric
        df[col] = pd.to_numeric(df[col], errors='coerce')
        # Check for NaN / +/- inf
        nan_count = df[col].isnull().sum()
        inf_count = np.isinf(df[col]).sum()
        invalid_numeric_count += (nan_count + inf_count)
        
        # Replace inf with NaN for safe imputation or dropping
        df[col] = df[col].replace([np.inf, -np.inf], np.nan)

    print(f"Detected invalid numeric values (NaN/inf): {invalid_numeric_count}")

    # 5. Handle missing/null values safely (drop rows with missing telemetry values)
    pre_drop_count = len(df)
    df = df.dropna(subset=required_cols)
    dropped_nulls = pre_drop_count - len(df)
    print(f"Handled missing/null values: {dropped_nulls} rows removed (if any). Remaining nulls: {df.isnull().sum().sum()}")

    # 6. Remove exact duplicate rows if any
    duplicate_count = df.duplicated().sum()
    if duplicate_count > 0:
        print(f"Removing {duplicate_count} exact duplicate rows...")
        df = df.drop_duplicates()
    else:
        print(f"Exact duplicate rows detected: 0")

    # 7. Check that label contains only 'NORMAL' and 'ANOMALY'
    df['label'] = df['label'].astype(str).str.strip().str.upper()
    valid_labels = {'NORMAL', 'ANOMALY'}
    invalid_labels = df[~df['label'].isin(valid_labels)]
    if len(invalid_labels) > 0:
        print(f"[WARN] Dropping {len(invalid_labels)} rows with invalid label categories.")
        df = df[df['label'].isin(valid_labels)]

    # 8. Sort chronologically by timestamp and reset index
    df = df.sort_values(by=['timestamp', 'satellite_id']).reset_index(drop=True)
    
    # Format timestamp as clean ISO-8601 string for CSV persistence
    df['timestamp'] = df['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')

    cleaned_row_count = len(df)
    normal_count = int((df['label'] == 'NORMAL').sum())
    anomaly_count = int((df['label'] == 'ANOMALY').sum())
    remaining_missing_values = int(df.isnull().sum().sum())
    remaining_duplicates = int(df.duplicated().sum())

    # 9. Save cleaned dataset
    df.to_csv(output_path, index=False)
    print(f"[PASS] Cleaned dataset written to: {output_path}")

    # 10. Verification Report
    print("-" * 70)
    print("STEP 3 CLEANING & VERIFICATION SUMMARY:")
    print(f"  • Original Row Count     : {original_row_count:,}")
    print(f"  • Cleaned Row Count      : {cleaned_row_count:,}")
    print(f"  • Missing (Null) Values  : {remaining_missing_values}")
    print(f"  • Duplicate Rows         : {remaining_duplicates}")
    print(f"  • Invalid Numeric Values : {invalid_numeric_count}")
    print(f"  • NORMAL Records Count   : {normal_count:,} ({normal_count / cleaned_row_count * 100:.1f}%)")
    print(f"  • ANOMALY Records Count  : {anomaly_count:,} ({anomaly_count / cleaned_row_count * 100:.1f}%)")
    print(f"  • Timestamp Status       : {timestamp_status}")
    print(f"  • Final Clean CSV Path   : {output_path}")
    print(f"  • OVERALL STATUS         : PASS")
    print("=" * 70)

    return {
        'original_row_count': original_row_count,
        'cleaned_row_count': cleaned_row_count,
        'missing_values': remaining_missing_values,
        'duplicate_rows': remaining_duplicates,
        'invalid_numeric_values': invalid_numeric_count,
        'normal_count': normal_count,
        'anomaly_count': anomaly_count,
        'timestamp_status': timestamp_status,
        'final_csv_path': output_path,
        'status': 'PASS'
    }

if __name__ == '__main__':
    clean_dataset()
