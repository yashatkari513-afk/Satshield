import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Satellite } from '../../types/telemetry';

interface OrbitPathProps {
  satellite: Satellite;
  isSelected: boolean;
}

export const OrbitPath: React.FC<OrbitPathProps> = ({ satellite, isSelected }) => {
  // Generate 3D orbit line geometry
  const linePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    const r = satellite.orbitRadius;
    const incRad = (satellite.inclination * Math.PI) / 180;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle) * Math.cos(incRad);
      const y = r * Math.sin(angle) * Math.sin(incRad);
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }, [satellite.orbitRadius, satellite.inclination]);

  const pathColor =
    satellite.healthStatus === 'nominal' ? '#00e5ff' : satellite.healthStatus === 'warning' ? '#ffb300' : '#ff3b3b';

  const lineGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(linePoints);
    return geom;
  }, [linePoints]);

  const lineObject = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: pathColor,
      transparent: true,
      opacity: isSelected ? 0.7 : 0.25,
      linewidth: isSelected ? 2 : 1,
    });
    return new THREE.Line(lineGeometry, mat);
  }, [lineGeometry, pathColor, isSelected]);

  return <primitive object={lineObject} />;
};
