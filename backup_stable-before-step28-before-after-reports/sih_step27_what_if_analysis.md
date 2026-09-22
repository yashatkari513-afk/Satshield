# SATSHIELD STEP 27 — REAL WHAT-IF / SCENARIO ANALYSIS TECHNICAL DOCUMENTATION

## 1. Executive Summary & Objective

SATSHIELD Step 27 adds a **real, deterministic What-If / Scenario Analysis Engine** to the SATSHIELD platform. Operating as a decision-support and flight-readiness projection layer, the engine enables satellite operators and flight directors to assess hypothetical degradation trajectories ("What happens if temperature continues increasing?", "What happens if battery SOC keeps dropping?") using measured linear regression trends, physical threshold margins, and multi-parameter compounding interaction modeling.

The engine operates with strict scientific honesty: it produces **zero random numbers**, claims **no unvalidated failure dates**, refuses autonomous commands, and returns explicit `"N/A — insufficient evidence"` for sparse or flat telemetry.

---

## 2. Architecture & Data Flow

```
+-------------------------------------------------------------------------------+
|                             WHAT-IF SCENARIO QUERY                            |
|    Natural Query (AI Assistant) OR Interactive Control Panel (Dashboard)      |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       ISOLATED SATELLITE CONTEXT ROUTER                       |
|   - Active Vehicle ID: AGIS-3, SENTINEL-9, ORBCOM-7, HELIOS-1                 |
|   - Real Telemetry Channels (8 Primary Channels)                              |
|   - Historical Sequence History Buffer (Slopes, Rolling Stats, Accelerations) |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                      WHAT-IF SCENARIO ANALYSIS ENGINE                         |
|                       (satshield_ml/what_if_analysis.py)                      |
|   1. Parameter Resolver & Boundary Limits Extractor                           |
|   2. Deterministic Projection: projected_val = current_val + (slope * horizon)|
|   3. Threshold Crossing & Persistence Evaluator                               |
|   4. Multi-Parameter Coupled Stress Analysis (Thermal+Power, Sag, ADCS, Comm) |
|   5. Discrete Projected Risk Classification (NOMINAL -> CRITICAL)             |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                   STRUCTURED SCENARIO PROJECTION RESPONSE                     |
|   - Current Value & Measured Slope (e.g. +1.600 °C/min)                       |
|   - Projected Value at T+10m (e.g. 71.00 °C, Threshold: 60.00 °C)             |
|   - Estimated Time to Threshold (e.g. 3.1 min)                                |
|   - Projected Risk Level & Physical Cause Explanation                         |
|   - Preventive Advisory Operator Action (Decision Support Only)               |
+-------------------------------------------------------------------------------+
```

---

## 3. Mathematical Formulation & Calculation Method

1. **Measured Trend Slope**:
   $$\text{slope} = \frac{\sum_{i=1}^n (x_i - \bar{x})(y_i - \bar{y})}{\sum_{i=1}^n (x_i - \bar{x})^2}$$
2. **Deterministic Projection**:
   $$\text{projected\_value} = \text{current\_value} + (\text{slope} \times \text{projection\_horizon\_minutes})$$
3. **Physical Clamping**:
   - $\text{Battery SOC} \in [0.0\%, 100.0\%]$
   - $\text{Solar Power} \ge 0.0\text{ W}$, $\text{Current} \ge 0.0\text{ A}$, $\text{Vibration} \ge 0.0\text{ g}$, $\text{Pointing Error} \ge 0.0^\circ$
4. **Estimated Time to Operational Threshold**:
   $$\text{ETT} = \frac{|\text{Operational Threshold} - \text{Current Value}|}{|\text{slope}|}$$

---

## 4. Multi-Parameter Compounding Logic

The engine monitors coupled physical interactions across multiple subsystem channels:
- **Coupled Thermal-Power Stress**: High core temperature ($>50^\circ\text{C}$) concurrently with elevated current draw ($>14\text{A}$).
- **EPS Bus Sag**: Main bus voltage falling ($\le 24\text{V}$) while bus current remains elevated ($\ge 14\text{A}$).
- **Energy Balance Deficit**: Battery SOC depleting ($\le 50\%$) with solar generation deficit ($\le 300\text{W}$).
- **RF Link Marginality**: Downlink carrier signal approaching demodulation threshold ($\le -95\text{ dBm}$).
- **Attitude Perturbation**: Pointing deviation ($\ge 1.0^\circ$) or structural vibration ($\ge 0.20\text{ g}$) exceeding nominal jitter envelope.

---

## 5. End-to-End Test Battery Results

### Test Suite: `satshield_ml/test_step27_what_if.py` (18/18 PASS)

| Test ID | Test Case Description | Result |
|---|---|---|
| `test_01` | Stable temperature yields NOMINAL status without alarming projection | **PASS** |
| `test_02` | Persistent increasing temperature produces projected thermal risk | **PASS** |
| `test_03` | Declining battery SOC detects battery capacity degradation scenario | **PASS** |
| `test_04` | Declining voltage + increasing current detects compound power bus sag | **PASS** |
| `test_05` | Degrading RF signal detects communication link attenuation scenario | **PASS** |
| `test_06` | Increasing pointing deviation detects attitude pointing scenario | **PASS** |
| `test_07` | Threshold already crossed returns status without invalid negative time | **PASS** |
| `test_08` | Perfectly flat trend returns stable report | **PASS** |
| `test_09` | Fewer than 3 history frames returns N/A insufficient evidence | **PASS** |
| `test_10` | Missing or NaN telemetry is handled gracefully without exception | **PASS** |
| `test_11` | AGIS-3 scenario uses only AGIS-3 context | **PASS** |
| `test_12` | SENTINEL-9 scenario uses only SENTINEL-9 context | **PASS** |
| `test_13` | ORBCOM-7 scenario uses only ORBCOM-7 context | **PASS** |
| `test_14` | HELIOS-1 scenario uses only HELIOS-1 context | **PASS** |
| `test_15` | Multi-parameter compounding analysis is strictly deterministic | **PASS** |
| `test_16` | Mission Assistant handles What-If questions using real scenario engine | **PASS** |
| `test_17` | Identical input sequence produces byte-for-byte identical output | **PASS** |
| `test_18` | Recommended action is purely advisory (zero autonomous commands) | **PASS** |

---

## 6. Regression Testing Summary

| Test Category | Suite / Command | Execution Result |
|---|---|---|
| **What-If Scenario Battery** | `satshield_ml/test_step27_what_if.py` (18 tests) | **18/18 PASSED** |
| **AI Mission Assistant Battery** | `satshield_ml/test_step26_mission_assistant.py` (17 tests) | **17/17 PASSED** |
| **Predictive Maintenance** | `satshield_ml/test_step11_predictive.py` (12 tests) | **12/12 PASSED** |
| **Explainability Engine** | `satshield_ml/test_step10_explainability.py` (6 tests) | **6/6 PASSED** |
| **ML Inference Service** | `satshield_ml/test_predict.py` (7 tests) | **7/7 PASSED** |
| **Backend API Integration** | `satshield_ml/test_backend_integration.py` (7 tests) | **7/7 PASSED** |
| **TypeScript & Production Build** | `npm.cmd run build` (Vite v8.2.2) | **0 Errors, 2978 modules** |
| **Live FastAPI Backend** | `POST http://localhost:8000/api/what-if/analyze` | **200 OK, LIVE** |

---

## 7. Example Real Scenario Output

```json
{
  "satellite_id": "AGIS-3",
  "parameter": "Core Internal Temperature",
  "parameter_key": "temperature_c",
  "subsystem": "THERMAL",
  "current_value": 55.0,
  "unit": "°C",
  "trend_slope": 1.6,
  "trend_slope_formatted": "+1.600 °C/min",
  "trend_direction": "INCREASING",
  "operational_threshold": 60.0,
  "warning_threshold": 50.0,
  "projected_value": 71.0,
  "projection_horizon_minutes": 10.0,
  "estimated_time_to_threshold": 3.1,
  "estimated_time_formatted": "3.1 min",
  "current_risk": "HIGH",
  "projected_risk": "CRITICAL",
  "scenario_status": "DEGRADING_TREND",
  "explanation": "If the current core internal temperature trend persists (+1.600 °C/min), value is projected to reach 71.00 °C in 10 minutes (Threshold: 60.0 °C, Margin: 11.00 °C).",
  "impact": "Thermal margin depletion risks core electronics overheating and accelerated component degradation.",
  "recommended_action": "Inspect thermal subsystem load, verify radiator heat-pipe performance, review heater duty cycles, and prepare attitude solar-offset maneuver if temperature slope persists.",
  "multi_parameter_assessment": {
    "status": "ACTIVE_INTERACTION",
    "compounding_risk": "HIGH",
    "summary": "Identified 1 multi-parameter operational interaction(s).",
    "interactions": [
      "Elevated Thermal Load: Temperature and bus current concurrently above nominal baseline."
    ]
  },
  "prediction_method": "Trend-based temporal projection",
  "data_quality": "GOOD",
  "disclaimer": "Synthetic / simulated telemetry — demonstration and validation dataset."
}
```

---

## 8. Production Model Hash Verification

- **Target File**: `satshield_ml/models/isolation_forest.joblib`
- **Expected Hash**: `12D956DAA955157B3AA7A85F955301136373D41EC3B11D6C00C21E4B70237FDC`
- **Actual Post-Step 27 Hash**: `12D956DAA955157B3AA7A85F955301136373D41EC3B11D6C00C21E4B70237FDC`
- **Verification Status**: **100% BYTE-FOR-BYTE IDENTICAL & PRESERVED**
