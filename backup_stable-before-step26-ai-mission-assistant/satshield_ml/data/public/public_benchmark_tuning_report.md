# SATSHIELD NASA SMAP & MSL Benchmark Tuning & Optimization Report

**Document Version:** 1.0.0  
**Execution Timestamp:** 2026-09-14T09:47:29.771153+00:00  
**Evaluation Scope:** Threshold Tuning & Persistence (Debounce) Optimization on Public Flight Telemetry  
**Dataset Source:** NASA SMAP & MSL Spacecraft Telemetry Anomaly Dataset (NASA Jet Propulsion Laboratory (JPL) / Caltech)  
**License:** BSD-3-Clause Open Source License  

---

## 1. Executive Summary & Objective

> [!IMPORTANT]
> **Objective:** The baseline NASA benchmark caught 100% of labeled anomaly sequences (105/105 incidents) but exhibited a high point-wise false positive rate (FPR = 47.81%). By scientifically tuning the IsolationForest anomaly decision threshold $\tau$ and applying a temporal persistence window $k$, we systematically analyze the trade-off between false-alarm reduction, point-wise precision/recall, and sequence-level detection latency.

### Comparative Summary of Operating Profiles

| Operating Profile | Threshold ($\tau$) | Persistence ($k$) | Point Precision | Point Recall | F1-Score | Point FPR | Sequence Detection | Mean Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Profile A: Baseline (Default IF, No Tuning)** | `0.0` | `1 steps` | **16.38%** | **65.71%** | **0.2622** | **47.81%** | **105/105** (100.0%) | **7.62 steps** |
| **Profile B: Persistence Debounced** | `0.0` | `2 steps` | **16.85%** | **62.75%** | **0.2657** | **44.14%** | **104/105** (99.1%) | **11.18 steps** |
| **Profile C: Balanced Threshold-Tuned** | `0.01` | `1 steps` | **17.84%** | **41.28%** | **0.2491** | **27.10%** | **84/105** (80.0%) | **10.37 steps** |
| **Profile D: Optimal Low-FPR (Tuned + Debounced)** | `0.03` | `2 steps` | **19.26%** | **33.97%** | **0.2458** | **20.29%** | **84/105** (80.0%) | **21.27 steps** |
| **Profile E: High-Precision / Low False Alarm** | `0.1` | `1 steps` | **20.24%** | **21.19%** | **0.2070** | **11.89%** | **83/105** (79.0%) | **28.22 steps** |

---

## 2. Key Findings & Trade-Off Analysis

1. **Profile A (Baseline: $\tau=0.00, k=1$):**
   * Highest sequence detection: **100.0% (105/105 incidents)**.
   * Point-wise Recall = 65.71%, Precision = 16.38%, FPR = 47.81%.
   * Fastest Mean Latency = **7.62 timesteps**.
2. **Profile B (Persistence Debounced: $\tau=0.00, k=2$):**
   * Eliminates single-point transient spikes, lowering FPR from 47.81% to **44.14%**.
   * Sequence detection remains virtually intact at **99.05% (104/105 incidents)**, with F1 rising to **0.2656**.
3. **Profile C (Threshold-Tuned: $\tau=0.01, k=1$):**
   * Cuts False Positive Rate nearly in half from 47.81% down to **27.10%** (**43.3% relative reduction in false alarms**).
   * Point Precision rises to **17.84%**, with **84/105 anomaly sequences** detected.
4. **Profile D (Optimal Low-FPR: $\tau=0.03, k=2$):**
   * Drives False Positive Rate down to **20.29%** (**57.6% relative reduction in false alarms**).
   * Point Precision rises to **19.26%**, Sequence Detection = **84/105 incidents**.
5. **Profile E (High-Precision: $\tau=0.10, k=1$):**
   * Minimizes operator alert fatigue, cutting False Positive Rate to **11.89%** (**75.1% reduction in false alarms**).
   * Point Precision reaches **20.24%**, capturing **83/105 major flight incidents**.

---

## 3. Mathematical Conservation & Guardrails Verification

* **Total Evaluated Observations:** 510,225 timesteps across 82 spacecraft telemetry streams.
* **Conservation Law Verified:** For every evaluated profile and channel, $TP + TN + FP + FN = 510,225$ holds with 100% mathematical precision.
* **Zero Leakage:** Rolling statistics ($\mu_5, \sigma_5$) are strictly backward-looking. Ground-truth anomaly labels were never accessible to the feature extractor or training baselines.

---

## 4. Platform Performance Breakdown (SMAP vs. MSL)

| Profile | SMAP Precision | SMAP Recall | SMAP FPR | MSL Precision | MSL Recall | MSL FPR |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Profile A: Baseline (Default IF, No Tuning)** | 17.02% | 66.94% | 48.02% | 12.39% | 56.86% | 46.61% |
| **Profile B: Persistence Debounced** | 17.58% | 64.03% | 44.18% | 12.39% | 53.53% | 43.91% |
| **Profile C: Balanced Threshold-Tuned** | 18.26% | 40.35% | 26.57% | 15.61% | 48.05% | 30.12% |
| **Profile D: Optimal Low-FPR (Tuned + Debounced)** | 20.05% | 32.95% | 19.33% | 15.67% | 41.29% | 25.77% |
| **Profile E: High-Precision / Low False Alarm** | 21.74% | 20.15% | 10.67% | 14.99% | 28.71% | 18.87% |

---

## 5. Recommended Operator Configuration

> [!TIP]
> **Operational Recommendation:**
> - For **Safety-Critical Missions (Zero Tolerance for Missed Incidents):** Use **Profile A (Baseline, 100% Sequence Detection)** or **Profile B (99.05% Sequence Detection, FPR = 44.14%)**.
> - For **Standard Flight Monitoring (Balanced Alert Fatigue vs. Sensitivity):** Use **Profile C ($\tau=0.01$, FPR = 27.10%)** or **Profile D ($\tau=0.03, k=2$, FPR = 20.29%)**.
> - For **Low-Bandwidth / Autonomous Downlink Triggering:** Use **Profile E ($\tau=0.10$, FPR = 11.89%, Precision = 20.24%)**.

---

## 6. Reproducibility & Safety Confirmation

* **Tuning Tool:** `satshield_ml/data/public/public_benchmark_tuning.py`
* **Results Artifact:** `satshield_ml/data/public/public_benchmark_tuning_results.json`
* **Production Integrity:** Production model weights (`satshield_ml/models/isolation_forest.joblib`), 42-feature schema, FastAPI backend, and React dashboard were 100% unmodified.