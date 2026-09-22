import React from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { useSimulation } from '../context/SimulationContext';
import { Settings as SettingsIcon, Volume2, VolumeX, Sliders, ShieldAlert, RefreshCw, Brain, BarChart3 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useTelemetry();
  const { openModelValidationModal } = useSimulation();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#05070f]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-2xl glass-panel border border-cyan-500/30">
        <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
          <SettingsIcon className="w-6 h-6 animate-spin" style={{ animationDuration: '16s' }} />
        </div>
        <div>
          <h2 className="text-xl font-orbitron font-extrabold text-slate-100 uppercase tracking-wide">
            Mission Control System Settings
          </h2>
          <p className="text-xs font-mono-hud text-slate-400 mt-0.5">
            Configure telemetry stream refresh intervals, anomaly thresholds, audio alert volumes, and units
          </p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Telemetry Stream & Update Rate */}
        <div className="p-5 rounded-2xl glass-panel border border-cyan-500/30 space-y-4">
          <div className="flex items-center gap-2 text-cyan-300 font-orbitron font-bold text-sm border-b border-cyan-500/20 pb-3">
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            TELEMETRY STREAM CONFIGURATION
          </div>

          <div className="space-y-3 font-mono-hud text-xs">
            <div>
              <label className="text-slate-300 block mb-1">Telemetry Tick Interval (ms)</label>
              <select
                value={settings.updateIntervalMs}
                onChange={(e) => updateSettings({ updateIntervalMs: Number(e.target.value) })}
                className="w-full bg-slate-950 text-cyan-300 px-3 py-2 rounded-lg border border-cyan-500/30 focus:outline-none cursor-pointer"
              >
                <option value={1000}>1000 ms (Real-time Fast)</option>
                <option value={1500}>1500 ms (Nominal Standard)</option>
                <option value={3000}>3000 ms (Low Bandwidth)</option>
                <option value={5000}>5000 ms (Power Saver)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-300">Automated Fault Injection Engine</span>
              <button
                onClick={() => updateSettings({ autoAnomalyInjection: !settings.autoAnomalyInjection })}
                className={`px-3 py-1 rounded-lg uppercase font-bold text-xs transition-all cursor-pointer ${
                  settings.autoAnomalyInjection
                    ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-900 text-slate-500'
                }`}
              >
                {settings.autoAnomalyInjection ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Units & Display Preferences */}
        <div className="p-5 rounded-2xl glass-panel border border-cyan-500/30 space-y-4">
          <div className="flex items-center gap-2 text-cyan-300 font-orbitron font-bold text-sm border-b border-cyan-500/20 pb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            UNITS & AUDIO PREFERENCES
          </div>

          <div className="space-y-3 font-mono-hud text-xs">
            <div>
              <label className="text-slate-300 block mb-1">Measurement System</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSettings({ units: 'metric' })}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    settings.units === 'metric'
                      ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  METRIC (km, °C, m/s)
                </button>
                <button
                  onClick={() => updateSettings({ units: 'imperial' })}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    settings.units === 'imperial'
                      ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  IMPERIAL (mi, °F, ft/s)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-300">Mission Audio Chimes & Alarms</span>
              <button
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`px-3 py-1 rounded-lg uppercase font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  settings.soundEnabled
                    ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'bg-slate-900 text-slate-500'
                }`}
              >
                {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                {settings.soundEnabled ? 'MUTED: NO' : 'MUTED: YES'}
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Threshold Alert Boundaries */}
        <div className="p-5 rounded-2xl glass-panel border border-cyan-500/30 space-y-4 md:col-span-2">
          <div className="flex items-center gap-2 text-amber-300 font-orbitron font-bold text-sm border-b border-cyan-500/20 pb-3">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            SUBSYSTEM ANOMALY THRESHOLD BOUNDARIES
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono-hud text-xs">
            <div>
              <label className="text-slate-300 block mb-1">
                Power Subsystem Low SOC Warning Threshold ({settings.powerWarningThreshold}%)
              </label>
              <input
                type="range"
                min="20"
                max="60"
                value={settings.powerWarningThreshold}
                onChange={(e) => updateSettings({ powerWarningThreshold: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">
                Thermal Payload High Temperature Warning Threshold ({settings.thermalWarningThreshold}°C)
              </label>
              <input
                type="range"
                min="35"
                max="65"
                value={settings.thermalWarningThreshold}
                onChange={(e) => updateSettings({ thermalWarningThreshold: Number(e.target.value) })}
                className="w-full accent-red-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card 4: AI/ML Model Validation & Empirical Metrics Suite */}
        <div className="p-5 rounded-2xl glass-panel border border-cyan-500/30 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2 text-cyan-300 font-orbitron font-bold text-sm">
              <Brain className="w-4 h-4 text-[#00BFFF]" />
              AI/ML MODEL VALIDATION & EMPIRICAL PERFORMANCE METRICS
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              SIMULATED BENCHMARK READY
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono-hud text-xs">
            <div className="space-y-1 text-slate-300 max-w-xl">
              <p>
                Run empirical validation of SATSHIELD's multi-subsystem anomaly detection engine against 208 labeled test frames.
              </p>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                <span>Recall: <strong className="text-emerald-400">100.0%</strong></span>
                <span>•</span>
                <span>F1-Score: <strong className="text-purple-400">0.8148</strong></span>
                <span>•</span>
                <span>Inference: <strong className="text-cyan-400">&lt;0.05 ms/frame</strong></span>
              </div>
            </div>

            <button
              type="button"
              onClick={openModelValidationModal}
              className="px-4 py-2.5 rounded-xl bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black font-sans font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,191,255,0.4)] transition-all shrink-0"
            >
              <BarChart3 className="w-4 h-4" />
              <span>LAUNCH MODEL VALIDATION SUITE ↗</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
