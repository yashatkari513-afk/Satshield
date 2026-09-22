import React, { useState } from 'react';
import { MissionSidebar } from '../components/dashboard/MissionSidebar';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { SystemMetricsRow } from '../components/dashboard/SystemMetricsRow';
import { ConstellationOverviewPanel } from '../components/dashboard/ConstellationOverviewPanel';
import { FleetHealthPanel } from '../components/dashboard/FleetHealthPanel';
import { ActiveAlertsPanel } from '../components/dashboard/ActiveAlertsPanel';
import { RealtimeTelemetryPanel } from '../components/dashboard/RealtimeTelemetryPanel';
import { GroundPassesPanel } from '../components/dashboard/GroundPassesPanel';
import { AIAnomalyPanel } from '../components/dashboard/AIAnomalyPanel';
import { AIMissionAssistantPanel } from '../components/dashboard/AIMissionAssistantPanel';
import { SatelliteDetailModal } from '../components/dashboard/SatelliteDetailModal';
import { AlertDetailModal } from '../components/dashboard/AlertDetailModal';
import { AIDiagnosisModal } from '../components/dashboard/AIDiagnosisModal';
import { AddSatelliteModal } from '../components/dashboard/AddSatelliteModal';
import { SimulateAnomalyModal } from '../components/dashboard/SimulateAnomalyModal';
import { SendReportModal } from '../components/dashboard/SendReportModal';
import { ModelValidationModal } from '../components/dashboard/ModelValidationModal';
import { AlertsPage } from './AlertsPage';
import { HistoryPage } from './HistoryPage';
import { SettingsPage } from './SettingsPage';
import { FileText, HelpCircle, X, Plus } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { useTelemetry } from '../context/TelemetryContext';

const DashboardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const {
    activeSatelliteId,
    setActiveSatelliteId,
    satellitesData,
    isAddSatelliteModalOpen,
    openAddSatelliteModal,
    closeAddSatelliteModal,
    isSimulateModalOpen,
    closeSimulateModal,
    isSendReportModalOpen,
    closeSendReportModal,
    openSendReportModal,
    targetReportSatId,
    isModelValidationModalOpen,
    closeModelValidationModal,
  } = useSimulation();

  const { setActiveSatelliteId: setTelemetryActiveId } = useTelemetry();

  const satList = Object.values(satellitesData);

  return (
    <div className="flex h-screen w-screen bg-[#020305] text-[#F1F5F9] overflow-hidden font-sans selection:bg-[#00BFFF] selection:text-black relative">
      {/* ── MOBILE BACKDROP OVERLAY ── */}
      {!sidebarCollapsed && (
        <div
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 z-35 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* ── 1. LEFT SIDEBAR (White background with black text) ── */}
      <MissionSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#020305]">
        {/* ── 2. TOP HEADER (Black background with white search bar & Mission Status) ── */}
        <DashboardHeader
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenHelp={() => setShowHelpModal(true)}
        />

        {/* ── SCROLLABLE DASHBOARD BODY ── */}
        <main className="flex-1 overflow-y-auto p-2.5 md:p-3.5 space-y-2.5 custom-scrollbar bg-[#020305]">
          {/* TAB 1: MAIN DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-2.5 animate-fadeIn">
              {/* ── TOP SYSTEM METRICS ROW (With Live Status & Anomaly Banner) ── */}
              <SystemMetricsRow onOpenReport={() => setShowReportModal(true)} />

              {/* ── ROW 1: CONSTELLATION OVERVIEW | FLEET HEALTH SUMMARY | ACTIVE ALERTS ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.42fr_1fr_1fr] gap-2.5 items-stretch">
                <div className="h-full lg:col-span-2 xl:col-span-1">
                  <ConstellationOverviewPanel
                    onSelectSatellite={(id) => {
                      setActiveSatelliteId(id);
                      setTelemetryActiveId(id);
                    }}
                    onViewConstellation={() => setActiveTab('constellation')}
                    onInspectSatellite={(id) => {
                      setActiveSatelliteId(id);
                      setTelemetryActiveId(id);
                      setSelectedSatelliteId(id);
                    }}
                  />
                </div>
                <div className="h-full">
                  <FleetHealthPanel />
                </div>
                <div className="h-full">
                  <ActiveAlertsPanel
                    onViewAll={() => setActiveTab('alerts')}
                    onSelectSatellite={(id) => {
                      setActiveSatelliteId(id);
                      setTelemetryActiveId(id);
                    }}
                  />
                </div>
              </div>

              {/* ── ROW 2: REAL-TIME TELEMETRY | AI ANOMALY DETECTION | NEXT GROUND PASSES ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.32fr_1fr_1fr] gap-2.5 items-stretch">
                <div className="h-full lg:col-span-2 xl:col-span-1">
                  <RealtimeTelemetryPanel
                    onSelectSatellite={(id) => {
                      setActiveSatelliteId(id);
                      setTelemetryActiveId(id);
                    }}
                    onViewAll={() => setActiveTab('telemetry')}
                  />
                </div>
                <div className="h-full">
                  <AIAnomalyPanel
                    onViewAll={() => setActiveTab('anomalies')}
                  />
                </div>
                <div className="h-full">
                  <GroundPassesPanel
                    onViewSchedule={() => setActiveTab('passes')}
                  />
                </div>
              </div>

              {/* ── FOOTER: All systems operational ── */}
              <footer className="py-2 text-center font-sans text-[10.5px] text-[#94A3B8] flex items-center justify-center gap-2">
                <span>© 2026 SATSHIELD AI · Autonomous Satellite Health & Anomaly Detection</span>
                <span>·</span>
                <span className="flex items-center gap-1.5 text-[#94A3B8]">
                  Multi-Asset Telemetry Anomaly Detection
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_6px_#22C55E]" />
                </span>
              </footer>
            </div>
          )}

          {/* TAB 2: CONSTELLATION (3D ORBIT TRACKING) */}
          {activeTab === 'constellation' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="h-[480px]">
                <ConstellationOverviewPanel
                  onSelectSatellite={(id) => {
                    setActiveSatelliteId(id);
                    setTelemetryActiveId(id);
                  }}
                  onViewConstellation={() => {}}
                  onInspectSatellite={(id) => {
                    setActiveSatelliteId(id);
                    setTelemetryActiveId(id);
                    setSelectedSatelliteId(id);
                  }}
                />
              </div>
              <RealtimeTelemetryPanel
                onSelectSatellite={(id) => {
                  setActiveSatelliteId(id);
                  setTelemetryActiveId(id);
                }}
                onViewAll={() => {}}
              />
            </div>
          )}

          {/* TAB 2B: SATELLITES (DEDICATED FLEET ASSET INSPECTION & + ADD SATELLITE) */}
          {activeTab === 'satellites' && (
            <div className="space-y-3.5 animate-fadeIn font-sans">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-black border border-white/20">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black uppercase tracking-wider text-[#F1F5F9]">
                      CONSTELLATION FLEET ASSETS ({satList.length} TRACKED)
                    </h2>
                    <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30 text-[10px] font-mono font-bold">
                      ACTIVE MONITORING
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Select a spacecraft to inspect sub-second CCSDS packet telemetry, EPS bus, and AI anomaly state or deploy new assets.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openAddSatelliteModal}
                    className="px-3.5 py-1.5 rounded-lg bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,191,255,0.4)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ ADD SATELLITE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white uppercase cursor-pointer"
                  >
                    ← DASHBOARD
                  </button>
                </div>
              </div>

              {/* Dynamic Satellite Fleet Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {satList.map((satCard) => {
                  const isSelected = satCard.id === activeSatelliteId;
                  const themeColor = satCard.color || '#00BFFF';
                  const isCrit = satCard.status === 'CRITICAL';
                  const isWarn = satCard.status === 'WARNING';
                  const statusColor = isCrit ? '#EF4444' : isWarn ? '#F59E0B' : '#22C55E';
                  const isDarkColor = themeColor === '#F59E0B' || themeColor === '#00BFFF' || themeColor === '#10B981';

                  return (
                    <div
                      key={satCard.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-black'
                          : 'bg-black hover:bg-white/[0.02]'
                      }`}
                      style={{
                        borderColor: isSelected ? themeColor : `${themeColor}66`,
                        boxShadow: isSelected
                          ? `0 0 24px ${themeColor}40, inset 0 0 12px ${themeColor}15`
                          : `0 0 12px ${themeColor}20`,
                      }}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: themeColor,
                              boxShadow: `0 0 8px ${themeColor}`,
                            }}
                          />
                          <h3
                            className="font-bold text-sm"
                            style={{ color: themeColor }}
                          >
                            {satCard.name}
                          </h3>
                          <span className="text-[10px] font-mono text-[#94A3B8]">
                            ({satCard.id}) • {satCard.operator || 'ISRO'}
                          </span>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border"
                          style={{
                            color: statusColor,
                            borderColor: `${statusColor}50`,
                            backgroundColor: `${statusColor}15`,
                          }}
                        >
                          {satCard.status}
                        </span>
                      </div>

                      <p className="text-xs text-[#94A3B8] my-2 leading-relaxed">
                        Mission: {satCard.mission} · Orbit: {satCard.orbitType || 'LEO'} · Health: {satCard.telemetry.healthScore}%
                      </p>

                      <div className="grid grid-cols-3 gap-2 py-2 text-xs border-t border-b border-white/10 font-mono">
                        <div>
                          <span className="text-[9px] text-[#94A3B8] block uppercase">Altitude</span>
                          <span className="font-bold text-[#F1F5F9]">{satCard.altitude || '500 km'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#94A3B8] block uppercase">Battery</span>
                          <span className="font-bold text-[#F1F5F9]">{satCard.telemetry.battery}%</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#94A3B8] block uppercase">Thermal</span>
                          <span className="font-bold text-[#F1F5F9]">{satCard.telemetry.temperature}°C</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSatelliteId(satCard.id);
                            setTelemetryActiveId(satCard.id);
                            setActiveTab('dashboard');
                          }}
                          style={{
                            backgroundColor: isSelected ? themeColor : undefined,
                            color: isSelected ? (isDarkColor ? '#000000' : '#FFFFFF') : undefined,
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            isSelected
                              ? 'font-black shadow-md'
                              : 'bg-white/10 hover:bg-white/20 text-[#F1F5F9] border border-white/20'
                          }`}
                        >
                          {isSelected ? '✓ ACTIVE SATELLITE' : 'SELECT ASSET'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openSendReportModal(satCard.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-blue-500/40 hover:bg-blue-500/10 text-xs font-bold text-[#3B82F6] uppercase tracking-wider cursor-pointer"
                            title="Generate & Dispatch Technical Report"
                          >
                            DISPATCH ↗
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSatelliteId(satCard.id);
                              setTelemetryActiveId(satCard.id);
                              setSelectedSatelliteId(satCard.id);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-white/25 hover:bg-white/10 text-xs font-bold text-[#00BFFF] uppercase tracking-wider cursor-pointer"
                          >
                            INSPECT ↗
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-3 animate-fadeIn">
              <RealtimeTelemetryPanel
                onSelectSatellite={(id) => {
                  setActiveSatelliteId(id);
                  setTelemetryActiveId(id);
                  setSelectedSatelliteId(id);
                }}
                onViewAll={() => {}}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <FleetHealthPanel />
                <GroundPassesPanel onViewSchedule={() => {}} />
              </div>
            </div>
          )}

          {/* TAB 4: HEALTH MONITOR */}
          {activeTab === 'health' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <FleetHealthPanel />
                <AIAnomalyPanel onViewAll={() => {}} />
              </div>
            </div>
          )}

          {/* TAB 5: ANOMALIES */}
          {activeTab === 'anomalies' && (
            <div className="space-y-3 animate-fadeIn">
              <AIAnomalyPanel onViewAll={() => {}} />
              <ActiveAlertsPanel
                onViewAll={() => {}}
                onSelectSatellite={(id) => {
                  setActiveSatelliteId(id);
                  setTelemetryActiveId(id);
                  setSelectedSatelliteId(id);
                }}
              />
            </div>
          )}

          {/* TAB 5B: AI MISSION ASSISTANT (STEP 26) */}
          {activeTab === 'assistant' && (
            <div className="space-y-3 animate-fadeIn font-sans">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
                <div className="lg:col-span-2">
                  <AIMissionAssistantPanel />
                </div>
                <div className="space-y-3">
                  <AIAnomalyPanel onViewAll={() => setActiveTab('anomalies')} />
                  <FleetHealthPanel />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ALERTS */}
          {activeTab === 'alerts' && (
            <div className="animate-fadeIn">
              <AlertsPage />
            </div>
          )}

          {/* TAB 7: GROUND STATIONS & PASSES */}
          {(activeTab === 'ground-stations' || activeTab === 'passes') && (
            <div className="space-y-3 animate-fadeIn">
              <GroundPassesPanel onViewSchedule={() => {}} />
              <div className="h-[380px]">
                <ConstellationOverviewPanel
                  onSelectSatellite={(id) => {
                    setActiveSatelliteId(id);
                    setTelemetryActiveId(id);
                    setSelectedSatelliteId(id);
                  }}
                  onViewConstellation={() => {}}
                />
              </div>
            </div>
          )}

          {/* TAB 8: REPORT CENTER & ANALYTICS */}
          {(activeTab === 'reports' || activeTab === 'analytics') && (
            <div className="animate-fadeIn">
              <HistoryPage />
            </div>
          )}

          {/* TAB 9: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="animate-fadeIn">
              <SettingsPage />
            </div>
          )}
        </main>
      </div>

      {/* ── SATELLITE INSPECTION DETAIL MODAL ── */}
      <SatelliteDetailModal
        satelliteId={selectedSatelliteId}
        onClose={() => setSelectedSatelliteId(null)}
      />

      {/* ── AI ACTIVE ALERT DETAIL MODAL ── */}
      <AlertDetailModal />

      {/* ── AI DIAGNOSIS MODAL ── */}
      <AIDiagnosisModal />

      {/* ── ADD NEW SATELLITE MODAL ── */}
      <AddSatelliteModal
        isOpen={isAddSatelliteModalOpen}
        onClose={closeAddSatelliteModal}
      />

      {/* ── SIMULATE ANOMALY MODAL ── */}
      <SimulateAnomalyModal
        isOpen={isSimulateModalOpen}
        onClose={closeSimulateModal}
      />

      {/* ── SEND REPORT EMAIL MODAL ── */}
      <SendReportModal
        isOpen={isSendReportModalOpen}
        onClose={closeSendReportModal}
        satelliteId={targetReportSatId || activeSatelliteId}
      />

      {/* ── AI/ML MODEL VALIDATION & BENCHMARK MODAL ── */}
      <ModelValidationModal
        isOpen={isModelValidationModalOpen}
        onClose={closeModelValidationModal}
      />

      {/* ── HELP MODAL ── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className="w-full max-w-md rounded-xl p-6 font-sans shadow-2xl"
            style={{
              background: '#000000',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-[#F1F5F9] font-bold text-sm uppercase">
                <HelpCircle className="w-4 h-4 text-[#00BFFF]" />
                <span>Mission Ops Quick Reference</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-[#94A3B8]">
              <div>
                <span className="text-[#00BFFF] font-bold">● + ADD SATELLITE</span>: Register new spacecraft into constellation fleet and start live AI monitoring.
              </div>
              <div>
                <span className="text-[#EF4444] font-bold">● SIMULATE ANOMALY</span>: Inject test telemetry drift into any satellite to test neural anomaly defense.
              </div>
              <div>
                <span className="text-[#3B82F6] font-bold">● REPORT CENTER</span>: Generate professional 9-section PDF reports & dispatch to verified space agencies.
              </div>
              <div className="pt-3 border-t border-white/10 text-[10px] text-[#94A3B8]/70">
                SATSHIELD AI MISSION CONTROL v4.2 · CCSDS COMPLIANT
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SYSTEM REPORT MODAL ── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className="w-full max-w-lg rounded-xl p-6 font-sans shadow-2xl"
            style={{
              background: '#000000',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2 text-[#F1F5F9] font-bold text-sm uppercase">
                <FileText className="w-4 h-4 text-[#00BFFF]" />
                <span>Fleet Telemetry Health Summary Report</span>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-[#94A3B8]">
              <div className="p-3 rounded-lg bg-[#05080C] border border-cyan-500/15 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">REPORT PERIOD:</span>
                  <span className="text-[#F1F5F9] font-bold">LAST 24 HOURS (UTC)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">FLEET ASSETS MONITORED:</span>
                  <span className="text-[#22C55E] font-bold">{satList.length} / {satList.length} ONLINE (100%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">TELEMETRY PACKETS INGESTED:</span>
                  <span className="text-[#F1F5F9] font-bold">1,894,200 PACKETS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">AI INFERENCE CONFIDENCE:</span>
                  <span className="text-[#00BFFF] font-bold">98.7% HIGH CONFIDENCE</span>
                </div>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Summary: All primary systems nominal across active spacecraft. Full technical reports available in Report Center.
              </p>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setActiveTab('reports');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#00BFFF] text-black font-black text-xs uppercase cursor-pointer"
                >
                  OPEN REPORT CENTER →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  return <DashboardContent />;
};

