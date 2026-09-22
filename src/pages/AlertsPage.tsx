import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Info,
  Bell,
  Filter,
  CheckCheck,
  AlertOctagon,
  CheckCircle,
  Activity,
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { DynamicAlertService, DynamicAlert } from '../services/DynamicAlertService';

export const AlertsPage: React.FC = () => {
  const {
    satellitesData,
    activeSatelliteId,
    setActiveSatelliteId,
    openSimulateModal,
    simulationStep,
    latestMLResult,
    currentDiagnosis,
  } = useSimulation();

  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [filterSat, setFilterSat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionCount, setActionCount] = useState<number>(0);

  const forceRefresh = () => setActionCount((c) => c + 1);

  // Dynamically compute alerts for all satellites
  const allAlerts: DynamicAlert[] = useMemo(() => {
    const alerts: DynamicAlert[] = [];
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
        satAlerts.forEach((a) => alerts.push(a));
      }
    });
    return alerts;
  }, [satellitesData, activeSatelliteId, latestMLResult, currentDiagnosis, simulationStep, actionCount]);

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((alert) => {
      if (filterSeverity !== 'all') {
        const sevLower = alert.severity.toLowerCase();
        if (filterSeverity === 'critical' && sevLower !== 'critical') return false;
        if (filterSeverity === 'warning' && sevLower !== 'warning' && sevLower !== 'elevated') return false;
        if (filterSeverity === 'info' && sevLower !== 'info' && sevLower !== 'nominal' && sevLower !== 'watch') return false;
      }
      if (filterSat !== 'all' && alert.satellite_id !== filterSat) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          alert.title.toLowerCase().includes(q) ||
          alert.message.toLowerCase().includes(q) ||
          alert.satellite_name.toLowerCase().includes(q) ||
          alert.subsystem.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allAlerts, filterSeverity, filterSat, searchQuery]);

  const unhandledCount = allAlerts.filter((a) => !a.resolved).length;

  const handleAcknowledge = (satId: string, alertId: string) => {
    DynamicAlertService.acknowledgeAlert(satId, alertId);
    forceRefresh();
  };

  const handleResolve = (satId: string, alertId: string) => {
    DynamicAlertService.resolveAlert(satId, alertId);
    forceRefresh();
  };

  const handleResolveAll = () => {
    if (filterSat !== 'all') {
      DynamicAlertService.resolveAll(filterSat);
    } else {
      DynamicAlertService.resolveAll();
    }
    forceRefresh();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#05070f]">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-cyan-500/30">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400">
            <Bell className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <h2 className="text-xl font-orbitron font-extrabold text-slate-100 uppercase tracking-wide flex items-center gap-3">
              Alerts & Anomaly Control Center
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                unhandledCount > 0 ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
              }`}>
                {unhandledCount} Active
              </span>
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Live spacecraft telemetry threshold monitoring, IsolationForest anomaly detection, and autonomous CCSDS fault log
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => openSimulateModal()}
            className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-orbitron font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4 text-amber-400" /> INJECT ANOMALY
          </button>
          {unhandledCount > 0 && (
            <button
              onClick={handleResolveAll}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-orbitron font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <CheckCheck className="w-4 h-4" /> RESOLVE ALL
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 rounded-xl glass-panel border border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Field */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search alerts by spacecraft, subsystem, or keyword..."
          className="w-full md:w-80 px-3 py-1.5 bg-slate-950 border border-cyan-500/30 rounded-lg text-xs font-mono text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Target Sat:</span>
            <select
              value={filterSat}
              onChange={(e) => setFilterSat(e.target.value)}
              className="bg-slate-950 text-cyan-300 px-2.5 py-1 rounded border border-cyan-500/30 focus:outline-none cursor-pointer"
            >
              <option value="all">All Spacecraft</option>
              {Object.keys(satellitesData).map((id) => (
                <option key={id} value={id}>
                  {satellitesData[id]?.name || id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded uppercase font-bold transition-all cursor-pointer ${
                  filterSeverity === sev
                    ? 'bg-cyan-500 text-black'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Alert Log List */}
      <div className="space-y-2.5">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center glass-panel rounded-2xl border border-slate-800 text-slate-400 font-mono flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              NO ACTIVE TELEMETRY ANOMALIES
            </div>
            <p className="text-xs text-slate-500 mt-1">
              All selected spacecraft systems nominal • No threshold excursions or ML anomalies detected
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCrit = alert.severity === 'CRITICAL';
            const isWarn = alert.severity === 'WARNING' || alert.severity === 'ELEVATED';
            const cardStyle = alert.resolved
              ? 'border-slate-800/80 bg-slate-950/40 opacity-70'
              : isCrit
              ? 'border-red-500/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
              : isWarn
              ? 'border-amber-500/40 bg-amber-950/20'
              : 'border-cyan-500/30 bg-cyan-950/20';

            return (
              <div
                key={alert.alert_id}
                className={`p-4 rounded-xl glass-panel border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all ${cardStyle}`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 mt-0.5">
                    {isCrit ? (
                      <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Info className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-orbitron font-bold text-sm text-slate-100">{alert.satellite_name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-slate-900 text-cyan-300 border border-cyan-500/30">
                        {alert.subsystem}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          isCrit
                            ? 'bg-red-950 text-red-300 border border-red-500/40'
                            : isWarn
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase text-slate-400 bg-slate-900/80 border border-slate-700/50">
                        SRC: {alert.source.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans mt-1">{alert.message}</p>
                    <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-3">
                      <span>Event Timestamp: {alert.timestamp}</span>
                      <span>Alert ID: {alert.alert_id}</span>
                      {alert.current_value !== undefined && (
                        <span>Value: {alert.current_value} (Threshold: {alert.threshold})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {!alert.acknowledged && !alert.resolved && (
                    <button
                      onClick={() => handleAcknowledge(alert.satellite_id, alert.alert_id)}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                    >
                      ACKNOWLEDGE
                    </button>
                  )}
                  {!alert.resolved && (
                    <button
                      onClick={() => handleResolve(alert.satellite_id, alert.alert_id)}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> RESOLVE
                    </button>
                  )}
                  {alert.resolved && (
                    <span className="px-3 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> RESOLVED
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
