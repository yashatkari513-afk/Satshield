import React, { useState } from 'react';
import { X, Satellite as SatelliteIcon, Upload, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { useTelemetry } from '../../context/TelemetryContext';
import { uploadTelemetryFile } from '../../services/SatelliteService';

interface AddSatelliteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_OPERATORS = ['ISRO', 'NASA', 'ESA', 'JAXA', 'CNES', 'Commercial Operator'];
const DEFAULT_ORBITS = ['LEO', 'GEO', 'MEO', 'SSO', 'Other'];
const DEFAULT_SOURCES = ['Demo Simulation', 'CSV Upload', 'JSON Upload', 'Live API'];

export const AddSatelliteModal: React.FC<AddSatelliteModalProps> = ({ isOpen, onClose }) => {
  const { addNewSatellite, satellitesData } = useSimulation();
  const { addSatelliteToTelemetry } = useTelemetry();

  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [operator, setOperator] = useState('ISRO');
  const [mission, setMission] = useState('Earth Observation');
  const [orbitType, setOrbitType] = useState('GEO');
  const [launchDate, setLaunchDate] = useState('2026-09-12');
  const [groundStation, setGroundStation] = useState('GS-Bangalore');
  const [telemetrySource, setTelemetrySource] = useState('Demo Simulation');
  
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File exceeds 5MB maximum size limit.');
      return;
    }

    const isCsv = file.name.endsWith('.csv');
    const isJson = file.name.endsWith('.json');
    if (!isCsv && !isJson) {
      setErrorMsg('Invalid file format. Please upload a .csv or .json file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      setFileName(file.name);
      setTelemetrySource(isCsv ? 'CSV Upload' : 'JSON Upload');
      setErrorMsg(null);
    };
    reader.readAsText(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    const cleanId = id.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanName) {
      setErrorMsg('Satellite Name is required.');
      return;
    }
    if (!cleanId) {
      setErrorMsg('Satellite ID is required (e.g. SAT-005).');
      return;
    }
    if (satellitesData[cleanId]) {
      setErrorMsg(`Satellite ID '${cleanId}' already exists. Please choose a unique ID.`);
      return;
    }
    if (Object.values(satellitesData).some((s) => s.name.toUpperCase() === cleanName.toUpperCase())) {
      setErrorMsg(`A satellite named '${cleanName}' is already registered in the fleet.`);
      return;
    }

    setLoading(true);

    try {
      const created = await addNewSatellite({
        id: cleanId,
        name: cleanName,
        operator,
        mission,
        orbit_type: orbitType,
        ground_station: groundStation,
        launch_date: launchDate,
        telemetry_source: telemetrySource,
      });

      // Synchronize 3D / 7-subsystem telemetry structure
      addSatelliteToTelemetry({
        id: cleanId,
        name: cleanName,
        noradId: created.norad_id || 52000,
        callsign: created.callsign || `${cleanName.slice(0, 2)}-${cleanId.slice(-2)}`,
        orbitType: orbitType as any,
        overallHealth: 95,
        healthStatus: 'nominal',
        position: { x: orbitType === 'GEO' ? 7.0 : 4.0, y: 1.0, z: 0.5 },
        orbitRadius: orbitType === 'GEO' ? 7.2 : 4.8,
        orbitSpeed: orbitType === 'GEO' ? 0.003 : 0.008,
        orbitAngle: 0.5,
        inclination: orbitType === 'GEO' ? 0.1 : 51.6,
        subsystems: {
          power: {
            status: 'nominal',
            batteryCharge: 92,
            batteryVoltage: 28.5,
            batteryTemp: 21.0,
            solarOutput: orbitType === 'GEO' ? 820 : 540,
            solarAngle: 8.0,
            solarEfficiency: 95.0,
            cycleCount: 120,
            current: 18.2,
            powerConsumption: 480,
            powerDrawBreakdown: { aocs: 80, comm: 140, payload: 200, obc: 35, thermal: 25 },
            history: Array.from({ length: 15 }, (_, i) => ({
              time: `${i * 2}m ago`,
              batteryCharge: 92,
              solarOutput: 540,
              batteryVoltage: 28.5,
              temp: 21,
              current: 18,
              powerDraw: 480,
            })),
          },
          thermal: {
            status: 'nominal',
            internalTemp: 22.4,
            externalTemp: -35.0,
            payloadTemp: 24.1,
            avionicsTemp: 23.5,
            heaterActive: false,
            radiatorStatus: 'Nominal',
            history: Array.from({ length: 15 }, (_, i) => ({ time: `${i * 2}m ago`, internal: 22.4, external: -35, payload: 24.1 })),
          },
          aocs: {
            status: 'nominal',
            pitch: 0.2,
            yaw: -0.1,
            roll: 0.0,
            rxWheelSpeedX: 2200,
            rxWheelSpeedY: -2100,
            rxWheelSpeedZ: 1950,
            gyroStatus: 'OK',
            starTrackerStatus: 'Locked',
            altitude: orbitType === 'GEO' ? 35786 : 500,
            inclination: orbitType === 'GEO' ? 0.1 : 51.6,
            eccentricity: 0.0002,
            periodMinutes: orbitType === 'GEO' ? 1436 : 94.2,
            groundStationPassCountdown: 180,
          },
          comm: {
            status: 'nominal',
            signalStrength: -72,
            snr: 28.0,
            uplinkRate: 15.0,
            downlinkRate: 300.0,
            antennaPointing: 'Optimal',
            contactWindowCountdown: 180,
            packetLoss: 0.01,
            bitErrorRate: 1e-8,
          },
          propulsion: {
            status: 'nominal',
            fuelLevel: 98.0,
            thrusterActive: false,
            lastFiring: 'None',
            deltaVRemaining: 210.0,
            chamberPressure: 0.0,
          },
          payload: {
            status: 'nominal',
            operationalState: 'Active Imaging',
            dataStorageUsed: 12.0,
            solidStateDriveGB: 1024,
            sensorHealth: { opticalSensor: true, syntheticApertureRadar: true, multispectralCamera: true },
          },
          obc: {
            status: 'nominal',
            cpuLoad: 22.0,
            memoryUsage: 32.0,
            uptimeSeconds: 1200,
            rebootCount: 0,
            softwareVersion: 'v4.2.0-SATSHIELD',
            watchdogState: 'Armed',
            lastCommand: 'TELEMETRY_STREAM_INIT',
            logs: [],
          },
        },
        aiAnomaly: {
          detectedAnomaly: 'NO ANOMALY DETECTED',
          severity: 'LOW',
          confidence: 99,
          detectedTimestamp: '00:00:00 UTC',
          description: 'All subsystems operating within calibrated nominal envelope.',
        },
        aiPrediction: {
          potentialIssue: 'SYSTEM NOMINAL',
          probability: 2,
          estimatedTimeDays: 180,
          recommendedAction: 'Maintain current stationkeeping schedule and solar array tracking.',
        },
      });

      if (fileContent) {
        try {
          await uploadTelemetryFile(cleanId, fileName?.endsWith('.csv') ? 'csv' : 'json', fileContent);
        } catch (uploadErr) {
          console.warn('[AddSatelliteModal] Telemetry file upload fallback:', uploadErr);
        }
      }

      setSuccessMsg(`Satellite ${cleanName} (${cleanId}) registered successfully and added to active fleet tracking.`);
      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register satellite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none font-sans">
      <div
        className="w-full max-w-xl max-h-[90vh] rounded-2xl p-6 overflow-y-auto custom-scrollbar shadow-2xl flex flex-col justify-between"
        style={{
          background: '#000000',
          border: '1px solid rgba(0, 191, 255, 0.4)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 25px rgba(0, 191, 255, 0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#080808] border border-cyan-500/40 text-[#00BFFF] flex items-center justify-center shadow-[0_0_10px_rgba(0,191,255,0.25)]">
              <SatelliteIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-[#F1F5F9]">
                REGISTER NEW SATELLITE ASSET
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                Add custom spacecraft to SATSHIELD autonomous fleet monitoring and AI defense.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          {/* Row 1: Name & ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
                Satellite Name <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. INSAT-X"
                required
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF]"
              />
            </div>
            <div>
              <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
                Satellite ID <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value.toUpperCase())}
                placeholder="e.g. SAT-005"
                required
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#00BFFF] font-mono font-bold placeholder:text-[#64748B] focus:outline-none focus:border-[#00BFFF] focus:ring-1 focus:ring-[#00BFFF]"
              />
            </div>
          </div>

          {/* Row 2: Operator & Mission */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
                Operator / Organization
              </label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#F1F5F9] focus:outline-none focus:border-[#00BFFF] cursor-pointer"
              >
                {DEFAULT_OPERATORS.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
                Mission / Purpose
              </label>
              <input
                type="text"
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="e.g. Earth Observation / Remote Sensing"
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00BFFF]"
              />
            </div>
          </div>

          {/* Row 3: Orbit & Ground Station */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
                Orbit Regime
              </label>
              <select
                value={orbitType}
                onChange={(e) => setOrbitType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#F1F5F9] focus:outline-none focus:border-[#00BFFF] cursor-pointer"
              >
                {DEFAULT_ORBITS.map((orb) => (
                  <option key={orb} value={orb}>{orb}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
                Primary Ground Station
              </label>
              <input
                type="text"
                value={groundStation}
                onChange={(e) => setGroundStation(e.target.value)}
                placeholder="e.g. GS-Bangalore"
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#00BFFF]"
              />
            </div>
          </div>

          {/* Row 4: Launch Date & Telemetry Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
                Launch Date
              </label>
              <input
                type="date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#F1F5F9] focus:outline-none focus:border-[#00BFFF] cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10.5px] uppercase font-bold text-[#94A3B8] mb-1">
                Telemetry Ingestion Mode
              </label>
              <select
                value={telemetrySource}
                onChange={(e) => setTelemetrySource(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#080808] border border-white/20 text-[#F1F5F9] focus:outline-none focus:border-[#00BFFF] cursor-pointer"
              >
                {DEFAULT_SOURCES.map((src) => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Telemetry File Upload Section (Optional for CSV/JSON) */}
          {(telemetrySource === 'CSV Upload' || telemetrySource === 'JSON Upload') && (
            <div className="p-3 rounded-xl bg-[#080808] border border-dashed border-cyan-500/40 text-center space-y-1">
              <Upload className="w-5 h-5 text-[#00BFFF] mx-auto" />
              <div className="text-[11px] font-bold text-[#F1F5F9]">
                {fileName ? `Loaded: ${fileName}` : 'Upload Initial Telemetry Package (.csv or .json)'}
              </div>
              <p className="text-[10px] text-[#94A3B8]">
                Supports CCSDS telemetry parameters: Battery, Bus Voltage, Temperature, Power, SNR
              </p>
              <label className="inline-block mt-1 px-3 py-1 bg-white/10 hover:bg-white/20 text-[#F1F5F9] rounded text-[10px] font-bold uppercase cursor-pointer transition-colors">
                Browse Telemetry File
                <input type="file" accept=".csv,.json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#F1F5F9] text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,191,255,0.4)] cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>REGISTERING...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>SAVE & DEPLOY ASSET</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
