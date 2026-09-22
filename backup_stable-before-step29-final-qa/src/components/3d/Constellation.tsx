import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { SatelliteModel } from './SatelliteModel';
import { OrbitPath } from './OrbitPath';

export const Constellation: React.FC = () => {
  const { satellites, activeSatellite, setActiveSatelliteId } = useTelemetry();

  return (
    <group>
      {satellites.map((sat) => {
        const isSelected = sat.id === activeSatellite.id;
        return (
          <React.Fragment key={sat.id}>
            <OrbitPath satellite={sat} isSelected={isSelected} />
            <SatelliteModel
              satellite={sat}
              isSelected={isSelected}
              onSelect={setActiveSatelliteId}
            />
          </React.Fragment>
        );
      })}
    </group>
  );
};
