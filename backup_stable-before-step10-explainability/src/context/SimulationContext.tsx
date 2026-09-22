import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  detectMLAnomaly,
  predictMLRisk,
  triggerAnomalyScenario,
  MLAnomalyResponse,
  MLEarlyRiskResponse,
  MLTelemetryInput
} from '../services/mlAnomalyService';
import {
  fetchSatellites,
  registerNewSatellite,
  CreateSatellitePayload,
  ApiSatellite
} from '../services/SatelliteService';
import {
  predictiveMaintenanceService,
  PredictiveMaintenanceOutput,
} from '../services/predictiveMaintenanceService';
import {
  setGlobalAnomalyThreshold,
  getGlobalAnomalyThreshold,
} from '../services/anomalyDetectionService';

export type SimulationStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TelemetryReading {
  power: number;
  battery: number;
  temperature: number;
  voltage: number;
  voltageStatus: string;
  signalStrength: number;
  linkStatus: string;
  anomalyProbability: number;
  healthScore: number;
  batteryTrend: number[];
  tempTrend: number[];
  voltageTrend: number[];
}

export interface SatelliteEntry {
  id: string;
  name: string;
  mission: string;
  operator?: string;
  orbitType?: string;
  status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  color?: string;
  altitude?: string;
  telemetry: TelemetryReading;
}

export interface SatelliteTelemetryMap {
  [satId: string]: SatelliteEntry;
}

export interface AnomalyAlert {
  id: string;
  satId: string;
  satName: string;
  subsystem: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  desc: string;
  time: string;
  currentBattery: number;
  temperature: number;
  voltageStr: string;
  aiConfidence: number;
  predictedRisk: string;
  estimatedTimeToCritical: string;
  recommendedAction: string;
  acknowledged?: boolean;
}

export interface TelemetryEvidenceItem {
  parameter: string;
  observed: string;
  baseline: string;
  deviation: string;
  status: string;
  trendDirection: 'INCREASING' | 'DEGRADING' | 'VOLATILE' | 'STABLE';
  isAnomalous: boolean;
}

export interface RankedCauseItem {
  rank: 'HIGH CONTRIBUTION' | 'MEDIUM CONTRIBUTION' | 'POSSIBLE CONTRIBUTION';
  cause: string;
  context: string;
}

export interface MissionImpactInfo {
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedCapability: string;
  potentialConsequence: string;
}

export interface OperationalActionPlan {
  immediate: string;
  monitor: string;
  escalation: string;
}

export interface ActiveDiagnosis {
  satelliteId: string;
  satelliteName: string;
  orbitType?: string;
  anomalyType: string;
  subsystem: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  anomalyScore: string;
  rawAnomalyScore: number;
  detectionConfidence: string;
  confidence?: string;
  detectionMethod: string;
  decisionThreshold: string;
  affectedParameters: string[];
  parameterTrends?: {
    parameter: string;
    rate_of_change: number;
    rolling_mean: number;
    rolling_std: number;
    z_score: number;
    trend_direction: string;
    is_degrading: boolean;
  }[];
  evidence: string[];
  telemetryEvidence: TelemetryEvidenceItem[];
  decisionExplanation: string;
  explanation: string;
  probableCauses: RankedCauseItem[];
  missionImpact: MissionImpactInfo;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  trendStatus: 'DEGRADING' | 'STABLE' | 'RECOVERING' | 'VOLATILE';
  trendTrajectory: string;
  persistence: string;
  rateOfChange: string;
  timeToFailureEstimate: string;
  observationWindow: string;
  trend: string;
  recommendedAction: string;
  operationalActions: OperationalActionPlan;
  mitigationDetails?: string;
  actionButtonLabel: string;
  simulationNoticeText: string;
  historySparkline?: {
    label: string;
    unit: string;
    values: number[];
    color: string;
  };
  timestamp: string;
  modelName?: string;
  predictiveMaintenance?: PredictiveMaintenanceOutput;
}

interface SimulationContextType {
  demoMode: boolean;
  setDemoMode: (val: boolean) => void;
  simulationStep: SimulationStep;
  isSimulating: boolean;
  missionStatus: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  telemetryLastUpdatedSec: number;
  satellitesData: SatelliteTelemetryMap;
  activeSatelliteId: string;
  setActiveSatelliteId: (id: string) => void;
  startAnomalySimulation: (targetSatId?: string, scenarioKey?: string, severityTarget?: 'INFO' | 'WARNING' | 'CRITICAL') => void;
  simulateCustomAnomaly: (satId: string, anomalyType: string, severity: 'INFO' | 'WARNING' | 'CRITICAL') => void;
  resetDemo: () => void;
  selectedAlert: AnomalyAlert | null;
  isAlertModalOpen: boolean;
  openAlertModal: (alert: AnomalyAlert) => void;
  closeAlertModal: () => void;
  isAIDiagnosisModalOpen: boolean;
  openAIDiagnosisModal: () => void;
  closeAIDiagnosisModal: () => void;
  acknowledgeAlert: (alertId: string) => void;
  powerSavingModeActive: boolean;
  activatePowerSavingMode: () => void;
  stepName: string;
  currentDiagnosis: ActiveDiagnosis | null;
  latestMLResult: MLAnomalyResponse | null;
  latestMLRiskResult: MLEarlyRiskResponse | null;
  mlInferenceOffline: boolean;
  lastInferenceLatencyMs: number | null;
  triggerMLInference: (customTelemetry?: MLTelemetryInput) => Promise<MLAnomalyResponse | null>;
  addNewSatellite: (payload: CreateSatellitePayload) => Promise<ApiSatellite>;
  refreshSatellitesList: () => Promise<void>;
  // Modals for satellite addition, simulate anomaly, send report
  isAddSatelliteModalOpen: boolean;
  openAddSatelliteModal: () => void;
  closeAddSatelliteModal: () => void;
  isSimulateModalOpen: boolean;
  openSimulateModal: () => void;
  closeSimulateModal: () => void;
  isSendReportModalOpen: boolean;
  openSendReportModal: (satId?: string) => void;
  closeSendReportModal: () => void;
  targetReportSatId: string | null;
  // Model Validation Benchmark Modal & Active Detection Threshold
  isModelValidationModalOpen: boolean;
  openModelValidationModal: () => void;
  closeModelValidationModal: () => void;
  anomalyThreshold: number;
  setAnomalyThreshold: (th: number) => void;
}



const INITIAL_BASELINE_MAP: SatelliteTelemetryMap = {
  'SAT-001': {
    id: 'SAT-001',
    name: 'AGIS-3',
    mission: 'COMMS SATELLITE',
    operator: 'ISRO',
    orbitType: 'LEO',
    status: 'NOMINAL',
    color: '#00BFFF',
    altitude: '405.2 km',
    telemetry: {
      power: 94,
      battery: 88,
      temperature: 28.4,
      voltage: 28.6,
      voltageStatus: 'Normal (28.6V)',
      signalStrength: 96,
      linkStatus: 'STRONG',
      anomalyProbability: 1.2,
      healthScore: 98,
      batteryTrend: [88, 88, 87, 88, 88, 88, 88],
      tempTrend: [28.2, 28.3, 28.4, 28.4, 28.5, 28.4, 28.4],
      voltageTrend: [28.6, 28.6, 28.5, 28.6, 28.6, 28.6, 28.6],
    },
  },
  'SAT-002': {
    id: 'SAT-002',
    name: 'SENTINEL-9',
    mission: 'EARTH OBSERVATION',
    operator: 'ESA',
    orbitType: 'LEO',
    status: 'NOMINAL',
    color: '#EF4444',
    altitude: '520.6 km',
    telemetry: {
      power: 88,
      battery: 74,
      temperature: 38.0,
      voltage: 28.4,
      voltageStatus: 'Normal (28.4V)',
      signalStrength: 92,
      linkStatus: 'STRONG',
      anomalyProbability: 2.4,
      healthScore: 95,
      batteryTrend: [75, 75, 74, 74, 75, 74, 74],
      tempTrend: [37.8, 37.9, 38.0, 38.0, 38.1, 38.0, 38.0],
      voltageTrend: [28.4, 28.4, 28.4, 28.3, 28.4, 28.4, 28.4],
    },
  },
  'SAT-003': {
    id: 'SAT-003',
    name: 'ORBCOM-7',
    mission: 'COMMUNICATIONS',
    operator: 'NASA',
    orbitType: 'GEO',
    status: 'NOMINAL',
    color: '#8B5CF6',
    altitude: '35,786 km',
    telemetry: {
      power: 96,
      battery: 92,
      temperature: 22.1,
      voltage: 28.8,
      voltageStatus: 'Normal (28.8V)',
      signalStrength: 98,
      linkStatus: 'STRONG',
      anomalyProbability: 0.8,
      healthScore: 99,
      batteryTrend: [92, 92, 91, 92, 92, 92, 92],
      tempTrend: [22.0, 22.1, 22.1, 22.2, 22.1, 22.1, 22.1],
      voltageTrend: [28.8, 28.8, 28.7, 28.8, 28.8, 28.8, 28.8],
    },
  },
  'SAT-004': {
    id: 'SAT-004',
    name: 'HELIOS-1',
    mission: 'IMAGING SATELLITE',
    operator: 'JAXA',
    orbitType: 'SSO',
    status: 'WARNING',
    color: '#F59E0B',
    altitude: '408.8 km',
    telemetry: {
      power: 79,
      battery: 72,
      temperature: 42.6,
      voltage: 27.2,
      voltageStatus: 'Nominal (27.2V)',
      signalStrength: 84,
      linkStatus: 'DEGRADED',
      anomalyProbability: 18.5,
      healthScore: 87,
      batteryTrend: [74, 73, 73, 72, 72, 72, 72],
      tempTrend: [41.5, 41.8, 42.1, 42.3, 42.5, 42.6, 42.6],
      voltageTrend: [27.5, 27.4, 27.3, 27.3, 27.2, 27.2, 27.2],
    },
  },
};

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [simulationStep, setSimulationStep] = useState<SimulationStep>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeSatelliteId, setActiveSatelliteId] = useState<string>('SAT-001');
  const [satellitesData, setSatellitesData] = useState<SatelliteTelemetryMap>(INITIAL_BASELINE_MAP);
  const [telemetryLastUpdatedSec, setTelemetryLastUpdatedSec] = useState<number>(2);
  const [powerSavingModeActive, setPowerSavingModeActive] = useState<boolean>(false);
  const [latestMLResult, setLatestMLResult] = useState<MLAnomalyResponse | null>(null);
  const [latestMLRiskResult, setLatestMLRiskResult] = useState<MLEarlyRiskResponse | null>(null);
  const [mlInferenceOffline, setMlInferenceOffline] = useState<boolean>(false);
  const [lastInferenceLatencyMs, setLastInferenceLatencyMs] = useState<number | null>(null);

  // Modals
  const [selectedAlert, setSelectedAlert] = useState<AnomalyAlert | null>(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [isAIDiagnosisModalOpen, setIsAIDiagnosisModalOpen] = useState<boolean>(false);
  const [isAddSatelliteModalOpen, setIsAddSatelliteModalOpen] = useState<boolean>(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [isSendReportModalOpen, setIsSendReportModalOpen] = useState<boolean>(false);
  const [isModelValidationModalOpen, setIsModelValidationModalOpen] = useState<boolean>(false);
  const [anomalyThreshold, setAnomalyThresholdState] = useState<number>(() => getGlobalAnomalyThreshold());
  const [targetReportSatId, setTargetReportSatId] = useState<string | null>(null);

  const setAnomalyThreshold = useCallback((th: number) => {
    const cleanTh = Number(Math.max(0.05, Math.min(0.95, th)).toFixed(2));
    setAnomalyThresholdState(cleanTh);
    setGlobalAnomalyThreshold(cleanTh);
  }, []);

  // Active simulation timeout handles reference
  const simulationTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup simulation timeouts on unmount
  useEffect(() => {
    return () => {
      simulationTimeoutsRef.current.forEach((t) => clearTimeout(t));
      simulationTimeoutsRef.current = [];
    };
  }, []);

  // Sync satellites from backend or local registry
  const refreshSatellitesList = useCallback(async () => {
    try {
      const apiSats = await fetchSatellites();
      setSatellitesData((prev) => {
        const updated: SatelliteTelemetryMap = { ...prev };
        apiSats.forEach((s) => {
          if (!updated[s.id]) {
            updated[s.id] = {
              id: s.id,
              name: s.name,
              mission: s.mission,
              operator: s.operator,
              orbitType: s.orbit_type,
              status: s.status,
              color: s.color || '#10B981',
              altitude: `${s.altitude_km || 500} km`,
              telemetry: {
                power: 92,
                battery: 90,
                temperature: 24.5,
                voltage: 28.5,
                voltageStatus: 'Normal (28.5V)',
                signalStrength: 95,
                linkStatus: 'STRONG',
                anomalyProbability: 1.5,
                healthScore: s.overall_health || 95,
                batteryTrend: [90, 90, 89, 90, 90, 90, 90],
                tempTrend: [24.0, 24.2, 24.5, 24.5, 24.6, 24.5, 24.5],
                voltageTrend: [28.5, 28.5, 28.4, 28.5, 28.5, 28.5, 28.5],
              },
            };
          } else {
            updated[s.id].name = s.name;
            updated[s.id].operator = s.operator;
            updated[s.id].mission = s.mission;
            updated[s.id].color = s.color || updated[s.id].color;
          }
        });
        return updated;
      });
    } catch (err) {
      console.warn('[SimulationContext] Failed to load satellites:', err);
    }
  }, []);

  useEffect(() => {
    refreshSatellitesList();
  }, [refreshSatellitesList]);

  // Register New Satellite
  const addNewSatellite = useCallback(async (payload: CreateSatellitePayload): Promise<ApiSatellite> => {
    const created = await registerNewSatellite(payload);
    
    // Add to state immediately
    const cleanId = created.id;
    setSatellitesData((prev) => ({
      ...prev,
      [cleanId]: {
        id: cleanId,
        name: created.name,
        mission: created.mission,
        operator: created.operator,
        orbitType: created.orbit_type,
        status: created.status,
        color: created.color || '#10B981',
        altitude: `${created.altitude_km} km`,
        telemetry: {
          power: 94,
          battery: 92,
          temperature: 24.0,
          voltage: 28.5,
          voltageStatus: 'Normal (28.5V)',
          signalStrength: 96,
          linkStatus: 'STRONG',
          anomalyProbability: 1.2,
          healthScore: created.overall_health || 95,
          batteryTrend: [92, 92, 91, 92, 92, 92, 92],
          tempTrend: [23.8, 23.9, 24.0, 24.0, 24.1, 24.0, 24.0],
          voltageTrend: [28.5, 28.5, 28.4, 28.5, 28.5, 28.5, 28.5],
        },
      },
    }));

    setActiveSatelliteId(cleanId);
    return created;
  }, []);

  // Helper to extract canonical ML telemetry payload
  const getPayloadFromSat = useCallback((satData: SatelliteTelemetryMap, satId: string): MLTelemetryInput => {
    const current = satData[satId] || satData[Object.keys(satData)[0]] || INITIAL_BASELINE_MAP['SAT-001'];
    const tel = current.telemetry;
    const isDegraded = tel.voltage < 25.0 || tel.temperature > 45.0 || tel.battery < 50;
    const satName = current.name || current.id || satId;

    return {
      satellite_id: satName,
      temperature_c: Number(tel.temperature.toFixed(2)),
      voltage_v: Number(tel.voltage.toFixed(2)),
      current_a: Number((6.5 + (isDegraded ? 8.5 : 0.0) + (tel.temperature > 50 ? 5.0 : 0.0)).toFixed(2)),
      battery_soc_percent: Number(tel.battery.toFixed(1)),
      solar_power_w: Number((tel.power * 7.5).toFixed(2)),
      communication_signal_db: Number((-(120 - tel.signalStrength * 0.42)).toFixed(2)),
      vibration_g: isDegraded ? 0.082 : 0.035,
      attitude_error_deg: isDegraded ? 0.12 : 0.04,
      // aliased fields for backwards compatibility
      battery_voltage: Number(tel.voltage.toFixed(2)),
      battery_current: Number((6.5 + (isDegraded ? 8.5 : 0.0) + (tel.temperature > 50 ? 5.0 : 0.0)).toFixed(2)),
      battery_charge: Number(tel.battery.toFixed(1)),
      temperature: Number(tel.temperature.toFixed(2)),
      solar_power: Number((tel.power * 7.5).toFixed(2)),
      communication_signal: Number((-(120 - tel.signalStrength * 0.42)).toFixed(2)),
    };
  }, []);

  // Trigger real ML inference on backend
  const triggerMLInference = useCallback(async (customTelemetry?: MLTelemetryInput): Promise<MLAnomalyResponse | null> => {
    const payload = customTelemetry || getPayloadFromSat(satellitesData, activeSatelliteId);
    const startT = performance.now();
    try {
      const result = await detectMLAnomaly(payload);
      const latency = Math.round(performance.now() - startT);
      if (result) {
        setLatestMLResult(result);
        setMlInferenceOffline(false);
        setLastInferenceLatencyMs(latency);
      } else {
        setMlInferenceOffline(true);
        setLastInferenceLatencyMs(null);
      }
      return result;
    } catch {
      setMlInferenceOffline(true);
      setLastInferenceLatencyMs(null);
      return null;
    }
  }, [activeSatelliteId, getPayloadFromSat, satellitesData]);

  // Trigger real ML inference whenever active satellite changes
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerMLInference();
    }, 60);
    return () => clearTimeout(timer);
  }, [activeSatelliteId, triggerMLInference]);

  // Real-time counter tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetryLastUpdatedSec((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  // Compute Mission Status
  const anyCrit = Object.values(satellitesData).some((s) => s.status === 'CRITICAL');
  const anyWarn = Object.values(satellitesData).some((s) => s.status === 'WARNING');
  const missionStatus: 'NOMINAL' | 'WARNING' | 'CRITICAL' = anyCrit ? 'CRITICAL' : anyWarn ? 'WARNING' : 'NOMINAL';

  const stepName =
    simulationStep === 1
      ? 'STEP 1: NORMAL TELEMETRY'
      : simulationStep === 2
      ? 'STEP 2: ANALYZING TELEMETRY...'
      : simulationStep === 3
      ? 'STEP 3: ANOMALY DETECTED'
      : simulationStep === 4
      ? 'STEP 4: AI DIAGNOSIS'
      : simulationStep === 5
      ? 'STEP 5: EARLY FAILURE PREDICTION'
      : simulationStep === 6
      ? 'STEP 6: RECOMMENDED ACTION'
      : 'NOMINAL MISSION OPERATIONS';

  const [currentDiagnosis, setCurrentDiagnosis] = useState<ActiveDiagnosis | null>(null);

  // Helper to construct dynamic diagnosis object for any satellite & scenario
  const buildDynamicDiagnosis = useCallback((
    sat: SatelliteEntry,
    scenarioKey: string,
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    mlDet?: MLAnomalyResponse | null,
    mlRisk?: MLEarlyRiskResponse | null
  ): ActiveDiagnosis => {
    const satName = sat.name || sat.id;
    const tel = sat.telemetry;
    const isCrit = severity === 'CRITICAL';
    const normalizedKey = scenarioKey.toLowerCase();
    const isMlCalibrated = Boolean(mlDet && mlDet.confidence);
    const detectionMethodName = mlDet?.model || 'Rule-based baseline detector';
    const thresholdStr = '0.6500';

    // 0. Nominal Baseline Operations
    if (
      normalizedKey === 'nominal' ||
      (sat.status === 'NOMINAL' &&
        !normalizedKey.includes('battery') &&
        !normalizedKey.includes('temp') &&
        !normalizedKey.includes('heat') &&
        !normalizedKey.includes('comm') &&
        !normalizedKey.includes('signal') &&
        !normalizedKey.includes('packet') &&
        !normalizedKey.includes('attitude') &&
        !normalizedKey.includes('solar') &&
        !normalizedKey.includes('sensor') &&
        !normalizedKey.includes('voltage'))
    ) {
      const currentPoint = {
        voltage: tel.voltage,
        battery: tel.battery,
        temperature: tel.temperature,
        power: tel.power,
        signalStrength: tel.signalStrength,
      };
      const histFrames = (tel.voltageTrend || []).map((v, idx) => ({
        voltage: v,
        battery: tel.batteryTrend?.[idx] ?? tel.battery,
        temperature: tel.tempTrend?.[idx] ?? tel.temperature,
      }));
      const predOutput = predictiveMaintenanceService.analyze(sat.id, currentPoint, histFrames, {
        subsystem: 'BATTERY',
        severity: 'INFO',
      });

      const telemetryEvidence: TelemetryEvidenceItem[] = [
        {
          parameter: 'EPS Main Bus Voltage',
          observed: `${tel.voltage.toFixed(1)} V`,
          baseline: '28.0 - 32.0 V',
          deviation: 'Nominal baseline',
          status: 'Within standard operational margin',
          trendDirection: 'STABLE',
          isAnomalous: false,
        },
        {
          parameter: 'Battery State of Charge',
          observed: `${tel.battery}%`,
          baseline: '80 - 100%',
          deviation: 'Nominal reserve',
          status: 'Full orbital eclipse energy balance',
          trendDirection: 'STABLE',
          isAnomalous: false,
        },
        {
          parameter: 'Core Thermal Envelope',
          observed: `${tel.temperature.toFixed(1)} °C`,
          baseline: '18.0 - 30.0 °C',
          deviation: 'Nominal thermal margin',
          status: 'Radiator heat rejection balanced',
          trendDirection: 'STABLE',
          isAnomalous: false,
        },
        {
          parameter: 'TT&C Downlink Signal',
          observed: `${tel.signalStrength}% Link`,
          baseline: '> 85% Link',
          deviation: 'Strong carrier C/N0',
          status: 'Nominal ground station tracking',
          trendDirection: 'STABLE',
          isAnomalous: false,
        },
      ];

      const probableCauses: RankedCauseItem[] = [
        {
          rank: 'POSSIBLE CONTRIBUTION',
          cause: 'Standard Spacecraft Operations Baseline',
          context: 'All telemetry channels tracking nominal mission parameters.',
        },
      ];

      const missionImpact: MissionImpactInfo = {
        impactLevel: 'LOW',
        affectedCapability: 'Full Spacecraft Operational Capabilities',
        potentialConsequence: 'Routine orbital tracking maintaining scheduled science and telemetry operations.',
      };

      const operationalActions: OperationalActionPlan = {
        immediate: 'Maintain standard pass tracking and routine telemetry sampling.',
        monitor: 'EPS bus voltage, thermal gradient, battery charge cycle, and ground passes.',
        escalation: 'No escalation required during nominal baseline operations.',
      };

      return {
        satelliteId: sat.id,
        satelliteName: satName,
        orbitType: sat.orbitType || 'LEO',
        anomalyType: 'Nominal Spacecraft Health',
        subsystem: 'SYSTEM',
        severity: 'INFO',
        anomalyScore: mlDet?.anomaly_score ? mlDet.anomaly_score.toFixed(4) : '0.0240',
        rawAnomalyScore: mlDet?.anomaly_score ? Math.abs(mlDet.anomaly_score) : 0.024,
        detectionConfidence: isMlCalibrated ? `${mlDet!.confidence.toFixed(1)}% Calibrated` : 'Confidence: Not calibrated',
        detectionMethod: mlDet ? 'Isolation Forest (scikit-learn)' : 'Rule-based baseline detector',
        decisionThreshold: thresholdStr,
        affectedParameters: [],
        evidence: [
          `All primary telemetry channels on ${satName} operating within nominal learned envelopes.`,
          `Power bus stable at ${tel.voltage.toFixed(1)}V with ${tel.battery}% battery state of charge.`,
          `Thermal regulation holding at ${tel.temperature.toFixed(1)}°C with full link carrier margin.`,
        ],
        telemetryEvidence,
        decisionExplanation: `${detectionMethodName} verified nominal telemetry parameters across power, thermal, and RF subsystems.`,
        explanation: `All telemetry channels on ${satName} are operating stably within baseline parameters.`,
        probableCauses,
        missionImpact,
        riskLevel: 'LOW',
        trendStatus: 'STABLE',
        trendTrajectory: 'STABLE',
        persistence: 'Nominal baseline envelope',
        rateOfChange: '0.00 /min',
        timeToFailureEstimate: 'Stable trend — no threshold crossing projected',
        observationWindow: '6-frame rolling sequence',
        trend: 'Trend trajectory: STABLE operational telemetry across orbital window',
        recommendedAction: operationalActions.immediate,
        operationalActions,
        predictiveMaintenance: predOutput,
        mitigationDetails: 'Spacecraft operating nominally; all autonomous health guardrails active.',
        actionButtonLabel: 'NOMINAL OPERATIONS ACTIVE',
        simulationNoticeText: 'Live monitoring: All spacecraft telemetry streams verified within design margins.',
        historySparkline: {
          label: 'Health Metric',
          unit: '%',
          values: [98, 98, 97, 98, 98, 98],
          color: '#22C55E',
        },
        modelName: mlDet?.model || 'Isolation Forest & Baseline Health Analyzer',
        timestamp: new Date().toLocaleTimeString(),
      };
    }

    // 1. Thermal scenarios
    if (normalizedKey.includes('temp') || normalizedKey.includes('heat')) {
      const currentTemp = tel.temperature;
      const baselineDiff = (currentTemp - 24.0).toFixed(1);
      const isOver = currentTemp > 50.0;
      const scoreNum = mlDet?.anomaly_score ? Math.abs(mlDet.anomaly_score) : (isCrit ? 0.895 : 0.625);
      const scoreStr = mlDet?.anomaly_score ? mlDet.anomaly_score.toFixed(4) : (isCrit ? '0.8950' : '0.6250');
      const confStr = isMlCalibrated ? `${mlDet!.confidence.toFixed(1)}% Calibrated` : 'Confidence: Not calibrated';

      const currentPoint = { temperature: currentTemp, battery: tel.battery, voltage: tel.voltage, power: tel.power, signalStrength: tel.signalStrength };
      const histFrames = (tel.tempTrend || []).map((t, idx) => ({ temperature: t, battery: tel.batteryTrend?.[idx] ?? tel.battery, voltage: tel.voltageTrend?.[idx] ?? tel.voltage }));
      const predOutput = predictiveMaintenanceService.analyze(sat.id, currentPoint, histFrames, { subsystem: 'THERMAL', severity });

      const telemetryEvidence: TelemetryEvidenceItem[] = [
        {
          parameter: 'Internal Core Temperature',
          observed: `${currentTemp.toFixed(1)} °C`,
          baseline: '24.0 °C',
          deviation: `+${baselineDiff} °C`,
          status: isOver ? 'Critical Thermal Threshold Exceeded (>50.0°C)' : 'Above Operational Margin (>40.0°C)',
          trendDirection: 'INCREASING',
          isAnomalous: true,
        },
        {
          parameter: 'Thermal Gradient dT/dt',
          observed: '+1.85 °C/min',
          baseline: '±0.20 °C/min',
          deviation: '+825%',
          status: 'Accelerated thermal load gradient',
          trendDirection: 'INCREASING',
          isAnomalous: true,
        },
        {
          parameter: 'Radiator Rejection Margin',
          observed: '92% Capacity',
          baseline: '45% Nominal',
          deviation: '+104%',
          status: 'Near maximum design rejection limit',
          trendDirection: 'DEGRADING',
          isAnomalous: true,
        },
        {
          parameter: 'Avionics Heat Sink Temp',
          observed: `${(currentTemp - 3.2).toFixed(1)} °C`,
          baseline: '22.0 °C',
          deviation: `+${(currentTemp - 25.2).toFixed(1)} °C`,
          status: 'Elevated junction temperature',
          trendDirection: 'INCREASING',
          isAnomalous: currentTemp > 38,
        },
      ];

      const probableCauses: RankedCauseItem[] = [
        {
          rank: 'HIGH CONTRIBUTION',
          cause: 'Thermal radiator surface occlusion or degraded emissive coating',
          context: 'Radiative dissipation efficiency decreased by >40% relative to orbital baseline.',
        },
        {
          rank: 'MEDIUM CONTRIBUTION',
          cause: 'High-power payload electronics continuous operational dissipation',
          context: 'Optical payload transmitter sustained continuous duty cycle without cooling cycle.',
        },
        {
          rank: 'POSSIBLE CONTRIBUTION',
          cause: 'Auxiliary thermal louver mechanical stick in closed position',
          context: 'Passive thermal relief mechanism response delayed during daylight pass.',
        },
      ];

      const missionImpact: MissionImpactInfo = {
        impactLevel: isCrit ? 'CRITICAL' : 'HIGH',
        affectedCapability: 'Avionics Processing & Payload Optical Assemblies',
        potentialConsequence: 'Persistent thermal stress may trigger automated safety thermal shutdown of optical payload and accelerate component degradation.',
      };

      const operationalActions: OperationalActionPlan = {
        immediate: 'Execute spacecraft attitude rotation to orient radiator array toward cold deep-space vector.',
        monitor: 'Internal core temperature, payload sensor temperature, and radiator heat-sink gradient.',
        escalation: 'If core temperature exceeds 65.0°C or secondary payload heater fails to disengage, command emergency payload safe-mode.',
      };

      return {
        satelliteId: sat.id,
        satelliteName: satName,
        orbitType: sat.orbitType || 'LEO',
        anomalyType: normalizedKey.includes('rapid') ? 'Rapid Thermal Rate of Change Surge' : 'Sustained Subsystem Overheating',
        subsystem: 'THERMAL',
        severity,
        anomalyScore: scoreStr,
        rawAnomalyScore: scoreNum,
        detectionConfidence: confStr,
        detectionMethod: mlDet ? 'Isolation Forest (scikit-learn)' : 'Rule-based baseline detector',
        decisionThreshold: thresholdStr,
        affectedParameters: ['temperature', 'payload_temp', 'radiator_flux'],
        evidence: [
          `Internal temperature rose from nominal 24.0°C baseline to ${currentTemp.toFixed(1)}°C (+${baselineDiff}°C deviation).`,
          `Thermal gradient dT/dt elevated to +1.85°C/min, indicating accelerated thermal dissipation load.`,
          `Avionics bay radiator rejection flux approaching maximum design margin threshold (92%).`,
        ],
        telemetryEvidence,
        decisionExplanation: `${detectionMethodName} identified multi-channel thermal anomaly characterized by simultaneous internal temperature spike and elevated thermal dissipation gradient.`,
        explanation: `Thermal telemetry on ${satName} registered ${currentTemp.toFixed(1)}°C, exceeding safe baseline limits (${isOver ? 'Critical Threshold: 52.0°C' : 'Warning Baseline: 42.0°C'}).`,
        probableCauses,
        missionImpact,
        riskLevel: isCrit ? 'CRITICAL' : 'HIGH',
        trendStatus: predOutput.trend === 'RAPIDLY_DEGRADING' || predOutput.trend === 'DEGRADING' ? 'DEGRADING' : 'STABLE',
        trendTrajectory: predOutput.trend,
        persistence: predOutput.persistence,
        rateOfChange: predOutput.rateOfChange,
        timeToFailureEstimate: predOutput.estimatedTimeToThresholdFormatted,
        observationWindow: '6-frame telemetry sequence (400s rolling window)',
        trend: `Trend trajectory: ${predOutput.trend} thermal elevation observed across telemetry frames`,
        recommendedAction: operationalActions.immediate,
        operationalActions,
        predictiveMaintenance: predOutput,
        mitigationDetails: `Queues autonomous thermal shading: turns avionics away from solar vector and activates secondary radiator louvers.`,
        actionButtonLabel: 'SIMULATE: INITIATE THERMAL MITIGATION',
        simulationNoticeText: 'Demo environment: Actions simulate satellite telemetry state transitions.',
        historySparkline: {
          label: 'Core Temperature',
          unit: '°C',
          values: tel.tempTrend && tel.tempTrend.length >= 3 ? tel.tempTrend : [24.0, 28.5, 34.2, 41.0, 48.5, currentTemp],
          color: '#EF4444',
        },
        modelName: mlDet?.model || 'Isolation Forest & Thermal Analyzer',
        timestamp: new Date().toLocaleTimeString(),
      };
    }

    // 2. Communication scenarios
    if (normalizedKey.includes('comm') || normalizedKey.includes('signal') || normalizedKey.includes('packet')) {
      const sigVal = -(120 - tel.signalStrength * 0.42);
      const packetLossVal = Math.max(0.5, (100 - tel.signalStrength) * 0.18);
      const scoreNum = mlDet?.anomaly_score ? Math.abs(mlDet.anomaly_score) : (isCrit ? 0.912 : 0.680);
      const scoreStr = mlDet?.anomaly_score ? mlDet.anomaly_score.toFixed(4) : (isCrit ? '0.9120' : '0.6800');
      const confStr = isMlCalibrated ? `${mlDet!.confidence.toFixed(1)}% Calibrated` : 'Confidence: Not calibrated';

      const currentPoint = { communicationSignal: sigVal, signalStrength: tel.signalStrength, packetLoss: packetLossVal, battery: tel.battery };
      const histFrames = [-75.0, -78.2, -84.0, -91.5, -99.0, sigVal].map((s) => ({ communicationSignal: s, signalStrength: tel.signalStrength }));
      const predOutput = predictiveMaintenanceService.analyze(sat.id, currentPoint, histFrames, { subsystem: 'COMMUNICATION', severity });

      const telemetryEvidence: TelemetryEvidenceItem[] = [
        {
          parameter: 'Downlink Carrier Signal (S-Band)',
          observed: `${sigVal.toFixed(1)} dBm`,
          baseline: '-75.0 dBm',
          deviation: `${(sigVal + 75).toFixed(1)} dBm`,
          status: 'Below operational link budget margin',
          trendDirection: 'DEGRADING',
          isAnomalous: true,
        },
        {
          parameter: 'Telemetry Packet Loss Rate',
          observed: `${packetLossVal.toFixed(1)}%`,
          baseline: '< 0.5%',
          deviation: `+${packetLossVal.toFixed(1)}%`,
          status: 'Frame CRC drop rate elevated during pass',
          trendDirection: 'DEGRADING',
          isAnomalous: true,
        },
        {
          parameter: 'Demodulator Bit Error Rate (BER)',
          observed: '2.4 × 10⁻³',
          baseline: '< 1.0 × 10⁻⁶',
          deviation: '+3 orders of magnitude',
          status: 'Transponder demodulation error rate high',
          trendDirection: 'DEGRADING',
          isAnomalous: true,
        },
        {
          parameter: 'Antenna Boresight Pointing',
          observed: '0.85° off-axis',
          baseline: '< 0.10°',
          deviation: '+750%',
          status: 'Azimuth autotrack tracking deviation',
          trendDirection: 'VOLATILE',
          isAnomalous: true,
        },
      ];

      const probableCauses: RankedCauseItem[] = [
        {
          rank: 'HIGH CONTRIBUTION',
          cause: 'Ground station autotrack azimuth pointing misalignment or atmospheric attenuation',
          context: 'S-band carrier signal margin dropped below nominal 12dB link budget threshold.',
        },
        {
          rank: 'MEDIUM CONTRIBUTION',
          cause: 'Solid-State Power Amplifier (SSPA) thermal output power drift',
          context: 'Transponder RF output power dropped by 3.2 dB relative to drive input level.',
        },
        {
          rank: 'POSSIBLE CONTRIBUTION',
          cause: 'Coaxial feed-line impedance mismatch or thermal expansion',
          context: 'Minor return loss anomaly detected on primary antenna RF port.',
        },
      ];

      const missionImpact: MissionImpactInfo = {
        impactLevel: isCrit ? 'CRITICAL' : 'HIGH',
        affectedCapability: 'Telemetry, Tracking & Command (TT&C) and Science Downlink',
        potentialConsequence: 'Degraded downlink margin risks telemetry frame loss during contact pass and delayed payload telemetry synchronization.',
      };

      const operationalActions: OperationalActionPlan = {
        immediate: 'Verify ground station autotrack alignment and switch receiver to high-gain tracking loop.',
        monitor: 'RF SNR, packet loss rate, transponder SSPA temperature, and receiver AGC voltage.',
        escalation: 'Switch transponder downlink path from primary HGA to redundant LGA if packet loss exceeds 15%.',
      };

      return {
        satelliteId: sat.id,
        satelliteName: satName,
        orbitType: sat.orbitType || 'LEO',
        anomalyType: normalizedKey.includes('packet') ? 'Downlink Packet Loss Surge' : 'RF Downlink Carrier Attenuation & Signal Loss',
        subsystem: 'COMMUNICATION',
        severity,
        anomalyScore: scoreStr,
        rawAnomalyScore: scoreNum,
        detectionConfidence: confStr,
        detectionMethod: mlDet ? 'Isolation Forest (scikit-learn)' : 'Rule-based baseline detector',
        decisionThreshold: thresholdStr,
        affectedParameters: ['communication_signal', 'packet_loss', 'ber_rate'],
        evidence: [
          `Downlink carrier signal strength dropped to ${sigVal.toFixed(1)} dBm (nominal baseline: -75.0 dBm).`,
          `Telemetry downlink packet loss rate spiked to ${packetLossVal.toFixed(1)}% during pass window.`,
          `Bit error rate (BER) elevation detected on primary RF transponder demodulator.`,
        ],
        telemetryEvidence,
        decisionExplanation: `${detectionMethodName} flagged abnormal multi-parameter RF signature exhibiting carrier degradation coincident with packet drop surge.`,
        explanation: `Communication subsystem on ${satName} indicates degraded RF carrier link margin and elevated packet loss.`,
        probableCauses,
        missionImpact,
        riskLevel: isCrit ? 'CRITICAL' : 'HIGH',
        trendStatus: predOutput.trend === 'RAPIDLY_DEGRADING' || predOutput.trend === 'DEGRADING' ? 'DEGRADING' : 'STABLE',
        trendTrajectory: predOutput.trend,
        persistence: predOutput.persistence,
        rateOfChange: predOutput.rateOfChange,
        timeToFailureEstimate: predOutput.estimatedTimeToThresholdFormatted,
        observationWindow: '5-frame pass sequence (300s window)',
        trend: `Trend trajectory: ${predOutput.trend} carrier link margin degradation observed across pass window`,
        recommendedAction: operationalActions.immediate,
        operationalActions,
        predictiveMaintenance: predOutput,
        mitigationDetails: `Queues RF link realignment: boosts downlink amplifier gain and aligns high-gain antenna dish with target ground station.`,
        actionButtonLabel: 'SIMULATE: REALIGN RF LINK',
        simulationNoticeText: 'Demo environment: Actions simulate satellite telemetry state transitions.',
        historySparkline: {
          label: 'Carrier Signal',
          unit: 'dBm',
          values: [-75.0, -78.2, -84.0, -91.5, -99.0, sigVal],
          color: '#00BFFF',
        },
        modelName: mlDet?.model || 'Isolation Forest & RF Link Analyzer',
        timestamp: new Date().toLocaleTimeString(),
      };
    }

    // 3. Attitude scenarios
    if (normalizedKey.includes('attitude') || normalizedKey.includes('instability') || normalizedKey.includes('drift')) {
      const scoreNum = mlDet?.anomaly_score ? Math.abs(mlDet.anomaly_score) : (isCrit ? 0.884 : 0.650);
      const scoreStr = mlDet?.anomaly_score ? mlDet.anomaly_score.toFixed(4) : (isCrit ? '0.8840' : '0.6500');
      const confStr = isMlCalibrated ? `${mlDet!.confidence.toFixed(1)}% Calibrated` : 'Confidence: Not calibrated';

      const currentPoint = { pitch: 5.8, yaw: 1.4, roll: 0.8, voltage: tel.voltage, battery: tel.battery };
      const histFrames = [0.05, 0.42, 1.25, 2.60, 4.10, 5.80].map((p) => ({ pitch: p }));
      const predOutput = predictiveMaintenanceService.analyze(sat.id, currentPoint, histFrames, { subsystem: 'ATTITUDE', severity });

      const telemetryEvidence: TelemetryEvidenceItem[] = [
        {
          parameter: 'Attitude Pointing Deviation',
          observed: '±5.8° (Pitch/Roll)',
          baseline: '±0.08°',
          deviation: '+7150%',
          status: 'Boresight pointing tolerance violated',
          trendDirection: 'DEGRADING',
          isAnomalous: true,
        },
        {
          parameter: 'Reaction Wheel #2 Momentum',
          observed: '5420 RPM',
          baseline: '< 2800 RPM',
          deviation: '+93.5%',
          status: 'Approaching wheel saturation limit (>5000 RPM)',
          trendDirection: 'INCREASING',
          isAnomalous: true,
        },
        {
          parameter: 'Star Tracker Optical Lock',
          observed: 'Transient Lock (1/2)',
          baseline: 'Dual Locked (2/2)',
          deviation: '-50% Lock Count',
          status: 'Reduced optical tracking confidence',
          trendDirection: 'VOLATILE',
          isAnomalous: true,
        },
        {
          parameter: 'Sun Sensor Residual Bias',
          observed: '1.4° offset',
          baseline: '< 0.15°',
          deviation: '+833%',
          status: 'Secondary sensor alignment disagreement',
          trendDirection: 'VOLATILE',
          isAnomalous: true,
        },
      ];

      const probableCauses: RankedCauseItem[] = [
        {
          rank: 'HIGH CONTRIBUTION',
          cause: 'Reaction wheel #2 angular momentum saturation from external disturbance torques',
          context: 'Wheel spin velocity exceeds 90% of torque authority threshold.',
        },
        {
          rank: 'MEDIUM CONTRIBUTION',
          cause: 'Star tracker optical glint during orbital eclipse transition',
          context: 'Optical sensor transient blinding during Sun illumination boundary crossing.',
        },
        {
          rank: 'POSSIBLE CONTRIBUTION',
          cause: 'Inertial Measurement Unit (IMU) gyro rate bias calibration drift',
          context: 'Inertial rate integration drift observed across pitch control loop.',
        },
      ];

      const missionImpact: MissionImpactInfo = {
        impactLevel: isCrit ? 'CRITICAL' : 'HIGH',
        affectedCapability: 'High-Resolution Earth Observation Imaging & Solar Array Sun-Pointing',
        potentialConsequence: 'Unmitigated pointing drift leads to payload image smear, RF link misalignment, and sub-optimal solar array orientation.',
      };

      const operationalActions: OperationalActionPlan = {
        immediate: 'Initiate magnetic torquer rod firing sequence to dump accumulated reaction wheel momentum.',
        monitor: '3-axis pointing jitter, reaction wheel RPM telemetry, and magnetic torquer current draw.',
        escalation: 'Transition AOCS to Safe Sun-Pointing Hold Mode if pointing error exceeds ±10.0°.',
      };

      return {
        satelliteId: sat.id,
        satelliteName: satName,
        orbitType: sat.orbitType || 'LEO',
        anomalyType: 'AOCS Attitude Drift & Wheel Saturation',
        subsystem: 'ATTITUDE',
        severity,
        anomalyScore: scoreStr,
        rawAnomalyScore: scoreNum,
        detectionConfidence: confStr,
        detectionMethod: mlDet ? 'Isolation Forest (scikit-learn)' : 'Rule-based baseline detector',
        decisionThreshold: thresholdStr,
        affectedParameters: ['pitch', 'roll', 'yaw', 'rx_wheel_speed'],
        evidence: [
          `Pointing deviation error observed exceeding ±5.0° operational tolerance on pitch and roll axes.`,
          `Reaction wheel momentum accumulation approaching saturation limits (>5000 RPM).`,
          `Star tracker optical lock transient search state recorded during orbital eclipse exit.`,
        ],
        telemetryEvidence,
        decisionExplanation: `${detectionMethodName} identified multivariate deviation across attitude rate gyro, reaction wheel RPM and star tracker lock status.`,
        explanation: `Attitude & Orbit Control Subsystem (AOCS) on ${satName} exhibits pointing deviation outside tolerance limits.`,
        probableCauses,
        missionImpact,
        riskLevel: isCrit ? 'CRITICAL' : 'HIGH',
        trendStatus: predOutput.trend === 'RAPIDLY_DEGRADING' || predOutput.trend === 'DEGRADING' ? 'DEGRADING' : 'STABLE',
        trendTrajectory: predOutput.trend,
        persistence: predOutput.persistence,
        rateOfChange: predOutput.rateOfChange,
        timeToFailureEstimate: predOutput.estimatedTimeToThresholdFormatted,
        observationWindow: '6-cycle telemetry buffer (360s window)',
        trend: `Trend trajectory: ${predOutput.trend} pointing deviation increasing over orbital arc`,
        recommendedAction: operationalActions.immediate,
        operationalActions,
        predictiveMaintenance: predOutput,
        mitigationDetails: `Queues attitude stabilization: pulses magnetic torquers to dump reaction wheel momentum and locks Sun-sensor vector.`,
        actionButtonLabel: 'SIMULATE: DESATURATE REACTION WHEELS',
        simulationNoticeText: 'Demo environment: Actions simulate satellite telemetry state transitions.',
        historySparkline: {
          label: 'Pointing Error',
          unit: '°',
          values: [0.05, 0.42, 1.25, 2.60, 4.10, 5.80],
          color: '#F59E0B',
        },
        modelName: mlDet?.model || 'Isolation Forest & AOCS Analyzer',
        timestamp: new Date().toLocaleTimeString(),
      };
    }

    // 4. Solar power scenarios
    if (normalizedKey.includes('solar')) {
      const powerWatts = (tel.power * 7.5).toFixed(0);
      const scoreNum = mlDet?.anomaly_score ? Math.abs(mlDet.anomaly_score) : (isCrit ? 0.875 : 0.610);
      const scoreStr = mlDet?.anomaly_score ? mlDet.anomaly_score.toFixed(4) : (isCrit ? '0.8750' : '0.6100');
      const confStr = isMlCalibrated ? `${mlDet!.confidence.toFixed(1)}% Calibrated` : 'Confidence: Not calibrated';

      const currentPoint = { solarPower: Number(powerWatts), power: tel.power, battery: tel.battery, voltage: tel.voltage };
      const histFrames = [650, 610, 520, 430, 310, Number(powerWatts)].map((p) => ({ solarPower: p, power: p / 7.5 }));
      const predOutput = predictiveMaintenanceService.analyze(sat.id, currentPoint, histFrames, { subsystem: 'POWER', severity });

      const telemetryEvidence: TelemetryEvidenceItem[] = [
        {
          parameter: 'Solar Array Total Output',
          observed: `${powerWatts} W`,
          baseline: '650 W',
          deviation: `${(((tel.power * 7.5 - 650) / 650) * 100).toFixed(1)}%`,
          status: 'Power generation drop during daylight pass',
          trendDirection: 'DEGRADING',
          isAnomalous: true,
        },
        {
          parameter: 'SADA Gimbal Sun Vector Error',
          observed: '14.2° off-normal',
          baseline: '< 1.5°',
          deviation: '+846%',
          status: 'Drive assembly tracking lag',
          trendDirection: 'DEGRADING',
          isAnomalous: true,
        },
        {
          parameter: 'Shunt Regulator Current',
          observed: '1.2 A',
          baseline: '8.5 A',
          deviation: '-85.8%',
          status: 'Bus power supply margin depleted',
          trendDirection: 'DEGRADING',
          isAnomalous: true,
        },
        {
          parameter: 'Battery State of Charge',
          observed: `${tel.battery}%`,
          baseline: '85 - 100%',
          deviation: `-${100 - tel.battery}%`,
          status: 'Net energy balance deficit in daylight',
          trendDirection: 'DEGRADING',
          isAnomalous: true,
        },
      ];

      const probableCauses: RankedCauseItem[] = [
        {
          rank: 'HIGH CONTRIBUTION',
          cause: 'Solar Array Drive Assembly (SADA) gimbal drive stepping error or mechanical friction',
          context: 'Array tracking vector lagging solar ephemeris vector by 14.2° during daytime pass.',
        },
        {
          rank: 'MEDIUM CONTRIBUTION',
          cause: 'Partial array occlusion / shadowing from deployed payload boom',
          context: 'Segmented solar cell string output asymmetry detected across panels.',
        },
        {
          rank: 'POSSIBLE CONTRIBUTION',
          cause: 'Solar array bus blocking diode degradation',
          context: 'Localized string voltage mismatch detected under peak solar illumination.',
        },
      ];

      const missionImpact: MissionImpactInfo = {
        impactLevel: isCrit ? 'CRITICAL' : 'HIGH',
        affectedCapability: 'Spacecraft Power Bus Margin & Daylight Battery Replenishment',
        potentialConsequence: 'Insufficient daylight solar generation prevents full battery recharge prior to orbital eclipse, risking deep battery discharge.',
      };

      const operationalActions: OperationalActionPlan = {
        immediate: 'Command SADA gimbal manual step repositioning to nominal Sun vector and shed non-essential payload heaters.',
        monitor: 'Solar array string currents, bus voltage, battery charge current, and SADA motor temperature.',
        escalation: 'If battery state of charge drops below 40% in daylight, trigger power-conservation safe hold.',
      };

      return {
        satelliteId: sat.id,
        satelliteName: satName,
        orbitType: sat.orbitType || 'LEO',
        anomalyType: 'Solar Array Occlusion & Power Drop',
        subsystem: 'POWER',
        severity,
        anomalyScore: scoreStr,
        rawAnomalyScore: scoreNum,
        detectionConfidence: confStr,
        detectionMethod: mlDet ? 'Isolation Forest (scikit-learn)' : 'Rule-based baseline detector',
        decisionThreshold: thresholdStr,
        affectedParameters: ['solar_power', 'battery_charge', 'sada_angle'],
        evidence: [
          `Solar array generation collapsed from 650W nominal to ${powerWatts}W during daylight pass.`,
          `Solar array drive assembly (SADA) tracking error detected relative to optimal Sun vector.`,
          `Battery replenishment curve degraded by ${isCrit ? '58%' : '35%'} relative to baseline.`,
        ],
        telemetryEvidence,
        decisionExplanation: `${detectionMethodName} detected significant multi-channel deficit between expected solar irradiance generation and observed solar array output power.`,
        explanation: `Electrical Power System on ${satName} is experiencing solar array power drop and array tracking error.`,
        probableCauses,
        missionImpact,
        riskLevel: isCrit ? 'CRITICAL' : 'HIGH',
        trendStatus: predOutput.trend === 'RAPIDLY_DEGRADING' || predOutput.trend === 'DEGRADING' ? 'DEGRADING' : 'STABLE',
        trendTrajectory: predOutput.trend,
        persistence: predOutput.persistence,
        rateOfChange: predOutput.rateOfChange,
        timeToFailureEstimate: predOutput.estimatedTimeToThresholdFormatted,
        observationWindow: '6-frame telemetry buffer (450s window)',
        trend: `Trend trajectory: ${predOutput.trend} solar power output collapse observed across daylight passes`,
        recommendedAction: operationalActions.immediate,
        operationalActions,
        predictiveMaintenance: predOutput,
        mitigationDetails: `Queues solar tracking recalibration: resets SADA gimbal autotrack and sheds non-essential payload heaters.`,
        actionButtonLabel: 'SIMULATE: RECALIBRATE SOLAR SADA',
        simulationNoticeText: 'Demo environment: Actions simulate satellite telemetry state transitions.',
        historySparkline: {
          label: 'Solar Output',
          unit: 'W',
          values: [650, 610, 520, 430, 310, Number(powerWatts)],
          color: '#F59E0B',
        },
        modelName: mlDet?.model || 'Isolation Forest & Power Bus Analyzer',
        timestamp: new Date().toLocaleTimeString(),
      };
    }

    // 5. Sensor drift scenarios
    if (normalizedKey.includes('sensor')) {
      const scoreNum = mlDet?.anomaly_score ? Math.abs(mlDet.anomaly_score) : 0.645;
      const scoreStr = mlDet?.anomaly_score ? mlDet.anomaly_score.toFixed(4) : '0.6450';
      const confStr = isMlCalibrated ? `${mlDet!.confidence.toFixed(1)}% Calibrated` : 'Confidence: Not calibrated';

      const currentPoint = { temperature: tel.temperature, voltage: tel.voltage, battery: tel.battery };
      const histFrames = [2.42, 2.48, 2.56, 2.65, 2.74, 2.84].map((v) => ({ temperature: 20 + v * 3 }));
      const predOutput = predictiveMaintenanceService.analyze(sat.id, currentPoint, histFrames, { subsystem: 'SENSOR', severity });

      const telemetryEvidence: TelemetryEvidenceItem[] = [
        {
          parameter: 'Primary Sensor ADC Channel A',
          observed: '2.84 V (Offset +0.42V)',
          baseline: '2.42 V ± 0.05V',
          deviation: '+17.3%',
          status: 'Persistent monotonic calibration drift (>2.8σ)',
          trendDirection: 'INCREASING',
          isAnomalous: true,
        },
        {
          parameter: 'Primary vs Redundant Δ',
          observed: '0.38 V discrepancy',
          baseline: '< 0.04 V',
          deviation: '+850%',
          status: 'Redundant channel cross-check mismatch',
          trendDirection: 'DEGRADING',
          isAnomalous: true,
        },
        {
          parameter: 'ADC Reference Rail',
          observed: '5.12 V',
          baseline: '5.00 V ± 0.02V',
          deviation: '+2.4%',
          status: 'ADC reference rail stable',
          trendDirection: 'STABLE',
          isAnomalous: false,
        },
        {
          parameter: 'Signal Noise Floor RMS',
          observed: '0.012 V',
          baseline: '< 0.015 V',
          deviation: 'Nominal',
          status: 'Noise within nominal tolerance',
          trendDirection: 'STABLE',
          isAnomalous: false,
        },
      ];

      const probableCauses: RankedCauseItem[] = [
        {
          rank: 'HIGH CONTRIBUTION',
          cause: 'Primary sensor transducer analog-to-digital reference voltage drift or element aging',
          context: 'Monotonic linear drift observed without sudden step discontinuities.',
        },
        {
          rank: 'MEDIUM CONTRIBUTION',
          cause: 'Signal conditioning operational amplifier temperature coefficient shift',
          context: 'Slight thermal coefficient correlation detected in ADC bias.',
        },
        {
          rank: 'POSSIBLE CONTRIBUTION',
          cause: 'Telemetry acquisition multiplexer channel contact resistance increase',
          context: 'Minimal parasitic series impedance observed on channel A.',
        },
      ];

      const missionImpact: MissionImpactInfo = {
        impactLevel: isCrit ? 'HIGH' : 'MEDIUM',
        affectedCapability: 'Onboard Autonomous Telemetry Monitoring Precision',
        potentialConsequence: 'Sensor calibration drift may cause false threshold triggers or mask subtle underlying subsystem degradation.',
      };

      const operationalActions: OperationalActionPlan = {
        immediate: 'Execute onboard sensor zero-point recalibration and switch primary telemetry processing to redundant Channel B.',
        monitor: 'Compare Channel A and Channel B readings across next 3 orbital passes.',
        escalation: 'Flag sensor channel A as uncalibrated in ground telemetry database if drift exceeds 0.50V.',
      };

      return {
        satelliteId: sat.id,
        satelliteName: satName,
        orbitType: sat.orbitType || 'LEO',
        anomalyType: 'Telemetry Sensor Calibration Drift',
        subsystem: 'SENSOR',
        severity,
        anomalyScore: scoreStr,
        rawAnomalyScore: scoreNum,
        detectionConfidence: confStr,
        detectionMethod: mlDet ? 'Isolation Forest (scikit-learn)' : 'Rule-based baseline detector',
        decisionThreshold: thresholdStr,
        affectedParameters: ['temperature', 'voltage_sensor_adc'],
        evidence: [
          `Telemetry sensor ADC output exhibits continuous monotonic calibration offset (>2.5σ from nominal mean).`,
          `Discrepancy observed between primary sensor and redundant channel B measurement.`,
          `Gradual linear trend characteristic without sudden transient spike.`,
        ],
        telemetryEvidence,
        decisionExplanation: `${detectionMethodName} detected monotonic sensor calibration drift against redundant channel reference.`,
        explanation: `Sensor telemetry on ${satName} demonstrates persistent calibration drift relative to secondary reference sensors.`,
        probableCauses,
        missionImpact,
        riskLevel: isCrit ? 'HIGH' : 'MEDIUM',
        trendStatus: predOutput.trend === 'RAPIDLY_DEGRADING' || predOutput.trend === 'DEGRADING' ? 'DEGRADING' : 'STABLE',
        trendTrajectory: predOutput.trend,
        persistence: predOutput.persistence,
        rateOfChange: predOutput.rateOfChange,
        timeToFailureEstimate: predOutput.estimatedTimeToThresholdFormatted,
        observationWindow: '6-frame rolling sequence (600s window)',
        trend: `Trend trajectory: ${predOutput.trend} sensor calibration bias detected across frames`,
        recommendedAction: operationalActions.immediate,
        operationalActions,
        predictiveMaintenance: predOutput,
        mitigationDetails: `Queues sensor calibration check: switches telemetry pipeline to redundant channel B.`,
        actionButtonLabel: 'SIMULATE: RECALIBRATE SENSOR BUS',
        simulationNoticeText: 'Demo environment: Actions simulate satellite telemetry state transitions.',
        historySparkline: {
          label: 'Sensor Bias',
          unit: 'V',
          values: [2.42, 2.48, 2.56, 2.65, 2.74, 2.84],
          color: '#00BFFF',
        },
        modelName: mlDet?.model || 'Isolation Forest & Sensor Drift Analyzer',
        timestamp: new Date().toLocaleTimeString(),
      };
    }

    // 6. Default: Battery / Voltage drop scenarios
    const voltVal = tel.voltage.toFixed(1);
    const battVal = tel.battery;
    const scoreNum = mlDet?.anomaly_score ? Math.abs(mlDet.anomaly_score) : (isCrit ? 0.947 : 0.720);
    const scoreStr = mlDet?.anomaly_score ? mlDet.anomaly_score.toFixed(4) : (isCrit ? '0.9470' : '0.7200');
    const confStr = isMlCalibrated ? `${mlDet!.confidence.toFixed(1)}% Calibrated` : 'Confidence: Not calibrated';

    const currentPoint = { voltage: tel.voltage, batteryVoltage: tel.voltage, battery: tel.battery, temperature: tel.temperature };
    const histFrames = (tel.voltageTrend || []).map((v, idx) => ({ voltage: v, batteryVoltage: v, battery: tel.batteryTrend?.[idx] ?? tel.battery, temperature: tel.tempTrend?.[idx] ?? tel.temperature }));
    const predOutput = predictiveMaintenanceService.analyze(sat.id, currentPoint, histFrames, { subsystem: 'BATTERY', severity });

    const telemetryEvidence: TelemetryEvidenceItem[] = [
      {
        parameter: 'EPS Bus Voltage',
        observed: `${voltVal} V`,
        baseline: '28.0 V',
        deviation: `${(((tel.voltage - 28.0) / 28.0) * 100).toFixed(1)}%`,
        status: 'Below operational margin envelope (<24.0V)',
        trendDirection: 'DEGRADING',
        isAnomalous: true,
      },
      {
        parameter: 'Battery State of Charge',
        observed: `${battVal}%`,
        baseline: '85 - 100%',
        deviation: `-${100 - battVal}%`,
        status: 'Below operational reserve margin (<50%)',
        trendDirection: 'DEGRADING',
        isAnomalous: true,
      },
      {
        parameter: 'Internal Cell Resistance',
        observed: '0.18 Ω (Elevated)',
        baseline: '0.04 Ω',
        deviation: '+350%',
        status: 'Degrading electrochemical impedance',
        trendDirection: 'DEGRADING',
        isAnomalous: true,
      },
      {
        parameter: 'Discharge Current',
        observed: '8.4 A',
        baseline: '4.2 A Nominal',
        deviation: '+100%',
        status: 'Above recent baseline discharge draw',
        trendDirection: 'INCREASING',
        isAnomalous: true,
      },
    ];

    const probableCauses: RankedCauseItem[] = [
      {
        rank: 'HIGH CONTRIBUTION',
        cause: 'Battery electrochemical cell degradation and capacity loss',
        context: 'Significant state-of-charge depletion and internal impedance rise during discharge pass.',
      },
      {
        rank: 'MEDIUM CONTRIBUTION',
        cause: 'Internal cell impedance rise / thermal dissipation',
        context: 'Voltage drop under nominal load indicating elevated equivalent series resistance.',
      },
      {
        rank: 'POSSIBLE CONTRIBUTION',
        cause: 'Elevated electrical payload load during eclipse pass',
        context: 'Unscheduled secondary payload heater operation drawing additional current.',
      },
    ];

    const missionImpact: MissionImpactInfo = {
      impactLevel: isCrit ? 'CRITICAL' : 'HIGH',
      affectedCapability: 'Payload Power Distribution & Eclipse Orbit Autonomy',
      potentialConsequence: 'Persistent battery degradation reduces available power for payload operations and may force mandatory payload duty-cycle reduction during eclipse.',
    };

    const operationalActions: OperationalActionPlan = {
      immediate: 'Activate autonomous power-saving mode if operational constraints permit and shed non-essential payload heaters.',
      monitor: 'EPS bus voltage, battery state of charge (SOC), internal cell temperature, and discharge current.',
      escalation: 'Escalate to spacecraft power engineer if bus voltage drops below 21.5V or discharge current exceeds 10.0A.',
    };

    return {
      satelliteId: sat.id,
      satelliteName: satName,
      orbitType: sat.orbitType || 'LEO',
      anomalyType: normalizedKey.includes('voltage') ? 'EPS Bus Sudden Undervoltage' : 'Battery Degradation & Capacity Decay',
      subsystem: 'BATTERY',
      severity,
      anomalyScore: scoreStr,
      rawAnomalyScore: scoreNum,
      detectionConfidence: confStr,
      detectionMethod: mlDet ? 'Isolation Forest (scikit-learn)' : 'Rule-based baseline detector',
      decisionThreshold: thresholdStr,
      affectedParameters: ['battery_voltage', 'battery_charge', 'battery_current'],
      evidence: [
        `Main EPS bus voltage dropped to ${voltVal}V (below nominal 28.0V baseline envelope).`,
        `Battery state of charge depleted to ${battVal}% with elevated internal cell discharge current.`,
        `Internal cell resistance rise detected during eclipse transition.`,
      ],
      telemetryEvidence,
      decisionExplanation: `${detectionMethodName} identified a multivariate deviation across battery voltage, state-of-charge and discharge-current telemetry.`,
      explanation: `Electrical Power System on ${satName} indicates bus undervoltage and battery capacity decay.`,
      probableCauses,
      missionImpact,
      riskLevel: isCrit ? 'CRITICAL' : 'HIGH',
      trendStatus: predOutput.trend === 'RAPIDLY_DEGRADING' || predOutput.trend === 'DEGRADING' ? 'DEGRADING' : 'STABLE',
      trendTrajectory: predOutput.trend,
      persistence: predOutput.persistence,
      rateOfChange: predOutput.rateOfChange,
      timeToFailureEstimate: predOutput.estimatedTimeToThresholdFormatted,
      observationWindow: '6-frame telemetry sequence (420s window)',
      trend: `Trend trajectory: ${predOutput.trend} discharge voltage decay observed across telemetry window`,
      recommendedAction: operationalActions.immediate,
      operationalActions,
      predictiveMaintenance: predOutput,
      mitigationDetails: `Sheds non-essential payload heaters, caps telemetry transmitter to low-bandwidth beacon, and rebalances solar cell shunt regulators.`,
      actionButtonLabel: 'SIMULATE: ACTIVATE POWER-SAVING MODE',
      simulationNoticeText: 'Demo environment: Actions simulate satellite telemetry state transitions.',
      historySparkline: {
        label: 'Bus Voltage',
        unit: 'V',
        values: tel.voltageTrend && tel.voltageTrend.length >= 3 ? tel.voltageTrend : [28.6, 28.0, 26.8, 25.4, 24.1, Number(voltVal)],
        color: '#EF4444',
      },
      modelName: mlDet?.model || 'Isolation Forest & Battery Analyzer',
      timestamp: new Date().toLocaleTimeString(),
    };
  }, []);

  const resetDemo = useCallback(() => {
    simulationTimeoutsRef.current.forEach((t) => clearTimeout(t));
    simulationTimeoutsRef.current = [];
    setIsSimulating(false);
    setSimulationStep(0);
    setPowerSavingModeActive(false);
    setSatellitesData(INITIAL_BASELINE_MAP);
    setIsAlertModalOpen(false);
    setIsAIDiagnosisModalOpen(false);
    setSelectedAlert(null);
    setCurrentDiagnosis(null);
    setLatestMLResult(null);
    setLatestMLRiskResult(null);
  }, []);

  // Dynamic Custom Anomaly Injection for ANY satellite using real AI Engine
  const simulateCustomAnomaly = useCallback(async (satId: string, anomalyTypeOrKey: string, severity: 'INFO' | 'WARNING' | 'CRITICAL') => {
    setActiveSatelliteId(satId);
    
    // Convert scenario name to key if needed
    const normalizedKey = anomalyTypeOrKey
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const step = severity === 'CRITICAL' ? 3 : severity === 'WARNING' ? 2 : 1;

    let mlResult: MLAnomalyResponse | null = null;
    try {
      const result = await triggerAnomalyScenario(normalizedKey, step, satId);
      if (result && result.detection) {
        mlResult = result.detection;
        setLatestMLResult(result.detection);
      }
    } catch {
      // Backend offline graceful fallback
    }

    const isCrit = severity === 'CRITICAL';
    const isWarn = severity === 'WARNING';

    setSatellitesData((prev) => {
      const target = prev[satId] || prev['SAT-002'] || prev[Object.keys(prev)[0]];
      let newBatt = target.telemetry.battery;
      let newTemp = target.telemetry.temperature;
      let newVolt = target.telemetry.voltage;
      let newSig = target.telemetry.signalStrength;
      let newProb = isCrit ? 92.4 : isWarn ? 68.0 : 12.0;
      let newHealth = isCrit ? 38 : isWarn ? 72 : 95;

      if (normalizedKey.includes('temp') || normalizedKey.includes('heat')) {
        newTemp = isCrit ? 59.8 : isWarn ? 46.2 : 24.5;
        newBatt = Math.max(30, target.telemetry.battery - (isCrit ? 15 : 6));
      } else if (normalizedKey.includes('comm') || normalizedKey.includes('signal') || normalizedKey.includes('packet')) {
        newSig = isCrit ? 15 : isWarn ? 45 : 95;
      } else if (normalizedKey.includes('solar')) {
        newBatt = isCrit ? 36 : isWarn ? 62 : 90;
        newVolt = isCrit ? 24.8 : isWarn ? 26.5 : 28.5;
      } else {
        newBatt = isCrit ? 30 : isWarn ? 55 : target.telemetry.battery;
        newTemp = isCrit ? 56.4 : isWarn ? 44.0 : target.telemetry.temperature;
        newVolt = isCrit ? 22.8 : isWarn ? 25.4 : target.telemetry.voltage;
      }

      const updatedSat: SatelliteEntry = {
        ...target,
        status: isCrit ? 'CRITICAL' : isWarn ? 'WARNING' : 'NOMINAL',
        telemetry: {
          ...target.telemetry,
          battery: newBatt,
          temperature: newTemp,
          voltage: newVolt,
          signalStrength: newSig,
          voltageStatus: isCrit ? `Critical (${newVolt}V)` : isWarn ? `Unstable (${newVolt}V)` : `Nominal (${newVolt}V)`,
          anomalyProbability: newProb,
          healthScore: newHealth,
          linkStatus: isCrit ? 'CRITICAL' : isWarn ? 'DEGRADED' : 'STRONG',
          batteryTrend: [target.telemetry.battery, target.telemetry.battery - 5, newBatt],
          tempTrend: [target.telemetry.temperature, target.telemetry.temperature + 3, newTemp],
          voltageTrend: [target.telemetry.voltage, target.telemetry.voltage - 0.8, newVolt],
        },
      };

      // Build & update active diagnosis immediately
      const diag = buildDynamicDiagnosis(updatedSat, normalizedKey, severity, mlResult);
      setCurrentDiagnosis(diag);

      // Set active alert
      setSelectedAlert({
        id: `ALERT-${Date.now()}`,
        satId,
        satName: target.name || satId,
        subsystem: diag.subsystem,
        severity,
        title: `${diag.subsystem} ANOMALY DETECTED`,
        desc: diag.explanation,
        time: new Date().toLocaleTimeString(),
        currentBattery: newBatt,
        temperature: newTemp,
        voltageStr: `${newVolt}V`,
        aiConfidence: Number((diag.detectionConfidence || diag.confidence || '95').replace(/[^0-9.]/g, '')) || 95,
        predictedRisk: diag.riskLevel,
        estimatedTimeToCritical: diag.trend,
        recommendedAction: diag.recommendedAction,
        acknowledged: false,
      });

      return {
        ...prev,
        [satId]: updatedSat,
      };
    });
  }, [buildDynamicDiagnosis]);

  // Step-by-step Sequential Demonstration with Dynamic Scenario & Satellite
  const startAnomalySimulation = useCallback((
    targetSatId?: string,
    scenarioKey?: string,
    severityTarget: 'INFO' | 'WARNING' | 'CRITICAL' = 'CRITICAL'
  ) => {
    const satId = targetSatId || activeSatelliteId || 'SAT-001';
    resetDemo();
    setIsSimulating(true);
    setSimulationStep(1);
    setActiveSatelliteId(satId);

    // Assign satellite-specific physical anomaly if not explicitly provided
    let effectiveKey = scenarioKey;
    if (!effectiveKey || effectiveKey === 'default') {
      if (satId === 'SAT-002') effectiveKey = 'thermal_overheating';
      else if (satId === 'SAT-003') effectiveKey = 'communication_signal_loss';
      else if (satId === 'SAT-004') effectiveKey = 'solar_power_drop';
      else if (satId === 'SAT-005') effectiveKey = 'attitude_drift';
      else effectiveKey = 'battery_degradation';
    }

    const normalizedKey = (effectiveKey || 'battery_degradation').toLowerCase();
    const isThermal = normalizedKey.includes('temp') || normalizedKey.includes('heat');
    const isComm = normalizedKey.includes('comm') || normalizedKey.includes('signal') || normalizedKey.includes('packet');
    const isAttitude = normalizedKey.includes('attitude') || normalizedKey.includes('instability');
    const isSolar = normalizedKey.includes('solar');

    // Step 2: Telemetry analysis start (mild change)
    const t1 = setTimeout(async () => {
      setSimulationStep(2);
      let mlRes: MLAnomalyResponse | null = null;
      try {
        const res = await triggerAnomalyScenario(normalizedKey, 1, satId);
        if (res?.detection) {
          mlRes = res.detection;
          setLatestMLResult(res.detection);
        }
      } catch {}

      setSatellitesData((prev) => {
        const target = prev[satId] || prev['SAT-001'];
        const tel = target.telemetry;
        const newBatt = isThermal ? 88 : isSolar ? 76 : isComm ? tel.battery : 61;
        const newTemp = isThermal ? 39.5 : 32.0;
        const newVolt = isSolar ? 27.2 : isThermal ? 28.2 : 26.1;
        const newSig = isComm ? 72 : tel.signalStrength;

        return {
          ...prev,
          [satId]: {
            ...target,
            status: 'WARNING',
            telemetry: {
              ...tel,
              power: isSolar ? 68 : 82,
              battery: newBatt,
              temperature: newTemp,
              voltage: newVolt,
              signalStrength: newSig,
              voltageStatus: `Analyzing (${newVolt}V)`,
              anomalyProbability: mlRes ? Number((mlRes.anomaly_score * 100).toFixed(1)) : 28.0,
              healthScore: 84,
              linkStatus: isComm ? 'DEGRADED' : 'STRONG',
              batteryTrend: [tel.battery, tel.battery - 2, newBatt],
              tempTrend: [tel.temperature, tel.temperature + 2, newTemp],
              voltageTrend: [tel.voltage, tel.voltage - 0.4, newVolt],
            },
          },
        };
      });
    }, 2200);

    // Step 3: Anomaly Detected via ML (moderate deviation)
    const t2 = setTimeout(async () => {
      setSimulationStep(3);
      let mlRes: MLAnomalyResponse | null = null;
      try {
        const res = await triggerAnomalyScenario(normalizedKey, 2, satId);
        if (res?.detection) {
          mlRes = res.detection;
          setLatestMLResult(res.detection);
        }
      } catch {}

      setSatellitesData((prev) => {
        const target = prev[satId] || prev['SAT-001'];
        const tel = target.telemetry;
        const newBatt = isThermal ? 82 : isSolar ? 58 : isComm ? tel.battery : 45;
        const newTemp = isThermal ? 48.0 : 38.0;
        const newVolt = isSolar ? 25.8 : isThermal ? 27.8 : 24.5;
        const newSig = isComm ? 48 : tel.signalStrength;

        return {
          ...prev,
          [satId]: {
            ...target,
            status: 'WARNING',
            telemetry: {
              ...tel,
              power: isSolar ? 52 : 68,
              battery: newBatt,
              temperature: newTemp,
              voltage: newVolt,
              signalStrength: newSig,
              voltageStatus: `Warning (${newVolt}V)`,
              anomalyProbability: mlRes ? Number((mlRes.anomaly_score * 100).toFixed(1)) : 68.5,
              healthScore: 68,
              linkStatus: isComm ? 'DEGRADED' : 'STRONG',
              batteryTrend: [tel.battery, tel.battery - 4, newBatt],
              tempTrend: [tel.temperature, tel.temperature + 4, newTemp],
              voltageTrend: [tel.voltage, tel.voltage - 0.8, newVolt],
            },
          },
        };
      });
    }, 4500);

    // Step 4: AI Diagnosis with Full XAI Evidence
    const t3 = setTimeout(async () => {
      setSimulationStep(4);
      let mlRes: MLAnomalyResponse | null = null;
      try {
        const res = await triggerAnomalyScenario(normalizedKey, 3, satId);
        if (res?.detection) {
          mlRes = res.detection;
          setLatestMLResult(res.detection);
        }
      } catch {}

      setSatellitesData((prev) => {
        const target = prev[satId] || prev['SAT-001'];
        const tel = target.telemetry;
        const newBatt = isThermal ? 76 : isSolar ? 42 : isComm ? tel.battery : 36;
        const newTemp = isThermal ? 55.4 : 44.0;
        const newVolt = isSolar ? 24.2 : isThermal ? 27.2 : 23.4;
        const newSig = isComm ? 25 : tel.signalStrength;

        const updatedSat: SatelliteEntry = {
          ...target,
          status: 'CRITICAL',
          telemetry: {
            ...tel,
            power: isSolar ? 38 : 56,
            battery: newBatt,
            temperature: newTemp,
            voltage: newVolt,
            signalStrength: newSig,
            voltageStatus: `Critical Threshold (${newVolt}V)`,
            anomalyProbability: mlRes ? Number((mlRes.anomaly_score * 100).toFixed(1)) : 86.5,
            healthScore: 48,
            linkStatus: isComm ? 'CRITICAL' : 'STRONG',
            batteryTrend: [tel.battery, tel.battery - 6, newBatt],
            tempTrend: [tel.temperature, tel.temperature + 5, newTemp],
            voltageTrend: [tel.voltage, tel.voltage - 1.2, newVolt],
          },
        };

        const diag = buildDynamicDiagnosis(updatedSat, normalizedKey, severityTarget, mlRes);
        setCurrentDiagnosis(diag);

        return {
          ...prev,
          [satId]: updatedSat,
        };
      });
    }, 6800);

    // Step 5: High Risk Prediction
    const t4 = setTimeout(() => {
      setSimulationStep(5);
      setSatellitesData((prev) => {
        const target = prev[satId] || prev['SAT-001'];
        const tel = target.telemetry;
        const newBatt = isThermal ? 70 : isSolar ? 30 : isComm ? tel.battery : 30;
        const newTemp = isThermal ? 61.2 : 48.0;
        const newVolt = isSolar ? 23.0 : isThermal ? 26.8 : 22.8;
        const newSig = isComm ? 12 : tel.signalStrength;

        const updatedSat: SatelliteEntry = {
          ...target,
          status: 'CRITICAL',
          telemetry: {
            ...tel,
            power: isSolar ? 24 : 50,
            battery: newBatt,
            temperature: newTemp,
            voltage: newVolt,
            signalStrength: newSig,
            voltageStatus: `Critical Undervoltage (${newVolt}V)`,
            anomalyProbability: 94.2,
            healthScore: 36,
            linkStatus: isComm ? 'CRITICAL' : 'STRONG',
            batteryTrend: [tel.battery, tel.battery - 8, newBatt],
            tempTrend: [tel.temperature, tel.temperature + 6, newTemp],
            voltageTrend: [tel.voltage, tel.voltage - 1.4, newVolt],
          },
        };

        const diag = buildDynamicDiagnosis(updatedSat, normalizedKey, severityTarget);
        setCurrentDiagnosis(diag);

        return {
          ...prev,
          [satId]: updatedSat,
        };
      });
    }, 9200);

    // Step 6: Action Ready & Automatically Open Diagnosis Result
    const t5 = setTimeout(() => {
      setSimulationStep(6);
      setIsSimulating(false);
      setIsAIDiagnosisModalOpen(true);
    }, 11500);

    simulationTimeoutsRef.current = [t1, t2, t3, t4, t5];
  }, [activeSatelliteId, buildDynamicDiagnosis, resetDemo]);


  const activatePowerSavingMode = useCallback(() => {
    setPowerSavingModeActive(true);
    setSatellitesData((prev) => {
      const target = prev[activeSatelliteId] || prev['SAT-002'];
      return {
        ...prev,
        [activeSatelliteId]: {
          ...target,
          status: 'WARNING',
          telemetry: {
            ...target.telemetry,
            power: 45,
            battery: 35,
            temperature: 42.0,
            voltage: 25.2,
            voltageStatus: 'Stabilized (25.2V)',
            signalStrength: 65,
            linkStatus: 'DEGRADED',
            anomalyProbability: 41.0,
            healthScore: 65,
            batteryTrend: [30, 31, 32, 33, 34, 35, 35],
            tempTrend: [59.8, 55.0, 50.2, 46.8, 44.1, 42.8, 42.0],
            voltageTrend: [22.8, 23.5, 24.2, 24.8, 25.0, 25.1, 25.2],
          },
        },
      };
    });
  }, [activeSatelliteId]);

  const openAlertModal = (alert: AnomalyAlert) => {
    setSelectedAlert(alert);
    setIsAlertModalOpen(true);
  };

  const closeAlertModal = () => setIsAlertModalOpen(false);
  const openAIDiagnosisModal = () => setIsAIDiagnosisModalOpen(true);
  const closeAIDiagnosisModal = () => setIsAIDiagnosisModalOpen(false);
  const openAddSatelliteModal = () => setIsAddSatelliteModalOpen(true);
  const closeAddSatelliteModal = () => setIsAddSatelliteModalOpen(false);
  const openSimulateModal = () => setIsSimulateModalOpen(true);
  const closeSimulateModal = () => setIsSimulateModalOpen(false);

  const openSendReportModal = (satId?: string) => {
    setTargetReportSatId(satId || activeSatelliteId);
    setIsSendReportModalOpen(true);
  };
  const closeSendReportModal = () => {
    setIsSendReportModalOpen(false);
    setTargetReportSatId(null);
  };

  const openModelValidationModal = () => setIsModelValidationModalOpen(true);
  const closeModelValidationModal = () => setIsModelValidationModalOpen(false);

  const acknowledgeAlert = (alertId: string) => {
    if (selectedAlert && selectedAlert.id === alertId) {
      setSelectedAlert({ ...selectedAlert, acknowledged: true });
    }
  };

  // Satellite-specific active diagnosis resolver: guarantees diagnosis dynamically matches the active satellite
  const resolvedDiagnosis = useMemo(() => {
    if (currentDiagnosis && currentDiagnosis.satelliteId === activeSatelliteId) {
      return currentDiagnosis;
    }
    const currentSat = satellitesData[activeSatelliteId] || satellitesData['SAT-001'];
    if (!currentSat) return currentDiagnosis;

    // Auto-detect scenario key from satellite telemetry and operational status
    let autoKey = 'nominal';
    const tel = currentSat.telemetry;
    if (currentSat.status === 'CRITICAL' || currentSat.status === 'WARNING' || (tel && tel.anomalyProbability > 15)) {
      if (tel && tel.temperature > 40.0) autoKey = 'thermal';
      else if (tel && (tel.voltage < 26.5 || tel.battery < 50)) autoKey = 'battery';
      else if (tel && tel.signalStrength < 60) autoKey = 'comm';
      else if (tel && tel.power < 60) autoKey = 'solar';
      else if (activeSatelliteId === 'SAT-004') autoKey = 'thermal';
      else if (activeSatelliteId === 'SAT-002') autoKey = 'thermal';
      else if (activeSatelliteId === 'SAT-003') autoKey = 'comm';
      else autoKey = 'battery';
    }

    const severity: 'INFO' | 'WARNING' | 'CRITICAL' =
      currentSat.status === 'CRITICAL' ? 'CRITICAL' : currentSat.status === 'WARNING' ? 'WARNING' : 'INFO';

    return buildDynamicDiagnosis(currentSat, autoKey, severity, latestMLResult);
  }, [currentDiagnosis, activeSatelliteId, satellitesData, buildDynamicDiagnosis, latestMLResult]);

  return (
    <SimulationContext.Provider
      value={{
        demoMode,
        setDemoMode,
        simulationStep,
        isSimulating,
        missionStatus,
        telemetryLastUpdatedSec,
        satellitesData,
        activeSatelliteId,
        setActiveSatelliteId,
        startAnomalySimulation,
        simulateCustomAnomaly,
        resetDemo,
        selectedAlert,
        isAlertModalOpen,
        openAlertModal,
        closeAlertModal,
        isAIDiagnosisModalOpen,
        openAIDiagnosisModal,
        closeAIDiagnosisModal,
        acknowledgeAlert,
        powerSavingModeActive,
        activatePowerSavingMode,
        stepName,
        currentDiagnosis: resolvedDiagnosis,
        latestMLResult,
        latestMLRiskResult,
        mlInferenceOffline,
        lastInferenceLatencyMs,
        triggerMLInference,
        addNewSatellite,
        refreshSatellitesList,
        isAddSatelliteModalOpen,
        openAddSatelliteModal,
        closeAddSatelliteModal,
        isSimulateModalOpen,
        openSimulateModal,
        closeSimulateModal,
        isSendReportModalOpen,
        openSendReportModal,
        closeSendReportModal,
        targetReportSatId,
        isModelValidationModalOpen,
        openModelValidationModal,
        closeModelValidationModal,
        anomalyThreshold,
        setAnomalyThreshold,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

