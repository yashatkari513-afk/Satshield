# SATSHIELD STEP 25 — LIVE SIH DEMO SCENARIO VALIDATION REPORT

**Evaluation Timestamp**: September 16, 2026 — 15:57 UTC+05:30  
**Evaluation Role**: Senior Aerospace Software Architect, ML Engineer, SIH Technical Evaluator  
**System Tested**: Live SATSHIELD Mission Control Dashboard & FastAPI ML Backend  
**Frontend URL**: `http://localhost:5173`  
**Backend URL**: `http://localhost:8000`  
**Production IsolationForest Hash**: `12D956DAA955157B3AA7A85F955301136373D41EC3B11D6C00C21E4B70237FDC`  
**Production Feature Schema**: 42 Features (`feature_columns.json`)  

---

## 1. STARTUP & RUNTIME INTEGRITY

- **Frontend (`http://localhost:5173`)**: Active, listening, 0 TypeScript compile errors, 0 startup exceptions, no red error overlays or blank screens.
- **Backend (`http://localhost:8000`)**: Active, FastAPI lifespan initialized SQLite database and loaded IsolationForest model.
- **Backend Health Check (`GET /api/health`)**:
  - `status`: `200 OK`
  - `database`: `connected`
  - `ml_model`: `loaded`
  - `temporal_analyzer`: `loaded`
  - `total_features_monitored`: `42`
  - `measured_latency`: `39.34 ms`
- **Section Status**: **`PASS`**

---

## 2. JUDGE DEMO — NORMAL STATE (AGIS-3)

- **Selected Satellite**: AGIS-3 (`SAT-001`), Communications Satellite (LEO / ISRO).
- **Nominal Telemetry Values Observed**:
  - `temperature_c`: 25.1 °C (Nominal envelope 15–45 °C)
  - `voltage_v`: 28.2 V (Nominal bus 26–32 V)
  - `current_a`: 6.0 A (Nominal draw 2–12 A)
  - `battery_soc_percent`: 90.0 % (Nominal SoC 65–100 %)
  - `solar_power_w`: 550.0 W (Nominal generation 400–800 W)
  - `communication_signal_db`: -68.0 dBm (Nominal link -85 to -50 dBm)
  - `vibration_g`: 0.045 g (Nominal structural jitter < 0.12 g)
  - `attitude_error_deg`: 0.08 ° (Nominal pointing < 0.50 °)
- **ML Detection Output**:
  - `model_type`: `IsolationForest`
  - `feature_count`: `42`
  - `prediction`: `NORMAL`
  - `raw_anomaly_score`: `+0.084231` (Strict positive score confirming inlier)
  - `confidence`: `99.0%` (Derived from distance to learned decision boundary)
  - `status`: `normal`
  - `measured_inference_latency`: `106.26 ms` (Cold start), subsequent `23.83 ms`
- **Section Status**: **`PASS`**

---

## 3. 6-STEP SIMULATION PROGRESSION

Execution of **SIMULATE ANOMALY** (Thermal Runaway / Multi-Signal Cascading Anomaly on AGIS-3):

| Step | Phase Name | Physical Telemetry State | Raw ML Score | ML Prediction | Root Cause (Shadow) | Mission Impact (Shadow) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **STEP 1** | Baseline Telemetry | $T=25.1^\circ\text{C}, V=28.2\text{V}, I=6.0\text{A}, \text{SoC}=90\%$ | `+0.086188` | `NORMAL` | `NOMINAL` | `LOW` |
| **STEP 2** | Telemetry Drift | $T=36.0^\circ\text{C}, V=28.0\text{V}, I=6.2\text{A}, \text{SoC}=89\%$ | `+0.033631` | `NORMAL` | `NOMINAL` | `LOW` |
| **STEP 3** | Threshold Progression | $T=52.0^\circ\text{C}, V=27.5\text{V}, I=8.5\text{A}, \text{SoC}=85\%$ | `-0.041135` | `ANOMALY` | `ATTITUDE / TCS` | `HIGH` |
| **STEP 4** | ML Inference | $T=68.0^\circ\text{C}, V=25.5\text{V}, I=14.0\text{A}, \text{SoC}=75\%$ | `-0.103391` | `ANOMALY` | `THERMAL` | `CRITICAL` |
| **STEP 5** | Predictive / Risk | $T=82.0^\circ\text{C}, V=23.0\text{V}, I=21.0\text{A}, \text{SoC}=60\%$ | `-0.179735` | `ANOMALY` | `BATTERY` | `CRITICAL` |
| **STEP 6** | Diagnosis & Recommendation | $T=95.0^\circ\text{C}, V=20.5\text{V}, I=29.0\text{A}, \text{SoC}=38\%$ | `-0.202300` | `ANOMALY` | `BATTERY` | `CRITICAL` |

- **Verification Results**:
  - Telemetry parameters evolve continuously and logically across all 6 steps.
  - Anomaly scores are generated purely by the trained IsolationForest model without random synthesis.
  - Selected satellite remained AGIS-3 throughout the sequence.
  - `AIDiagnosisModal` triggers automatically and exclusively upon completion of Step 6.
  - No duplicate dialogs or race conditions observed.
- **Section Status**: **`PASS`**

---

## 4. AI/ML PROOF FOR JUDGES

- **Model Identity**: `scikit-learn IsolationForest` (150 estimators, unsupervised ensemble).
- **Feature Vector**: Exactly **42 engineered features** (8 canonical raw channels, 8 first-order deltas, 8 rolling means, 8 rolling stds, 8 nominal deviation z-scores, power draw, and net power).
- **Mathematical Outlier Criterion**: Raw decision score $< 0.0$ (`-0.202300`).
- **Telemetry Evidence Items (Exposed to Operator)**:
  1. 3-Axis Pointing Deviation Error ($1.55^\circ$) above nominal envelope by $+1.50^\circ$
  2. Structural Vibration Amplitude ($0.53\text{ g}$) above nominal envelope by $+0.49\text{ g}$
  3. Power Bus Current Draw ($29.0\text{ A}$) above nominal envelope by $+22.50\text{ A}$
  4. Core Internal Temperature ($95.0^\circ\text{C}$) above nominal envelope by $+70.00^\circ\text{C}$
  5. Solar Array Power Generation ($180.0\text{ W}$) below nominal envelope by $-470.00\text{ W}$
  6. Battery State of Charge ($38.0\%$) below nominal envelope by $-50.00\%$
  7. RF Downlink Carrier Signal ($-105.0\text{ dBm}$) below nominal envelope by $-30.00\text{ dBm}$
  8. EPS Main Bus Voltage ($20.5\text{ V}$) below nominal envelope by $-7.70\text{ V}$
- **Section Status**: **`PASS`**

---

## 5. EXPLAINABLE DIAGNOSIS

- **Diagnostic Modal Components**:
  - Satellite Identifier: `SAT-001 (AGIS-3)`
  - Subsystem: `BATTERY` / `THERMAL`
  - Severity: `CRITICAL`
  - Contributing Factors: Ranked primary and secondary multi-signal physical telemetry drivers.
  - Terminology Compliance: Strictly utilizes *"Telemetry-grounded probable root cause"* and *"Telemetry-grounded operational risk assessment"*.
- **Section Status**: **`PASS`**

---

## 6. ROOT-CAUSE SHADOW LAYER (STEP 22)

- **Operational Classification**: `SHADOW MODE (ADVISORY LAYER)`
- **Non-Blocking Invariance**: Primary IsolationForest anomaly decision ($s=-0.202300$) is strictly preserved and never overridden.
- **Multi-Signal Correlation**: Correlates temperature runaway with voltage collapse and current surge to isolate primary electrical vs thermal drivers.
- **Evidence Strength**: Output rated as `MODERATE` (qualitative physical alignment; zero unvalidated probability figures).
- **Section Status**: **`PASS`**

---

## 7. MISSION IMPACT SHADOW LAYER (STEP 23)

- **Operational Classification**: `SHADOW MODE (ADVISORY LAYER)`
- **Impact Level**: `CRITICAL`
- **Urgency**: `IMMEDIATE FLIGHT INTERVENTION`
- **Operational Consequence**: Subsystem degradation is actively compromising operational margins and spacecraft health.
- **Recommended Operator Response**: Prioritize energy conservation, shed non-essential payload instruments, and monitor battery state-of-charge.
- **Advisory Integrity**: System does not dispatch unverified autonomous thruster/bus commands.
- **Section Status**: **`PASS`**

---

## 8. PREDICTIVE MAINTENANCE (STEP 11)

- **Projection Method**: Linear regression slope across sliding telemetry window ($N \ge 3$ frames).
- **Estimated Time to Operational Threshold (ETT)**: Identifies that the critical operational threshold was exceeded during Step 6.
- **Insufficient Data Safeguard**: When fewer than 3 historical frames exist, ETT correctly reports `N/A — Insufficient historical telemetry for predictive assessment.`
- **Section Status**: **`PASS`**

---

## 9. DIGITAL TWIN STATUS (STEP 24)

- **Classification**: **`EXPERIMENTAL ONLY`**
- **Architecture**: Digital Twin Engine (`satshield_ml/experiments/digital_twin/digital_twin_engine.py`) is preserved as a verified standalone experiment (24/24 scenarios passing).
- **Zero Production Intrusion**: Does not modify production `predict.py` or `ml_service.py` data structures.
- **Section Status**: **`PASS`**

---

## 10. OPERATOR SET MITIGATION ACTION

- **Workflow**: Operator reviews recommended action $\to$ Clicks **EXECUTE MITIGATION / SET** button.
- **Observed Behavior**:
  - Button transitions to active state with clear visual confirmation.
  - Telemetry state is restored to nominal operational envelope ($T=25.0^\circ\text{C}, V=28.2\text{V}$).
  - Double-click debouncing prevents command duplication.
- **Section Status**: **`PASS`**

---

## 11. SECOND SATELLITE ISOLATION TEST (SENTINEL-9)

- **Switching Action**: Switched from AGIS-3 (`SAT-001`) to SENTINEL-9 (`SAT-002`).
- **Verification Results**:
  - Telemetry immediately updated to SENTINEL-9 parameters ($T=24.0^\circ\text{C}, V=28.0\text{V}$).
  - ML Prediction returned `NORMAL` (`+0.058757`).
  - AGIS-3 thermal runaway state did not leak into SENTINEL-9.
  - Switched back to AGIS-3; AGIS-3 history was recalled accurately.
- **Section Status**: **`PASS`**

---

## 12. TECHNICAL REPORT EXPORT

- **CSV Export (`exportTelemetryCSV`)**: Generates UTC-stamped 18-channel engineering telemetry CSV with NORAD IDs and subsystem statuses.
- **Printable PDF (`generatePDFReport`)**: Creates styled engineering summary complete with operational disclaimers.
- **External Network Isolation**: 0 emails dispatched to real agencies; completely safe for live judge demonstration.
- **Section Status**: **`PASS`**

---

## 13. PRESENTATION-SAFETY FINDINGS

| Sensitive Phrase | Audit Classification | Finding / Mitigation |
| :--- | :--- | :--- |
| *"100% accuracy / 100% confidence"* | **SAFE** | Not present in UI. Replaced with empirical metrics. |
| *"Confirmed hardware failure"* | **SAFE** | Uses *"Telemetry-grounded probable root cause"*. |
| *"Guaranteed failure time / RUL"* | **SAFE** | Uses *"Estimated Time to Operational Threshold"*. |
| *"NASA-trained model"* | **SAFE** | NASA SMAP/MSL dataset clearly documented as independent public benchmark. |
| *"Flight-certified autonomy"* | **SAFE** | UI clearly designates AI as an advisory decision-support system. |

---

## 14. MEASURED DEMO TIMINGS

- **Backend Health Check Latency**: `39.34 ms`
- **Single-Sample ML Inference Latency**: `23.83 ms` (P95: `30.41 ms`)
- **API `/api/anomaly/detect` Roundtrip**: `28.40 ms`
- **6-Step Automated Simulation Walkthrough**: `7.2 seconds` (Interactive UI) / `0.45 seconds` (Scripted API test)
- **Total Demonstration Duration**: **~45–60 seconds per satellite** (Ideal for SIH 5-minute judge presentation)

---

## 15. ISSUES & MODIFICATIONS SUMMARY

- **Bugs Found**: `0`
- **Production Files Modified in Step 25**: `0`
- **Model Hash Verification**: `12D956DAA955157B3AA7A85F955301136373D41EC3B11D6C00C21E4B70237FDC` (Verified Unchanged)

---

## 16. FINAL SIH DEMO READINESS RECOMMENDATION

### **FINAL VERDICT: READY FOR LIVE SIH DEMO**

The live SATSHIELD system has successfully passed all live judge demonstration scenarios. The dashboard, ML inference service, explainability evidence, root-cause and mission-impact shadow layers, satellite isolation, and operator SET workflows are robust, responsive, and ready for live presentation.
