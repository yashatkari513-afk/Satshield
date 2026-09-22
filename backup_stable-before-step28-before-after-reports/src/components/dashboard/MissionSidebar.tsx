import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Bot,
  Crosshair,
  FileText,
  LayoutDashboard,
  Orbit,
  Radio,
  Satellite as SatelliteIcon,
  SatelliteDish,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { OrbitalLogoIcon } from '../common/OrbitalLogoIcon';

interface MissionSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#0284C7' }, // Sky/Blue
  { id: 'landing', label: 'Overview', icon: Sparkles, color: '#00BFFF' }, // Cyan mission overview
  { id: 'constellation', label: 'Constellation', icon: Orbit, color: '#8B5CF6' }, // Purple/Violet orbital ring
  { id: 'satellites', label: 'Satellites', icon: SatelliteIcon, color: '#06B6D4' }, // Cyan space asset
  { id: 'telemetry', label: 'Telemetry', icon: Activity, color: '#10B981' }, // Emerald live pulse
  { id: 'health', label: 'Health Monitor', icon: ShieldCheck, color: '#16A34A' }, // Green shield
  { id: 'anomalies', label: 'AI Anomaly Detection', icon: Crosshair, color: '#D946EF' }, // Magenta / Neural AI
  { id: 'assistant', label: 'AI Mission Assistant', icon: Bot, color: '#00BFFF' }, // Cyan AI Assistant
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: '23', color: '#EF4444' }, // Red alert
  { id: 'ground-stations', label: 'Ground Stations', icon: SatelliteDish, color: '#F59E0B' }, // Amber dish antenna
  { id: 'passes', label: 'Pass Predictions', icon: Radio, color: '#6366F1' }, // Indigo radio pass
  { id: 'reports', label: 'Reports', icon: FileText, color: '#3B82F6' }, // Blue reports document
  { id: 'analytics', label: 'Analytics', icon: BarChart3, color: '#F97316' }, // Orange analytics chart
  { id: 'settings', label: 'Settings', icon: SettingsIcon, color: '#64748B' }, // Slate gear
];

export const MissionSidebar: React.FC<MissionSidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
}) => {
  const navigate = useNavigate();
  const [utcTime, setUtcTime] = useState('09:24:18');
  const [utcDate, setUtcDate] = useState('May 24, 2025');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds}`);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[now.getUTCMonth()];
      const day = now.getUTCDate();
      const year = now.getUTCFullYear();
      setUtcDate(`${month} ${day}, ${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 select-none ${
        collapsed
          ? '-translate-x-full lg:translate-x-0 w-[240px] lg:w-[72px]'
          : 'translate-x-0 w-[240px] lg:w-[230px]'
      } shadow-2xl lg:shadow-none`}
      style={{
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
      }}
    >
      {/* ── TOP: BRANDING & LANDING PAGE ORBIT EMBLEM ── */}
      <div
        className="h-[56px] px-3 flex items-center justify-between border-b cursor-pointer transition-colors border-[#E2E8F0] hover:bg-slate-50"
        onClick={() => navigate('/landing')}
        title="SATSHIELD AI - Mission Overview"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-8 h-8 shrink-0 flex items-center justify-center bg-[#020305] rounded-lg border border-cyan-400/40 shadow-[0_0_10px_rgba(0,234,255,0.3)] group transition-transform hover:scale-105">
            <OrbitalLogoIcon size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_5px_#22C55E] animate-pulse" />
          </div>

          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <div className="font-sans font-black text-[12.5px] tracking-wider uppercase text-[#0f172a] leading-tight flex items-center gap-1">
                <span>SATSHIELD</span>
                <span className="px-1 py-0.5 rounded text-[8px] font-black bg-[#00BFFF] text-black shadow-sm tracking-widest leading-none">
                  AI
                </span>
              </div>
              <div
                className="text-[8px] font-bold tracking-[0.2em] uppercase text-[#0284c7] mt-0.5 font-mono"
                style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}
              >
                SATELLITE DEFENCE & OPS
              </div>
            </div>
          )}
        </div>

        {/* Mobile close button when drawer is open */}
        {!collapsed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(true);
            }}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
            title="Close menu"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── NAVIGATION LIST ── */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto custom-scrollbar">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setCollapsed(true);
                }
                if (item.id === 'landing') {
                  navigate('/landing');
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-sans text-[12px] tracking-wide transition-all text-left cursor-pointer group ${
                isActive
                  ? 'bg-[#0f172a] text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: isActive ? item.color : `${item.color}18`,
                    boxShadow: isActive ? `0 2px 8px ${item.color}60` : 'none',
                  }}
                >
                  <item.icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{
                      color: isActive ? '#FFFFFF' : item.color,
                    }}
                  />
                </div>
                {!collapsed && (
                  <span className={`truncate ${isActive ? 'text-white font-bold' : 'text-slate-700 group-hover:text-slate-950 font-medium'}`}>
                    {item.label}
                  </span>
                )}
              </div>

              {!collapsed && item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none ${
                    isActive
                      ? 'bg-[#EF4444] text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                      : 'bg-[#EF4444] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── BOTTOM: SYSTEM TIME (UTC) & COLLAPSE ── */}
      <div
        className="p-3.5 border-t font-sans border-[#E2E8F0]"
      >
        {!collapsed && (
          <div className="mb-3">
            <div className="text-[10px] text-[#64748b] font-medium tracking-wider">
              System Time (UTC)
            </div>
            <div className="text-[15px] font-black text-[#0f172a] tracking-widest mt-0.5 font-mono">
              {utcTime}
            </div>
            <div className="text-[10px] text-[#64748b] font-medium tracking-wide mt-0.5">
              {utcDate}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2 py-1.5 text-[11px] font-bold tracking-wider uppercase text-[#475569] hover:text-[#000000] transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>COLLAPSE</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
