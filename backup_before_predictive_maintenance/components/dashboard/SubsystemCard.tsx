import React from 'react';
import { HealthStatus } from '../../types/telemetry';

interface SubsystemCardProps {
  title: string;
  icon: React.ReactNode;
  status: HealthStatus;
  primaryValue: string;
  primaryLabel: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  sparklineData?: number[];
  onClick?: () => void;
  children?: React.ReactNode;
}

export const SubsystemCard: React.FC<SubsystemCardProps> = ({
  title,
  icon,
  status,
  primaryValue,
  primaryLabel,
  secondaryValue,
  secondaryLabel,
  sparklineData,
  onClick,
  children,
}) => {
  const panelClass =
    status === 'nominal'
      ? 'glass-panel-interactive border-cyan-500/20'
      : status === 'warning'
      ? 'glass-panel-warning'
      : 'glass-panel-critical';

  const badgeClass =
    status === 'nominal'
      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
      : status === 'warning'
      ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
      : 'bg-red-950/80 text-red-300 border-red-500/40 animate-pulse';

  // Build SVG Sparkline path
  let sparklinePath = '';
  if (sparklineData && sparklineData.length > 1) {
    const max = Math.max(...sparklineData, 1);
    const min = Math.min(...sparklineData, 0);
    const range = max - min || 1;
    const width = 120;
    const height = 30;

    const points = sparklineData.map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    });
    sparklinePath = `M ${points.join(' L ')}`;
  }

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-all ${panelClass}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-cyan-400">
            {icon}
          </div>
          <span className="font-orbitron font-semibold text-xs tracking-wider text-slate-200 uppercase">
            {title}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[9px] font-mono-hud font-bold border uppercase ${badgeClass}`}>
          {status}
        </span>
      </div>

      {/* Primary & Secondary Values */}
      <div className="my-2 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] font-mono-hud text-slate-400 uppercase tracking-wide">{primaryLabel}</div>
          <div className="text-xl font-orbitron font-bold text-slate-100 mt-0.5">{primaryValue}</div>
        </div>
        {secondaryValue && (
          <div>
            <div className="text-[10px] font-mono-hud text-slate-400 uppercase tracking-wide">{secondaryLabel}</div>
            <div className="text-base font-orbitron font-medium text-cyan-300 mt-0.5">{secondaryValue}</div>
          </div>
        )}
      </div>

      {/* Optional Sparkline SVG */}
      {sparklinePath && (
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[9px] font-mono-hud text-slate-500">Live Trend</span>
          <svg className="w-28 h-6 overflow-visible">
            <path
              d={sparklinePath}
              fill="none"
              stroke={status === 'nominal' ? '#00e5ff' : status === 'warning' ? '#ffb300' : '#ff3b3b'}
              strokeWidth="2"
            />
          </svg>
        </div>
      )}

      {children}
    </div>
  );
};
