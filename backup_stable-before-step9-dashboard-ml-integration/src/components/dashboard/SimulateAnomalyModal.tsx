import React, { useState } from 'react';
import { X, Play, AlertTriangle, Zap, Thermometer, Radio, Activity, Cpu, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

interface SimulateAnomalyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_10_SCENARIOS = [
  { id: '1', key: 'battery_degradation', name: 'Battery Degradation & Capacity Decay', icon: Zap, subsystem: 'BATTERY', desc: 'Gradual capacity loss and elevated internal resistance' },
  { id: '2', key: 'battery_voltage_drop', name: 'EPS Bus Sudden Undervoltage', icon: AlertTriangle, subsystem: 'POWER', desc: 'Main bus undervoltage below 23.5V safe threshold' },
  { id: '3', key: 'solar_power_degradation', name: 'Solar Array Occlusion & Power Drop', icon: Activity, subsystem: 'POWER', desc: 'Array tracking error causing solar power collapse' },
  { id: '4', key: 'overheating', name: 'Sustained Subsystem Overheating', icon: Thermometer, subsystem: 'THERMAL', desc: 'Internal electronics temperature sustained above 52°C' },
  { id: '5', key: 'rapid_temperature_increase', name: 'Rapid Thermal Rate of Change Surge', icon: Thermometer, subsystem: 'THERMAL', desc: 'High thermal derivative (dT/dt > 3.5°C/step)' },
  { id: '6', key: 'communication_signal_degradation', name: 'RF Downlink Signal Loss', icon: Radio, subsystem: 'COMMUNICATION', desc: 'Carrier signal strength dropping below -105 dBm' },
  { id: '7', key: 'packet_loss_spike', name: 'Downlink Packet Loss Surge', icon: Radio, subsystem: 'COMMUNICATION', desc: 'Bit error rate degradation leading to packet loss > 8%' },
  { id: '8', key: 'attitude_instability', name: 'AOCS Attitude Drift & Wheel Saturation', icon: Cpu, subsystem: 'ATTITUDE', desc: 'Reaction wheel saturation causing pitch/yaw pointing errors' },
  { id: '9', key: 'sensor_drift', name: 'Telemetry Sensor Calibration Drift', icon: Sparkles, subsystem: 'SENSOR', desc: 'Continuous bias drift in ADC sensors exceeding 2.5 sigma' },
  { id: '10', key: 'sudden_telemetry_spike', name: 'Transient Electrical / Thermal Spike', icon: Zap, subsystem: 'POWER', desc: 'Momentary current surge or electrostatic discharge' },
];

export const SimulateAnomalyModal: React.FC<SimulateAnomalyModalProps> = ({ isOpen, onClose }) => {
  const {
    satellitesData,
    activeSatelliteId,
    simulateCustomAnomaly,
    startAnomalySimulation,
    resetDemo,
  } = useSimulation();

  const [selectedSatId, setSelectedSatId] = useState<string>(activeSatelliteId || Object.keys(satellitesData)[0]);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('battery_degradation');
  const [severity, setSeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('WARNING');
  const [simulationMode, setSimulationMode] = useState<'instant' | 'sequential'>('instant');

  if (!isOpen) return null;

  const handleStart = () => {
    if (simulationMode === 'sequential') {
      startAnomalySimulation(selectedSatId, selectedScenarioKey, severity);
    } else {
      simulateCustomAnomaly(selectedSatId, selectedScenarioKey, severity);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none font-sans">
      <div
        className="w-full max-w-xl rounded-2xl p-5 shadow-2xl flex flex-col justify-between max-h-[90vh] overflow-y-auto custom-scrollbar"
        style={{
          background: '#000000',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 25px rgba(239, 68, 68, 0.2)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#080808] border border-red-500/40 text-[#EF4444] flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.3)]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#F1F5F9]">
                AI ANOMALY SCENARIO INJECTOR (10 SCENARIOS)
              </h2>
              <p className="text-[10.5px] text-[#94A3B8]">
                Select any realistic physical anomaly scenario to test the Isolation Forest & XAI detection pipeline.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 text-xs">
          {/* 1. Target Spacecraft Selector */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#94A3B8] mb-1">
              1. Target Spacecraft Asset
            </label>
            <select
              value={selectedSatId}
              onChange={(e) => setSelectedSatId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#080808] border border-white/20 text-[#00BFFF] font-bold text-xs focus:outline-none focus:border-[#00BFFF] cursor-pointer"
            >
              {Object.values(satellitesData).map((sat) => (
                <option key={sat.id} value={sat.id}>
                  {sat.name} ({sat.id}) • Orbit: {sat.orbitType || 'LEO'} • Health: {sat.telemetry.healthScore}%
                </option>
              ))}
            </select>
          </div>

          {/* 2. Anomaly Scenario Selector (All 10 Scenarios) */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#94A3B8] mb-1">
              2. Realistic Anomaly Scenario ({ALL_10_SCENARIOS.length} Available)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {ALL_10_SCENARIOS.map((sc) => {
                const isSelected = selectedScenarioKey === sc.key;
                return (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedScenarioKey(sc.key)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-red-500/15 border-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                        : 'bg-[#080808] border-white/15 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <sc.icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#EF4444]' : 'text-[#94A3B8]'}`} />
                      <div className="min-w-0">
                        <div className={`font-bold text-[11px] truncate ${isSelected ? 'text-white' : 'text-[#F1F5F9]'}`}>
                          {sc.name}
                        </div>
                        <div className="text-[9px] text-[#94A3B8] truncate">{sc.subsystem} Subsystem</div>
                      </div>
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ml-1 ${isSelected ? 'bg-[#EF4444] shadow-[0_0_6px_#EF4444]' : 'bg-white/20'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Severity Level */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#94A3B8] mb-1">
              3. Fault Severity Target
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['INFO', 'WARNING', 'CRITICAL'] as const).map((lvl) => {
                const isSelected = severity === lvl;
                const colors = {
                  INFO: { active: 'bg-cyan-500/20 border-cyan-400 text-cyan-400', def: 'text-slate-400' },
                  WARNING: { active: 'bg-amber-500/20 border-amber-400 text-amber-400', def: 'text-slate-400' },
                  CRITICAL: { active: 'bg-red-500/20 border-red-400 text-red-400', def: 'text-slate-400' },
                }[lvl];

                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSeverity(lvl)}
                    className={`py-1.5 rounded-lg font-mono font-bold text-[11px] uppercase border transition-all cursor-pointer ${
                      isSelected ? colors.active : 'bg-[#080808] border-white/15 hover:bg-white/5 ' + colors.def
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Execution Mode */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#94A3B8] mb-1">
              4. Injection Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSimulationMode('instant')}
                className={`py-1.5 px-3 rounded-lg font-mono text-[11px] font-bold uppercase border transition-all cursor-pointer ${
                  simulationMode === 'instant'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-[#080808] border-white/15 text-[#94A3B8] hover:text-white'
                }`}
              >
                Instant Telemetry Injection
              </button>
              <button
                type="button"
                onClick={() => setSimulationMode('sequential')}
                className={`py-1.5 px-3 rounded-lg font-mono text-[11px] font-bold uppercase border transition-all cursor-pointer ${
                  simulationMode === 'sequential'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400'
                    : 'bg-[#080808] border-white/15 text-[#94A3B8] hover:text-white'
                }`}
              >
                6-Step Progressive Demo
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-3">
          <button
            type="button"
            onClick={() => {
              resetDemo();
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#94A3B8] hover:text-white text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Baseline</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#F1F5F9] text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStart}
              className="px-4 py-1.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer flex items-center gap-2"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>RUN AI DETECTION</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
