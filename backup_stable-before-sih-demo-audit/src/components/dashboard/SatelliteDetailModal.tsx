import React, { useState } from 'react';
import {
  AlertTriangle,
  Compass,
  Cpu,
  Radio,
  RefreshCw,
  Satellite as SatelliteIcon,
  Thermometer,
  X,
  Zap,
} from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

interface SatelliteDetailModalProps {
  satelliteId: string | null;
  onClose: () => void;
}

export const SatelliteDetailModal: React.FC<SatelliteDetailModalProps> = ({
  satelliteId,
  onClose,
}) => {
  const { satellites, executeCommand, injectAnomaly } = useTelemetry();
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'ai'>('overview');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!satelliteId) return null;

  const sat = satellites.find((s) => s.id === satelliteId) || satellites[0] || {
    id: satelliteId,
    name: satelliteId,
    noradId: 99999,
    callsign: 'SAT-AUX',
    orbitType: 'LEO',
    healthStatus: 'nominal',
    overallHealth: 95,
    subsystems: {
      power: { status: 'nominal', batteryCharge: 92, batteryVoltage: 28.5, current: 4.2, solarOutput: 450, solarEfficiency: 95, solarAngle: 2, batteryTemp: 24, powerConsumption: 320, history: [] },
      thermal: { status: 'nominal', internalTemp: 23.5, externalTemp: 18.0, payloadTemp: 24.0, radiatorStatus: 'Nominal', history: [] },
      aocs: { status: 'nominal', attitudeMode: 'Sun-Point', rxWheelSpeedX: 2000, rxWheelSpeedY: 2000, rxWheelSpeedZ: 2000, pitch: 0.1, roll: 0.0, yaw: 0.0, starTrackerStatus: 'Nominal', gyroStatus: 'Locked', magnetorquerDuty: 15, groundStationPassCountdown: 300, altitude: 500, velocity: 7.6, inclination: 97.4 },
      comm: { status: 'nominal', downlinkRate: 150, uplinkRate: 25, signalStrength: -75, snr: 18.5, bitErrorRate: 0.0001, packetLoss: 0.01, contactWindowCountdown: 300, antennaPointing: 'Optimal' },
      obc: { status: 'nominal', cpuLoad: 24, memoryUsage: 42, storageFree: 85, errorCount: 0, uptimeSeconds: 84000, watchdogState: 'Armed' },
    },
    aiAnomaly: { isAnomaly: false, severity: 'nominal', confidence: 95, description: 'All subsystem telemetry values are within normal operating thresholds.' },
    aiPrediction: { probability: 4.2, estimatedTimeDays: 180, potentialIssue: 'System operating nominally', recommendedAction: 'Maintain current stationkeeping schedule.' },
  };
  const subs = sat.subsystems || {
    power: { status: 'nominal', batteryCharge: 92, batteryVoltage: 28.5, current: 4.2, solarOutput: 450 },
    thermal: { status: 'nominal', internalTemp: 23.5, payloadTemp: 24.0, radiatorStatus: 'Nominal' },
    aocs: { status: 'nominal', starTrackerStatus: 'Nominal', gyroStatus: 'Locked', altitude: 500, inclination: 97.4 },
    comm: { status: 'nominal', antennaPointing: 'Optimal', bitErrorRate: 0.0001, snr: 18.5, downlinkRate: 150 },
    obc: { status: 'nominal', cpuLoad: 24, memoryUsage: 42, watchdogState: 'Armed' },
  };

  const handleCommand = async (cmd: string) => {
    setActionNotice(`Executing ${cmd}...`);
    await executeCommand(`${cmd} ${sat.id}`);
    setTimeout(() => setActionNotice(`Command ${cmd} accepted by flight computer`), 500);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSimulateFailure = () => {
    injectAnomaly(sat.id, 'power', 'critical');
    setActionNotice('Simulated anomaly injected into power subsystem');
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden font-sans shadow-2xl"
        style={{
          background: '#000000',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#141414] border border-white/20 text-[#00BFFF]">
              <SatelliteIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-bold text-xl text-[#F1F5F9] tracking-wide">
                  {sat.name}
                </h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                  style={{
                    color: sat.healthStatus === 'critical' ? '#EF4444' : '#22C55E',
                    backgroundColor: sat.healthStatus === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                    border: `1px solid ${sat.healthStatus === 'critical' ? '#EF4444' : '#22C55E'}`,
                  }}
                >
                  {sat.healthStatus}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5 font-medium">
                NORAD #{sat.noradId} · CALLSIGN: {sat.callsign} · ORBIT: {sat.orbitType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#05080C] border border-cyan-500/20 text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex items-center gap-4 border-b border-white/5 bg-[#05080C]/50 text-xs">
          {[
            { id: 'overview', label: 'TELEMETRY OVERVIEW' },
            { id: 'charts', label: 'SUBSYSTEM TRENDS' },
            { id: 'ai', label: 'AI HEALTH & PREDICTIONS' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? 'text-[#00BFFF] border-[#00BFFF]'
                  : 'text-[#94A3B8] border-transparent hover:text-[#F1F5F9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Notification Banner */}
        {actionNotice && (
          <div className="px-6 py-2 bg-[#05080C] border-b border-cyan-500/30 text-xs text-[#00BFFF] flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Primary Subsystem Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#05080C] border border-cyan-500/15">
                  <div className="flex items-center gap-2 text-[#94A3B8] text-[10px] uppercase font-semibold">
                    <Zap className="w-3.5 h-3.5 text-[#00BFFF]" />
                    <span>Battery Charge</span>
                  </div>
                  <div className="font-sans text-xl font-bold text-[#F1F5F9] mt-1">
                    {subs.power.batteryCharge}%
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">{subs.power.batteryVoltage} V · {subs.power.current} A</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#05080C] border border-cyan-500/15">
                  <div className="flex items-center gap-2 text-[#94A3B8] text-[10px] uppercase font-semibold">
                    <Thermometer className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Internal Temp</span>
                  </div>
                  <div className="font-sans text-xl font-bold text-[#F1F5F9] mt-1">
                    {subs.thermal.internalTemp}°C
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">Payload: {subs.thermal.payloadTemp}°C</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#05080C] border border-cyan-500/15">
                  <div className="flex items-center gap-2 text-[#94A3B8] text-[10px] uppercase font-semibold">
                    <Compass className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Altitude / Velocity</span>
                  </div>
                  <div className="font-sans text-xl font-bold text-[#F1F5F9] mt-1">
                    {subs.aocs.altitude} km
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">Inc: {subs.aocs.inclination}°</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#05080C] border border-cyan-500/15">
                  <div className="flex items-center gap-2 text-[#94A3B8] text-[10px] uppercase font-semibold">
                    <Radio className="w-3.5 h-3.5 text-[#00BFFF]" />
                    <span>RF Signal (SNR)</span>
                  </div>
                  <div className="font-sans text-xl font-bold text-[#F1F5F9] mt-1">
                    {subs.comm.snr} dB
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">Downlink: {subs.comm.downlinkRate} Mbps</div>
                </div>
              </div>

              {/* Subsystems Breakdown Table */}
              <div className="rounded-xl border border-cyan-500/15 bg-[#05080C] overflow-hidden">
                <div className="px-4 py-2.5 bg-[#080D13] text-[10px] uppercase tracking-wider text-[#00BFFF] font-bold border-b border-cyan-500/15">
                  FLIGHT SUBSYSTEM STATUS BUS
                </div>
                <div className="divide-y divide-white/5 text-xs">
                  {[
                    { name: 'Electrical Power Subsystem (EPS)', status: subs.power.status, info: `${subs.power.solarOutput}W Solar Gen, ${subs.power.batteryCharge}% Battery` },
                    { name: 'Thermal Control System (TCS)', status: subs.thermal.status, info: `Internal ${subs.thermal.internalTemp}°C, Radiator ${subs.thermal.radiatorStatus}` },
                    { name: 'Attitude & Orbital Control (AOCS)', status: subs.aocs.status, info: `Star Tracker ${subs.aocs.starTrackerStatus}, Gyro ${subs.aocs.gyroStatus}` },
                    { name: 'Communications (RF Payload)', status: subs.comm.status, info: `Pointing ${subs.comm.antennaPointing}, BER: ${subs.comm.bitErrorRate}` },
                    { name: 'Onboard Computer (OBC)', status: subs.obc.status, info: `CPU ${subs.obc.cpuLoad}%, Mem ${subs.obc.memoryUsage}%, Watchdog ${subs.obc.watchdogState}` },
                  ].map((row) => (
                    <div key={row.name} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#F1F5F9]">{row.name}</div>
                        <div className="text-[10px] text-[#94A3B8]">{row.info}</div>
                      </div>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
                        style={{
                          color: row.status === 'nominal' ? '#22C55E' : row.status === 'warning' ? '#F59E0B' : '#EF4444',
                          background: row.status === 'nominal' ? 'rgba(34,197,94,0.1)' : row.status === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          border: `1px solid ${row.status === 'nominal' ? '#22C55E' : row.status === 'warning' ? '#F59E0B' : '#EF4444'}`,
                        }}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mission Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleCommand('SOLAR_ALIGN')}
                  className="px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00BFFF] border border-cyan-500/30 text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  CALIBRATE ARRAYS
                </button>
                <button
                  type="button"
                  onClick={() => handleCommand('AOCS_DESATURATE')}
                  className="px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00BFFF] border border-cyan-500/30 text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  DESATURATE WHEELS
                </button>
                <button
                  type="button"
                  onClick={handleSimulateFailure}
                  className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[#EF4444] border border-red-500/30 text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  INJECT TEST FAULT
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CHARTS */}
          {activeTab === 'charts' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#05080C] border border-cyan-500/15">
                <div className="text-xs font-bold text-[#F1F5F9] mb-2 flex items-center justify-between">
                  <span>BATTERY CHARGE (%) & POWER DRAW (W) — 30M HISTORICAL</span>
                  <span className="text-[#00BFFF]">TELEMETRY BUS A</span>
                </div>
                <div className="h-32 w-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100">
                    <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255,255,255,0.08)" />
                    <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                    <path
                      d="M 0 50 Q 50 30, 100 45 T 200 35 T 300 60 T 400 38"
                      fill="none"
                      stroke="#00BFFF"
                      strokeWidth="2"
                    />
                    <path
                      d="M 0 65 Q 60 55, 120 70 T 220 50 T 320 75 T 400 60"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#05080C] border border-cyan-500/15">
                <div className="text-xs font-bold text-[#F1F5F9] mb-2 flex items-center justify-between">
                  <span>THERMAL GRADIENT (°C) — INTERNAL VS PAYLOAD</span>
                  <span className="text-[#F59E0B]">TCS BUS</span>
                </div>
                <div className="h-32 w-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100">
                    <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255,255,255,0.08)" />
                    <path
                      d="M 0 70 L 60 60 L 120 65 L 180 50 L 240 55 L 300 45 L 360 48 L 400 40"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI ANALYSIS */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#05080C] border border-cyan-500/30 space-y-2">
                <div className="text-xs font-bold text-[#00BFFF] flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  <span>AI HEALTH ANALYSIS</span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {sat.aiAnomaly.description}
                </p>
                <div className="text-[10px] text-[#94A3B8] pt-2 border-t border-white/5 flex items-center justify-between">
                  <span>INFERENCE CONFIDENCE: <strong className="text-[#F1F5F9]">{sat.aiAnomaly.confidence}%</strong></span>
                  <span>SEVERITY RATING: <strong className="text-[#F1F5F9]">{sat.aiAnomaly.severity}</strong></span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#180508] border border-red-500/30 space-y-2">
                <div className="text-xs font-bold text-[#EF4444] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>PREDICTED ANOMALIES & FAILURE FORECAST</span>
                </div>
                <div className="text-sm font-bold text-[#F1F5F9]">
                  {sat.aiPrediction.potentialIssue}
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Recommended Action: {sat.aiPrediction.recommendedAction}
                </p>
                <div className="text-[10px] text-[#94A3B8] pt-2 border-t border-white/5 flex items-center justify-between">
                  <span>PROBABILITY: <strong className="text-[#EF4444]">{sat.aiPrediction.probability}%</strong></span>
                  <span>ESTIMATED HORIZON: <strong className="text-[#F1F5F9]">{sat.aiPrediction.estimatedTimeDays} DAYS</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
