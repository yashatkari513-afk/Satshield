import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutDashboard, Satellite as SatIcon, Bell, LineChart, Settings, ShieldCheck } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const Sidebar: React.FC = () => {
  const { satellites, activeSatellite, setActiveSatelliteId, alerts } = useTelemetry();
  const unhandledAlerts = alerts.filter((a) => !a.resolved).length;

  const navItems = [
    { path: '/dashboard', label: '3D Console', icon: <LayoutDashboard className="w-4 h-4" /> },
    { path: `/satellite/${activeSatellite.id}`, label: 'Satellite Detail', icon: <SatIcon className="w-4 h-4" /> },
    { path: '/alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" />, badge: unhandledAlerts },
    { path: '/history', label: 'History & Reports', icon: <LineChart className="w-4 h-4" /> },
    { path: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { path: '/', label: 'Home Start Page', icon: <Home className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 h-[calc(100vh-4rem)] bg-[#050813]/95 backdrop-blur-md border-r border-cyan-500/20 p-3 flex flex-col justify-between hidden md:flex">
      {/* Navigation Links */}
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono-hud text-slate-500 uppercase tracking-widest">
          NAVIGATION MENU
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl font-orbitron text-xs tracking-wider transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.15)] font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              {item.icon}
              {item.label}
            </div>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-bold text-[10px]">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Constellation Satellites List */}
      <div className="mt-6 pt-4 border-t border-slate-800/80">
        <div className="px-3 pb-2 flex items-center justify-between text-[10px] font-mono-hud text-slate-400 uppercase tracking-wider">
          <span>Tracked Constellation</span>
          <span className="text-cyan-400">{satellites.length} Active</span>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {satellites.map((sat) => {
            const isSelected = sat.id === activeSatellite.id;
            return (
              <button
                key={sat.id}
                onClick={() => setActiveSatelliteId(sat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono-hud flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sat.healthStatus === 'nominal'
                        ? 'bg-emerald-400 shadow-[0_0_6px_#22c55e]'
                        : sat.healthStatus === 'warning'
                        ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                        : 'bg-red-500 shadow-[0_0_6px_#ef4444] animate-ping'
                    }`}
                  />
                  <span>{sat.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-bold">{sat.overallHealth}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Status Footer */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-cyan-500/20 text-[10px] font-mono-hud text-slate-400 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div>
          <div className="text-slate-200 font-bold">RF Downlink Nominal</div>
          <div className="text-slate-500">Bit Error Rate &lt; 1e-8</div>
        </div>
      </div>
    </aside>
  );
};
