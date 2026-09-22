import React from 'react';
import { FileText, Globe, Play, RotateCcw, Plus, Brain } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

interface SystemMetricsRowProps {
  onOpenReport: () => void;
}

export const SystemMetricsRow: React.FC<SystemMetricsRowProps> = ({ onOpenReport }) => {
  const {
    simulationStep,
    isSimulating,
    stepName,
    resetDemo,
    openAIDiagnosisModal,
    openSimulateModal,
    openAddSatelliteModal,
    satellitesData,
  } = useSimulation();

  const satList = Object.values(satellitesData);
  const totalAssets = satList.length;
  const onlineAssets = satList.filter((s) => s.status !== 'CRITICAL').length;

  return (
    <div className="space-y-2 select-none">
      {/* ── MAIN KPI ROW ── */}
      <div
        className="w-full rounded-xl px-5 py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4"
        style={{
          background: '#000000',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Left Badge: LIVE SYSTEM STATUS */}
        <div className="flex items-center gap-2.5 shrink-0 pr-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#080808] border border-white/25 text-[#00BFFF]">
            <Globe className="w-4 h-4" />
          </div>
          <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-[#00BFFF]">
            LIVE SYSTEM STATUS
          </span>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-[1px] h-8 bg-white/[0.08]" />

        {/* 5 Core Metrics */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3 lg:gap-4 items-center">
          {/* Metric 1: Satellites Online */}
          <div>
            <div className="font-sans text-[24px] font-black text-[#F1F5F9] leading-none tracking-tight">
              {onlineAssets} / {totalAssets}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] mt-1 font-bold">
              SATELLITES ONLINE
            </div>
          </div>

          {/* Metric 2: Fleet Uptime */}
          <div className="lg:border-l lg:border-white/[0.08] lg:pl-4">
            <div className="font-sans text-[24px] font-black text-[#F1F5F9] leading-none tracking-tight">
              99.98%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] mt-1 font-bold">
              FLEET UPTIME
            </div>
          </div>

          {/* Metric 3: Telemetry Latency */}
          <div className="lg:border-l lg:border-white/[0.08] lg:pl-4">
            <div className="font-sans text-[24px] font-black text-[#F1F5F9] leading-none tracking-tight">
              &lt; 1.2s
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] mt-1 font-bold">
              TELEMETRY LATENCY
            </div>
          </div>

          {/* Metric 4: Active Alerts */}
          <div className="lg:border-l lg:border-white/[0.08] lg:pl-4">
            <div className="font-sans text-[24px] font-black text-[#EF4444] leading-none tracking-tight">
              {satList.some((s) => s.status === 'CRITICAL') ? 24 : 23}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] mt-1 font-bold">
              ACTIVE ALERTS
            </div>
          </div>

          {/* Metric 5: AI Health Confidence */}
          <div className="lg:border-l lg:border-white/[0.08] lg:pl-4">
            <div className="font-sans text-[24px] font-black text-[#22C55E] leading-none tracking-tight">
              98.7%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] mt-1 font-bold">
              AI HEALTH CONFIDENCE
            </div>
          </div>
        </div>

        {/* Right Buttons: ADD SATELLITE, SIMULATE ANOMALY & SYSTEM REPORT */}
        <div className="flex items-center gap-2 shrink-0 pl-1">
          <button
            type="button"
            onClick={openAddSatelliteModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans text-[11px] font-black tracking-wider uppercase transition-all cursor-pointer bg-white/10 hover:bg-white/20 border border-white/25 text-[#F1F5F9]"
            title="Add a completely new satellite to fleet"
          >
            <Plus className="w-3.5 h-3.5 text-[#00BFFF]" />
            <span className="hidden sm:inline">+ ADD SATELLITE</span>
            <span className="sm:hidden">+ ADD</span>
          </button>

          <button
            type="button"
            onClick={openSimulateModal}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-sans text-[11px] font-black tracking-wider uppercase transition-all cursor-pointer shadow-sm ${
              isSimulating
                ? 'bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#EF4444] animate-pulse'
                : 'bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black shadow-[0_0_15px_rgba(0,191,255,0.4)]'
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{isSimulating ? 'SIMULATING...' : 'SIMULATE ANOMALY'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-sans text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer text-[#F1F5F9] border border-white/20 hover:bg-white/10"
          >
            <span>REPORT</span>
            <FileText className="w-3.5 h-3.5 text-[#94A3B8]" />
          </button>
        </div>
      </div>

      {/* ── SIH DEMONSTRATION 6-STEP PROGRESS BANNER ── */}
      {simulationStep > 0 && (
        <div
          className="w-full rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 font-sans animate-fadeIn"
          style={{
            background: '#050505',
            border: '1px solid rgba(0, 191, 255, 0.4)',
            boxShadow: '0 0 20px rgba(0, 191, 255, 0.15)',
          }}
        >
          {/* Left Step Title */}
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#00BFFF] animate-ping" />
            <span className="text-[12px] font-black tracking-wider text-[#00BFFF] uppercase">
              {stepName}
            </span>
            <span className="text-[10px] text-[#94A3B8] hidden sm:inline">
              (Live AI anomaly pipeline for Smart India Hackathon jury)
            </span>
          </div>

          {/* 6 Step Bubbles */}
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold">
            {[
              { num: 1, label: 'Normal' },
              { num: 2, label: 'Analyzing' },
              { num: 3, label: 'Anomaly' },
              { num: 4, label: 'Diagnosis' },
              { num: 5, label: 'Prediction' },
              { num: 6, label: 'Action' },
            ].map((step) => {
              const isPast = simulationStep > step.num;
              const isCurrent = simulationStep === step.num;
              return (
                <div
                  key={step.num}
                  className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                    isCurrent
                      ? 'bg-[#00BFFF] text-black shadow-[0_0_8px_#00BFFF] scale-105'
                      : isPast
                      ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30'
                      : 'bg-white/5 text-[#94A3B8] border border-white/10'
                  }`}
                >
                  <span>{step.num}</span>
                  <span className="hidden md:inline">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-2">
            {simulationStep >= 4 && (
              <button
                type="button"
                onClick={openAIDiagnosisModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#00BFFF] text-black text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(0,191,255,0.4)] cursor-pointer"
              >
                <Brain className="w-3 h-3" />
                <span>VIEW DIAGNOSIS</span>
              </button>
            )}

            <button
              type="button"
              onClick={resetDemo}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[#94A3B8] hover:text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer"
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
