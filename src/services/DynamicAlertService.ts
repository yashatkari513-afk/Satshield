/**
 * SATSHIELD Dynamic Alerts Service
 * Evaluates real-time satellite telemetry, IsolationForest inference results,
 * and 6-step simulation diagnosis state to generate strictly telemetry-driven,
 * satellite-isolated alerts aligned with the authoritative Step 11 Operational Thresholds.
 */

export interface ParameterThreshold {
  subsystem: string;
  parameterKey: string;
  parameterName: string;
  unit: string;
  nominalMin: number;
  nominalMax: number;
  warningThreshold: number;
  criticalThreshold: number;
  direction: 'UP' | 'DOWN';
}

/**
 * Authoritative Operational Thresholds (Identical to Step 11 Predictive Maintenance Engine)
 */
export const AUTHORITATIVE_THRESHOLDS: Record<string, ParameterThreshold> = {
  temperature_c: {
    subsystem: 'THERMAL',
    parameterKey: 'temperature_c',
    parameterName: 'Core Internal Temperature',
    unit: '°C',
    nominalMin: 15.0,
    nominalMax: 45.0,
    warningThreshold: 50.0,
    criticalThreshold: 60.0,
    direction: 'UP',
  },
  voltage_v: {
    subsystem: 'POWER',
    parameterKey: 'voltage_v',
    parameterName: 'EPS Main Bus Voltage',
    unit: 'V',
    nominalMin: 25.0,
    nominalMax: 30.0,
    warningThreshold: 24.0,
    criticalThreshold: 22.5,
    direction: 'DOWN',
  },
  current_a: {
    subsystem: 'POWER',
    parameterKey: 'current_a',
    parameterName: 'Power Bus Current Draw',
    unit: 'A',
    nominalMin: 2.0,
    nominalMax: 12.0,
    warningThreshold: 14.0,
    criticalThreshold: 18.0,
    direction: 'UP',
  },
  battery_soc_percent: {
    subsystem: 'BATTERY',
    parameterKey: 'battery_soc_percent',
    parameterName: 'Battery State of Charge',
    unit: '%',
    nominalMin: 60.0,
    nominalMax: 100.0,
    warningThreshold: 50.0,
    criticalThreshold: 35.0,
    direction: 'DOWN',
  },
  solar_power_w: {
    subsystem: 'POWER',
    parameterKey: 'solar_power_w',
    parameterName: 'Solar Array Power Generation',
    unit: 'W',
    nominalMin: 350.0,
    nominalMax: 800.0,
    warningThreshold: 300.0,
    criticalThreshold: 200.0,
    direction: 'DOWN',
  },
  communication_signal_db: {
    subsystem: 'COMMUNICATION',
    parameterKey: 'communication_signal_db',
    parameterName: 'RF Downlink Carrier Signal',
    unit: 'dBm',
    nominalMin: -90.0,
    nominalMax: -50.0,
    warningThreshold: -95.0,
    criticalThreshold: -105.0,
    direction: 'DOWN',
  },
  vibration_g: {
    subsystem: 'AOCS',
    parameterKey: 'vibration_g',
    parameterName: 'Structural Vibration Amplitude',
    unit: 'g',
    nominalMin: 0.01,
    nominalMax: 0.15,
    warningThreshold: 0.20,
    criticalThreshold: 0.35,
    direction: 'UP',
  },
  attitude_error_deg: {
    subsystem: 'AOCS',
    parameterKey: 'attitude_error_deg',
    parameterName: '3-Axis Pointing Deviation Error',
    unit: '°',
    nominalMin: 0.0,
    nominalMax: 0.5,
    warningThreshold: 1.0,
    criticalThreshold: 2.5,
    direction: 'UP',
  },
};

export interface DynamicAlert {
  alert_id: string;
  satellite_id: string;
  satellite_name: string;
  subsystem: string;
  severity: 'CRITICAL' | 'WARNING' | 'ELEVATED' | 'WATCH' | 'NOMINAL' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
  source: 'telemetry' | 'ml_anomaly' | 'diagnosis' | 'predictive';
  parameter?: string;
  current_value?: number;
  threshold?: number;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged: boolean;
  resolved: boolean;
}

const SATELLITE_NAMES: Record<string, string> = {
  'SAT-001': 'AGIS-3',
  'SAT-002': 'SENTINEL-9',
  'SAT-003': 'ORBCOM-7',
  'SAT-004': 'HELIOS-1',
  'AGIS-3': 'AGIS-3',
  'SENTINEL-9': 'SENTINEL-9',
  'ORBCOM-7': 'ORBCOM-7',
  'HELIOS-1': 'HELIOS-1',
};

// In-memory alert state per satellite: { [satId]: DynamicAlert[] }
const alertsStore: Record<string, DynamicAlert[]> = {};

export class DynamicAlertService {
  private static normalizeId(satId: string): string {
    return (satId || 'SAT-001').trim().toUpperCase();
  }

  public static generateAlerts(
    satelliteId: string,
    telemetry: any,
    mlResult?: any,
    diagnosis?: any,
    simulationStep: number = 0
  ): DynamicAlert[] {
    const satKey = this.normalizeId(satelliteId);
    const satName = SATELLITE_NAMES[satKey] || satKey;
    const newAlerts: DynamicAlert[] = [];

    // Safe extraction of telemetry values
    const temp = Number(telemetry?.temperature ?? telemetry?.temperature_c ?? 24.5);
    const volt = Number(telemetry?.voltage ?? telemetry?.voltage_v ?? 28.5);
    const curr = Number(telemetry?.current ?? telemetry?.current_a ?? 6.5);
    const batt = Number(telemetry?.battery ?? telemetry?.battery_soc ?? telemetry?.battery_soc_percent ?? 90.0);
    const solar = Number(telemetry?.solar_power ?? telemetry?.solar_power_w ?? telemetry?.solarOutput ?? 650.0);
    const signal = Number(telemetry?.signal_strength ?? telemetry?.signalStrength ?? telemetry?.communication_signal_db ?? -75.0);
    const att = Number(telemetry?.attitude_error ?? telemetry?.attitude_error_deg ?? 0.05);
    const vib = Number(telemetry?.vibration ?? telemetry?.vibration_g ?? 0.04);

    const nowStr = new Date().toLocaleTimeString();

    // 1. Thermal Subsystem (Authoritative: Warning 50.0°C, Critical 60.0°C)
    const thThermal = AUTHORITATIVE_THRESHOLDS.temperature_c;
    if (temp >= thThermal.criticalThreshold) {
      newAlerts.push({
        alert_id: `ALT-THM-${satKey}-CRIT`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'THERMAL',
        severity: 'CRITICAL',
        title: `${satName} • Thermal Overheating`,
        message: `Core temperature reached ${temp.toFixed(1)}°C (critical threshold: ${thThermal.criticalThreshold.toFixed(1)}°C). Active heat rejection required.`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'temperature',
        current_value: temp,
        threshold: thThermal.criticalThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    } else if (temp >= thThermal.warningThreshold) {
      newAlerts.push({
        alert_id: `ALT-THM-${satKey}-WARN`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'THERMAL',
        severity: 'WARNING',
        title: `${satName} • Elevated Thermal Gradient`,
        message: `Temperature rising (${temp.toFixed(1)}°C, warning threshold: ${thThermal.warningThreshold.toFixed(1)}°C). Approaching operational margin.`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'temperature',
        current_value: temp,
        threshold: thThermal.warningThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    }

    // 2. Power Subsystem — EPS Bus Voltage & Current (Authoritative: Voltage Warning 24.0V, Critical 22.5V; Current Warning 14.0A, Critical 18.0A)
    const thVolt = AUTHORITATIVE_THRESHOLDS.voltage_v;
    const thCurr = AUTHORITATIVE_THRESHOLDS.current_a;
    if (volt <= thVolt.criticalThreshold || curr >= thCurr.criticalThreshold) {
      newAlerts.push({
        alert_id: `ALT-PWR-${satKey}-CRIT`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'POWER',
        severity: 'CRITICAL',
        title: `${satName} • EPS Main Bus Critical Undervoltage`,
        message: `EPS main bus voltage degraded to ${volt.toFixed(1)}V (critical: ${thVolt.criticalThreshold.toFixed(1)}V, current: ${curr.toFixed(1)}A). Bus power margin depleted.`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'voltage',
        current_value: volt,
        threshold: thVolt.criticalThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    } else if (volt <= thVolt.warningThreshold || curr >= thCurr.warningThreshold) {
      newAlerts.push({
        alert_id: `ALT-PWR-${satKey}-WARN`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'POWER',
        severity: 'WARNING',
        title: `${satName} • EPS Bus Voltage Sag`,
        message: `Bus voltage below nominal margin (${volt.toFixed(1)}V, warning: ${thVolt.warningThreshold.toFixed(1)}V, current: ${curr.toFixed(1)}A).`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'voltage',
        current_value: volt,
        threshold: thVolt.warningThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    }

    // 3. Battery Subsystem (Authoritative: Warning 50.0%, Critical 35.0%)
    const thBatt = AUTHORITATIVE_THRESHOLDS.battery_soc_percent;
    if (batt <= thBatt.criticalThreshold) {
      newAlerts.push({
        alert_id: `ALT-BAT-${satKey}-CRIT`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'BATTERY',
        severity: 'CRITICAL',
        title: `${satName} • Battery Deep Discharge Risk`,
        message: `Battery State of Charge depleted to ${batt.toFixed(0)}% (critical threshold: ${thBatt.criticalThreshold.toFixed(0)}%). Immediate load shedding required.`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'battery_soc',
        current_value: batt,
        threshold: thBatt.criticalThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    } else if (batt <= thBatt.warningThreshold) {
      newAlerts.push({
        alert_id: `ALT-BAT-${satKey}-WARN`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'BATTERY',
        severity: 'WARNING',
        title: `${satName} • Battery Reserve Depleting`,
        message: `Battery reserve at ${batt.toFixed(0)}% (warning threshold: ${thBatt.warningThreshold.toFixed(0)}%). Monitoring eclipse pass recharge rate.`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'battery_soc',
        current_value: batt,
        threshold: thBatt.warningThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    }

    // 4. Solar Array Power Subsystem (Authoritative: Warning 300.0W, Critical 200.0W)
    const thSolar = AUTHORITATIVE_THRESHOLDS.solar_power_w;
    if (solar <= thSolar.criticalThreshold) {
      newAlerts.push({
        alert_id: `ALT-SOL-${satKey}-CRIT`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'POWER',
        severity: 'CRITICAL',
        title: `${satName} • Critical Solar Power Drop`,
        message: `Solar array generation collapsed to ${solar.toFixed(0)}W (critical: ${thSolar.criticalThreshold.toFixed(0)}W). Power deficit actively drawing down battery.`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'solar_power',
        current_value: solar,
        threshold: thSolar.criticalThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    } else if (solar <= thSolar.warningThreshold) {
      newAlerts.push({
        alert_id: `ALT-SOL-${satKey}-WARN`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'POWER',
        severity: 'WARNING',
        title: `${satName} • Solar Generation Loss`,
        message: `Solar array output degraded to ${solar.toFixed(0)}W (warning threshold: ${thSolar.warningThreshold.toFixed(0)}W).`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'solar_power',
        current_value: solar,
        threshold: thSolar.warningThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    }

    // 5. Communication Subsystem (Authoritative: Warning -95.0 dBm, Critical -105.0 dBm)
    const thComm = AUTHORITATIVE_THRESHOLDS.communication_signal_db;
    if (signal <= thComm.criticalThreshold) {
      newAlerts.push({
        alert_id: `ALT-COM-${satKey}-CRIT`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'COMMUNICATION',
        severity: 'CRITICAL',
        title: `${satName} • RF Downlink Carrier Loss`,
        message: `Downlink carrier signal dropped to ${signal.toFixed(1)} dBm (critical: ${thComm.criticalThreshold.toFixed(1)} dBm). High risk of telemetry packet blackout.`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'signal_strength',
        current_value: signal,
        threshold: thComm.criticalThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    } else if (signal <= thComm.warningThreshold) {
      newAlerts.push({
        alert_id: `ALT-COM-${satKey}-WARN`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'COMMUNICATION',
        severity: 'WARNING',
        title: `${satName} • RF Signal Degradation`,
        message: `Downlink carrier attenuation detected (${signal.toFixed(1)} dBm, warning: ${thComm.warningThreshold.toFixed(1)} dBm). SNR margin reduced.`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'signal_strength',
        current_value: signal,
        threshold: thComm.warningThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    }

    // 6. AOCS / Attitude Control Subsystem (Authoritative: Attitude Warning 1.0°, Critical 2.5°; Vibration Warning 0.20g, Critical 0.35g)
    const thAtt = AUTHORITATIVE_THRESHOLDS.attitude_error_deg;
    const thVib = AUTHORITATIVE_THRESHOLDS.vibration_g;
    if (att >= thAtt.criticalThreshold || vib >= thVib.criticalThreshold) {
      newAlerts.push({
        alert_id: `ALT-AOC-${satKey}-CRIT`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'AOCS',
        severity: 'CRITICAL',
        title: `${satName} • Attitude Pointing Loss`,
        message: `3-axis attitude deviation error reached ${att.toFixed(2)}° (critical: ${thAtt.criticalThreshold.toFixed(1)}°, vibration: ${vib.toFixed(3)}g).`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'attitude_error',
        current_value: att,
        threshold: thAtt.criticalThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    } else if (att >= thAtt.warningThreshold || vib >= thVib.warningThreshold) {
      newAlerts.push({
        alert_id: `ALT-AOC-${satKey}-WARN`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: 'AOCS',
        severity: 'WARNING',
        title: `${satName} • Attitude Gyro Drift`,
        message: `Reaction wheel pointing error (${att.toFixed(2)}°, warning: ${thAtt.warningThreshold.toFixed(1)}°, vibration: ${vib.toFixed(3)}g). Gyro recalibration advised.`,
        timestamp: nowStr,
        source: 'telemetry',
        parameter: 'attitude_error',
        current_value: att,
        threshold: thAtt.warningThreshold,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    }

    // 7. ML Anomaly Alert from IsolationForest
    if (mlResult && (mlResult.is_anomaly || mlResult.prediction === 'ANOMALY' || (mlResult.raw_anomaly_score ?? 0.0) < 0.0)) {
      const rawScore = Number(mlResult.raw_anomaly_score ?? -0.15);
      newAlerts.push({
        alert_id: `ALT-ML-${satKey}`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: (mlResult.subsystem || 'POWER').toUpperCase(),
        severity: rawScore < -0.10 ? 'CRITICAL' : 'WARNING',
        title: `${satName} • AI Anomaly Detection (IsolationForest)`,
        message: `IsolationForest classified multivariate telemetry outlier (score: ${rawScore.toFixed(4)}).`,
        timestamp: nowStr,
        source: 'ml_anomaly',
        parameter: 'ml_score',
        current_value: rawScore,
        threshold: 0.0,
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    }

    // 8. Diagnosis-Grounded Alert (Simulation Step 6 or Active Diagnosis)
    if (diagnosis) {
      const diagSub = (diagnosis.subsystem || 'BATTERY').toUpperCase();
      const diagType = diagnosis.anomalyType || 'Telemetry Anomaly';
      const diagSev = (diagnosis.severity || 'CRITICAL').toUpperCase() as any;
      newAlerts.push({
        alert_id: `ALT-DIAG-${satKey}`,
        satellite_id: satKey,
        satellite_name: satName,
        subsystem: diagSub,
        severity: diagSev,
        title: `${satName} • ${diagType}`,
        message: diagnosis.explanation || `Autonomous diagnosis completed for ${satName}. Immediate mitigation recommended.`,
        timestamp: nowStr,
        source: 'diagnosis',
        status: 'ACTIVE',
        acknowledged: false,
        resolved: false,
      });
    }

    // Merge with existing store to preserve acknowledgment & resolution state
    if (!alertsStore[satKey]) {
      alertsStore[satKey] = [];
    }

    const existingMap = new Map<string, DynamicAlert>();
    alertsStore[satKey].forEach((a) => existingMap.set(a.alert_id, a));

    const finalAlerts: DynamicAlert[] = [];
    newAlerts.forEach((na) => {
      if (existingMap.has(na.alert_id)) {
        const existing = existingMap.get(na.alert_id)!;
        finalAlerts.push({
          ...na,
          acknowledged: existing.acknowledged,
          resolved: existing.resolved,
          status: existing.resolved ? 'RESOLVED' : existing.acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE',
        });
      } else {
        finalAlerts.push(na);
      }
    });

    alertsStore[satKey] = finalAlerts;
    return finalAlerts;
  }

  public static acknowledgeAlert(satelliteId: string, alertId: string): void {
    const satKey = this.normalizeId(satelliteId);
    if (alertsStore[satKey]) {
      alertsStore[satKey] = alertsStore[satKey].map((a) => {
        if (a.alert_id === alertId) {
          return {
            ...a,
            acknowledged: true,
            status: a.resolved ? 'RESOLVED' : 'ACKNOWLEDGED',
          };
        }
        return a;
      });
    }
  }

  public static resolveAlert(satelliteId: string, alertId: string): void {
    const satKey = this.normalizeId(satelliteId);
    if (alertsStore[satKey]) {
      alertsStore[satKey] = alertsStore[satKey].map((a) => {
        if (a.alert_id === alertId) {
          return {
            ...a,
            acknowledged: true,
            resolved: true,
            status: 'RESOLVED',
          };
        }
        return a;
      });
    }
  }

  public static resolveAll(satelliteId?: string): void {
    if (satelliteId) {
      const satKey = this.normalizeId(satelliteId);
      if (alertsStore[satKey]) {
        alertsStore[satKey] = alertsStore[satKey].map((a) => ({
          ...a,
          acknowledged: true,
          resolved: true,
          status: 'RESOLVED',
        }));
      }
    } else {
      Object.keys(alertsStore).forEach((key) => {
        alertsStore[key] = alertsStore[key].map((a) => ({
          ...a,
          acknowledged: true,
          resolved: true,
          status: 'RESOLVED',
        }));
      });
    }
  }

  public static getAlerts(satelliteId?: string): DynamicAlert[] {
    if (satelliteId) {
      const satKey = this.normalizeId(satelliteId);
      return alertsStore[satKey] || [];
    }
    const all: DynamicAlert[] = [];
    Object.values(alertsStore).forEach((list) => all.push(...list));
    return all;
  }

  public static getActiveCount(satelliteId?: string): number {
    return this.getAlerts(satelliteId).filter((a) => !a.resolved).length;
  }
}
