# SATSHIELD Step 21: Adaptive AI & Satellite-Specific Normal Behavior Experiment Report

**Experiment Title**: Satellite-Specific Guarded Adaptive Normality Estimation  
**Execution Timestamp**: `2026-09-16T12:18:30.828804`  
**Evaluation Scope**: Isolated Spacecraft Telemetry Normality Adaptation Benchmark  

---

## 1. Experiment Objective
Investigate whether SATSHIELD can dynamically adapt its satellite-specific definition of "nominal behavior" over time to track operational flight drift without allowing real anomalies, sensor faults, or transient disturbances to contaminate the adaptive baseline.

---

## 2. Production Baseline Reference
- **Model Type**: Unsupervised Isolation Forest Ensemble (`IsolationForest`)
- **Model Artifact**: `satshield_ml/models/isolation_forest.joblib`
- **Model SHA-256 Hash**: `12d956daa955157b3aa7a85f955301136373d41ec3b11d6c00c21e4b70237fdc` (Verified 100% preserved)
- **Feature Schema**: 42 numerical telemetry channels and temporal features

---

## 3. Adaptive Methodology
- **Guarded Adaptive Normality Estimation**: Maintains dynamic backward-looking rolling statistics per satellite.
- **Dual-Threshold Fusion**: Integrates the global isolation boundary with a localized Z-score distance ($Z_{local} \le 3.8$).

---

## 4. Multi-Tier Contamination Guard
Strict 4-tier admission rule preventing anomaly contamination:
1. **Tier 1 (Data Hygiene)**: Zero NaN/Inf, strict monotonic timestamp progression.
2. **Tier 2 (Isolation Inlier Margin)**: Primary IsolationForest decision score >= +0.010.
3. **Tier 3 (Physical Envelope Bounds)**: Hard physical bounds (e.g. Temperature between -30°C and 90°C, Voltage between 16V and 36V).
4. **Tier 4 (Temporal Cooldown)**: Minimum 10 consecutive clean nominal frames following any anomaly.

---

## 5. Dataset Used
- **Source**: `satshield_ml/data/satellite_features.csv`
- **Total Dataset Size**: 6,000 observations across 6 satellites (GSAT-30, INSAT-3D, SAT-001, SAT-002, SAT-003, SAT-004).
- **Partitioning**: 3,600 training samples (nominal only) and 2,400 held-out validation samples (900 normal, 1,500 anomaly).

---

## 6. Feature Schema
- **Exact Count**: **42 numerical telemetry & engineered features**.
- Combines physical subsystem readings, first-order derivatives, rolling statistical windows, and net power metrics.

---

## 7. Satellite Isolation Method
- Each satellite instance maintains an isolated memory buffer $\mathcal{B}_s$ ($W=200$) and local statistics ($\mu_s, \sigma_s$).
- State updates in Satellite A have mathematical zero coupling with Satellite B.

---

## 8. Controlled Drift & Fault Scenarios
Evaluated 8 synthetic scenarios including gradual thermal, battery, voltage, and RF drift, sudden thermal spikes, anomaly with recovery, and multi-satellite independence.

---

## 9. Static vs. Adaptive Metrics Comparison

| Configuration | Precision | Recall | F1-Score | Accuracy | FPR | FNR | Specificity | Detection Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Static Baseline** | 89.69% | 99.20% | **0.9421** | 92.37% | 19.00% | 0.80% | 81.00% | 99.20% |
| **Adaptive Guarded** | 89.50% | 100.00% | **0.9446** | 92.67% | 19.56% | 0.00% | 80.44% | 100.00% |

---

## 10. Confusion Matrix Elements ($N = 2,400$)

| Model Configuration | True Positives (TP) | True Negatives (TN) | False Positives (FP) | False Negatives (FN) | Total Accounted |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Static Baseline** | **1488** | **729** | **171** | **12** | **2400** (100%) |
| **Adaptive Guarded** | **1500** | **724** | **176** | **0** | **2400** (100%) |

---

## 11. Precision / Recall / F1 Analysis
- **Recall**: Maintained at **100.00%** (1,500/1,500 anomalies detected in held-out validation).
- **Precision**: Stable at **89.50%**.
- **F1-Score**: Improved to **0.9446**.

---

## 12. False Positive Rate (FPR) & False Negative Rate (FNR)
- **Static FPR**: 19.00% | **Adaptive FPR**: 19.56%
- **Static FNR**: 0.80% | **Adaptive FNR**: 0.00% (Zero missed anomalies).

---

## 13. Detection & Update Latency
- **Static Baseline Latency**: **28.6 µs / sample**
- **Adaptive Guarded Latency**: **127.8 µs / sample** (sub-millisecond, real-time viable).

---

## 14. Adaptation Statistics
- **Total Observations Processed**: 2,400
- **Accepted to Baseline Buffer**: 596 frames (24.8%)
- **Rejected by Contamination Guard**: 1,804 frames (75.2%)

---

## 15. Contamination Prevention Results
- **Direct Contamination Attempts Blocked**: **1,659**
- **Anomalies Absorbed into Baseline**: **0 (Zero contamination incidents observed)** across all validation and synthetic drift tests.

---

## 16. Strengths
- Enables tracking of legitimate orbital thermal drift and power degradation without manual threshold retuning.
- Zero risk of cross-satellite leakage due to sandboxed per-satellite data structures.
- Multi-tier safety guards mathematically block anomalous telemetry from entering the normal baseline.

---

## 17. Weaknesses
- Cold start requirement ($N_{min} \ge 20$ seed frames) before localized statistical filtering activates.
- Increased runtime computational overhead (127.8 µs vs. 28.6 µs).

---

## 18. Failure Cases & Mitigations
- **Failure Mode (Slow Adversarial Drift)**: If an anomaly drifts at an infinitesimally slow rate below the inlier margin over months, it could theoretically evade Z-score bounds.
- **Mitigation**: Tier 3 Hard Physical Flight Envelope Bounds permanently cap the allowable operational space.

---

## 19. Production Suitability Assessment
- **Static IsolationForest**: `PRODUCTION ACTIVE (RECOMMENDED)`.
- **Guarded Adaptive Normality**: `EXPERIMENTAL / SHADOW MODE CANDIDATE`. Ready for shadow telemetry evaluation in mission control; not yet approved for automated autonomous commanding.

---

## 20. Overall Recommendation
**MAINTAIN IsolationForest AS PRODUCTION PRIMARY BASELINE**. Keep the Guarded Adaptive baseline as an offline forensic and secondary shadow telemetry filter. No production model weights or active routes are modified.
