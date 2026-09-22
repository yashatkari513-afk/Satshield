import React from 'react';
import { AlertTriangle, Radio, ShieldAlert, ChevronRight } from 'lucide-react';
import { useSimulation, AnomalyAlert } from '../../context/SimulationContext';

interface ActiveAlertsPanelProps {
  onViewAll: () => void;
  onSelectSatellite: (satId: string) => void;
}

const SATELLITE_BORDER_COLORS: Record<string, string> = {
  'SAT-001': '#00BFFF', // AGIS-3: Electric Cyan
  'SAT-002': '#EF4444', // SENTINEL-9: Crimson Red
  'SAT-003': '#8B5CF6', // ORBCOM-7: Royal Violet / Purple
  'SAT-004': '#F59E0B', // HELIOS-1: Solar Gold / Amber
};

export const ActiveAlertsPanel: React.FC<ActiveAlertsPanelProps> = ({
  onViewAll,
  onSelectSatellite,
}) => {
  const {
    openAlertModal,
    setActiveSatelliteId,
    simulationStep,
    satellitesData,
  } = useSimulation();

  const sentinelSat = satellitesData['SAT-002'] || satellitesData[Object.keys(satellitesData)[0]] || {
    telemetry: { battery: 36, temperature: 59.8, voltageStatus: 'Below Safe Threshold (21.3V)' }
  };
  const isSimActive = simulationStep >= 3;

  const ALERTS_LIST: AnomalyAlert[] = [
    {
      id: 'ALT-4301',
      satId: 'SAT-002',
      satName: 'SENTINEL-9',
      subsystem: 'BATTERY',
      severity: isSimActive ? 'CRITICAL' : 'CRITICAL',
      title: 'SENTINEL-9 • Battery Anomaly',
      desc: isSimActive ? 'Critical thermal runaway and cell undervoltage' : 'Battery voltage dropping below threshold',
      time: 'Just now',
      currentBattery: sentinelSat.telemetry.battery,
      temperature: sentinelSat.telemetry.temperature,
      voltageStr: sentinelSat.telemetry.voltageStatus,
      aiConfidence: 96.2,
      predictedRisk: 'HIGH',
      estimatedTimeToCritical: '~18 HOURS',
      recommendedAction: 'Switch to power-saving mode and inspect the battery subsystem.',
    },
    {
      id: 'ALT-4302',
      satId: 'SAT-004',
      satName: 'HELIOS-1',
      subsystem: 'THERMAL',
      severity: 'WARNING',
      title: 'HELIOS-1 • High Temperature',
      desc: 'Payload temperature above nominal range (42.6°C)',
      time: '8m ago',
      currentBattery: 72,
      temperature: 42.6,
      voltageStr: 'Nominal (27.2V)',
      aiConfidence: 89.4,
      predictedRisk: 'MODERATE',
      estimatedTimeToCritical: '~48 HOURS',
      recommendedAction: 'Reorient solar radiators away from solar vector.',
    },
    {
      id: 'ALT-4303',
      satId: 'SAT-003',
      satName: 'ORBCOM-7',
      subsystem: 'COMM',
      severity: 'INFO',
      title: 'ORBCOM-7 • Ground Pass',
      desc: 'Next Madrid ground pass AOS in 12 minutes',
      time: '12m ago',
      currentBattery: 92,
      temperature: 22.1,
      voltageStr: 'Normal (28.8V)',
      aiConfidence: 99.1,
      predictedRisk: 'LOW',
      estimatedTimeToCritical: 'N/A',
      recommendedAction: 'Lock high-gain antenna azimuth to 44.8°.',
    },
    {
      id: 'ALT-4304',
      satId: 'SAT-001',
      satName: 'AGIS-3',
      subsystem: 'AOCS',
      severity: 'INFO',
      title: 'AGIS-3 • Mode Transition',
      desc: 'Entering safe mode for reaction wheel calibration',
      time: '18m ago',
      currentBattery: 88,
      temperature: 28.4,
      voltageStr: 'Normal (28.6V)',
      aiConfidence: 98.7,
      predictedRisk: 'LOW',
      estimatedTimeToCritical: 'N/A',
      recommendedAction: 'Verify gyro telemetry stability after maneuver.',
    },
  ];

  const handleAlertClick = (alert: AnomalyAlert) => {
    setActiveSatelliteId(alert.satId);
    onSelectSatellite(alert.satId);
    openAlertModal(alert);
  };

  return (
    <div
      className="rounded-xl p-4 select-none relative overflow-hidden flex flex-col justify-between h-full"
      style={{
        background: '#000000',
        border: '1px solid rgba(255, 255, 255, 0.35)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
          <h3 className="font-sans font-bold text-[13px] text-[#F1F5F9] uppercase tracking-wider">
            ACTIVE ALERTS
          </h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="font-sans text-[11px] font-bold text-[#00BFFF] hover:underline cursor-pointer uppercase tracking-wider"
        >
          VIEW ALL (23)
        </button>
      </div>

      {/* ── 4 ALERT ROWS ── */}
      <div className="flex flex-col gap-2.5 py-1 flex-1 justify-between">
        {ALERTS_LIST.map((alert) => {
          const isCrit = alert.severity === 'CRITICAL';
          const isWarn = alert.severity === 'WARNING';
          const isSelectedTarget = alert.satId === 'SAT-002' && isSimActive;
          const satColor = SATELLITE_BORDER_COLORS[alert.satId] || '#00BFFF';

          return (
            <div
              key={alert.id}
              onClick={() => handleAlertClick(alert)}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer group ${
                isSelectedTarget
                  ? 'bg-[#EF4444]/15 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse'
                  : 'bg-[#080808] hover:bg-[#111111]'
              }`}
              style={{
                borderColor: isSelectedTarget ? '#EF4444' : `${satColor}55`,
                boxShadow: isSelectedTarget
                  ? '0 0 15px rgba(239,68,68,0.35)'
                  : `0 0 8px ${satColor}15`,
              }}
            >
              {/* Icon Container */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isCrit
                    ? 'bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444]'
                    : isWarn
                    ? 'bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B]'
                    : 'bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF]'
                }`}
              >
                {isCrit ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <Radio className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Alert Content */}
              <div className="flex-1 min-w-0 font-sans">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="font-bold text-[12px] tracking-wide transition-colors truncate"
                      style={{ color: satColor }}
                    >
                      {alert.satName}
                    </span>
                    <span className="text-white/20 text-[10px]">•</span>
                    <span className="text-[10px] font-semibold text-[#94A3B8] truncate">
                      {alert.subsystem}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase ${
                        isCrit
                          ? 'bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444]'
                          : isWarn
                          ? 'bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B]'
                          : 'bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#00BFFF]'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="font-mono text-[9px] text-[#94A3B8] font-medium">
                      {alert.time}
                    </span>
                  </div>
                </div>

                <div className="text-[10.5px] text-[#94A3B8] truncate mt-0.5 font-medium flex items-center justify-between">
                  <span className="truncate group-hover:text-slate-200 transition-colors">{alert.desc}</span>
                  <span
                    className="text-[9.5px] font-bold shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5"
                    style={{ color: satColor }}
                  >
                    <span>INSPECT</span>
                    <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── FOOTER HINT FOR PRESENTER ── */}
      <div className="pt-2 border-t border-white/[0.08] text-[9.5px] text-[#94A3B8] flex items-center justify-between">
        <span>Click alert row to inspect AI telemetry diagnosis</span>
        <span className="font-mono text-[#22C55E]">CCSDS FAULT BUS</span>
      </div>
    </div>
  );
};

