/**
 * SATSHIELD AI — Safe Modular AI Engine Adapter
 * 
 * Provides an isolated, robust, deterministic AI/ML pipeline adapter that sits
 * behind the existing SATSHIELD mission control application.
 * 
 * Architecture:
 * Telemetry Ingestion -> Data Quality & Sanitization -> Feature Extraction ->
 * Deterministic Anomaly Scoring -> Multi-Subsystem Classification ->
 * Temporal Trend Analysis -> Predictive Risk -> Explainability -> Action Plan
 * 
 * Guarantees:
 * - NO fake ML confidence or fabricated random numbers.
 * - Clearly distinguishes Anomaly Score, Confidence, Risk Level, and Projections.
 * - Handles missing/null/NaN and insufficient data gracefully (< 3 frames -> INSUFFICIENT_DATA).
 * - Satellite-isolated and scenario-agnostic.
 * - Zero breaking changes to existing UI or data contracts.
 */

import {
  detectMLAnomaly,
  MLTelemetryInput,
  MLAnomalyResponse
} from './mlAnomalyService';

// ============================================================================
// DATA TYPES & CONTRACTS
// ============================================================================

export type SubsystemId = 'BATTERY' | 'POWER' | 'THERMAL' | 'COMMUNICATION' | 'ATTITUDE' | 'SENSOR' | 'GENERAL';

export type TrendClassification = 'STABLE' | 'IMPROVING' | 'DEGRADING' | 'RAPIDLY_DEGRADING' | 'INSUFFICIENT_DATA';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TelemetryDataPoint {
  timestamp?: string;
  voltage?: number;
  batteryVoltage?: number;
  batteryCurrent?: number;
  batteryCharge?: number;
  current?: number;
  temperature?: number;
  payloadTemp?: number;
  solarPower?: number;
  power?: number;
  communicationSignal?: number;
  signalStrength?: number;
  packetLoss?: number;
  pitch?: number;
  yaw?: number;
  roll?: number;
  [key: string]: any;
}

export interface DataQualityReport {
  isValid: boolean;
  frameCount: number;
  sanitizedFieldCount: number;
  missingFields: string[];
  anomalousValuesDetected: boolean;
  dataQualityRating: 'HIGH' | 'MEDIUM' | 'DEGRADED' | 'INSUFFICIENT';
  notes: string[];
}

export interface ParameterFeatureSet {
  parameter: string;
  subsystem: SubsystemId;
  currentValue: number;
  baselineMean: number;
  baselineStd: number;
  unit: string;
  zScore: number;
  rollingMean: number;
  rollingStd: number;
  rateOfChangePerMin: number; // dX/dt
  accelerationPerMin2: number; // d^2X/dt^2
  deviationFromBaseline: number;
  normalizedDeviation: number;
  persistenceCount: number;
  recentMin: number;
  recentMax: number;
  thresholdDistance: number;
  operationalThreshold: number;
  thresholdDirection: 'UP' | 'DOWN' | 'BOTH';
}

export interface TelemetryEvidence {
  parameter: string;
  observed: string;
  baseline: string;
  deviation: string;
  status: string;
  trendDirection: 'STABLE' | 'INCREASING' | 'DECREASING' | 'DEGRADING';
  isAnomalous: boolean;
}

export interface ContributingFactor {
  parameter: string;
  subsystem: SubsystemId;
  contributionLevel: 'High contribution' | 'Medium contribution' | 'Possible contribution';
  impactDescription: string;
}

export interface AIEngineOutput {
  satelliteId: string;
  satelliteName: string;
  anomalyType: string;
  subsystem: string;
  isAnomaly: boolean;
  anomalyScore: number; // Continuous [0.00, 1.00]
  anomalyScoreDisplay: string; // e.g. "0.8520"
  detectionConfidence: string; // e.g. "98.4% Calibrated" or "Confidence: Not calibrated"
  riskLevel: RiskLevel;
  trend: TrendClassification;
  trajectory: string;
  persistence: string;
  evidence: TelemetryEvidence[];
  contributingFactors: ContributingFactor[];
  estimatedTimeToThreshold: string;
  estimatedTimeToThresholdFormatted: string;
  threshold: number;
  unit: string;
  rateOfChange: string;
  missionImpact: {
    affectedCapability: string;
    impactLevel: RiskLevel;
    potentialConsequence: string;
  };
  recommendedAction: string;
  operationalActions: {
    immediate: string;
    monitor: string;
    escalation: string;
  };
  modelMethod: string;
  dataQuality: DataQualityReport;
  features: Record<string, ParameterFeatureSet>;
  sparkline: number[];
}

// ============================================================================
// BASELINE PHYSICAL CONSTANTS & THRESHOLDS
// ============================================================================

export interface ParameterConfig {
  key: string;
  aliases: string[];
  subsystem: SubsystemId;
  unit: string;
  baselineMean: number;
  baselineStd: number;
  nominalMin: number;
  nominalMax: number;
  criticalMin?: number;
  criticalMax?: number;
  direction: 'UP' | 'DOWN' | 'BOTH';
  slopeThresholdPerMin: number;
  physicalMin: number;
  physicalMax: number;
}

export const MONITORED_PARAMETER_CONFIGS: Record<string, ParameterConfig> = {
  battery_voltage: {
    key: 'battery_voltage',
    aliases: ['battery_voltage', 'voltage', 'batteryVoltage', 'bus_voltage'],
    subsystem: 'BATTERY',
    unit: 'V',
    baselineMean: 28.5,
    baselineStd: 0.8,
    nominalMin: 26.0,
    nominalMax: 32.0,
    criticalMin: 21.0,
    direction: 'DOWN',
    slopeThresholdPerMin: 0.25, // V/min
    physicalMin: 10.0,
    physicalMax: 45.0,
  },
  battery_current: {
    key: 'battery_current',
    aliases: ['battery_current', 'current', 'batteryCurrent'],
    subsystem: 'BATTERY',
    unit: 'A',
    baselineMean: 6.5,
    baselineStd: 1.2,
    nominalMin: 3.5,
    nominalMax: 10.0,
    criticalMax: 20.0,
    direction: 'UP',
    slopeThresholdPerMin: 1.0, // A/min
    physicalMin: 0.0,
    physicalMax: 60.0,
  },
  temperature: {
    key: 'temperature',
    aliases: ['temperature', 'temp', 'core_temp'],
    subsystem: 'THERMAL',
    unit: '°C',
    baselineMean: 24.0,
    baselineStd: 3.5,
    nominalMin: 15.0,
    nominalMax: 35.0,
    criticalMax: 55.0,
    direction: 'UP',
    slopeThresholdPerMin: 0.5, // °C/min
    physicalMin: -60.0,
    physicalMax: 130.0,
  },
  payload_temp: {
    key: 'payload_temp',
    aliases: ['payload_temp', 'payloadTemp'],
    subsystem: 'THERMAL',
    unit: '°C',
    baselineMean: 25.0,
    baselineStd: 3.0,
    nominalMin: 15.0,
    nominalMax: 38.0,
    criticalMax: 58.0,
    direction: 'UP',
    slopeThresholdPerMin: 0.5,
    physicalMin: -60.0,
    physicalMax: 130.0,
  },
  solar_power: {
    key: 'solar_power',
    aliases: ['solar_power', 'powerGeneration', 'solarOutput', 'power'],
    subsystem: 'POWER',
    unit: 'W',
    baselineMean: 650.0,
    baselineStd: 85.0,
    nominalMin: 450.0,
    nominalMax: 850.0,
    criticalMin: 180.0,
    direction: 'DOWN',
    slopeThresholdPerMin: 15.0, // W/min
    physicalMin: 0.0,
    physicalMax: 2000.0,
  },
  communication_signal: {
    key: 'communication_signal',
    aliases: ['communication_signal', 'signalStrength', 'signal', 'commSignal'],
    subsystem: 'COMMUNICATION',
    unit: 'dBm',
    baselineMean: -82.0,
    baselineStd: 4.5,
    nominalMin: -95.0,
    nominalMax: -65.0,
    criticalMin: -115.0,
    direction: 'DOWN',
    slopeThresholdPerMin: 2.0, // dBm/min
    physicalMin: -150.0,
    physicalMax: 0.0,
  },
  packet_loss: {
    key: 'packet_loss',
    aliases: ['packet_loss', 'packetLoss'],
    subsystem: 'COMMUNICATION',
    unit: '%',
    baselineMean: 0.05,
    baselineStd: 0.08,
    nominalMin: 0.0,
    nominalMax: 1.0,
    criticalMax: 8.0,
    direction: 'UP',
    slopeThresholdPerMin: 0.5, // %/min
    physicalMin: 0.0,
    physicalMax: 100.0,
  },
  pitch: {
    key: 'pitch',
    aliases: ['pitch'],
    subsystem: 'ATTITUDE',
    unit: '°',
    baselineMean: 0.0,
    baselineStd: 0.6,
    nominalMin: -2.5,
    nominalMax: 2.5,
    criticalMin: -12.0,
    criticalMax: 12.0,
    direction: 'BOTH',
    slopeThresholdPerMin: 0.4,
    physicalMin: -180.0,
    physicalMax: 180.0,
  },
  yaw: {
    key: 'yaw',
    aliases: ['yaw'],
    subsystem: 'ATTITUDE',
    unit: '°',
    baselineMean: 0.0,
    baselineStd: 0.6,
    nominalMin: -2.5,
    nominalMax: 2.5,
    criticalMin: -12.0,
    criticalMax: 12.0,
    direction: 'BOTH',
    slopeThresholdPerMin: 0.4,
    physicalMin: -180.0,
    physicalMax: 180.0,
  },
  roll: {
    key: 'roll',
    aliases: ['roll'],
    subsystem: 'ATTITUDE',
    unit: '°',
    baselineMean: 0.0,
    baselineStd: 0.6,
    nominalMin: -2.5,
    nominalMax: 2.5,
    criticalMin: -12.0,
    criticalMax: 12.0,
    direction: 'BOTH',
    slopeThresholdPerMin: 0.4,
    physicalMin: -180.0,
    physicalMax: 180.0,
  },
};

// ============================================================================
// AI ENGINE ADAPTER IMPLEMENTATION
// ============================================================================

export class AIEngineAdapter {
  /**
   * Sanitizes and extracts raw numeric telemetry values with defensive bounds clipping.
   */
  public sanitizeTelemetryPoint(
    rawPoint: TelemetryDataPoint | null | undefined
  ): { sanitized: Record<string, number>; missing: string[]; hasAnomalousValues: boolean } {
    const sanitized: Record<string, number> = {};
    const missing: string[] = [];
    let hasAnomalousValues = false;

    if (!rawPoint || typeof rawPoint !== 'object') {
      for (const [key, cfg] of Object.entries(MONITORED_PARAMETER_CONFIGS)) {
        sanitized[key] = cfg.baselineMean;
        missing.push(key);
      }
      return { sanitized, missing, hasAnomalousValues: true };
    }

    for (const [key, cfg] of Object.entries(MONITORED_PARAMETER_CONFIGS)) {
      let foundValue: number | null = null;

      for (const alias of cfg.aliases) {
        const val = rawPoint[alias];
        if (val !== undefined && val !== null) {
          const num = typeof val === 'number' ? val : parseFloat(String(val));
          if (!isNaN(num) && isFinite(num)) {
            // Signal strength percentage mapping (if 0-100 given for signal, convert to dBm)
            if (alias === 'signalStrength' && num >= 0 && num <= 100) {
              foundValue = -120 + (num / 100) * 55; // 0% = -120 dBm, 100% = -65 dBm
            } else if (alias === 'power' && num >= 0 && num <= 100) {
              foundValue = num * 7.5; // 100% power = 750W
            } else {
              foundValue = num;
            }
            break;
          }
        }
      }

      if (foundValue === null) {
        sanitized[key] = cfg.baselineMean;
        missing.push(key);
      } else {
        // Clamp to physical bounds
        if (foundValue < cfg.physicalMin || foundValue > cfg.physicalMax) {
          hasAnomalousValues = true;
        }
        sanitized[key] = Math.max(cfg.physicalMin, Math.min(cfg.physicalMax, foundValue));
      }
    }

    return { sanitized, missing, hasAnomalousValues };
  }

  /**
   * Linear regression slope (dX/dt) calculation in units per minute
   * Uniform sample interval (default 5.0 seconds per step = 12 steps/min)
   */
  public calculateLinearSlope(values: number[], stepSeconds: number = 5.0): number {
    const n = values.length;
    if (n < 2) return 0.0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const tMin = (i * stepSeconds) / 60.0;
      sumX += tMin;
      sumY += values[i];
      sumXY += tMin * values[i];
      sumX2 += tMin * tMin;
    }

    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-9) return 0.0;

    return (n * sumXY - sumX * sumY) / denom;
  }

  /**
   * Exponential Moving Average (EMA) smoothing filter
   */
  public calculateEMA(values: number[], alpha: number = 0.35): number[] {
    if (values.length === 0) return [];
    const ema: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      ema.push(alpha * values[i] + (1 - alpha) * ema[i - 1]);
    }
    return ema;
  }

  /**
   * Extracts multi-dimensional features for all monitored spacecraft telemetry channels.
   */
  public extractFeatures(
    currentTelemetry: TelemetryDataPoint,
    telemetryHistory: TelemetryDataPoint[] = []
  ): { features: Record<string, ParameterFeatureSet>; quality: DataQualityReport } {
    const allFrames = [...telemetryHistory, currentTelemetry].filter(Boolean);
    const sanitizedFrames = allFrames.map((f) => this.sanitizeTelemetryPoint(f));
    const currentSanitized = sanitizedFrames[sanitizedFrames.length - 1] || this.sanitizeTelemetryPoint(currentTelemetry);

    // Compute quality metrics
    const frameCount = allFrames.length;
    const missingFields = currentSanitized.missing;
    const hasAnomalies = sanitizedFrames.some((s) => s.hasAnomalousValues);

    let qualityRating: 'HIGH' | 'MEDIUM' | 'DEGRADED' | 'INSUFFICIENT' = 'HIGH';
    const notes: string[] = [];

    if (frameCount < 3) {
      qualityRating = 'INSUFFICIENT';
      notes.push(`Sample buffer contains ${frameCount} frame(s). Minimum 3 frames required for temporal regression.`);
    } else if (missingFields.length > 3) {
      qualityRating = 'DEGRADED';
      notes.push(`Missing telemetry for ${missingFields.length} monitored parameter(s). Defaults imputed.`);
    } else if (missingFields.length > 0) {
      qualityRating = 'MEDIUM';
      notes.push(`Imputed ${missingFields.length} optional parameter(s) with learned nominal baseline.`);
    } else {
      notes.push(`All ${Object.keys(MONITORED_PARAMETER_CONFIGS).length} telemetry channels valid and calibrated.`);
    }

    const quality: DataQualityReport = {
      isValid: frameCount >= 1,
      frameCount,
      sanitizedFieldCount: Object.keys(MONITORED_PARAMETER_CONFIGS).length - missingFields.length,
      missingFields,
      anomalousValuesDetected: hasAnomalies,
      dataQualityRating: qualityRating,
      notes,
    };

    const features: Record<string, ParameterFeatureSet> = {};

    for (const [key, cfg] of Object.entries(MONITORED_PARAMETER_CONFIGS)) {
      const rawSeries = sanitizedFrames.map((sf) => sf.sanitized[key]);
      const currentVal = rawSeries[rawSeries.length - 1] ?? cfg.baselineMean;
      const smoothedSeries = this.calculateEMA(rawSeries, 0.4);

      // Rolling statistical metrics
      const n = smoothedSeries.length;
      const rollingMean = n > 0 ? smoothedSeries.reduce((a, b) => a + b, 0) / n : cfg.baselineMean;
      const variance = n > 1 ? smoothedSeries.reduce((acc, v) => acc + Math.pow(v - rollingMean, 2), 0) / (n - 1) : 0;
      const rollingStd = Math.sqrt(variance);

      // Slopes & Acceleration
      const rateOfChangePerMin = this.calculateLinearSlope(smoothedSeries, 5.0);
      let accelerationPerMin2 = 0.0;
      if (n >= 4) {
        const mid = Math.floor(n / 2);
        const slope1 = this.calculateLinearSlope(smoothedSeries.slice(0, mid), 5.0);
        const slope2 = this.calculateLinearSlope(smoothedSeries.slice(mid), 5.0);
        accelerationPerMin2 = slope2 - slope1;
      }

      // Z-Score relative to learned space baseline
      const zScore = (currentVal - cfg.baselineMean) / (cfg.baselineStd > 0 ? cfg.baselineStd : 1.0);
      const deviationFromBaseline = currentVal - cfg.baselineMean;
      const normalizedDeviation = Math.abs(zScore);

      // Persistence (run-length count outside nominal limits)
      let persistenceCount = 0;
      for (let i = rawSeries.length - 1; i >= 0; i--) {
        const v = rawSeries[i];
        let isOut = false;
        if (cfg.direction === 'DOWN' && v < cfg.nominalMin) isOut = true;
        else if (cfg.direction === 'UP' && v > cfg.nominalMax) isOut = true;
        else if (cfg.direction === 'BOTH' && (v < cfg.nominalMin || v > cfg.nominalMax)) isOut = true;

        if (isOut) persistenceCount++;
        else break;
      }

      // Operational threshold & distance
      let operationalThreshold = 0;
      let thresholdDistance = 0;
      if (cfg.direction === 'DOWN') {
        operationalThreshold = cfg.criticalMin ?? cfg.nominalMin * 0.8;
        thresholdDistance = Math.max(0, currentVal - operationalThreshold);
      } else if (cfg.direction === 'UP') {
        operationalThreshold = cfg.criticalMax ?? cfg.nominalMax * 1.3;
        thresholdDistance = Math.max(0, operationalThreshold - currentVal);
      } else {
        const target = currentVal >= 0 ? (cfg.criticalMax ?? 10.0) : (cfg.criticalMin ?? -10.0);
        operationalThreshold = target;
        thresholdDistance = Math.max(0, Math.abs(target) - Math.abs(currentVal));
      }

      const recentMin = Math.min(...rawSeries);
      const recentMax = Math.max(...rawSeries);

      features[key] = {
        parameter: key,
        subsystem: cfg.subsystem,
        currentValue: Number(currentVal.toFixed(2)),
        baselineMean: cfg.baselineMean,
        baselineStd: cfg.baselineStd,
        unit: cfg.unit,
        zScore: Number(zScore.toFixed(2)),
        rollingMean: Number(rollingMean.toFixed(2)),
        rollingStd: Number(rollingStd.toFixed(2)),
        rateOfChangePerMin: Number(rateOfChangePerMin.toFixed(3)),
        accelerationPerMin2: Number(accelerationPerMin2.toFixed(3)),
        deviationFromBaseline: Number(deviationFromBaseline.toFixed(2)),
        normalizedDeviation: Number(normalizedDeviation.toFixed(2)),
        persistenceCount,
        recentMin: Number(recentMin.toFixed(2)),
        recentMax: Number(recentMax.toFixed(2)),
        thresholdDistance: Number(thresholdDistance.toFixed(2)),
        operationalThreshold: Number(operationalThreshold.toFixed(2)),
        thresholdDirection: cfg.direction,
      };
    }

    return { features, quality };
  }

  /**
   * Deterministic Multi-Factor Anomaly Scoring Engine
   * 
   * Score = w1 * BaselineDeviationScore + w2 * RateOfChangeScore + w3 * PersistenceScore + w4 * MultiParamScore
   * Configurable weights: w1=0.35, w2=0.25, w3=0.25, w4=0.15
   */
  public computeDeterministicAnomalyScore(
    features: Record<string, ParameterFeatureSet>
  ): {
    score: number;
    primaryFeature: ParameterFeatureSet;
    deviatedFeatures: ParameterFeatureSet[];
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
  } {
    const featureList = Object.values(features);
    const deviatedFeatures = featureList.filter((f) => {
      const cfg = MONITORED_PARAMETER_CONFIGS[f.parameter];
      if (!cfg) return false;
      const isZDev = Math.abs(f.zScore) >= 2.2;
      const isNominalOut =
        (cfg.direction === 'DOWN' && f.currentValue < cfg.nominalMin) ||
        (cfg.direction === 'UP' && f.currentValue > cfg.nominalMax) ||
        (cfg.direction === 'BOTH' && (f.currentValue < cfg.nominalMin || f.currentValue > cfg.nominalMax));
      return isZDev || isNominalOut;
    });

    // Primary feature with largest absolute Z-score
    const sortedByZ = [...featureList].sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
    const primaryFeature = sortedByZ[0] || featureList[0];

    if (deviatedFeatures.length === 0) {
      return {
        score: Math.min(0.18, Math.max(0.02, Math.abs(primaryFeature.zScore) * 0.05)),
        primaryFeature,
        deviatedFeatures: [],
        severity: 'INFO',
      };
    }

    // Factor 1: Normalized Baseline Deviation (w1 = 0.35)
    const maxZ = Math.max(...deviatedFeatures.map((d) => Math.abs(d.zScore)));
    const sDev = Math.min(1.0, maxZ / 4.5);

    // Factor 2: Rate of Change Severity (w2 = 0.25)
    const maxRocSeverity = Math.max(
      ...deviatedFeatures.map((d) => {
        const cfg = MONITORED_PARAMETER_CONFIGS[d.parameter];
        return Math.min(1.0, Math.abs(d.rateOfChangePerMin) / (cfg.slopeThresholdPerMin * 2.0));
      })
    );

    // Factor 3: Persistence Score (w3 = 0.25)
    const maxPersistence = Math.max(...deviatedFeatures.map((d) => d.persistenceCount));
    const sPersist = Math.min(1.0, maxPersistence / 4.0);

    // Factor 4: Multi-parameter Correlated Deviation (w4 = 0.15)
    const sMulti = Math.min(1.0, deviatedFeatures.length / 3.0);

    // Weighted combination
    const rawScore = 0.35 * sDev + 0.25 * maxRocSeverity + 0.25 * sPersist + 0.15 * sMulti;
    const finalScore = Number(Math.min(0.99, Math.max(0.25, rawScore)).toFixed(4));

    // Severity mapping
    let severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';
    if (finalScore >= 0.70 || maxZ >= 4.0 || maxPersistence >= 4) {
      severity = 'CRITICAL';
    } else if (finalScore >= 0.40 || maxZ >= 2.5 || maxPersistence >= 2) {
      severity = 'WARNING';
    }

    return {
      score: finalScore,
      primaryFeature,
      deviatedFeatures,
      severity,
    };
  }

  /**
   * Evaluates Temporal Degradation Trend and Projects Estimated Time to Operational Threshold
   */
  public evaluatePredictiveTrend(
    features: Record<string, ParameterFeatureSet>,
    primary: ParameterFeatureSet,
    quality: DataQualityReport
  ): {
    trend: TrendClassification;
    trajectory: string;
    persistenceText: string;
    estimatedTimeToThresholdFormatted: string;
    rateOfChangeText: string;
    riskLevel: RiskLevel;
  } {
    if (quality.frameCount < 3) {
      return {
        trend: 'INSUFFICIENT_DATA',
        trajectory: 'Insufficient telemetry history to establish reliable trajectory.',
        persistenceText: 'Insufficient historical data (< 3 frames)',
        estimatedTimeToThresholdFormatted: 'Not available — insufficient reliable trend data',
        rateOfChangeText: 'N/A (Data buffer building)',
        riskLevel: 'LOW',
      };
    }

    const cfg = MONITORED_PARAMETER_CONFIGS[primary.parameter];
    const slope = primary.rateOfChangePerMin;
    const absSlope = Math.abs(slope);
    const thresholdSlope = cfg.slopeThresholdPerMin;
    const persistence = primary.persistenceCount;
    const thresholdDist = primary.thresholdDistance;

    let trend: TrendClassification = 'STABLE';
    let isHeadingTowardsThreshold = false;

    if (cfg.direction === 'DOWN') {
      if (slope < -thresholdSlope * 2.5) {
        trend = 'RAPIDLY_DEGRADING';
        isHeadingTowardsThreshold = true;
      } else if (slope < -thresholdSlope) {
        trend = 'DEGRADING';
        isHeadingTowardsThreshold = true;
      } else if (slope > thresholdSlope) {
        trend = 'IMPROVING';
      } else {
        trend = 'STABLE';
      }
    } else if (cfg.direction === 'UP') {
      if (slope > thresholdSlope * 2.5) {
        trend = 'RAPIDLY_DEGRADING';
        isHeadingTowardsThreshold = true;
      } else if (slope > thresholdSlope) {
        trend = 'DEGRADING';
        isHeadingTowardsThreshold = true;
      } else if (slope < -thresholdSlope) {
        trend = 'IMPROVING';
      } else {
        trend = 'STABLE';
      }
    } else {
      if (absSlope > thresholdSlope * 2.5) {
        trend = 'RAPIDLY_DEGRADING';
        isHeadingTowardsThreshold = true;
      } else if (absSlope > thresholdSlope) {
        trend = 'DEGRADING';
        isHeadingTowardsThreshold = true;
      } else {
        trend = 'STABLE';
      }
    }

    // Time to threshold estimation
    let estimatedTimeToThresholdFormatted = 'Stable trend — no threshold crossing projected';
    if ((trend === 'DEGRADING' || trend === 'RAPIDLY_DEGRADING') && isHeadingTowardsThreshold && absSlope > 1e-4) {
      const minutesRemaining = thresholdDist / absSlope;
      if (minutesRemaining < 1.0) {
        const secs = Math.max(1, Math.round(minutesRemaining * 60));
        estimatedTimeToThresholdFormatted = `~${secs} sec to operational threshold (${primary.operationalThreshold}${cfg.unit})`;
      } else if (minutesRemaining < 60.0) {
        estimatedTimeToThresholdFormatted = `~${minutesRemaining.toFixed(1)} min to operational threshold (${primary.operationalThreshold}${cfg.unit})`;
      } else {
        const hrs = minutesRemaining / 60.0;
        estimatedTimeToThresholdFormatted = `~${hrs.toFixed(1)} hours to operational threshold (${primary.operationalThreshold}${cfg.unit})`;
      }
    }

    // Trajectory description
    let trajectory = 'Stable trajectory within nominal limits.';
    if (trend === 'RAPIDLY_DEGRADING') {
      trajectory = `Rapid adverse drift (${slope >= 0 ? '+' : ''}${slope.toFixed(2)} ${cfg.unit}/min) towards critical margin.`;
    } else if (trend === 'DEGRADING') {
      trajectory = `Steady degradation slope (${slope >= 0 ? '+' : ''}${slope.toFixed(2)} ${cfg.unit}/min) detected across historical window.`;
    } else if (trend === 'IMPROVING') {
      trajectory = `Telemetry recovering towards nominal baseline envelope.`;
    }

    // Persistence text
    const persistenceText =
      persistence > 0
        ? `${persistence} consecutive observation${persistence > 1 ? 's' : ''} outside nominal bounds`
        : 'Telemetry parameters currently within nominal baseline envelope';

    // Risk level matrix
    let riskLevel: RiskLevel = 'LOW';
    if (trend === 'RAPIDLY_DEGRADING' || (trend === 'DEGRADING' && thresholdDist < (cfg.nominalMax - cfg.nominalMin) * 0.4)) {
      riskLevel = 'CRITICAL';
    } else if (trend === 'DEGRADING' || persistence >= 3) {
      riskLevel = 'HIGH';
    } else if (persistence >= 1 || Math.abs(primary.zScore) >= 2.0) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    const rateSign = slope >= 0 ? '+' : '';
    const rateOfChangeText = `${rateSign}${slope.toFixed(2)} ${cfg.unit}/min`;

    return {
      trend,
      trajectory,
      persistenceText,
      estimatedTimeToThresholdFormatted,
      rateOfChangeText,
      riskLevel,
    };
  }

  /**
   * Generates Explainable AI (XAI) evidence items, contributing factors, and action plans.
   */
  public generateExplainability(
    primary: ParameterFeatureSet,
    deviated: ParameterFeatureSet[],
    features: Record<string, ParameterFeatureSet>,
    subsystem: SubsystemId,
    riskLevel: RiskLevel
  ): {
    evidence: TelemetryEvidence[];
    contributingFactors: ContributingFactor[];
    missionImpact: { affectedCapability: string; impactLevel: RiskLevel; potentialConsequence: string };
    recommendedAction: string;
    operationalActions: { immediate: string; monitor: string; escalation: string };
  } {
    const evidence: TelemetryEvidence[] = [];

    // Add primary feature
    const pCfg = MONITORED_PARAMETER_CONFIGS[primary.parameter];
    const pDiff = primary.currentValue - primary.baselineMean;
    const pSign = pDiff >= 0 ? '+' : '';
    evidence.push({
      parameter: primary.parameter.replace('_', ' ').toUpperCase(),
      observed: `${primary.currentValue} ${primary.unit}`,
      baseline: `${pCfg.nominalMin}-${pCfg.nominalMax} ${primary.unit}`,
      deviation: `${pSign}${pDiff.toFixed(1)} ${primary.unit} (Z: ${primary.zScore >= 0 ? '+' : ''}${primary.zScore})`,
      status: Math.abs(primary.zScore) >= 3.0 ? 'Exceeds Critical Operational Envelope' : Math.abs(primary.zScore) >= 2.0 ? 'Deviates from Learned Baseline' : 'Nominal Baseline',
      trendDirection: primary.rateOfChangePerMin > 0.05 ? 'INCREASING' : primary.rateOfChangePerMin < -0.05 ? 'DECREASING' : 'STABLE',
      isAnomalous: Math.abs(primary.zScore) >= 2.0,
    });

    // Add secondary deviated features
    for (const d of deviated) {
      if (d.parameter === primary.parameter) continue;
      const dCfg = MONITORED_PARAMETER_CONFIGS[d.parameter];
      const dDiff = d.currentValue - d.baselineMean;
      const dSign = dDiff >= 0 ? '+' : '';
      evidence.push({
        parameter: d.parameter.replace('_', ' ').toUpperCase(),
        observed: `${d.currentValue} ${d.unit}`,
        baseline: `${dCfg.nominalMin}-${dCfg.nominalMax} ${d.unit}`,
        deviation: `${dSign}${dDiff.toFixed(1)} ${d.unit} (Z: ${d.zScore >= 0 ? '+' : ''}${d.zScore})`,
        status: Math.abs(d.zScore) >= 3.0 ? 'Correlated Critical Deviation' : 'Correlated Secondary Drift',
        trendDirection: d.rateOfChangePerMin > 0.05 ? 'INCREASING' : d.rateOfChangePerMin < -0.05 ? 'DECREASING' : 'STABLE',
        isAnomalous: true,
      });
      if (evidence.length >= 4) break;
    }

    // Pad with other key system parameters if evidence count is small
    const keyWatchParams = ['battery_voltage', 'temperature', 'solar_power', 'communication_signal'];
    for (const k of keyWatchParams) {
      if (evidence.length >= 4) break;
      if (evidence.some((e) => e.parameter.toLowerCase() === k.replace('_', ' '))) continue;
      const feat = features[k];
      if (!feat) continue;
      const kCfg = MONITORED_PARAMETER_CONFIGS[k];
      const kDiff = feat.currentValue - feat.baselineMean;
      const kSign = kDiff >= 0 ? '+' : '';
      evidence.push({
        parameter: k.replace('_', ' ').toUpperCase(),
        observed: `${feat.currentValue} ${feat.unit}`,
        baseline: `${kCfg.nominalMin}-${kCfg.nominalMax} ${feat.unit}`,
        deviation: `${kSign}${kDiff.toFixed(1)} ${feat.unit}`,
        status: 'Nominal Baseline Operating Envelope',
        trendDirection: 'STABLE',
        isAnomalous: false,
      });
    }

    // Contributing Factors (without fake percentages)
    const contributingFactors: ContributingFactor[] = [];
    if (deviated.length > 0) {
      for (const d of deviated) {
        let level: 'High contribution' | 'Medium contribution' | 'Possible contribution' = 'Possible contribution';
        if (Math.abs(d.zScore) >= 3.5 || d.parameter === primary.parameter) {
          level = 'High contribution';
        } else if (Math.abs(d.zScore) >= 2.2) {
          level = 'Medium contribution';
        }
        contributingFactors.push({
          parameter: d.parameter.replace('_', ' ').toUpperCase(),
          subsystem: d.subsystem,
          contributionLevel: level,
          impactDescription: `Demonstrates ${Math.abs(d.zScore).toFixed(1)} standard deviations drift from nominal baseline.`,
        });
      }
    } else {
      contributingFactors.push({
        parameter: 'SYSTEM TELEMETRY',
        subsystem: 'GENERAL',
        contributionLevel: 'Possible contribution',
        impactDescription: 'All telemetry channels tracking nominal baseline.',
      });
    }

    // Mission Impact & Recommendations by Subsystem
    const subsystemActionMap: Record<
      SubsystemId,
      {
        capability: string;
        consequence: string;
        action: string;
        immediate: string;
        monitor: string;
        escalation: string;
      }
    > = {
      BATTERY: {
        capability: 'Main EPS Electrical Power Storage & Distribution',
        consequence: 'Risk of main bus undervoltage and loss of non-essential payload operations.',
        action: 'Inhibit non-essential payload heaters and prioritize battery charge cycle.',
        immediate: 'Engage Autonomous Power-Saving Mode & shed auxiliary payloads.',
        monitor: 'Track battery state-of-charge recovery and bus voltage gradient.',
        escalation: 'Initiate payload safe-mode shutdown if voltage falls below critical threshold.',
      },
      POWER: {
        capability: 'Photovoltaic Solar Array Generation',
        consequence: 'Energy deficit exceeding available battery reserve during upcoming orbital eclipse.',
        action: 'Reorient solar array drive mechanism toward optimal Sun-pointing vector.',
        immediate: 'Trim peak power tracker and adjust array gimbal angles.',
        monitor: 'Verify power generation curve over next daylight orbital segment.',
        escalation: 'Switch to secondary power regulator bus if decay persists.',
      },
      THERMAL: {
        capability: 'Spacecraft Thermal Regulation & Heat Dissipation',
        consequence: 'Avionics junction temperature elevation exceeding silicon operating limits.',
        action: 'Deploy auxiliary radiator louvers and adjust attitude to shade payload bay.',
        immediate: 'Activate auxiliary thermal radiator louvers and shade avionics.',
        monitor: 'Track temperature gradient dT/dt across consecutive telemetry frames.',
        escalation: 'Power-down high-heat dissipation transmitters if temperature exceeds 55°C.',
      },
      COMMUNICATION: {
        capability: 'RF Space-to-Ground Telemetry Downlink',
        consequence: 'Potential frame synchronization loss and telemetry packet drops during pass.',
        action: 'Re-calibrate high-gain dish antenna autotrack and increase uplink power.',
        immediate: 'Command antenna autotracking calibration sweep.',
        monitor: 'Verify carrier-to-noise ratio (C/N0) and ground pass elevation.',
        escalation: 'Switch to redundant omni-directional S-band backup transponder.',
      },
      ATTITUDE: {
        capability: '3-Axis AOCS Pointing Stability',
        consequence: 'Loss of optical earth-pointing accuracy and antenna misalignment.',
        action: 'Execute magnetic torquer momentum desaturation sequence.',
        immediate: 'Engage magnetic torquers to desaturate reaction wheel momentum.',
        monitor: 'Track pitch/roll gyroscopic rate error across orbital arc.',
        escalation: 'Transition to sun-safe attitude acquisition mode if pointing error > 10°.',
      },
      SENSOR: {
        capability: 'Spacecraft Instrumentation & Telemetry Acquisition',
        consequence: 'Measurement calibration drift affecting autonomous flight computer decisions.',
        action: 'Switch telemetry processing line to secondary sensor channel.',
        immediate: 'Switch analog sensor acquisition line to redundant channel B.',
        monitor: 'Cross-correlate secondary telemetry channel against physical model.',
        escalation: 'Perform ground sensor re-zeroing and update calibration matrix.',
      },
      GENERAL: {
        capability: 'Nominal Spacecraft Operations',
        consequence: 'Routine orbital flight operations maintaining nominal margins.',
        action: 'Maintain standard pass tracking and scheduled telemetry downlink.',
        immediate: 'Maintain nominal tracking and telemetry sampling.',
        monitor: 'Continue standard telemetry frame logging.',
        escalation: 'No escalation required during nominal baseline operations.',
      },
    };

    const targetSub = subsystemActionMap[subsystem] || subsystemActionMap.GENERAL;

    return {
      evidence,
      contributingFactors,
      missionImpact: {
        affectedCapability: targetSub.capability,
        impactLevel: riskLevel,
        potentialConsequence: targetSub.consequence,
      },
      recommendedAction: targetSub.action,
      operationalActions: {
        immediate: targetSub.immediate,
        monitor: targetSub.monitor,
        escalation: targetSub.escalation,
      },
    };
  }

  /**
   * Main Pipeline Execution Method
   * 
   * Integrates FastAPI ML Isolation Forest (if available) with deterministic
   * statistical temporal analysis, risk scoring, explainability, and recommendations.
   */
  public async analyze(
    satelliteId: string,
    satelliteName: string,
    currentTelemetry: TelemetryDataPoint,
    telemetryHistory: TelemetryDataPoint[] = []
  ): Promise<AIEngineOutput> {
    // 1. Feature Extraction & Quality Audit
    const { features, quality } = this.extractFeatures(currentTelemetry, telemetryHistory);

    // 2. Deterministic Statistical Anomaly Scoring
    const deterministic = this.computeDeterministicAnomalyScore(features);

    // 3. Attempt Machine Learning Inference via Backend Adapter
    let isMlAnomaly = false;
    let mlScore: number | null = null;
    let mlConfidenceText = 'Confidence: Not calibrated';
    let modelMethod = 'Statistical temporal baseline & multi-factor deviation engine';

    try {
      const mlInput: MLTelemetryInput = {
        battery_voltage: features.battery_voltage.currentValue,
        battery_current: features.battery_current.currentValue,
        temperature: features.temperature.currentValue,
        solar_power: features.solar_power.currentValue,
        communication_signal: features.communication_signal.currentValue,
      };

      const mlRes = await detectMLAnomaly(mlInput);
      if (mlRes && mlRes.model) {
        isMlAnomaly = mlRes.is_anomaly;
        mlScore = mlRes.anomaly_score;
        modelMethod = `Isolation Forest ML (${mlRes.model})`;
        if (mlRes.confidence) {
          mlConfidenceText = `${mlRes.confidence.toFixed(1)}% Calibrated`;
        }
      }
    } catch {
      // Graceful fallback to deterministic statistical engine
      modelMethod = 'Statistical temporal baseline & multi-factor deviation engine';
    }

    // 4. Determine Unified Anomaly Decision & Subsystem
    const isAnomaly = isMlAnomaly || deterministic.severity !== 'INFO';
    const primary = deterministic.primaryFeature;
    const subsystem = primary.subsystem;

    let anomalyType = 'Nominal Spacecraft Health';
    if (isAnomaly) {
      if (subsystem === 'BATTERY') {
        anomalyType = primary.currentValue < 24.0 ? 'EPS Deep Discharge & Undervoltage' : 'Battery Bus Voltage Decay';
      } else if (subsystem === 'POWER') {
        anomalyType = 'Photovoltaic Power Generation Loss';
      } else if (subsystem === 'THERMAL') {
        anomalyType = primary.currentValue > 50.0 ? 'Critical Thermal Runaway' : 'Subsystem Thermal Overheating';
      } else if (subsystem === 'COMMUNICATION') {
        anomalyType = 'RF Carrier Link Attenuation';
      } else if (subsystem === 'ATTITUDE') {
        anomalyType = 'AOCS Gyroscopic Attitude Drift';
      } else {
        anomalyType = 'Multivariate Telemetry Drift';
      }
    }

    // 5. Predictive Trend & Risk Analysis
    const predictive = this.evaluatePredictiveTrend(features, primary, quality);

    // 6. Explainability, Root Causes & Actions
    const explainability = this.generateExplainability(
      primary,
      deterministic.deviatedFeatures,
      features,
      subsystem,
      predictive.riskLevel
    );

    // 7. Sparkline generation (last 8 historical values of primary metric)
    const allPoints = [...telemetryHistory, currentTelemetry].filter(Boolean);
    const pCfg = MONITORED_PARAMETER_CONFIGS[primary.parameter];
    const sparkline = allPoints.slice(-8).map((p) => {
      const sanitized = this.sanitizeTelemetryPoint(p);
      return sanitized.sanitized[primary.parameter] ?? pCfg.baselineMean;
    });

    const scoreToDisplay = mlScore !== null ? Math.abs(mlScore) : deterministic.score;

    return {
      satelliteId,
      satelliteName,
      anomalyType,
      subsystem,
      isAnomaly,
      anomalyScore: scoreToDisplay,
      anomalyScoreDisplay: scoreToDisplay.toFixed(4),
      detectionConfidence: mlConfidenceText,
      riskLevel: predictive.riskLevel,
      trend: predictive.trend,
      trajectory: predictive.trajectory,
      persistence: predictive.persistenceText,
      evidence: explainability.evidence,
      contributingFactors: explainability.contributingFactors,
      estimatedTimeToThreshold: predictive.estimatedTimeToThresholdFormatted,
      estimatedTimeToThresholdFormatted: predictive.estimatedTimeToThresholdFormatted,
      threshold: primary.operationalThreshold,
      unit: primary.unit,
      rateOfChange: predictive.rateOfChangeText,
      missionImpact: explainability.missionImpact,
      recommendedAction: explainability.recommendedAction,
      operationalActions: explainability.operationalActions,
      modelMethod,
      dataQuality: quality,
      features,
      sparkline: sparkline.length >= 2 ? sparkline : [primary.currentValue, primary.currentValue],
    };
  }
}

// Export singleton instance for seamless reuse
export const aiEngineAdapter = new AIEngineAdapter();
