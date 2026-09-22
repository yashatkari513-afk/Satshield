import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import {
  BeforeAfterReportService,
  SatelliteHealthReport,
  BeforeAfterReportsResponse,
} from '../../services/BeforeAfterReportService';

interface BeforeAfterReportsSectionProps {
  className?: string;
  satelliteId?: string;
}

export const BeforeAfterReportsSection: React.FC<BeforeAfterReportsSectionProps> = ({
  className = '',
  satelliteId,
}) => {
  const {
    activeSatelliteId,
    satellitesData,
    currentDiagnosis,
    simulationStep,
    isSimulating,
  } = useSimulation();

  const targetSatId = satelliteId || activeSatelliteId || 'SAT-001';
  const currentSat = satellitesData[targetSatId] || satellitesData['SAT-001'] || {
    name: 'AGIS-3',
    id: targetSatId,
    status: 'NOMINAL',
    telemetry: { temperature: 24.5, voltage: 28.5, battery: 90, power: 650, signalStrength: 95 },
  };

  const [reportsData, setReportsData] = useState<BeforeAfterReportsResponse | null>(null);
  const [selectedReportModal, setSelectedReportModal] = useState<SatelliteHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch reports whenever satellite changes or simulation advances
  const refreshReports = React.useCallback(async () => {
    try {
      const data = await BeforeAfterReportService.getReports(currentSat.id);
      setReportsData(data);
    } catch (err) {
      console.warn('Failed to fetch before/after reports:', err);
    }
  }, [currentSat.id]);

  useEffect(() => {
    refreshReports();
  }, [targetSatId, currentSat.id, simulationStep, currentDiagnosis, refreshReports]);

  // Auto-capture BEFORE report if not yet captured and satellite is in healthy baseline
  useEffect(() => {
    if (currentSat && currentSat.status === 'NOMINAL' && !isSimulating) {
      BeforeAfterReportService.captureBefore(
        currentSat.id,
        currentSat.telemetry,
        currentSat.telemetry?.healthScore || 95,
        'NOMINAL',
        'NORMAL',
        0.08
      ).then(() => {
        refreshReports();
      });
    }
  }, [currentSat.id, currentSat.status, isSimulating, refreshReports]);

  // Auto-capture AFTER report when Step 6 or diagnosis is ready
  useEffect(() => {
    if ((simulationStep === 6 || currentDiagnosis) && currentSat) {
      BeforeAfterReportService.captureAfter(
        currentSat.id,
        currentSat.telemetry,
        currentDiagnosis
      ).then(() => {
        refreshReports();
      });
    }
  }, [simulationStep, currentDiagnosis, currentSat.id, refreshReports]);

  const handleCaptureBaselineNow = async () => {
    setIsLoading(true);
    await BeforeAfterReportService.captureBefore(
      currentSat.id,
      currentSat.telemetry,
      currentSat.telemetry?.healthScore || 95,
      currentSat.status === 'CRITICAL' ? 'CRITICAL' : currentSat.status === 'WARNING' ? 'HIGH' : 'NOMINAL',
      currentSat.status === 'NOMINAL' ? 'NORMAL' : 'ANOMALY',
      currentSat.status === 'NOMINAL' ? 0.08 : -0.12
    );
    await refreshReports();
    setIsLoading(false);
  };

  const handleResetReports = async () => {
    setIsLoading(true);
    await BeforeAfterReportService.resetReports(currentSat.id);
    await refreshReports();
    setIsLoading(false);
  };

  const beforeReport = reportsData?.before_report;
  const afterReport = reportsData?.after_report;
  const comparison = reportsData?.comparison;

  return (
    <div
      className={`rounded-xl p-4 font-sans text-xs space-y-4 bg-black border border-white/15 relative overflow-hidden ${className}`}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* ── SECTION HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/30 flex items-center justify-center text-[#00BFFF]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                SATELLITE HEALTH REPORTS (BEFORE vs AFTER)
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                STEP 28 ACTIVE
              </span>
            </div>
            <p className="text-[10.5px] text-[#94A3B8]">
              Target Spacecraft: <span className="text-[#00BFFF] font-bold">{currentSat.name}</span> ({currentSat.id}) · Baseline vs Post-Anomaly Diagnostic Reports
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCaptureBaselineNow}
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-[10.5px] font-mono font-bold text-white uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Capture current telemetry as healthy baseline"
          >
            <Sparkles className="w-3 h-3 text-[#00BFFF]" />
            <span>CAPTURE BASELINE</span>
          </button>
          <button
            type="button"
            onClick={handleResetReports}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15 transition-colors cursor-pointer"
            title="Reset reports for this satellite"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── TWO SEPARATE REPORT CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* 1. BEFORE REPORT CARD */}
        <div
          className="rounded-xl p-3.5 flex flex-col justify-between border transition-all"
          style={{
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(0, 0, 0, 0.8) 100%)',
            borderColor: beforeReport ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
                <h3 className="font-black text-xs uppercase tracking-wider text-white">
                  BEFORE REPORT
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                BASELINE / HEALTHY
              </span>
            </div>

            {beforeReport ? (
              <div className="space-y-2 text-[11px] font-mono">
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Captured Timestamp:</span>
                  <span className="text-white font-bold">{beforeReport.timestamp}</span>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Operational State:</span>
                  <span className="text-emerald-400 font-bold">{beforeReport.health_state}</span>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Operational Risk:</span>
                  <span className="text-emerald-400 font-bold">{beforeReport.risk_level}</span>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Overall Health Score:</span>
                  <span className="text-white font-bold">{beforeReport.health_score}%</span>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Core Internal Temp:</span>
                  <span className="text-white font-bold">{beforeReport.telemetry.temperature} °C</span>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>EPS Bus Voltage:</span>
                  <span className="text-white font-bold">{beforeReport.telemetry.voltage} V</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[#64748B] font-mono text-[10.5px]">
                No baseline snapshot captured yet.
                <p className="text-[9.5px] mt-1 text-[#475569]">Click "CAPTURE BASELINE" above to record nominal state.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10 mt-3">
            <button
              type="button"
              disabled={!beforeReport}
              onClick={() => setSelectedReportModal(beforeReport)}
              className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3 h-3 text-[#00BFFF]" />
              <span>VIEW REPORT</span>
            </button>
            <button
              type="button"
              disabled={!beforeReport}
              onClick={() => beforeReport && BeforeAfterReportService.exportCSV(beforeReport)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-30 flex items-center gap-1 cursor-pointer"
              title="Download Baseline Report CSV"
            >
              <Download className="w-3 h-3" />
              <span>DOWNLOAD</span>
            </button>
          </div>
        </div>

        {/* 2. AFTER REPORT CARD */}
        <div
          className="rounded-xl p-3.5 flex flex-col justify-between border transition-all"
          style={{
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, rgba(0, 0, 0, 0.8) 100%)',
            borderColor: afterReport ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#EF4444]" />
                <h3 className="font-black text-xs uppercase tracking-wider text-white">
                  AFTER REPORT
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/30">
                POST-ANOMALY / DIAGNOSED
              </span>
            </div>

            {afterReport ? (
              <div className="space-y-2 text-[11px] font-mono">
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Diagnosed Timestamp:</span>
                  <span className="text-white font-bold">{afterReport.timestamp}</span>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Detected Anomaly:</span>
                  <span className="text-red-400 font-bold truncate max-w-[200px]" title={afterReport.detected_anomaly || ''}>
                    {afterReport.detected_anomaly || 'Anomaly Detected'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Operational Risk:</span>
                  <span className="text-red-400 font-bold">{afterReport.risk_level}</span>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Overall Health Score:</span>
                  <span className="text-red-400 font-bold">{afterReport.health_score}%</span>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>IsolationForest Score:</span>
                  <span className="text-red-400 font-bold">{afterReport.raw_anomaly_score?.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between text-[#94A3B8]">
                  <span>Time to Threshold (ETT):</span>
                  <span className="text-[#38BDF8] font-bold">{afterReport.estimated_time_to_threshold}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-[#64748B] font-mono text-[10.5px]">
                No post-anomaly snapshot recorded yet.
                <p className="text-[9.5px] mt-1 text-[#475569]">Run a 6-step anomaly simulation to generate the AFTER report.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10 mt-3">
            <button
              type="button"
              disabled={!afterReport}
              onClick={() => setSelectedReportModal(afterReport)}
              className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3 h-3 text-[#00BFFF]" />
              <span>VIEW REPORT</span>
            </button>
            <button
              type="button"
              disabled={!afterReport}
              onClick={() => afterReport && BeforeAfterReportService.exportCSV(afterReport)}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-[10px] font-mono uppercase tracking-wider transition-all disabled:opacity-30 flex items-center gap-1 cursor-pointer"
              title="Download Post-Anomaly Report CSV"
            >
              <Download className="w-3 h-3" />
              <span>DOWNLOAD</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── BEFORE vs AFTER COMPARISON TABLE ── */}
      {comparison && comparison.status === 'COMPLETE' && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00BFFF]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                BEFORE vs AFTER — SATELLITE HEALTH CHANGE
              </h3>
            </div>
            <span className="text-[9.5px] font-mono text-[#94A3B8]">
              {comparison.significant_change_count} Significant Change(s) Detected
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/60">
            <table className="w-full text-left font-mono text-[10.5px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[#94A3B8]">
                  <th className="py-2 px-3 font-bold uppercase">Parameter</th>
                  <th className="py-2 px-3 font-bold uppercase">Before (Baseline)</th>
                  <th className="py-2 px-3 font-bold uppercase">After (Post-Anomaly)</th>
                  <th className="py-2 px-3 font-bold uppercase">Change (Δ)</th>
                  <th className="py-2 px-3 font-bold uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {comparison.parameter_comparisons.map((row) => {
                  const isDegrading = row.status === 'DEGRADING' || row.status === 'CRITICAL DROP' || row.status === 'OUTLIER ESCALATION';
                  const isStable = row.status === 'STABLE' || row.status === 'NOMINAL';

                  return (
                    <tr key={row.parameter_key} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-3 text-[#F1F5F9] font-bold">{row.parameter_name}</td>
                      <td className="py-2 px-3 text-[#94A3B8]">
                        {row.before_value !== null ? `${row.before_value} ${row.unit}` : 'N/A'}
                      </td>
                      <td className="py-2 px-3 text-white font-bold">
                        {row.after_value !== null ? `${row.after_value} ${row.unit}` : 'N/A'}
                      </td>
                      <td
                        className={`py-2 px-3 font-bold ${
                          isDegrading ? 'text-red-400' : isStable ? 'text-emerald-400' : 'text-[#38BDF8]'
                        }`}
                      >
                        {row.delta_formatted}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            isDegrading
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Key Health Changes Summary */}
          {comparison.key_health_changes.length > 0 && (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-[#38BDF8] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                KEY HEALTH CHANGES IDENTIFIED:
              </span>
              <ul className="space-y-1 pl-4 list-disc text-[10.5px] text-[#CBD5E1] font-sans">
                {comparison.key_health_changes.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── FULL REPORT VIEWER MODAL ── */}
      {selectedReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn font-sans select-none">
          <div
            className="w-full max-w-2xl rounded-2xl p-5 shadow-2xl flex flex-col justify-between max-h-[90vh] overflow-y-auto custom-scrollbar bg-black border border-white/20"
            style={{
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    selectedReportModal.report_type === 'BEFORE'
                      ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/40 text-red-400'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    {selectedReportModal.label} — {selectedReportModal.satellite_name}
                  </h3>
                  <p className="text-[10.5px] text-[#94A3B8]">
                    Generated at {selectedReportModal.timestamp} · Satellite ID: {selectedReportModal.satellite_id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReportModal(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-3.5 text-xs text-[#E2E8F0] font-sans">
              {/* Status Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                <div className="p-2 rounded bg-white/[0.03] border border-white/10">
                  <span className="text-[#64748B] block text-[9px]">HEALTH SCORE</span>
                  <span className="text-white font-bold text-xs">{selectedReportModal.health_score}%</span>
                </div>
                <div className="p-2 rounded bg-white/[0.03] border border-white/10">
                  <span className="text-[#64748B] block text-[9px]">RISK LEVEL</span>
                  <span
                    className={`font-bold text-xs ${
                      selectedReportModal.risk_level === 'CRITICAL'
                        ? 'text-red-400'
                        : selectedReportModal.risk_level === 'HIGH'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {selectedReportModal.risk_level}
                  </span>
                </div>
                <div className="p-2 rounded bg-white/[0.03] border border-white/10">
                  <span className="text-[#64748B] block text-[9px]">ML STATUS</span>
                  <span className="text-white font-bold text-xs">{selectedReportModal.anomaly_status}</span>
                </div>
                <div className="p-2 rounded bg-white/[0.03] border border-white/10">
                  <span className="text-[#64748B] block text-[9px]">ISOLATION SCORE</span>
                  <span className="text-[#38BDF8] font-bold text-xs">{selectedReportModal.raw_anomaly_score?.toFixed(4)}</span>
                </div>
              </div>

              {/* Telemetry Snapshot Grid */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase text-[#94A3B8]">Telemetry Channels</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                  <div className="p-2 rounded bg-black/60 border border-white/5">
                    <span className="text-[#64748B] block text-[8.5px]">TEMPERATURE</span>
                    <span className="text-white font-bold">{selectedReportModal.telemetry.temperature} °C</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/5">
                    <span className="text-[#64748B] block text-[8.5px]">BUS VOLTAGE</span>
                    <span className="text-white font-bold">{selectedReportModal.telemetry.voltage} V</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/5">
                    <span className="text-[#64748B] block text-[8.5px]">BUS CURRENT</span>
                    <span className="text-white font-bold">{selectedReportModal.telemetry.current} A</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/5">
                    <span className="text-[#64748B] block text-[8.5px]">BATTERY SOC</span>
                    <span className="text-white font-bold">{selectedReportModal.telemetry.battery} %</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/5">
                    <span className="text-[#64748B] block text-[8.5px]">SOLAR POWER</span>
                    <span className="text-white font-bold">{selectedReportModal.telemetry.solar_power} W</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/5">
                    <span className="text-[#64748B] block text-[8.5px]">RF SIGNAL</span>
                    <span className="text-white font-bold">{selectedReportModal.telemetry.signal_strength} dBm</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/5">
                    <span className="text-[#64748B] block text-[8.5px]">POINTING ERROR</span>
                    <span className="text-white font-bold">{selectedReportModal.telemetry.attitude_error} °</span>
                  </div>
                  <div className="p-2 rounded bg-black/60 border border-white/5">
                    <span className="text-[#64748B] block text-[8.5px]">VIBRATION</span>
                    <span className="text-white font-bold">{selectedReportModal.telemetry.vibration} g</span>
                  </div>
                </div>
              </div>

              {/* Root Cause & Mission Impact */}
              <div className="space-y-2 border-t border-white/10 pt-2.5">
                <div>
                  <span className="font-bold text-[#38BDF8] block text-[11px]">Probable Root Cause:</span>
                  <p className="text-[11px] text-[#CBD5E1] mt-0.5">{selectedReportModal.probable_root_cause}</p>
                </div>
                <div>
                  <span className="font-bold text-purple-400 block text-[11px]">Mission Impact:</span>
                  <p className="text-[11px] text-[#CBD5E1] mt-0.5">{selectedReportModal.mission_impact}</p>
                </div>
                <div>
                  <span className="font-bold text-emerald-400 block text-[11px]">Recommended Operator Action:</span>
                  <p className="text-[11px] text-[#CBD5E1] mt-0.5">{selectedReportModal.recommended_action}</p>
                </div>
              </div>

              {/* Scientific Disclosure */}
              <div className="p-2.5 rounded bg-white/[0.02] border border-white/5 text-[9.5px] font-mono text-[#64748B]">
                <span className="font-bold text-[#94A3B8] block mb-0.5">SCIENTIFIC DISCLOSURE:</span>
                {selectedReportModal.disclaimer}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-4">
              <button
                type="button"
                onClick={() => BeforeAfterReportService.exportCSV(selectedReportModal)}
                className="px-3.5 py-1.5 rounded-lg bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,191,255,0.3)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReportModal(null)}
                className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono uppercase cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
