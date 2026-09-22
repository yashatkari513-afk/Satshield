import React from 'react';
import { ChevronRight, SatelliteDish } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

interface GroundPassesPanelProps {
  onViewSchedule: () => void;
}

const PASSES_DATA = [
  {
    id: '1',
    satId: 'SAT-001',
    sat: 'AGIS-3',
    station: 'GS-Madrid',
    countdown: '04m 12s',
    elev: 'ELEV 42.8°',
    color: '#22C55E',
  },
  {
    id: '2',
    satId: 'SAT-003',
    sat: 'ORBCOM-7',
    station: 'GS-New Delhi',
    countdown: '12m 45s',
    elev: 'ELEV 36.2°',
    color: '#22C55E',
  },
  {
    id: '3',
    satId: 'SAT-002',
    sat: 'SENTINEL-9',
    station: 'GS-Singapore',
    countdown: '18m 33s',
    elev: 'ELEV 28.7°',
    color: '#F59E0B',
  },
  {
    id: '4',
    satId: 'SAT-004',
    sat: 'HELIOS-1',
    station: 'GS-New York',
    countdown: '26m 10s',
    elev: 'ELEV 15.3°',
    color: '#F59E0B',
  },
];

export const GroundPassesPanel: React.FC<GroundPassesPanelProps> = ({ onViewSchedule }) => {
  const { activeSatelliteId, setActiveSatelliteId } = useSimulation();
  return (
    <div
      className="rounded-xl p-4 select-none relative overflow-hidden flex flex-col justify-between h-full"
      style={{
        background: '#000000',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <h3 className="font-sans font-bold text-[13px] text-[#F1F5F9] uppercase tracking-wider">
          NEXT GROUND PASSES
        </h3>
        <button
          type="button"
          onClick={onViewSchedule}
          className="font-sans text-[11px] font-bold text-[#00BFFF] hover:underline cursor-pointer uppercase tracking-wider flex items-center gap-1"
        >
          <span>VIEW SCHEDULE</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* ── 4 GROUND PASS ROWS ── */}
      <div className="flex flex-col gap-2 py-2 flex-1 justify-between">
        {PASSES_DATA.map((pass) => {
          const isSelected = pass.satId === activeSatelliteId;
          return (
            <div
              key={pass.id}
              onClick={() => setActiveSatelliteId(pass.satId)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 font-sans group ${
                isSelected
                  ? 'bg-white/10 border-cyan-400/50 shadow-[0_0_10px_rgba(0,191,255,0.2)]'
                  : 'bg-[#080808] border-white/15 hover:border-white/35 hover:bg-[#111111]'
              }`}
            >
            {/* Dish Icon */}
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#111111] border border-white/20 text-[#00BFFF] shrink-0">
              <SatelliteDish className="w-3.5 h-3.5" />
            </div>

            {/* Satellite & Station */}
            <div className="min-w-0 flex-1">
              <div className="font-sans font-bold text-[12.5px] text-[#F1F5F9] group-hover:text-[#00BFFF] transition-colors truncate">
                {pass.sat}
              </div>
              <div className="text-[10px] text-[#94A3B8] truncate mt-0.5 font-medium">
                {pass.station}
              </div>
            </div>

            {/* Countdown & Elevation */}
            <div className="text-right min-w-[75px]">
              <div
                className="font-sans text-[12.5px] font-bold tracking-wider"
                style={{ color: pass.color }}
              >
                {pass.countdown}
              </div>
              <div className="text-[9.5px] text-[#94A3B8] tracking-wide mt-0.5 font-medium">
                {pass.elev}
              </div>
            </div>

            {/* Semicircular Radar Elevation Arc */}
            <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#161616"
                  strokeWidth="2.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={pass.color}
                  strokeWidth="2.5"
                  strokeDasharray="44 88"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 4px ${pass.color})` }}
                />
              </svg>
            </div>

            {/* Chevron Right */}
            <div className="text-[#94A3B8] group-hover:text-[#F1F5F9] transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};
