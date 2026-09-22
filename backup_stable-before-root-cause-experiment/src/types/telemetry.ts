export type HealthStatus = 'nominal' | 'warning' | 'critical';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export interface PowerSubsystem {
  status: HealthStatus;
  batteryCharge: number; // %
  batteryVoltage: number; // Volts
  batteryTemp: number; // Celsius
  solarOutput: number; // Watts
  solarAngle: number; // Degrees
  solarEfficiency: number; // %
  cycleCount: number;
  current: number; // Amperes
  powerConsumption: number; // Watts
  powerDrawBreakdown: {
    aocs: number;
    comm: number;
    payload: number;
    obc: number;
    thermal: number;
  };
  history: { time: string; batteryCharge: number; solarOutput: number; batteryVoltage: number; temp: number; current: number; powerDraw: number }[];
}

export interface ThermalSubsystem {
  status: HealthStatus;
  internalTemp: number; // °C
  externalTemp: number; // °C
  payloadTemp: number; // °C
  avionicsTemp: number; // °C
  heaterActive: boolean;
  radiatorStatus: 'Nominal' | 'Active Cooling' | 'Degraded';
  history: { time: string; internal: number; external: number; payload: number }[];
}

export interface AOCSSubsystem {
  status: HealthStatus;
  pitch: number; // degrees
  yaw: number; // degrees
  roll: number; // degrees
  rxWheelSpeedX: number; // RPM
  rxWheelSpeedY: number; // RPM
  rxWheelSpeedZ: number; // RPM
  gyroStatus: 'OK' | 'Calibrating' | 'Degraded';
  starTrackerStatus: 'Locked' | 'Searching' | 'Error';
  altitude: number; // km
  inclination: number; // degrees
  eccentricity: number;
  periodMinutes: number;
  groundStationPassCountdown: number; // seconds
}

export interface CommSubsystem {
  status: HealthStatus;
  signalStrength: number; // dBm (-120 to -60)
  snr: number; // dB
  uplinkRate: number; // Mbps
  downlinkRate: number; // Mbps
  antennaPointing: 'Optimal' | 'Adjusting' | 'Misaligned';
  contactWindowCountdown: number; // seconds
  packetLoss: number; // %
  bitErrorRate: number; // BER 1e-X
}

export interface PropulsionSubsystem {
  status: HealthStatus;
  fuelLevel: number; // %
  thrusterActive: boolean;
  lastFiring: string;
  deltaVRemaining: number; // m/s
  chamberPressure: number; // PSI
}

export interface PayloadSubsystem {
  status: HealthStatus;
  operationalState: 'Active Imaging' | 'Standby' | 'Calibration' | 'Offline';
  dataStorageUsed: number; // %
  solidStateDriveGB: number;
  sensorHealth: {
    opticalSensor: boolean;
    syntheticApertureRadar: boolean;
    multispectralCamera: boolean;
  };
}

export interface OBCSubsystem {
  status: HealthStatus;
  cpuLoad: number; // %
  memoryUsage: number; // %
  uptimeSeconds: number;
  rebootCount: number;
  softwareVersion: string;
  watchdogState: 'Armed' | 'Triggered' | 'Disabled';
  lastCommand: string;
  logs: { timestamp: string; level: string; text: string }[];
}

export interface SubsystemMap {
  power: PowerSubsystem;
  thermal: ThermalSubsystem;
  aocs: AOCSSubsystem;
  comm: CommSubsystem;
  propulsion: PropulsionSubsystem;
  payload: PayloadSubsystem;
  obc: OBCSubsystem;
}

export interface AIAnomaly {
  detectedAnomaly: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // e.g. 94%
  detectedTimestamp: string;
  description: string;
}

export interface AIPrediction {
  potentialIssue: string;
  probability: number; // e.g. 68%
  estimatedTimeDays: number; // e.g. 14
  recommendedAction: string;
}

export interface Satellite {
  id: string;
  name: string;
  noradId: number;
  callsign: string;
  orbitType: 'LEO' | 'GEO' | 'MEO' | 'SSO';
  overallHealth: number; // 0 - 100%
  healthStatus: HealthStatus;
  position: { x: number; y: number; z: number }; // 3D coordinates
  orbitRadius: number;
  orbitSpeed: number; // rad/s
  orbitAngle: number; // current angle
  inclination: number; // degrees
  color?: string; // Hex color
  subsystems: SubsystemMap;
  aiAnomaly?: AIAnomaly;
  aiPrediction?: AIPrediction;
}

export interface Alert {
  id: string;
  timestamp: string;
  satelliteId: string;
  satelliteName: string;
  subsystem: keyof SubsystemMap;
  severity: AlertSeverity;
  title: string;
  message: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface CommandLog {
  id: string;
  timestamp: string;
  satelliteId: string;
  command: string;
  status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILED';
  response: string;
}

export interface GroundStation {
  id: string;
  name: string;
  location: string;
  lat: number;
  lon: number;
  status: 'Active' | 'Standby' | 'Maintenance';
}

// ============================================================================
// UNIFIED SIH-READY CLEAN ARCHITECTURE DATA MODELS (STEPS 3, 5, 6)
// ============================================================================

export interface StructuredPrediction {
  status: 'NOT_AVAILABLE' | 'INSUFFICIENT_DATA' | 'STABLE' | 'DEGRADING' | 'HIGH_RISK' | 'THRESHOLD_APPROACHING' | string;
  trend: 'IMPROVING' | 'STABLE' | 'DEGRADING' | 'RAPIDLY_DEGRADING' | string;
  persistence: string;
  currentValue: number;
  baselineValue: number;
  threshold: number;
  rateOfChange: string;
  thresholdDistance: number;
  estimatedTimeToThreshold: string;
  explanation: string;
  limitations: string;
  method?: string;
}

/**
 * Standardized Structured Anomaly Object (Step 6)
 */
export interface StructuredAnomaly {
  anomalyId: string;
  satelliteId: string;
  satelliteName?: string;
  timestamp: string;
  subsystem: 'power' | 'thermal' | 'aocs' | 'comm' | 'propulsion' | 'payload' | 'obc' | string;
  anomalyType: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  anomalyScore: number; // Quantitative anomaly score (-1.0 to 1.0 or 0.0 to 1.0)
  confidence: number; // 0 - 100% confidence level
  affectedParameters: string[];
  explanation: string;
  probableCause: string;
  recommendedAction: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'INVESTIGATING';
  prediction?: StructuredPrediction;
}

/**
 * Explainable Subsystem Health Score Assessment (Step 5)
 */
export interface SubsystemHealthBreakdown {
  subsystem: string;
  score: number; // 0 - 100%
  status: HealthStatus;
  weight: number; // 0.0 - 1.0
  penalties: { parameter: string; penalty: number; reason: string }[];
  keyMetrics: Record<string, number | string>;
  activeAnomalies: string[];
  recommendations: string[];
}

export interface ExplainableHealthAssessment {
  satelliteId: string;
  overallScore: number; // 0 - 100%
  status: HealthStatus;
  healthGrade: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  trend: 'IMPROVING' | 'STABLE' | 'DEGRADING' | 'CRITICAL_ACCELERATING';
  calculatedAt: string;
  primaryRiskFactor?: string;
  subsystems: {
    power: SubsystemHealthBreakdown;
    thermal: SubsystemHealthBreakdown;
    aocs: SubsystemHealthBreakdown;
    comm: SubsystemHealthBreakdown;
    propulsion: SubsystemHealthBreakdown;
    payload: SubsystemHealthBreakdown;
    obc: SubsystemHealthBreakdown;
  };
}

/**
 * Clean Telemetry Frame with all Core Physical Parameters (Step 3)
 */
export interface CleanTelemetryFrame {
  satelliteId: string;
  timestamp: string;
  voltage: number; // Volts (EPS bus)
  current: number; // Amperes
  temperature: number; // °C
  batteryLevel: number; // %
  powerGeneration: number; // Watts
  communicationSignal: number; // dBm
  attitude: {
    pitch: number;
    yaw: number;
    roll: number;
    rxWheelSpeedX: number;
    rxWheelSpeedY: number;
    rxWheelSpeedZ: number;
  };
  payloadStatus: {
    operationalState: string;
    dataStorageUsed: number;
    sensorsNominal: boolean;
  };
  subsystems: SubsystemMap;
}

/**
 * Clean Unified Satellite Model (Step 3)
 */
export interface CleanSatelliteModel {
  satelliteId: string;
  name: string;
  mission: string;
  operator: string;
  status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  healthScore: number;
  healthStatus: HealthStatus;
  orbit: {
    orbitType: 'LEO' | 'GEO' | 'MEO' | 'SSO' | string;
    altitudeKm: number;
    inclinationDeg: number;
    periodMinutes?: number;
    eccentricity?: number;
    position?: { x: number; y: number; z: number };
  };
  lastUpdated: string;
  telemetrySource?: string;
  groundStation?: string;
  latestTelemetry?: CleanTelemetryFrame;
  activeAnomalies?: StructuredAnomaly[];
}

