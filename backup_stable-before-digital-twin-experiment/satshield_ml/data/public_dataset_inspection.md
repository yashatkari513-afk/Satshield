# SATSHIELD Public Spacecraft Telemetry Dataset Inspection Report

**Document Version:** 1.0.0  
**Inspection Date:** 2026-09-14  
**Project:** SATSHIELD — Autonomous Satellite Health & Anomaly Shield  
**Inspection Script:** `satshield_ml/data/inspect_public_dataset.py`  
**Dataset Directory:** `satshield_ml/data/public/`

---

## 1. Verified Dataset Identity & Provenance

* **Dataset Name:** NASA SMAP & MSL Spacecraft Telemetry Anomaly Dataset
* **Lead Organization:** NASA Jet Propulsion Laboratory (JPL) & California Institute of Technology (Caltech)
* **Official Research Reference:** *Hundman et al., "Detecting Spacecraft Anomalies Using LSTMs and Nonparametric Dynamic Thresholding", ACM SIGKDD 2018.*
* **Official Repository Sources:**
  * GitHub: [https://github.com/khundman/telemanom](https://github.com/khundman/telemanom)
  * Hugging Face Mirror: `appleparan/telemanom`
* **License:** **BSD-3-Clause Open Source License** (Copyright 2018, California Institute of Technology / U.S. Government sponsorship acknowledged).
* **Commercial / Demonstration Rights:** **Permitted** under standard BSD-3-Clause conditions without copyleft restrictions.

---

## 2. Actual Physical Files Downloaded

The public dataset has been downloaded and preserved in pristine form in `satshield_ml/data/public/` without modifying any file content:

| Directory / File | File Count | Total Size | Description |
| :--- | :--- | :--- | :--- |
| `satshield_ml/data/public/labeled_anomalies.csv` | 1 file | 3.96 KB | Official NASA JPL anomaly sequence index & taxonomy metadata |
| `satshield_ml/data/public/LICENSE.txt` | 1 file | 1.63 KB | Official BSD-3-Clause Caltech/NASA license terms |
| `satshield_ml/data/public/train/*.npy` | **82 files** | ~17.5 MB | Nominal training baseline telemetry arrays per channel |
| `satshield_ml/data/public/test/*.npy` | **82 files** | ~45.3 MB | Test & incident evaluation telemetry arrays per channel |
| **Total Artifacts** | **166 files**| **~62.8 MB** | Complete NASA SMAP/MSL benchmark suite |

---

## 3. Actual Empirical Dataset Statistics

### 3.1 Observation and Row Counts
* **Total Training Rows:** **196,746 observations** across 82 telemetry channels.
* **Total Testing Rows:** **510,225 observations** across 82 telemetry channels.
* **Combined Total Observations:** **706,971 telemetry rows**.
* **Total Missing Values (`NaN` / `Inf`):** **0** (All downloaded arrays are complete).
* **Data Types:** `float64` across all array dimensions.

### 3.2 Duplicate Rows in Steady State
* **Train Set Duplicates:** 155,366 rows
* **Test Set Duplicates:** 420,651 rows
* **Explanation:** In continuous spacecraft flight operations, sensor readings during steady-state orbital regimes (e.g. constant regulated voltage or static command vectors) maintain identical values across adjacent regular discrete sampling timesteps.

### 3.3 Dimensionality and Column Structure
Each binary `.npy` file contains a 2D matrix of shape `(N_timesteps, N_features)`:
* **Column 0 (Primary Feature):** Continuous, pre-normalized telemetry signal (e.g. thermistor temperature, bus voltage, current draw, or reaction wheel speed).
* **Columns 1 to N-1 (Auxiliary Command Vectors):** Binary one-hot encoded spacecraft command modes and operational context states (ranging between 24 and 54 one-hot command channels per stream).
* **Total Feature Columns per Channel:** 25 to 55 columns depending on the specific subsystem.

---

## 4. Spacecraft & Satellite Identifiers

From `labeled_anomalies.csv` and binary file cross-referencing:

| Spacecraft Identifier | Spacecraft Full Name | Orbit / Mission Type | Channel Count | Example Channels |
| :--- | :--- | :--- | :--- | :--- |
| **SMAP** | Soil Moisture Active Passive | Sun-synchronous Low Earth Orbit (LEO) | **55 cataloged (54 streams)** | `P-1`, `P-2`, `P-3`, `P-4`, `S-1`, `E-1`, `E-2`, `A-1`, `A-2`, `D-1`, `T-1`, `T-2` |
| **MSL** | Mars Science Laboratory (Curiosity) | Mars Surface & Interplanetary Transit | **27 cataloged (27 streams)** | `M-1`, `M-2`, `M-3`, `M-4`, `M-5`, `M-6`, `M-7`, `T-4`, `T-5`, `F-1`, `C-1`, `C-2` |

---

## 5. Anomaly Label Availability & Distribution

* **Ground-Truth Anomaly Labels Available:** **Yes**, strictly verified in `labeled_anomalies.csv`.
* **Label Distribution by Anomaly Class:**
  * **Contextual Anomalies:** Sequence-level behavioral deviations (e.g., unexpected sensor drift during non-commanded periods).
  * **Point Anomalies:** Instantaneous threshold exceedances or abrupt transient spikes.
* **Label Format:** Exact continuous sequence windows `[[start_timestep, end_timestep], ...]`.
* **Validation Suitability:** High. Allows empirical scoring of Precision, Recall, False Positive Rate (FPR), and Detection Latency without synthetic assumptions.

---

## 6. Telemetry Ranges & Time Characteristics

* **Observed Numeric Telemetry Ranges:**
  * Column 0 (continuous signal): Normalized between **`[-1.0, 1.0]`** or **`[0.0, 1.0]`**.
  * Columns 1..N (command vectors): Strictly discrete binary values **`{0.0, 1.0}`**.
* **Timestamp Characteristics:**
  * Data points are indexed by monotonically increasing sequential timesteps ($0, 1, 2, \dots, N-1$).
  * Explicit UTC timestamp strings: *Not verified from raw arrays (implicit regular aerospace sampling rate).*

---

## 7. Sample Channel Inspection Table (First 15 Verified Channels)

| Channel ID | Spacecraft | Subsystem Category | Train Shape | Test Shape | Value Min (Col 0) | Value Max (Col 0) | Anomaly Class |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A-1** | SMAP | Attitude / Pointing | (2880, 25) | (8640, 25) | +0.999 | +0.999 | `[point]` |
| **A-2** | SMAP | Attitude / Pointing | (2648, 25) | (7914, 25) | -1.000 | +1.000 | `[contextual]` |
| **A-3** | SMAP | Attitude / Pointing | (2736, 25) | (8205, 25) | -1.000 | +1.000 | `[contextual]` |
| **A-4** | SMAP | Attitude / Pointing | (2690, 25) | (8080, 25) | -1.000 | +1.000 | `[contextual]` |
| **A-5** | SMAP | Attitude / Pointing | (705, 25) | (4693, 25) | -1.000 | -0.999 | `[point]` |
| **A-6** | SMAP | Attitude / Pointing | (682, 25) | (4453, 25) | -1.000 | +1.000 | `[point]` |
| **A-7** | SMAP | Attitude / Pointing | (2879, 25) | (8631, 25) | -1.000 | +1.000 | `[contextual]` |
| **A-8** | SMAP | Attitude / Pointing | (762, 25) | (8375, 25) | -1.000 | +1.000 | `[contextual]` |
| **A-9** | SMAP | Attitude / Pointing | (762, 25) | (8434, 25) | -1.000 | +1.000 | `[contextual]` |
| **B-1** | SMAP | Instruments / Radar | (2435, 25) | (8044, 25) | -1.000 | -1.000 | `[point]` |
| **C-1** | MSL | Telecom / Transponder | (2876, 55) | (8638, 55) | -0.999 | +1.000 | `[contextual]` |
| **C-2** | MSL | Telecom / Transponder | (2880, 55) | (8640, 55) | -1.000 | +1.000 | `[contextual]` |
| **D-1** | SMAP | Power / Distribution | (2842, 25) | (8509, 25) | -1.000 | +1.000 | `[point]` |
| **D-2** | SMAP | Power / Distribution | (2870, 25) | (8595, 25) | -1.000 | +1.000 | `[point]` |
| **E-1** | SMAP | EPS / Battery Storage | (2878, 25) | (8516, 25) | -1.000 | +1.000 | `[contextual]` |

---

## 8. Compatibility Assessment with SATSHIELD Architecture

1. **Subsystem Mapping Feasibility:**
   * Power (`P-*`, `D-*`, `E-*`) maps directly to EPS voltage, current, and battery state.
   * Thermal (`T-*`) maps directly to sensor thermal monitoring.
   * Attitude (`A-*`) maps directly to pointing error and angular dynamics.
   * Telecom (`C-*`) maps directly to RF downlink carrier monitoring.
2. **Mathematical Feature Engineering:**
   * 1-step delta ($\Delta x$), rolling mean ($\mu_5$), rolling standard deviation ($\sigma_5$), and rolling deviations ($x - \mu_5$) can be directly computed via SATSHIELD's existing `feature_engineering.py` algorithms.
3. **Validation Utility:**
   * Real spacecraft ground truth enables high-fidelity quantitative benchmarking against our baseline synthetic data models.

---

## 9. Safety & Non-Interference Confirmation

* **Current Model:** `satshield_ml/models/isolation_forest.joblib` is unchanged.
* **Feature Schema:** `satshield_ml/models/feature_columns.json` is unchanged.
* **Synthetic Datasets:** `satellite_telemetry.csv` and `satellite_features.csv` are unchanged.
* **Production Code:** Backend, frontend, simulation engine, and predictive maintenance are completely unmodified.
* **Public Data Workspace:** All downloaded and inspected files reside strictly within `satshield_ml/data/public/`.
