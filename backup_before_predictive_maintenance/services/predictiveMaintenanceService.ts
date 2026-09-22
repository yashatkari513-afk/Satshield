/**
 * SATSHIELD — Predictive Maintenance & Temporal Trend Analysis Service
 *
 * Provides safe, deterministic, explainable, and transparent early-risk assessment
 * and degradation trend estimation on top of live spacecraft telemetry streams.
 *
 * Core Guarantees:
 * - NO hardcoded fixed times-to-failure (no fixed "18 hours" or "24 hours").
 * - NO fabricated AI failure probabilities.
 * - Handles insufficient history (< 3 frames) safely with INSUFFICIENT_DATA.
 * - Isolated per satellite and per subsystem anomaly.
 * - Explicitly labeled method: "Trend-based temporal analysis & linear degradation projection".
 * - Transparent operational disclaimer on all projections.
 */

export type TrendClassification = 'STABLE' | 'IMPROVING' | 'DEGRADING' | 'RAPIDLY_DEGRADING';

export type PredictionStatus =
  | 'NOT_AVAILABLE'
  | 'INSUFFICIENT_DATA'
  | 'STABLE'
  | 'DEGRADING'
  | 'HIGH_RISK'
  | 'THRESHOLD_APPROACHING';

export interface TelemetryPoint {
  timestamp?: string;
  voltage?: number;
  temperature?: number;
  battery?: number;
  batteryVoltage?: number;
  batteryCharge?: number;
  batteryCurrent?: number;
  solarPower?: number;
  solarOutput?: number;
  communicationSignal?: number;
  signalStrength?: number;
  packetLoss?: number;
  pitch?: number;
  yaw?: number;
  roll?: number;
  [key: string]: any;
}

export interface OperationalThreshold {
  subsystem: string;
  parameter: string;
  unit: string;
  nominalMin: number;
  nominalMax: number;
  criticalMin?: number;
  criticalMax?: number;
  direction: 'UP' | 'DOWN' | 'BOTH';
  slopeDegradingThreshold: number; // minimum |dX/dt| per min to be considered degrading
}

export interface PredictiveMaintenanceOutput {
  status: PredictionStatus;
  trend: TrendClassification;
  persistence: string;
  consecutiveAnomalyCount: number;
  currentValue: number;
  baselineValue: number;
  threshold: number;
  unit: string;
  rateOfChange: string;
  rawSlopePerMin: number;
  thresholdDistance: number;
  estimatedTimeToThreshold: string;
  estimatedTimeToThresholdFormatted: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isProjectionReliable: boolean;
  explanation: string;
  limitations: string;
  method: string;
  affectedParameter: string;
  subsystem: string;
  missionImpact: {
    affectedCapability: string;
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    potentialConsequence: string;
  };
  operationalRecommendations: {
    immediate: string;
    monitor: string;
    escalation: string;
  };
}

/**
 * Centralized Simulation Operational Thresholds
 * Labeled clearly as Simulation Operational Thresholds.
 */
export const SIMULATION_OPERATIONAL_THRESHOLDS: Record<string, OperationalThreshold> = {
  BATTERY: {
    subsystem: 'BATTERY',
    parameter: 'battery_voltage',
    unit: 'V',
    nominalMin: 28.0,
    nominalMax: 32.0,
    criticalMin: 20.0,
    direction: 'DOWN',
    slopeDegradingThreshold: 0.15, // V/min
  },
  POWER: {
    subsystem: 'POWER',
    parameter: 'solar_power',
    unit: 'W',
    nominalMin: 500.0,
    nominalMax: 850.0,
    criticalMin: 200.0,
    direction: 'DOWN',
    slopeDegradingThreshold: 10.0, // W/min
  },
  THERMAL: {
    subsystem: 'THERMAL',
    parameter: 'temperature',
    unit: '°C',
    nominalMin: 18.0,
    nominalMax: 30.0,
    criticalMax: 60.0,
    direction: 'UP',
    slopeDegradingThreshold: 0.4, // °C/min
  },
  COMMUNICATION: {
    subsystem: 'COMMUNICATION',
    parameter: 'communication_signal',
    unit: 'dBm',
    nominalMin: -85.0,
    nominalMax: -70.0,
    criticalMin: -115.0,
    direction: 'DOWN',
    slopeDegradingThreshold: 1.5, // dBm/min
  },
  ATTITUDE: {
    subsystem: 'ATTITUDE',
    parameter: 'pitch',
    unit: '°',
    nominalMin: -2.0,
    nominalMax: 2.0,
    criticalMin: -10.0,
    criticalMax: 10.0,
    direction: 'BOTH',
    slopeDegradingThreshold: 0.3, // deg/min
  },
  SENSOR: {
    subsystem: 'SENSOR',
    parameter: 'sensor_calibration',
    unit: '°C',
    nominalMin: 20.0,
    nominalMax: 28.0,
    criticalMax: 50.0,
    direction: 'UP',
    slopeDegradingThreshold: 0.3,
  },
};

export class PredictiveMaintenanceService {
  /**
   * Safe linear least-squares regression slope calculation (dX/dt)
   * Samples assumed at uniform time step (default 5 seconds per step = 12 steps/min)
   */
  private calculateSlope(values: number[], stepSeconds: number = 5): number {
    const n = values.length;
    if (n < 2) return 0.0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const tMin = (i * stepSeconds) / 60.0; // time in minutes
      sumX += tMin;
      sumY += values[i];
      sumXY += tMin * values[i];
      sumX2 += tMin * tMin;
    }

    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-9) return 0.0;

    return (n * sumXY - sumX * sumY) / denom; // Units per minute
  }

  /**
   * Calculates Exponential Moving Average (EMA)
   */
  private calculateEMA(values: number[], alpha: number = 0.35): number[] {
    if (values.length === 0) return [];
    const ema: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      ema.push(alpha * values[i] + (1 - alpha) * ema[i - 1]);
    }
    return ema;
  }

  /**
   * Run-length persistence: counts consecutive frames violating nominal envelope
   */
  private calculatePersistence(
    values: number[],
    nominalMin: number,
    nominalMax: number,
    direction: 'UP' | 'DOWN' | 'BOTH'
  ): number {
    let count = 0;
    for (let i = values.length - 1; i >= 0; i--) {
      const v = values[i];
      let isAbnormal = false;
      if (direction === 'DOWN' && v < nominalMin) isAbnormal = true;
      else if (direction === 'UP' && v > nominalMax) isAbnormal = true;
      else if (direction === 'BOTH' && (v < nominalMin || v > nominalMax)) isAbnormal = true;

      if (isAbnormal) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Helper to extract target metric value from telemetry point
   */
  private extractMetricValue(point: TelemetryPoint, param: string): number | null {
    if (!point || typeof point !== 'object') return null;

    switch (param) {
      case 'battery_voltage':
        return point.batteryVoltage ?? point.voltage ?? null;
      case 'solar_power':
        return point.solarPower ?? point.solarOutput ?? (point.power ? point.power * 8 : null);
      case 'temperature':
        return point.temperature ?? null;
      case 'communication_signal':
        return point.communicationSignal ?? point.signalStrength ?? null;
      case 'pitch':
        return point.pitch ?? 0.0;
      case 'sensor_calibration':
        return point.temperature ?? null;
      default:
        return (point as any)[param] ?? null;
    }
  }

  /**
   * Main Analysis Function
   */
  public analyze(
    satelliteId: string,
    currentTelemetry: TelemetryPoint,
    telemetryHistory: TelemetryPoint[] = [],
    anomalyContext?: {
      subsystem?: string;
      severity?: 'INFO' | 'WARNING' | 'CRITICAL';
      anomalyType?: string;
    }
  ): PredictiveMaintenanceOutput {
    const rawSubsystem = (anomalyContext?.subsystem || 'BATTERY').toUpperCase();
    const subsystem = SIMULATION_OPERATIONAL_THRESHOLDS[rawSubsystem] ? rawSubsystem : 'BATTERY';
    const thresholdConfig = SIMULATION_OPERATIONAL_THRESHOLDS[subsystem];

    // Combine history + current point
    const allFrames = [...telemetryHistory, currentTelemetry].filter(Boolean);

    // 1. Check for Insufficient Data (< 3 frames)
    if (allFrames.length < 3) {
      const currentVal = this.extractMetricValue(currentTelemetry, thresholdConfig.parameter) ?? thresholdConfig.nominalMin;
      return {
        status: 'INSUFFICIENT_DATA',
        trend: 'STABLE',
        persistence: 'Insufficient historical data',
        consecutiveAnomalyCount: 0,
        currentValue: currentVal,
        baselineValue: currentVal,
        threshold: thresholdConfig.criticalMin ?? thresholdConfig.criticalMax ?? 0,
        unit: thresholdConfig.unit,
        rateOfChange: 'N/A (Data buffer building)',
        rawSlopePerMin: 0.0,
        thresholdDistance: 0.0,
        estimatedTimeToThreshold: 'Not available — insufficient reliable trend data',
        estimatedTimeToThresholdFormatted: 'Not available — insufficient reliable trend data',
        riskLevel: 'LOW',
        isProjectionReliable: false,
        explanation: 'Telemetry sequence contains fewer than 3 historical frames. Minimum 3 frames required for reliable temporal analysis.',
        limitations: 'Projections require at least 3 consecutive telemetry frames.',
        method: 'Trend-based temporal analysis & linear degradation projection',
        affectedParameter: thresholdConfig.parameter,
        subsystem: thresholdConfig.subsystem,
        missionImpact: {
          affectedCapability: `${subsystem} subsystem telemetry monitoring`,
          impactLevel: 'LOW',
          potentialConsequence: 'Telemetry buffer initializing across orbital pass.',
        },
        operationalRecommendations: {
          immediate: 'Maintain nominal tracking and telemetry sampling.',
          monitor: 'Allow telemetry buffer to accumulate frames across ground pass.',
          escalation: 'No escalation required during buffer initialization.',
        },
      };
    }

    // 2. Extract Values & Compute Metrics
    const rawValues: number[] = [];
    for (const frame of allFrames) {
      const v = this.extractMetricValue(frame, thresholdConfig.parameter);
      if (v !== null && !isNaN(v)) {
        rawValues.push(v);
      }
    }

    if (rawValues.length < 3) {
      return this.analyze(satelliteId, currentTelemetry, [], anomalyContext);
    }

    const smoothedValues = this.calculateEMA(rawValues, 0.4);
    const currentValue = smoothedValues[smoothedValues.length - 1];
    const baselineValue = smoothedValues[0];
    const slopePerMin = this.calculateSlope(smoothedValues, 5); // 5 sec steps
    const persistence = this.calculatePersistence(
      rawValues,
      thresholdConfig.nominalMin,
      thresholdConfig.nominalMax,
      thresholdConfig.direction
    );

    // 3. Classify Trend
    let trend: TrendClassification = 'STABLE';
    const absSlope = Math.abs(slopePerMin);

    if (thresholdConfig.direction === 'DOWN') {
      if (slopePerMin < -thresholdConfig.slopeDegradingThreshold * 2.5) {
        trend = 'RAPIDLY_DEGRADING';
      } else if (slopePerMin < -thresholdConfig.slopeDegradingThreshold) {
        trend = 'DEGRADING';
      } else if (slopePerMin > thresholdConfig.slopeDegradingThreshold) {
        trend = 'IMPROVING';
      } else {
        trend = 'STABLE';
      }
    } else if (thresholdConfig.direction === 'UP') {
      if (slopePerMin > thresholdConfig.slopeDegradingThreshold * 2.5) {
        trend = 'RAPIDLY_DEGRADING';
      } else if (slopePerMin > thresholdConfig.slopeDegradingThreshold) {
        trend = 'DEGRADING';
      } else if (slopePerMin < -thresholdConfig.slopeDegradingThreshold) {
        trend = 'IMPROVING';
      } else {
        trend = 'STABLE';
      }
    } else {
      // BOTH directions (e.g. Attitude Pitch/Yaw)
      if (absSlope > thresholdConfig.slopeDegradingThreshold * 2.5) {
        trend = 'RAPIDLY_DEGRADING';
      } else if (absSlope > thresholdConfig.slopeDegradingThreshold) {
        trend = 'DEGRADING';
      } else {
        trend = 'STABLE';
      }
    }

    // 4. Calculate Operational Threshold Distance & Time to Threshold
    let operationalThreshold = 0;
    let thresholdDistance = 0;
    let isHeadingTowardsThreshold = false;

    if (thresholdConfig.direction === 'DOWN') {
      operationalThreshold = thresholdConfig.criticalMin ?? thresholdConfig.nominalMin * 0.7;
      thresholdDistance = Math.max(0, currentValue - operationalThreshold);
      if (slopePerMin < -1e-4 && currentValue > operationalThreshold) {
        isHeadingTowardsThreshold = true;
      }
    } else if (thresholdConfig.direction === 'UP') {
      operationalThreshold = thresholdConfig.criticalMax ?? thresholdConfig.nominalMax * 1.5;
      thresholdDistance = Math.max(0, operationalThreshold - currentValue);
      if (slopePerMin > 1e-4 && currentValue < operationalThreshold) {
        isHeadingTowardsThreshold = true;
      }
    } else {
      // BOTH
      const target = currentValue >= 0 ? (thresholdConfig.criticalMax ?? 10) : (thresholdConfig.criticalMin ?? -10);
      operationalThreshold = target;
      thresholdDistance = Math.max(0, Math.abs(target) - Math.abs(currentValue));
      if (absSlope > 1e-4) {
        isHeadingTowardsThreshold = true;
      }
    }

    // 5. Estimated Time to Operational Threshold
    let estimatedTimeToThresholdFormatted = 'Stable trend — no threshold crossing projected';
    let isProjectionReliable = false;

    if (trend === 'STABLE' || trend === 'IMPROVING' || !isHeadingTowardsThreshold) {
      estimatedTimeToThresholdFormatted = 'Stable trend — no threshold crossing projected';
    } else if (absSlope > 1e-4) {
      const minutesRemaining = thresholdDistance / absSlope;
      isProjectionReliable = true;

      if (minutesRemaining < 1.0) {
        estimatedTimeToThresholdFormatted = `~${Math.max(1, Math.round(minutesRemaining * 60))} sec to operational threshold (${operationalThreshold}${thresholdConfig.unit})`;
      } else if (minutesRemaining < 60.0) {
        estimatedTimeToThresholdFormatted = `~${minutesRemaining.toFixed(1)} min to operational threshold (${operationalThreshold}${thresholdConfig.unit})`;
      } else {
        const hours = minutesRemaining / 60.0;
        estimatedTimeToThresholdFormatted = `~${hours.toFixed(1)} hours to operational threshold (${operationalThreshold}${thresholdConfig.unit})`;
      }
    }

    // 6. Deterministic Risk Assessment
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let status: PredictionStatus = 'STABLE';

    if (trend === 'RAPIDLY_DEGRADING' || persistence >= 4) {
      riskLevel = thresholdDistance < (thresholdConfig.nominalMax - thresholdConfig.nominalMin) * 0.5 ? 'CRITICAL' : 'HIGH';
      status = riskLevel === 'CRITICAL' ? 'THRESHOLD_APPROACHING' : 'DEGRADING';
    } else if (trend === 'DEGRADING' || persistence >= 2) {
      riskLevel = 'MEDIUM';
      status = 'DEGRADING';
    } else {
      riskLevel = 'LOW';
      status = 'STABLE';
    }

    // 7. Rate of Change Formatted
    const rateSign = slopePerMin >= 0 ? '+' : '';
    const rateOfChangeText = `${rateSign}${slopePerMin.toFixed(2)} ${thresholdConfig.unit}/min`;

    // 8. Explainability
    const persistenceText =
      persistence > 0
        ? `${persistence} consecutive observation${persistence > 1 ? 's' : ''} outside nominal bounds`
        : 'Telemetry parameters currently within nominal envelope';

    let explanationText = '';
    if (trend === 'STABLE') {
      explanationText = `${thresholdConfig.parameter} is operating stably at ${currentValue.toFixed(1)} ${thresholdConfig.unit} (Nominal: ${thresholdConfig.nominalMin}-${thresholdConfig.nominalMax} ${thresholdConfig.unit}).`;
    } else {
      explanationText = `${thresholdConfig.parameter} demonstrates a ${trend.toLowerCase().replace('_', ' ')} trajectory (${rateOfChangeText}) across ${rawValues.length} historical frames, currently at ${currentValue.toFixed(1)} ${thresholdConfig.unit} (Distance to threshold: ${thresholdDistance.toFixed(1)} ${thresholdConfig.unit}).`;
    }

    // 9. Mission Impact & Recommendations
    const missionImpactMap: Record<string, { capability: string; consequence: string }> = {
      BATTERY: {
        capability: 'Main EPS electrical power distribution',
        consequence: 'Risk of bus brownout and loss of non-essential payload operations during eclipse.',
      },
      POWER: {
        capability: 'Solar array power generation',
        consequence: 'Reduced energy budget for payload imaging and high-power RF downlink transmitters.',
      },
      THERMAL: {
        capability: 'Spacecraft thermal management and avionics temperature stability',
        consequence: 'Risk of thermal latch-up or irreversible sensor calibration degradation.',
      },
      COMMUNICATION: {
        capability: 'Ground station RF downlink carrier link',
        consequence: 'Loss of mission telemetry downlink and command loss-of-signal during pass.',
      },
      ATTITUDE: {
        capability: 'AOCS gyroscopic pointing and star-tracker alignment',
        consequence: 'Antenna pointing offset causing high downlink packet loss and ground tracking deviation.',
      },
      SENSOR: {
        capability: 'Payload sensor diagnostic and calibration matrix',
        consequence: 'Degraded science payload data fidelity requiring recalibration routine.',
      },
    };

    const impactInfo = missionImpactMap[subsystem] || missionImpactMap.BATTERY;

    const actionMap: Record<string, { immediate: string; monitor: string; escalation: string }> = {
      BATTERY: {
        immediate: 'Uplink power-saving mode command and shed secondary payload heater loads.',
        monitor: 'Track battery charge decay rate and bus voltage across eclipse ingress.',
        escalation: 'If voltage drops below 22.0V, initiate safe-hold power conservation sequence.',
      },
      POWER: {
        immediate: 'Adjust solar array drive mechanism (SADM) orientation toward solar vector.',
        monitor: 'Verify photovoltaic current output per solar cell string.',
        escalation: 'If power generation falls below 300W, isolate non-essential sub-systems.',
      },
      THERMAL: {
        immediate: 'Deploy auxiliary radiator louvers and reorient attitude away from sun direct vector.',
        monitor: 'Sample avionics bay and battery thermistors at 1 Hz.',
        escalation: 'If payload temperature exceeds 55°C, cycle off payload processing unit.',
      },
      COMMUNICATION: {
        immediate: 'Switch to secondary S-band transponder and increase ground station uplink power.',
        monitor: 'Log bit error rate (BER) and packet loss percentage on next ground station pass.',
        escalation: 'If packet loss exceeds 15%, execute autonomous antenna gimbal re-acquisition routine.',
      },
      ATTITUDE: {
        immediate: 'Initiate reaction wheel momentum desaturation routine using magnetic torquers.',
        monitor: 'Verify gyro rate drift and star tracker lock status across orbit.',
        escalation: 'If pointing error exceeds 5°, switch AOCS control loop to sun-pointing safe mode.',
      },
      SENSOR: {
        immediate: 'Execute onboard sensor zero-point recalibration sequence.',
        monitor: 'Verify diagnostic sensor readouts against redundant telemetry sensors.',
        escalation: 'If sensor reading continues drift, flag sensor as degraded in telemetry matrix.',
      },
    };

    const actionInfo = actionMap[subsystem] || actionMap.BATTERY;

    return {
      status,
      trend,
      persistence: persistenceText,
      consecutiveAnomalyCount: persistence,
      currentValue: round2(currentValue),
      baselineValue: round2(baselineValue),
      threshold: round2(operationalThreshold),
      unit: thresholdConfig.unit,
      rateOfChange: rateOfChangeText,
      rawSlopePerMin: round2(slopePerMin),
      thresholdDistance: round2(thresholdDistance),
      estimatedTimeToThreshold: estimatedTimeToThresholdFormatted,
      estimatedTimeToThresholdFormatted,
      riskLevel,
      isProjectionReliable,
      explanation: explanationText,
      limitations: 'Trend-based estimate if the current trend persists. Spacecraft orbital states or eclipse cycles may alter rates.',
      method: 'Trend-based temporal analysis & linear degradation projection',
      affectedParameter: thresholdConfig.parameter,
      subsystem: thresholdConfig.subsystem,
      missionImpact: {
        affectedCapability: impactInfo.capability,
        impactLevel: riskLevel,
        potentialConsequence: impactInfo.consequence,
      },
      operationalRecommendations: {
        immediate: actionInfo.immediate,
        monitor: actionInfo.monitor,
        escalation: actionInfo.escalation,
      },
    };
  }
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export const predictiveMaintenanceService = new PredictiveMaintenanceService();
