import React from 'react';
import { X, Zap, Thermometer, Compass, Radio, Rocket, Database, Cpu, Wrench } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const InspectorModal: React.FC = () => {
  const { activeSatellite, focusedSubsystem, setFocusedSubsystem, executeCommand } = useTelemetry();

  if (!focusedSubsystem) return null;

  const subs = activeSatellite.subsystems;
  const key = focusedSubsystem.toLowerCase() as keyof typeof subs;
  const subData = subs[key] || subs.obc;

  const getSubsystemIcon = (name: string) => {
    switch (name) {
      case 'power': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'thermal': return <Thermometer className="w-5 h-5 text-red-400" />;
      case 'aocs': return <Compass className="w-5 h-5 text-cyan-400" />;
      case 'comm': return <Radio className="w-5 h-5 text-emerald-400" />;
      case 'propulsion': return <Rocket className="w-5 h-5 text-purple-400" />;
      case 'payload': return <Database className="w-5 h-5 text-sky-400" />;
      default: return <Cpu className="w-5 h-5 text-blue-400" />;
    }
  };

  const handleFixSubsystem = async () => {
    let cmd = `POWER REBOOT_BUS`;
    if (key === 'power') cmd = `SOLAR ALIGN_AUTO`;
    else if (key === 'aocs') cmd = `AOCS DESATURATE`;
    else if (key === 'thermal') cmd = `THERMAL RADIATOR_OPEN`;
    else if (key === 'comm') cmd = `COMM SYNC_ANTENNA`;

    await executeCommand(cmd);
    setFocusedSubsystem(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 font-sans shadow-2xl"
        style={{
          background: '#000000',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => setFocusedSubsystem(null)}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#080808] hover:bg-[#141414] text-[#94A3B8] hover:text-[#F1F5F9] border border-white/20 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-cyan-500/20 pb-4">
          <div className="p-2.5 rounded-xl bg-[#08121c] border border-cyan-500/30 text-[#00BFFF]">
            {getSubsystemIcon(key)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#F1F5F9] uppercase tracking-wide">
              {key.toUpperCase()} Subsystem Inspection
            </h3>
            <p className="text-xs text-[#00BFFF] font-medium">
              {activeSatellite.name} • NORAD #{activeSatellite.noradId}
            </p>
          </div>
        </div>

        {/* Diagnostic Metrics Grid */}
        <div className="my-5 grid grid-cols-2 gap-3">
          <div className="p-3 bg-[#05080C] rounded-xl border border-cyan-500/15">
            <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Subsystem Status</span>
            <div
              className={`text-sm font-bold uppercase mt-1 ${
                subData.status === 'nominal'
                  ? 'text-[#22C55E]'
                  : subData.status === 'warning'
                  ? 'text-[#F59E0B]'
                  : 'text-[#EF4444] animate-pulse'
              }`}
            >
              {subData.status}
            </div>
          </div>

          <div className="p-3 bg-[#05080C] rounded-xl border border-cyan-500/15">
            <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Health Score</span>
            <div className="text-sm font-bold text-[#00BFFF] mt-1">
              {activeSatellite.overallHealth}%
            </div>
          </div>

          {key === 'power' && (
            <>
              <div className="p-3 bg-[#05080C] rounded-xl border border-cyan-500/15">
                <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Battery Charge</span>
                <div className="text-base font-bold text-[#F1F5F9] mt-0.5">
                  {subs.power.batteryCharge}% ({subs.power.batteryVoltage}V)
                </div>
              </div>
              <div className="p-3 bg-[#05080C] rounded-xl border border-cyan-500/15">
                <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Solar Generation</span>
                <div className="text-base font-bold text-[#F59E0B] mt-0.5">
                  {subs.power.solarOutput} W
                </div>
              </div>
            </>
          )}

          {key === 'thermal' && (
            <>
              <div className="p-3 bg-[#05080C] rounded-xl border border-cyan-500/15">
                <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Payload Sensor Temp</span>
                <div className="text-base font-bold text-[#EF4444] mt-0.5">
                  {subs.thermal.payloadTemp}°C
                </div>
              </div>
              <div className="p-3 bg-[#05080C] rounded-xl border border-cyan-500/15">
                <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Internal Avionics</span>
                <div className="text-base font-bold text-[#F1F5F9] mt-0.5">
                  {subs.thermal.internalTemp}°C
                </div>
              </div>
            </>
          )}

          {key === 'aocs' && (
            <>
              <div className="p-3 bg-[#05080C] rounded-xl border border-cyan-500/15">
                <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Wheel X Speed</span>
                <div className="text-base font-bold text-[#00BFFF] mt-0.5">
                  {subs.aocs.rxWheelSpeedX} RPM
                </div>
              </div>
              <div className="p-3 bg-[#05080C] rounded-xl border border-cyan-500/15">
                <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Star Tracker</span>
                <div className="text-base font-bold text-[#22C55E] mt-0.5">
                  {subs.aocs.starTrackerStatus}
                </div>
              </div>
            </>
          )}

          {key === 'comm' && (
            <>
              <div className="p-3 bg-[#05080C] rounded-xl border border-cyan-500/15">
                <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Signal SNR</span>
                <div className="text-base font-bold text-[#22C55E] mt-0.5">
                  {subs.comm.snr} dB ({subs.comm.signalStrength} dBm)
                </div>
              </div>
              <div className="p-3 bg-[#05080C] rounded-xl border border-cyan-500/15">
                <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Downlink Rate</span>
                <div className="text-base font-bold text-[#00BFFF] mt-0.5">
                  {subs.comm.downlinkRate} Mbps
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <button
            onClick={() => setFocusedSubsystem(null)}
            className="px-4 py-2 rounded-lg bg-[#05080C] hover:bg-[#080D13] text-[#94A3B8] hover:text-[#F1F5F9] text-xs font-semibold border border-cyan-500/20 transition-all cursor-pointer"
          >
            DISMISS
          </button>
          <button
            onClick={handleFixSubsystem}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,191,255,0.4)] cursor-pointer"
          >
            <Wrench className="w-4 h-4" /> EXECUTE AUTO-REPAIR UPLINK
          </button>
        </div>
      </div>
    </div>
  );
};
