import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Volume2, VolumeX, AlertOctagon, Orbit, Clock, Menu, X, LayoutDashboard, Satellite as SatIcon, Bell, LineChart, Settings, Home } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { satellites, activeSatellite, setActiveSatelliteId, settings, updateSettings, injectAnomaly, alerts } = useTelemetry();
  const [utcTime, setUtcTime] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const unhandledAlerts = alerts.filter((a) => !a.resolved).length;

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toUTCString().replace('GMT', 'UTC'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const healthBadgeClass =
    activeSatellite.healthStatus === 'nominal'
      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
      : activeSatellite.healthStatus === 'warning'
      ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
      : 'bg-red-950/80 text-red-300 border-red-500/50 animate-pulse';

  const navItems = [
    { path: '/dashboard', label: '3D Mission Console', icon: <LayoutDashboard className="w-4 h-4" /> },
    { path: `/satellite/${activeSatellite.id}`, label: 'Satellite Detail', icon: <SatIcon className="w-4 h-4" /> },
    { path: '/alerts', label: 'Alerts & Anomalies', icon: <Bell className="w-4 h-4" />, badge: unhandledAlerts },
    { path: '/history', label: 'Reports & History', icon: <LineChart className="w-4 h-4" /> },
    { path: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { path: '/landing', label: 'Mission Overview', icon: <Home className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="h-16 w-full bg-[#070b16]/95 backdrop-blur-md border-b border-cyan-500/20 px-3 sm:px-4 flex items-center justify-between z-30 sticky top-0">
        {/* Brand & Mission Title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle mobile navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div onClick={() => navigate('/')} className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center p-1.5 sm:p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 group-hover:border-cyan-400 transition-colors">
              <Orbit className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 animate-spin" style={{ animationDuration: '12s' }} />
              <span className="absolute -top-1 -right-1 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-cyan-400 animate-ping" />
            </div>
            <div>
              <h1 className="font-orbitron font-extrabold text-xs sm:text-base tracking-wider text-slate-100 uppercase flex items-center gap-1.5 sm:gap-2">
                SATSHIELD <span className="text-cyan-400 text-[10px] sm:text-xs font-normal">| MISSION</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] font-mono-hud text-slate-400">SAT-HEALTH MONITOR v4.2</p>
            </div>
          </div>
        </div>

        {/* Center Satellite Constellation Selector (Desktop/Tablet) */}
        <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
          <span className="text-xs font-mono-hud text-slate-400 uppercase">Target Spacecraft:</span>
          <select
            value={activeSatellite.id}
            onChange={(e) => setActiveSatelliteId(e.target.value)}
            className="bg-slate-950 text-cyan-300 font-orbitron font-bold text-xs px-3 py-1 rounded border border-cyan-500/40 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {satellites.map((sat) => (
              <option key={sat.id} value={sat.id}>
                {sat.name} ({sat.orbitType}) • Health {sat.overallHealth}%
              </option>
            ))}
          </select>
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono-hud font-bold border uppercase ${healthBadgeClass}`}>
            {activeSatellite.healthStatus} ({activeSatellite.overallHealth}%)
          </span>
        </div>

        {/* Right Controls: UTC Clock, Audio Toggle, Anomaly Injector */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* UTC Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 font-mono-hud text-xs text-cyan-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            {utcTime || 'UTC 00:00:00'}
          </div>

          {/* Audio Mute/Unmute */}
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer ${
              settings.soundEnabled
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
            title={settings.soundEnabled ? 'Audio Chimes Active' : 'Audio Muted'}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fault Anomaly Injector Button */}
          <button
            onClick={() => injectAnomaly()}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-[10px] sm:text-xs font-orbitron font-bold uppercase transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)] cursor-pointer"
          >
            <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-pulse" />
            <span className="hidden xs:inline">FAULT</span>
            <span className="xs:hidden">FAULT</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Slide-down Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-black/80 backdrop-blur-lg flex flex-col p-4 space-y-4 overflow-y-auto animate-fadeIn">
          {/* Spacecraft Selector for Mobile */}
          <div className="p-3 bg-slate-950/90 border border-cyan-500/30 rounded-xl space-y-2">
            <div className="text-[10px] font-mono-hud text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Target Spacecraft</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${healthBadgeClass}`}>
                {activeSatellite.healthStatus} ({activeSatellite.overallHealth}%)
              </span>
            </div>
            <select
              value={activeSatellite.id}
              onChange={(e) => {
                setActiveSatelliteId(e.target.value);
                setMobileMenuOpen(false);
              }}
              className="w-full bg-slate-900 text-cyan-300 font-orbitron font-bold text-xs p-2 rounded-lg border border-cyan-500/40 focus:outline-none"
            >
              {satellites.map((sat) => (
                <option key={sat.id} value={sat.id}>
                  {sat.name} ({sat.orbitType}) • Health {sat.overallHealth}%
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono-hud text-slate-500 uppercase tracking-widest px-2 py-1">
              NAVIGATION
            </div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-orbitron text-xs tracking-wider transition-all text-left ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                      : 'text-slate-300 hover:text-white bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-bold text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* UTC Clock & System Indicator */}
          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] font-mono-hud text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{utcTime || 'UTC 00:00:00'}</span>
            </div>
            <div className="text-emerald-400 font-bold">CCSDS LINK NOMINAL</div>
          </div>
        </div>
      )}
    </>
  );
};
