# SATSHIELD AI — Developer Architecture & SIH Technical Guide

> **AI-Powered Autonomous Satellite Fleet Health Monitoring, Anomaly Detection & Predictive Maintenance System**  
> Built for Smart India Hackathon (SIH) Mission Operations & Aerospace Defense.

---

## 1. Project Architecture Overview

SATSHIELD AI operates as a dual-layer, high-availability aerospace telemetry monitoring system:

```
┌────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND LAYER                             │
│       React 18 + Vite + TypeScript + TailwindCSS + Three.js 3D        │
│  - Real-time HUD Dashboard & 3D Earth Constellation Visualization      │
│  - Multi-Subsystem Health Monitoring (7 Subsystems)                   │
│  - Modular AI Diagnosis & Early Risk Prediction Panels                │
│  - Dynamic Satellite Registration & Automated Technical Report Center │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / Proxy (/api)
┌───────────────────────────────────▼────────────────────────────────────┐
│                             BACKEND LAYER                              │
│                    FastAPI (Python 3.10+) Engine                       │
│  - Scikit-Learn Isolation Forest Real ML Anomaly Inference Engine     │
│  - Real-Time Temporal Telemetry Trend Analyzer (dX/dt, Z-Score)       │
│  - Explainable 7-Subsystem Health Scoring & Mathematical Penalty Model │
│  - SQLite Multi-Asset Telemetry & PDF Report Generation & Dispatch     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SQLite ORM / File Storage
┌───────────────────────────────────▼────────────────────────────────────┐
│                             DATABASE LAYER                             │
│                           SQLite Database                              │
│  - satellites, telemetry_records, reports, organizations, contacts    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Structure (`/src`)

- **`src/types/telemetry.ts`**: Unified TypeScript data models for Satellites, 7 Subsystems, Alerts, Command Logs, Ground Stations, `StructuredAnomaly`, `CleanSatelliteModel`, and `ExplainableHealthAssessment`.
- **`src/services/`**:
  - `AIPipelineService.ts`: 10-stage modular AI/ML pipeline (Preprocessing -> Feature Extraction -> ML Inference -> Anomaly Scoring -> Classification -> Health Assessment -> Early Failure Prediction -> Root Cause -> Mitigation Action).
  - `mlAnomalyService.ts`: Real ML client connecting to FastAPI `/api/anomaly/detect` and `/api/anomaly/predict`.
  - `SatelliteService.ts`: Multi-satellite dynamic fleet management with local storage resilience and backend syncing.
  - `TelemetryService.ts`: Real-time telemetry generator, orbital physics kinematics, and command execution.
  - `AudioService.ts`: Web Audio API synthetic telemetry beeps, warning chimes, and critical alarms.
  - `ReportService.ts`: Client-side structured technical report generator.
- **`src/context/`**:
  - `TelemetryContext.tsx`: Manages active satellite state, 7 subsystem metrics, orbit position timers, alert acknowledgments, and audio configurations.
  - `SimulationContext.tsx`: Manages interactive simulation flows, dynamic satellite addition, modal controls, and real ML inference triggers.
- **`src/components/dashboard/`**:
  - `DashboardHeader.tsx`: Top status bar, live connection indicator, dynamic search with ⌘K, and notification bell.
  - `ConstellationOverviewPanel.tsx`: 3D Earth globe with orbital tracks and satellite list overlay.
  - `FleetHealthPanel.tsx`: Fleet-wide health distribution chart, health trends, and subsystem statuses.
  - `ActiveAlertsPanel.tsx`: Real-time active alerts list with severity badges and inspection modals.
  - `RealtimeTelemetryPanel.tsx`: Live telemetry gauges and historical trend charts for Power, Thermal, AOCS, Comm, Propulsion, Payload, and OBC.
  - `AIAnomalyPanel.tsx`: AI anomaly breakdown, confidence rating, and diagnostic launch buttons.
  - `AddSatelliteModal.tsx`: Form to dynamically add new custom satellites (INSAT, Cartosat, etc.).
  - `AIDiagnosisModal.tsx`: Detailed AI diagnosis modal with feature deviations and mitigation plans.
  - `SendReportModal.tsx`: PDF report generation and verified space agency contact email dispatch.

---

## 3. Backend Structure (`/backend`)

- **`backend/api/main.py`**: FastAPI entrypoint with CORS, health checks, satellite CRUD, telemetry ingestion, ML detection, early risk prediction, report generation, and email dispatch endpoints.
- **`backend/api/schemas.py`**: Pydantic v2 data validation schemas.
- **`backend/ml/detector.py`**: Isolation Forest ML inference engine (`SatelliteAnomalyDetector`).
- **`backend/ml/temporal_analyzer.py`**: Real time-series trend analyzer calculating slope ($dX/dt$), rolling volatility, and Z-scores (`TemporalTelemetryAnalyzer`).
- **`backend/ml/train.py`**: Isolation Forest training script generating `isolation_forest_model.joblib`.
- **`backend/services/ai_analysis_service.py`**: Explainable health score calculator across 7 subsystems and early failure predictor.
- **`backend/services/satellite_service.py`**: Multi-asset database operations.
- **`backend/services/telemetry_service.py`**: Deterministic telemetry generator and CSV/JSON parser.
- **`backend/services/report_service.py`**: Technical report compiler with PDF layout formatting.
- **`backend/services/email_service.py`**: Space agency email dispatch service.
- **`backend/db/database.py`**: SQLite database initialization and connection provider.

---

## 4. Telemetry & Subsystem Data Model

SATSHIELD AI monitors **7 spacecraft subsystems**:

1. **Power (EPS)**: `batteryCharge` (%), `batteryVoltage` (V), `batteryTemp` (°C), `solarOutput` (W), `solarEfficiency` (%), `current` (A), `powerConsumption` (W).
2. **Thermal Control (TCS)**: `internalTemp` (°C), `externalTemp` (°C), `payloadTemp` (°C), `avionicsTemp` (°C), `heaterActive` (bool), `radiatorStatus` ('Nominal' | 'Active Cooling' | 'Degraded').
3. **Attitude & Orbit Control (AOCS)**: `pitch`, `yaw`, `roll` (degrees), `rxWheelSpeedX`, `rxWheelSpeedY`, `rxWheelSpeedZ` (RPM), `gyroStatus`, `starTrackerStatus`, `altitude` (km), `inclination` (deg).
4. **Communications (TT&C)**: `signalStrength` (dBm), `snr` (dB), `uplinkRate` (Mbps), `downlinkRate` (Mbps), `antennaPointing`, `packetLoss` (%), `bitErrorRate`.
5. **Propulsion**: `fuelLevel` (%), `thrusterActive` (bool), `deltaVRemaining` (m/s), `chamberPressure` (PSI).
6. **Payload**: `operationalState`, `dataStorageUsed` (%), `solidStateDriveGB`, `sensorHealth` (optical, SAR, multispectral).
7. **On-Board Computer (OBC)**: `cpuLoad` (%), `memoryUsage` (%), `uptimeSeconds`, `rebootCount`, `watchdogState`, `softwareVersion`.

---

## 5. Explainable Health Scoring Architecture

The Health Score ($H \in [0, 100]$) is computed using weighted subsystem assessments and mathematical penalty functions:

$$H = \sum_{i=1}^{7} w_i \cdot S_i$$

### Subsystem Weights:
- **Power (EPS)**: $w_1 = 0.25$ (25%)
- **Thermal (TCS)**: $w_2 = 0.20$ (20%)
- **AOCS**: $w_3 = 0.15$ (15%)
- **Communications**: $w_4 = 0.15$ (15%)
- **Payload**: $w_5 = 0.10$ (10%)
- **OBC**: $w_6 = 0.10$ (10%)
- **Propulsion**: $w_7 = 0.05$ (5%)

### Health Classifications:
- **`EXCELLENT`** ($95 \le H \le 100$): All subsystems nominal within $\pm 1\sigma$ baseline.
- **`GOOD`** ($88 \le H < 95$): Minor transient fluctuations, all critical loops nominal.
- **`WARNING`** ($65 \le H < 88$): Parameter drift detected (e.g. battery undervoltage, thermal rise).
- **`CRITICAL`** ($H < 65$): Active anomaly with failure risk; autonomous safety actions triggered.

---

## 6. Structured Anomaly Data Model

```typescript
export interface StructuredAnomaly {
  anomalyId: string;
  satelliteId: string;
  timestamp: string;
  subsystem: 'power' | 'thermal' | 'aocs' | 'comm' | 'propulsion' | 'payload' | 'obc';
  anomalyType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  anomalyScore: number; // Isolation Forest decision score (-0.30 to +0.20)
  confidence: number;   // 0 - 100%
  affectedParameters: string[];
  explanation: string;
  probableCause: string;
  recommendedAction: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'INVESTIGATING';
}
```

---

## 7. How to Run the Project

### Prerequisites:
- Node.js 18+ & npm
- Python 3.10+ (with `pip install -r backend/requirements.txt`)

### Step 1: Start Backend (FastAPI + Real ML)
```bash
python backend/api/main.py
# Server starts at http://localhost:8000
# OpenAPI Docs: http://localhost:8000/docs
```

### Step 2: Start Frontend (React + Vite)
```bash
npm run dev
# Frontend starts at http://localhost:5173
```

### Running Automated Test Suites:
```bash
# 1. Test Isolation Forest ML Inference:
python backend/test_detector.py

# 2. Test Temporal Trend Analysis (dX/dt & Rolling Stats):
python backend/test_temporal.py

# 3. Test Early Risk Predictor:
python backend/test_prediction.py

# 4. Test Full End-to-End Workflow:
python backend/test_full_workflow.py

# 5. Build Frontend Production Bundle:
npm run build
```

---

## 8. Environment Variables Required

Create `.env` in the root directory:
```env
# Frontend API Base URL (leave blank for local Vite proxy /api)
VITE_API_BASE_URL=

# Backend Configuration (Optional)
PORT=8000
DATABASE_URL=sqlite:///backend/data/satshield.db
```

---

## 9. Known Limitations & SIH Roadmap

1. **Space Physics Orbit Modeling**: Current orbital mechanics use Keplerian 2-body circular approximations; SGP4/TLE orbital propagator integration can be attached in future releases.
2. **Deep Learning Autoencoders**: Current anomaly detection leverages Isolation Forest and Temporal Trend Analyzers. LSTM Autoencoders can be trained as a drop-in enhancement using the modular `AIPipelineService`.
3. **Hardware-in-the-Loop (HIL)**: Ground station telemetry is ingested via REST API / CSV / JSON. Serial port / CAN bus bridges can be connected to the `/api/satellites/{id}/telemetry/upload` endpoint.
