/**
 * Machine Learning Anomaly Detection & Early Risk Prediction API Service
 * Connects frontend telemetry flows to the FastAPI Python Isolation Forest and
 * Temporal Trend Analyzer backend.
 * 
 * Supports configurable base URL, relative proxied paths, and public tunnel deployments.
 */

function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // When running in a browser on any non-localhost host (like trycloudflare.com),
  // use relative URLs so requests flow through the same public origin and Vite proxy.
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return '';
  }
  // Local development default (Vite proxy also handles /api on localhost)
  return '';
}

export interface MLTelemetryInput {
  satellite_id?: string;
  subsystem?: string;
  temperature_c?: number;
  voltage_v?: number;
  current_a?: number;
  battery_soc_percent?: number;
  solar_power_w?: number;
  communication_signal_db?: number;
  vibration_g?: number;
  attitude_error_deg?: number;
  battery_voltage?: number;
  battery_current?: number;
  battery_charge?: number;
  temperature?: number;
  solar_power?: number;
  communication_signal?: number;
  packet_loss?: number;
  pitch?: number;
  yaw?: number;
  roll?: number;
  payload_temp?: number;
}

export interface MLAffectedParameter {
  parameter: string;
  observed: number;
  nominal_range: [number, number];
  z_score: number;
  direction: 'ELEVATED_HIGH' | 'DEGRADED_LOW' | string;
}

export interface MLParameterDeviation {
  parameter: string;
  subsystem: string;
  observed_value: number;
  baseline_mean: number;
  normal_range: [number, number];
  z_score: number;
  rate_of_change: number;
  deviation_direction: string;
}

export interface MLAnomalyResponse {
  satellite_id?: string;
  status: 'normal' | 'anomaly' | string;
  prediction?: 'NORMAL' | 'ANOMALY' | string;
  is_anomaly: boolean;
  anomaly_score: number; // 0.00 to 1.00 continuous scale
  raw_decision_score?: number;
  raw_anomaly_score?: number;
  confidence: number; // 0 - 100%
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  subsystem: 'POWER' | 'BATTERY' | 'THERMAL' | 'COMMUNICATION' | 'ATTITUDE' | 'PAYLOAD' | 'SENSOR' | 'SYSTEM' | string;
  anomaly_type: string;
  model_type?: string;
  model_status?: string;
  feature_count?: number;
  affected_parameters: string[];
  affected_telemetry: MLAffectedParameter[];
  parameter_deviations?: Record<string, MLParameterDeviation>;
  evidence?: string[];
  explanation: string;
  probable_causes: string[];
  recommended_action: string;
  timestamp: string;
  model: string;
  sanitized_telemetry?: Record<string, number>;
  data_quality?: string;
  is_offline?: boolean;
}

export interface MLScenarioInfo {
  id: string;
  key: string;
  name: string;
  subsystem: string;
  expected_severity: string;
  description: string;
}

export interface MLScenarioResponse {
  scenario: MLScenarioInfo;
  satellite_id: string;
  telemetry: Record<string, number>;
  detection: MLAnomalyResponse;
}

export interface MLAnomalyEventRecord {
  id: string;
  satellite_id: string;
  satellite_name?: string;
  timestamp: string;
  subsystem: string;
  anomaly_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string;
  anomaly_score: number;
  confidence: number;
  affected_parameters: string[];
  explanation: string;
  probable_cause?: string;
  recommended_action: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  created_at?: string;
}

export interface MLModelValidationMetrics {
  dataset_type: string;
  total_samples: number;
  normal_samples: number;
  anomaly_samples: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  false_negative_rate: number;
  mean_anomaly_score_normal: number;
  mean_anomaly_score_anomaly: number;
  confusion_matrix: {
    true_positives: number;
    false_positives: number;
    true_negatives: number;
    false_negatives: number;
  };
}

export interface MLParameterTrend {
  parameter: string;
  observed_value?: number;
  rate_of_change: number;
  rolling_mean: number;
  rolling_std: number;
  z_score: number;
  trend_direction: string;
  is_degrading: boolean;
}

export interface MLEarlyRiskResponse {
  status: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  risk_score: number;
  trend_status: string;
  overall_trend?: string;
  early_warning: boolean;
  affected_parameters: string[];
  parameter_trends?: MLParameterTrend[];
  evidence: string[];
  recommended_monitoring: string[];
  isolation_forest_score?: number;
  sample_count?: number;
  timestamp?: string;
  model: string;
}

export interface MLHealthResponse {
  status: string;
  database: string;
  ml_model: string;
  temporal_analyzer?: string;
  total_features_monitored?: number;
}

/**
 * Checks API and ML model health.
 */
export async function checkMLHealth(): Promise<MLHealthResponse | null> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[MLService] FastAPI backend not reachable at', base || window?.location?.origin, err);
    return null;
  }
}

/**
 * Sends telemetry frame to Python FastAPI /api/anomaly/detect.
 * Returns real Isolation Forest ML inference result.
 */
export async function detectMLAnomaly(telemetry: MLTelemetryInput): Promise<MLAnomalyResponse | null> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/anomaly/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetry),
    });

    if (!res.ok) {
      console.warn('[MLService] API returned status', res.status);
      return null;
    }

    const data: MLAnomalyResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('[MLService] Could not reach ML backend, continuing gracefully:', err);
    return null;
  }
}

/**
 * Sends sequence of telemetry frames to Python FastAPI /api/anomaly/predict.
 * Returns temporal trend analysis and early risk forecast.
 */
export async function predictMLRisk(sequence: MLTelemetryInput[]): Promise<MLEarlyRiskResponse | null> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/anomaly/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence }),
    });

    if (!res.ok) {
      return null;
    }

    const data: MLEarlyRiskResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('[MLService] Could not reach ML prediction backend:', err);
    return null;
  }
}

/**
 * Fetches directory of all 10 realistic anomaly scenarios.
 */
export async function fetchAnomalyScenarios(): Promise<MLScenarioInfo[]> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/anomaly/scenarios`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return [
    { id: '1', key: 'battery_degradation', name: 'Battery Degradation & Capacity Decay', subsystem: 'BATTERY', expected_severity: 'WARNING', description: 'Gradual capacity loss and elevated internal resistance.' },
    { id: '2', key: 'battery_voltage_drop', name: 'EPS Bus Sudden Undervoltage', subsystem: 'POWER', expected_severity: 'CRITICAL', description: 'Main bus undervoltage below 23.5V.' },
    { id: '3', key: 'solar_power_degradation', name: 'Solar Array Occlusion & Power Drop', subsystem: 'POWER', expected_severity: 'WARNING', description: 'Array tracking error causing power collapse.' },
    { id: '4', key: 'overheating', name: 'Sustained Subsystem Overheating', subsystem: 'THERMAL', expected_severity: 'CRITICAL', description: 'Internal temperature sustained above 52°C.' },
    { id: '5', key: 'rapid_temperature_increase', name: 'Rapid Thermal Rate of Change Surge', subsystem: 'THERMAL', expected_severity: 'CRITICAL', description: 'High dT/dt indicating thermal runaway.' },
    { id: '6', key: 'communication_signal_degradation', name: 'RF Downlink Signal Loss', subsystem: 'COMMUNICATION', expected_severity: 'WARNING', description: 'Carrier signal strength dropping below -105 dBm.' },
    { id: '7', key: 'packet_loss_spike', name: 'Downlink Packet Loss Surge', subsystem: 'COMMUNICATION', expected_severity: 'WARNING', description: 'Packet loss spike above 8%.' },
    { id: '8', key: 'attitude_instability', name: 'AOCS Attitude Drift & Wheel Saturation', subsystem: 'ATTITUDE', expected_severity: 'CRITICAL', description: 'Reaction wheel saturation causing pointing error.' },
    { id: '9', key: 'sensor_drift', name: 'Telemetry Sensor Calibration Drift', subsystem: 'SENSOR', expected_severity: 'WARNING', description: 'Continuous bias drift exceeding 2.5 sigma.' },
    { id: '10', key: 'sudden_telemetry_spike', name: 'Transient Electrical / Thermal Spike', subsystem: 'POWER', expected_severity: 'WARNING', description: 'Momentary electrostatic discharge current surge.' },
  ];
}

/**
 * Triggers a specific anomaly scenario on the backend and runs full ML inference.
 */
export async function triggerAnomalyScenario(
  scenarioIdOrKey: string,
  step: number = 5,
  satelliteId: string = 'SAT-002'
): Promise<MLScenarioResponse | null> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/anomaly/scenarios/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_id_or_key: scenarioIdOrKey, step, satellite_id: satelliteId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[MLService] Scenario trigger error:', err);
  }
  return null;
}

/**
 * Fetches quantitative benchmark validation metrics.
 */
export async function fetchModelValidationMetrics(): Promise<MLModelValidationMetrics | null> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/anomaly/metrics`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

/**
 * Fetches structured anomaly event history.
 */
export async function fetchAnomalyHistory(filters?: {
  satellite_id?: string;
  severity?: string;
  subsystem?: string;
  status?: string;
}): Promise<MLAnomalyEventRecord[]> {
  const base = getApiBaseUrl();
  const query = new URLSearchParams();
  if (filters?.satellite_id) query.append('satellite_id', filters.satellite_id);
  if (filters?.severity) query.append('severity', filters.severity);
  if (filters?.subsystem) query.append('subsystem', filters.subsystem);
  if (filters?.status) query.append('status', filters.status);

  try {
    const res = await fetch(`${base}/api/anomalies?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return [];
}

/**
 * Acknowledges an anomaly event.
 */
export async function acknowledgeAnomalyEvent(anomalyId: string): Promise<boolean> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/anomalies/${anomalyId}/acknowledge`, { method: 'PATCH' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resolves an anomaly event.
 */
export async function resolveAnomalyEvent(anomalyId: string): Promise<boolean> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/anomalies/${anomalyId}/resolve`, { method: 'PATCH' });
    return res.ok;
  } catch {
    return false;
  }
}
