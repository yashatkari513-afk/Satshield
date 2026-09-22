import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  X,
  TrendingDown,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface AIDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenConsole: () => void;
  onResetNominal: () => void;
}

export const AIDiagnosisModal: React.FC<AIDiagnosisModalProps> = ({
  isOpen,
  onClose,
  onOpenConsole,
  onResetNominal,
}) => {
  const [executing, setExecuting] = useState(false);
  const [mitigated, setMitigated] = useState(false);

  if (!isOpen) return null;

  const handleExecuteMitigation = () => {
    setExecuting(true);
    setTimeout(() => {
      setExecuting(false);
      setMitigated(true);
      setTimeout(() => {
        onResetNominal();
        onClose();
      }, 1400);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div
        className="relative w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden font-sans shadow-2xl border"
        style={{
          backgroundColor: '#040915',
          borderColor: 'rgba(0, 217, 255, 0.4)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(0, 217, 255, 0.15)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#081226]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-[#00eaff]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-black text-lg text-white tracking-wide uppercase">
                  AI MISSION DIAGNOSIS
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase text-red-400 bg-red-950/60 border border-red-500/40">
                  HIGH SEVERITY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Neural Inference Model v4.8 · Power Subsystem Autonomous Telemetry Audit
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5 custom-scrollbar">
          {/* Anomaly Overview Card */}
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-red-200 uppercase tracking-wide">
                Detected Anomaly: Solar Power Degradation
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Multi-variate parameter drift detected on EPS solar panel circuit #2. Output decay curve deviates significantly from nominal orbit sun-tracking baseline.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11px] font-mono">
                <span className="text-slate-400">AI Confidence: <strong className="text-[#00ff9d]">94.7%</strong></span>
                <span className="text-slate-400">Est. Failure Window: <strong className="text-amber-400">18–24 Hours</strong></span>
                <span className="text-slate-400">Target Asset: <strong className="text-white">SENTINEL-RADAR / SAT-004</strong></span>
              </div>
            </div>
          </div>

          {/* Root-Cause Explanation */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              Why Was It Detected? (Causal Attribution)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-lg bg-[#06111D] border border-cyan-500/15">
                <div className="text-[#94A3B8] text-[10px] uppercase font-semibold">POWER GENERATION</div>
                <div className="font-bold text-[#EF4444] text-sm mt-1">-18.4% DRIFT</div>
                <div className="text-[10px] text-[#94A3B8] mt-1">Output dropped from 480W to 392W during daylight passes.</div>
              </div>
              <div className="p-3 rounded-lg bg-[#06111D] border border-cyan-500/15">
                <div className="text-[#94A3B8] text-[10px] uppercase font-semibold">JUNCTION TEMP</div>
                <div className="font-bold text-[#F59E0B] text-sm mt-1">+14.2°C ELEVATION</div>
                <div className="text-[10px] text-[#94A3B8] mt-1">Local hotspot on photo-voltaic array panel hinge joint.</div>
              </div>
              <div className="p-3 rounded-lg bg-[#06111D] border border-cyan-500/15">
                <div className="text-[#94A3B8] text-[10px] uppercase font-semibold">BUS VOLTAGE RIPPLE</div>
                <div className="font-bold text-[#00BFFF] text-sm mt-1">0.82V RMS SPIKE</div>
                <div className="text-[10px] text-[#94A3B8] mt-1">Impedance transient on eclipse-to-sunlight transition.</div>
              </div>
            </div>
          </div>

          {/* Telemetry Comparison Chart (SVG) */}
          <div className="p-4 rounded-xl bg-[#06111D] border border-cyan-500/15">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-bold uppercase tracking-wider text-slate-300">
                TELEMETRY DEGRADATION COMPARISON (PAST 6 ORBITS)
              </span>
              <div className="flex items-center gap-3 text-[10.5px]">
                <span className="flex items-center gap-1 text-[#00ff9d]">
                  <span className="w-2 h-0.5 bg-[#00ff9d]" /> Nominal Baseline
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-2 h-0.5 bg-red-400" /> Anomaly Trajectory
                </span>
              </div>
            </div>

            {/* SVG Comparison Graph */}
            <div className="w-full h-28">
              <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                {/* Background Grid */}
                <line x1="0" y1="25" x2="500" y2="25" stroke="#132038" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="500" y2="50" stroke="#132038" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#132038" strokeWidth="1" strokeDasharray="3 3" />

                {/* Nominal Baseline Curve (Green) */}
                <path
                  d="M 0 35 Q 125 30, 250 32 T 500 30"
                  fill="none"
                  stroke="#00ff9d"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                />

                {/* Anomaly Degraded Curve (Red) */}
                <path
                  d="M 0 35 Q 125 32, 250 48 T 500 82"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                />

                {/* Shaded Area of Deviation */}
                <polygon
                  points="250,48 500,82 500,30 250,32"
                  fill="rgba(239, 68, 68, 0.15)"
                />
              </svg>
            </div>
            <div className="flex justify-between text-[9.5px] text-slate-500 font-mono mt-1">
              <span>Orbit #1420 (Nominal)</span>
              <span>Orbit #1423 (Anomaly Inception)</span>
              <span>Orbit #1426 (Current Degradation)</span>
            </div>
          </div>

          {/* Recommended Mitigation Actions */}
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
            <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-300 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Recommended AI Mitigation Strategy
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>Reorient solar array gimbal beta angle by +4.2° to balance thermal distribution.</li>
              <li>Autonomous load shedding: power down secondary synthetic aperture radar transmitter.</li>
              <li>Schedule battery charge priority before entering upcoming 38-minute orbital eclipse.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-[#081226]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            DISMISS
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExecuteMitigation}
              disabled={executing || mitigated}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,217,255,0.4)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {executing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>UPLINKING MITIGATION...</span>
                </>
              ) : mitigated ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SYSTEM MITIGATED</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>EXECUTE MITIGATION</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenConsole();
              }}
              className="px-5 py-2 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white border border-blue-500/50 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              OPEN CONSOLE →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
