import React from 'react';
import { ShieldCheck, Activity, Layers, AlertCircle } from 'lucide-react';
import { Satellite } from '../../types/telemetry';

interface MissionOverviewStripProps {
  satellites: Satellite[];
  activeAlertsCount: number;
}

export const MissionOverviewStrip: React.FC<MissionOverviewStripProps> = ({
  satellites,
  activeAlertsCount,
}) => {
  const avgHealth = (
    satellites.reduce((acc, s) => acc + s.overallHealth, 0) / (satellites.length || 1)
  ).toFixed(1);

  const stats = [
    {
      label: 'SATELLITES TRACKED',
      value: `0${satellites.length}`,
      sub: 'LEO / MEO / GEO ORBITS',
      icon: ShieldCheck,
      color: '#0284C7', // Vivid Blue
      bg: 'rgba(2, 132, 199, 0.12)',
      border: 'rgba(2, 132, 199, 0.35)',
    },
    {
      label: 'AVG FLEET HEALTH',
      value: `${avgHealth}%`,
      sub: 'NOMINAL PERFORMANCE',
      icon: Activity,
      color: '#10B981', // Vivid Emerald Green
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
    },
    {
      label: 'SYSTEMS MONITORED',
      value: '12',
      sub: 'MULTI-VARIATE TELEMETRY BUS',
      icon: Layers,
      color: '#8B5CF6', // Vivid Purple
      bg: 'rgba(139, 92, 246, 0.12)',
      border: 'rgba(139, 92, 246, 0.35)',
    },
    {
      label: 'ACTIVE ALERTS',
      value: activeAlertsCount < 10 ? `0${activeAlertsCount}` : `${activeAlertsCount}`,
      sub: activeAlertsCount > 0 ? 'ADVISORY & CRITICAL FAULTS' : 'ALL SYSTEMS NOMINAL',
      icon: AlertCircle,
      color: activeAlertsCount > 0 ? '#EF4444' : '#10B981',
      bg: activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
      border: activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)',
    },
  ];

  return (
    <section className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 pt-4 pb-8">
      <div
        className="rounded-2xl p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45), 0 0 25px rgba(255, 255, 255, 0.15)',
        }}
      >
        {stats.map((stat, idx) => (
          <div
            key={stat.label}
            className={`flex items-center gap-4 ${
              idx < stats.length - 1 ? 'lg:border-r lg:border-slate-200 lg:pr-6' : ''
            }`}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform hover:scale-105"
              style={{
                backgroundColor: stat.bg,
                border: `1.5px solid ${stat.border}`,
                boxShadow: `0 4px 12px ${stat.color}25`,
              }}
            >
              <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
            </div>
            <div className="min-w-0">
              <div
                className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-slate-950 leading-none"
              >
                {stat.value}
              </div>
              <div className="mt-1.5 font-sans text-[10.5px] font-black tracking-[0.14em] uppercase text-slate-800 truncate">
                {stat.label}
              </div>
              <div className="text-[9.5px] font-sans font-semibold tracking-wider text-slate-500 truncate mt-0.5">
                {stat.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
