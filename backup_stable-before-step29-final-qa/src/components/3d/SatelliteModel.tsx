import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Satellite } from '../../types/telemetry';
import { useTelemetry } from '../../context/TelemetryContext';

interface SatelliteModelProps {
  satellite: Satellite;
  isSelected: boolean;
  onSelect: (satId: string) => void;
}

export const SatelliteModel: React.FC<SatelliteModelProps> = ({ satellite, isSelected, onSelect }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredSubsystem, setHoveredSubsystem] = useState<string | null>(null);
  const { setFocusedSubsystem } = useTelemetry();

  // Determine health color glow
  const healthColor =
    satellite.healthStatus === 'nominal' ? '#00e5ff' : satellite.healthStatus === 'warning' ? '#ffb300' : '#ff3b3b';

  // Smooth satellite rotation and orientation facing orbit vector
  useFrame((_, delta) => {
    if (groupRef.current) {
      // Position satellite in 3D orbit
      groupRef.current.position.set(satellite.position.x, satellite.position.y, satellite.position.z);
      // Gentle axial rotation
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  const handleSubsystemClick = (e: any, subName: string) => {
    e.stopPropagation();
    onSelect(satellite.id);
    setFocusedSubsystem(subName);
  };

  return (
    <group ref={groupRef} onClick={() => onSelect(satellite.id)}>
      {/* Selection Halo / Ring */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[0.7, 0.75, 32]} />
          <meshBasicMaterial color={healthColor} side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Dynamic Health Glow Pointlight */}
      <pointLight color={healthColor} intensity={isSelected ? 3.5 : 1.5} distance={2.5} />

      {/* 1. Main Satellite Bus Body (Gold foil reflective mesh) */}
      <mesh
        castShadow
        onPointerOver={(e) => { e.stopPropagation(); setHoveredSubsystem('OBC / Bus'); }}
        onPointerOut={() => setHoveredSubsystem(null)}
        onClick={(e) => handleSubsystemClick(e, 'obc')}
      >
        <boxGeometry args={[0.4, 0.4, 0.6]} />
        <meshStandardMaterial
          color="#d4af37"
          metalness={0.9}
          roughness={0.2}
          emissive={healthColor}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
        />
      </mesh>

      {/* 2. Solar Arrays (Left & Right Wings) */}
      <group
        onPointerOver={(e) => { e.stopPropagation(); setHoveredSubsystem('Solar Arrays'); }}
        onPointerOut={() => setHoveredSubsystem(null)}
        onClick={(e) => handleSubsystemClick(e, 'power')}
      >
        {/* Left Array */}
        <mesh position={[-0.85, 0, 0]}>
          <boxGeometry args={[1.2, 0.02, 0.35]} />
          <meshStandardMaterial color="#0f2b48" metalness={0.8} roughness={0.1} emissive="#006699" emissiveIntensity={0.2} />
        </mesh>

        {/* Right Array */}
        <mesh position={[0.85, 0, 0]}>
          <boxGeometry args={[1.2, 0.02, 0.35]} />
          <meshStandardMaterial color="#0f2b48" metalness={0.8} roughness={0.1} emissive="#006699" emissiveIntensity={0.2} />
        </mesh>
      </group>

      {/* 3. High Gain Parabolic Dish Antenna */}
      <group
        position={[0, 0.28, 0.15]}
        rotation={[-Math.PI / 4, 0, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredSubsystem('Comm Antenna'); }}
        onPointerOut={() => setHoveredSubsystem(null)}
        onClick={(e) => handleSubsystemClick(e, 'comm')}
      >
        <mesh>
          <cylinderGeometry args={[0.22, 0.02, 0.08, 24]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.12, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
      </group>

      {/* 4. Propulsion Thruster Nozzle */}
      <mesh
        position={[0, 0, -0.35]}
        rotation={[Math.PI / 2, 0, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredSubsystem('Thruster Engine'); }}
        onPointerOut={() => setHoveredSubsystem(null)}
        onClick={(e) => handleSubsystemClick(e, 'propulsion')}
      >
        <coneGeometry args={[0.08, 0.15, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* 5. Payload Optical Lens Sensor */}
      <mesh
        position={[0, -0.22, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredSubsystem('Payload Sensor'); }}
        onPointerOut={() => setHoveredSubsystem(null)}
        onClick={(e) => handleSubsystemClick(e, 'payload')}
      >
        <cylinderGeometry args={[0.09, 0.09, 0.08, 16]} />
        <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.0} emissive="#00e5ff" emissiveIntensity={0.5} />
      </mesh>

      {/* HUD Label Overlay on Satellite */}
      <Html distanceFactor={12} position={[0, 0.6, 0]}>
        <div className="pointer-events-none flex flex-col items-center">
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-orbitron font-bold tracking-wider uppercase border shadow-lg backdrop-blur-md transition-all ${
              satellite.healthStatus === 'nominal'
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50'
                : satellite.healthStatus === 'warning'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                : 'bg-red-950/80 text-red-300 border-red-500/50 animate-pulse'
            }`}
          >
            {satellite.name} • {satellite.overallHealth}%
          </div>
          {hoveredSubsystem && (
            <div className="mt-1 px-1.5 py-0.5 bg-black/90 text-slate-200 border border-slate-700 rounded text-[9px] font-mono-hud">
              Inspect {hoveredSubsystem}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};
