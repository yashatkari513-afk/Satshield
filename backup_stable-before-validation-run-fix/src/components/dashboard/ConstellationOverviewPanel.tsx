import React from 'react';
import { ExternalLink } from 'lucide-react';
import { DashboardGlobe3D } from './DashboardGlobe3D';
import { useTelemetry } from '../../context/TelemetryContext';
import { useSimulation } from '../../context/SimulationContext';

import { ErrorBoundary } from '../common/ErrorBoundary';

interface ConstellationOverviewPanelProps {
  onSelectSatellite: (satId: string) => void;
  onViewConstellation: () => void;
  onInspectSatellite?: (satId: string) => void;
}

export const ConstellationOverviewPanel: React.FC<ConstellationOverviewPanelProps> = ({
  onSelectSatellite,
  onViewConstellation,
  onInspectSatellite,
}) => {
  const { activeSatellite, setActiveSatelliteId: setTelemetryActiveId } = useTelemetry();
  const {
    activeSatelliteId,
    setActiveSatelliteId: setSimActiveId,
    satellitesData,
  } = useSimulation();

  const satList = Object.values(satellitesData);
  const totalAssets = satList.length;

  return (
    <div
      className="rounded-xl p-4 select-none relative overflow-hidden flex flex-col h-full justify-between"
      style={{
        background: '#000000',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <h3 className="font-sans font-bold text-[13px] text-[#F1F5F9] uppercase tracking-wider">
          CONSTELLATION OVERVIEW
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[#22C55E] font-bold">
            {totalAssets} ASSETS TRACKED
          </span>
        </div>
      </div>

      {/* ── BODY: 3D EARTH (LEFT) + SATELLITE LIST (RIGHT) ── */}
      <div className="relative flex-1 flex items-center min-h-[220px] 2xl:min-h-[260px]">
        {/* 3D Earth Globe with night lights & orbital rings */}
        <div className="w-full h-full absolute inset-0">
          <ErrorBoundary fallbackTitle="3D Orbital Track Loading">
            <DashboardGlobe3D />
          </ErrorBoundary>
        </div>

        {/* Right Overlay List with dynamic satellite identity colors */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 space-y-1.5 z-10 font-sans pointer-events-auto max-w-[145px] max-h-[220px] overflow-y-auto custom-scrollbar pr-0.5">
          {satList.map((sat) => {
            const isSelected = sat.id === activeSatelliteId || activeSatellite.id === sat.id;
            const status = sat.status;
            const health = sat.telemetry?.healthScore || 95;
            const color = sat.color || '#00BFFF';

            const isCrit = status === 'CRITICAL';
            const isWarn = status === 'WARNING';
            const statusColor = isCrit ? '#EF4444' : isWarn ? '#F59E0B' : '#22C55E';

            return (
              <div
                key={sat.id}
                onClick={() => {
                  setTelemetryActiveId(sat.id);
                  setSimActiveId(sat.id);
                  onSelectSatellite(sat.id);
                }}
                className={`p-2 rounded-lg border transition-all cursor-pointer block group ${
                  isSelected
                    ? 'bg-[#111111] scale-102'
                    : 'bg-[#080808]/90 hover:bg-[#111111]'
                }`}
                style={{
                  borderColor: isSelected ? color : `${color}60`,
                  boxShadow: isSelected
                    ? `0 0 14px ${color}50, inset 0 0 10px ${color}20`
                    : `0 0 8px ${color}20`,
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 6px ${color}`,
                      }}
                    />
                    <span
                      className="font-sans font-bold text-[12px] tracking-wide transition-colors truncate"
                      style={{
                        color: isSelected ? color : '#F1F5F9',
                      }}
                    >
                      {sat.name}
                    </span>
                  </div>
                  <span
                    className="font-mono text-[9px] font-bold shrink-0"
                    style={{ color: statusColor }}
                  >
                    {health}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9.5px] font-mono text-[#94A3B8] mt-0.5 pl-3.5">
                  <span className="truncate">{sat.altitude || `${sat.orbitType || 'LEO'}`}</span>
                  <span
                    className="text-[8.5px] px-1 py-0.2 rounded font-bold uppercase shrink-0"
                    style={{
                      color: color,
                      backgroundColor: `${color}15`,
                    }}
                  >
                    {sat.id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Right: VIEW CONSTELLATION ↗ */}
        <div className="absolute right-3 bottom-2 z-10">
          <button
            type="button"
            onClick={onViewConstellation}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#080808] border border-white/30 font-sans text-[10px] font-bold text-[#F1F5F9] hover:bg-white/10 transition-all cursor-pointer tracking-wider"
          >
            <span>FULL CONSTELLATION</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

