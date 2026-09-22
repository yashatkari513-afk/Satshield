# SATSHIELD Synthetic Telemetry Dataset

> **NOTICE**: This dataset contains **SYNTHETIC / DEMO** telemetry data generated specifically for AI/ML development, algorithm benchmarking, and anomaly detection testing in the SATSHIELD satellite health monitoring system. It does **not** represent classified, real-time proprietary space agency telemetry.

---

## Dataset Files
- **Raw Data**: `satellite_telemetry.csv` (6,000 raw synthetic frames)
- **Cleaned Data**: `satellite_telemetry_clean.csv` (6,000 sanitized, typed, timestamp-validated ML-ready records)
- **Feature Dataset**: `satellite_features.csv` (6,000 records, 46 total columns including 34 engineered temporal/delta/deviation/rolling features)
- **Temporal Resolution**: 60-second consecutive intervals
- **Target Distribution**:
  - `NORMAL`: Nominal operational states across monitored satellites (~75%)
  - `ANOMALY`: Multi-subsystem physical fault injections (~25%)

---

## Included Satellite Platforms
The dataset incorporates telemetry sequences mapped to SATSHIELD monitored satellites:
- `SAT-001` (AGIS-3 Comms Satellite)
- `SAT-002` (SENTINEL-9 Earth Observation)
- `SAT-003` (ORBCOM-7 Geostationary Comms)
- `SAT-004` (HELIOS-1 Imaging Satellite)
- `INSAT-3D` (Meteorological Spacecraft)
- `GSAT-30` (High-Throughput Comms)

---

## Column Schema & Physical Units

| Column Name | Data Type | Physical Unit | Description & Operational Range |
| :--- | :--- | :--- | :--- |
| **`timestamp`** | `String (ISO 8601)` | `YYYY-MM-DD HH:MM:SS` | UTC timestamp of the telemetry observation frame. |
| **`satellite_id`** | `String` | Identifier | Unique spacecraft mission registration code. |
| **`temperature_c`** | `Float` | Degrees Celsius (°C) | Core thermal sensor temperature. Nominal: 18.0°C – 35.0°C. Anomaly: >55.0°C (Overheating). |
| **`voltage_v`** | `Float` | Volts (V) | Main EPS bus regulated voltage. Nominal: 27.8V – 28.8V. Anomaly: <23.5V (Undervoltage). |
| **`current_a`** | `Float` | Amperes (A) | Total power bus electrical current draw. Nominal: 4.0A – 8.5A. Anomaly: >18.0A (Current surge). |
| **`battery_soc_percent`** | `Float` | Percentage (%) | Battery State of Charge (SoC). Nominal: 75% – 98%. Anomaly: <50% rapid degradation. |
| **`solar_power_w`** | `Float` | Watts (W) | Total photovoltaic generation. Nominal: 450W – 650W. Anomaly: <300W during sunlit phase. |
| **`communication_signal_db`** | `Float` | Decibel-milliwatts (dBm) | Downlink/uplink RF receiver signal strength. Nominal: -75 dBm to -60 dBm. Anomaly: <-100 dBm. |
| **`vibration_g`** | `Float` | G-force (g) | Micro-vibration and structural accelerometer reading. Nominal: 0.02g – 0.08g. Anomaly: >0.35g. |
| **`attitude_error_deg`** | `Float` | Degrees (°) | 3-axis pointing deviation from target vector. Nominal: 0.02° – 0.18°. Anomaly: >2.5°. |
| **`subsystem`** | `String` | Subsystem Tag | Subsystem context (`POWER`, `BATTERY`, `THERMAL`, `COMMUNICATION`, `ATTITUDE`, `PAYLOAD`). |
| **`label`** | `String` | Categorical | Ground truth classification: `NORMAL` or `ANOMALY`. |

---

## Simulated Anomaly Profiles
1. **Battery Degradation**: Accelerated capacity loss, elevated current draw, and depressed voltage.
2. **Sustained Overheating**: Temperature escalation beyond safe operational threshold (>55°C up to 88°C).
3. **Bus Undervoltage Drop**: EPS power distribution bus collapse below 23.5V critical limits.
4. **Electrical Current Surge**: Severe current spike (>18A up to 34A) representing short-circuit / load surge.
5. **Communication Link Failure**: Severe RF signal degradation (<-100 dBm up to -128 dBm).
6. **Mechanical Vibration Spike**: Structural resonance and reaction wheel jitter (>0.35g up to 1.85g).
7. **Attitude Pointing Error**: Loss of fine-pointing lock and attitude divergence (>2.5° up to 14.5°).
