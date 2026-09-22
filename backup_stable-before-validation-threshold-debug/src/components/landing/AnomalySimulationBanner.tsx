import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';

export type SimulationStage = 'NORMAL' | 'ANALYZING' | 'DETECTED' | 'DIAGNOSIS';

interface AnomalySimulationBannerProps {
  stage: SimulationStage;
  onViewDiagnosis: () => void;
  onAcknowledgeAlert: () => void;
  onResetNominal: () => void;
}

export const AnomalySimulationBanner: React.FC<AnomalySimulationBannerProps> = ({
  stage,
  onViewDiagnosis,
  onAcknowledgeAlert,
  onResetNominal,
}) => {
  if (stage === 'NORMAL') return null;

  return (
    <div className="sticky top-[66px] z-50 animate-fadeIn">
      {/* ── STAGE 1: ANALYZING TELEMETRY ── */}
      {stage === 'ANALYZING' && (
        <div className="px-6 py-3 bg-gradient-to-r from-[#0a192f] via-[#0f284c] to-[#0a192f] border-b border-cyan-500/40 backdrop-blur-md text-xs text-white flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-[#00eaff] animate-spin" />
            <div>
              <span className="font-bold text-cyan-300 uppercase tracking-wider">
                ANALYZING FLEET TELEMETRY...
              </span>
              <span className="text-slate-300 ml-2">
                Running real-time neural multi-variate drift inference across 12 subsystems.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px]">
            <Search className="w-3.5 h-3.5 animate-pulse" />
            <span>SPECTRAL AUDIT IN PROGRESS (84%)</span>
          </div>
        </div>
      )}

      {/* ── STAGE 2 & 3: ANOMALY DETECTED / AI DIAGNOSIS ALERT BANNER ── */}
      {(stage === 'DETECTED' || stage === 'DIAGNOSIS') && (
        <div
          className="px-6 py-3.5 bg-gradient-to-r from-[#2a0808] via-[#1a0505] to-[#2a0808] border-b-2 border-red-500 backdrop-blur-lg text-xs text-white shadow-[0_10px_35px_rgba(239,68,68,0.3)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none"
        >
          {/* Left: Alert Icon & Primary Details */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/20 border border-red-500/60 text-red-400 shrink-0 mt-0.5 sm:mt-0 shadow-[0_0_12px_rgba(239,68,68,0.5)]">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans font-black text-sm text-red-300 uppercase tracking-wide">
                  ⚠ ANOMALY DETECTED
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-red-900/60 border border-red-500/40 text-red-200">
                  SUBSYSTEM: POWER SYSTEM
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-red-500/20 text-red-300">
                  SEVERITY: HIGH
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                  AI CONFIDENCE: 94.7%
                </span>
              </div>

              <div className="mt-1 text-slate-200 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  <strong>Prediction:</strong> "Potential solar panel degradation detected."
                </span>
                <span className="text-slate-400">·</span>
                <span>
                  <strong>Failure Window:</strong> 18–24 hours
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300">
                  <strong>Action:</strong> Inspect solar array telemetry and power-generation trend.
                </span>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={onViewDiagnosis}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(239,68,68,0.6)] cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>VIEW DIAGNOSIS</span>
            </button>

            <button
              type="button"
              onClick={onAcknowledgeAlert}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5 text-[#00ff9d]" />
              <span>ACKNOWLEDGE ALERT</span>
            </button>

            <button
              type="button"
              onClick={onResetNominal}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white font-medium text-[11px] uppercase transition-colors cursor-pointer"
              title="Reset simulation back to normal state"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
