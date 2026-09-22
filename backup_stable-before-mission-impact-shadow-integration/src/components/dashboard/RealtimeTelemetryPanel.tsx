import React from 'react';
import { ArrowRight, Zap, Battery, Thermometer, Activity } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

interface RealtimeTelemetryPanelProps {
  onSelectSatellite: (satId: string) => void;
  onViewAll?: () => void;
}

// Sparkline generator helper
const renderSparkline = (points: number[] = [88, 88, 87, 88, 88, 88, 88], isAnomaly: boolean = false, strokeColor: string = '#00BFFF') => {
  const safePts = points && points.length > 0 ? points : [88, 88, 87, 88, 88, 88, 88];
  const min = Math.min(...safePts);
  const max = Math.max(...safePts);
  const range = max - min || 1;
  const width = 68;
  const height = 20;

  const path = safePts
    .map((val, idx) => {
      const x = (idx / (safePts.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg className="w-[68px] h-[20px] overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isAnomaly ? 'animate-pulse' : ''}
      />
      {safePts.length > 0 && (
        <circle
          cx={width}
          cy={height - ((safePts[safePts.length - 1] - min) / range) * (height - 4) - 2}
          r="2"
          fill={strokeColor}
        />
      )}
    </svg>
  );
};

export const RealtimeTelemetryPanel: React.FC<RealtimeTelemetryPanelProps> = ({
  onSelectSatellite,
  onViewAll,
}) => {
  const {
    satellitesData,
    activeSatelliteId,
    setActiveSatelliteId,
    simulationStep,
  } = useSimulation();

  const activeSat = satellitesData[activeSatelliteId] || satellitesData[Object.keys(satellitesData)[0]] || {
    name: 'AGIS-3',
    id: 'SAT-001',
    status: 'NOMINAL',
    telemetry: {
      power: 94,
      battery: 88,
      temperature: 28.4,
      voltage: 28.6,
      signalStrength: 96,
      linkStatus: 'STRONG',
      batteryTrend: [88, 88, 87, 88, 88, 88, 88],
      tempTrend: [28.2, 28.3, 28.4, 28.4, 28.5, 28.4, 28.4],
      voltageTrend: [28.6, 28.6, 28.5, 28.6, 28.6, 28.6, 28.6],
    },
  };
  const telemetry = activeSat.telemetry || {
    power: 94,
    battery: 88,
    temperature: 28.4,
    voltage: 28.6,
    signalStrength: 96,
    linkStatus: 'STRONG',
    batteryTrend: [88, 88, 87, 88, 88, 88, 88],
    tempTrend: [28.2, 28.3, 28.4, 28.4, 28.5, 28.4, 28.4],
    voltageTrend: [28.6, 28.6, 28.5, 28.6, 28.6, 28.6, 28.6],
  };
  const isSentinelAnomaly = (activeSatelliteId === 'SAT-002' && simulationStep >= 3) || activeSat.status === 'CRITICAL' || activeSat.status === 'WARNING';

  return (
    <div
      className="rounded-xl p-4 select-none relative overflow-hidden flex flex-col justify-between h-full"
      style={{
        background: '#000000',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00BFFF]" />
          <h3 className="font-sans font-bold text-[13px] text-[#F1F5F9] uppercase tracking-wider">
            REAL-TIME TELEMETRY
          </h3>
          <span className="text-[11px] font-bold text-[#00BFFF] px-2 py-0.5 rounded bg-[#00BFFF]/10 border border-[#00BFFF]/30">
            {activeSat.name}
          </span>
        </div>

        <span className="flex items-center gap-1.5 font-sans text-[11px] font-bold text-[#22C55E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse shadow-[0_0_6px_#22C55E]" />
          STREAM LIVE
        </span>
      </div>

      {/* ── 5 LIVE TELEMETRY CHANNELS WITH SPARKLINE GRAPHS ── */}
      <div className="py-2 space-y-2 font-sans">
        {/* Channel 1: BATTERY */}
        <div className="p-2.5 rounded-lg bg-[#080808] border border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[120px]">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
              telemetry.battery < 40 ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]' : 'bg-[#111111] border-white/20 text-[#00BFFF]'
            }`}>
              <Battery className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11.5px] font-bold text-[#F1F5F9]">BATTERY</div>
              <div className="text-[9px] uppercase font-bold text-[#94A3B8]">EPS MAIN BUS</div>
            </div>
          </div>

          <div className="text-right min-w-[65px]">
            <div className={`font-mono text-[15px] font-black leading-tight ${
              telemetry.battery < 40 ? 'text-[#EF4444]' : telemetry.battery < 65 ? 'text-[#F59E0B]' : 'text-[#22C55E]'
            }`}>
              {telemetry.battery}%
            </div>
            <div className="text-[8.5px] uppercase tracking-wider font-bold text-[#94A3B8]">
              {telemetry.battery < 40 ? 'CRITICAL' : telemetry.battery < 65 ? 'WARNING' : 'NOMINAL'}
            </div>
          </div>

          {/* Sparkline Graph */}
          <div className="hidden sm:flex flex-col items-end pr-1">
            <span className="text-[8px] text-[#94A3B8] font-mono mb-0.5 font-medium">TREND (7D)</span>
            {renderSparkline(
              telemetry.batteryTrend,
              isSentinelAnomaly,
              telemetry.battery < 40 ? '#EF4444' : telemetry.battery < 65 ? '#F59E0B' : '#22C55E'
            )}
          </div>
        </div>

        {/* Channel 2: TEMPERATURE */}
        <div className="p-2.5 rounded-lg bg-[#080808] border border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[120px]">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
              telemetry.temperature > 50 ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]' : 'bg-[#111111] border-white/20 text-[#00BFFF]'
            }`}>
              <Thermometer className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11.5px] font-bold text-[#F1F5F9]">TEMPERATURE</div>
              <div className="text-[9px] uppercase font-bold text-[#94A3B8]">CELL CORE</div>
            </div>
          </div>

          <div className="text-right min-w-[65px]">
            <div className={`font-mono text-[15px] font-black leading-tight ${
              telemetry.temperature > 50 ? 'text-[#EF4444]' : telemetry.temperature > 40 ? 'text-[#F59E0B]' : 'text-[#22C55E]'
            }`}>
              {telemetry.temperature.toFixed(1)}°C
            </div>
            <div className="text-[8.5px] uppercase tracking-wider font-bold text-[#94A3B8]">
              {telemetry.temperature > 50 ? 'THERMAL HIGH' : telemetry.temperature > 40 ? 'ELEVATED' : 'NOMINAL'}
            </div>
          </div>

          {/* Sparkline Graph */}
          <div className="hidden sm:flex flex-col items-end pr-1">
            <span className="text-[8px] text-[#94A3B8] font-mono mb-0.5 font-medium">THERMAL RISE</span>
            {renderSparkline(
              telemetry.tempTrend,
              isSentinelAnomaly,
              telemetry.temperature > 50 ? '#EF4444' : telemetry.temperature > 40 ? '#F59E0B' : '#00BFFF'
            )}
          </div>
        </div>

        {/* Channel 3: VOLTAGE */}
        <div className="p-2.5 rounded-lg bg-[#080808] border border-white/15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[120px]">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
              telemetry.voltage < 24 ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]' : 'bg-[#111111] border-white/20 text-[#00BFFF]'
            }`}>
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11.5px] font-bold text-[#F1F5F9]">VOLTAGE</div>
              <div className="text-[9px] uppercase font-bold text-[#94A3B8]">BUS SHUNT</div>
            </div>
          </div>

          <div className="text-right min-w-[65px]">
            <div className={`font-mono text-[15px] font-black leading-tight ${
              telemetry.voltage < 24 ? 'text-[#EF4444]' : telemetry.voltage < 27 ? 'text-[#F59E0B]' : 'text-[#22C55E]'
            }`}>
              {telemetry.voltage.toFixed(1)} V
            </div>
            <div className="text-[8.5px] uppercase tracking-wider font-bold text-[#94A3B8] truncate max-w-[80px]">
              {telemetry.voltage < 24 ? 'BELOW SAFE' : telemetry.voltage < 27 ? 'UNSTABLE' : 'STABLE'}
            </div>
          </div>

          {/* Sparkline Graph */}
          <div className="hidden sm:flex flex-col items-end pr-1">
            <span className="text-[8px] text-[#94A3B8] font-mono mb-0.5 font-medium">VOLTAGE STAB</span>
            {renderSparkline(
              telemetry.voltageTrend,
              isSentinelAnomaly,
              telemetry.voltage < 24 ? '#EF4444' : telemetry.voltage < 27 ? '#F59E0B' : '#00BFFF'
            )}
          </div>
        </div>

        {/* Channel 4: POWER OUTPUT & Channel 5: SIGNAL STRENGTH (GRID) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Power */}
          <div className="p-2.5 rounded-lg bg-[#080808] border border-white/15 flex items-center justify-between">
            <div>
              <div className="text-[9px] uppercase font-bold text-[#94A3B8]">POWER OUTPUT</div>
              <div className="font-mono text-[14px] font-black text-[#F1F5F9]">{telemetry.power}%</div>
            </div>
            <div className="w-14 h-1.5 rounded-full bg-[#161616] overflow-hidden">
              <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${telemetry.power}%` }} />
            </div>
          </div>

          {/* Signal Strength */}
          <div className="p-2.5 rounded-lg bg-[#080808] border border-white/15 flex items-center justify-between">
            <div>
              <div className="text-[9px] uppercase font-bold text-[#94A3B8]">SIGNAL STRENGTH</div>
              <div className="font-mono text-[14px] font-black text-[#F1F5F9]">{telemetry.signalStrength}%</div>
            </div>
            <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
              telemetry.linkStatus === 'CRITICAL' ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]' : 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
            }`}>
              {telemetry.linkStatus}
            </span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SATELLITE QUICK SWITCHER (DYNAMIC) ── */}
      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
        <span className="text-[9.5px] uppercase tracking-wider text-[#94A3B8] font-bold shrink-0">
          SELECT ASSET:
        </span>
        <div className="flex items-center gap-1.5">
          {Object.values(satellitesData).map((sat) => {
            const isSelected = sat.id === activeSatelliteId;
            const themeColor = sat.color || '#00BFFF';
            const isDarkColor = themeColor === '#F59E0B' || themeColor === '#00BFFF' || themeColor === '#10B981';

            return (
              <button
                key={sat.id}
                type="button"
                onClick={() => {
                  setActiveSatelliteId(sat.id);
                  onSelectSatellite(sat.id);
                }}
                style={{
                  backgroundColor: isSelected ? themeColor : '#0a0a0a',
                  color: isSelected ? (isDarkColor ? '#000000' : '#FFFFFF') : '#94A3B8',
                  borderColor: isSelected ? themeColor : 'rgba(255, 255, 255, 0.15)',
                  boxShadow: isSelected ? `0 0 10px ${themeColor}60` : 'none',
                }}
                className="px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider transition-all cursor-pointer border flex items-center gap-1 shrink-0"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? (isDarkColor ? '#000000' : '#FFFFFF') : themeColor }}
                />
                <span>{sat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

