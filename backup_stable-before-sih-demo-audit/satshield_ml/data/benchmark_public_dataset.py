"""
SATSHIELD - Public NASA SMAP & MSL Spacecraft Telemetry Benchmark & Evaluation Tool
Independent, channel-agnostic time-series anomaly detection evaluation against verified NASA ground-truth.
DOES NOT MODIFY PRODUCTION MODELS, BACKEND, FRONTEND, OR SYNTHETIC DATASETS.
"""
import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import IsolationForest
from typing import Dict, Any, List, Tuple

def safe_div(num: float, den: float, decimals: int = 4) -> float:
    if den == 0:
        return 0.0
    return round(float(num / den), decimals)

def extract_channel_features(arr: np.ndarray, window_size: int = 5) -> np.ndarray:
    """
    Extracts strictly backward-looking temporal features from the continuous telemetry column (col 0).
    Ensures ZERO future label leakage.
    Features extracted:
      1. Raw telemetry value x_t
      2. 1-step backward delta (x_t - x_{t-1})
      3. Rolling mean mu_5(x)
      4. Rolling std sigma_5(x)
      5. Baseline deviation (x_t - mu_5(x))
    """
    signal = arr[:, 0]
    s_series = pd.Series(signal)
    
    # 1. Delta
    delta = s_series.diff().fillna(0.0).values
    
    # 2. Rolling statistics (backward-looking only, window=5, min_periods=1)
    rolling_mean = s_series.rolling(window=window_size, min_periods=1).mean().values
    rolling_std = s_series.rolling(window=window_size, min_periods=1).std().fillna(0.0).values
    
    # 3. Rolling deviation
    rolling_dev = signal - rolling_mean
    
    # Stack into feature matrix (N, 5)
    features = np.column_stack([signal, delta, rolling_mean, rolling_std, rolling_dev])
    return features

def run_public_benchmark() -> Dict[str, Any]:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(base_dir, 'public')
    train_dir = os.path.join(public_dir, 'train')
    test_dir = os.path.join(public_dir, 'test')
    labels_csv = os.path.join(public_dir, 'labeled_anomalies.csv')
    
    results_json_path = os.path.join(public_dir, 'public_benchmark_results.json')
    report_md_path = os.path.join(public_dir, 'public_benchmark_report.md')

    print("=" * 80)
    print("SATSHIELD ML — NASA SMAP & MSL PUBLIC DATASET BENCHMARK EVALUATION")
    print("=" * 80)

    # 1. Verify files
    if not os.path.exists(labels_csv):
        print(f"[FAIL] Missing labeled_anomalies.csv: {labels_csv}")
        sys.exit(1)
    if not os.path.exists(train_dir) or not os.path.exists(test_dir):
        print(f"[FAIL] Missing train/test directories in: {public_dir}")
        sys.exit(1)

    df_labels = pd.read_csv(labels_csv)
    
    # Build unique mapping of channel -> list of anomaly sequences and spacecraft
    channel_info = {}
    for _, row in df_labels.iterrows():
        chan = row['chan_id']
        sp_craft = row['spacecraft']
        seqs = json.loads(row['anomaly_sequences'])
        if chan not in channel_info:
            channel_info[chan] = {
                'spacecraft': sp_craft,
                'sequences': list(seqs),
                'classes': str(row['class'])
            }
        else:
            # Handle duplicate entries (e.g. P-2) by merging sequences without double counting
            for s in seqs:
                if s not in channel_info[chan]['sequences']:
                    channel_info[chan]['sequences'].append(s)

    all_train_files = sorted([f for f in os.listdir(train_dir) if f.endswith('.npy')])
    all_channels = sorted(list(set([f.replace('.npy', '') for f in all_train_files])))

    print(f"Cataloged {len(all_channels)} channels for independent time-series evaluation.")
    print(f"Algorithm: Channel-Agnostic IsolationForest (n_estimators=100, contamination='auto', random_state=42)")
    print(f"Feature Space: [Continuous Signal, 1-step Delta, Rolling Mean 5, Rolling Std 5, Rolling Deviation]")
    print("-" * 80)

    per_channel_results = []
    
    total_tp = 0
    total_tn = 0
    total_fp = 0
    total_fn = 0
    total_evaluated_samples = 0
    
    all_latencies = []
    total_sequences_count = 0
    total_sequences_detected = 0
    total_sequences_missed = 0

    smap_tp, smap_tn, smap_fp, smap_fn, smap_samples = 0, 0, 0, 0, 0
    msl_tp, msl_tn, msl_fp, msl_fn, msl_samples = 0, 0, 0, 0, 0

    for idx, chan in enumerate(all_channels, 1):
        train_path = os.path.join(train_dir, f"{chan}.npy")
        test_path = os.path.join(test_dir, f"{chan}.npy")

        if not os.path.exists(train_path) or not os.path.exists(test_path):
            continue

        # Load raw binary telemetry arrays
        train_raw = np.load(train_path)
        test_raw = np.load(test_path)

        # Check for NaN / Inf
        if np.isnan(train_raw).any() or np.isnan(test_raw).any():
            print(f"[WARN] Channel {chan} contains NaN values. Imputing...")
            train_raw = np.nan_to_num(train_raw)
            test_raw = np.nan_to_num(test_raw)

        # Extract 5-dimensional temporal feature space
        X_train = extract_channel_features(train_raw, window_size=5)
        X_test = extract_channel_features(test_raw, window_size=5)

        test_len = len(X_test)
        meta = channel_info.get(chan, {'spacecraft': 'SMAP' if chan.startswith(('A','B','D','E','S')) else 'MSL', 'sequences': [], 'classes': 'None'})
        sp_craft = meta['spacecraft']
        sequences = meta['sequences']

        # Construct ground-truth binary mask (0 = Normal, 1 = Labeled Anomaly)
        y_true = np.zeros(test_len, dtype=int)
        for s in sequences:
            start_idx = max(0, int(s[0]))
            end_idx = min(test_len, int(s[1]))
            if start_idx < end_idx:
                y_true[start_idx:end_idx] = 1

        # Train isolated channel detector strictly on nominal training telemetry
        detector = IsolationForest(
            n_estimators=100,
            max_samples='auto',
            contamination='auto',
            random_state=42,
            n_jobs=-1
        )
        detector.fit(X_train)

        # Generate test predictions: -1 -> Anomaly (1), 1 -> Normal (0)
        raw_preds = detector.predict(X_test)
        y_pred = (raw_preds == -1).astype(int)

        # Point-wise Confusion Matrix Calculation
        tp = int(np.sum((y_true == 1) & (y_pred == 1)))
        tn = int(np.sum((y_true == 0) & (y_pred == 0)))
        fp = int(np.sum((y_true == 0) & (y_pred == 1)))
        fn = int(np.sum((y_true == 1) & (y_pred == 0)))

        # Conservation check: TP + TN + FP + FN == test_len
        assert tp + tn + fp + fn == test_len, f"Conservation violation in channel {chan}: {tp}+{tn}+{fp}+{fn} != {test_len}"

        # Channel Classification Metrics
        ch_prec = safe_div(tp, tp + fp)
        ch_rec = safe_div(tp, tp + fn)
        ch_f1 = safe_div(2 * ch_prec * ch_rec, ch_prec + ch_rec)
        ch_fpr = safe_div(fp, fp + tn)
        ch_acc = safe_div(tp + tn, test_len)

        # Sequence-level Detection & Latency Analysis
        ch_latencies = []
        for s in sequences:
            total_sequences_count += 1
            s_start = max(0, int(s[0]))
            s_end = min(test_len, int(s[1]))
            if s_start >= s_end:
                continue

            interval_preds = y_pred[s_start:s_end]
            if np.any(interval_preds == 1):
                total_sequences_detected += 1
                first_flag_offset = int(np.argmax(interval_preds == 1))
                ch_latencies.append(first_flag_offset)
                all_latencies.append(first_flag_offset)
            else:
                total_sequences_missed += 1

        ch_mean_lat = round(float(np.mean(ch_latencies)), 2) if ch_latencies else None

        per_channel_results.append({
            'channel_id': chan,
            'spacecraft': sp_craft,
            'test_length': test_len,
            'labeled_anomaly_count': len(sequences),
            'labeled_anomaly_timesteps': int(np.sum(y_true)),
            'TP': tp,
            'TN': tn,
            'FP': fp,
            'FN': fn,
            'precision': ch_prec,
            'recall': ch_rec,
            'f1': ch_f1,
            'accuracy': ch_acc,
            'fpr': ch_fpr,
            'detection_latency_mean_steps': ch_mean_lat
        })

        # Aggregate accumulations
        total_tp += tp
        total_tn += tn
        total_fp += fp
        total_fn += fn
        total_evaluated_samples += test_len

        if sp_craft == 'SMAP':
            smap_tp += tp
            smap_tn += tn
            smap_fp += fp
            smap_fn += fn
            smap_samples += test_len
        else:
            msl_tp += tp
            msl_tn += tn
            msl_fp += fp
            msl_fn += fn
            msl_samples += test_len

        if idx % 20 == 0 or idx == len(all_channels):
            print(f"Evaluated {idx}/{len(all_channels)} channels... (Cumulative TP: {total_tp}, FP: {total_fp})")

    # Global Aggregate Metrics Calculation
    overall_prec = safe_div(total_tp, total_tp + total_fp)
    overall_rec = safe_div(total_tp, total_tp + total_fn)
    overall_f1 = safe_div(2 * overall_prec * overall_rec, overall_prec + overall_rec)
    overall_acc = safe_div(total_tp + total_tn, total_evaluated_samples)
    overall_fpr = safe_div(total_fp, total_fp + total_tn)
    overall_fnr = safe_div(total_fn, total_fn + total_tp)
    overall_spec = safe_div(total_tn, total_tn + total_fp)
    overall_seq_det_rate = safe_div(total_sequences_detected, total_sequences_count)

    # SMAP Aggregate
    smap_prec = safe_div(smap_tp, smap_tp + smap_fp)
    smap_rec = safe_div(smap_tp, smap_tp + smap_fn)
    smap_f1 = safe_div(2 * smap_prec * smap_rec, smap_prec + smap_rec)
    smap_fpr = safe_div(smap_fp, smap_fp + smap_tn)
    smap_acc = safe_div(smap_tp + smap_tn, smap_samples)

    # MSL Aggregate
    msl_prec = safe_div(msl_tp, msl_tp + msl_fp)
    msl_rec = safe_div(msl_tp, msl_tp + msl_fn)
    msl_f1 = safe_div(2 * msl_prec * msl_rec, msl_prec + msl_rec)
    msl_fpr = safe_div(msl_fp, msl_fp + msl_tn)
    msl_acc = safe_div(msl_tp + msl_tn, msl_samples)

    # Latency Aggregates
    mean_latency = round(float(np.mean(all_latencies)), 2) if all_latencies else 0.0
    median_latency = round(float(np.median(all_latencies)), 2) if all_latencies else 0.0
    min_latency = int(np.min(all_latencies)) if all_latencies else 0
    max_latency = int(np.max(all_latencies)) if all_latencies else 0

    benchmark_summary = {
        'benchmark_metadata': {
            'timestamp_utc': datetime.now(timezone.utc).isoformat(),
            'dataset_name': 'NASA SMAP & MSL Spacecraft Telemetry Anomaly Dataset',
            'lead_organization': 'NASA Jet Propulsion Laboratory (JPL) / Caltech',
            'license': 'BSD-3-Clause Open Source License',
            'production_model_directly_evaluated': False,
            'compatibility_verdict': 'Production 42-feature schema expects physical fields (temperature_c, voltage_v, etc.) and cannot be directly fed anonymized NASA single-channel streams without inventing false physical mappings. A separate channel-agnostic IsolationForest benchmark was evaluated using identical mathematical temporal feature principles.',
            'detector_used': 'Channel-Agnostic Scikit-Learn IsolationForest (n_estimators=100, contamination=auto, random_state=42)',
            'feature_extraction_method': 'Backward-looking 5-step rolling window: [x_t, delta_t, mean_5, std_5, dev_5] (Zero future leakage)',
            'total_channels_evaluated': len(all_channels),
            'total_test_observations': total_evaluated_samples
        },
        'overall_results': {
            'total_evaluated_samples': total_evaluated_samples,
            'TP': total_tp,
            'TN': total_tn,
            'FP': total_fp,
            'FN': total_fn,
            'precision': overall_prec,
            'recall_sensitivity': overall_rec,
            'f1_score': overall_f1,
            'accuracy': overall_acc,
            'false_positive_rate_fpr': overall_fpr,
            'false_negative_rate_fnr': overall_fnr,
            'specificity': overall_spec,
            'total_ground_truth_sequences': total_sequences_count,
            'detected_sequences': total_sequences_detected,
            'missed_sequences': total_sequences_missed,
            'sequence_detection_rate': overall_seq_det_rate,
            'latency_steps_mean': mean_latency,
            'latency_steps_median': median_latency,
            'latency_steps_min': min_latency,
            'latency_steps_max': max_latency
        },
        'smap_results': {
            'evaluated_samples': smap_samples,
            'TP': smap_tp,
            'TN': smap_tn,
            'FP': smap_fp,
            'FN': smap_fn,
            'precision': smap_prec,
            'recall': smap_rec,
            'f1_score': smap_f1,
            'accuracy': smap_acc,
            'fpr': smap_fpr
        },
        'msl_results': {
            'evaluated_samples': msl_samples,
            'TP': msl_tp,
            'TN': msl_tn,
            'FP': msl_fp,
            'FN': msl_fn,
            'precision': msl_prec,
            'recall': msl_rec,
            'f1_score': msl_f1,
            'accuracy': msl_acc,
            'fpr': msl_fpr
        },
        'per_channel_results': per_channel_results
    }

    # Save JSON results
    with open(results_json_path, 'w', encoding='utf-8') as f:
        json.dump(benchmark_summary, f, indent=2)
    print(f"\n[SAVED] Benchmark JSON results -> {results_json_path}")

    # Generate Markdown Report
    generate_markdown_report(benchmark_summary, report_md_path)
    print(f"[SAVED] Benchmark Markdown Report -> {report_md_path}")

    print("=" * 80)
    print(f"BENCHMARK COMPLETED SUCCESSFULLY")
    print(f"• Total Channels Tested     : {len(all_channels)}")
    print(f"• Total Test Timesteps      : {total_evaluated_samples:,}")
    print(f"• Sequence Detection Rate   : {overall_seq_det_rate * 100:.2f}% ({total_sequences_detected}/{total_sequences_count} incidents caught)")
    print(f"• Point-Wise F1-Score       : {overall_f1:.4f}")
    print(f"• Point-Wise Precision      : {overall_prec:.4f}")
    print(f"• Point-Wise Recall         : {overall_rec:.4f}")
    print(f"• Mean Detection Latency    : {mean_latency} timesteps")
    print("=" * 80)

    return benchmark_summary

def generate_markdown_report(data: Dict[str, Any], output_path: str):
    m = data['benchmark_metadata']
    ov = data['overall_results']
    smap = data['smap_results']
    msl = data['msl_results']
    ch_list = data['per_channel_results']

    md = []
    md.append("# SATSHIELD NASA SMAP & MSL Public Telemetry Benchmark Report\n")
    md.append("**Document Version:** 1.0.0  ")
    md.append(f"**Execution Timestamp:** {m['timestamp_utc']}  ")
    md.append("**Evaluation Paradigm:** Independent, Channel-Agnostic IsolationForest Benchmark on Real Flight Telemetry  ")
    md.append(f"**Dataset:** {m['dataset_name']} ({m['lead_organization']})  ")
    md.append(f"**License:** {m['license']}  \n")
    md.append("---\n")

    md.append("## 1. Executive Summary & Scientific Distinction\n")
    md.append("> [!IMPORTANT]")
    md.append("> **Scientific Distinction:** The SATSHIELD production `IsolationForest` model is trained on our 42-feature multivariate physical schema (`temperature_c`, `voltage_v`, etc.) for real-time dashboard telemetry. Because NASA JPL pre-anonymized sensor IDs and units, forcing NASA channels into fake physical fields would violate engineering integrity. Instead, **SATSHIELD's anomaly-detection methodology was independently benchmarked on publicly available NASA spacecraft telemetry using a channel-agnostic temporal evaluation.**\n")

    md.append("### Key Benchmark Outcomes\n")
    md.append("| Metric | Overall Benchmark | NASA SMAP (Earth Orbit) | NASA MSL (Mars Rover/Spacecraft) |")
    md.append("| :--- | :--- | :--- | :--- |")
    md.append(f"| **Evaluated Test Observations** | **{ov['total_evaluated_samples']:,}** | {smap['evaluated_samples']:,} | {msl['evaluated_samples']:,} |")
    md.append(f"| **True Positives (TP)** | **{ov['TP']:,}** | {smap['TP']:,} | {msl['TP']:,} |")
    md.append(f"| **True Negatives (TN)** | **{ov['TN']:,}** | {smap['TN']:,} | {msl['TN']:,} |")
    md.append(f"| **False Positives (FP)** | **{ov['FP']:,}** | {smap['FP']:,} | {msl['FP']:,} |")
    md.append(f"| **False Negatives (FN)** | **{ov['FN']:,}** | {smap['FN']:,} | {msl['FN']:,} |")
    md.append(f"| **Precision** | **{ov['precision']:.4f}** | {smap['precision']:.4f} | {msl['precision']:.4f} |")
    md.append(f"| **Recall (Sensitivity)** | **{ov['recall_sensitivity']:.4f}** | {smap['recall']:.4f} | {msl['recall']:.4f} |")
    md.append(f"| **F1-Score** | **{ov['f1_score']:.4f}** | {smap['f1_score']:.4f} | {msl['f1_score']:.4f} |")
    md.append(f"| **Accuracy** | **{ov['accuracy']:.4f}** | {smap['accuracy']:.4f} | {msl['accuracy']:.4f} |")
    md.append(f"| **False Positive Rate (FPR)** | **{ov['false_positive_rate_fpr']:.4f}** | {smap['fpr']:.4f} | {msl['fpr']:.4f} |")
    md.append(f"| **Incident Sequence Detection Rate** | **{ov['sequence_detection_rate']*100:.2f}%** ({ov['detected_sequences']}/{ov['total_ground_truth_sequences']}) | — | — |\n")

    md.append("---\n")
    md.append("## 2. Detection Latency Analysis\n")
    md.append("For each ground-truth anomaly interval $[s, e]$, latency is measured as the number of elapsed timesteps between anomaly inception $s$ and the first triggered alert:\n")
    md.append(f"* **Total Labeled Anomaly Sequences:** {ov['total_ground_truth_sequences']}")
    md.append(f"* **Successfully Detected Incidents:** **{ov['detected_sequences']}** ({ov['sequence_detection_rate']*100:.2f}%)")
    md.append(f"* **Missed Incidents:** **{ov['missed_sequences']}**")
    md.append(f"* **Mean Detection Latency:** **{ov['latency_steps_mean']} timesteps**")
    md.append(f"* **Median Detection Latency:** **{ov['latency_steps_median']} timesteps**")
    md.append(f"* **Latency Range:** **[{ov['latency_steps_min']}, {ov['latency_steps_max']}] timesteps**\n")

    md.append("---\n")
    md.append("## 3. Mathematical Feature Representation & Guardrails\n")
    md.append("1. **Feature Construction:** For every channel, an isolated 5-dimensional temporal feature space was computed:")
    md.append("   * Raw continuous signal $x_t$ (`col 0`)")
    md.append("   * 1-step backward rate of change $\\Delta x_t = x_t - x_{t-1}$")
    md.append("   * 5-step rolling mean $\\mu_5(x)_t$")
    md.append("   * 5-step rolling standard deviation $\\sigma_5(x)_t$")
    md.append("   * Baseline deviation $x_t - \\mu_5(x)_t$")
    md.append("2. **Zero Label Leakage:** Rolling windows were strictly backward-looking (`min_periods=1`). Future timesteps and ground-truth anomaly labels were never used during feature construction or training.")
    md.append("3. **Conservation Law Verified:** For every evaluated channel, $TP + TN + FP + FN = N_{\\text{test}}$ was mathematically enforced with 100% compliance.\n")

    md.append("---\n")
    md.append("## 4. Per-Channel Benchmark Performance Table\n")
    md.append("| Channel | Spacecraft | Test Samples | Anomaly Seq | TP | TN | FP | FN | Precision | Recall | F1 | FPR | Mean Latency (Steps) |")
    md.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
    for ch in ch_list:
        lat_str = f"{ch['detection_latency_mean_steps']}" if ch['detection_latency_mean_steps'] is not None else "N/A"
        md.append(f"| **{ch['channel_id']}** | {ch['spacecraft']} | {ch['test_length']:,} | {ch['labeled_anomaly_count']} | {ch['TP']} | {ch['TN']} | {ch['FP']} | {ch['FN']} | {ch['precision']:.3f} | {ch['recall']:.3f} | {ch['f1']:.3f} | {ch['fpr']:.3f} | {lat_str} |")

    md.append("\n---\n")
    md.append("## 5. Limitations & Engineering Discussion\n")
    md.append("1. **Continuous Normalization:** Public signals are pre-scaled in $[-1.0, 1.0]$. The absolute magnitude of physical faults (e.g. Volts or °C) is concealed.")
    md.append("2. **Sampling Intervals:** Sampling rates in raw arrays are indexed in sequential timesteps. Without published telemetry timestamps per channel, converting latency into seconds/minutes is omitted to avoid fabrication.")
    md.append("3. **Unsupervised Contamination:** `IsolationForest` operates unsupervised (`contamination='auto'`). Threshold tuning against validation sets can further improve point-level precision on high-noise channels.\n")

    md.append("---\n")
    md.append("## 6. Reproducibility & Artifact Manifest\n")
    md.append(f"* **Evaluation Script:** `satshield_ml/data/benchmark_public_dataset.py`")
    md.append(f"* **Results Data:** `satshield_ml/data/public/public_benchmark_results.json`")
    md.append(f"* **Dataset Source:** `satshield_ml/data/public/` (82 train / 82 test `.npy` files + `labeled_anomalies.csv`)")
    md.append(f"* **Production Integrity:** The production IsolationForest model (`satshield_ml/models/isolation_forest.joblib`) was 100% untouched.")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md))

if __name__ == '__main__':
    run_public_benchmark()
