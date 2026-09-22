import React, { useState } from 'react';
import {
  Search,
  Bell,
  HelpCircle,
  Menu,
  X,
  Brain,
} from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { useSimulation } from '../../context/SimulationContext';

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenHelp?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onToggleSidebar,
  searchQuery,
  setSearchQuery,
  onOpenHelp,
}) => {
  const { alerts } = useTelemetry();
  const {
    missionStatus,
    telemetryLastUpdatedSec,
    openModelValidationModal,
  } = useSimulation();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const activeAlerts = alerts.filter((a) => !a.resolved);

  return (
    <header
      className="h-[64px] px-4 md:px-5 flex items-center justify-between gap-3 sticky top-0 z-30 select-none"
      style={{
        backgroundColor: '#000000',
        borderBottom: '1px solid rgba(255, 255, 255, 0.35)',
      }}
    >
      {/* ── LEFT: HAMBURGER TOGGLE + MISSION STATUS ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.08] transition-colors cursor-pointer"
          aria-label="Toggle navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Dynamic Mission Status (Req 10) */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#080808] border border-white/20">
          <span
            className={`w-2 h-2 rounded-full ${
              missionStatus === 'CRITICAL'
                ? 'bg-[#EF4444] shadow-[0_0_8px_#EF4444] animate-ping'
                : missionStatus === 'WARNING'
                ? 'bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]'
                : 'bg-[#22C55E] shadow-[0_0_8px_#22C55E]'
            }`}
          />
          <span className="font-sans text-[11px] font-bold tracking-wider text-[#F1F5F9] uppercase">
            MISSION STATUS:
            <span
              className={`ml-1.5 font-black ${
                missionStatus === 'CRITICAL'
                  ? 'text-[#EF4444]'
                  : missionStatus === 'WARNING'
                  ? 'text-[#F59E0B]'
                  : 'text-[#22C55E]'
              }`}
            >
              {missionStatus}
            </span>
          </span>
          <span className="text-white/20 text-xs">|</span>
          <span className="text-[10px] text-[#94A3B8] font-mono">
            Updated {telemetryLastUpdatedSec}s ago
          </span>
        </div>
      </div>

      {/* ── CENTER: WHITE SEARCH FIELD WITH ⌘K (SPREAD ACROSS EMPTY SPACE) ── */}
      <div className="flex-1 mx-2 sm:mx-4 md:mx-6 min-w-0">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3.5 w-3.5 h-3.5 text-[#64748b] z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search satellites, alerts, telemetry..."
            className="w-full h-9 pl-9 pr-14 rounded-lg font-sans text-[12px] text-[#0f172a] font-medium placeholder:text-[#64748b] transition-all outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-sm"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.95)',
            }}
          />
          <div className="absolute right-2.5 flex items-center gap-1 text-[10px] text-[#475569] bg-[#f1f5f9] border border-[#cbd5e1] px-1.5 py-0.5 rounded font-mono font-semibold pointer-events-none z-10">
            <span>⌘K</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: LIVE BADGE, VALIDATE AI, ALERTS, HELP ── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* AI Model Validation & Metrics Suite Trigger */}
        <button
          type="button"
          onClick={openModelValidationModal}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-[#f8fafc] text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer border border-[#334155] hover:border-[#64748b] shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          title="Empirical AI Model Validation & Performance Metrics"
        >
          <Brain className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>VALIDATE AI</span>
        </button>

        {/* LIVE Stream Indicator */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] font-sans text-[11px] font-bold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse shadow-[0_0_6px_#22C55E]" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-white bg-[#EF4444] flex items-center justify-center"
              style={{ boxShadow: '0 0 6px rgba(239, 68, 68, 0.7)' }}
            >
              {activeAlerts.length || 3}
            </span>
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl p-3 shadow-2xl z-50 animate-fadeIn"
              style={{
                backgroundColor: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10 font-sans text-[11px] font-bold text-[#F1F5F9]">
                <span>ACTIVE FLEET ALERTS ({activeAlerts.length || 3})</span>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-[#94A3B8] hover:text-[#F1F5F9]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                {activeAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2 rounded-lg bg-[#0a0a0a] border border-white/15 font-sans text-[10.5px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#F1F5F9]">{alert.satelliteName}</span>
                      <span className="text-[9px] font-bold text-[#EF4444]">{alert.severity}</span>
                    </div>
                    <p className="text-[#94A3B8] text-[10px] mt-0.5">{alert.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Help Quick Reference */}
        {onOpenHelp && (
          <button
            type="button"
            onClick={onOpenHelp}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
            aria-label="Help quick reference"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
