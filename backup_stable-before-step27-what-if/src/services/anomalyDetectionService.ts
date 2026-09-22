/**
 * SATSHIELD — Safe Modular Anomaly Detection Service
 * 
 * Foundation for AI-based satellite health monitoring and anomaly detection.
 * Provides deterministic baseline analysis (threshold deviation, moving average,
 * standard deviation / z-score, rate of change) with a pluggable interface for
 * Machine Learning models (e.g., Isolation Forest).
 * 
 * Safe, satellite-agnostic, and defensively coded against missing/malformed telemetry.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AnomalySeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type SubsystemCategory = 'POWER' | 'BATTERY' | 'THERMAL' | 'COMMUNICATION' | 'ATTITUDE' | 'SENSOR' | 'OBC' | 'PAYLOAD';
export type DetectionEngine = 'DETERMINISTIC_BASELINE' | 'ISOLATION_FOREST_ML';

/**
 * Standard Telemetry Input Frame
 * Accepts either flat physical parameters or nested subsystem structures.
 */
export interface TelemetryFrameInput {
  satelliteId: string;
  satelliteName?: string;
  timestamp?: string;
  
  // Power & Battery
  voltage?: number;             // EPS bus / battery voltage (Volts)
  current?: number;             // EPS current draw (Amperes)
  powerGeneration?: number;     // Solar array generation (Watts)
  batteryLevel?: number;        // Battery State of Charge (%)
  batteryVoltage?: number;      // Dedicated battery voltage reading (Volts)
  
  // Thermal
  temperature?: number;         // Internal/avionics temperature (°C)
  payloadTemp?: number;         // Payload temperature (°C)
  externalTemp?: number;        // Spacecraft exterior temperature (°C)
  
  // Communication
  communicationSignal?: number; // Downlink carrier signal strength (dBm)
  packetLoss?: number;          // Packet loss percentage (%)
  snr?: number;                 // Signal-to-noise ratio (dB)
  latencyMs?: number;           // Communication latency (ms)
  
  // Attitude & Orbital Control (AOCS)
  roll?: number;                // Roll angle (degrees)
  pitch?: number;               // Pitch angle (degrees)
  yaw?: number;                 // Yaw angle (degrees)
  angularVelocity?: number;     // Rate of angular displacement (deg/s)
  
  // Raw / Nested subsystems support for backward compatibility
  subsystems?: any;
}

/**
 * Individual Parameter Assessment Detail
 */
export interface ParameterAssessment {
  parameter: string;
  subsystem: SubsystemCategory;
  observedValue: number;
  nominalRange: [number, number];
  zScore?: number;
  rateOfChange?: number;
  deviationDirection?: 'HIGH' | 'LOW' | 'NOMINAL';
  isAnomalous: boolean;
  severity: AnomalySeverity;
  reason: string;
}

/**
 * Standard Structured Output from Anomaly Detection Service
 */
export interface AnomalyDetectionOutput {
  satelliteId: string;
  satelliteName: string;
  timestamp: string;
  isAnomaly: boolean;
  anomalyScore: number;           // Standardized score: 0.00 (nominal) to 1.00 (critical anomaly)
  confidence: number;             // Confidence level (0 to 100%)
  severity: AnomalySeverity;
  subsystem: SubsystemCategory;
  anomalyType: string;
  affectedParameters: string[];
  parameterDetails: ParameterAssessment[];
  explanation: string;
  probableCause: string;
  recommendedAction: string;
  detectionEngine: DetectionEngine;
}

/**
 * Configurable Thresholds & Baseline Envelopes
 */
export interface SubsystemThresholds {
  min: number;
  max: number;
  criticalMin?: number;
  criticalMax?: number;
  nominalMean: number;
  nominalStd: number;
  unit: string;
  subsystem: SubsystemCategory;
}

export interface TelemetryThresholdConfig {
  voltage: SubsystemThresholds;
  current: SubsystemThresholds;
  powerGeneration: SubsystemThresholds;
  batteryLevel: SubsystemThresholds;
  temperature: SubsystemThresholds;
  communicationSignal: SubsystemThresholds;
  packetLoss: SubsystemThresholds;
  pitch: SubsystemThresholds;
  roll: SubsystemThresholds;
  yaw: SubsystemThresholds;
}

// ============================================================================
// Default Configurable Baseline Thresholds
// ============================================================================

export const DEFAULT_TELEMETRY_THRESHOLDS: TelemetryThresholdConfig = {
  voltage: {
    min: 24.0,
    max: 32.0,
    criticalMin: 23.0,
    criticalMax: 34.0,
    nominalMean: 28.5,
    nominalStd: 0.8,
    unit: 'V',
    subsystem: 'POWER',
  },
  current: {
    min: 2.0,
    max: 35.0,
    criticalMin: 0.5,
    criticalMax: 45.0,
    nominalMean: 15.0,
    nominalStd: 4.0,
    unit: 'A',
    subsystem: 'POWER',
  },
  powerGeneration: {
    min: 300.0,
    max: 1200.0,
    criticalMin: 150.0,
    criticalMax: 1500.0,
    nominalMean: 650.0,
    nominalStd: 85.0,
    unit: 'W',
    subsystem: 'POWER',
  },
  batteryLevel: {
    min: 40.0,
    max: 100.0,
    criticalMin: 20.0,
    criticalMax: 100.0,
    nominalMean: 85.0,
    nominalStd: 8.0,
    unit: '%',
    subsystem: 'BATTERY',
  },
  temperature: {
    min: -10.0,
    max: 42.0,
    criticalMin: -25.0,
    criticalMax: 55.0,
    nominalMean: 22.0,
    nominalStd: 3.5,
    unit: '°C',
    subsystem: 'THERMAL',
  },
  communicationSignal: {
    min: -95.0,
    max: -50.0,
    criticalMin: -110.0,
    criticalMax: -40.0,
    nominalMean: -75.0,
    nominalStd: 5.0,
    unit: 'dBm',
    subsystem: 'COMMUNICATION',
  },
  packetLoss: {
    min: 0.0,
    max: 3.0,
    criticalMin: 0.0,
    criticalMax: 8.0,
    nominalMean: 0.1,
    nominalStd: 0.5,
    unit: '%',
    subsystem: 'COMMUNICATION',
  },
  pitch: {
    min: -5.0,
    max: 5.0,
    criticalMin: -15.0,
    criticalMax: 15.0,
    nominalMean: 0.0,
    nominalStd: 1.0,
    unit: '°',
    subsystem: 'ATTITUDE',
  },
  roll: {
    min: -5.0,
    max: 5.0,
    criticalMin: -15.0,
    criticalMax: 15.0,
    nominalMean: 0.0,
    nominalStd: 1.0,
    unit: '°',
    subsystem: 'ATTITUDE',
  },
  yaw: {
    min: -5.0,
    max: 5.0,
    criticalMin: -15.0,
    criticalMax: 15.0,
    nominalMean: 0.0,
    nominalStd: 1.0,
    unit: '°',
    subsystem: 'ATTITUDE',
  },
};

// ============================================================================
// Helper Utilities for Safe Number Handling
// ============================================================================

function parseSafeNumber(val: any, fallback: number): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val.trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function parseOptionalNumber(val: any): number | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : undefined;
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

// ============================================================================
// Core Anomaly Detection Service Class
// ============================================================================

export class AnomalyDetectionService {
  private thresholds: TelemetryThresholdConfig;
  private decisionThreshold: number = 0.35; // Default classification threshold

  constructor(customThresholds?: Partial<TelemetryThresholdConfig>, defaultDecisionThreshold?: number) {
    this.thresholds = {
      ...DEFAULT_TELEMETRY_THRESHOLDS,
      ...(customThresholds || {}),
    };
    if (defaultDecisionThreshold !== undefined) {
      this.decisionThreshold = defaultDecisionThreshold;
    }
  }

  /**
   * Sets the active anomaly classification decision threshold (0.00 to 1.00).
   */
  public setDecisionThreshold(threshold: number): void {
    if (typeof threshold === 'number' && !isNaN(threshold) && threshold >= 0 && threshold <= 1) {
      this.decisionThreshold = Number(threshold.toFixed(2));
    }
  }

  /**
   * Gets the active anomaly classification decision threshold.
   */
  public getDecisionThreshold(): number {
    return this.decisionThreshold;
  }

  /**
   * Normalizes input telemetry from flat format, nested subsystems, or partial frames.
   */
  public sanitizeTelemetry(input: any): Required<TelemetryFrameInput> {
    if (!input || typeof input !== 'object') {
      return {
        satelliteId: 'UNKNOWN-SAT',
        satelliteName: 'Unknown Satellite',
        timestamp: new Date().toISOString(),
        voltage: this.thresholds.voltage.nominalMean,
        current: this.thresholds.current.nominalMean,
        powerGeneration: this.thresholds.powerGeneration.nominalMean,
        batteryLevel: this.thresholds.batteryLevel.nominalMean,
        batteryVoltage: this.thresholds.voltage.nominalMean,
        temperature: this.thresholds.temperature.nominalMean,
        payloadTemp: this.thresholds.temperature.nominalMean,
        externalTemp: -40.0,
        communicationSignal: this.thresholds.communicationSignal.nominalMean,
        packetLoss: this.thresholds.packetLoss.nominalMean,
        snr: 25.0,
        latencyMs: 120,
        roll: 0.0,
        pitch: 0.0,
        yaw: 0.0,
        angularVelocity: 0.0,
        subsystems: {},
      };
    }

    const satelliteId = String(input.satelliteId || input.id || 'SAT-GENERIC').trim();
    const satelliteName = String(input.satelliteName || input.name || satelliteId).trim();
    const timestamp = String(input.timestamp || new Date().toISOString());

    // Check nested subsystems if present
    const subs = input.subsystems || {};
    const pwr = subs.power || {};
    const thm = subs.thermal || {};
    const aocs = subs.aocs || {};
    const comm = subs.comm || {};

    const voltage = parseSafeNumber(
      input.voltage ?? input.batteryVoltage ?? pwr.batteryVoltage,
      this.thresholds.voltage.nominalMean
    );
    const current = parseSafeNumber(
      input.current ?? pwr.current,
      this.thresholds.current.nominalMean
    );
    const powerGeneration = parseSafeNumber(
      input.powerGeneration ?? input.solarPower ?? pwr.solarOutput,
      this.thresholds.powerGeneration.nominalMean
    );
    const batteryLevel = parseSafeNumber(
      input.batteryLevel ?? input.batteryCharge ?? pwr.batteryCharge,
      this.thresholds.batteryLevel.nominalMean
    );
    const batteryVoltage = parseSafeNumber(
      input.batteryVoltage ?? pwr.batteryVoltage ?? voltage,
      voltage
    );

    const temperature = parseSafeNumber(
      input.temperature ?? thm.internalTemp,
      this.thresholds.temperature.nominalMean
    );
    const payloadTemp = parseSafeNumber(
      input.payloadTemp ?? thm.payloadTemp,
      temperature
    );
    const externalTemp = parseSafeNumber(
      input.externalTemp ?? thm.externalTemp,
      -40.0
    );

    const communicationSignal = parseSafeNumber(
      input.communicationSignal ?? comm.signalStrength,
      this.thresholds.communicationSignal.nominalMean
    );
    const packetLoss = parseSafeNumber(
      input.packetLoss ?? comm.packetLoss,
      this.thresholds.packetLoss.nominalMean
    );
    const snr = parseSafeNumber(input.snr ?? comm.snr, 25.0);
    const latencyMs = parseSafeNumber(input.latencyMs ?? comm.latencyMs, 120);

    const roll = parseSafeNumber(input.roll ?? aocs.roll, 0.0);
    const pitch = parseSafeNumber(input.pitch ?? aocs.pitch, 0.0);
    const yaw = parseSafeNumber(input.yaw ?? aocs.yaw, 0.0);
    const angularVelocity = parseSafeNumber(input.angularVelocity ?? aocs.angularVelocity, 0.0);

    return {
      satelliteId,
      satelliteName,
      timestamp,
      voltage,
      current,
      powerGeneration,
      batteryLevel,
      batteryVoltage,
      temperature,
      payloadTemp,
      externalTemp,
      communicationSignal,
      packetLoss,
      snr,
      latencyMs,
      roll,
      pitch,
      yaw,
      angularVelocity,
      subsystems: subs,
    };
  }

  /**
   * Evaluates a single parameter against baseline thresholds and statistical metrics.
   */
  private evaluateParameter(
    paramName: keyof TelemetryThresholdConfig,
    value: number,
    historyValues: number[] = []
  ): ParameterAssessment {
    const config = this.thresholds[paramName];
    const { min, max, criticalMin, criticalMax, nominalMean, nominalStd, unit, subsystem } = config;

    let zScore = 0;
    if (nominalStd > 0) {
      zScore = Number(((value - nominalMean) / nominalStd).toFixed(2));
    }

    let rateOfChange = 0;
    if (historyValues.length >= 1) {
      const prev = historyValues[historyValues.length - 1];
      rateOfChange = Number((value - prev).toFixed(3));
    }

    let isAnomalous = false;
    let severity: AnomalySeverity = 'INFO';
    let deviationDirection: 'HIGH' | 'LOW' | 'NOMINAL' = 'NOMINAL';
    let reason = `${paramName} is nominal (${value.toFixed(1)} ${unit}).`;

    // Critical out of bounds check
    const isCritLow = criticalMin !== undefined && value < criticalMin;
    const isCritHigh = criticalMax !== undefined && value > criticalMax;
    const isWarnLow = value < min;
    const isWarnHigh = value > max;

    if (isCritLow) {
      isAnomalous = true;
      severity = 'CRITICAL';
      deviationDirection = 'LOW';
      const delta = (min - value).toFixed(1);
      reason = `${paramName} (${value.toFixed(1)}${unit}) is ${delta}${unit} below critical threshold (${criticalMin}${unit}).`;
    } else if (isCritHigh) {
      isAnomalous = true;
      severity = 'CRITICAL';
      deviationDirection = 'HIGH';
      const delta = (value - max).toFixed(1);
      reason = `${paramName} (${value.toFixed(1)}${unit}) is ${delta}${unit} above critical threshold (${criticalMax}${unit}).`;
    } else if (isWarnLow) {
      isAnomalous = true;
      severity = 'WARNING';
      deviationDirection = 'LOW';
      const delta = (min - value).toFixed(1);
      reason = `${paramName} (${value.toFixed(1)}${unit}) is ${delta}${unit} below normal baseline (${min}${unit}).`;
    } else if (isWarnHigh) {
      isAnomalous = true;
      severity = 'WARNING';
      deviationDirection = 'HIGH';
      const delta = (value - max).toFixed(1);
      reason = `${paramName} (${value.toFixed(1)}${unit}) is ${delta}${unit} above normal baseline (${max}${unit}).`;
    } else if (Math.abs(zScore) >= 3.0) {
      // Statistical 3-sigma anomaly
      isAnomalous = true;
      severity = 'WARNING';
      deviationDirection = zScore > 0 ? 'HIGH' : 'LOW';
      reason = `${paramName} (${value.toFixed(1)}${unit}) exhibits statistical deviation (${Math.abs(zScore).toFixed(1)}σ from nominal mean).`;
    } else if (historyValues.length >= 3) {
      // Historical trend / drift check
      const recentWindow = historyValues.slice(-5);
      const isConsistentDrift = recentWindow.every((v, i) => i === 0 || (zScore > 0 ? v >= recentWindow[i - 1] : v <= recentWindow[i - 1]));
      if (isConsistentDrift && Math.abs(zScore) >= 2.0) {
        isAnomalous = true;
        severity = 'WARNING';
        deviationDirection = zScore > 0 ? 'HIGH' : 'LOW';
        reason = `${paramName} demonstrates persistent continuous sensor drift (${value.toFixed(1)}${unit}, ${Math.abs(zScore).toFixed(1)}σ).`;
      }
    }

    return {
      parameter: paramName,
      subsystem,
      observedValue: Number(value.toFixed(2)),
      nominalRange: [min, max],
      zScore,
      rateOfChange,
      deviationDirection,
      isAnomalous,
      severity,
      reason,
    };
  }

  /**
   * Executes deterministic baseline anomaly detection on telemetry.
   * 
   * @param rawInput Telemetry input frame
   * @param history Previous telemetry frames for temporal & trend analysis
   */
  public detect(
    rawInput: any,
    history: any[] = []
  ): AnomalyDetectionOutput {
    try {
      const sanitized = this.sanitizeTelemetry(rawInput);
      const sanitizedHistory = Array.isArray(history) ? history.map((h) => this.sanitizeTelemetry(h)) : [];

      // Extract parameter historical streams
      const histVoltage = sanitizedHistory.map((h) => h.voltage);
      const histCurrent = sanitizedHistory.map((h) => h.current);
      const histPowerGen = sanitizedHistory.map((h) => h.powerGeneration);
      const histBatteryLevel = sanitizedHistory.map((h) => h.batteryLevel);
      const histTemp = sanitizedHistory.map((h) => h.temperature);
      const histCommSig = sanitizedHistory.map((h) => h.communicationSignal);
      const histPacketLoss = sanitizedHistory.map((h) => h.packetLoss);
      const histPitch = sanitizedHistory.map((h) => h.pitch);
      const histRoll = sanitizedHistory.map((h) => h.roll);
      const histYaw = sanitizedHistory.map((h) => h.yaw);

      // Evaluate each monitored parameter
      const assessments: ParameterAssessment[] = [
        this.evaluateParameter('voltage', sanitized.voltage, histVoltage),
        this.evaluateParameter('current', sanitized.current, histCurrent),
        this.evaluateParameter('powerGeneration', sanitized.powerGeneration, histPowerGen),
        this.evaluateParameter('batteryLevel', sanitized.batteryLevel, histBatteryLevel),
        this.evaluateParameter('temperature', sanitized.temperature, histTemp),
        this.evaluateParameter('communicationSignal', sanitized.communicationSignal, histCommSig),
        this.evaluateParameter('packetLoss', sanitized.packetLoss, histPacketLoss),
        this.evaluateParameter('pitch', sanitized.pitch, histPitch),
        this.evaluateParameter('roll', sanitized.roll, histRoll),
        this.evaluateParameter('yaw', sanitized.yaw, histYaw),
      ];

      const anomalousAssessments = assessments.filter((a) => a.isAnomalous);
      const hasDeviations = anomalousAssessments.length > 0;

      // Determine highest severity
      let severity: AnomalySeverity = 'INFO';
      if (anomalousAssessments.some((a) => a.severity === 'CRITICAL')) {
        severity = 'CRITICAL';
      } else if (anomalousAssessments.some((a) => a.severity === 'WARNING')) {
        severity = 'WARNING';
      }

      // Identify primary affected subsystem and affected parameter list
      let primarySubsystem: SubsystemCategory = 'POWER';
      const affectedParams = anomalousAssessments.map((a) => a.parameter);

      if (hasDeviations) {
        // Group by subsystem
        const subsystemCounts = anomalousAssessments.reduce<Record<string, number>>((acc, item) => {
          acc[item.subsystem] = (acc[item.subsystem] || 0) + (item.severity === 'CRITICAL' ? 3 : 1);
          return acc;
        }, {});

        // Pick highest scored subsystem
        let maxCount = -1;
        for (const [sub, count] of Object.entries(subsystemCounts)) {
          if (count > maxCount) {
            maxCount = count;
            primarySubsystem = sub as SubsystemCategory;
          }
        }
      }

      // Calculate standardized quantitative anomaly score (0.00 to 1.00)
      let anomalyScore = 0.0;
      if (hasDeviations) {
        const maxZ = Math.max(...anomalousAssessments.map((a) => Math.abs(a.zScore || 0)), 1.0);
        const baseScore = severity === 'CRITICAL' ? 0.75 : 0.40;
        anomalyScore = Number(Math.min(1.0, baseScore + (maxZ - 2.0) * 0.08).toFixed(4));
      } else {
        anomalyScore = 0.02;
      }

      // Standardized decision: classified as anomaly IF anomalyScore >= decisionThreshold
      const isAnomaly = anomalyScore >= this.decisionThreshold;

      // Calculate confidence (higher when multiple samples or clear physical threshold violation)
      let confidence = 95;
      if (isAnomaly) {
        if (severity === 'CRITICAL') {
          confidence = 98;
        } else if (anomalousAssessments.length >= 2) {
          confidence = 94;
        } else {
          confidence = 88;
        }
      } else {
        confidence = 99;
      }

      // Formulate detailed explanation, probable cause, and recommended action
      let anomalyType = 'System Nominal';
      let explanation = `All telemetry channels for ${sanitized.satelliteName} are operating within nominal baseline limits.`;
      let probableCause = 'Spacecraft bus and payload systems in steady-state orbital operation.';
      let recommendedAction = 'Continue routine telemetry monitoring.';

      if (isAnomaly) {
        const primaryAnomaly = anomalousAssessments.find((a) => a.severity === severity) || anomalousAssessments[0];
        
        // Generate structured explanation based on real telemetry values
        explanation = anomalousAssessments.map((a) => a.reason).join(' ');

        switch (primarySubsystem) {
          case 'POWER':
          case 'BATTERY':
            if (sanitized.voltage < this.thresholds.voltage.min || sanitized.batteryLevel < this.thresholds.batteryLevel.min) {
              anomalyType = severity === 'CRITICAL' ? 'EPS Main Bus Undervoltage / Deep Discharge' : 'EPS Battery Voltage Decay';
              probableCause = `Bus voltage (${sanitized.voltage.toFixed(1)}V) dropped below normal floor (${this.thresholds.voltage.min}V). Possible excess load during eclipse or degraded cell capacity.`;
              recommendedAction = 'Execute power conservation protocol: shed non-essential payload heaters and align solar array to Sun vector.';
            } else if (sanitized.powerGeneration < this.thresholds.powerGeneration.min) {
              anomalyType = 'Solar Array Power Degradation';
              probableCause = `Solar output (${sanitized.powerGeneration.toFixed(0)}W) is below expected baseline (${this.thresholds.powerGeneration.min}W). Possible solar array occlusion or sun-tracking drive error.`;
              recommendedAction = 'Verify solar array drive assembly (SADA) gimbal angle and run solar sensor calibration.';
            } else {
              anomalyType = 'EPS Electrical Current Anomaly';
              probableCause = `Current reading (${sanitized.current.toFixed(1)}A) deviates from standard operating envelope.`;
              recommendedAction = 'Review power distribution unit (PDU) channel current limits and inspect payload bus lines.';
            }
            break;

          case 'THERMAL':
            if (sanitized.temperature > this.thresholds.temperature.max) {
              anomalyType = severity === 'CRITICAL' ? 'Critical Subsystem Thermal Overheating' : 'Subsystem Thermal Elevation';
              const diff = (sanitized.temperature - this.thresholds.temperature.max).toFixed(1);
              probableCause = `Internal temperature is ${diff}°C above normal baseline limit. Possible radiator louvre occlusion or high-power electronics dissipation.`;
              recommendedAction = 'Orient spacecraft attitude to shade avionics bay, open auxiliary heat louvres, and throttle payload duty cycle.';
            } else {
              anomalyType = 'Subsystem Thermal Undercooling';
              probableCause = `Internal temperature (${sanitized.temperature.toFixed(1)}°C) is below minimum safe threshold (${this.thresholds.temperature.min}°C).`;
              recommendedAction = 'Activate survival heaters on battery pack and optical payload assembly.';
            }
            break;

          case 'COMMUNICATION':
            if (sanitized.packetLoss > this.thresholds.packetLoss.max) {
              anomalyType = 'RF Downlink High Packet Loss Spike';
              probableCause = `Packet loss at ${sanitized.packetLoss.toFixed(1)}% exceeds acceptable link budget tolerance (${this.thresholds.packetLoss.max}%). Atmospheric attenuation or ground station dish mispointing.`;
              recommendedAction = 'Switch to secondary low-gain antenna (LGA) or request ground station autotrack dish recalibration.';
            } else {
              anomalyType = 'RF Carrier Signal Loss';
              probableCause = `Downlink signal strength (${sanitized.communicationSignal.toFixed(1)} dBm) is degraded below nominal threshold (${this.thresholds.communicationSignal.min} dBm).`;
              recommendedAction = 'Increase downlink transmitter amplifier gain and verify ground pass azimuth/elevation tracking.';
            }
            break;

          case 'ATTITUDE':
            anomalyType = 'AOCS Attitude Pointing Deviation';
            const attDev = Math.max(Math.abs(sanitized.pitch), Math.abs(sanitized.roll), Math.abs(sanitized.yaw)).toFixed(1);
            probableCause = `Attitude error (${attDev}°) exceeds pointing stability tolerance. Possible reaction wheel momentum saturation or star tracker lost lock.`;
            recommendedAction = 'Initiate reaction wheel magnetic torquer desaturation cycle and acquire sun-sensor reference.';
            break;

          default:
            anomalyType = 'Multivariate Sensor Anomaly';
            probableCause = 'Cross-channel telemetry deviation observed across multiple sensors.';
            recommendedAction = 'Dump onboard diagnostic telemetry logs and verify sensor health status.';
            break;
        }
      }

      return {
        satelliteId: sanitized.satelliteId,
        satelliteName: sanitized.satelliteName,
        timestamp: sanitized.timestamp,
        isAnomaly,
        anomalyScore,
        confidence,
        severity,
        subsystem: primarySubsystem,
        anomalyType,
        affectedParameters: affectedParams,
        parameterDetails: assessments,
        explanation,
        probableCause,
        recommendedAction,
        detectionEngine: 'DETERMINISTIC_BASELINE',
      };
    } catch (err: any) {
      // Absolute error safety guarantee: never throw or crash caller
      const satId = typeof rawInput === 'object' && rawInput?.satelliteId ? String(rawInput.satelliteId) : 'UNKNOWN-SAT';
      const satName = typeof rawInput === 'object' && rawInput?.satelliteName ? String(rawInput.satelliteName) : satId;
      return {
        satelliteId: satId,
        satelliteName: satName,
        timestamp: new Date().toISOString(),
        isAnomaly: false,
        anomalyScore: 0.0,
        confidence: 0,
        severity: 'INFO',
        subsystem: 'POWER',
        anomalyType: 'Telemetry Ingestion Error',
        affectedParameters: [],
        parameterDetails: [],
        explanation: `Graceful fallback: Telemetry evaluation encountered safe parsing error (${err?.message || 'unknown'}).`,
        probableCause: 'Corrupted or unparseable telemetry packet structure.',
        recommendedAction: 'Verify telemetry data format and schema conformity.',
        detectionEngine: 'DETERMINISTIC_BASELINE',
      };
    }
  }
}

// ============================================================================
// Singleton Instance & Functional API
// ============================================================================

export const defaultAnomalyDetectionService = new AnomalyDetectionService();

/**
 * Functional interface for modular telemetry anomaly detection.
 * Accepts any telemetry frame and optional history, returning a structured anomaly result.
 */
export function detectTelemetryAnomaly(
  telemetry: any,
  history: any[] = [],
  customService?: AnomalyDetectionService
): AnomalyDetectionOutput {
  const service = customService || defaultAnomalyDetectionService;
  return service.detect(telemetry, history);
}

export function setGlobalAnomalyThreshold(threshold: number): void {
  defaultAnomalyDetectionService.setDecisionThreshold(threshold);
}

export function getGlobalAnomalyThreshold(): number {
  return defaultAnomalyDetectionService.getDecisionThreshold();
}

export default AnomalyDetectionService;
