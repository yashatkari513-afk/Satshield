import React, { useEffect, useState } from 'react';
import {
  Zap,
  Thermometer,
  BatteryCharging,
  Radio,
  Cpu,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { Satellite } from '../../types/telemetry';

const SATELLITE_COLORS: Record<string, string> = {
  'SAT-001': '#00BFFF', // AGIS-3: Electric Cyan
  'SAT-002': '#EF4444', // SENTINEL-9: Crimson Red
  'SAT-003': '#8B5CF6', // ORBCOM-7: Royal Violet / Purple
  'SAT-004': '#F59E0B', // HELIOS-1: Solar Gold / Amber
};

interface LiveTelemetrySectionProps {
  activeSatellite: Satellite;
  onOpenConsole: () => void;
}

export const LiveTelemetrySection: React.FC<LiveTelemetrySectionProps> = ({
  activeSatellite,
  onOpenConsole,
}) => {
  const satColor = SATELLITE_COLORS[activeSatellite.id] || '#00BFFF';
  // Live subtle fluctuation tick
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const power = activeSatellite.subsystems.power;
  const thermal = activeSatellite.subsystems.thermal;
  const comm = activeSatellite.subsystems.comm;
  const obc = activeSatellite.subsystems.obc;
  const prop = activeSatellite.subsystems.propulsion;

  // Derive dynamic metrics with slight organic jitter
  const jitter = (Math.sin(tick) * 0.4).toFixed(1);
  const powerVal = Number((power.solarEfficiency + Number(jitter)).toFixed(1));
  const tempVal = Number((thermal.internalTemp + Number(jitter) * 0.5).toFixed(1));
  const battVal = Math.min(100, Math.max(10, Math.round(power.batteryCharge + Math.cos(tick) * 0.5)));
  const sigVal = comm.signalStrength;
  const cpuVal = Number((obc.cpuLoad + Math.sin(tick * 1.5) * 1.5).toFixed(1));
  const fuelVal = Number(prop.fuelLevel.toFixed(1));

  const METRICS = [
    {
      id: 'power',
      label: 'POWER GENERATION',
      value: `${powerVal}`,
      unit: '%',
      status: power.status.toUpperCase(),
      statusColor: power.status === 'nominal' ? '#00ff9d' : power.status === 'warning' ? '#f59e0b' : '#ef4444',
      percent: Math.min(100, Math.round(powerVal)),
      icon: Zap,
      history: [65, 72, 78, 81, 84, 86, 88, 85, powerVal],
      detail: `${power.solarOutput} W · ${power.batteryVoltage} V`,
    },
    {
      id: 'temp',
      label: 'INTERNAL TEMPERATURE',
      value: `${tempVal}`,
      unit: '°C',
      status: thermal.status.toUpperCase(),
      statusColor: thermal.status === 'nominal' ? '#00ff9d' : thermal.status === 'warning' ? '#f59e0b' : '#ef4444',
      percent: Math.min(100, Math.round((tempVal / 60) * 100)),
      icon: Thermometer,
      history: [38, 39, 41, 40, 42, 41, 43, 42, tempVal],
      detail: `Payload: ${thermal.payloadTemp}°C`,
    },
    {
      id: 'battery',
      label: 'BATTERY CHARGE',
      value: `${battVal}`,
      unit: '%',
      status: battVal > 50 ? 'NOMINAL' : battVal > 25 ? 'WARNING' : 'CRITICAL',
      statusColor: battVal > 50 ? '#00ff9d' : battVal > 25 ? '#f59e0b' : '#ef4444',
      percent: battVal,
      icon: BatteryCharging,
      history: [82, 85, 87, 89, 90, 92, 91, battVal],
      detail: `${power.cycleCount} Cycles · LiFePO4`,
    },
    {
      id: 'signal',
      label: 'SIGNAL STRENGTH (RF)',
      value: `${sigVal}`,
      unit: 'dBm',
      status: comm.status.toUpperCase(),
      statusColor: comm.status === 'nominal' ? '#00ff9d' : '#f59e0b',
      percent: Math.min(100, Math.max(10, Math.round(100 + sigVal))),
      icon: Radio,
      history: [-82, -80, -78, -75, -72, -70, -68, sigVal],
      detail: `${comm.downlinkRate} Mbps Downlink`,
    },
    {
      id: 'cpu',
      label: 'ONBOARD CPU LOAD',
      value: `${cpuVal}`,
      unit: '%',
      status: cpuVal < 80 ? 'NOMINAL' : 'HIGH LOAD',
      statusColor: cpuVal < 80 ? '#00ff9d' : '#f59e0b',
      percent: Math.min(100, Math.round(cpuVal)),
      icon: Cpu,
      history: [25, 28, 32, 35, 30, 33, 36, cpuVal],
      detail: `${obc.memoryUsage}% RAM · Watchdog OK`,
    },
    {
      id: 'fuel',
      label: 'FUEL / PROPULSION',
      value: `${fuelVal}`,
      unit: '%',
      status: prop.status.toUpperCase(),
      statusColor: prop.status === 'nominal' ? '#00ff9d' : '#f59e0b',
      percent: Math.min(100, Math.round(fuelVal)),
      icon: Flame,
      history: [90, 89, 88, 86, 85, 84, 83, fuelVal],
      detail: `ΔV: ${prop.deltaVRemaining} m/s remaining`,
    },
  ];

  return (
    <section className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 py-12">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-ping" />
            LIVE TELEMETRY STREAM
          </div>
          <h2 className="font-sans font-black text-2xl sm:text-4xl text-white tracking-tight">
            Subsystem Health Telemetry · <span style={{ color: satColor }}>{activeSatellite.name}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl font-medium">
            Real-time CCSDS packet ingestion with continuous telemetry verification and anomaly threshold surveillance.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenConsole}
          className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-sans text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/50 border border-cyan-500/40 hover:bg-cyan-900/40 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,217,255,0.15)]"
        >
          <span>FULL TELEMETRY BUS</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 6 Animated Live Telemetry Mini-Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {METRICS.map((item) => {
          // Render miniature SVG line chart
          const minH = Math.min(...item.history);
          const maxH = Math.max(...item.history);
          const range = maxH - minH || 1;
          const svgPoints = item.history
            .map((val, idx) => {
              const x = (idx / (item.history.length - 1)) * 140;
              const y = 32 - ((val - minH) / range) * 26;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          return (
            <div
              key={item.id}
              className="rounded-xl p-4 sm:p-5 transition-all duration-300 hover:border-cyan-500/50 group relative overflow-hidden"
              style={{
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              }}
            >
              {/* Card Top: Label + Status Pill */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: 'rgba(0, 217, 255, 0.08)',
                      border: '1px solid rgba(0, 217, 255, 0.25)',
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5 text-[#00eaff]" />
                  </div>
                  <span className="font-sans font-bold text-[11px] uppercase tracking-wider text-slate-300">
                    {item.label}
                  </span>
                </div>

                <span
                  className="font-sans text-[9.5px] font-bold px-2 py-0.5 rounded tracking-wider uppercase"
                  style={{
                    color: item.statusColor,
                    backgroundColor: `${item.statusColor}15`,
                    border: `1px solid ${item.statusColor}40`,
                  }}
                >
                  {item.status}
                </span>
              </div>

              {/* Card Middle: Current Value + Live Sparkline */}
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-sans font-black text-2xl sm:text-3xl text-white tracking-tight">
                      {item.value}
                    </span>
                    <span className="font-sans font-bold text-xs text-slate-400">{item.unit}</span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 mt-1 font-mono">{item.detail}</div>
                </div>

                {/* SVG Live Trend Line */}
                <div className="w-[140px] h-[34px] shrink-0">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 140 34">
                    <polyline
                      fill="none"
                      stroke={item.statusColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={svgPoints}
                    />
                    {/* Pulsing leading point */}
                    {item.history.length > 0 && (
                      <circle
                        cx="140"
                        cy={32 - ((item.history[item.history.length - 1] - minH) / range) * 26}
                        r="3.5"
                        fill={item.statusColor}
                        className="animate-pulse"
                      />
                    )}
                  </svg>
                </div>
              </div>

              {/* Progress Track Bar */}
              <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mb-1">
                  <span>TELEMETRY BUS LOAD</span>
                  <span>{item.percent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0d182a] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: item.statusColor,
                      boxShadow: `0 0 8px ${item.statusColor}`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
