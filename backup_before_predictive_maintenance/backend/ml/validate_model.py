"""
SATSHIELD AI - Model Validation & Anomaly Benchmark Test Suite (Step 17)
Evaluates the real Isolation Forest anomaly detection engine on a labeled synthetic benchmark dataset.
Calculates Precision, Recall, F1 Score, False Positive Rate (FPR), False Negative Rate (FNR), and Accuracy.

Note: Clearly labeled as evaluated on realistic synthetic satellite telemetry benchmarks for SIH demonstration.
"""

import os
import sys
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

# Ensure parent directory is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass

from ml.detector import SatelliteAnomalyDetector
from ml.scenarios import SCENARIO_METADATA, generate_scenario_telemetry
from data.generate_dataset import generate_normal_telemetry

def generate_evaluation_dataset(num_normal: int = 1000, samples_per_scenario: int = 120) -> Tuple[pd.DataFrame, np.ndarray]:
    """
    Generates a balanced labeled dataset of normal frames (label=0) and all 10 anomaly scenarios (label=1).
    """
    normal_df = generate_normal_telemetry(num_samples=num_normal, random_state=123)
    normal_labels = np.zeros(len(normal_df), dtype=int)
    
    anomaly_frames = []
    anomaly_labels = []
    
    for sc_id, meta in SCENARIO_METADATA.items():
        key = meta["key"]
        for step in range(1, 7):
            count = samples_per_scenario // 6
            for _ in range(count):
                f = generate_scenario_telemetry(key, step=step)
                # Add small realistic measurement noise
                noisy_f = {k: round(v + float(np.random.normal(0, abs(v) * 0.015 if v != 0 else 0.05)), 2) for k, v in f.items()}
                anomaly_frames.append(noisy_f)
                anomaly_labels.append(1)
                
    anomaly_df = pd.DataFrame(anomaly_frames)
    
    full_df = pd.concat([normal_df, anomaly_df], ignore_index=True)
    full_labels = np.concatenate([normal_labels, np.array(anomaly_labels, dtype=int)])
    
    return full_df, full_labels

def evaluate_anomaly_detector() -> Dict[str, Any]:
    """
    Runs full quantitative evaluation of SatelliteAnomalyDetector on benchmark data.
    """
    print("=" * 80)
    print("SATSHIELD AI - ISOLATION FOREST ANOMALY DETECTOR BENCHMARK EVALUATION")
    print("=" * 80)
    
    detector = SatelliteAnomalyDetector()
    df, y_true = generate_evaluation_dataset(num_normal=1000, samples_per_scenario=120)
    
    print(f"Generated Benchmark Dataset: {len(df)} total labeled frames")
    print(f"  - Normal Frames (Class 0) : {np.sum(y_true == 0)}")
    print(f"  - Anomaly Frames (Class 1): {np.sum(y_true == 1)} (Across 10 Scenarios)")
    print("\nRunning Inference Pipeline...")
    
    y_pred = []
    scores = []
    
    records = df.to_dict(orient="records")
    for row_dict in records:
        res = detector.detect_anomaly(row_dict)
        y_pred.append(1 if res["is_anomaly"] else 0)
        scores.append(res["anomaly_score"])
        
    y_pred = np.array(y_pred)
    
    # Compute Confusion Matrix Elements
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))
    
    total = len(y_true)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / total
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
    
    metrics = {
        "dataset_type": "Synthetic Satellite Telemetry Benchmark",
        "total_samples": total,
        "normal_samples": int(np.sum(y_true == 0)),
        "anomaly_samples": int(np.sum(y_true == 1)),
        "confusion_matrix": {
            "true_positives": tp,
            "false_positives": fp,
            "true_negatives": tn,
            "false_negatives": fn
        },
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "false_positive_rate": round(fpr, 4),
        "false_negative_rate": round(fnr, 4),
        "mean_anomaly_score_normal": round(float(np.mean([s for s, y in zip(scores, y_true) if y == 0])), 4),
        "mean_anomaly_score_anomaly": round(float(np.mean([s for s, y in zip(scores, y_true) if y == 1])), 4)
    }
    
    print("\n" + "-" * 80)
    print("BENCHMARK METRICS SUMMARY:")
    print("-" * 80)
    print(f"  * Accuracy                : {metrics['accuracy'] * 100:.2f}%")
    print(f"  * Precision               : {metrics['precision'] * 100:.2f}%")
    print(f"  * Recall (Sensitivity)    : {metrics['recall'] * 100:.2f}%")
    print(f"  * F1 Score                : {metrics['f1_score']:.4f}")
    print(f"  * False Positive Rate     : {metrics['false_positive_rate'] * 100:.2f}%")
    print(f"  * False Negative Rate     : {metrics['false_negative_rate'] * 100:.2f}%")
    print(f"  * Mean Score (Normal)     : {metrics['mean_anomaly_score_normal']:.4f}")
    print(f"  * Mean Score (Anomaly)    : {metrics['mean_anomaly_score_anomaly']:.4f}")
    print("-" * 80)
    print(f"Confusion Matrix: TP={tp}, FP={fp}, TN={tn}, FN={fn}")
    print("=" * 80)
    
    return metrics

if __name__ == '__main__':
    evaluate_anomaly_detector()
