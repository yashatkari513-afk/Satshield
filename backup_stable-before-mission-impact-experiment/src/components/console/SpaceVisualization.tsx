import React from 'react';
import { SpaceScene } from '../3d/SpaceScene';
import { useTelemetry } from '../../context/TelemetryContext';
import { Eye, Crosshair, Maximize2, Minimize2 } from 'lucide-react';

export const SpaceVisualization: React.FC = ({ className = '' }: { className?: string }) => {
  const { activeSatellite, cameraMode, setCameraMode } = useTelemetry();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  return (
    <div
      className={`relative w-full transition-all duration-500 rounded-xl overflow-hidden sat-panel border border-[#1c2a42] ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'h-[480px]'
      } ${className}`}
    >
      {/* 3D Three.js Space Scene */}
      <SpaceScene />

      {/* Top Left Status Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-[#030303]/95 backdrop-blur-xl px-4 py-2 rounded-lg border border-[#1c2a42]/60 font-mono-hud text-xs shadow-lg">
        <span className="w-2.5 h-2.5 rounded-full bg-[#4dd8e6] shadow-[0_0_10px_#4dd8e6] animate-pulse" />
        <span className="text-[#eaf2fb] font-bold tracking-wide">{activeSatellite.name} ({activeSatellite.id})</span>
        <span className="text-[#8fa3bf]">| ALT {activeSatellite.subsystems.aocs.altitude} KM</span>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        {/* Camera mode selector */}
        <div className="flex items-center bg-[#030303]/95 backdrop-blur-xl border border-[#1c2a42]/60 rounded-lg p-1.5 text-[11px] font-mono-hud text-[#8fa3bf] shadow-lg">
          <button
            onClick={() => setCameraMode('follow')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 cursor-pointer uppercase ${
              cameraMode === 'follow' 
                ? 'bg-[#4dd8e6] text-[#030303] font-bold shadow-[0_0_10px_rgba(77,216,230,0.3)]' 
                : 'hover:text-[#eaf2fb] hover:bg-[#1c2a42]/30'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> FOLLOW SAT
          </button>
          <button
            onClick={() => setCameraMode('free')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 cursor-pointer uppercase ${
              cameraMode === 'free' 
                ? 'bg-[#4dd8e6] text-[#030303] font-bold shadow-[0_0_10px_rgba(77,216,230,0.3)]' 
                : 'hover:text-[#eaf2fb] hover:bg-[#1c2a42]/30'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" /> FREE ORBIT
          </button>
        </div>

        {/* Fullscreen toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2.5 rounded-lg bg-[#030303]/95 hover:bg-[#0d1526] border border-[#1c2a42]/60 text-[#4dd8e6] transition-all duration-300 cursor-pointer hover:border-[#4dd8e6]/50 hover:shadow-[0_0_15px_rgba(0,217,255,0.3)]"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Center RF Beam Active Label */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-[#030303]/95 backdrop-blur-xl border border-[#1c2a42]/60 text-[10px] font-mono-hud text-[#4dd8e6] flex items-center gap-2.5 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-[#4dd8e6] animate-ping" />
        ISRO RF DOWNLINK LINKED TO GS-NAGPUR
      </div>
    </div>
  );
};
