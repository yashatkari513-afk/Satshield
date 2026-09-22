# SATSHIELD — 3-Minute SIH Live Technical Demonstration Plan

**Platform:** SATSHIELD v4.3.0 — Autonomous Satellite Health & Anomaly Shield  
**Target Audience:** Smart India Hackathon (SIH) Technical Judges & Aerospace Domain Experts  
**Presentation Duration:** 3 Minutes (180 Seconds)  
**Core Story Arc:**  
$$\text{Multi-Parameter Telemetry} \rightarrow \text{Satellite Selection} \rightarrow \text{Real IsolationForest ML Anomaly Detection} \rightarrow \text{Explainable Evidence} \rightarrow \text{Diagnosis} \rightarrow \text{Predictive Maintenance} \rightarrow \text{Mission Impact} \rightarrow \text{Autonomous Preventive Action}$$

---

## 1. Minute-by-Minute Live Demo Sequence

### **0:00 – 0:20 | Opening & Problem Statement**
* **Screen / Section to Open:** Landing Page (`http://localhost:5173/`)
* **Button to Click:** Hover over hero features, then click **"Launch Mission Control"** (or **"Enter Dashboard"**).
* **What the Judge Observes:** Modern, aerospace-grade mission control landing view with 3D satellite visualization, transitioning cleanly into the live 4-satellite constellation dashboard.
* **Spoken Script (What to Say):**
  > *"Respected Judges, modern satellite constellations generate millions of telemetry points every hour. Ground operators cannot manually track subtle multivariate drift across hundreds of sensors before catastrophic subsystem failure occurs. **SATSHIELD is an autonomous, explainable AI shield that detects early satellite degradation, predicts time-to-threshold, isolates root causes, and recommends proactive preventive action before mission loss.**"*
* **Technical Concept:** Autonomous telemetry monitoring & early anomaly intervention.
* **What NOT to Claim:** Do not claim SATSHIELD is already flying on active ISRO satellites in orbit (it is an operational ground-station decision-support demonstrator).

---

### **0:20 – 0:45 | Constellation Overview & Nominal Telemetry Baseline**
* **Screen / Section to Open:** Dashboard (`/dashboard`) — Top Satellite Selector & Telemetry Cards
* **Button to Click:** Click **"AGIS-3"** (or observe default selection).
* **What the Judge Observes:**
  * Real-time telemetry cards: **Power (94 W / 520 W generation)**, **Battery (88% SoC)**, **Core Temp (28.4 °C)**, **Main Bus Voltage (28.6 V)**, **Downlink Signal (-68 dBm)**.
  * **Live AI Anomaly Panel** showing:
    * `Model: IsolationForest (scikit-learn)`
    * `Status: trained_model_loaded`
    * `Features: 42 numerical temporal features monitored`
    * `Decision Score: +0.0453 (Nominal cluster / positive score)`
* **Spoken Script (What to Say):**
  > *"Here is our live constellation dashboard. We are currently tracking **AGIS-3**, an Earth-observation asset. Notice our AI engine: we are running a real scikit-learn **IsolationForest** model trained strictly on nominal telemetry baselines. It continuously evaluates **42 temporal features**—including 1-step deltas, rolling statistical means, standard deviations, and power interactions. The positive score of **+0.0453** confirms AGIS-3 is operating well inside its learned nominal cluster."*
* **Technical Concept:** Unsupervised multivariate anomaly baseline & feature engineering (42 dimensions).
* **What NOT to Claim:** Do not call the score a "confidence percentage" (it is an empirical IsolationForest decision score where $\ge 0$ is nominal and $< 0$ is anomalous).

---

### **0:45 – 1:20 | Real-Time Anomaly Simulation & 6-Step Progression**
* **Screen / Section to Open:** Dashboard — Simulation Controller
* **Button to Click:** Click **"SIMULATE ANOMALY"** (Select *Sustained Subsystem Overheating* or *EPS Bus Undervoltage*).
* **What the Judge Observes:**
  * Progressive 6-step visual sequence on screen:
    * **Step 1:** Baseline Steady State (`Score: +0.0044`, `Status: NOMINAL`)
    * **Step 2:** Incipient Drift (`Score: -0.0098`, subtle rate-of-change shift)
    * **Step 3:** Threshold Approach (`Score: -0.0058`, subsystem localized to `THERMAL`)
    * **Step 4:** **Real ML Anomaly Detection** (Border turns amber/red, `Score: -0.0231`, status flags `ANOMALY`)
    * **Step 5:** **Predictive Risk Escalation** (`Score: -0.0370`, Risk: `CRITICAL`)
    * **Step 6:** **Automated Mitigation Recommendation** (`Score: -0.0533`)
* **Spoken Script (What to Say):**
  > *"Now, let's inject a progressive anomaly. Watch the 6-step temporal progression: in Steps 1 and 2, telemetry begins subtle multi-sensor drift. In Step 4, our real IsolationForest detects the excursion without waiting for hard static alarm thresholds, driving the raw decision score down to **-0.0231**. In Steps 5 and 6, predictive risk escalates and formulates an actionable response."*
* **Technical Concept:** Temporal anomaly drift detection, decision score threshold crossing, and multi-sensor correlation.
* **What NOT to Claim:** Do not claim the simulation is random or hard-coded (it executes real telemetry arrays through the live Python ML inference engine).

---

### **1:20 – 1:55 | Explainable AI (XAI) Root-Cause & Telemetry Evidence**
* **Screen / Section to Open:** **AI Diagnosis Modal** (Opens automatically after Step 6, or via "VIEW DIAGNOSIS").
* **Button to Click:** Inspect the **Telemetry Evidence** and **Contributing Factors** sections.
* **What the Judge Observes:**
  * **Header:** `AGIS-3 (SAT-001) | Subsystem: THERMAL | Severity: CRITICAL | Score: -0.0533`
  * **Telemetry Evidence List:**
    * `Core Internal Temperature (74.5 °C) exceeds nominal baseline (28.4 °C) by +46.10 °C`
    * `Power Bus Current Draw (16.8 A) exceeds baseline (4.2 A) by +12.60 A`
  * **Contributing Factors:** Primary and supporting factor breakdown.
  * **Probable Root-Cause Assessment:** Grounded physical cause (e.g. *Radiator heat dissipation latch-up or shunt regulator overload*).
  * **Mission Impact:** Clear operational assessment (*Thermal margin degradation risking avionics shutdown*).
* **Spoken Script (What to Say):**
  > *"Immediately upon detection, SATSHIELD answers the operator's primary question: **WHY was this satellite flagged?** Rather than a black-box percentage, our Explainable AI layer extracts direct empirical telemetry evidence: core temperature is **+46.1 °C** above baseline and current draw surged by **+12.6 A**. It isolates the affected subsystem to **THERMAL** and synthesizes a probable root cause with mission impact."*
* **Technical Concept:** Explainable AI (XAI), empirical evidence grounding, and automated subsystem localization.
* **What NOT to Claim:** Do not claim the root cause is "100% mathematically proven" (it is an empirical probable root-cause assessment derived from sensor deviations).

---

### **1:55 – 2:25 | Predictive Maintenance & Estimated Time-to-Threshold**
* **Screen / Section to Open:** AI Diagnosis Modal — **Predictive Maintenance Section**
* **Button to Click:** Point out the trend sparkline and rate-of-change metrics.
* **What the Judge Observes:**
  * **Risk Level:** `CRITICAL (Escalating Trend)`
  * **Degradation Velocity:** $+3.8\text{ °C/frame}$ rate of change ($\Delta x / \Delta t$).
  * **Persistence:** `4 consecutive frames above anomaly threshold`.
  * **Estimated Time to Operational Threshold:** Clear time projection (e.g. `~14 frames / Estimated ~2.3 minutes at current degradation rate`).
  * **Disclaimer Badge:** `Projected estimate based on telemetry rate-of-change — not a guaranteed timestamp`.
* **Spoken Script (What to Say):**
  > *"Here is our predictive maintenance engine. By analyzing the 6-frame historical velocity, SATSHIELD calculates a degradation rate of **+3.8 °C per frame**. Based on this slope, it estimates that the satellite will breach critical thermal shutdown limits in approximately **14 frames**. We explicitly disclose that this is a trend-based velocity projection, giving ground control a critical proactive decision window."*
* **Technical Concept:** Predictive maintenance, linear/first-order degradation velocity projection, and persistence debouncing.
* **What NOT to Claim:** Do not claim it is a "guaranteed failure timestamp" (it is a dynamic trend projection).

---

### **2:25 – 2:45 | Actionable Preventive Mitigation & Verification**
* **Screen / Section to Open:** AI Diagnosis Modal — **Recommended Action Banner**
* **Button to Click:** Click **"EXECUTE MITIGATION"** (or **"SET POWER SAVING MODE"**).
* **What the Judge Observes:**
  * Action button confirms: `Mitigation command dispatched`.
  * Satellite status updates back to `NOMINAL`.
  * Real-time telemetry stabilizes, decision score returns to positive ($+0.035$).
  * Alert clears from the active queue.
* **Spoken Script (What to Say):**
  > *"SATSHIELD provides closed-loop decision support. It provides an immediate operational mitigation: shed non-essential payload load and activate radiator auxiliary cooling. When I click **'EXECUTE MITIGATION'**, the command is dispatched, the thermal load drops, and AGIS-3 safely returns to nominal operational status."*
* **Technical Concept:** Automated closed-loop mitigation dispatch and health status recovery.
* **What NOT to Claim:** Do not claim physical satellite hardware was commanded over space RF (it commands the live operational simulation loop).

---

### **2:45 – 3:00 | SIH Differentiation & Strong Closing Pitch**
* **Screen / Section to Open:** Quick click on **"VALIDATION METRICS"** (or return to Dashboard Overview)
* **Button to Click:** Point to the empirical **81.0% Precision / 98.1% Recall / 88.7% F1** validation card.
* **What the Judge Observes:** Real quantitative confusion matrix and threshold sensitivity chart.
* **Spoken Script (What to Say):**
  > *"To summarize, Judges: **SATSHIELD does not stop at simple anomaly detection.** It seamlessly connects real IsolationForest detection, empirical XAI evidence, predictive maintenance velocity, mission impact, and closed-loop preventive action in one unified workflow. Our architecture has been rigorously validated on held-out data with **98.1% recall** and independently benchmarked on over **510,000 real flight telemetry points from NASA SMAP and MSL missions**. Thank you, and we welcome your questions!"*
* **Technical Concept:** End-to-end full-stack integration and rigorous empirical validation.

---

## 2. 30-Second AI/ML Explanation for Judges

> **Judge:** *"How does your AI/ML model actually work under the hood?"*  
> **Your 30-Second Response:**  
> *"We use scikit-learn's **IsolationForest**, an unsupervised ensemble anomaly detection algorithm specifically suited for aerospace telemetry.  
> 1. **Input:** We feed it 42 continuous features per frame (raw telemetry, 1-step rates-of-change, rolling means, and rolling standard deviations).  
> 2. **Training:** The model isolates nominal operating clusters using recursive decision trees trained purely on normal satellite passes.  
> 3. **Scoring:** Anomalous observations require significantly fewer random splits to isolate, resulting in a negative decision score.  
> 4. **Downstream Integration:** When the score drops below zero, our explainability layer isolates which specific features caused the tree separation to generate human-readable evidence and root causes."*

---

## 3. Judge-Visible Proof of Real ML Pipeline

If a judge asks to verify that this is a **real AI/ML pipeline and not a fake demo**:

| UI Element / Feature | Location on Screen | What It Proves |
| :--- | :--- | :--- |
| **Model Badge** | Top AI Anomaly Panel | Displays `IsolationForest (scikit-learn)` and `trained_model_loaded`. |
| **Feature Counter** | AI Anomaly Panel | Displays `42 features monitored` (8 raw + 8 deltas + 16 rolling stats + 8 deviations + 2 power metrics). |
| **Raw Decision Score** | AI Anomaly Panel & Modal | Shows continuous, non-discrete floating point numbers (e.g. `+0.0453` vs `-0.1874`). |
| **Telemetry Evidence** | Diagnosis Modal | Compares observed values against nominal baseline envelopes (e.g. $+46.1\text{ °C}$ deviation). |
| **Validation Modal** | Header "Benchmark / Validation" CTA | Displays true empirical confusion matrix ($TP=102, TN=81, FP=24, FN=2$) on held-out validation data. |
| **Independent NASA Benchmark** | Documentation & Technical Report | Proven evaluation across 510,225 real flight observations (NASA SMAP/MSL, 105/105 sequences detected). |

---

## 4. Backup Demo Path (Live Resilience Guarantee)

If network connectivity drops or the FastAPI backend is temporarily restarted during the demo:

1. **Step 1:** The frontend detects backend offline status gracefully and displays a clear badge: `Offline Mode / Local Cache Active`.
2. **Step 2:** Click **"SIMULATE ANOMALY"** — the built-in deterministic physical telemetry engine continues to execute all 6 simulation steps locally in the browser context.
3. **Step 3:** Open **"VALIDATION METRICS"** to demonstrate the quantitative confusion matrix, ROC threshold sweep, and subsystem breakdown from the local validation cache.
4. **Step 4:** Switch between **AGIS-3**, **SENTINEL-9**, and **ORBCOM-7** to demonstrate multi-satellite state isolation.

---

## 5. Scientific Honesty Rules (Prohibited Claims)

| Prohibited Misleading Claim | Scientifically Accurate Statement |
| :--- | :--- |
| ❌ *"Our simulation uses real-time live ISRO satellite downlinks."* | ✅ *"We use a high-fidelity synthetic telemetry simulator modeled after standard LEO/GEO satellite flight envelopes."* |
| ❌ *"Our production model achieved 100% accuracy on NASA satellites."* | ✅ *"SATSHIELD's anomaly-detection methodology was independently benchmarked on public NASA SMAP/MSL flight telemetry, detecting 100% of labeled anomaly sequences (105/105 incidents)."* |
| ❌ *"The score of 0.88 means 88% confidence of failure."* | ✅ *"It is a continuous calibrated anomaly score derived from the IsolationForest decision function, where negative values indicate significant deviation from nominal."* |
| ❌ *"We guarantee the satellite will die in exactly 140 seconds."* | ✅ *"It is a linear rate-of-change projection estimating time to operational threshold breach at the current degradation velocity."* |
| ❌ *"Our AI calculates 94.2% probability of solar panel crack."* | ✅ *"Our XAI engine identifies solar array power collapse as the primary contributing factor and ranks it as a probable root cause."* |

---

## 6. Final 20-Second SIH Closing Pitch

> *"Judges, SATSHIELD transforms satellite health monitoring from reactive alarm firefighting into **autonomous, predictive, and explainable decision support**. By bridging real IsolationForest anomaly detection, empirical XAI evidence, and predictive maintenance in a single workflow, SATSHIELD empowers ground operators to safeguard multi-crore space assets with confidence. Thank you!"*
