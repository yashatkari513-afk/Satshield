import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { Radio, Crosshair, MapPin, ShieldCheck } from 'lucide-react';

export const GroundTrackMap: React.FC = () => {
  const { activeSatellite, groundStations } = useTelemetry();

  // Project 3D satellite coordinates to 2D Equirectangular Lat/Lon
  const pos = activeSatellite.position;
  const radius = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
  const latDeg = Math.asin(pos.y / radius) * (180 / Math.PI);
  const lonDeg = Math.atan2(pos.z, pos.x) * (180 / Math.PI);

  // Map Lon (-180 to 180) -> X % (0 to 100)
  // Map Lat (-90 to 90) -> Y % (0 to 100)
  const subSatX = ((lonDeg + 180) / 360) * 100;
  const subSatY = ((90 - latDeg) / 180) * 100;

  // Calculate orbital ground track points
  const trackPoints: { x: number; y: number }[] = [];
  const segments = 40;
  const r = activeSatellite.orbitRadius;
  const incRad = (activeSatellite.inclination * Math.PI) / 180;

  for (let i = 0; i < segments; i++) {
    const angle = activeSatellite.orbitAngle + (i / segments) * Math.PI * 2;
    const px = r * Math.cos(angle);
    const pz = r * Math.sin(angle) * Math.cos(incRad);
    const py = r * Math.sin(angle) * Math.sin(incRad);

    const pRad = Math.sqrt(px * px + py * py + pz * pz);
    const pLat = Math.asin(py / pRad) * (180 / Math.PI);
    const pLon = Math.atan2(pz, px) * (180 / Math.PI);

    trackPoints.push({
      x: ((pLon + 180) / 360) * 100,
      y: ((90 - pLat) / 180) * 100,
    });
  }

  return (
    <div className="relative w-full h-full min-h-[220px] rounded-xl overflow-hidden glass-panel border border-cyan-500/30 p-3 flex flex-col justify-between">
      {/* Header Bar */}
      <div className="flex items-center justify-between z-10 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/20 mb-2">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-xs font-orbitron font-semibold text-cyan-200 uppercase tracking-wide">
            Ground Track Projection • {activeSatellite.name}
          </span>
        </div>
        <div className="text-[11px] font-mono-hud text-slate-300">
          LAT: <span className="text-cyan-300 font-bold">{latDeg.toFixed(2)}°</span> | LON:{' '}
          <span className="text-cyan-300 font-bold">{lonDeg.toFixed(2)}°</span> | ALT:{' '}
          <span className="text-cyan-300 font-bold">{activeSatellite.subsystems.aocs.altitude} km</span>
        </div>
      </div>

      {/* 2D Equirectangular World Map Canvas */}
      <div className="relative flex-1 w-full rounded-lg overflow-hidden bg-[#070d18] border border-cyan-900/40">
        {/* World Map SVG Silhouette */}
        <svg viewBox="0 0 1000 500" className="absolute inset-0 w-full h-full opacity-30 text-cyan-800">
          {/* Continents outlines SVG simplified shapes */}
          <path
            fill="currentColor"
            d="M 150 120 Q 200 80 320 100 T 400 200 T 350 350 T 250 300 Z M 550 100 Q 700 80 850 120 T 820 280 T 600 350 Z M 780 350 Q 880 320 920 400 T 800 450 Z"
          />
          {/* Grid lines */}
          <line x1="0" y1="250" x2="1000" y2="250" stroke="#00e5ff" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />
          <line x1="500" y1="0" x2="500" y2="500" stroke="#00e5ff" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.3" />
        </svg>

        {/* Orbit Ground Track Path */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {trackPoints.map((pt, idx) => {
            if (idx === 0) return null;
            const prev = trackPoints[idx - 1];
            // Prevent wrap-around lines across map boundary
            if (Math.abs(pt.x - prev.x) > 50) return null;
            return (
              <line
                key={idx}
                x1={`${prev.x}%`}
                y1={`${prev.y}%`}
                x2={`${pt.x}%`}
                y2={`${pt.y}%`}
                stroke={activeSatellite.healthStatus === 'nominal' ? '#00e5ff' : '#ffb300'}
                strokeWidth="2"
                strokeDasharray="3 3"
                opacity="0.8"
              />
            );
          })}
        </svg>

        {/* Ground Station Markers */}
        {groundStations.map((gs) => {
          const gsX = ((gs.lon + 180) / 360) * 100;
          const gsY = ((90 - gs.lat) / 180) * 100;
          return (
            <div
              key={gs.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${gsX}%`, top: `${gsY}%` }}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-black/90 text-emerald-300 text-[9px] font-mono-hud rounded whitespace-nowrap border border-emerald-500/40 z-20">
                {gs.name} ({gs.location})
              </div>
            </div>
          );
        })}

        {/* Satellite Sub-Point Position Marker & Footprint Circle */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-700 ease-out"
          style={{ left: `${subSatX}%`, top: `${subSatY}%` }}
        >
          {/* Footprint Coverage Circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-cyan-400/40 bg-cyan-500/10 animate-ping pointer-events-none" />
          <div className="relative flex items-center justify-center">
            <Radio className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_8px_rgba(0,229,255,0.9)] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-2 flex items-center justify-between text-[10px] font-mono-hud text-slate-400 px-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Orbit Path</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Ground Stations</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3 h-3" /> Ground Contact Active
        </div>
      </div>
    </div>
  );
};
