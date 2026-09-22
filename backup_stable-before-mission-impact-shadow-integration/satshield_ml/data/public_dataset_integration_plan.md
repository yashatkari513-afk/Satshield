# SATSHIELD Public Spacecraft Telemetry Integration Plan

**Document Version:** 1.0.0  
**Status:** Approved Roadmap / Pre-Implementation  
**Target Dataset:** NASA SMAP / MSL Spacecraft Telemetry Anomaly Benchmark  
**Companion Dataset:** ESA OPS-SAT (OPSSAT-AD)

---

## 1. High-Level Integration Workflow

```
┌─────────────────────────────────────────────────────────┐
│                       PUBLIC DATA                       │
│    (NASA SMAP/MSL 82-Channel & ESA OPS-SAT Telemetry)   │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                      DATA CLEANING                      │
│   (Missing Packet Imputation, Timestamp Regularization) │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     FEATURE MAPPING                     │
│  (Subsystem Channel Alignment to 8 Base Physical Fields)│
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   FEATURE ENGINEERING                   │
│   (Generate SATSHIELD 42 Multivariate Feature Schema)   │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    MODEL VALIDATION                     │
│   (Evaluate IsolationForest on Real Labeled Anomalies)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│          COMPARE WITH CURRENT SYNTHETIC DATA            │
│  (Benchmarking Precision, Recall, FPR, Drift Resilience)│
└─────────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step Implementation Roadmap

### Phase 1: PUBLIC DATA ACQUISITION & INTEGRATION ISOLATION
* **Objective:** Securely fetch and isolate public spacecraft telemetry files without modifying any existing production artifacts or model files.
* **Target Location:** `satshield_ml/data/public/raw/`
* **Artifacts to Retrieve:**
  * `train/` and `test/` NumPy `.npy` / `.csv` multi-channel time-series streams from NASA SMAP/MSL.
  * `labeled_anomalies.csv` containing official NASA JPL incident start/end indexes and root-cause taxonomy.
* **Safety Constraint:** Existing synthetic dataset files (`satellite_telemetry.csv`, `satellite_features.csv`) remain completely untouched.

---

### Phase 2: DATA CLEANING & STANDARDIZATION
* **Objective:** Standardize irregular telemetry frames into consistent, monotonically increasing time-series.
* **Cleaning Actions:**
  1. Parse time indices to continuous ISO UTC timestamps.
  2. Handle telemetry dropouts / ground station blind spots via forward-fill (max 3 steps) and spline interpolation.
  3. Detect and filter non-physical transmission corruptions (e.g. NaN/Inf packet drops).
  4. Output clean intermediate dataset: `satshield_ml/data/public/nasa_smap_clean.csv`.

---

### Phase 3: FEATURE MAPPING TO SATSHIELD SUBSYSTEM SCHEMA
* **Objective:** Map heterogeneous spacecraft channels into SATSHIELD's 8 standard telemetry domains:
  1. **Thermal:** Thermistor temperatures $\rightarrow$ `temperature_c`
  2. **Power Bus:** Main regulated voltage $\rightarrow$ `voltage_v`
  3. **Current Draw:** Bus load current $\rightarrow$ `current_a`
  4. **Battery:** Stored energy state $\rightarrow$ `battery_soc_percent`
  5. **Solar Array:** Generation capacity $\rightarrow$ `solar_power_w`
  6. **Telecom:** Downlink signal level $\rightarrow$ `communication_signal_db`
  7. **Structural/Jitter:** IMU/accelerometer vibration $\rightarrow$ `vibration_g`
  8. **ADCS:** Attitude pointing error $\rightarrow$ `attitude_error_deg`

---

### Phase 4: FEATURE ENGINEERING (42-FEATURE SCHEMA SYNTHESIS)
* **Objective:** Execute the standard SATSHIELD temporal transformation pipeline to produce the full 42-feature multivariate matrix.
* **Pipeline Logic:**
  * Compute 1-step temporal rates of change ($\Delta x = x_t - x_{t-1}$).
  * Compute rolling mean ($\mu_5$) and rolling standard deviation ($\sigma_5$) with window size = 5.
  * Compute instantaneous deviation from rolling baseline ($x_t - \mu_5$).
  * Compute power dynamics ($P_{\text{draw}} = V \times I$ and $P_{\text{net}} = P_{\text{solar}} - P_{\text{draw}}$).
* **Output Artifact:** `satshield_ml/data/public/nasa_smap_features.csv`.

---

### Phase 5: MODEL VALIDATION ON REAL SPACE ANOMALIES
* **Objective:** Evaluate the trained AI/ML anomaly detection model against NASA ground-truth incident labels.
* **Evaluation Metrics:**
  * **Precision:** Ratio of true detected spacecraft anomalies over total anomaly alerts.
  * **Recall (Detection Rate):** Percentage of actual space incidents successfully caught.
  * **F1-Score:** Harmonic mean of precision and recall on real flight data.
  * **Detection Latency:** Time delay between actual anomaly onset in space and first alert trigger.
  * **False Positive Rate (FPR):** False alarm rate during long nominal flight duration.
* **Execution Script:** `satshield_ml/validate_public_benchmark.py` (to be created in execution phase).

---

### Phase 6: BENCHMARK COMPARISON WITH SYNTHETIC BASELINE
* **Objective:** Quantitatively compare model performance, feature distributions, and anomaly signatures between SATSHIELD synthetic data and NASA real spacecraft telemetry.
* **Comparison Matrix:**
  * Signal-to-Noise Ratio (SNR) in nominal orbit.
  * Anomaly signature profile (instantaneous voltage spike vs. thermal gradual drift).
  * Robustness across operating modes (eclipse transition vs. standard sunlit flight).
* **Final Deliverable:** `satshield_ml/data/synthetic_vs_public_benchmark_report.md`.

---

## 3. Strict Safety & Non-Interference Guarantees

* [x] **No UI / Frontend Changes:** React components, charts, and simulation views remain 100% unaffected.
* [x] **No Backend Route Changes:** FastAPI endpoints, telemetry streams, and inference services remain 100% operational.
* [x] **No Production Model Overwrite:** The current trained model `satshield_ml/models/isolation_forest.joblib` and active weights remain completely intact.
* [x] **Isolated Benchmark Path:** Public dataset operations will live exclusively in distinct standalone namespaces (`satshield_ml/data/public/`).
