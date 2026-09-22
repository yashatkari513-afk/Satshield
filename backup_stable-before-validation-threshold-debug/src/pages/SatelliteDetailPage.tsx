import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelemetry } from '../context/TelemetryContext';
import { Zap, Thermometer, Compass, Radio, Rocket, Database, Cpu, ArrowLeft, Download } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { exportTelemetryCSV } from '../services/ReportService';

export const SatelliteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { satellites, setActiveSatelliteId } = useTelemetry();
  const [activeTab, setActiveTab] = useState<'power' | 'thermal' | 'aocs' | 'comm' | 'propulsion' | 'payload' | 'obc'>('power');

  useEffect(() => {
    if (id) {
      setActiveSatelliteId(id);
    }
  }, [id, setActiveSatelliteId]);

  const sat = satellites.find((s) => s.id === id) || satellites[0];
  const subs = sat.subsystems;

  const handleSelectSat = (newId: string) => {
    setActiveSatelliteId(newId);
    navigate(`/satellite/${newId}`);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#05070f]">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-cyan-500/30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-orbitron font-extrabold text-slate-100 uppercase tracking-wide">
                {sat.name} ({sat.callsign})
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono-hud font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                {sat.orbitType} Orbit
              </span>
            </div>
            <p className="text-xs font-mono-hud text-slate-400 mt-0.5">
              NORAD ID: {sat.noradId} | Altitude: {subs.aocs.altitude} km | Inclination: {sat.inclination}°
            </p>
          </div>
        </div>

        {/* Satellite Selection & Actions */}
        <div className="flex items-center gap-3">
          <select
            value={sat.id}
            onChange={(e) => handleSelectSat(e.target.value)}
            className="bg-slate-900 text-cyan-300 font-orbitron font-bold text-xs px-3 py-1.5 rounded-lg border border-cyan-500/40 focus:outline-none cursor-pointer"
          >
            {satellites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>

          <button
            onClick={() => exportTelemetryCSV(sat)}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-orbitron font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> EXPORT CSV
          </button>
        </div>
      </div>

      {/* Subsystem Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'power', label: '1. Power', icon: <Zap className="w-4 h-4" /> },
          { key: 'thermal', label: '2. Thermal', icon: <Thermometer className="w-4 h-4" /> },
          { key: 'aocs', label: '3. AOCS', icon: <Compass className="w-4 h-4" /> },
          { key: 'comm', label: '4. Comm', icon: <Radio className="w-4 h-4" /> },
          { key: 'propulsion', label: '5. Propulsion', icon: <Rocket className="w-4 h-4" /> },
          { key: 'payload', label: '6. Payload', icon: <Database className="w-4 h-4" /> },
          { key: 'obc', label: '7. OBC', icon: <Cpu className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl font-orbitron text-xs font-bold uppercase transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                : 'glass-panel text-slate-400 hover:text-slate-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: POWER SUBSYSTEM */}
      {activeTab === 'power' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Battery Charge (SOC)</span>
              <div className="text-2xl font-orbitron font-bold text-slate-100 mt-1">{subs.power.batteryCharge}%</div>
              <div className="text-xs font-mono-hud text-cyan-300 mt-1">Voltage: {subs.power.batteryVoltage} V</div>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Solar Array Output</span>
              <div className="text-2xl font-orbitron font-bold text-amber-300 mt-1">{subs.power.solarOutput} W</div>
              <div className="text-xs font-mono-hud text-slate-400 mt-1">Sun Angle: {subs.power.solarAngle}°</div>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Solar Array Efficiency</span>
              <div className="text-2xl font-orbitron font-bold text-emerald-400 mt-1">{subs.power.solarEfficiency}%</div>
              <div className="text-xs font-mono-hud text-slate-400 mt-1">Cycle Count: {subs.power.cycleCount}</div>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Battery Temp</span>
              <div className="text-2xl font-orbitron font-bold text-cyan-300 mt-1">{subs.power.batteryTemp}°C</div>
              <div className="text-xs font-mono-hud text-emerald-400 mt-1">Thermal Nominal</div>
            </div>
          </div>

          {/* Power Trend Chart */}
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/30 h-80">
            <h4 className="font-orbitron text-xs font-bold text-cyan-300 uppercase mb-4">
              Real-Time Battery Charge & Solar Output Generation
            </h4>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={subs.power.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#00e5ff', fontSize: 11 }} />
                <Area type="monotone" dataKey="batteryCharge" stroke="#00e5ff" fill="#00e5ff" fillOpacity={0.2} name="Battery %" />
                <Area type="monotone" dataKey="solarOutput" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="Solar Output (W)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 2: THERMAL SUBSYSTEM */}
      {activeTab === 'thermal' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Internal Avionics</span>
              <div className="text-2xl font-orbitron font-bold text-slate-100 mt-1">{subs.thermal.internalTemp}°C</div>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">External Space Temp</span>
              <div className="text-2xl font-orbitron font-bold text-cyan-300 mt-1">{subs.thermal.externalTemp}°C</div>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Payload Sensor Temp</span>
              <div className="text-2xl font-orbitron font-bold text-amber-300 mt-1">{subs.thermal.payloadTemp}°C</div>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Radiator Cooling Status</span>
              <div className="text-xl font-orbitron font-bold text-emerald-400 mt-1">{subs.thermal.radiatorStatus}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl glass-panel border border-cyan-500/30 h-80">
            <h4 className="font-orbitron text-xs font-bold text-cyan-300 uppercase mb-4">
              Component Thermal Profiles Over Time (°C)
            </h4>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={subs.thermal.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#00e5ff', fontSize: 11 }} />
                <Line type="monotone" dataKey="internal" stroke="#00e5ff" strokeWidth={2} name="Internal" />
                <Line type="monotone" dataKey="payload" stroke="#ef4444" strokeWidth={2} name="Payload" />
                <Line type="monotone" dataKey="external" stroke="#64748b" strokeWidth={1} name="External" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 3: AOCS SUBSYSTEM */}
      {activeTab === 'aocs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Attitude Angles</span>
              <div className="text-base font-orbitron font-bold text-cyan-300 mt-1">
                P: {subs.aocs.pitch}° | Y: {subs.aocs.yaw}° | R: {subs.aocs.roll}°
              </div>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Star Tracker Lock</span>
              <div className="text-xl font-orbitron font-bold text-emerald-400 mt-1">{subs.aocs.starTrackerStatus}</div>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Orbital Period</span>
              <div className="text-xl font-orbitron font-bold text-slate-100 mt-1">{subs.aocs.periodMinutes} min</div>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
              <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Gyroscope Sensors</span>
              <div className="text-xl font-orbitron font-bold text-cyan-300 mt-1">{subs.aocs.gyroStatus}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl glass-panel border border-cyan-500/30 h-80">
            <h4 className="font-orbitron text-xs font-bold text-cyan-300 uppercase mb-4">
              Reaction Wheels Angular Velocities (RPM)
            </h4>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart
                data={[
                  { name: 'Wheel X', rpm: subs.aocs.rxWheelSpeedX },
                  { name: 'Wheel Y', rpm: subs.aocs.rxWheelSpeedY },
                  { name: 'Wheel Z', rpm: subs.aocs.rxWheelSpeedZ },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#00e5ff', fontSize: 11 }} />
                <Bar dataKey="rpm" fill="#00e5ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 4: COMM SUBSYSTEM */}
      {activeTab === 'comm' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Signal Strength / SNR</span>
            <div className="text-2xl font-orbitron font-bold text-emerald-400 mt-1">{subs.comm.signalStrength} dBm</div>
            <div className="text-xs font-mono-hud text-slate-400 mt-1">SNR: {subs.comm.snr} dB</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">RF Downlink Data Rate</span>
            <div className="text-2xl font-orbitron font-bold text-cyan-300 mt-1">{subs.comm.downlinkRate} Mbps</div>
            <div className="text-xs font-mono-hud text-slate-400 mt-1">Uplink: {subs.comm.uplinkRate} Mbps</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Antenna Alignment</span>
            <div className="text-xl font-orbitron font-bold text-slate-100 mt-1">{subs.comm.antennaPointing}</div>
            <div className="text-xs font-mono-hud text-slate-400 mt-1">BER: {subs.comm.bitErrorRate}</div>
          </div>
        </div>
      )}

      {/* Tab 5: PROPULSION SUBSYSTEM */}
      {activeTab === 'propulsion' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Propellant Fuel Level</span>
            <div className="text-2xl font-orbitron font-bold text-purple-300 mt-1">{subs.propulsion.fuelLevel}%</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Remaining Delta-V Capability</span>
            <div className="text-2xl font-orbitron font-bold text-cyan-300 mt-1">{subs.propulsion.deltaVRemaining} m/s</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Last Thruster Execution</span>
            <div className="text-base font-orbitron font-bold text-slate-100 mt-1">{subs.propulsion.lastFiring}</div>
          </div>
        </div>
      )}

      {/* Tab 6: PAYLOAD SUBSYSTEM */}
      {activeTab === 'payload' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Operational Payload State</span>
            <div className="text-xl font-orbitron font-bold text-emerald-400 mt-1">{subs.payload.operationalState}</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Solid-State Data Storage</span>
            <div className="text-2xl font-orbitron font-bold text-cyan-300 mt-1">{subs.payload.dataStorageUsed}%</div>
            <div className="text-xs font-mono-hud text-slate-400 mt-1">Total SSD: {subs.payload.solidStateDriveGB} GB</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Sensor Array Health</span>
            <div className="text-xs font-mono-hud text-emerald-400 mt-2 space-y-1">
              <div>Optical Sensor: {subs.payload.sensorHealth.opticalSensor ? 'NOMINAL' : 'DEGRADED'}</div>
              <div>SAR Radar: {subs.payload.sensorHealth.syntheticApertureRadar ? 'NOMINAL' : 'OFFLINE'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: OBC COMPUTER */}
      {activeTab === 'obc' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">CPU Core Load</span>
            <div className="text-2xl font-orbitron font-bold text-slate-100 mt-1">{subs.obc.cpuLoad}%</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">RAM Memory Allocation</span>
            <div className="text-2xl font-orbitron font-bold text-cyan-300 mt-1">{subs.obc.memoryUsage}%</div>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-cyan-500/20">
            <span className="text-[10px] font-mono-hud text-slate-400 uppercase">Flight Software Version</span>
            <div className="text-lg font-orbitron font-bold text-emerald-400 mt-1">{subs.obc.softwareVersion}</div>
          </div>
        </div>
      )}
    </div>
  );
};
