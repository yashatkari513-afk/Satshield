import React, { useState } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { SpaceScene } from '../3d/SpaceScene';
import { Wrench } from 'lucide-react';

export const DigitalTwinView: React.FC = () => {
  const { activeSatellite, executeCommand } = useTelemetry();
  const [selectedComponent, setSelectedComponent] = useState<'solar' | 'battery' | 'antenna' | 'sensors' | 'propulsion' | 'obc'>('solar');

  const subs = activeSatellite.subsystems;

  const componentData = {
    solar: {
      name: 'SOLAR PANEL ARRAY',
      status: subs.power.status,
      metrics: [
        { label: 'Efficiency', value: `${subs.power.solarEfficiency}%` },
        { label: 'Voltage', value: `${subs.power.batteryVoltage} V` },
        { label: 'Temperature', value: `${subs.power.batteryTemp} °C` },
        { label: 'Output Generation', value: `${subs.power.solarOutput} W` },
        { label: 'Panel Sun Angle', value: `${subs.power.solarAngle}°` },
      ],
      cmd: 'SOLAR ALIGN_AUTO',
    },
    battery: {
      name: 'MAIN BATTERY BUS (LiFePO4)',
      status: subs.power.batteryCharge < 50 ? 'critical' : subs.power.batteryCharge < 80 ? 'warning' : 'nominal',
      metrics: [
        { label: 'State of Charge (SOC)', value: `${subs.power.batteryCharge}%` },
        { label: 'Bus Voltage', value: `${subs.power.batteryVoltage} V` },
        { label: 'Cell Temp', value: `${subs.power.batteryTemp} °C` },
        { label: 'Cycle Count', value: `${subs.power.cycleCount}` },
      ],
      cmd: 'POWER REBOOT_BUS',
    },
    antenna: {
      name: 'HIGH-GAIN PARABOLIC DISH (Ku-BAND)',
      status: subs.comm.status,
      metrics: [
        { label: 'Signal SNR', value: `${subs.comm.snr} dB` },
        { label: 'Signal Strength', value: `${subs.comm.signalStrength} dBm` },
        { label: 'Downlink Speed', value: `${subs.comm.downlinkRate} Mbps` },
        { label: 'Pointing State', value: subs.comm.antennaPointing },
      ],
      cmd: 'COMM SYNC_ANTENNA',
    },
    sensors: {
      name: 'PAYLOAD OPTICAL & THERMAL SENSOR',
      status: subs.thermal.status,
      metrics: [
        { label: 'Sensor Array Temp', value: `${subs.thermal.payloadTemp} °C` },
        { label: 'Avionics Internal', value: `${subs.thermal.internalTemp} °C` },
        { label: 'Radiator Cooling', value: subs.thermal.radiatorStatus },
        { label: 'SSD Storage', value: `${subs.payload.dataStorageUsed}%` },
      ],
      cmd: 'THERMAL RADIATOR_OPEN',
    },
    propulsion: {
      name: 'HYDRAZINE MONOPROPELLANT THRUSTER',
      status: subs.propulsion.status,
      metrics: [
        { label: 'Propellant Reserve', value: `${subs.propulsion.fuelLevel}%` },
        { label: 'Delta-V Capability', value: `${subs.propulsion.deltaVRemaining} m/s` },
        { label: 'Chamber Pressure', value: `${subs.propulsion.chamberPressure} PSI` },
        { label: 'Last Orbit Raise', value: subs.propulsion.lastFiring },
      ],
      cmd: 'PROP TEST_THRUSTER',
    },
    obc: {
      name: 'ONBOARD COMPUTER & WATCHDOG',
      status: subs.obc.status,
      metrics: [
        { label: 'CPU Core Load', value: `${subs.obc.cpuLoad}%` },
        { label: 'RAM Memory Used', value: `${subs.obc.memoryUsage}%` },
        { label: 'Flight SW Version', value: subs.obc.softwareVersion },
        { label: 'Watchdog State', value: subs.obc.watchdogState },
      ],
      cmd: 'OBC DIAGNOSTIC_REBOOT',
    },
  };

  const current = componentData[selectedComponent];

  const handleFix = async () => {
    await executeCommand(current.cmd);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono-hud text-xs bg-[#05070d]">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between p-4 rounded-lg sat-panel border border-[#1c2a42]">
        <div>
          <div className="text-[10px] text-[#4dd8e6] font-bold uppercase tracking-wider">3D DIGITAL TWIN DIAGNOSTIC BAY</div>
          <h2 className="font-display font-extrabold text-xl text-[#eaf2fb] tracking-wide uppercase">
            {activeSatellite.id} — {activeSatellite.name} DIGITAL TWIN
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded bg-[#060a14] border border-[#4dd8e6]/40 text-[#4dd8e6] font-bold text-xs">
            CAD MESH ACTIVE
          </span>
        </div>
      </div>

      {/* Main 2-Column Twin Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[580px]">
        {/* Left Column: 3D Satellite Twin Viewport */}
        <div className="lg:col-span-2 relative rounded-lg sat-panel overflow-hidden border border-[#1c2a42]">
          <SpaceScene />

          {/* Interactive Component Hotspot Selector Overlay Buttons */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-center gap-2 bg-[#060a14]/90 p-2.5 rounded-lg border border-[#1c2a42] backdrop-blur-md">
            <span className="text-[10px] text-[#8fa3bf] uppercase mr-2 font-bold">SELECT COMPONENT:</span>
            {[
              { id: 'solar', label: 'SOLAR PANELS' },
              { id: 'battery', label: 'BATTERY' },
              { id: 'antenna', label: 'ANTENNA DISH' },
              { id: 'sensors', label: 'SENSORS' },
              { id: 'propulsion', label: 'PROPULSION' },
              { id: 'obc', label: 'OBC CORE' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setSelectedComponent(btn.id as any)}
                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all cursor-pointer uppercase ${
                  selectedComponent === btn.id
                    ? 'bg-[#4dd8e6] text-[#060a14] shadow-[0_0_10px_#4dd8e6]'
                    : 'bg-[#0d1526] text-[#8fa3bf] hover:text-[#eaf2fb] border border-[#1c2a42]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Component Telemetry Inspection Panel */}
        <div className="sat-panel rounded-lg p-5 flex flex-col justify-between border border-[#1c2a42]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1c2a42]">
              <span className="font-display font-semibold text-xs text-[#eaf2fb] uppercase tracking-wider">
                COMPONENT DIAGNOSTICS
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  current.status === 'nominal'
                    ? 'bg-[#4dd8e6]/10 text-[#4dd8e6] border-[#4dd8e6]/40'
                    : current.status === 'warning'
                    ? 'bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/40'
                    : 'bg-[#ff5470]/10 text-[#ff5470] border-[#ff5470]/40 animate-pulse'
                }`}
              >
                {current.status.toUpperCase()}
              </span>
            </div>

            <div className="mt-4">
              <h3 className="font-display font-bold text-base text-[#4dd8e6] uppercase">{current.name}</h3>
              <p className="text-[10px] text-[#8fa3bf] mt-0.5">Real-time CAD node telemetry link feed</p>
            </div>

            {/* Metrics List */}
            <div className="mt-5 space-y-2.5">
              {current.metrics.map((m) => (
                <div key={m.label} className="p-3 rounded bg-[#060a14] border border-[#1c2a42] flex items-center justify-between">
                  <span className="text-[#8fa3bf]">{m.label}</span>
                  <span className="text-[#eaf2fb] font-bold text-xs">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fix Action */}
          <div className="pt-4 border-t border-[#1c2a42]">
            <button
              onClick={handleFix}
              className="w-full py-2.5 bg-[#4dd8e6] hover:bg-[#3bc4d2] text-[#060a14] font-mono-hud font-bold text-xs rounded transition-all shadow-[0_0_15px_rgba(77,216,230,0.3)] flex items-center justify-center gap-2 cursor-pointer uppercase"
            >
              <Wrench className="w-4 h-4" /> UPLINK COMPONENT COMMAND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
