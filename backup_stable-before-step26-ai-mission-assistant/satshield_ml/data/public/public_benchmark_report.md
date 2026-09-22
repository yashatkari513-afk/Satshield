# SATSHIELD NASA SMAP & MSL Public Telemetry Benchmark Report

**Document Version:** 1.0.0  
**Execution Timestamp:** 2026-09-14T09:39:34.812304+00:00  
**Evaluation Paradigm:** Independent, Channel-Agnostic IsolationForest Benchmark on Real Flight Telemetry  
**Dataset:** NASA SMAP & MSL Spacecraft Telemetry Anomaly Dataset (NASA Jet Propulsion Laboratory (JPL) / Caltech)  
**License:** BSD-3-Clause Open Source License  

---

## 1. Executive Summary & Scientific Distinction

> [!IMPORTANT]
> **Scientific Distinction:** The SATSHIELD production `IsolationForest` model is trained on our 42-feature multivariate physical schema (`temperature_c`, `voltage_v`, etc.) for real-time dashboard telemetry. Because NASA JPL pre-anonymized sensor IDs and units, forcing NASA channels into fake physical fields would violate engineering integrity. Instead, **SATSHIELD's anomaly-detection methodology was independently benchmarked on publicly available NASA spacecraft telemetry using a channel-agnostic temporal evaluation.**

### Key Benchmark Outcomes

| Metric | Overall Benchmark | NASA SMAP (Earth Orbit) | NASA MSL (Mars Rover/Spacecraft) |
| :--- | :--- | :--- | :--- |
| **Evaluated Test Observations** | **510,225** | 435,826 | 74,399 |
| **True Positives (TP)** | **41,817** | 37,422 | 4,395 |
| **True Negatives (TN)** | **233,077** | 197,482 | 35,595 |
| **False Positives (FP)** | **213,514** | 182,440 | 31,074 |
| **False Negatives (FN)** | **21,817** | 18,482 | 3,335 |
| **Precision** | **0.1638** | 0.1702 | 0.1239 |
| **Recall (Sensitivity)** | **0.6571** | 0.6694 | 0.5686 |
| **F1-Score** | **0.2622** | 0.2714 | 0.2035 |
| **Accuracy** | **0.5388** | 0.5390 | 0.5375 |
| **False Positive Rate (FPR)** | **0.4781** | 0.4802 | 0.4661 |
| **Incident Sequence Detection Rate** | **100.00%** (105/105) | — | — |

---

## 2. Detection Latency Analysis

For each ground-truth anomaly interval $[s, e]$, latency is measured as the number of elapsed timesteps between anomaly inception $s$ and the first triggered alert:

* **Total Labeled Anomaly Sequences:** 105
* **Successfully Detected Incidents:** **105** (100.00%)
* **Missed Incidents:** **0**
* **Mean Detection Latency:** **7.62 timesteps**
* **Median Detection Latency:** **1.0 timesteps**
* **Latency Range:** **[0, 101] timesteps**

---

## 3. Mathematical Feature Representation & Guardrails

1. **Feature Construction:** For every channel, an isolated 5-dimensional temporal feature space was computed:
   * Raw continuous signal $x_t$ (`col 0`)
   * 1-step backward rate of change $\Delta x_t = x_t - x_{t-1}$
   * 5-step rolling mean $\mu_5(x)_t$
   * 5-step rolling standard deviation $\sigma_5(x)_t$
   * Baseline deviation $x_t - \mu_5(x)_t$
2. **Zero Label Leakage:** Rolling windows were strictly backward-looking (`min_periods=1`). Future timesteps and ground-truth anomaly labels were never used during feature construction or training.
3. **Conservation Law Verified:** For every evaluated channel, $TP + TN + FP + FN = N_{\text{test}}$ was mathematically enforced with 100% compliance.

---

## 4. Per-Channel Benchmark Performance Table

| Channel | Spacecraft | Test Samples | Anomaly Seq | TP | TN | FP | FN | Precision | Recall | F1 | FPR | Mean Latency (Steps) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A-1** | SMAP | 8,640 | 1 | 84 | 0 | 8556 | 0 | 0.010 | 1.000 | 0.019 | 1.000 | 0.0 |
| **A-2** | SMAP | 7,914 | 1 | 15 | 5428 | 2376 | 95 | 0.006 | 0.136 | 0.012 | 0.304 | 0.0 |
| **A-3** | SMAP | 8,205 | 1 | 37 | 6392 | 1628 | 148 | 0.022 | 0.200 | 0.040 | 0.203 | 4.0 |
| **A-4** | SMAP | 8,080 | 1 | 22 | 6945 | 1025 | 88 | 0.021 | 0.200 | 0.038 | 0.129 | 0.0 |
| **A-5** | SMAP | 4,693 | 1 | 50 | 0 | 4643 | 0 | 0.011 | 1.000 | 0.021 | 1.000 | 0.0 |
| **A-6** | SMAP | 4,453 | 1 | 39 | 0 | 4413 | 1 | 0.009 | 0.975 | 0.017 | 1.000 | 0.0 |
| **A-7** | SMAP | 8,631 | 1 | 1524 | 4143 | 2088 | 876 | 0.422 | 0.635 | 0.507 | 0.335 | 2.0 |
| **A-8** | SMAP | 8,375 | 1 | 3805 | 73 | 4497 | 0 | 0.458 | 1.000 | 0.628 | 0.984 | 0.0 |
| **A-9** | SMAP | 8,434 | 1 | 2833 | 0 | 4570 | 1031 | 0.383 | 0.733 | 0.503 | 1.000 | 0.0 |
| **B-1** | SMAP | 8,044 | 1 | 70 | 0 | 7974 | 0 | 0.009 | 1.000 | 0.017 | 1.000 | 0.0 |
| **C-1** | MSL | 2,264 | 2 | 106 | 1794 | 160 | 204 | 0.399 | 0.342 | 0.368 | 0.082 | 4.0 |
| **C-2** | MSL | 2,051 | 2 | 135 | 0 | 1916 | 0 | 0.066 | 1.000 | 0.123 | 1.000 | 0.0 |
| **D-1** | SMAP | 8,509 | 1 | 2992 | 3325 | 1926 | 266 | 0.608 | 0.918 | 0.732 | 0.367 | 0.0 |
| **D-11** | SMAP | 7,431 | 1 | 28 | 2114 | 5257 | 32 | 0.005 | 0.467 | 0.011 | 0.713 | 32.0 |
| **D-12** | SMAP | 7,918 | 1 | 2739 | 0 | 5179 | 0 | 0.346 | 1.000 | 0.514 | 1.000 | 0.0 |
| **D-13** | SMAP | 7,663 | 1 | 160 | 0 | 7503 | 0 | 0.021 | 1.000 | 0.041 | 1.000 | 0.0 |
| **D-14** | MSL | 2,625 | 2 | 220 | 0 | 2405 | 0 | 0.084 | 1.000 | 0.155 | 1.000 | 0.0 |
| **D-15** | MSL | 2,158 | 1 | 336 | 996 | 522 | 304 | 0.392 | 0.525 | 0.449 | 0.344 | 0.0 |
| **D-16** | MSL | 2,191 | 1 | 640 | 600 | 941 | 10 | 0.405 | 0.985 | 0.574 | 0.611 | 4.0 |
| **D-2** | SMAP | 8,595 | 1 | 4217 | 0 | 4378 | 0 | 0.491 | 1.000 | 0.658 | 1.000 | 0.0 |
| **D-3** | SMAP | 8,640 | 1 | 2076 | 4262 | 1103 | 1199 | 0.653 | 0.634 | 0.643 | 0.206 | 15.0 |
| **D-4** | SMAP | 8,473 | 1 | 3247 | 2476 | 2750 | 0 | 0.541 | 1.000 | 0.703 | 0.526 | 0.0 |
| **D-5** | SMAP | 7,628 | 1 | 18 | 6674 | 904 | 32 | 0.019 | 0.360 | 0.037 | 0.119 | 10.0 |
| **D-6** | SMAP | 7,884 | 1 | 80 | 0 | 7804 | 0 | 0.010 | 1.000 | 0.020 | 1.000 | 0.0 |
| **D-7** | SMAP | 7,642 | 1 | 2701 | 0 | 4941 | 0 | 0.353 | 1.000 | 0.522 | 1.000 | 0.0 |
| **D-8** | SMAP | 7,874 | 1 | 50 | 0 | 7824 | 0 | 0.006 | 1.000 | 0.013 | 1.000 | 0.0 |
| **D-9** | SMAP | 7,406 | 1 | 1155 | 0 | 6251 | 0 | 0.156 | 1.000 | 0.270 | 1.000 | 0.0 |
| **E-1** | SMAP | 8,516 | 2 | 294 | 5951 | 2059 | 212 | 0.125 | 0.581 | 0.206 | 0.257 | 5.0 |
| **E-10** | SMAP | 8,505 | 2 | 272 | 6311 | 1874 | 48 | 0.127 | 0.850 | 0.221 | 0.229 | 9.5 |
| **E-11** | SMAP | 8,514 | 2 | 233 | 6132 | 2089 | 60 | 0.100 | 0.795 | 0.178 | 0.254 | 4.5 |
| **E-12** | SMAP | 8,512 | 2 | 113 | 5904 | 2027 | 468 | 0.053 | 0.195 | 0.083 | 0.256 | 5.0 |
| **E-13** | SMAP | 8,640 | 3 | 69 | 6414 | 1965 | 192 | 0.034 | 0.264 | 0.060 | 0.234 | 34.67 |
| **E-2** | SMAP | 8,532 | 1 | 514 | 5289 | 1846 | 883 | 0.218 | 0.368 | 0.274 | 0.259 | 13.0 |
| **E-3** | SMAP | 8,307 | 1 | 1126 | 3123 | 1972 | 2086 | 0.363 | 0.351 | 0.357 | 0.387 | 3.0 |
| **E-4** | SMAP | 8,354 | 1 | 532 | 4474 | 1069 | 2279 | 0.332 | 0.189 | 0.241 | 0.193 | 9.0 |
| **E-5** | SMAP | 8,294 | 1 | 78 | 5911 | 2063 | 242 | 0.036 | 0.244 | 0.063 | 0.259 | 11.0 |
| **E-6** | SMAP | 8,300 | 1 | 21 | 6723 | 1512 | 44 | 0.014 | 0.323 | 0.026 | 0.184 | 1.0 |
| **E-7** | SMAP | 8,310 | 1 | 160 | 6074 | 1956 | 120 | 0.076 | 0.571 | 0.134 | 0.244 | 0.0 |
| **E-8** | SMAP | 8,532 | 1 | 335 | 6181 | 1729 | 287 | 0.162 | 0.539 | 0.249 | 0.219 | 10.0 |
| **E-9** | SMAP | 8,302 | 1 | 79 | 6458 | 1494 | 271 | 0.050 | 0.226 | 0.082 | 0.188 | 8.0 |
| **F-1** | SMAP | 8,584 | 1 | 13 | 6711 | 1773 | 87 | 0.007 | 0.130 | 0.014 | 0.209 | 10.0 |
| **F-2** | SMAP | 8,626 | 1 | 387 | 4580 | 1090 | 2569 | 0.262 | 0.131 | 0.175 | 0.192 | 7.0 |
| **F-3** | SMAP | 8,376 | 1 | 40 | 0 | 8336 | 0 | 0.005 | 1.000 | 0.010 | 1.000 | 0.0 |
| **F-4** | MSL | 3,422 | 1 | 60 | 2567 | 785 | 10 | 0.071 | 0.857 | 0.131 | 0.234 | 1.0 |
| **F-5** | MSL | 3,922 | 1 | 96 | 3500 | 272 | 54 | 0.261 | 0.640 | 0.371 | 0.072 | 26.0 |
| **F-7** | MSL | 5,054 | 3 | 288 | 3219 | 1415 | 132 | 0.169 | 0.686 | 0.271 | 0.305 | 10.67 |
| **F-8** | MSL | 2,487 | 1 | 105 | 1744 | 207 | 431 | 0.337 | 0.196 | 0.248 | 0.106 | 1.0 |
| **G-1** | SMAP | 8,469 | 1 | 2 | 7231 | 1118 | 118 | 0.002 | 0.017 | 0.003 | 0.134 | 101.0 |
| **G-2** | SMAP | 7,361 | 1 | 40 | 0 | 7321 | 0 | 0.005 | 1.000 | 0.011 | 1.000 | 0.0 |
| **G-3** | SMAP | 7,907 | 1 | 5 | 7857 | 0 | 45 | 1.000 | 0.100 | 0.182 | 0.000 | 12.0 |
| **G-4** | SMAP | 7,632 | 1 | 9 | 5193 | 2409 | 21 | 0.004 | 0.300 | 0.007 | 0.317 | 16.0 |
| **G-6** | SMAP | 8,640 | 1 | 100 | 0 | 8540 | 0 | 0.012 | 1.000 | 0.023 | 1.000 | 0.0 |
| **G-7** | SMAP | 8,029 | 3 | 139 | 7573 | 191 | 126 | 0.421 | 0.524 | 0.467 | 0.025 | 24.33 |
| **M-1** | MSL | 2,277 | 1 | 125 | 635 | 502 | 1015 | 0.199 | 0.110 | 0.141 | 0.442 | 0.0 |
| **M-2** | MSL | 2,277 | 1 | 830 | 841 | 296 | 310 | 0.737 | 0.728 | 0.733 | 0.260 | 0.0 |
| **M-3** | MSL | 2,127 | 1 | 130 | 1092 | 785 | 120 | 0.142 | 0.520 | 0.223 | 0.418 | 2.0 |
| **M-4** | MSL | 2,038 | 1 | 133 | 1086 | 702 | 117 | 0.159 | 0.532 | 0.245 | 0.393 | 7.0 |
| **M-5** | MSL | 2,303 | 1 | 55 | 1488 | 515 | 245 | 0.097 | 0.183 | 0.126 | 0.257 | 39.0 |
| **M-6** | MSL | 2,049 | 1 | 180 | 0 | 1869 | 0 | 0.088 | 1.000 | 0.161 | 1.000 | 0.0 |
| **M-7** | MSL | 2,156 | 1 | 54 | 2038 | 18 | 46 | 0.750 | 0.540 | 0.628 | 0.009 | 14.0 |
| **P-1** | SMAP | 8,505 | 3 | 109 | 6256 | 1501 | 639 | 0.068 | 0.146 | 0.092 | 0.194 | 21.0 |
| **P-10** | MSL | 6,100 | 1 | 104 | 4228 | 1742 | 26 | 0.056 | 0.800 | 0.105 | 0.292 | 3.0 |
| **P-11** | MSL | 3,535 | 2 | 190 | 2702 | 607 | 36 | 0.238 | 0.841 | 0.371 | 0.183 | 1.0 |
| **P-14** | MSL | 6,100 | 1 | 180 | 0 | 5920 | 0 | 0.029 | 1.000 | 0.057 | 1.000 | 0.0 |
| **P-15** | MSL | 2,856 | 1 | 14 | 469 | 2367 | 6 | 0.006 | 0.700 | 0.012 | 0.835 | 1.0 |
| **P-2** | SMAP | 8,209 | 2 | 1246 | 3452 | 3482 | 29 | 0.264 | 0.977 | 0.415 | 0.502 | 0.5 |
| **P-3** | SMAP | 8,493 | 1 | 647 | 7157 | 1 | 688 | 0.999 | 0.485 | 0.652 | 0.000 | 14.0 |
| **P-4** | SMAP | 7,783 | 3 | 440 | 0 | 7343 | 0 | 0.057 | 1.000 | 0.107 | 1.000 | 0.0 |
| **P-7** | SMAP | 8,071 | 1 | 1195 | 5615 | 806 | 455 | 0.597 | 0.724 | 0.655 | 0.126 | 0.0 |
| **R-1** | SMAP | 7,244 | 1 | 80 | 0 | 7164 | 0 | 0.011 | 1.000 | 0.022 | 1.000 | 0.0 |
| **S-1** | SMAP | 7,331 | 1 | 121 | 4669 | 2215 | 326 | 0.052 | 0.271 | 0.087 | 0.322 | 0.0 |
| **S-2** | MSL | 1,827 | 1 | 10 | 0 | 1817 | 0 | 0.005 | 1.000 | 0.011 | 1.000 | 0.0 |
| **T-1** | SMAP | 8,612 | 2 | 468 | 4861 | 2217 | 1066 | 0.174 | 0.305 | 0.222 | 0.313 | 4.0 |
| **T-10** | MSL | 670 | 0 | 0 | 552 | 118 | 0 | 0.000 | 0.000 | 0.000 | 0.176 | N/A |
| **T-12** | MSL | 2,430 | 1 | 24 | 2196 | 114 | 96 | 0.174 | 0.200 | 0.186 | 0.049 | 22.0 |
| **T-13** | MSL | 2,430 | 2 | 250 | 0 | 2180 | 0 | 0.103 | 1.000 | 0.187 | 1.000 | 0.0 |
| **T-2** | SMAP | 8,625 | 1 | 541 | 4609 | 2232 | 1243 | 0.195 | 0.303 | 0.237 | 0.326 | 0.0 |
| **T-3** | SMAP | 8,579 | 2 | 72 | 4941 | 3456 | 110 | 0.020 | 0.396 | 0.039 | 0.412 | 2.5 |
| **T-4** | MSL | 2,217 | 1 | 24 | 1548 | 601 | 44 | 0.038 | 0.353 | 0.069 | 0.280 | 24.0 |
| **T-5** | MSL | 2,218 | 1 | 25 | 0 | 2193 | 0 | 0.011 | 1.000 | 0.022 | 1.000 | 0.0 |
| **T-8** | MSL | 1,519 | 2 | 30 | 1326 | 93 | 70 | 0.244 | 0.300 | 0.269 | 0.066 | 6.0 |
| **T-9** | MSL | 1,096 | 2 | 51 | 974 | 12 | 59 | 0.809 | 0.464 | 0.590 | 0.012 | 11.0 |

---

## 5. Limitations & Engineering Discussion

1. **Continuous Normalization:** Public signals are pre-scaled in $[-1.0, 1.0]$. The absolute magnitude of physical faults (e.g. Volts or °C) is concealed.
2. **Sampling Intervals:** Sampling rates in raw arrays are indexed in sequential timesteps. Without published telemetry timestamps per channel, converting latency into seconds/minutes is omitted to avoid fabrication.
3. **Unsupervised Contamination:** `IsolationForest` operates unsupervised (`contamination='auto'`). Threshold tuning against validation sets can further improve point-level precision on high-noise channels.

---

## 6. Reproducibility & Artifact Manifest

* **Evaluation Script:** `satshield_ml/data/benchmark_public_dataset.py`
* **Results Data:** `satshield_ml/data/public/public_benchmark_results.json`
* **Dataset Source:** `satshield_ml/data/public/` (82 train / 82 test `.npy` files + `labeled_anomalies.csv`)
* **Production Integrity:** The production IsolationForest model (`satshield_ml/models/isolation_forest.joblib`) was 100% untouched.