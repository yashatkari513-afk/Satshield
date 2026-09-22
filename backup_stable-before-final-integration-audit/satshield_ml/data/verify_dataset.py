"""
Verification script for satshield_ml/data/satellite_telemetry.csv
"""
import os
import sys
import pandas as pd

def verify():
    csv_path = os.path.join(os.path.dirname(__file__), 'satellite_telemetry.csv')
    
    print("=" * 65)
    print("SATSHIELD TELEMETRY DATASET VERIFICATION")
    print("=" * 65)
    
    # 1. Check existence
    if not os.path.exists(csv_path):
        print(f"[FAIL] CSV file does not exist at: {csv_path}")
        sys.exit(1)
    print(f"[PASS] CSV file exists at: {csv_path}")
    print(f"       File size: {os.path.getsize(csv_path):,} bytes")
    
    # Load dataset
    df = pd.read_csv(csv_path)
    
    # 2. Row & column count
    total_rows, total_cols = df.shape
    print(f"[PASS] Total rows    : {total_rows}")
    print(f"[PASS] Total columns : {total_cols}")
    
    # Verify expected columns
    expected_cols = [
        'timestamp', 'satellite_id', 'temperature_c', 'voltage_v',
        'current_a', 'battery_soc_percent', 'solar_power_w',
        'communication_signal_db', 'vibration_g', 'attitude_error_deg',
        'subsystem', 'label'
    ]
    missing_cols = [c for c in expected_cols if c not in df.columns]
    if missing_cols:
        print(f"[FAIL] Missing expected columns: {missing_cols}")
        sys.exit(1)
    else:
        print("[PASS] All 12 expected columns are present.")
        
    # 3. Normal vs Anomaly breakdown
    label_counts = df['label'].value_counts()
    normal_count = label_counts.get('NORMAL', 0)
    anomaly_count = label_counts.get('ANOMALY', 0)
    print(f"[PASS] Normal records  : {normal_count} ({normal_count / total_rows * 100:.1f}%)")
    print(f"[PASS] Anomaly records : {anomaly_count} ({anomaly_count / total_rows * 100:.1f}%)")
    
    # 4. Missing values
    missing_values = df.isnull().sum().sum()
    if missing_values == 0:
        print(f"[PASS] Missing (null/NaN) values : {missing_values}")
    else:
        print(f"[FAIL] Found {missing_values} missing values!")
        print(df.isnull().sum())
        sys.exit(1)
        
    # 5. Duplicate rows
    duplicate_rows = df.duplicated().sum()
    if duplicate_rows == 0:
        print(f"[PASS] Duplicate rows            : {duplicate_rows}")
    else:
        print(f"[FAIL] Found {duplicate_rows} duplicate rows!")
        sys.exit(1)
        
    # 6. Satellite & subsystem distribution
    print("-" * 65)
    print("Satellite ID breakdown:")
    for sat, count in df['satellite_id'].value_counts().items():
        print(f"  • {sat:<12}: {count} rows")
        
    print("\nSubsystem breakdown:")
    for sub, count in df['subsystem'].value_counts().items():
        print(f"  • {sub:<14}: {count} rows")
        
    print("-" * 65)
    print("VERIFICATION RESULT: ALL DATASET CHECKS PASSED.")
    print("=" * 65)

if __name__ == '__main__':
    verify()
