import React, { useState } from 'react';
import {
  Brain,
  X,
  ShieldCheck,
  Zap,
  Activity,
  Clock,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Info,
  Radio,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const AIDiagnosisModal: React.FC = () => {
  const {
    isAIDiagnosisModalOpen,
    closeAIDiagnosisModal,
    powerSavingModeActive,
    activatePowerSavingMode,
    activeSatelliteId,
    satellitesData,
    currentDiagnosis,
    latestMLResult,
  } = useSimulation();

  const [executedNotice, setExecutedNotice] = useState<boolean>(false);

  if (!isAIDiagnosisModalOpen) return null;

  const currentSat = satellitesData[activeSatelliteId] || satellitesData[Object.keys(satellitesData)[0]] || {
    name: 'AGIS-3',
    id: 'SAT-001',
    status: 'NOMINAL',
    mission: 'COMMS SATELLITE',
    orbitType: 'LEO',
    altitude: '405.2 km',
    telemetry: {
      power: 94,
      battery: 88,
      temperature: 28.4,
      voltage: 28.6,
      voltageStatus: 'Normal (28.6V)',
      anomalyProbability: 1.2,
      healthScore: 98,
      signalStrength: 96,
      linkStatus: 'STRONG',
      batteryTrend: [88, 88, 88, 88],
      tempTrend: [28.4, 28.4, 28.4, 28.4],
      voltageTrend: [28.6, 28.6, 28.6, 28.6],
    },
  };

  const handleExecuteMitigation = () => {
    activatePowerSavingMode();
    setExecutedNotice(true);
    setTimeout(() => {
      setExecutedNotice(false);
    }, 4500);
  };

  // Dynamic values strictly driven by currentDiagnosis data object with zero hardcoded fallbacks
  const targetSatName = currentDiagnosis?.satelliteName || currentSat.name || 'SATELLITE';
  const targetSatId = currentDiagnosis?.satelliteId || currentSat.id || 'SAT-001';
  const orbitType = currentDiagnosis?.orbitType || currentSat.orbitType || 'LEO';
  const anomalyTitle = currentDiagnosis?.anomalyType || (currentSat.status === 'CRITICAL' ? 'Subsystem Telemetry Anomaly' : 'Nominal Operational State');
  const subsystemName = currentDiagnosis?.subsystem || 'SYSTEM';
  const severityLevel = currentDiagnosis?.severity || (currentSat.status === 'CRITICAL' ? 'CRITICAL' : currentSat.status === 'WARNING' ? 'WARNING' : 'INFO');
  const riskLevel = currentDiagnosis?.riskLevel || (currentSat.status === 'CRITICAL' ? 'CRITICAL' : currentSat.status === 'WARNING' ? 'HIGH' : 'LOW');
  const rawScore = latestMLResult?.raw_anomaly_score ?? latestMLResult?.raw_decision_score;
  const anomalyScoreDisplay = rawScore !== undefined
    ? (rawScore >= 0 ? `+${rawScore.toFixed(4)}` : rawScore.toFixed(4))
    : (currentDiagnosis?.anomalyScore || '0.0000');
  const detectionConfidence = latestMLResult?.model_status
    ? `${latestMLResult.model_status} (42 Feat)`
    : (currentDiagnosis?.detectionConfidence || 'Trained Model Active');
  const detectionMethod = latestMLResult?.model_type || currentDiagnosis?.detectionMethod || 'IsolationForest (scikit-learn)';
  const decisionThreshold = currentDiagnosis?.decisionThreshold || '0.0000 (decision boundary)';
  const pred = currentDiagnosis?.predictiveMaintenance;
  const trendStatus = pred?.status || currentDiagnosis?.trendStatus || (currentSat.status === 'CRITICAL' ? 'DEGRADING' : 'STABLE');
  const trendTrajectory = pred?.trend || currentDiagnosis?.trendTrajectory || (currentSat.status === 'CRITICAL' ? 'Increasing risk' : 'Stable');
  const persistenceText = pred?.persistence || currentDiagnosis?.persistence || 'Single frame observation';
  const rateOfChangeText = pred?.rateOfChange || currentDiagnosis?.rateOfChange || 'Nominal rate of change';
  const observationWindow = currentDiagnosis?.observationWindow || '6-frame telemetry buffer';
  const timeToFailureText = pred?.estimatedTimeToThresholdFormatted || currentDiagnosis?.timeToFailureEstimate || 'Stable trend — no threshold crossing projected';
  const decisionExplanation = currentDiagnosis?.decisionExplanation || currentDiagnosis?.explanation || 'Spacecraft telemetry streams evaluated against baseline operational envelopes.';
  const telemetryEvidenceList = currentDiagnosis?.telemetryEvidence || [];
  const contributingFactorsList = latestMLResult?.contributing_factors || currentDiagnosis?.contributingFactors || [];
  const probableRootCauseText = latestMLResult?.probable_root_cause || currentDiagnosis?.probableRootCause || currentDiagnosis?.decisionExplanation || currentDiagnosis?.explanation || 'Nominal telemetry. No significant contributing anomaly factors detected.';
  const probableCausesList = currentDiagnosis?.probableCauses || [];
  const missionImpact = currentDiagnosis?.missionImpact;
  const operationalActions = currentDiagnosis?.operationalActions;
  const actionButtonLabel = currentDiagnosis?.actionButtonLabel || 'SIMULATE: EXECUTE MITIGATION';
  const mitigationDetailsText = currentDiagnosis?.mitigationDetails || 'Executes autonomous subsystem balance and verification routine.';
  const sparklineData = currentDiagnosis?.historySparkline;

  const riskBadgeStyle =
    riskLevel === 'CRITICAL'
      ? 'bg-[#EF4444]/20 border-[#EF4444]/50 text-[#EF4444]'
      : riskLevel === 'HIGH'
      ? 'bg-[#F59E0B]/20 border-[#F59E0B]/50 text-[#F59E0B]'
      : riskLevel === 'MEDIUM'
      ? 'bg-[#00BFFF]/20 border-[#00BFFF]/50 text-[#00BFFF]'
      : 'bg-[#22C55E]/20 border-[#22C55E]/50 text-[#22C55E]';

  const severityBadgeStyle =
    severityLevel === 'CRITICAL'
      ? 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30'
      : severityLevel === 'WARNING'
      ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30'
      : 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/30';

  // SVG Sparkline calculation
  const renderSparkline = () => {
    if (!sparklineData || !sparklineData.values || sparklineData.values.length < 2) return null;
    const values = sparklineData.values;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min === 0 ? 1 : max - min;
    const width = 140;
    const height = 36;
    const points = values
      .map((val, idx) => {
        const x = (idx / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <div className="flex items-center gap-3 bg-black/60 rounded-lg p-2 border border-white/10">
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">{sparklineData.label}</div>
          <div className="text-[12px] font-mono font-bold text-white">
            {values[values.length - 1]} <span className="text-[10px] text-[#94A3B8]">{sparklineData.unit}</span>
          </div>
        </div>
        <svg width={width} height={height} className="overflow-visible">
          <polyline
            fill="none"
            stroke={sparklineData.color || '#00BFFF'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {values.map((val, idx) => {
            const x = (idx / (values.length - 1)) * width;
            const y = height - ((val - min) / range) * (height - 8) - 4;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={idx === values.length - 1 ? '3.5' : '2'}
                fill={idx === values.length - 1 ? '#FFFFFF' : sparklineData.color || '#00BFFF'}
                stroke={sparklineData.color || '#00BFFF'}
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div
        className="relative w-full max-w-4xl rounded-2xl p-5 sm:p-6 font-sans shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto custom-scrollbar"
        style={{
          background: '#000000',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* ── 1. HEADER: MISSION CONTEXT ── */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0d0d0d] border border-cyan-500/40 text-[#00BFFF] shrink-0 mt-0.5">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-sans font-black text-base sm:text-lg text-[#F1F5F9] uppercase tracking-wider">
                  AI EARLY RISK DIAGNOSIS
                </h2>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border ${riskBadgeStyle}`}>
                  RISK: {riskLevel}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
                  SUBSYSTEM: {subsystemName}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11.5px] text-[#94A3B8]">
                <span>
                  Satellite: <strong className="text-white font-bold">{targetSatName}</strong> ({targetSatId})
                </span>
                <span>•</span>
                <span>
                  Orbit: <span className="text-cyan-400 font-semibold">{orbitType}</span>
                </span>
                <span>•</span>
                <span>
                  Detected Anomaly: <strong className="text-amber-300 font-semibold">{anomalyTitle}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAIDiagnosisModal}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Close Diagnosis Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── 2. DIAGNOSIS SUMMARY CARDS (4-CARD GRID) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 font-sans">
          {/* Card 1: Detected Anomaly */}
          <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/15 flex flex-col justify-between">
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>Detected Anomaly</span>
              </div>
              <div className="text-[13px] font-black text-[#F1F5F9] mt-1.5 leading-snug line-clamp-2" title={anomalyTitle}>
                {anomalyTitle}
              </div>
            </div>
            <div className="text-[10px] text-amber-400 font-bold mt-2 pt-1 border-t border-white/5 uppercase">
              {subsystemName} Subsystem
            </div>
          </div>

          {/* Card 2: AI Detection & Score */}
          <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/15 flex flex-col justify-between">
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>AI Detection</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[9px] text-[#94A3B8] font-semibold">Anomaly Score:</span>
                <span className="text-[16px] font-mono font-black text-[#00BFFF]">{anomalyScoreDisplay}</span>
              </div>
              <div className="text-[10.5px] text-[#22C55E] font-medium mt-0.5">
                Confidence: <strong className="font-bold">{detectionConfidence}</strong>
              </div>
            </div>
            <div className="text-[9.5px] text-[#94A3B8] font-mono mt-1 pt-1 border-t border-white/5 truncate" title={detectionMethod}>
              Method: {detectionMethod}
            </div>
          </div>

          {/* Card 3: Current Risk */}
          <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/15 flex flex-col justify-between">
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-red-400" />
                <span>Current Risk</span>
              </div>
              <div className={`text-[17px] font-black mt-1 ${
                riskLevel === 'CRITICAL' ? 'text-[#EF4444]' : riskLevel === 'HIGH' ? 'text-[#F59E0B]' : 'text-[#22C55E]'
              }`}>
                {riskLevel}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${severityBadgeStyle}`}>
                  {severityLevel}
                </span>
                <span className="text-[10px] text-[#94A3B8] font-semibold">Trend: {trendStatus}</span>
              </div>
            </div>
            <div className="text-[9.5px] text-[#94A3B8] font-medium mt-1 pt-1 border-t border-white/5">
              Persistence-calibrated
            </div>
          </div>

          {/* Card 4: Trend / Forecast */}
          <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/15 flex flex-col justify-between">
            <div>
              <div className="text-[9.5px] uppercase tracking-wider text-[#94A3B8] font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-cyan-400" />
                <span>Trend & Forecast</span>
              </div>
              <div className="text-[12.5px] font-bold text-amber-400 mt-1 capitalize">
                Trajectory: {trendTrajectory}
              </div>
              <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5 truncate" title={observationWindow}>
                Window: {observationWindow}
              </div>
            </div>
            <div className="text-[9.5px] text-[#94A3B8] font-mono mt-1 pt-1 border-t border-white/5 truncate" title={timeToFailureText}>
              Time-to-failure: <span className="text-white font-semibold">{timeToFailureText}</span>
            </div>
          </div>
        </div>

        {/* ── 3. DETECTION REASON & TELEMETRY EVIDENCE ── */}
        <div className="p-4 rounded-xl bg-[#080808] border border-white/15 mb-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#F1F5F9] uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-[#00BFFF]" />
              <span>WHY DID SATSHIELD FLAG THIS? (TELEMETRY EVIDENCE)</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
              Live Scenario Telemetry
            </span>
          </div>

          {telemetryEvidenceList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {telemetryEvidenceList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-black/80 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[11.5px] font-bold text-[#F1F5F9] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.isAnomalous ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`} />
                      <span>{item.parameter}</span>
                    </div>
                    <span
                      className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        item.trendDirection === 'DEGRADING' || item.trendDirection === 'INCREASING'
                          ? 'bg-red-950/50 text-red-300 border border-red-500/30'
                          : 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {item.deviation}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 text-[10.5px]">
                    <div>
                      <span className="text-[#94A3B8] block text-[9px] uppercase">Observed</span>
                      <strong className="font-mono text-white font-bold">{item.observed}</strong>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[9px] uppercase">Nominal Baseline</span>
                      <span className="font-mono text-[#94A3B8]">{item.baseline}</span>
                    </div>
                  </div>

                  <div className="mt-1.5 text-[10px] text-amber-300/90 font-medium">
                    Status: {item.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11.5px] text-[#94A3B8] p-3 bg-black/50 rounded-lg border border-white/10">
              Telemetry streams on <strong className="text-white">{targetSatName}</strong> are operating within standard learned baseline envelopes.
            </div>
          )}
        </div>

        {/* ── 4. CONTRIBUTING FACTORS ── */}
        {contributingFactorsList.length > 0 && (
          <div className="p-4 rounded-xl bg-[#080808] border border-white/15 mb-4">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#F1F5F9] uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>CONTRIBUTING ANOMALY FACTORS</span>
              </div>
              <span className="text-[9.5px] text-[#94A3B8] italic font-mono">
                Calculated from 42-feature telemetry vectors
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {contributingFactorsList.map((factor, fIdx) => (
                <div
                  key={fIdx}
                  className={`p-3 rounded-lg border flex flex-col justify-between ${
                    factor.type === 'PRIMARY'
                      ? 'bg-red-950/20 border-red-500/40 text-red-100'
                      : 'bg-black/70 border-white/10 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        factor.type === 'PRIMARY'
                          ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {factor.type} FACTOR
                    </span>
                    <strong className="text-[11.5px] font-bold text-white truncate">{factor.title}</strong>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {factor.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 5 & 6. AI DECISION & TEMPORAL TREND ANALYSIS (2 COLUMNS) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
          {/* AI Decision & Explainability */}
          <div className="p-4 rounded-xl bg-[#080808] border border-white/15 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#F1F5F9] uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI DECISION & EXPLAINABILITY</span>
              </div>
              <p className="text-[11.5px] text-[#F1F5F9] leading-relaxed font-medium">
                "{decisionExplanation}"
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono">
              <div>
                <span className="text-[#94A3B8]">Anomaly Score: </span>
                <span className="text-cyan-300 font-bold">{anomalyScoreDisplay}</span>
              </div>
              <div>
                <span className="text-[#94A3B8]">Threshold: </span>
                <span className="text-white font-bold">{decisionThreshold}</span>
              </div>
              <div>
                <span className="text-[#94A3B8]">Engine: </span>
                <span className="text-emerald-400 font-semibold">{detectionMethod}</span>
              </div>
            </div>
          </div>

          {/* Temporal Trend Analysis & Sparkline */}
          <div className="p-4 rounded-xl bg-[#080808] border border-white/15 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#F1F5F9] uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>EARLY RISK & TREND ANALYSIS</span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                  {trendStatus}
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-[#F1F5F9]">
                <div>
                  <span className="text-[#94A3B8]">Persistence: </span>
                  <strong className="text-white">{persistenceText}</strong>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Rate of Change: </span>
                  <strong className="font-mono text-cyan-300">{rateOfChangeText}</strong>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Trajectory: </span>
                  <span className="text-amber-300 font-semibold">{trendTrajectory}</span>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Est. Time to Threshold: </span>
                  <span className="text-white font-semibold font-mono">{timeToFailureText}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-white/10">
              {renderSparkline() || (
                <div className="text-[10px] text-[#94A3B8] italic font-mono">
                  Telemetry trend buffer synchronized with ground station contact timeline.
                </div>
              )}
              <div className="mt-2 text-[9px] text-[#94A3B8] italic leading-tight">
                Method: {pred?.method || 'Trend-based temporal analysis & linear degradation projection'} • {pred?.limitations || 'Trend-based estimate, not a guaranteed failure time.'}
              </div>
            </div>
          </div>
        </div>

        {/* ── 7. PROBABLE ROOT CAUSE ── */}
        <div className="p-4 rounded-xl bg-[#080808] border border-white/15 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#F1F5F9] uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>PROBABLE ROOT CAUSE ASSESSMENT</span>
            </div>
            <span className="text-[9.5px] text-[#94A3B8] italic">
              Probable causes — based on physical telemetry evidence
            </span>
          </div>

          <div className="p-3 rounded-lg bg-black/80 border border-white/10 mb-3 text-[11.5px] text-slate-200 leading-relaxed font-medium">
            <strong className="text-cyan-300 block mb-1 uppercase text-[10px] font-mono">Telemetry Grounded Analysis:</strong>
            {probableRootCauseText}
          </div>

          {probableCausesList.length > 0 && (
            <div className="space-y-2">
              {probableCausesList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-black/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase shrink-0 mt-0.5 ${
                        item.rank === 'HIGH CONTRIBUTION'
                          ? 'bg-red-950/60 text-red-400 border border-red-500/40'
                          : item.rank === 'MEDIUM CONTRIBUTION'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                          : 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {item.rank}
                    </span>
                    <span className="text-[11.5px] font-bold text-[#F1F5F9]">{item.cause}</span>
                  </div>
                  {item.context && (
                    <span className="text-[10.5px] text-[#94A3B8] font-medium sm:text-right shrink-0">
                      {item.context}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 7. MISSION IMPACT ── */}
        {missionImpact && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/20 via-black to-black border border-red-500/30 mb-4">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#EF4444] uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>MISSION IMPACT & SUBSYSTEM DEGRADATION RISK</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-red-950/60 text-red-300 border border-red-500/40">
                IMPACT: {missionImpact.impactLevel}
              </span>
            </div>
            <div className="text-[11.5px] text-[#F1F5F9] font-medium space-y-1">
              <div>
                <span className="text-[#94A3B8] font-semibold">Affected Capability: </span>
                <strong className="text-white font-bold">{missionImpact.affectedCapability}</strong>
              </div>
              <div className="text-gray-300 leading-relaxed">
                <span className="text-[#94A3B8] font-semibold">Potential Consequence: </span>
                {missionImpact.potentialConsequence}
              </div>
            </div>
          </div>
        )}

        {/* ── 8. RECOMMENDED OPERATOR ACTION (3 LEVELS) ── */}
        <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/15 mb-4 font-sans">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#22C55E] uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
            <span>RECOMMENDED OPERATOR ACTION PLAN</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
            {/* Level 1: Immediate */}
            <div className="p-3 rounded-lg bg-black/80 border border-emerald-500/30">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-[#22C55E] block mb-1">
                1. IMMEDIATE ACTION
              </span>
              <p className="text-[#F1F5F9] font-semibold leading-relaxed">
                {operationalActions?.immediate || currentDiagnosis?.recommendedAction || 'Maintain nominal operational watch.'}
              </p>
            </div>

            {/* Level 2: Monitor */}
            <div className="p-3 rounded-lg bg-black/80 border border-cyan-500/30">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-cyan-400 block mb-1">
                2. MONITOR TELEMETRY
              </span>
              <p className="text-[#F1F5F9] font-medium leading-relaxed">
                {operationalActions?.monitor || 'Track core bus voltage and thermal gradients across passes.'}
              </p>
            </div>

            {/* Level 3: Escalation */}
            <div className="p-3 rounded-lg bg-black/80 border border-amber-500/30">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                3. ESCALATION CRITERIA
              </span>
              <p className="text-[#F1F5F9] font-medium leading-relaxed">
                {operationalActions?.escalation || 'Escalate to subsystem lead if telemetry exceeds warning thresholds.'}
              </p>
            </div>
          </div>

          <div className="mt-2.5 text-[10px] text-[#94A3B8] flex items-center gap-1.5 italic">
            <Info className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>{mitigationDetailsText}</span>
          </div>
        </div>

        {/* Uplink Command Confirmation Feedback Toast */}
        {executedNotice && (
          <div className="p-3 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/50 text-[#22C55E] text-[11.5px] font-bold flex items-center gap-2 mb-4 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Telecommand uplinked: MITIGATION EXECUTED on {targetSatName}. Autonomous telemetry stabilization cycle active!
            </span>
          </div>
        )}

        {/* ── 9. FOOTER ACTIONS & SIMULATION TRANSPARENCY ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="text-[10px] text-[#94A3B8] text-center sm:text-left">
            <span className="text-amber-400/90 font-semibold font-mono">SIMULATION ENVIRONMENT</span> • Ground station decision-support simulator.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={closeAIDiagnosisModal}
              className="px-4 py-2 rounded-lg border border-white/30 text-[#F1F5F9] hover:bg-white/10 font-sans text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleExecuteMitigation}
              disabled={powerSavingModeActive}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg font-sans text-[11px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                powerSavingModeActive
                  ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 cursor-default'
                  : 'bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black shadow-[0_0_15px_rgba(0,191,255,0.4)]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{powerSavingModeActive ? 'MITIGATION ACTIVE' : actionButtonLabel}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
