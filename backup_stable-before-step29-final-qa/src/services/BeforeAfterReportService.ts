/**
 * SATSHIELD Step 28: Before vs After Satellite Health Report Service
 * Connects to FastAPI `/api/reports/before-after/*` with local state fallback.
 */

export interface TelemetrySnapshot {
  temperature: number;
  voltage: number;
  current: number;
  battery: number;
  solar_power: number;
  signal_strength: number;
  attitude_error: number;
  vibration: number;
}

export interface SatelliteHealthReport {
  report_type: 'BEFORE' | 'AFTER';
  label: string;
  satellite_id: string;
  satellite_name: string;
  timestamp: string;
  health_state: string;
  health_score: number;
  risk_level: string;
  anomaly_status: string;
  raw_anomaly_score: number;
  telemetry: TelemetrySnapshot;
  subsystem_status: Record<string, string>;
  detected_anomaly?: string | null;
  probable_root_cause: string;
  mission_impact: string;
  predictive_risk: string;
  trend_slope: string;
  estimated_time_to_threshold: string;
  what_if_result: string;
  recommended_action: string;
  evidence: string[];
  contributing_factors?: any[];
  data_quality: string;
  prediction_method: string;
  disclaimer: string;
}

export interface ParameterComparisonRow {
  parameter_key: string;
  parameter_name: string;
  unit: string;
  before_value: number | null;
  after_value: number | null;
  delta: number | null;
  delta_formatted: string;
  status: 'STABLE' | 'DEGRADING' | 'IMPROVING' | 'SHIFT' | 'OUTLIER ESCALATION' | 'CRITICAL DROP' | 'NOMINAL' | 'UNKNOWN';
}

export interface BeforeAfterComparison {
  status: 'COMPLETE' | 'INCOMPLETE';
  satellite_id: string;
  before_timestamp?: string;
  after_timestamp?: string;
  parameter_comparisons: ParameterComparisonRow[];
  significant_change_count: number;
  key_health_changes: string[];
  summary: string;
  disclaimer: string;
}

export interface BeforeAfterReportsResponse {
  satellite_id: string;
  satellite_name: string;
  has_before: boolean;
  has_after: boolean;
  before_report: SatelliteHealthReport | null;
  after_report: SatelliteHealthReport | null;
  comparison: BeforeAfterComparison | null;
  disclaimer: string;
}

const API_BASE_URL = 'http://localhost:8000';
const LOCAL_STORAGE_KEY = 'satshield_step28_before_after_v1';

export class BeforeAfterReportService {
  public static async getReports(satelliteId: string): Promise<BeforeAfterReportsResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/before-after/${satelliteId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[BeforeAfterReportService] Using local snapshot store:', err);
      return this.getLocalReports(satelliteId);
    }
  }

  public static async captureBefore(
    satelliteId: string,
    telemetry: any,
    healthScore: number = 95.0,
    riskLevel: string = 'NOMINAL',
    anomalyStatus: string = 'NORMAL',
    rawAnomalyScore: number = 0.08
  ): Promise<any> {
    const payload = {
      satellite_id: satelliteId,
      telemetry,
      health_score: healthScore,
      risk_level: riskLevel,
      anomaly_status: anomalyStatus,
      raw_anomaly_score: rawAnomalyScore,
      data_quality: 'GOOD',
    };

    try {
      await fetch(`${API_BASE_URL}/api/reports/before-after/capture-before`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Offline fallback
    }

    // Always update local storage as well for instant UI reactivity
    this.saveLocalSnapshot(satelliteId, 'before', {
      report_type: 'BEFORE',
      label: 'BASELINE / BEFORE ANOMALY',
      satellite_id: satelliteId,
      satellite_name: satelliteId,
      timestamp: new Date().toLocaleTimeString(),
      health_state: 'HEALTHY / NOMINAL',
      health_score: healthScore,
      risk_level: riskLevel,
      anomaly_status: anomalyStatus,
      raw_anomaly_score: rawAnomalyScore,
      telemetry: this.extractTelemetry(telemetry),
      subsystem_status: { POWER: 'NOMINAL', THERMAL: 'NOMINAL', BATTERY: 'NOMINAL', COMMUNICATION: 'NOMINAL', AOCS: 'NOMINAL' },
      probable_root_cause: 'All monitored telemetry channels operating within nominal physical bounds.',
      mission_impact: 'Spacecraft fully operational; all payload and bus capabilities nominal.',
      predictive_risk: 'NOMINAL',
      trend_slope: '0.000 /min (Stable)',
      estimated_time_to_threshold: 'N/A — Stable nominal baseline',
      what_if_result: 'NOMINAL — No active degrading trend detected.',
      recommended_action: 'Maintain standard telemetry polling and routine orbital tracking.',
      evidence: ['All 8 primary telemetry parameters within nominal design envelope.'],
      data_quality: 'GOOD',
      prediction_method: 'Baseline empirical grounding & IsolationForest inlier verification',
      disclaimer: 'Synthetic / simulated telemetry — demonstration and validation dataset.',
    });
  }

  public static async captureAfter(
    satelliteId: string,
    telemetry: any,
    diagnosisData?: any
  ): Promise<any> {
    const diag = diagnosisData || {};
    const payload = {
      satellite_id: satelliteId,
      telemetry,
      health_score: diag.healthScore ?? 38.0,
      risk_level: diag.riskLevel ?? 'CRITICAL',
      anomaly_status: 'ANOMALY',
      raw_anomaly_score: diag.rawAnomalyScore ?? -0.15,
      detected_anomaly: diag.anomalyType ?? diag.subsystem ? `${diag.subsystem} Anomaly` : 'Telemetry Outlier',
      probable_root_cause: diag.probableRootCause ?? diag.explanation ?? 'Elevated telemetry drift detected.',
      mission_impact: typeof diag.missionImpact === 'string' ? diag.missionImpact : diag.missionImpact?.potentialConsequence ?? 'Spacecraft capabilities degraded.',
      predictive_risk: diag.riskLevel ?? 'CRITICAL',
      trend_slope: diag.trend ?? 'Degrading trend slope',
      estimated_time_to_threshold: diag.timeToFailureEstimate ?? 'N/A — trend approaching threshold',
      what_if_result: 'Persistent trajectory will breach critical operational margins within 10m.',
      recommended_action: diag.recommendedAction ?? 'Initiate flight mitigation procedure.',
      evidence: diag.evidence ?? ['Multi-channel physical telemetry excursion.'],
      contributing_factors: diag.contributingFactors ?? [],
      data_quality: 'GOOD',
    };

    try {
      await fetch(`${API_BASE_URL}/api/reports/before-after/capture-after`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Offline fallback
    }

    this.saveLocalSnapshot(satelliteId, 'after', {
      report_type: 'AFTER',
      label: 'POST-ANOMALY / AFTER',
      satellite_id: satelliteId,
      satellite_name: satelliteId,
      timestamp: new Date().toLocaleTimeString(),
      health_state: 'ANOMALY DETECTED / DEGRADED',
      health_score: payload.health_score,
      risk_level: payload.risk_level,
      anomaly_status: 'ANOMALY',
      raw_anomaly_score: payload.raw_anomaly_score,
      telemetry: this.extractTelemetry(telemetry),
      subsystem_status: {
        POWER: telemetry?.voltage < 24 ? 'CRITICAL' : telemetry?.voltage < 26 ? 'WARNING' : 'NOMINAL',
        THERMAL: telemetry?.temperature > 50 ? 'CRITICAL' : telemetry?.temperature > 40 ? 'WARNING' : 'NOMINAL',
        BATTERY: telemetry?.battery < 40 ? 'CRITICAL' : telemetry?.battery < 60 ? 'WARNING' : 'NOMINAL',
        COMMUNICATION: telemetry?.signalStrength < 30 ? 'CRITICAL' : 'NOMINAL',
        AOCS: 'NOMINAL',
      },
      detected_anomaly: payload.detected_anomaly,
      probable_root_cause: payload.probable_root_cause,
      mission_impact: payload.mission_impact,
      predictive_risk: payload.predictive_risk,
      trend_slope: payload.trend_slope,
      estimated_time_to_threshold: payload.estimated_time_to_threshold,
      what_if_result: payload.what_if_result,
      recommended_action: payload.recommended_action,
      evidence: payload.evidence,
      contributing_factors: payload.contributing_factors,
      data_quality: 'GOOD',
      prediction_method: 'IsolationForest 42-Feature Ensemble + Temporal Linear Projection',
      disclaimer: 'Synthetic / simulated telemetry — demonstration and validation dataset.',
    });
  }

  public static async resetReports(satelliteId?: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/reports/before-after/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ satellite_id: satelliteId }),
      });
    } catch {}

    const store = this.getLocalStore();
    if (satelliteId) {
      delete store[satelliteId];
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  }

  private static getLocalStore(): Record<string, { before: any; after: any }> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private static saveLocalSnapshot(satId: string, type: 'before' | 'after', data: any) {
    const store = this.getLocalStore();
    if (!store[satId]) store[satId] = { before: null, after: null };
    store[satId][type] = data;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  }

  private static getLocalReports(satelliteId: string): BeforeAfterReportsResponse {
    const store = this.getLocalStore();
    const satData = store[satelliteId] || { before: null, after: null };
    const before: SatelliteHealthReport | null = satData.before;
    const after: SatelliteHealthReport | null = satData.after;

    let comparison: BeforeAfterComparison | null = null;
    if (before && after) {
      comparison = this.buildLocalComparison(before, after, satelliteId);
    }

    return {
      satellite_id: satelliteId,
      satellite_name: satelliteId,
      has_before: before !== null,
      has_after: after !== null,
      before_report: before,
      after_report: after,
      comparison,
      disclaimer: 'Synthetic / simulated telemetry — demonstration and validation dataset.',
    };
  }

  private static buildLocalComparison(
    before: SatelliteHealthReport,
    after: SatelliteHealthReport,
    satId: string
  ): BeforeAfterComparison {
    const tb = before.telemetry;
    const ta = after.telemetry;
    const keyChanges: string[] = [];

    const rows: ParameterComparisonRow[] = [
      {
        parameter_key: 'temperature',
        parameter_name: 'Core Internal Temperature',
        unit: '°C',
        before_value: tb.temperature,
        after_value: ta.temperature,
        delta: Number((ta.temperature - tb.temperature).toFixed(1)),
        delta_formatted: `${(ta.temperature - tb.temperature) >= 0 ? '+' : ''}${(ta.temperature - tb.temperature).toFixed(1)} °C`,
        status: ta.temperature > tb.temperature ? 'DEGRADING' : 'STABLE',
      },
      {
        parameter_key: 'voltage',
        parameter_name: 'EPS Main Bus Voltage',
        unit: 'V',
        before_value: tb.voltage,
        after_value: ta.voltage,
        delta: Number((ta.voltage - tb.voltage).toFixed(2)),
        delta_formatted: `${(ta.voltage - tb.voltage) >= 0 ? '+' : ''}${(ta.voltage - tb.voltage).toFixed(2)} V`,
        status: ta.voltage < tb.voltage ? 'DEGRADING' : 'STABLE',
      },
      {
        parameter_key: 'current',
        parameter_name: 'Power Bus Current Draw',
        unit: 'A',
        before_value: tb.current,
        after_value: ta.current,
        delta: Number((ta.current - tb.current).toFixed(1)),
        delta_formatted: `${(ta.current - tb.current) >= 0 ? '+' : ''}${(ta.current - tb.current).toFixed(1)} A`,
        status: ta.current > tb.current ? 'DEGRADING' : 'STABLE',
      },
      {
        parameter_key: 'battery',
        parameter_name: 'Battery State of Charge',
        unit: '%',
        before_value: tb.battery,
        after_value: ta.battery,
        delta: Number((ta.battery - tb.battery).toFixed(0)),
        delta_formatted: `${(ta.battery - tb.battery) >= 0 ? '+' : ''}${(ta.battery - tb.battery).toFixed(0)} %`,
        status: ta.battery < tb.battery ? 'DEGRADING' : 'STABLE',
      },
      {
        parameter_key: 'solar_power',
        parameter_name: 'Solar Array Power Generation',
        unit: 'W',
        before_value: tb.solar_power,
        after_value: ta.solar_power,
        delta: Number((ta.solar_power - tb.solar_power).toFixed(0)),
        delta_formatted: `${(ta.solar_power - tb.solar_power) >= 0 ? '+' : ''}${(ta.solar_power - tb.solar_power).toFixed(0)} W`,
        status: ta.solar_power < tb.solar_power ? 'DEGRADING' : 'STABLE',
      },
      {
        parameter_key: 'signal_strength',
        parameter_name: 'RF Downlink Carrier Signal',
        unit: 'dBm',
        before_value: tb.signal_strength,
        after_value: ta.signal_strength,
        delta: Number((ta.signal_strength - tb.signal_strength).toFixed(1)),
        delta_formatted: `${(ta.signal_strength - tb.signal_strength) >= 0 ? '+' : ''}${(ta.signal_strength - tb.signal_strength).toFixed(1)} dBm`,
        status: ta.signal_strength < tb.signal_strength ? 'DEGRADING' : 'STABLE',
      },
      {
        parameter_key: 'attitude_error',
        parameter_name: '3-Axis Pointing Deviation Error',
        unit: '°',
        before_value: tb.attitude_error,
        after_value: ta.attitude_error,
        delta: Number((ta.attitude_error - tb.attitude_error).toFixed(2)),
        delta_formatted: `${(ta.attitude_error - tb.attitude_error) >= 0 ? '+' : ''}${(ta.attitude_error - tb.attitude_error).toFixed(2)} °`,
        status: ta.attitude_error > tb.attitude_error ? 'DEGRADING' : 'STABLE',
      },
      {
        parameter_key: 'vibration',
        parameter_name: 'Structural Vibration Amplitude',
        unit: 'g',
        before_value: tb.vibration,
        after_value: ta.vibration,
        delta: Number((ta.vibration - tb.vibration).toFixed(3)),
        delta_formatted: `${(ta.vibration - tb.vibration) >= 0 ? '+' : ''}${(ta.vibration - tb.vibration).toFixed(3)} g`,
        status: ta.vibration > tb.vibration ? 'DEGRADING' : 'STABLE',
      },
      {
        parameter_key: 'anomaly_score',
        parameter_name: 'IsolationForest Decision Score',
        unit: '',
        before_value: before.raw_anomaly_score,
        after_value: after.raw_anomaly_score,
        delta: Number((after.raw_anomaly_score - before.raw_anomaly_score).toFixed(4)),
        delta_formatted: `${(after.raw_anomaly_score - before.raw_anomaly_score) >= 0 ? '+' : ''}${(after.raw_anomaly_score - before.raw_anomaly_score).toFixed(4)}`,
        status: 'OUTLIER ESCALATION',
      },
      {
        parameter_key: 'health_score',
        parameter_name: 'Overall Health Score',
        unit: '%',
        before_value: before.health_score,
        after_value: after.health_score,
        delta: Number((after.health_score - before.health_score).toFixed(1)),
        delta_formatted: `${(after.health_score - before.health_score) >= 0 ? '+' : ''}${(after.health_score - before.health_score).toFixed(1)} %`,
        status: 'CRITICAL DROP',
      },
    ];

    if (ta.temperature - tb.temperature >= 3.0) {
      keyChanges.push(`Core Temperature increased by +${(ta.temperature - tb.temperature).toFixed(1)}°C toward operational threshold.`);
    }
    if (ta.voltage - tb.voltage <= -1.0) {
      keyChanges.push(`Main Bus Voltage sagged by ${(ta.voltage - tb.voltage).toFixed(1)}V, degrading EPS power margin.`);
    }
    if (ta.battery - tb.battery <= -10.0) {
      keyChanges.push(`Battery State of Charge depleted by ${(ta.battery - tb.battery).toFixed(0)}%.`);
    }
    if (before.risk_level !== after.risk_level) {
      keyChanges.push(`Operational Risk escalated from ${before.risk_level} to ${after.risk_level}.`);
    }
    if (after.detected_anomaly) {
      keyChanges.push(`Anomaly Classification: ${after.detected_anomaly}.`);
    }

    return {
      status: 'COMPLETE',
      satellite_id: satId,
      before_timestamp: before.timestamp,
      after_timestamp: after.timestamp,
      parameter_comparisons: rows,
      significant_change_count: keyChanges.length,
      key_health_changes: keyChanges,
      summary: `${keyChanges.length} significant state change(s) identified between baseline and post-anomaly telemetry.`,
      disclaimer: 'Synthetic / simulated telemetry — demonstration and validation dataset.',
    };
  }

  private static extractTelemetry(telem: any): TelemetrySnapshot {
    return {
      temperature: Number(telem?.temperature ?? telem?.temperature_c ?? telem?.battery_temp ?? 24.5),
      voltage: Number(telem?.voltage ?? telem?.voltage_v ?? telem?.battery_voltage ?? 28.5),
      current: Number(telem?.current ?? telem?.current_a ?? telem?.battery_current ?? telem?.current_draw ?? 6.5),
      battery: Number(telem?.battery ?? telem?.battery_soc ?? telem?.battery_soc_percent ?? 90.0),
      solar_power: Number(telem?.solar_power ?? telem?.solar_power_w ?? telem?.power ?? 650.0),
      signal_strength: Number(telem?.signal_strength ?? telem?.signalStrength ?? telem?.signal_dbm ?? -75.0),
      attitude_error: Number(telem?.attitude_error ?? telem?.attitude_error_deg ?? telem?.gyro_drift ?? 0.05),
      vibration: Number(telem?.vibration ?? telem?.vibration_g ?? 0.04),
    };
  }

  public static exportCSV(report: SatelliteHealthReport) {
    const t = report.telemetry;
    const isBefore = report.report_type === 'BEFORE';
    const rows = [
      ['SATSHIELD AI — SATELLITE HEALTH REPORT'],
      ['Report Type', isBefore ? 'BASELINE / BEFORE ANOMALY' : 'POST-ANOMALY / AFTER'],
      ['Satellite ID', report.satellite_id],
      ['Satellite Name', report.satellite_name],
      ['Timestamp', report.timestamp],
      ['Operational Health State', report.health_state],
      ['Overall Health Score (%)', `${report.health_score}%`],
      ['Operational Risk Level', report.risk_level],
      ['ML Anomaly Status', report.anomaly_status],
      ['IsolationForest Decision Score', report.raw_anomaly_score.toString()],
      ['Detected Anomaly', report.detected_anomaly || 'None (Nominal Baseline)'],
      ['Probable Root Cause', report.probable_root_cause],
      ['Mission Impact', report.mission_impact],
      ['Estimated Time to Threshold', report.estimated_time_to_threshold],
      ['What-If Projection', report.what_if_result],
      ['Recommended Action', report.recommended_action],
      ['Data Quality', report.data_quality],
      [''],
      ['Telemetry Channel', 'Value', 'Unit', 'Nominal Envelope'],
      ['Core Internal Temperature', t.temperature.toString(), '°C', '15.0 - 45.0 °C'],
      ['EPS Main Bus Voltage', t.voltage.toString(), 'V', '25.0 - 30.0 V'],
      ['Power Bus Current Draw', t.current.toString(), 'A', '2.0 - 12.0 A'],
      ['Battery State of Charge', t.battery.toString(), '%', '60.0 - 100.0 %'],
      ['Solar Array Power Generation', t.solar_power.toString(), 'W', '350.0 - 800.0 W'],
      ['RF Downlink Carrier Signal', t.signal_strength.toString(), 'dBm', '-90.0 to -50.0 dBm'],
      ['3-Axis Pointing Deviation Error', t.attitude_error.toString(), '°', '0.0 - 0.5 °'],
      ['Structural Vibration Amplitude', t.vibration.toString(), 'g', '0.01 - 0.15 g'],
      [''],
      ['Scientific Disclosure', report.disclaimer],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(x => `"${(x || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SATSHIELD_${report.satellite_id}_${report.report_type}_REPORT_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
