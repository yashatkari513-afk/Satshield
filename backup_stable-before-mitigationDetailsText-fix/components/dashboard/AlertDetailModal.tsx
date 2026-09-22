import React, { useState } from 'react';
import { AlertTriangle, X, Battery, Thermometer, Zap, ShieldAlert, CheckCircle, Brain, ArrowRight } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const AlertDetailModal: React.FC = () => {
  const {
    isAlertModalOpen,
    closeAlertModal,
    selectedAlert,
    openAIDiagnosisModal,
    satellitesData,
    acknowledgeAlert,
  } = useSimulation();

  const [acknowledged, setAcknowledged] = useState<boolean>(false);

  if (!isAlertModalOpen || !selectedAlert) return null;

  const currentSat = satellitesData[selectedAlert.satId] || satellitesData['SAT-002'] || {
    telemetry: { battery: 36, temperature: 59.8, voltage: 21.3 }
  };

  const handleAcknowledge = () => {
    acknowledgeAlert(selectedAlert.id);
    setAcknowledged(true);
  };

  const handleOpenDiagnosis = () => {
    closeAlertModal();
    openAIDiagnosisModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div
        className="relative w-full max-w-xl rounded-2xl p-6 font-sans shadow-2xl flex flex-col"
        style={{
          background: '#000000',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444]">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-black text-base text-[#F1F5F9] uppercase tracking-wider">
                  ANOMALY DETECTED
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444]">
                  {selectedAlert.severity}
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-medium">
                Telemetry Fault ID: <span className="text-[#F1F5F9] font-mono font-bold">FAULT-{selectedAlert.id}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAlertModal}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── 2-COLUMN PARAMETER SPECIFICATIONS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
          {/* Satellite */}
          <div className="p-3 rounded-xl bg-[#080808] border border-white/15">
            <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-semibold">Satellite</div>
            <div className="text-[13px] font-bold text-[#F1F5F9] mt-0.5">{selectedAlert.satName}</div>
            <div className="text-[9.5px] text-[#00BFFF] font-mono mt-0.5">{selectedAlert.satId}</div>
          </div>

          {/* Subsystem */}
          <div className="p-3 rounded-xl bg-[#080808] border border-white/15">
            <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-semibold">Subsystem</div>
            <div className="text-[13px] font-bold text-[#F1F5F9] mt-0.5">{selectedAlert.subsystem}</div>
            <div className="text-[9.5px] text-[#94A3B8] mt-0.5">Electrical Power (EPS)</div>
          </div>

          {/* Severity */}
          <div className="p-3 rounded-xl bg-[#080808] border border-white/15">
            <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-semibold">Severity</div>
            <div className="text-[13px] font-bold text-[#EF4444] mt-0.5">{selectedAlert.severity}</div>
            <div className="text-[9.5px] text-[#EF4444] font-semibold mt-0.5">Immediate Action</div>
          </div>

          {/* Current Battery */}
          <div className="p-3 rounded-xl bg-[#080808] border border-white/15 flex items-center justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-semibold">Current Battery</div>
              <div className="text-[14px] font-bold text-[#EF4444] mt-0.5">
                {currentSat.telemetry?.battery ?? 36}%
              </div>
            </div>
            <Battery className="w-4 h-4 text-[#EF4444]" />
          </div>

          {/* Temperature */}
          <div className="p-3 rounded-xl bg-[#080808] border border-white/15 flex items-center justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-semibold">Temperature</div>
              <div className="text-[14px] font-bold text-[#EF4444] mt-0.5">
                {(currentSat.telemetry?.temperature ?? 59.8).toFixed(1)}°C
              </div>
            </div>
            <Thermometer className="w-4 h-4 text-[#EF4444]" />
          </div>

          {/* Voltage */}
          <div className="p-3 rounded-xl bg-[#080808] border border-white/15 flex items-center justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-semibold">Voltage</div>
              <div className="text-[12px] font-bold text-[#EF4444] mt-0.5 leading-tight truncate">
                Below Safe Threshold
              </div>
            </div>
            <Zap className="w-4 h-4 text-[#EF4444] shrink-0" />
          </div>
        </div>

        {/* ── AI RISK & TIME TO CRITICAL ── */}
        <div className="p-3.5 rounded-xl bg-[#0a0a0a] border border-white/15 mb-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-semibold">AI Confidence</div>
            <div className="text-[16px] font-black text-[#00BFFF] mt-0.5">96.2%</div>
          </div>
          <div className="border-x border-white/10">
            <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-semibold">Predicted Risk</div>
            <div className="text-[16px] font-black text-[#EF4444] mt-0.5">HIGH</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-semibold">Time to Critical State</div>
            <div className="text-[16px] font-black text-[#F59E0B] mt-0.5">~18 HOURS</div>
          </div>
        </div>

        {/* ── RECOMMENDED ACTION ── */}
        <div className="p-3.5 rounded-xl bg-[#080808] border border-white/20 mb-5">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#00BFFF] uppercase tracking-wider mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Recommended Action</span>
          </div>
          <div className="text-[12px] text-[#F1F5F9] font-medium leading-snug">
            "Switch to power-saving mode and inspect the battery subsystem."
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={acknowledged}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-sans text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
              acknowledged
                ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 cursor-default'
                : 'bg-white/10 hover:bg-white/20 border border-white/30 text-[#F1F5F9]'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{acknowledged ? 'ALERT ACKNOWLEDGED' : 'ACKNOWLEDGE ALERT'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenDiagnosis}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black font-sans text-[11px] font-black tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(0,191,255,0.4)] cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>VIEW AI DIAGNOSIS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

