import React from 'react';

interface OrbitalLogoIconProps {
  size?: number;
  className?: string;
  showOrbit?: boolean;
}

export const OrbitalLogoIcon: React.FC<OrbitalLogoIconProps> = ({
  size = 32,
  className = '',
  showOrbit = true,
}) => {
  // Planet size inside the container (leave margin for orbit ring if showOrbit is true)
  const planetSize = showOrbit ? Math.max(12, Math.round(size * 0.72)) : size;

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer Orbit Path & Satellite Ring */}
      {showOrbit && (
        <>
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: '1px dashed rgba(0, 234, 255, 0.4)',
            }}
          />
          {/* Orbiting Satellite Indicator */}
          <div
            className="absolute inset-0 rounded-full animate-spin pointer-events-none"
            style={{ animationDuration: '8s' }}
          >
            <div
              className="absolute -top-[1.5px] left-1/2 -translate-x-1/2 rounded-full bg-[#00eaff]"
              style={{
                width: Math.max(3, Math.round(size * 0.12)),
                height: Math.max(3, Math.round(size * 0.12)),
                boxShadow: '0 0 6px #00eaff, 0 0 10px #00BFFF',
              }}
            />
          </div>
        </>
      )}

      {/* Real Earth Globe with Atmospheric Aura */}
      <div
        className="relative rounded-full overflow-hidden shrink-0 flex items-center justify-center transition-transform hover:scale-105"
        style={{
          width: planetSize,
          height: planetSize,
          boxShadow: '0 0 10px rgba(0, 217, 255, 0.6), inset 0 0 6px rgba(0, 150, 255, 0.5)',
          border: '1px solid rgba(0, 234, 255, 0.5)',
        }}
      >
        <img
          src="/earth-icon.jpg"
          alt="Planet Earth"
          className="w-full h-full object-cover rounded-full"
          loading="eager"
          decoding="async"
        />
        {/* Atmosphere Specular / Highlight Overlay */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.35) 0%, rgba(0, 234, 255, 0.15) 45%, rgba(2, 6, 23, 0.4) 100%)',
          }}
        />
      </div>
    </div>
  );
};
