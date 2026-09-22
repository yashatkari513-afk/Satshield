import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

interface ConsoleNavbarProps {
  activeView: 'mission-control' | 'satellites' | 'telemetry' | 'anomalies' | 'prediction' | 'reports' | 'digital-twin';
  setActiveView: (view: 'mission-control' | 'satellites' | 'telemetry' | 'anomalies' | 'prediction' | 'reports' | 'digital-twin') => void;
}

export const ConsoleNavbar: React.FC<ConsoleNavbarProps> = ({ activeView, setActiveView }) => {
  const navigate = useNavigate();

  const navItems = [
    { id: 'mission-control', label: 'MISSION CONTROL' },
    { id: 'satellites', label: 'SATELLITES' },
    { id: 'telemetry', label: 'TELEMETRY' },
    { id: 'anomalies', label: 'ANOMALIES' },
    { id: 'prediction', label: 'AI PREDICTION' },
    { id: 'digital-twin', label: 'DIGITAL TWIN' },
    { id: 'reports', label: 'REPORTS' },
  ] as const;

  return (
    <header className="h-16 w-full bg-[#030303]/95 border-b border-[#1c2a42] px-6 flex items-center justify-between z-40 sticky top-0 font-mono-hud backdrop-blur-xl">
      {/* Left Logo Mark & Wordmark */}
      <div className="flex items-center gap-6">
        <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer group">
          <div className="relative w-8 h-8 rounded-full border-2 border-[#4dd8e6] flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,217,255,0.5)]">
            <div className="absolute inset-0 animate-orbit">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#4dd8e6] shadow-[0_0_8px_#4dd8e6]" />
            </div>
          </div>
          <span className="font-display font-bold text-base tracking-[0.15em] text-[#eaf2fb] uppercase group-hover:text-[#4dd8e6] transition-all duration-300">
            SATSHIELD AI
          </span>
        </div>

        <div className="hidden lg:block h-6 w-px bg-[#1c2a42]" />

        {/* Console Nav Links */}
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`px-4 py-2 text-[11px] font-semibold tracking-wider transition-all rounded cursor-pointer uppercase ${
                activeView === item.id
                  ? 'text-[#4dd8e6] bg-[#0d1526] border border-[#4dd8e6]/50 shadow-[0_0_15px_rgba(77,216,230,0.2)] font-bold'
                  : 'text-[#8fa3bf] hover:text-[#eaf2fb] hover:bg-[#0d1526]/50 hover:border-[#1c2a42] border border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Side: System Online Indicator & User Profile Icon */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#0d1526] border border-[#1c2a42] text-[#eaf2fb] backdrop-blur-sm transition-all duration-300 hover:border-[#4dd8e6]/30">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4dd8e6] shadow-[0_0_10px_#4dd8e6] animate-pulse" />
          <span className="text-[10px] text-[#4dd8e6] font-bold tracking-wider uppercase">SYSTEM ONLINE</span>
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg bg-[#0d1526] hover:bg-[#1c2a42] border border-[#1c2a42] text-[#8fa3bf] hover:text-[#eaf2fb] transition-all duration-300 cursor-pointer hover:border-[#4dd8e6]/30 hover:shadow-[0_0_10px_rgba(0,217,255,0.2)]"
          title="Mission Ops Profile & Settings"
        >
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
