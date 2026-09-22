import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';

export const SatelliteList: React.FC = () => {
  const { satellites, activeSatellite, setActiveSatelliteId } = useTelemetry();

  return (
    <div className="sat-panel rounded-xl p-4 space-y-3 font-mono-hud text-xs">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c2a42]">
        <span className="font-display font-semibold text-xs tracking-wider text-[#eaf2fb] uppercase">
          ACTIVE SATELLITES
        </span>
        <span className="text-[10px] text-[#8fa3bf] bg-[#0d1526] px-2 py-1 rounded-md">{satellites.length} FLEET</span>
      </div>

      {/* Satellite List Rows */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
        {satellites.map((sat, index) => {
          const isSelected = sat.id === activeSatellite.id;
          const statusText =
            sat.healthStatus === 'nominal' ? 'HEALTHY' : sat.healthStatus === 'warning' ? 'WARNING' : 'CRITICAL';
          const dotColor =
            sat.healthStatus === 'nominal' ? 'bg-[#4dd8e6] shadow-[0_0_8px_#4dd8e6]' : sat.healthStatus === 'warning' ? 'bg-[#f5a623] shadow-[0_0_8px_#f5a623]' : 'bg-[#ff5470] shadow-[0_0_8px_#ff5470] animate-ping';
          const textColor =
            sat.healthStatus === 'nominal' ? 'text-[#4dd8e6]' : sat.healthStatus === 'warning' ? 'text-[#f5a623]' : 'text-[#ff5470]';

          return (
            <button
              key={sat.id}
              onClick={() => setActiveSatelliteId(sat.id)}
              className={`w-full p-3 rounded-lg text-left transition-all duration-300 cursor-pointer border ${
                isSelected
                  ? 'bg-[#030303] border-[#4dd8e6]/50 shadow-[0_0_20px_rgba(77,216,230,0.2)] transform scale-[1.02]'
                  : 'bg-[#0d1526]/40 border-[#1c2a42] hover:border-[#4dd8e6]/40 hover:bg-[#030303]/60 hover:shadow-[0_0_15px_rgba(77,216,230,0.1)]'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#eaf2fb] font-mono-hud tracking-wide">{sat.id} ({sat.name})</span>
                <span className={`flex items-center gap-2 text-[10px] font-bold uppercase ${textColor}`}>
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  {statusText}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-[#8fa3bf]">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase opacity-70">HEALTH</span>
                  <span className="text-[#eaf2fb] font-bold">{sat.overallHealth}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase opacity-70">SIGNAL</span>
                  <span className="text-[#eaf2fb] font-bold">{sat.subsystems.comm.signalStrength}dBm</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase opacity-70">ORBIT</span>
                  <span className="text-[#4dd8e6] font-bold">{sat.orbitType}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
