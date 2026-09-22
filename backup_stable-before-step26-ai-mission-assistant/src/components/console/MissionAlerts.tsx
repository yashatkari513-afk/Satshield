import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';

export const MissionAlerts: React.FC = () => {
  const { alerts } = useTelemetry();

  return (
    <div className="sat-panel rounded-xl p-4 space-y-4 font-mono-hud text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c2a42]">
        <span className="font-display font-semibold text-xs text-[#eaf2fb] uppercase tracking-wider">
          MISSION ALERTS
        </span>
        <span className="text-[10px] text-[#8fa3bf] bg-[#0d1526] px-2 py-1 rounded-md">{alerts.filter(a => !a.resolved).length} ACTIVE</span>
      </div>

      {/* Alerts List */}
      <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2">
        {alerts.map((alert, index) => {
          const badgeStyle =
            alert.severity === 'critical' || alert.severity === 'emergency'
              ? 'text-[#ff5470] border-[#ff5470]/40 bg-[#ff5470]/15'
              : alert.severity === 'warning'
              ? 'text-[#f5a623] border-[#f5a623]/40 bg-[#f5a623]/15'
              : 'text-[#4dd8e6] border-[#4dd8e6]/40 bg-[#4dd8e6]/15';

          const priorityLabel =
            alert.severity === 'critical' || alert.severity === 'emergency'
              ? 'HIGH PRIORITY'
              : alert.severity === 'warning'
              ? 'MEDIUM'
              : 'INFO';

          return (
            <div 
              key={alert.id} 
              className="p-3 rounded-lg bg-[#030303] border border-[#1c2a42] space-y-2 hover:border-[#4dd8e6]/30 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,217,255,0.1)]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className={`px-2 py-1 rounded-md border font-bold uppercase ${badgeStyle}`}>
                  {priorityLabel}
                </span>
                <span className="text-[#8fa3bf]">{alert.timestamp}</span>
              </div>
              <div className="text-[11px] font-bold text-[#eaf2fb] mt-1">{alert.satelliteName}</div>
              <div className="text-[10px] text-[#8fa3bf] font-sans leading-relaxed">{alert.message}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
