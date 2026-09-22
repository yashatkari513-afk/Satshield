import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { useSimulation } from '../context/SimulationContext';
import {
  LineChart as ChartIcon,
  Download,
  FileText,
  Calendar,
  Zap,
  Thermometer,
  Radio,
  Send,
  Eye,
  Plus,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { fetchReports, generateSatelliteReport, ApiReport } from '../services/SatelliteService';
import { generatePDFReport } from '../services/ReportService';
import { BeforeAfterReportsSection } from '../components/dashboard/BeforeAfterReportsSection';

export const HistoryPage: React.FC = () => {
  const { satellites, activeSatellite, alerts } = useTelemetry();
  const {
    openSendReportModal,
    activeSatelliteId,
    setActiveSatelliteId,
    satellitesData
  } = useSimulation();

  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedSatId, setSelectedSatId] = useState<string>(activeSatelliteId || activeSatellite.id || 'SAT-001');

  useEffect(() => {
    if (activeSatelliteId && activeSatelliteId !== selectedSatId) {
      setSelectedSatId(activeSatelliteId);
    }
  }, [activeSatelliteId]);
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'before_after' | 'reports' | 'telemetry_analytics'>('before_after');

  const currentSat = satellites.find((s) => s.id === selectedSatId) || activeSatellite;
  const subs = currentSat.subsystems;

  const loadReportsList = async () => {
    const list = await fetchReports();
    setReports(list);
  };

  useEffect(() => {
    loadReportsList();
  }, []);

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      await generateSatelliteReport(selectedSatId);
      await loadReportsList();
    } catch (err) {
      console.warn('Failed to generate report:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  // Generate historical comparison trend data based on selected time range
  const mockTrendData = Array.from({ length: 12 }, (_, idx) => {
    const label = timeRange === '1h' ? `${(idx + 1) * 5}m ago` : timeRange === '24h' ? `${idx * 2}h ago` : `${idx * 2}d ago`;
    return {
      time: label,
      battery: Math.min(100, Math.max(30, subs.power.batteryCharge + Math.sin(idx) * 8)),
      solarW: Math.max(100, subs.power.solarOutput + Math.cos(idx) * 40),
      temp: Number((subs.thermal.internalTemp + Math.sin(idx * 0.5) * 3).toFixed(1)),
      payloadTemp: Number((subs.thermal.payloadTemp + Math.cos(idx * 0.5) * 4).toFixed(1)),
      signal: Math.min(-60, Math.max(-110, subs.comm.signalStrength + Math.sin(idx) * 5)),
    };
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#020305] font-sans">
      {/* ── TOP HEADER (REPORT CENTER) ── */}
      <div
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl"
        style={{
          background: '#000000',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#111111] border border-white/20 text-[#00BFFF]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[#F1F5F9] uppercase tracking-wider">
                MISSION REPORT CENTER & ANALYTICS
              </h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-[#00BFFF] border border-cyan-500/30 text-[9.5px] font-mono font-bold">
                {reports.length} ARCHIVED REPORTS
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5 font-medium">
              Generate certified 9-section technical health reports, compare BEFORE vs AFTER telemetry states, and review audit archives.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={loadingReport}
            className="px-3.5 py-1.5 bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black font-black text-xs rounded-lg transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(0,191,255,0.4)] cursor-pointer uppercase"
          >
            {loadingReport ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>GENERATING...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>GENERATE REPORT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── TAB SELECTOR: BEFORE vs AFTER | REPORT CENTER TABLE | SENSOR TRENDS ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-2 sm:pb-1 gap-2.5 text-xs">
        <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('before_after')}
            className={`pb-1.5 font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'before_after'
                ? 'text-[#00BFFF] border-[#00BFFF]'
                : 'text-[#94A3B8] border-transparent hover:text-[#F1F5F9]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>BEFORE vs AFTER REPORTS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`pb-1.5 font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'text-[#00BFFF] border-[#00BFFF]'
                : 'text-[#94A3B8] border-transparent hover:text-[#F1F5F9]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>REPORT REPOSITORY ({reports.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('telemetry_analytics')}
            className={`pb-1.5 font-bold uppercase tracking-wider transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'telemetry_analytics'
                ? 'text-[#00BFFF] border-[#00BFFF]'
                : 'text-[#94A3B8] border-transparent hover:text-[#F1F5F9]'
            }`}
          >
            <ChartIcon className="w-3.5 h-3.5" />
            <span>SENSOR TRENDS</span>
          </button>
        </div>

        {/* Spacecraft Target Selector */}
        <div className="flex items-center gap-2 font-mono self-end sm:self-auto">
          <span className="text-[#94A3B8] uppercase font-bold text-[10.5px]">Spacecraft:</span>
          <select
            value={selectedSatId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSatId(val);
              setActiveSatelliteId(val);
            }}
            className="bg-[#0f172a] text-[#00BFFF] font-bold text-xs px-2.5 py-1 rounded-lg border border-white/20 focus:outline-none cursor-pointer"
          >
            {Object.values(satellitesData).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id}) • Health {s.telemetry?.healthScore || 95}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── VIEW 0: BEFORE vs AFTER SATELLITE HEALTH REPORTS ── */}
      {activeTab === 'before_after' && (
        <BeforeAfterReportsSection satelliteId={selectedSatId} />
      )}

      {/* ── VIEW 1: REPORT CENTER TABLE ── */}
      {activeTab === 'reports' && (
        <div
          className="rounded-xl p-4 space-y-3 font-sans"
          style={{
            background: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="font-bold text-xs text-[#F1F5F9] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              <span>Certified Mission Health Reports Repository</span>
            </h3>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              REAL-TIME ARCHIVE
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/15 text-[#94A3B8] font-mono text-[10.5px] uppercase">
                  <th className="py-2.5 px-3">Spacecraft</th>
                  <th className="py-2.5 px-3">Report Designation</th>
                  <th className="py-2.5 px-3">Health Score</th>
                  <th className="py-2.5 px-3">Risk Assessment</th>
                  <th className="py-2.5 px-3">Audit Date</th>
                  <th className="py-2.5 px-3">Dispatch Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map((rep) => {
                  const isSent = rep.status === 'SENT';
                  const isNom = rep.health_status === 'nominal' || rep.health_score >= 90;
                  const isCrit = rep.health_status === 'critical' || rep.health_score < 70;
                  const scoreColor = isNom ? '#22C55E' : isCrit ? '#EF4444' : '#F59E0B';

                  return (
                    <tr key={rep.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Spacecraft */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#F1F5F9]">{rep.satellite_name}</div>
                        <div className="text-[10px] font-mono text-[#00BFFF]">{rep.satellite_id}</div>
                      </td>

                      {/* Report Type */}
                      <td className="py-3 px-3 text-[#CBD5E1]">
                        <div className="font-semibold">{rep.report_type}</div>
                        <div className="text-[9.5px] text-[#94A3B8] truncate max-w-xs">{rep.summary || 'Comprehensive telemetry analysis'}</div>
                      </td>

                      {/* Health Score */}
                      <td className="py-3 px-3">
                        <span
                          className="font-mono font-bold text-xs px-2 py-0.5 rounded border"
                          style={{
                            color: scoreColor,
                            borderColor: `${scoreColor}40`,
                            backgroundColor: `${scoreColor}15`,
                          }}
                        >
                          {rep.health_score.toFixed(1)}% ({rep.health_status.toUpperCase()})
                        </span>
                      </td>

                      {/* Risk */}
                      <td className="py-3 px-3 font-mono">
                        <span className={`text-[10px] font-bold ${
                          rep.risk_level === 'HIGH' || rep.risk_level === 'CRITICAL' ? 'text-[#EF4444]' : rep.risk_level === 'MODERATE' ? 'text-[#F59E0B]' : 'text-[#22C55E]'
                        }`}>
                          {rep.risk_level || 'LOW'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 font-mono text-[11px] text-[#94A3B8]">
                        {rep.created_at}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 font-mono">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                          isSent
                            ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        }`}>
                          {isSent ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                          <span>{rep.status}</span>
                        </span>
                        {rep.recipient_email && (
                          <div className="text-[9px] text-[#94A3B8] truncate max-w-[140px] mt-0.5">
                            {rep.recipient_email}
                          </div>
                        )}
                      </td>

                      {/* Actions: VIEW | DOWNLOAD | SEND */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* VIEW (PDF in Tab) */}
                          <button
                            type="button"
                            onClick={() => generatePDFReport(currentSat, alerts, currentSat.name)}
                            className="px-2 py-1 rounded bg-[#111111] hover:bg-white/10 border border-white/20 text-[#F1F5F9] hover:text-[#00BFFF] text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
                            title="View Technical PDF Report"
                          >
                            <Eye className="w-3 h-3" />
                            <span>VIEW</span>
                          </button>

                          {/* DOWNLOAD */}
                          <button
                            type="button"
                            onClick={() => generatePDFReport(currentSat, alerts, currentSat.name)}
                            className="px-2 py-1 rounded bg-[#111111] hover:bg-white/10 border border-white/20 text-[#F1F5F9] hover:text-[#00BFFF] text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
                            title="Download PDF"
                          >
                            <Download className="w-3 h-3 text-[#00BFFF]" />
                            <span>PDF</span>
                          </button>

                          {/* SEND */}
                          <button
                            type="button"
                            onClick={() => openSendReportModal(rep.satellite_id)}
                            className="px-2.5 py-1 rounded bg-[#3B82F6]/20 hover:bg-[#3B82F6]/30 border border-[#3B82F6]/50 text-[#60A5FA] text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1"
                            title="Send Report via Backend Email"
                          >
                            <Send className="w-3 h-3" />
                            <span>SEND</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 2: HISTORICAL SENSOR CHARTS ── */}
      {activeTab === 'telemetry_analytics' && (
        <div className="space-y-4">
          {/* Time Horizon Selector */}
          <div
            className="p-3 rounded-xl flex items-center justify-between"
            style={{
              background: '#000000',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-mono">
              <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="text-[#94A3B8] uppercase font-bold text-[11px]">Time Horizon:</span>
              {(['1h', '24h', '7d', '30d'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg uppercase font-bold text-xs transition-all cursor-pointer ${
                    timeRange === range
                      ? 'bg-[#00BFFF] text-black font-black shadow-[0_0_10px_rgba(0,191,255,0.4)]'
                      : 'bg-[#111111] text-[#94A3B8] hover:text-white border border-white/15'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Graph 1: Power & Solar */}
            <div
              className="p-4 rounded-xl h-80 flex flex-col justify-between select-none"
              style={{
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-xs font-bold text-[#F1F5F9] uppercase flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#F59E0B]" /> Power Generation & Storage ({timeRange})
                </h4>
                <span className="text-[10px] font-mono text-[#94A3B8]">SOC % & Solar Watts</span>
              </div>

              <div className="flex-1 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis dataKey="time" stroke="#94A3B8" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis stroke="#94A3B8" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#000000', borderColor: 'rgba(255,255,255,0.35)', color: '#F1F5F9', fontSize: 11, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Area type="monotone" dataKey="battery" stroke="#00BFFF" fill="#00BFFF" fillOpacity={0.2} name="Battery SOC (%)" />
                    <Area type="monotone" dataKey="solarW" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} name="Solar Output (W)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graph 2: Thermal Sensor Profiles */}
            <div
              className="p-4 rounded-xl h-80 flex flex-col justify-between select-none"
              style={{
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-xs font-bold text-[#F1F5F9] uppercase flex items-center gap-2">
                  <Thermometer className="w-3.5 h-3.5 text-[#EF4444]" /> Component Thermal Sensors ({timeRange})
                </h4>
                <span className="text-[10px] font-mono text-[#94A3B8]">Temperatures in °C</span>
              </div>

              <div className="flex-1 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis dataKey="time" stroke="#94A3B8" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis stroke="#94A3B8" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#000000', borderColor: 'rgba(255,255,255,0.35)', color: '#F1F5F9', fontSize: 11, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Line type="monotone" dataKey="temp" stroke="#00BFFF" strokeWidth={2} name="Internal Avionics (°C)" />
                    <Line type="monotone" dataKey="payloadTemp" stroke="#EF4444" strokeWidth={2} name="Payload Sensor (°C)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graph 3: RF Downlink Signal Strength */}
            <div
              className="p-4 rounded-xl h-80 flex flex-col justify-between lg:col-span-2 select-none"
              style={{
                background: '#000000',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-xs font-bold text-[#F1F5F9] uppercase flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-[#22C55E]" /> Ground Station RF Link SNR & Signal Strength ({timeRange})
                </h4>
                <span className="text-[10px] font-mono text-[#94A3B8]">Signal Level (dBm)</span>
              </div>

              <div className="flex-1 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis dataKey="time" stroke="#94A3B8" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis stroke="#94A3B8" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#000000', borderColor: 'rgba(255,255,255,0.35)', color: '#F1F5F9', fontSize: 11, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="signal" stroke="#22C55E" fill="#22C55E" fillOpacity={0.2} name="Signal SNR (dBm)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
