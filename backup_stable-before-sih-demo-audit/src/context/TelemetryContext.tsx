import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Satellite, Alert, GroundStation, CommandLog, AlertSeverity } from '../types/telemetry';
import { INITIAL_SATELLITES, INITIAL_ALERTS, INITIAL_GROUND_STATIONS, computeOverallHealth } from '../services/TelemetryService';
import { audioService } from '../services/AudioService';

interface Settings {
  units: 'metric' | 'imperial';
  updateIntervalMs: number;
  soundEnabled: boolean;
  autoAnomalyInjection: boolean;
  powerWarningThreshold: number; // %
  thermalWarningThreshold: number; // °C
}

interface TelemetryContextType {
  satellites: Satellite[];
  activeSatellite: Satellite;
  setActiveSatelliteId: (id: string) => void;
  groundStations: GroundStation[];
  alerts: Alert[];
  commandLogs: CommandLog[];
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  injectAnomaly: (satId?: string, subsystem?: string, severity?: AlertSeverity) => void;
  executeCommand: (cmdStr: string) => Promise<string>;
  focusedSubsystem: string | null;
  setFocusedSubsystem: (sub: string | null) => void;
  cameraMode: 'free' | 'follow' | 'subsystem';
  setCameraMode: (mode: 'free' | 'follow' | 'subsystem') => void;
  addSatelliteToTelemetry: (sat: Satellite) => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [satellites, setSatellites] = useState<Satellite[]>(INITIAL_SATELLITES);
  const [activeSatelliteId, setActiveSatelliteId] = useState<string>('SAT-001');
  const [groundStations] = useState<GroundStation[]>(INITIAL_GROUND_STATIONS);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [focusedSubsystem, setFocusedSubsystem] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'free' | 'follow' | 'subsystem'>('follow');

  const [settings, setSettings] = useState<Settings>({
    units: 'metric',
    updateIntervalMs: 1500,
    soundEnabled: true,
    autoAnomalyInjection: false,
    powerWarningThreshold: 40,
    thermalWarningThreshold: 45,
  });

  const activeSatellite = satellites.find((s) => s.id === activeSatelliteId) || satellites[0];

  const addSatelliteToTelemetry = useCallback((newSat: Satellite) => {
    setSatellites((prev) => {
      if (prev.some((s) => s.id === newSat.id)) return prev;
      return [...prev, newSat];
    });
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (typeof newSettings.soundEnabled === 'boolean') {
        audioService.setMuted(!newSettings.soundEnabled);
      }
      return updated;
    });
  };

  const acknowledgeAlert = (alertId: string) => {
    audioService.playClick();
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)));
  };

  const resolveAlert = (alertId: string) => {
    audioService.playSuccess();
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, resolved: true, acknowledged: true } : a)));
  };

  const injectAnomaly = useCallback((targetSatId?: string, targetSubsystem?: string, severity: AlertSeverity = 'critical') => {
    const satId = targetSatId || satellites[Math.floor(Math.random() * satellites.length)].id;
    const subsList = ['power', 'thermal', 'aocs', 'comm', 'propulsion', 'payload', 'obc'];
    const subName = (targetSubsystem || subsList[Math.floor(Math.random() * subsList.length)]) as keyof Satellite['subsystems'];

    const newAlert: Alert = {
      id: `ALT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString(),
      satelliteId: satId,
      satelliteName: satellites.find((s) => s.id === satId)?.name || satId,
      subsystem: subName,
      severity,
      title: `${subName.toUpperCase()} Anomaly Triggered`,
      message: `Simulated parameter drift detected on ${subName.toUpperCase()} subsystem for ${satId}.`,
      acknowledged: false,
      resolved: false,
    };

    setAlerts((prev) => [newAlert, ...prev]);

    if (severity === 'critical' || severity === 'emergency') {
      audioService.playCriticalAlarm();
    } else {
      audioService.playWarning();
    }

    setSatellites((prevSats) =>
      prevSats.map((sat) => {
        if (sat.id !== satId) return sat;

        const updatedSubsystems = { ...sat.subsystems };
        const targetSub = { ...updatedSubsystems[subName] };
        targetSub.status = severity === 'critical' || severity === 'emergency' ? 'critical' : 'warning';

        if (subName === 'power') {
          (targetSub as unknown as Satellite['subsystems']['power']).batteryCharge = Math.max(15, (targetSub as unknown as Satellite['subsystems']['power']).batteryCharge - 25);
          (targetSub as unknown as Satellite['subsystems']['power']).solarEfficiency = 45.0;
        } else if (subName === 'thermal') {
          (targetSub as unknown as Satellite['subsystems']['thermal']).payloadTemp = 58.4;
          (targetSub as unknown as Satellite['subsystems']['thermal']).internalTemp = 42.1;
        } else if (subName === 'aocs') {
          (targetSub as unknown as Satellite['subsystems']['aocs']).rxWheelSpeedX = 6200;
          (targetSub as unknown as Satellite['subsystems']['aocs']).pitch = 18.5;
        } else if (subName === 'comm') {
          (targetSub as unknown as Satellite['subsystems']['comm']).signalStrength = -105;
          (targetSub as unknown as Satellite['subsystems']['comm']).antennaPointing = 'Misaligned';
        }

        updatedSubsystems[subName] = targetSub as any;
        const { score, status } = computeOverallHealth({ ...sat, subsystems: updatedSubsystems });

        return {
          ...sat,
          subsystems: updatedSubsystems,
          overallHealth: score,
          healthStatus: status,
        };
      })
    );
  }, [satellites]);

  const executeCommand = async (cmdStr: string): Promise<string> => {
    const rawCmd = cmdStr.trim().toUpperCase();
    const newLog: CommandLog = {
      id: `CMD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString(),
      satelliteId: activeSatellite.id,
      command: rawCmd,
      status: 'EXECUTING',
      response: 'Transmitting command frame to spacecraft via RF ground link...',
    };

    setCommandLogs((prev) => [newLog, ...prev]);

    return new Promise((resolve) => {
      setTimeout(() => {
        let responseMsg = '';
        let success = true;

        if (rawCmd.includes('POWER') || rawCmd.includes('REBOOT_BUS')) {
          responseMsg = 'SUCCESS: Main power bus reset sequence executed. Battery charge restored to nominal float.';
          setSatellites((prev) =>
            prev.map((s) => {
              if (s.id !== activeSatellite.id) return s;
              const subs = { ...s.subsystems };
              subs.power.status = 'nominal';
              subs.power.batteryCharge = 95;
              subs.power.solarEfficiency = 96.0;
              subs.power.solarAngle = 10.0;
              const { score, status } = computeOverallHealth({ ...s, subsystems: subs });
              return { ...s, subsystems: subs, overallHealth: score, healthStatus: status };
            })
          );
        } else if (rawCmd.includes('SOLAR') || rawCmd.includes('ALIGN')) {
          responseMsg = 'SUCCESS: Solar array orientation re-aligned to sun vector. Solar efficiency at 98.4%.';
          setSatellites((prev) =>
            prev.map((s) => {
              if (s.id !== activeSatellite.id) return s;
              const subs = { ...s.subsystems };
              subs.power.solarEfficiency = 98.4;
              subs.power.solarAngle = 2.0;
              subs.power.solarOutput = 550;
              return { ...s, subsystems: subs };
            })
          );
        } else if (rawCmd.includes('AOCS') || rawCmd.includes('DESAT')) {
          responseMsg = 'SUCCESS: Magnetorquer desaturation routine complete. Reaction wheel RPMs normalized.';
          setSatellites((prev) =>
            prev.map((s) => {
              if (s.id !== activeSatellite.id) return s;
              const subs = { ...s.subsystems };
              subs.aocs.status = 'nominal';
              subs.aocs.rxWheelSpeedX = 2100;
              subs.aocs.rxWheelSpeedY = -1800;
              subs.aocs.rxWheelSpeedZ = 1950;
              subs.aocs.pitch = 0.2;
              subs.aocs.yaw = -0.1;
              subs.aocs.roll = 0.0;
              const { score, status } = computeOverallHealth({ ...s, subsystems: subs });
              return { ...s, subsystems: subs, overallHealth: score, healthStatus: status };
            })
          );
        } else if (rawCmd.includes('THERMAL') || rawCmd.includes('RADIATOR')) {
          responseMsg = 'SUCCESS: Auxiliary heat pipes and louvers opened. Internal payload temp stabilizing.';
          setSatellites((prev) =>
            prev.map((s) => {
              if (s.id !== activeSatellite.id) return s;
              const subs = { ...s.subsystems };
              subs.thermal.status = 'nominal';
              subs.thermal.payloadTemp = 23.5;
              subs.thermal.internalTemp = 21.0;
              subs.thermal.radiatorStatus = 'Nominal';
              const { score, status } = computeOverallHealth({ ...s, subsystems: subs });
              return { ...s, subsystems: subs, overallHealth: score, healthStatus: status };
            })
          );
        } else if (rawCmd.includes('COMM') || rawCmd.includes('ANTENNA')) {
          responseMsg = 'SUCCESS: High-gain dish autotrack engaged. Signal strength locked at -72 dBm.';
          setSatellites((prev) =>
            prev.map((s) => {
              if (s.id !== activeSatellite.id) return s;
              const subs = { ...s.subsystems };
              subs.comm.status = 'nominal';
              subs.comm.antennaPointing = 'Optimal';
              subs.comm.signalStrength = -72;
              subs.comm.packetLoss = 0.01;
              const { score, status } = computeOverallHealth({ ...s, subsystems: subs });
              return { ...s, subsystems: subs, overallHealth: score, healthStatus: status };
            })
          );
        } else {
          responseMsg = `EXECUTED: Custom command "${rawCmd}" acknowledged by OBC command interpreter.`;
        }

        audioService.playSuccess();

        setCommandLogs((prev) =>
          prev.map((log) =>
            log.id === newLog.id
              ? { ...log, status: success ? 'SUCCESS' : 'FAILED', response: responseMsg }
              : log
          )
        );

        resolve(responseMsg);
      }, 1200);
    });
  };

  // Real-time orbit position & jitter simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSatellites((prevSats) =>
        prevSats.map((sat) => {
          const nextAngle = (sat.orbitAngle + sat.orbitSpeed) % (Math.PI * 2);
          const r = sat.orbitRadius;
          const incRad = (sat.inclination * Math.PI) / 180;
          const x = r * Math.cos(nextAngle);
          const z = r * Math.sin(nextAngle) * Math.cos(incRad);
          const y = r * Math.sin(nextAngle) * Math.sin(incRad);

          const subs = { ...sat.subsystems };
          const battJitter = (Math.random() - 0.49) * 0.2;
          const newBatt = Math.min(100, Math.max(10, subs.power.batteryCharge + battJitter));
          const solarJitter = Math.floor((Math.random() - 0.48) * 10);
          const newSolar = Math.max(0, subs.power.solarOutput + solarJitter);
          const intTempJitter = (Math.random() - 0.5) * 0.15;
          const newIntTemp = subs.thermal.internalTemp + intTempJitter;
          const pitchJitter = (Math.random() - 0.5) * 0.05;
          const yawJitter = (Math.random() - 0.5) * 0.05;
          const passCountdown = Math.max(0, subs.aocs.groundStationPassCountdown - 1);

          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const powerHist = [...subs.power.history.slice(1), { time: nowStr, batteryCharge: Math.round(newBatt), solarOutput: newSolar, batteryVoltage: subs.power.batteryVoltage, temp: subs.power.batteryTemp, current: subs.power.current, powerDraw: subs.power.powerConsumption }];
          const thermalHist = [...subs.thermal.history.slice(1), { time: nowStr, internal: Number(newIntTemp.toFixed(1)), external: Number(subs.thermal.externalTemp.toFixed(1)), payload: Number(subs.thermal.payloadTemp.toFixed(1)) }];

          const updatedSubs: Satellite['subsystems'] = {
            ...subs,
            power: {
              ...subs.power,
              batteryCharge: Number(newBatt.toFixed(1)),
              solarOutput: newSolar,
              history: powerHist,
            },
            thermal: {
              ...subs.thermal,
              internalTemp: Number(newIntTemp.toFixed(1)),
              history: thermalHist,
            },
            aocs: {
              ...subs.aocs,
              pitch: Number((subs.aocs.pitch + pitchJitter).toFixed(2)),
              yaw: Number((subs.aocs.yaw + yawJitter).toFixed(2)),
              groundStationPassCountdown: passCountdown,
            },
            comm: {
              ...subs.comm,
              contactWindowCountdown: passCountdown,
            },
            obc: {
              ...subs.obc,
              uptimeSeconds: subs.obc.uptimeSeconds + 1,
            },
          };

          const { score, status } = computeOverallHealth({ ...sat, subsystems: updatedSubs });

          return {
            ...sat,
            position: { x, y, z },
            orbitAngle: nextAngle,
            subsystems: updatedSubs,
            overallHealth: score,
            healthStatus: status,
          };
        })
      );
    }, settings.updateIntervalMs);

    return () => clearInterval(timer);
  }, [settings.updateIntervalMs]);

  return (
    <TelemetryContext.Provider
      value={{
        satellites,
        activeSatellite,
        setActiveSatelliteId,
        groundStations,
        alerts,
        commandLogs,
        settings,
        updateSettings,
        acknowledgeAlert,
        resolveAlert,
        injectAnomaly,
        executeCommand,
        focusedSubsystem,
        setFocusedSubsystem,
        cameraMode,
        setCameraMode,
        addSatelliteToTelemetry,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
};
