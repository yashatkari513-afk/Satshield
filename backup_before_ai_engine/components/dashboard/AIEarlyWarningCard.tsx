import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
} from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

interface AIEarlyWarningCardProps {
  onViewAnalysis: (satId: string) => void;
}

export const AIEarlyWarningCard: React.FC<AIEarlyWarningCardProps> = ({ onViewAnalysis }) => {
  const { executeCommand } = useTelemetry();
  const [actionSimulated, setActionSimulated] = useState(false);

  const handleSimulateResponse = async () => {
    setActionSimulated(true);
    await executeCommand('POWER_MITIGATE_BATTERY_LOAD SENTINEL-9');
  };

  return (
    <div
      className="rounded-xl p-5 select-none relative overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 59, 59, 0.08) 0%, rgba(3, 10, 24, 0.95) 45%, rgba(0, 217, 255, 0.06) 100%)',
        border: '1px solid rgba(255, 59, 59, 0.35)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 59, 59, 0.1)',
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-red-500/20 gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/15 border border-red-500/40 shrink-0">
            <AlertTriangle className="w-4 h-4 text-[#ff3b3b] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-[15px] text-white uppercase tracking-wider">
                AI EARLY WARNING
              </h3>
              <span className="text-[9px] font-mono-hud font-bold px-2 py-0.5 rounded bg-red-950/80 text-[#ff3b3b] border border-red-500/50 uppercase animate-pulse">
                HIGH RISK PREDICTION
              </span>
            </div>
            <div className="font-mono-hud text-[8.5px] uppercase tracking-widest text-[#ff3b3b]">
              PROACTIVE MULTI-SUBSYSTEM FAILURE FORECASTING
            </div>
          </div>
        </div>

        {/* Traditional vs SATCOM Health Comparison Banner (Section 18) */}
        <div className="hidden xl:flex items-center gap-2 font-mono-hud text-[10px] px-3 py-1.5 rounded-lg bg-black/50 border border-cyan-500/20">
          <span className="text-slate-400 line-through">Legacy: Detects AFTER Failure</span>
          <span className="text-cyan-400 font-bold">➔</span>
          <span className="text-[#00ff9d] font-bold">SATCOM: Predicts 6h+ Ahead & Recommends FDIR</span>
        </div>
      </div>

      {/* ── CORE PREDICTIVE CARD CONTENT (Section 10) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left Info Column (7 cols) */}
        <div className="lg:col-span-7 space-y-3 font-mono-hud">
          <div className="flex items-center gap-3">
            <span className="font-display text-[18px] font-black text-white tracking-wide">
              SENTINEL-9
            </span>
            <span className="text-[11px] text-[#ff3b3b] font-bold px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30">
              Battery degradation predicted
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[8px] uppercase tracking-widest text-[#8ea2b8]">Probability</div>
              <div className="font-display text-[18px] font-bold text-[#ff3b3b] mt-0.5">87.4%</div>
            </div>

            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[8px] uppercase tracking-widest text-[#8ea2b8]">Time to Threshold</div>
              <div className="font-display text-[18px] font-bold text-white mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#00eaff]" />
                6h 24m
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[8px] uppercase tracking-widest text-[#8ea2b8]">Risk Level</div>
              <div className="font-display text-[18px] font-bold text-[#ff3b3b] mt-0.5">HIGH</div>
            </div>
          </div>

          {/* Recommended Action */}
          <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/30">
            <div className="text-[9px] uppercase tracking-widest font-bold text-[#ff3b3b] mb-1">
              RECOMMENDED ACTION:
            </div>
            <p className="text-[12px] text-slate-200 leading-snug">
              Inspect battery subsystem telemetry and reduce non-critical payload load. Shed SAR imaging sensor power draw during eclipse corridor.
            </p>
          </div>
        </div>

        {/* Right Action & Verification Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-3 font-mono-hud">
          <div className="p-3.5 rounded-lg bg-black/40 border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8ea2b8]">NEURAL MODEL</span>
              <span className="text-white font-bold">Bi-LSTM Telemetry Transformer</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8ea2b8]">HORIZON CONFIDENCE</span>
              <span className="text-[#00ff9d] font-bold">96.8% VALIDATED</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8ea2b8]">IMPACT SUBSYSTEM</span>
              <span className="text-[#ff3b3b] font-bold">EPS Bus (Battery Cell Pack #3)</span>
            </div>
          </div>

          {/* Buttons: VIEW ANALYSIS & SIMULATE RESPONSE */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onViewAnalysis('SAT-002')}
              className="flex-1 px-4 py-2.5 rounded-lg font-mono-hud text-[11px] font-bold tracking-[0.14em] uppercase transition-all cursor-pointer bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00eaff] border border-cyan-500/40 text-center"
            >
              VIEW ANALYSIS
            </button>
            <button
              type="button"
              onClick={handleSimulateResponse}
              disabled={actionSimulated}
              className={`flex-1 px-4 py-2.5 rounded-lg font-mono-hud text-[11px] font-bold tracking-[0.14em] uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                actionSimulated
                  ? 'bg-emerald-950/60 text-[#00ff9d] border border-emerald-500/50 cursor-default'
                  : 'btn-aerospace-primary'
              }`}
            >
              {actionSimulated ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>LOAD SHED APPLIED</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>SIMULATE RESPONSE</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

