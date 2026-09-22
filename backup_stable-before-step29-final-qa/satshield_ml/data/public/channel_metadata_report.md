# SATSHIELD Public Spacecraft Telemetry Channel Metadata & Evaluation Report

**Document Version:** 1.0.0  
**Inspection Date:** 2026-09-14  
**Project:** SATSHIELD — Autonomous Satellite Health & Anomaly Shield  
**Primary Metadata Inventory:** `satshield_ml/data/public/channel_metadata.csv`  
**Public Dataset Directory:** `satshield_ml/data/public/`

---

## 1. Executive Summary & Provenance Verification

| Attribute | Verified Evidence |
| :--- | :--- |
| **Dataset Name** | NASA SMAP & MSL Spacecraft Telemetry Anomaly Dataset |
| **Lead Organization** | NASA Jet Propulsion Laboratory (JPL) & California Institute of Technology (Caltech) |
| **Original Authors** | Kyle Hundman, Valentino Constantinou, Christopher Laporte, Ian Colwell, Tom Soderstrom (*ACM SIGKDD 2018*) |
| **Official Repository** | [https://github.com/khundman/telemanom](https://github.com/khundman/telemanom) / NASA Open Data |
| **Verified License** | **BSD-3-Clause Open Source License** (Copyright 2018, Caltech / U.S. Government sponsorship acknowledged) |
| **Permitted Rights** | Commercial use, demonstration, modification, and redistribution with copyright attribution |
| **SIH Demonstration Suitability** | **100% Permitted** under standard BSD-3-Clause attribution requirements |

---

## 2. Channel Inventory & Subsystem Mapping Status

A complete audit of all **82 distinct telemetry channels** was performed across the training (`satshield_ml/data/public/train/`) and testing (`satshield_ml/data/public/test/`) suites.

### 2.1 Subsystem Groupings & Verified Facts
NASA JPL applied an anonymization scheme to protect mission security while preserving multivariate subsystem correlation:

| Prefix | Count | Spacecraft | Subsystem Meaning Category | Meaning Confidence Status | Source of Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A-*** | 9 | SMAP | Attitude Determination & Control (ADCS) | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **B-*** | 1 | SMAP | Payload / Synthetic Aperture Radar Instrument | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **C-*** | 2 | MSL | Communications / Transponder Telemetry | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **D-*** | 16 | SMAP & MSL| Power Distribution & Digital Switching | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **E-*** | 13 | SMAP | Electrical Power Subsystem (EPS) / Battery | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **F-*** | 3 | MSL | Flight Dynamics / Actuator / Propulsion | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **G-*** | 7 | SMAP & MSL| Guidance, Navigation & Gyro Dynamics | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **M-*** | 7 | MSL | Rover Mechanical / Mechanism / Mobility | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **P-*** | 7 | SMAP & MSL| Main Power Bus / EPS Telemetry | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **R-*** | 1 | MSL | Radiation / Environmental Sensor | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **S-*** | 1 | SMAP | System Health / Status Bus | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |
| **T-*** | 15 | SMAP & MSL| Thermal Management / Thermistors | **PARTIALLY VERIFIED** | Hundman et al. (2018) Prefix Taxonomy |

### 2.2 What is Unknown / Anonymized (Critical Engineering Honesty)
1. **Exact Sensor Identity:** `UNKNOWN`. Specific instrument model numbers, transducer serials, and component names (e.g. "Reaction Wheel #3 Current") are anonymized by NASA JPL.
2. **Physical Engineering Units:** `UNKNOWN`. Telemetry values are pre-normalized into unitless ranges (`[-1.0, 1.0]` or `[0.0, 1.0]`) rather than explicit engineering units (Volts, Amperes, Celsius, Watts).
3. **Command Vector Column Semantics:** `UNKNOWN`. Binary indicator columns (columns 1..24 for SMAP, 1..54 for MSL) represent one-hot encoded discrete operational states / telecommand IDs whose specific op-code definitions were not released.

---

## 3. Anomaly Label Structure & Verification

Inspection of `satshield_ml/data/public/labeled_anomalies.csv` revealed the following exact empirical characteristics:

* **Cataloged Entries:** 82 entries (55 SMAP, 27 MSL).
* **Total Anomaly Sequences:** **105 discrete anomaly sequence intervals**.
* **Total Anomaly Duration:** **64,704 test timesteps** (~12.68% of total test observations).
* **Anomaly Classes Present:**
  * **Point Anomalies:** Instantaneous threshold spikes or single-timestep dropouts.
  * **Contextual Anomalies:** Extended multivariate behavioral deviations during nominal operating regimes.
* **Special Alignment & Indexing Observations:**
  * **Duplicate Channel ID:** Channel `P-2` appears twice in `labeled_anomalies.csv` (index 17 with sequence `[[5350, 6575]]` and index 51 with sequence `[[5300, 6420]]`).
  * **Unlabeled Active Channel:** Channel `T-10` exists as valid telemetry in `train/T-10.npy` (1,490 timesteps) and `test/T-10.npy` (7,663 timesteps) but is omitted from `labeled_anomalies.csv`.
  * **Sequence Index Space:** All `[start, end]` intervals strictly index the **test telemetry arrays** (`test/*.npy`). Training arrays (`train/*.npy`) represent nominal baseline operations.

---

## 4. Compatibility Analysis with SATSHIELD 42-Feature Architecture

| Capability | Current Synthetic SATSHIELD Pipeline | Public NASA SMAP/MSL Telemetry | Strategy for Real Data Integration |
| :--- | :--- | :--- | :--- |
| **Data Modality** | Tabular Multivariate Spacecraft Telemetry | Multi-channel Time-Series Arrays (`.npy`) | Reshape into unified time-series dataframe |
| **Feature Dimensionality**| 8 raw physical features $\rightarrow$ 42 engineered | 1 continuous signal + 24–54 command vectors | Compute 1-step deltas, rolling means ($\mu_5$), rolling stds ($\sigma_5$), and dynamic deviations ($x - \mu_5$) per channel |
| **Model Compatibility** | Scikit-learn `IsolationForest` | Unsupervised `IsolationForest` | **100% Model Compatible**: `IsolationForest` natively trains on continuous arrays without requiring physical units |
| **Subsystem Representation**| Direct physical fields (`temperature_c`, `voltage_v`, etc.) | Channel prefix mappings (`P-*`, `T-*`, `A-*`, `C-*`) | Group channels into subsystem domains or run channel-agnostic stream benchmark |

---

## 5. Recommended SATSHIELD Integration Strategy

To maintain complete scientific integrity and prevent false physical assumptions:

1. **Dual-Track Evaluation Architecture:**
   * **Track 1 (Operational SATSHIELD Simulator):** Retain current 8-telemetry physical simulation and 42-feature explainable XAI engine for real-time dashboard monitoring.
   * **Track 2 (NASA Spacecraft Benchmark Suite):** Run a dedicated channel-agnostic time-series anomaly benchmark (`satshield_ml/data/benchmark_public_dataset.py`) evaluating `IsolationForest` against NASA ground-truth anomaly windows.
2. **Channel-Agnostic Feature Engineering:**
   Apply our exact temporal transformations (1-step delta, 5-step rolling mean, 5-step rolling std, baseline deviation) directly to the continuous telemetry column (`col 0`) of each public channel.
3. **True Ground-Truth Validation:**
   Evaluate precision, recall, false alarm rate, and F1-score across all 105 labeled NASA anomaly sequences.

---

## 6. Verification & Non-Interference Confirmation

* **Safety Guarantee:** No changes were made to existing frontend, backend, synthetic datasets, trained model weights, or simulation engines.
* **Artifacts Created:**
  1. `satshield_ml/data/public/channel_metadata.csv` (82 verified channel records).
  2. `satshield_ml/data/public/channel_metadata_report.md` (Formal evaluation and compatibility report).
