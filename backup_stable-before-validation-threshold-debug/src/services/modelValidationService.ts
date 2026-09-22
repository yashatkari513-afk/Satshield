/**
 * SATSHIELD AI — Model Validation & Performance Metrics Pipeline
 * 
 * Provides an honest, mathematically rigorous validation pipeline for the SATSHIELD
 * Anomaly Detection Engine. Evaluates actual anomaly detection inferences against
 * a structured, labeled benchmark dataset.
 * 
 * Features:
 * - Deterministic synthetic validation dataset labeled as "SIMULATED VALIDATION DATA".
 * - Evaluates the real in-system AnomalyDetector engine.
 * - Honest, un-fabricated confusion matrix & statistical metrics (TP, TN, FP, FN, Precision,
 *   Recall, F1, Accuracy, FPR, FNR, Latency, Throughput).
 * - Safe division-by-zero handling.
 * - Subsystem-level performance breakdown.
 * - Interactive threshold sensitivity analysis.
 */

import {
  defaultAnomalyDetectionService,
  detectTelemetryAnomaly,
  TelemetryFrameInput,
  AnomalyDetectionOutput,
  SubsystemCategory,
} from './anomalyDetectionService';

// ============================================================================
// Types & Contracts
// ============================================================================

export type GroundTruthClass = 'NORMAL' | 'ANOMALY';

export interface ValidationSample {
  id: string;
  sequence: number;
  satelliteId: string;
  satelliteName: string;
  timestamp: string;
  telemetry: TelemetryFrameInput;
  groundTruthLabel: GroundTruthClass;
  groundTruthIsAnomaly: boolean;
  expectedSubsystem: SubsystemCategory | 'NOMINAL';
  anomalyType: string;
  description: string;
  datasetTag: 'SIMULATED VALIDATION DATA';
}

export interface SampleEvaluationResult {
  sample: ValidationSample;
  prediction: AnomalyDetectionOutput;
  predictedIsAnomaly: boolean;
  classificationCategory: 'TP' | 'TN' | 'FP' | 'FN';
  latencyMs: number;
  thresholdApplied: number;
}

export interface ConfusionMatrix {
  truePositives: number;   // TP: Actually Anomaly, Predicted Anomaly
  trueNegatives: number;   // TN: Actually Normal, Predicted Normal
  falsePositives: number;  // FP: Actually Normal, Predicted Anomaly (False Alarm)
  falseNegatives: number;  // FN: Actually Anomaly, Predicted Normal (Missed Anomaly)
}

export interface SubsystemValidationSummary {
  subsystem: SubsystemCategory;
  totalSamples: number;
  anomalySamples: number;
  correctlyDetected: number;
  missed: number;
  accuracy: number;
  recall: number;
}

export interface LatencyMetrics {
  totalExecutionTimeMs: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  throughputSamplesPerSec: number;
}

export interface ThresholdSweepPoint {
  threshold: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  falsePositiveRate: number;
}

export interface ValidationReport {
  datasetTag: 'SIMULATED VALIDATION DATA';
  datasetName: string;
  evaluatedEngine: string;
  evaluatedAt: string;
  totalSamples: number;
  normalSamples: number;
  anomalySamples: number;
  detectionThreshold: number;
  confusionMatrix: ConfusionMatrix;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  detectionRate: number;
  f1Score: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  dataQuality: 'GOOD' | 'LIMITED' | 'INSUFFICIENT';
  correctlyDetectedAnomalies: number;
  missedAnomalies: number;
  falseAlarms: number;
  meanAnomalyScoreNormal: number;
  meanAnomalyScoreAnomaly: number;
  latency: LatencyMetrics;
  subsystemBreakdown: SubsystemValidationSummary[];
  thresholdSweep: ThresholdSweepPoint[];
  sampleDetails: SampleEvaluationResult[];
}

// ============================================================================
// Labeled Deterministic Validation Benchmark Dataset
// Tagged explicitly as "SIMULATED VALIDATION DATA"
// ============================================================================

export function generateValidationDataset(): ValidationSample[] {
  const dataset: ValidationSample[] = [];
  let seq = 1;

  // ── 1. NOMINAL FRAMES (Normal Operation across various orbital phases) ──
  // 120 normal frames with realistic physical variations (day/night, high/low charge, comm passes)
  const nominalConfigs = [
    { desc: 'LEO Sunlit Orbit Peak Power', v: 28.6, c: 6.2, p: 720, b: 92, t: 22.4, sig: -74, pl: 0.1, r: 0.2, pt: -0.1, y: 0.4 },
    { desc: 'LEO Eclipse Entry Normal', v: 27.8, c: 14.5, p: 0, b: 84, t: 16.2, sig: -78, pl: 0.2, r: -0.3, pt: 0.2, y: -0.1 },
    { desc: 'LEO Eclipse Midpoint Battery Draw', v: 26.9, c: 18.2, p: 0, b: 72, t: 12.8, sig: -80, pl: 0.4, r: 0.1, pt: 0.4, y: 0.2 },
    { desc: 'LEO Eclipse Exit Sun Acquisition', v: 28.2, c: 8.4, p: 580, b: 68, t: 18.5, sig: -76, pl: 0.1, r: 0.5, pt: -0.4, y: -0.3 },
    { desc: 'GEO Stationkeeping Normal', v: 29.1, c: 5.8, p: 890, b: 96, t: 24.1, sig: -72, pl: 0.0, r: -0.1, pt: 0.1, y: 0.1 },
    { desc: 'Ground Station Downlink Pass Peak SNR', v: 28.4, c: 11.2, p: 680, b: 88, t: 26.3, sig: -64, pl: 0.0, r: 0.0, pt: 0.0, y: 0.0 },
  ];

  for (let i = 0; i < 20; i++) {
    for (const cfg of nominalConfigs) {
      // Deterministic slight jitter using sequence index
      const jitterV = Math.sin(seq * 0.7) * 0.35;
      const jitterT = Math.cos(seq * 0.5) * 1.2;
      const jitterSig = Math.sin(seq * 1.1) * 2.0;
      const jitterB = ((seq % 5) - 2) * 1.5;

      dataset.push({
        id: `VAL-NORM-${String(seq).padStart(4, '0')}`,
        sequence: seq,
        satelliteId: seq % 2 === 0 ? 'SAT-001' : 'SAT-002',
        satelliteName: seq % 2 === 0 ? 'AGIS-3' : 'KESTREL-4',
        timestamp: new Date(1773000000000 + seq * 10000).toISOString(),
        telemetry: {
          satelliteId: seq % 2 === 0 ? 'SAT-001' : 'SAT-002',
          satelliteName: seq % 2 === 0 ? 'AGIS-3' : 'KESTREL-4',
          voltage: Number((cfg.v + jitterV).toFixed(2)),
          current: Number((cfg.c + Math.abs(jitterV) * 0.5).toFixed(2)),
          powerGeneration: Number((cfg.p > 0 ? cfg.p + jitterV * 20 : 0).toFixed(1)),
          batteryLevel: Number(Math.max(45, Math.min(100, cfg.b + jitterB)).toFixed(1)),
          temperature: Number((cfg.t + jitterT).toFixed(1)),
          communicationSignal: Number((cfg.sig + jitterSig).toFixed(1)),
          packetLoss: Number(Math.max(0, cfg.pl + Math.abs(jitterV) * 0.2).toFixed(2)),
          roll: Number((cfg.r + Math.sin(seq) * 0.4).toFixed(2)),
          pitch: Number((cfg.pt + Math.cos(seq) * 0.4).toFixed(2)),
          yaw: Number((cfg.y + Math.sin(seq * 0.3) * 0.4).toFixed(2)),
        },
        groundTruthLabel: 'NORMAL',
        groundTruthIsAnomaly: false,
        expectedSubsystem: 'NOMINAL',
        anomalyType: 'NOMINAL',
        description: `Nominal baseline: ${cfg.desc}`,
        datasetTag: 'SIMULATED VALIDATION DATA',
      });
      seq++;
    }
  }

  // ── 2. ANOMALOUS FRAMES ACROSS ALL RECOGNIZED SUBSYSTEMS ──

  // Subsystem A: Battery Degradation & Capacity Loss (16 samples)
  const batteryAnomalies = [
    { v: 23.4, c: 19.5, b: 34.0, t: 29.5, desc: 'Battery capacity severe fade during eclipse' },
    { v: 22.8, c: 22.0, b: 28.5, t: 31.0, desc: 'Critical undervoltage below 23.0V threshold' },
    { v: 22.2, c: 24.5, b: 19.0, t: 33.2, desc: 'Deep discharge state below critical 20% limit' },
    { v: 21.8, c: 26.0, b: 14.5, t: 36.4, desc: 'Battery thermal runaway and collapse' },
  ];
  for (let rep = 0; rep < 4; rep++) {
    for (const ba of batteryAnomalies) {
      dataset.push({
        id: `VAL-ANOM-BAT-${String(seq).padStart(4, '0')}`,
        sequence: seq,
        satelliteId: 'SAT-002',
        satelliteName: 'KESTREL-4',
        timestamp: new Date(1773000000000 + seq * 10000).toISOString(),
        telemetry: {
          satelliteId: 'SAT-002',
          satelliteName: 'KESTREL-4',
          voltage: Number((ba.v + (rep * 0.1 - 0.15)).toFixed(2)),
          current: Number((ba.c + rep * 0.4).toFixed(2)),
          powerGeneration: 0,
          batteryLevel: Number((ba.b - rep * 1.5).toFixed(1)),
          temperature: Number((ba.t + rep * 0.8).toFixed(1)),
          communicationSignal: -82.0,
          packetLoss: 0.3,
          roll: 0.1,
          pitch: -0.2,
          yaw: 0.0,
        },
        groundTruthLabel: 'ANOMALY',
        groundTruthIsAnomaly: true,
        expectedSubsystem: 'BATTERY',
        anomalyType: 'BATTERY_DEGRADATION',
        description: `Injected anomaly: ${ba.desc}`,
        datasetTag: 'SIMULATED VALIDATION DATA',
      });
      seq++;
    }
  }

  // Subsystem B: Thermal Overheating & Radiator Blockage (16 samples)
  const thermalAnomalies = [
    { t: 45.2, v: 28.2, c: 7.0, desc: 'Thermal threshold warning exceeded (>42°C)' },
    { t: 52.8, v: 28.0, c: 7.2, desc: 'Sustained payload overheating (>50°C)' },
    { t: 59.4, v: 27.8, c: 7.8, desc: 'Critical thermal envelope breach (>55°C)' },
    { t: 64.1, v: 27.4, c: 8.5, desc: 'Avionics thermal limit excursion' },
  ];
  for (let rep = 0; rep < 4; rep++) {
    for (const ta of thermalAnomalies) {
      dataset.push({
        id: `VAL-ANOM-THM-${String(seq).padStart(4, '0')}`,
        sequence: seq,
        satelliteId: 'SAT-003',
        satelliteName: 'SAR-POLAR-1',
        timestamp: new Date(1773000000000 + seq * 10000).toISOString(),
        telemetry: {
          satelliteId: 'SAT-003',
          satelliteName: 'SAR-POLAR-1',
          voltage: ta.v,
          current: ta.c,
          powerGeneration: 620,
          batteryLevel: 86,
          temperature: Number((ta.t + rep * 1.1).toFixed(1)),
          communicationSignal: -79.0,
          packetLoss: 0.2,
          roll: 0.3,
          pitch: 0.1,
          yaw: -0.2,
        },
        groundTruthLabel: 'ANOMALY',
        groundTruthIsAnomaly: true,
        expectedSubsystem: 'THERMAL',
        anomalyType: 'THERMAL_OVERHEATING',
        description: `Injected anomaly: ${ta.desc}`,
        datasetTag: 'SIMULATED VALIDATION DATA',
      });
      seq++;
    }
  }

  // Subsystem C: Power EPS Solar Array Collapse / Shunt Fault (16 samples)
  const powerAnomalies = [
    { p: 210, v: 24.8, c: 4.1, desc: 'Solar array tracking misalignment (power <300W)' },
    { p: 120, v: 23.6, c: 2.8, desc: 'Solar array partial occlusion (<150W)' },
    { p: 45, v: 23.1, c: 1.2, desc: 'Solar power failure & PDU current sag' },
    { p: 10, v: 22.5, c: 0.8, desc: 'Complete main bus power loss' },
  ];
  for (let rep = 0; rep < 4; rep++) {
    for (const pa of powerAnomalies) {
      dataset.push({
        id: `VAL-ANOM-PWR-${String(seq).padStart(4, '0')}`,
        sequence: seq,
        satelliteId: 'SAT-001',
        satelliteName: 'AGIS-3',
        timestamp: new Date(1773000000000 + seq * 10000).toISOString(),
        telemetry: {
          satelliteId: 'SAT-001',
          satelliteName: 'AGIS-3',
          voltage: pa.v,
          current: pa.c,
          powerGeneration: Number((pa.p + rep * 5).toFixed(1)),
          batteryLevel: 55 - rep * 3,
          temperature: 19.5,
          communicationSignal: -83.0,
          packetLoss: 0.4,
          roll: 0.0,
          pitch: 0.0,
          yaw: 0.0,
        },
        groundTruthLabel: 'ANOMALY',
        groundTruthIsAnomaly: true,
        expectedSubsystem: 'POWER',
        anomalyType: 'POWER_EPS_ANOMALY',
        description: `Injected anomaly: ${pa.desc}`,
        datasetTag: 'SIMULATED VALIDATION DATA',
      });
      seq++;
    }
  }

  // Subsystem D: Communication Signal Fade & Packet Loss Surge (16 samples)
  const commAnomalies = [
    { sig: -102.0, pl: 4.8, desc: 'Carrier signal degradation below -95dBm' },
    { sig: -112.5, pl: 9.6, desc: 'RF signal loss below critical -110dBm & packet drop' },
    { sig: -118.0, pl: 18.5, desc: 'Severe downlink fade with 18% packet drop' },
    { sig: -126.0, pl: 34.0, desc: 'Transponder blackout and telemetry starvation' },
  ];
  for (let rep = 0; rep < 4; rep++) {
    for (const ca of commAnomalies) {
      dataset.push({
        id: `VAL-ANOM-COM-${String(seq).padStart(4, '0')}`,
        sequence: seq,
        satelliteId: 'SAT-004',
        satelliteName: 'NAV-SAT-9',
        timestamp: new Date(1773000000000 + seq * 10000).toISOString(),
        telemetry: {
          satelliteId: 'SAT-004',
          satelliteName: 'NAV-SAT-9',
          voltage: 28.4,
          current: 6.8,
          powerGeneration: 710,
          batteryLevel: 90,
          temperature: 23.0,
          communicationSignal: Number((ca.sig - rep * 1.5).toFixed(1)),
          packetLoss: Number((ca.pl + rep * 2.0).toFixed(2)),
          roll: 0.2,
          pitch: -0.1,
          yaw: 0.3,
        },
        groundTruthLabel: 'ANOMALY',
        groundTruthIsAnomaly: true,
        expectedSubsystem: 'COMMUNICATION',
        anomalyType: 'COMMUNICATION_ANOMALY',
        description: `Injected anomaly: ${ca.desc}`,
        datasetTag: 'SIMULATED VALIDATION DATA',
      });
      seq++;
    }
  }

  // Subsystem E: Attitude & Orbital Control Instability (16 samples)
  const attitudeAnomalies = [
    { r: 8.5, pt: 6.2, y: 1.1, desc: 'Attitude angle deviation beyond ±5° operational envelope' },
    { r: 16.8, pt: 12.4, y: 5.8, desc: 'Reaction wheel saturation causing pointing drift' },
    { r: 24.2, pt: -18.5, y: 14.1, desc: 'Severe multi-axis pointing tumble (>15° critical)' },
    { r: 32.0, pt: 26.0, y: -22.0, desc: 'Loss of 3-axis stabilization' },
  ];
  for (let rep = 0; rep < 4; rep++) {
    for (const aa of attitudeAnomalies) {
      dataset.push({
        id: `VAL-ANOM-ATT-${String(seq).padStart(4, '0')}`,
        sequence: seq,
        satelliteId: 'SAT-002',
        satelliteName: 'KESTREL-4',
        timestamp: new Date(1773000000000 + seq * 10000).toISOString(),
        telemetry: {
          satelliteId: 'SAT-002',
          satelliteName: 'KESTREL-4',
          voltage: 28.2,
          current: 12.4, // Reaction wheels draw more power when desaturating
          powerGeneration: 540,
          batteryLevel: 80,
          temperature: 26.5,
          communicationSignal: -88.0,
          packetLoss: 0.8,
          roll: Number((aa.r + rep * 0.8).toFixed(2)),
          pitch: Number((aa.pt + rep * 0.6).toFixed(2)),
          yaw: Number((aa.y + rep * 0.5).toFixed(2)),
        },
        groundTruthLabel: 'ANOMALY',
        groundTruthIsAnomaly: true,
        expectedSubsystem: 'ATTITUDE',
        anomalyType: 'ATTITUDE_INSTABILITY',
        description: `Injected anomaly: ${aa.desc}`,
        datasetTag: 'SIMULATED VALIDATION DATA',
      });
      seq++;
    }
  }

  // Subsystem F: Sensor Drift & Measurement Spikes (8 samples)
  const sensorAnomalies = [
    { c: 46.5, pl: 0.1, desc: 'Current sensor transient spike (>45A critical max)' },
    { c: 52.0, pl: 0.2, desc: 'Sensor calibration bias drift beyond 3.5 sigma' },
  ];
  for (let rep = 0; rep < 4; rep++) {
    for (const sa of sensorAnomalies) {
      dataset.push({
        id: `VAL-ANOM-SNS-${String(seq).padStart(4, '0')}`,
        sequence: seq,
        satelliteId: 'SAT-001',
        satelliteName: 'AGIS-3',
        timestamp: new Date(1773000000000 + seq * 10000).toISOString(),
        telemetry: {
          satelliteId: 'SAT-001',
          satelliteName: 'AGIS-3',
          voltage: 28.5,
          current: Number((sa.c + rep * 1.5).toFixed(1)),
          powerGeneration: 670,
          batteryLevel: 89,
          temperature: 22.0,
          communicationSignal: -76.0,
          packetLoss: sa.pl,
          roll: 0.0,
          pitch: 0.0,
          yaw: 0.0,
        },
        groundTruthLabel: 'ANOMALY',
        groundTruthIsAnomaly: true,
        expectedSubsystem: 'SENSOR',
        anomalyType: 'SENSOR_DRIFT_SPIKE',
        description: `Injected anomaly: ${sa.desc}`,
        datasetTag: 'SIMULATED VALIDATION DATA',
      });
      seq++;
    }
  }

  return dataset;
}

// ============================================================================
// Real Quantitative Validation Pipeline Runner
// ============================================================================

export interface ValidationRunnerOptions {
  threshold?: number;               // Anomaly score decision threshold (e.g., 0.35)
  dataset?: ValidationSample[];     // Optional custom labeled dataset
}

/**
 * Runs deterministic validation by feeding every frame through SATSHIELD's
 * active AnomalyDetector engine and comparing prediction with ground truth.
 */
export function runModelValidation(options?: ValidationRunnerOptions): ValidationReport {
  const threshold = options?.threshold !== undefined ? options.threshold : 0.35;
  const dataset = options?.dataset || generateValidationDataset();

  const startTime = performance.now();
  const sampleDetails: SampleEvaluationResult[] = [];
  const latencies: number[] = [];

  const scoresNormal: number[] = [];
  const scoresAnomaly: number[] = [];

  // Track confusion matrix counts
  let tp = 0; // True Positive: Actual Anomaly -> Predicted Anomaly
  let tn = 0; // True Negative: Actual Normal  -> Predicted Normal
  let fp = 0; // False Positive: Actual Normal -> Predicted Anomaly (False Alarm)
  let fn = 0; // False Negative: Actual Anomaly -> Predicted Normal (Missed)

  // Track subsystem statistics
  const subsystemStats: Record<
    SubsystemCategory,
    { total: number; anomaly: number; correct: number; missed: number }
  > = {
    POWER: { total: 0, anomaly: 0, correct: 0, missed: 0 },
    BATTERY: { total: 0, anomaly: 0, correct: 0, missed: 0 },
    THERMAL: { total: 0, anomaly: 0, correct: 0, missed: 0 },
    COMMUNICATION: { total: 0, anomaly: 0, correct: 0, missed: 0 },
    ATTITUDE: { total: 0, anomaly: 0, correct: 0, missed: 0 },
    SENSOR: { total: 0, anomaly: 0, correct: 0, missed: 0 },
    OBC: { total: 0, anomaly: 0, correct: 0, missed: 0 },
    PAYLOAD: { total: 0, anomaly: 0, correct: 0, missed: 0 },
  };

  // Evaluate each sample individually through the actual detector
  for (const sample of dataset) {
    const t0 = performance.now();
    
    // Execute actual SATSHIELD anomaly detector
    const detectionOutput = detectTelemetryAnomaly(sample.telemetry);
    
    const t1 = performance.now();
    const latency = Number((t1 - t0).toFixed(4));
    latencies.push(latency);

    // Apply decision threshold: An anomaly is predicted if score >= threshold or detector signaled anomaly
    const predictedIsAnomaly = detectionOutput.anomalyScore >= threshold || detectionOutput.isAnomaly;
    const actualIsAnomaly = sample.groundTruthIsAnomaly;

    if (actualIsAnomaly) {
      scoresAnomaly.push(detectionOutput.anomalyScore);
    } else {
      scoresNormal.push(detectionOutput.anomalyScore);
    }

    let category: 'TP' | 'TN' | 'FP' | 'FN';

    if (actualIsAnomaly && predictedIsAnomaly) {
      tp++;
      category = 'TP';
    } else if (!actualIsAnomaly && !predictedIsAnomaly) {
      tn++;
      category = 'TN';
    } else if (!actualIsAnomaly && predictedIsAnomaly) {
      fp++;
      category = 'FP';
    } else {
      fn++;
      category = 'FN';
    }

    // Record subsystem stats
    if (sample.expectedSubsystem !== 'NOMINAL' && subsystemStats[sample.expectedSubsystem]) {
      const stats = subsystemStats[sample.expectedSubsystem];
      stats.total++;
      if (actualIsAnomaly) {
        stats.anomaly++;
        if (predictedIsAnomaly) {
          stats.correct++;
        } else {
          stats.missed++;
        }
      }
    }

    sampleDetails.push({
      sample,
      prediction: detectionOutput,
      predictedIsAnomaly,
      classificationCategory: category,
      latencyMs: latency,
      thresholdApplied: threshold,
    });
  }

  const endTime = performance.now();
  const totalExecutionTimeMs = Number((endTime - startTime).toFixed(2));

  // Compute Standard Mathematical Metrics with safe zero-division handling
  const totalSamples = dataset.length;
  const normalSamples = dataset.filter((s) => !s.groundTruthIsAnomaly).length;
  const anomalySamples = dataset.filter((s) => s.groundTruthIsAnomaly).length;

  const accuracy = totalSamples > 0 ? (tp + tn) / totalSamples : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0; // True Positive Rate (Sensitivity)
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0; // True Negative Rate
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const falsePositiveRate = fp + tn > 0 ? fp / (fp + tn) : 0; // FPR = 1 - Specificity
  const falseNegativeRate = fn + tp > 0 ? fn / (fn + tp) : 0; // FNR = 1 - Recall

  const meanAnomalyScoreNormal =
    scoresNormal.length > 0
      ? Number((scoresNormal.reduce((a, b) => a + b, 0) / scoresNormal.length).toFixed(4))
      : 0;

  const meanAnomalyScoreAnomaly =
    scoresAnomaly.length > 0
      ? Number((scoresAnomaly.reduce((a, b) => a + b, 0) / scoresAnomaly.length).toFixed(4))
      : 0;

  // Latency Metrics
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  const throughput = totalExecutionTimeMs > 0 ? (totalSamples / (totalExecutionTimeMs / 1000)) : 0;

  // Subsystem Summaries
  const subsystemBreakdown: SubsystemValidationSummary[] = Object.entries(subsystemStats)
    .filter(([_, stats]) => stats.total > 0)
    .map(([sub, stats]) => ({
      subsystem: sub as SubsystemCategory,
      totalSamples: stats.total,
      anomalySamples: stats.anomaly,
      correctlyDetected: stats.correct,
      missed: stats.missed,
      accuracy: stats.total > 0 ? (stats.correct + (stats.total - stats.anomaly)) / stats.total : 0,
      recall: stats.anomaly > 0 ? stats.correct / stats.anomaly : 0,
    }));

  // Calculate Threshold Sweep for Sensitivity / ROC Analysis (from 0.10 to 0.90)
  const thresholdSweep: ThresholdSweepPoint[] = [];
  const sweepThresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  for (const sw of sweepThresholds) {
    let sw_tp = 0;
    let sw_tn = 0;
    let sw_fp = 0;
    let sw_fn = 0;

    for (const item of sampleDetails) {
      const pred = item.prediction.anomalyScore >= sw;
      const actual = item.sample.groundTruthIsAnomaly;
      if (actual && pred) sw_tp++;
      else if (!actual && !pred) sw_tn++;
      else if (!actual && pred) sw_fp++;
      else sw_fn++;
    }

    const sw_prec = sw_tp + sw_fp > 0 ? sw_tp / (sw_tp + sw_fp) : 0;
    const sw_rec = sw_tp + sw_fn > 0 ? sw_tp / (sw_tp + sw_fn) : 0;
    const sw_f1 = sw_prec + sw_rec > 0 ? (2 * sw_prec * sw_rec) / (sw_prec + sw_rec) : 0;
    const sw_acc = totalSamples > 0 ? (sw_tp + sw_tn) / totalSamples : 0;
    const sw_fpr = sw_fp + sw_tn > 0 ? sw_fp / (sw_fp + sw_tn) : 0;

    thresholdSweep.push({
      threshold: sw,
      tp: sw_tp,
      tn: sw_tn,
      fp: sw_fp,
      fn: sw_fn,
      precision: Number(sw_prec.toFixed(4)),
      recall: Number(sw_rec.toFixed(4)),
      f1Score: Number(sw_f1.toFixed(4)),
      accuracy: Number(sw_acc.toFixed(4)),
      falsePositiveRate: Number(sw_fpr.toFixed(4)),
    });
  }

  return {
    datasetTag: 'SIMULATED VALIDATION DATA',
    datasetName: `Deterministic Multi-Subsystem Telemetry Benchmark (${totalSamples} Samples)`,
    evaluatedEngine: 'SATSHIELD Deterministic Baseline & Statistical Z-Score Detector',
    evaluatedAt: new Date().toISOString(),
    totalSamples,
    normalSamples,
    anomalySamples,
    detectionThreshold: threshold,
    confusionMatrix: {
      truePositives: tp,
      trueNegatives: tn,
      falsePositives: fp,
      falseNegatives: fn,
    },
    accuracy: Number(accuracy.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    specificity: Number(specificity.toFixed(4)),
    detectionRate: Number(recall.toFixed(4)),
    f1Score: Number(f1Score.toFixed(4)),
    falsePositiveRate: Number(falsePositiveRate.toFixed(4)),
    falseNegativeRate: Number(falseNegativeRate.toFixed(4)),
    dataQuality: 'GOOD',
    correctlyDetectedAnomalies: tp,
    missedAnomalies: fn,
    falseAlarms: fp,
    meanAnomalyScoreNormal,
    meanAnomalyScoreAnomaly,
    latency: {
      totalExecutionTimeMs,
      averageLatencyMs: Number(avgLatency.toFixed(3)),
      minLatencyMs: Number(minLatency.toFixed(3)),
      maxLatencyMs: Number(maxLatency.toFixed(3)),
      throughputSamplesPerSec: Number(throughput.toFixed(1)),
    },
    subsystemBreakdown,
    thresholdSweep,
    sampleDetails,
  };
}
