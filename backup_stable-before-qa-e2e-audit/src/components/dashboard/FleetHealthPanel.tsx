import React from 'react';
import { useSimulation } from '../../context/SimulationContext';

export const FleetHealthPanel: React.FC = () => {
  const { simulationStep, activeSatelliteId, satellitesData } = useSimulation();

  const isCriticalSimulation = simulationStep >= 4;
  const isWarningSimulation = simulationStep >= 2 && simulationStep < 4;

  const healthScore = isCriticalSimulation ? 82.4 : isWarningSimulation ? 91.5 : 98.7;
  const healthLabel = isCriticalSimulation ? 'ACTION REQ' : isWarningSimulation ? 'DEGRADED' : 'EXCELLENT';
  const healthColor = isCriticalSimulation ? '#EF4444' : isWarningSimulation ? '#F59E0B' : '#15803D';

  // 7-day trend data
  const trendPoints = isCriticalSimulation
    ? [
        { day: 'May 18', val: 98.5, x: 20, y: 12 },
        { day: 'May 19', val: 98.2, x: 58, y: 15 },
        { day: 'May 20', val: 97.8, x: 96, y: 18 },
        { day: 'May 21', val: 96.9, x: 134, y: 26 },
        { day: 'May 22', val: 94.2, x: 172, y: 35 },
        { day: 'May 23', val: 88.4, x: 210, y: 44 },
        { day: 'May 24', val: 82.4, x: 248, y: 50 },
      ]
    : [
        { day: 'May 18', val: 96.5, x: 20, y: 35 },
        { day: 'May 19', val: 97.2, x: 58, y: 22 },
        { day: 'May 20', val: 96.8, x: 96, y: 28 },
        { day: 'May 21', val: 96.9, x: 134, y: 26 },
        { day: 'May 22', val: 98.2, x: 172, y: 15 },
        { day: 'May 23', val: 97.4, x: 210, y: 22 },
        { day: 'May 24', val: 98.7, x: 248, y: 10 },
      ];

  const svgPath = trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${svgPath} L 248 55 L 20 55 Z`;

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
      <div className="pb-2 border-b border-white/[0.08]">
        <h3 className="font-sans font-bold text-[13px] text-[#F1F5F9] uppercase tracking-wider">
          FLEET HEALTH SUMMARY
        </h3>
      </div>

      {/* ── UPPER SECTION: CIRCULAR GAUGE (LEFT) + BREAKDOWN BARS (RIGHT) ── */}
      <div className="flex items-center justify-between gap-3.5 py-1">
        {/* Left: Circular Gauge (Enlarged and Sleek Thin Profile) */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="#111111"
              strokeWidth="4.5"
              fill="none"
            />
            {/* Progress Arc */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke={healthColor}
              strokeWidth="4.5"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - healthScore / 100)}
              strokeLinecap="round"
              fill="none"
              style={{
                filter: isCriticalSimulation
                  ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))'
                  : isWarningSimulation
                  ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))'
                  : 'none',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span
              className="text-[27px] font-bold text-[#F1F5F9] leading-none tracking-tight"
              style={{ fontFamily: "'Space Grotesk', 'JetBrains Mono', monospace" }}
            >
              {healthScore.toFixed(1)}%
            </span>
            <span className="font-sans text-[9px] tracking-wider uppercase text-[#94A3B8] mt-1 font-bold">
              HEALTH SCORE
            </span>
            <span
              className="font-sans text-[11px] font-bold uppercase mt-0.5 tracking-wider"
              style={{ color: healthColor }}
            >
              {healthLabel}
            </span>
          </div>
        </div>

        {/* Right: Breakdown with Progress Bars */}
        <div className="flex-1 space-y-2 font-sans text-[11px]">
          {/* Excellent */}
          <div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Excellent</span>
              <span className="font-sans font-bold text-[#F1F5F9]">
                <span className="text-[#15803D] mr-2">{isCriticalSimulation ? '2' : '3'}</span>
                {isCriticalSimulation ? '50%' : '75%'}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0d0d0d] mt-1 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#15803D]"
                style={{ width: isCriticalSimulation ? '50%' : '75%' }}
              />
            </div>
          </div>

          {/* Good / Warning */}
          <div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Good</span>
              <span className="font-sans font-bold text-[#F1F5F9]">
                <span className="text-[#00BFFF] mr-2">1</span> 25%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0d0d0d] mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-[#00BFFF]" style={{ width: '25%' }} />
            </div>
          </div>

          {/* Warning */}
          <div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Warning</span>
              <span className="font-sans font-bold text-[#F1F5F9]">
                <span className={`mr-2 ${isWarningSimulation ? 'text-[#F59E0B]' : ''}`}>
                  {isWarningSimulation ? '1' : '0'}
                </span>
                {isWarningSimulation ? '25%' : '0%'}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0d0d0d] mt-1 overflow-hidden">
              {isWarningSimulation && (
                <div className="h-full rounded-full bg-[#F59E0B]" style={{ width: '25%' }} />
              )}
            </div>
          </div>

          {/* Critical */}
          <div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Critical</span>
              <span className="font-sans font-bold text-[#F1F5F9]">
                <span className={`mr-2 ${isCriticalSimulation ? 'text-[#EF4444]' : ''}`}>
                  {isCriticalSimulation ? '1' : '0'}
                </span>
                {isCriticalSimulation ? '25%' : '0%'}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0d0d0d] mt-1 overflow-hidden">
              {isCriticalSimulation && (
                <div className="h-full rounded-full bg-[#EF4444]" style={{ width: '25%' }} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── LOWER SECTION: HEALTH SCORE TREND (7D) ── */}
      <div className="pt-2 border-t border-white/[0.08]">
        <div className="text-[11px] font-sans font-bold text-[#94A3B8] uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>HEALTH SCORE TREND (7D)</span>
          {isCriticalSimulation && (
            <span className="text-[9px] text-[#EF4444] font-bold">ABNORMAL DRIFT DETECTED</span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {/* Y-axis */}
          <div className="flex flex-col justify-between text-[8px] font-sans text-[#94A3B8] h-12 py-0.5 select-none font-medium">
            <span>100%</span>
            <span>95%</span>
            <span>90%</span>
          </div>

          {/* SVG Chart */}
          <div className="flex-1 h-14 relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 268 55" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fleetTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isCriticalSimulation ? '#EF4444' : '#00BFFF'}
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="100%"
                    stopColor={isCriticalSimulation ? '#EF4444' : '#00BFFF'}
                    stopOpacity="0.0"
                  />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              <line x1="20" y1="12" x2="248" y2="12" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
              <line x1="20" y1="32" x2="248" y2="32" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
              <line x1="20" y1="52" x2="248" y2="52" stroke="rgba(255,255,255,0.06)" />

              {/* Area Fill */}
              <path d={areaPath} fill="url(#fleetTrendGrad)" />

              {/* Line */}
              <path
                d={svgPath}
                fill="none"
                stroke={isCriticalSimulation ? '#EF4444' : '#00BFFF'}
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              {/* Data Points */}
              {trendPoints.map((pt) => (
                <circle
                  key={pt.day}
                  cx={pt.x}
                  cy={pt.y}
                  r="2.5"
                  fill={isCriticalSimulation ? '#EF4444' : '#00BFFF'}
                  stroke="#000000"
                  strokeWidth="1"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
