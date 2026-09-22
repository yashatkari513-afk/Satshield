import React from 'react';
import { Compass } from 'lucide-react';

interface AttitudeWidgetProps {
  pitch: number;
  yaw: number;
  roll: number;
}

export const AttitudeWidget: React.FC<AttitudeWidgetProps> = ({ pitch, yaw, roll }) => {
  return (
    <div className="flex flex-col items-center justify-center p-3 glass-panel rounded-xl border border-cyan-500/20">
      <div className="flex items-center gap-1.5 mb-2 text-xs font-orbitron text-cyan-300 uppercase tracking-wider">
        <Compass className="w-4 h-4 text-cyan-400" />
        AOCS Attitude Indicator
      </div>

      {/* Visual Artificial Horizon / Attitude Sphere */}
      <div className="relative w-28 h-28 rounded-full border-2 border-cyan-500/50 bg-[#070e1b] overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.15)]">
        {/* Horizon Sky/Ground Disk rotating by Roll & translating by Pitch */}
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{
            transform: `rotate(${roll}deg) translateY(${pitch * 1.2}px)`,
          }}
        >
          {/* Top Half Sky (Blue) */}
          <div className="w-full h-1/2 bg-gradient-to-b from-sky-600 to-cyan-800 opacity-80" />
          {/* Bottom Half Earth (Brown/Dark) */}
          <div className="w-full h-1/2 bg-gradient-to-b from-amber-900 to-slate-900 opacity-90 border-t border-cyan-300" />
        </div>

        {/* Pitch Ladder Marks */}
        <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none opacity-40">
          <div className="w-8 h-[1px] bg-white my-1" />
          <div className="w-12 h-[1px] bg-cyan-300 my-1" />
          <div className="w-8 h-[1px] bg-white my-1" />
        </div>

        {/* Fixed Aircraft / Spacecraft Crosshair Indicator */}
        <div className="absolute z-10 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-[2px] bg-cyan-300 shadow-[0_0_5px_#00e5ff]" />
          <div className="w-2 h-2 rounded-full border-2 border-cyan-300 bg-transparent shadow-[0_0_5px_#00e5ff]" />
          <div className="w-4 h-[2px] bg-cyan-300 shadow-[0_0_5px_#00e5ff]" />
        </div>

        {/* Roll Scale Markers */}
        <div className="absolute top-1 text-[8px] font-mono-hud text-cyan-200">0°</div>
      </div>

      {/* Yaw / Pitch / Roll Angle Readouts */}
      <div className="grid grid-cols-3 gap-2 w-full mt-3 text-center font-mono-hud text-[11px]">
        <div className="bg-slate-900/60 p-1 rounded border border-cyan-500/20">
          <div className="text-[9px] text-slate-400">PITCH</div>
          <div className="text-cyan-300 font-bold">{pitch.toFixed(1)}°</div>
        </div>
        <div className="bg-slate-900/60 p-1 rounded border border-cyan-500/20">
          <div className="text-[9px] text-slate-400">YAW</div>
          <div className="text-cyan-300 font-bold">{yaw.toFixed(1)}°</div>
        </div>
        <div className="bg-slate-900/60 p-1 rounded border border-cyan-500/20">
          <div className="text-[9px] text-slate-400">ROLL</div>
          <div className="text-cyan-300 font-bold">{roll.toFixed(1)}°</div>
        </div>
      </div>
    </div>
  );
};
