import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, Info, Bell, Filter } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { AlertSeverity } from '../../types/telemetry';

export const AlertsWidget: React.FC = () => {
  const { alerts, acknowledgeAlert, resolveAlert } = useTelemetry();
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'all') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="flex flex-col h-full rounded-xl glass-panel border border-cyan-500/30 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400 animate-bounce" style={{ animationDuration: '3s' }} />
          <span className="font-orbitron font-semibold text-xs tracking-wider text-slate-200 uppercase">
            Active Alerts & Anomalies ({alerts.filter((a) => !a.resolved).length})
          </span>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1 text-[10px] font-mono-hud">
          <Filter className="w-3 h-3 text-slate-400 mr-1" />
          {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2 py-0.5 rounded uppercase font-bold transition-all cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-cyan-500 text-black'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#050914]">
        {filteredAlerts.length === 0 ? (
          <div className="text-slate-500 text-center py-8 text-xs font-mono-hud italic">
            No active alerts matching severity filter. All systems operational.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const cardStyle = alert.resolved
              ? 'border-slate-800 bg-slate-950/40 opacity-60'
              : alert.severity === 'critical' || alert.severity === 'emergency'
              ? 'border-red-500/40 bg-red-950/20'
              : alert.severity === 'warning'
              ? 'border-amber-500/40 bg-amber-950/20'
              : 'border-cyan-500/30 bg-cyan-950/20';

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${cardStyle}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {alert.severity === 'critical' || alert.severity === 'emergency' ? (
                      <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : alert.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    )}
                    <span className="font-orbitron font-semibold text-xs text-slate-200">
                      {alert.satelliteName} • {alert.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-hud text-slate-400">{alert.timestamp}</span>
                </div>

                <p className="mt-1.5 text-xs text-slate-300 font-sans leading-relaxed">{alert.message}</p>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono-hud text-slate-400 uppercase">
                    Subsystem: <span className="text-cyan-300 font-bold">{alert.subsystem}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {!alert.acknowledged && !alert.resolved && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-mono-hud font-bold uppercase transition-all cursor-pointer"
                      >
                        ACKNOWLEDGE
                      </button>
                    )}
                    {!alert.resolved && (
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono-hud font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3 h-3" /> RESOLVE
                      </button>
                    )}
                    {alert.resolved && (
                      <span className="text-[10px] font-mono-hud text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> RESOLVED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
