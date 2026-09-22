# SATSHIELD Step 22: Root-Cause Analysis Shadow Mode Integration Report

**System**: SATSHIELD Spacecraft Telemetry & Autonomous Health Monitoring System  
**Module**: Root-Cause Analysis Shadow Mode Integration (Step 22)  
**Execution Timestamp**: `2026-09-16T12:40:00Z`  
**Status**: **`READY FOR SIH DEMO`**

---

## 1. Safety Checkpoint & Model Integrity

- **Restore Checkpoint Created**: `backup_stable-before-root-cause-shadow-integration/`
- **Production Model**: `satshield_ml/models/isolation_forest.joblib`
  - **SHA-256 (Initial)**: `12d956daa955157b3aa7a85f955301136373d41ec3b11d6c00c21e4b70237fdc`
  - **SHA-256 (Post-Integration)**: `12d956daa955157b3aa7a85f955301136373d41ec3b11d6c00c21e4b70237fdc`
  - **Status**: **100% UNCHANGED / BIT-FOR-BIT IDENTICAL**
- **42-Feature Schema**: `satshield_ml/models/feature_columns.json` remains 100% untouched.
- **Production Weights / Training Pipeline**: 0 modifications, zero retraining.

---

## 2. Production Files Changed

The shadow integration was implemented with the absolute minimum safe footprint:

1. [`satshield_ml/root_cause_service.py`](file:///c:/xampp/htdocs/Satelite%20health%20detector/satshield_ml/root_cause_service.py) *(NEW)*: Non-blocking shadow adapter wrapping the Step 22 multi-signal correlation engine.
2. [`satshield_ml/ml_service.py`](file:///c:/xampp/htdocs/Satelite%20health%20detector/satshield_ml/ml_service.py) *(MODIFIED)*: Appended non-blocking shadow invocation inside `run_ml_inference` alongside Step 11 Predictive Maintenance.
3. [`backend/api/schemas.py`](file:///c:/xampp/htdocs/Satelite%20health%20detector/backend/api/schemas.py) *(MODIFIED)*: Added optional `root_cause_analysis` field to `AnomalyDetectionResponse`.
4. [`backend/api/main.py`](file:///c:/xampp/htdocs/Satelite%20health%20detector/backend/api/main.py) *(MODIFIED)*: Forwarded shadow root-cause payload in `/api/anomaly/detect` and `/api/anomaly/scenarios/trigger`.
5. [`src/services/mlAnomalyService.ts`](file:///c:/xampp/htdocs/Satelite%20health%20detector/src/services/mlAnomalyService.ts) *(MODIFIED)*: Added `MLRootCauseAnalysis` interface to TypeScript client definitions.
6. [`src/components/dashboard/AIDiagnosisModal.tsx`](file:///c:/xampp/htdocs/Satelite%20health%20detector/src/components/dashboard/AIDiagnosisModal.tsx) *(MODIFIED)*: Rendered professional **ROOT-CAUSE ANALYSIS (SHADOW LAYER)** section in the existing diagnosis modal without modifying dashboard layout.
7. [`satshield_ml/experiments/root_cause/test_shadow_integration.py`](file:///c:/xampp/htdocs/Satelite%20health%20detector/satshield_ml/experiments/root_cause/test_shadow_integration.py) *(NEW)*: Comprehensive 17-test regression & validation test suite.

---

## 3. Architecture Before vs. After

### Before Step 22 Integration:
```
Telemetry Ingestion
      │
      ▼
SimulationContext / FastAPI (/api/anomaly/detect)
      │
      ▼
ml_service.py ──> predict.py ──> IsolationForest (42 Features)
      │                                 │
      ▼                                 ▼
Predictive Maintenance             XAI Evidence Extraction
      │                                 │
      └─────────────────────────────────┴──> Diagnosis Modal
```

### After Step 22 Shadow Mode Integration:
```
Telemetry Ingestion
      │
      ▼
SimulationContext / FastAPI (/api/anomaly/detect)
      │
      ▼
ml_service.py ──> predict.py ──> IsolationForest (Primary Decision: Unchanged)
      │                                 │
      ├──> Predictive Maintenance       │
      │                                 │
      ├──> [SHADOW LAYER]               ▼
      │    root_cause_service.py   XAI Evidence Extraction
      │    (Multi-Signal Correlation)   │
      │                                 │
      └─────────────────────────────────┴──> Diagnosis Modal (Section 7)
                                             (Telemetry-Grounded Probable Cause)
```

---

## 4. How Shadow Mode Works

1. **Non-Interference Guarantee**: The primary anomaly classification (`NORMAL` vs. `ANOMALY`), continuous anomaly score, decision threshold ($0.0000$), and predictive-maintenance RUL trajectory are computed first by production models.
2. **Parallel Advisory Analysis**: `analyze_root_cause_shadow` evaluates multi-channel cross-correlation (e.g., coupling battery voltage sag with discharge current surges, or thermal rise slopes with current draw) in an isolated try-catch block.
3. **Strict Sandboxing**: Each satellite ID maintains an independent streak and history tracker in memory. Satellite A anomalies never contaminate Satellite B telemetry.
4. **Refusal to Hallucinate**: If telemetry is ambiguous or uncorroborated by coupled physical channels, the shadow engine explicitly outputs `AMBIGUOUS / INSUFFICIENT EVIDENCE` with `evidence_strength: "AMBIGUOUS"`.

---

## 5. Root-Cause Structured Output Schema

The shadow layer returns a 12-field telemetry diagnostic dictionary:

```json
{
  "satellite_id": "SENTINEL-9",
  "affected_subsystem": "BATTERY",
  "primary_probable_cause": "Battery Deep Discharge & EPS Energy Deficit",
  "evidence": [
    "Battery SoC (32.0%) below nominal threshold (65.0%)",
    "EPS bus voltage depressed (21.50 V) under nominal 26.0 V",
    "Elevated discharge current draw (18.00 A)",
    "Solar array undergeneration (140.0 W)"
  ],
  "contributing_factors": [
    "sustained electrochemical discharge",
    "voltage sag under load",
    "high current consumption",
    "solar charging deficit"
  ],
  "evidence_strength": "STRONG",
  "severity": "CRITICAL",
  "persistence": "6 consecutive frames",
  "trend_summary": "Main Bus Voltage (-0.35V / 30s), Current (+0.80A / 30s)",
  "data_quality": "GOOD",
  "analysis_method": "Multi-Signal Temporal Correlation & Subsystem Envelope Matrix (Shadow Layer)",
  "limitations": "Telemetry-grounded probable assessment based on physical correlation; not a confirmed hardware failure."
}
```

---

## 6. Integration Test Suite Results (17/17 PASSED)

Executed via [`satshield_ml/experiments/root_cause/test_shadow_integration.py`](file:///c:/xampp/htdocs/Satelite%20health%20detector/satshield_ml/experiments/root_cause/test_shadow_integration.py):

| # | Test Scenario / Requirement | Expected Subsystem | Detected Output | Evidence Strength | Status |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | AGIS-3 normal baseline | `NOMINAL` | `NOMINAL` | `NOMINAL` | **PASS** |
| **2** | AGIS-3 thermal runaway anomaly | `THERMAL` | `THERMAL` | `MODERATE` | **PASS** |
| **3** | SENTINEL-9 battery depletion anomaly | `BATTERY` | `BATTERY` | `MODERATE` | **PASS** |
| **4** | ORBCOM-7 communication link loss | `COMMUNICATION` | `COMMUNICATION` | `WEAK` | **PASS** |
| **5** | HELIOS-1 normal baseline | `NOMINAL` | `NOMINAL` | `NOMINAL` | **PASS** |
| **6** | Combined battery + power surge anomaly | `BATTERY` / `POWER` | `BATTERY` | `MODERATE` | **PASS** |
| **7** | Ambiguous single-sensor glitch (refusal to hallucinate) | `AMBIGUOUS / INSUFFICIENT EVIDENCE` | `AMBIGUOUS / INSUFFICIENT EVIDENCE` | `AMBIGUOUS` | **PASS** |
| **8** | Anomaly followed by recovery sequence | `NOMINAL` | `NOMINAL` | `NOMINAL` | **PASS** |
| **9** | Insufficient telemetry stream (< 3 physical channels) | `AMBIGUOUS / INSUFFICIENT EVIDENCE` | `AMBIGUOUS / INSUFFICIENT EVIDENCE` | `AMBIGUOUS` | **PASS** |
| **10**| Safe rejection of NaN / Inf inputs | `INVALID` Quality | `INVALID` Handled Safely | `AMBIGUOUS` | **PASS** |
| **11**| Strict cross-satellite state isolation | `NOMINAL` on Sat-B | `NOMINAL` (0 frame streak) | `NOMINAL` | **PASS** |
| **12**| Deterministic repeatability between identical runs | Bit-for-bit match | Identical score & subsystem | `MODERATE` | **PASS** |
| **13**| Existing 6-step scenario simulation pipeline | `BATTERY` | `BATTERY` (Anomaly Flagged) | `MODERATE` | **PASS** |
| **14**| Automatic diagnosis payload after Step 6 | All fields present | Validated JSON payload | Verified | **PASS** |
| **15**| Manual View Diagnosis 12-field schema compliance | 12/12 Fields | 12/12 Fields Present | Verified | **PASS** |
| **16**| Predictive maintenance non-interference | Unaffected | Risk Level & RUL preserved | Verified | **PASS** |
| **17**| SET / mitigation stabilization cycle flow | `NOMINAL` | `NOMINAL` post-stabilization | `NOMINAL` | **PASS** |

---

## 7. Regression Test Suite Results

1. **Production ML Unit Tests (`satshield_ml/test_predict.py`)**:
   - `[TEST 1]` Model artifact and 42-feature schema loading: **PASS**
   - `[TEST 2]` Normal sample inference: **PASS**
   - `[TEST 3]` Anomaly sample inference & evidence grounding: **PASS**
   - `[TEST 4]` Output structure 11 required fields: **PASS**
   - `[TEST 5]` Invalid telemetry input rejection: **PASS**
   - `[TEST 6]` Strict inference determinism: **PASS**
   - `[TEST 7]` Public `predict_telemetry()` wrapper: **PASS**
   - **Result**: **7/7 PASSED (100%)**

2. **FastAPI Endpoints (`backend/test_api.py`)**:
   - `/api/health` connectivity & model status: **PASS**
   - `/api/anomaly/detect` across 5 physical scenarios: **5/5 PASSED (100%)**

3. **Backend Full Workflow (`backend/test_full_workflow.py`)**:
   - Database, telemetry generation, anomaly detection, report generation, email dispatch: **10/10 PASSED (100%)**

4. **Frontend TypeScript & Production Bundle (`npm run build`)**:
   - Vite & Rolldown bundle build: **SUCCESS (12.16s, 0 errors)**

---

## 8. Failure & Safe Fallback Behavior

If the shadow root-cause engine experiences any runtime exception, timeout, or receives invalid/insufficient telemetry:
- Primary anomaly detection remains 100% operational.
- Predictive maintenance and early warning systems remain 100% operational.
- Returns safe structured fallback:
  ```json
  {
    "affected_subsystem": "AMBIGUOUS / INSUFFICIENT EVIDENCE",
    "primary_probable_cause": "Root cause not determined — insufficient corroborating telemetry.",
    "evidence_strength": "AMBIGUOUS",
    "severity": "LOW",
    "data_quality": "INSUFFICIENT"
  }
  ```
- Dashboard displays safe fallback message: *"Root cause not determined — insufficient corroborating telemetry."*
- Zero unhandled exceptions or UI crashes.

---

## 9. Scientific Honesty & Limitations

- **Telemetry-Grounded Probable Assessment**: The root-cause assessment is a telemetry-grounded diagnostic hypothesis based on multi-signal physics correlations. It does not claim proven internal hardware physical causality.
- **Wording Standard**: UI and API outputs strictly use *"Telemetry-grounded probable root cause"* rather than *"Confirmed hardware failure"*.
- **Zero Fabricated Probabilities**: Evidence strength is classified qualitatively (`STRONG`, `MODERATE`, `WEAK`, `AMBIGUOUS`, `NOMINAL`) without generating unsupported percentage confidence numbers.

---

## 10. Final Status

### **READY FOR SIH DEMO**

- **Zero Breaking Changes**: Production IsolationForest model, 42-feature schema, and existing workflow pipelines are 100% preserved.
- **Robust UI Presentation**: Subtle, high-contrast dark mode advisory section embedded directly into the existing diagnosis modal.
- **Complete Test Coverage**: 17/17 integration tests, 7/7 ML unit tests, 10/10 backend workflow tests, and frontend build all passing cleanly.
