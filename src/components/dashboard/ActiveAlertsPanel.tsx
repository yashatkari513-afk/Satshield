import React, { useMemo } from 'react';
import { AlertTriangle, Radio, ShieldAlert, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useSimulation, AnomalyAlert } from '../../context/SimulationContext';
import { DynamicAlertService, DynamicAlert } from '../../services/DynamicAlertService';

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
    activeSatelliteId,
    simulationStep,
    satellitesData,
    latestMLResult,
    currentDiagnosis,
  } = useSimulation();

  // Dynamically generate alerts for all satellites across the fleet
  const allActiveAlerts = useMemo(() => {
    const list: DynamicAlert[] = [];
    Object.keys(satellitesData).forEach((satId) => {
      const sat = satellitesData[satId];
      if (sat && sat.telemetry) {
        const isCurrentActive = satId === activeSatelliteId;
        const satAlerts = DynamicAlertService.generateAlerts(
          satId,
          sat.telemetry,
          isCurrentActive ? latestMLResult : undefined,
          isCurrentActive ? currentDiagnosis : undefined,
          isCurrentActive ? simulationStep : 0
        );
        // Only include active (non-resolved) alerts
        satAlerts.filter((a) => !a.resolved).forEach((a) => list.push(a));
      }
    });

    // Prioritize active satellite alerts first, then sort by severity (CRITICAL > WARNING > others)
    return list.sort((a, b) => {
      if (a.satellite_id === activeSatelliteId && b.satellite_id !== activeSatelliteId) return -1;
      if (b.satellite_id === activeSatelliteId && a.satellite_id !== activeSatelliteId) return 1;
      if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
      if (b.severity === 'CRITICAL' && a.severity !== 'CRITICAL') return 1;
      return 0;
    });
  }, [satellitesData, activeSatelliteId, latestMLResult, currentDiagnosis, simulationStep]);

  const activeCount = allActiveAlerts.length;
  const currentSat = satellitesData[activeSatelliteId] || satellitesData['SAT-001'];
  const activeSatName = currentSat?.name || activeSatelliteId;

  const handleAlertClick = (alert: DynamicAlert) => {
    setActiveSatelliteId(alert.satellite_id);
    onSelectSatellite(alert.satellite_id);

    const sat = satellitesData[alert.satellite_id] || satellitesData['SAT-001'];
    const anomalyAlert: AnomalyAlert = {
      id: alert.alert_id,
      satId: alert.satellite_id,
      satName: alert.satellite_name,
      subsystem: alert.subsystem,
      severity: alert.severity === 'CRITICAL' ? 'CRITICAL' : alert.severity === 'WARNING' ? 'WARNING' : 'INFO',
      title: alert.title,
      desc: alert.message,
      time: alert.timestamp,
      currentBattery: sat?.telemetry?.battery ?? 88,
      temperature: sat?.telemetry?.temperature ?? 24.5,
      voltageStr: sat?.telemetry?.voltageStatus ?? `${sat?.telemetry?.voltage ?? 28.5}V`,
      aiConfidence: 96.2,
      predictedRisk: alert.severity === 'CRITICAL' ? 'HIGH' : alert.severity === 'WARNING' ? 'MODERATE' : 'LOW',
      estimatedTimeToCritical: alert.severity === 'CRITICAL' ? '~18 HOURS' : 'N/A',
      recommendedAction: alert.message,
      acknowledged: alert.acknowledged,
    };

    openAlertModal(anomalyAlert);
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
          <ShieldAlert className={`w-4 h-4 ${activeCount > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'}`} />
          <h3 className="font-sans font-bold text-[13px] text-[#F1F5F9] uppercase tracking-wider">
            ACTIVE ALERTS
          </h3>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="font-sans text-[11px] font-bold text-[#00BFFF] hover:underline cursor-pointer uppercase tracking-wider"
        >
          VIEW ALL ({activeCount})
        </button>
      </div>

      {/* ── ALERTS CONTENT ── */}
      <div className="flex flex-col gap-2.5 py-1 flex-1 justify-center min-h-[180px]">
        {activeCount === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <div className="w-10 h-10 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
            </div>
            <span className="font-mono font-bold text-[12px] text-[#22C55E] uppercase tracking-wider">
              NO ACTIVE TELEMETRY ANOMALIES
            </span>
            <span className="text-[11px] text-[#94A3B8] mt-1 font-medium">
              Spacecraft fleet health is nominal • All sensors operating within threshold
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 justify-between h-full">
            {allActiveAlerts.slice(0, 4).map((alert) => {
              const isCrit = alert.severity === 'CRITICAL';
              const isWarn = alert.severity === 'WARNING';
              const isSelectedTarget = alert.satellite_id === activeSatelliteId;
              const satColor = SATELLITE_BORDER_COLORS[alert.satellite_id] || '#00BFFF';

              return (
                <div
                  key={alert.alert_id}
                  onClick={() => handleAlertClick(alert)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer group ${
                    isSelectedTarget && isCrit
                      ? 'bg-[#EF4444]/15 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse'
                      : isSelectedTarget
                      ? 'bg-[#111827] hover:bg-[#1f2937]'
                      : 'bg-[#080808] hover:bg-[#111111]'
                  }`}
                  style={{
                    borderColor: isSelectedTarget ? satColor : `${satColor}44`,
                    boxShadow: isSelectedTarget
                      ? `0 0 12px ${satColor}33`
                      : `0 0 6px ${satColor}10`,
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
                          {alert.satellite_name}
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
                          {alert.timestamp}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10.5px] text-[#94A3B8] truncate mt-0.5 font-medium flex items-center justify-between">
                      <span className="truncate group-hover:text-slate-200 transition-colors">{alert.message}</span>
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
        )}
      </div>

      {/* ── FOOTER HINT FOR PRESENTER ── */}
      <div className="pt-2 border-t border-white/[0.08] text-[9.5px] text-[#94A3B8] flex items-center justify-between">
        <span>
          Active: <strong className="text-[#F1F5F9]">{activeSatName}</strong> • Real-time telemetry feed
        </span>
        <span className="font-mono text-[#22C55E]">CCSDS FAULT BUS</span>
      </div>
    </div>
  );
};
