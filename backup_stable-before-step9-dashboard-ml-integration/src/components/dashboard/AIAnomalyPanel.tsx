import React from 'react';
import { Brain, ArrowRight, ShieldCheck, Activity, BarChart3 } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

interface AIAnomalyPanelProps {
  onViewAll: () => void;
}

export const AIAnomalyPanel: React.FC<AIAnomalyPanelProps> = ({ onViewAll }) => {
  const {
    openAIDiagnosisModal,
    openModelValidationModal,
    simulationStep,
    satellitesData,
    activeSatelliteId,
    currentDiagnosis,
  } = useSimulation();

  const currentSat = satellitesData[activeSatelliteId] || satellitesData[Object.keys(satellitesData)[0]] || {
    name: 'AGIS-3',
    id: 'SAT-001',
    mission: 'COMMS SATELLITE',
    status: 'NOMINAL' as const,
    telemetry: { anomalyProbability: 1.2, battery: 88, healthScore: 98, temperature: 24.5, voltage: 28.5 },
  };
  const probability = currentSat.telemetry?.anomalyProbability || 2.4;
  const isHighRisk = probability > 50 || currentSat.status === 'CRITICAL';

  // Dynamic anomaly issue & recommendations based on current satellite state & active diagnosis
  let potentialIssue = currentDiagnosis?.anomalyType || 'System Operating Nominally';
  let estTime = currentDiagnosis?.timeToFailureEstimate || (currentSat.status === 'CRITICAL' ? 'Trajectory: Divergent Trend' : 'Stable trend — no threshold crossing projected');
  let recommendedAction = currentDiagnosis?.recommendedAction || 'Maintain nominal stationkeeping schedule & solar array tracking.';

  if (!currentDiagnosis) {
    if (currentSat.telemetry?.battery < 45) {
      potentialIssue = 'Battery Degradation & Bus Undervoltage';
      estTime = 'Trajectory: Accelerated Discharge';
      recommendedAction = 'Inspect battery subsystem & activate autonomous power-saving mode.';
    } else if (currentSat.telemetry?.temperature > 45) {
      potentialIssue = 'Thermal Heat Exchanger Degradation';
      estTime = 'Trajectory: Thermal Elevation';
      recommendedAction = 'Deploy auxiliary radiator louvers and adjust solar orientation.';
    } else if (currentSat.telemetry?.voltage < 25) {
      potentialIssue = 'Bus Voltage Shunt Instability';
      estTime = 'Trajectory: Voltage Deviation';
      recommendedAction = 'Reset main EPS shunt regulator bus controller.';
    }
  }

  return (
    <div
      className="rounded-xl p-4 select-none relative overflow-hidden flex flex-col justify-between h-full font-sans"
      style={{
        background: '#000000',
        border: '1px solid #15803D',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(34, 197, 94, 0.2), 0 0 10px rgba(21, 128, 61, 0.15)',
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#00BFFF]" />
          <h3 className="font-sans font-bold text-[13px] text-[#F1F5F9] uppercase tracking-wider">
            AI ANOMALY DETECTION
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openModelValidationModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-sans text-[10.5px] font-black tracking-wider uppercase transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.5)] hover:shadow-[0_0_16px_rgba(6,182,212,0.8)] hover:scale-105 active:scale-95 border border-cyan-300/60"
            title="Empirical AI Model Validation & Metrics Benchmark"
          >
            <BarChart3 className="w-3 h-3 text-white animate-pulse" />
            <span className="hidden sm:inline font-black">VALIDATION</span>
          </button>
          <button
            type="button"
            onClick={openAIDiagnosisModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E3A8A] border border-[#3B82F6]/50 text-[#DBEAFE] hover:bg-[#1E40AF] font-sans text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer shadow-[0_0_8px_rgba(30,58,138,0.4)]"
          >
            <span>VIEW AI DIAGNOSIS</span>
            <ArrowRight className="w-2.5 h-2.5 text-[#93C5FD]" />
          </button>
        </div>
      </div>

      {/* ── METRICS: TOTAL ANOMALIES & BREAKDOWN & CONFIDENCE ── */}
      <div className="py-2.5 border-b border-white/[0.08] flex items-center justify-between gap-3 font-sans">
        {/* Left: Total */}
        <div>
          <div className="text-[26px] font-black text-[#F1F5F9] leading-none tracking-tight font-mono">
            {isHighRisk ? 18 : 17}
          </div>
          <div className="text-[9.5px] uppercase tracking-wider text-[#94A3B8] font-bold mt-1">
            TOTAL ANOMALIES
          </div>
        </div>

        {/* Middle: Critical / Warning / Info */}
        <div className="flex items-center gap-2.5 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-white/15">
          <div className="text-center">
            <div className="text-[8.5px] uppercase text-[#94A3B8] font-semibold">Critical</div>
            <div className="font-black text-[#EF4444] text-[13px]">{isHighRisk ? 5 : 4}</div>
          </div>
          <div className="w-[1px] h-6 bg-white/10" />
          <div className="text-center">
            <div className="text-[8.5px] uppercase text-[#94A3B8] font-semibold">Warning</div>
            <div className="font-black text-[#F59E0B] text-[13px]">6</div>
          </div>
          <div className="w-[1px] h-6 bg-white/10" />
          <div className="text-center">
            <div className="text-[8.5px] uppercase text-[#94A3B8] font-semibold">Info</div>
            <div className="font-black text-[#00BFFF] text-[13px]">7</div>
          </div>
        </div>

        {/* Right: AI Confidence */}
        <div className="text-right">
          <div className="text-[9.5px] uppercase tracking-wider text-[#94A3B8] font-bold">
            CONFIDENCE
          </div>
          <div className="font-sans text-[20px] font-black text-[#22C55E] mt-0.5 leading-none font-mono">
            {currentDiagnosis?.confidence || (isHighRisk ? '96.2%' : '98.5%')}
          </div>
        </div>
      </div>

      {/* ── INNER CARD: AI PREDICTION SECTION ── */}
      <div
        className="p-3.5 rounded-xl relative overflow-hidden font-sans my-1.5 shadow-md"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        }}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#D97706]" />
            <span className="font-black text-[12px] uppercase tracking-wider text-[#0f172a]">
              AI PREDICTION
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-mono font-black tracking-wider uppercase border ${
              isHighRisk
                ? 'bg-red-100 border-red-300 text-red-700 shadow-sm'
                : 'bg-green-100 border-green-300 text-green-700'
            }`}
          >
            {isHighRisk ? 'HIGH RISK' : 'NOMINAL'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 text-[11.5px]">
          <div>
            <span className="text-slate-500 text-[10px] block font-semibold">Satellite:</span>
            <span className="font-black text-[#0f172a] text-[12px]">{currentSat.name}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block font-semibold">Potential Issue:</span>
            <span className="font-black text-[#DC2626] text-[12px]">{potentialIssue}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block font-semibold">Probability:</span>
            <span
              className="font-bold text-[#0284C7] text-[12.5px]"
              style={{ fontFamily: "'Space Grotesk', 'JetBrains Mono', monospace" }}
            >
              {probability.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block font-semibold">Estimated Time:</span>
            <span
              className="font-bold text-[#D97706] text-[12.5px]"
              style={{ fontFamily: "'Space Grotesk', 'JetBrains Mono', monospace" }}
            >
              {estTime}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-start gap-2 text-[10.5px] text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
          <span className="leading-tight">
            <strong className="text-[#0f172a] font-black">Recommended Action:</strong> {recommendedAction}
          </span>
        </div>
      </div>

      {/* ── FOOTER: VIEW AI DIAGNOSIS BUTTON ── */}
      <div className="pt-1">
        <button
          type="button"
          onClick={openAIDiagnosisModal}
          className="w-full py-2.5 px-3 rounded-lg bg-[#1E40AF] hover:bg-[#1D4ED8] border border-[#60A5FA]/60 text-white font-sans text-[11px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(30,64,175,0.6)]"
        >
          <Brain className="w-3.5 h-3.5 text-[#93C5FD]" />
          <span>VIEW AI DIAGNOSIS</span>
          <ArrowRight className="w-3 h-3 text-[#BFDBFE]" />
        </button>
      </div>
    </div>
  );
};

