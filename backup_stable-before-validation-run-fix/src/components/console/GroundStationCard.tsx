import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { Radio, Wifi } from 'lucide-react';

export const GroundStationCard: React.FC = () => {
  const { activeSatellite } = useTelemetry();
  const comm = activeSatellite.subsystems.comm;

  const passMinutes = Math.floor(comm.contactWindowCountdown / 60);
  const passSecs = comm.contactWindowCountdown % 60;
  const nextPassStr = comm.contactWindowCountdown > 0 ? `IN ${passMinutes}M ${passSecs}S` : 'CONNECTED NOW';

  return (
    <div className="sat-panel rounded-xl p-4 space-y-4 font-mono-hud text-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2a42]">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-[#4dd8e6]" />
            <span className="font-display font-semibold text-xs text-[#eaf2fb] uppercase tracking-wider">
              GROUND STATION
            </span>
          </div>
          <span className="text-[10px] text-[#4dd8e6] font-bold bg-[#0d1526] px-2 py-1 rounded-md">ISRO NETWORK</span>
        </div>

        {/* Station Identity */}
        <div className="mt-4">
          <div className="text-[10px] text-[#8fa3bf] uppercase tracking-wider">PRIMARY TRACKING NODE</div>
          <div className="font-display font-bold text-sm text-[#4dd8e6] mt-1">GS-NAGPUR (INDIA)</div>
          <div className="text-[9px] text-[#8fa3bf] mt-1">LAT: 21.1458° N | LON: 79.0882° E</div>
        </div>

        {/* Readouts Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4 text-[10px]">
          <div className="p-3 rounded-lg bg-[#030303] border border-[#1c2a42] hover:border-[#4dd8e6]/30 transition-all duration-300">
            <div className="text-[#8fa3bf] uppercase">SIGNAL LEVEL</div>
            <div className="text-xs font-bold text-[#4dd8e6] mt-1">{comm.signalStrength} dBm</div>
          </div>
          <div className="p-3 rounded-lg bg-[#030303] border border-[#1c2a42] hover:border-[#4dd8e6]/30 transition-all duration-300">
            <div className="text-[#8fa3bf] uppercase">PASS DURATION</div>
            <div className="text-xs font-bold text-[#eaf2fb] mt-1">08:42 MIN</div>
          </div>
          <div className="p-3 rounded-lg bg-[#030303] border border-[#1c2a42] hover:border-[#f5a623]/30 transition-all duration-300">
            <div className="text-[#8fa3bf] uppercase">NEXT PASS</div>
            <div className="text-[11px] font-bold text-[#f5a623] mt-1">{nextPassStr}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#030303] border border-[#1c2a42] hover:border-[#4dd8e6]/30 transition-all duration-300">
            <div className="text-[#8fa3bf] uppercase">LINK STATUS</div>
            <div className="text-xs font-bold text-[#4dd8e6] mt-1 flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-[#4dd8e6]" /> CONNECTED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
