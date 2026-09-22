import React from 'react';

interface OrbitalLogoIconProps {
  size?: number;
  className?: string;
}

export const OrbitalLogoIcon: React.FC<OrbitalLogoIconProps> = ({ size = 32, className = '' }) => {
  const outerBorder = size < 20 ? 1 : Math.max(1.2, size * 0.045);
  const innerInset = size < 20 ? 2 : Math.max(3, Math.round(size * 0.14));
  const dotSize = size < 20 ? 3 : Math.max(4, Math.round(size * 0.18));

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer orbital ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `${outerBorder}px solid #00eaff`,
          boxShadow: '0 0 10px rgba(0, 234, 255, 0.6)',
        }}
      />
      {/* Inner dashed ring */}
      <div
        className="absolute rounded-full animate-spin-slow"
        style={{
          inset: `${innerInset}px`,
          border: '1px dashed rgba(0, 234, 255, 0.45)',
        }}
      />
      {/* Core planet dot */}
      <div
        className="rounded-full bg-[#00eaff]"
        style={{
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          boxShadow: '0 0 6px #00eaff',
        }}
      />
    </div>
  );
};
