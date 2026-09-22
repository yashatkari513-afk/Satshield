import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';

export const SatelliteHealth: React.FC = () => {
  const { activeSatellite } = useTelemetry();
  const subs = activeSatellite.subsystems;

  // Compute breakdown percentages
  const overall = activeSatellite.overallHealth;
  const powerPct = Math.round((subs.power.batteryCharge + subs.power.solarEfficiency) / 2);
  const thermalPct = subs.thermal.status === 'nominal' ? 92 : subs.thermal.status === 'warning' ? 78 : 55;
  const commPct = Math.min(100, Math.max(20, Math.round(100 + subs.comm.signalStrength * 0.5)));
  const batteryPct = subs.power.batteryCharge;
  const navigationPct = subs.aocs.status === 'nominal' ? 96 : subs.aocs.status === 'warning' ? 82 : 48;

  const healthItems = [
    { label: 'Overall Health', value: overall },
    { label: 'Power System', value: powerPct },
    { label: 'Thermal System', value: thermalPct },
    { label: 'Communication', value: commPct },
    { label: 'Battery', value: batteryPct },
    { label: 'Navigation', value: navigationPct },
  ];

  return (
    <div className="sat-panel rounded-xl p-4 space-y-4 font-mono-hud text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c2a42]">
        <div>
          <div className="text-[10px] text-[#8fa3bf] uppercase tracking-wider">SATELLITE HEALTH</div>
          <div className="font-display font-bold text-sm text-[#4dd8e6] mt-1">{activeSatellite.id} ({activeSatellite.name})</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display font-extrabold text-[#eaf2fb] tracking-tight">{overall}%</div>
          <div className="text-[9px] text-[#8fa3bf] uppercase tracking-wider">INDEX STATUS</div>
        </div>
      </div>

      {/* Health Progress Indicators List */}
      <div className="space-y-4 pt-2">
        {healthItems.map((item, index) => {
          const barColor =
            item.value >= 85
              ? 'bg-[#4dd8e6] shadow-[0_0_10px_#4dd8e6]'
              : item.value >= 70
              ? 'bg-[#f5a623] shadow-[0_0_10px_#f5a623]'
              : 'bg-[#ff5470] shadow-[0_0_10px_#ff5470]';

          return (
            <div key={item.label} className="space-y-2" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8fa3bf] font-mono-hud tracking-wide">{item.label}</span>
                <span className="text-[#eaf2fb] font-bold">{item.value}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#030303] border border-[#1c2a42] overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-out rounded-full ${barColor}`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
