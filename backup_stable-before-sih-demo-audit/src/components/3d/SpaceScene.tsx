import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Earth } from './Earth';
import { Constellation } from './Constellation';
import { useTelemetry } from '../../context/TelemetryContext';

const CameraController: React.FC = () => {
  const { activeSatellite, cameraMode } = useTelemetry();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useFrame(() => {
    if (cameraMode === 'follow' && controlsRef.current && activeSatellite) {
      const targetPos = new THREE.Vector3(
        activeSatellite.position.x,
        activeSatellite.position.y,
        activeSatellite.position.z
      );

      // Smoothly update controls target to follow satellite
      controlsRef.current.target.lerp(targetPos, 0.05);

      // Maintain offset position for camera
      const camOffset = new THREE.Vector3().copy(targetPos).add(new THREE.Vector3(1.5, 1.2, 1.8));
      controlsRef.current.object.position.lerp(camOffset, 0.03);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      minDistance={3.2}
      maxDistance={25.0}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
    />
  );
};

export const SpaceScene: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-[#030509]">
      <Canvas
        camera={{ position: [0, 5, 10], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        {/* Lighting setup — directional sun at [10,8,5] matches Earth shader sunDirection */}
        <ambientLight intensity={0.08} />
        <directionalLight position={[10, 8, 5]} intensity={2.2} castShadow color="#fff8f0" />
        {/* Deep-space fill — very faint blue-ish backfill */}
        <hemisphereLight args={['#0a1628', '#000000', 0.12]} />

        {/* Dynamic Starfield Background */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Earth Centerpiece */}
        <Earth />

        {/* Orbiting Satellite Constellation */}
        <Constellation />

        {/* Camera & Orbit Controls */}
        <CameraController />
      </Canvas>
    </div>
  );
};
