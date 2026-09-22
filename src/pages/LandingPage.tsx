import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Crosshair,
  Layers,
  Menu,
  Monitor,
  Moon,
  Radio,
  Satellite as SatelliteIcon,
  SatelliteDish,
  Sparkles,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { Starfield } from '../components/landing/Starfield';
import { HeroHUD } from '../components/landing/HeroHUD';
import { MissionOverviewStrip } from '../components/landing/MissionOverviewStrip';
import { LiveTelemetrySection } from '../components/landing/LiveTelemetrySection';
import { AnomalySimulationBanner, SimulationStage } from '../components/landing/AnomalySimulationBanner';
import { AIDiagnosisModal } from '../components/landing/AIDiagnosisModal';
import { DashboardGlobe3D } from '../components/dashboard/DashboardGlobe3D';
import { OrbitalLogoIcon } from '../components/common/OrbitalLogoIcon';
import { useTelemetry } from '../context/TelemetryContext';

const SATELLITE_COLORS: Record<string, string> = {
  'SAT-001': '#00BFFF', // AGIS-3: Electric Cyan
  'SAT-002': '#EF4444', // SENTINEL-9: Crimson Red
  'SAT-003': '#8B5CF6', // ORBCOM-7: Royal Violet / Purple
  'SAT-004': '#F59E0B', // HELIOS-1: Solar Gold / Amber
};

const NAV_LINKS = [
  { label: 'CONSTELLATION', href: '#constellation' },
  { label: 'CAPABILITIES', href: '#capabilities' },
  { label: 'ALERTS', path: '/alerts' },
  { label: 'REPORTS', path: '/history' },
  { label: 'ABOUT', href: '#about' },
];

const FEATURES = [
  {
    title: 'REAL-TIME TELEMETRY',
    desc: 'Live subsystem monitoring',
    Icon: Radio,
    color: '#0284C7', // Sky Blue
    bg: 'rgba(2, 132, 199, 0.12)',
    border: 'rgba(2, 132, 199, 0.35)',
  },
  {
    title: 'ANOMALY DETECTION',
    desc: 'AI-powered threat detection',
    Icon: Sparkles,
    color: '#F59E0B', // Solar Amber
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  {
    title: 'PASS PREDICTIONS',
    desc: 'Accurate ground station windows',
    Icon: SatelliteDish,
    color: '#10B981', // Emerald Green
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  {
    title: 'HEALTH ANALYTICS',
    desc: 'Power, thermal & comms insights',
    Icon: Crosshair,
    color: '#8B5CF6', // Royal Purple
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.35)',
  },
  {
    title: 'MISSION CONTROL',
    desc: 'Complete operational overview',
    Icon: Monitor,
    color: '#EC4899', // Hot Pink
    bg: 'rgba(236, 72, 153, 0.12)',
    border: 'rgba(236, 72, 153, 0.35)',
  },
];

const PIPELINE_STAGES = [
  {
    step: '01',
    title: 'REAL-TIME TELEMETRY',
    subtitle: 'High-Rate Subsystem Ingestion',
    desc: 'Sub-second packet ingestion across power, thermal, AOCS, and payload sensors.',
    icon: Radio,
    tag: 'DOWNLINK STREAM',
    color: '#0284C7', // Vivid Sky Blue
    bg: 'rgba(2, 132, 199, 0.12)',
    border: 'rgba(2, 132, 199, 0.35)',
  },
  {
    step: '02',
    title: 'SATELLITE HEALTH MONITORING',
    subtitle: 'Fleet Digital Twin State',
    desc: 'Continuous real-time telemetry validation against nominal operational thresholds.',
    icon: SatelliteIcon,
    tag: 'TELEMETRY ENGINE',
    color: '#10B981', // Vivid Emerald Green
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  {
    step: '03',
    title: 'AI ANALYSIS',
    subtitle: 'Multi-Variate Correlation',
    desc: 'Neural models process multi-parameter drift across coupled orbital subsystems.',
    icon: Cpu,
    tag: 'NEURAL PREDICTOR',
    color: '#8B5CF6', // Vivid Purple
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.35)',
  },
  {
    step: '04',
    title: 'ANOMALY DETECTION',
    subtitle: 'Early Drift Identification',
    desc: 'Detects micro-anomalies in battery degradation, solar occlusion, or thermal runaway.',
    icon: Sparkles,
    tag: 'ANOMALY DETECTOR',
    color: '#F59E0B', // Vivid Solar Amber
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  {
    step: '05',
    title: 'EARLY PREDICTION',
    subtitle: 'Predictive Horizon Forecasting',
    desc: 'Forecasts impending subsystem failures hours before hardware threshold trips.',
    icon: AlertTriangle,
    tag: 'HORIZON PREDICTION',
    color: '#EF4444', // Vivid Crimson Red
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
  },
  {
    step: '06',
    title: 'MISSION ALERT',
    subtitle: 'Automated FDIR & Operator Action',
    desc: 'Generates mission-critical alerts, ground contact windows, and recovery guidance.',
    icon: CheckCircle2,
    tag: 'FDIR DISPATCH',
    color: '#EC4899', // Vivid Hot Pink / Rose
    bg: 'rgba(236, 72, 153, 0.12)',
    border: 'rgba(236, 72, 153, 0.35)',
  },
];

const EXACT_TICKER_ITEMS = [
  { text: 'HELIOS-1 · ALT 408.8KM · BATT 79% · TEMP 34.8°C · LINK DEGRADED', color: '#F59E0B' },
  { text: 'ORBCOM-7 · ALT 3578KM · BATT 96% · TEMP 19.5°C · LINK OPTIMAL', color: '#38bdf8' },
  { text: 'SENTINEL-9 · ALT 520.6KM · BATT 36% · TEMP 59.8°C · LINK CRITICAL', color: '#ff3b3b' },
  { text: 'AGIS-3 · ALT 408.8KM · BATT 74% · TEMP 34.1°C', color: '#00ff9d' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { satellites, injectAnomaly, alerts } = useTelemetry();
  const [menuOpen, setMenuOpen] = useState(false);
  const [light, setLight] = useState(false);
  const [activeHeroSatId, setActiveHeroSatId] = useState<string>('SAT-001');
  const [simulationStage, setSimulationStage] = useState<SimulationStage>('NORMAL');
  const [showDiagnosisModal, setShowDiagnosisModal] = useState<boolean>(false);

  // Animated numbers for statistics on page entry
  const [statUptime, setStatUptime] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setStatUptime(Number((99.98 * ease).toFixed(2)));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, []);

  const ticker = useMemo(() => {
    return [...EXACT_TICKER_ITEMS, ...EXACT_TICKER_ITEMS, ...EXACT_TICKER_ITEMS];
  }, []);

  const onlineCount = satellites.filter((s) => s.healthStatus !== 'critical').length;
  const activeHeroSat = satellites.find((s) => s.id === activeHeroSatId) || satellites[0];

  const handleEnterConsole = () => {
    navigate('/dashboard');
  };

  const handleSimulateAnomaly = () => {
    setSimulationStage('ANALYZING');
    setTimeout(() => {
      setSimulationStage('DETECTED');
      setActiveHeroSatId('SAT-004'); // Switch focus to SENTINEL-RADAR
      injectAnomaly('SAT-004', 'power', 'critical');
    }, 1200);
  };

  const handleResetNominal = () => {
    setSimulationStage('NORMAL');
    setShowDiagnosisModal(false);
  };

  const aiEngineStatus = useMemo(() => {
    if (simulationStage === 'DETECTED' || simulationStage === 'DIAGNOSIS') {
      return {
        status: 'CRITICAL',
        healthScore: 64.2,
        anomalyRisk: 94.7,
        prediction: 'POTENTIAL SOLAR PANEL DEGRADATION',
      };
    }
    if (simulationStage === 'ANALYZING') {
      return {
        status: 'ANALYZING',
        healthScore: 96.8,
        anomalyRisk: 18.5,
        prediction: 'SCANNING TELEMETRY...',
      };
    }
    const health = activeHeroSat.overallHealth;
    const isNom = activeHeroSat.healthStatus === 'nominal';
    return {
      status: isNom ? 'NOMINAL' : 'WARNING',
      healthScore: health,
      anomalyRisk: isNom ? 2.4 : 32.1,
      prediction: isNom ? 'STABLE' : 'SUBSYSTEM DRIFT ADVISORY',
    };
  }, [simulationStage, activeHeroSat]);

  const palette = light
    ? {
        page: '#eef3f8',
        text: '#0b1220',
        muted: '#4b5b70',
        panel: 'rgba(255, 255, 255, 0.78)',
        line: 'rgba(15, 23, 42, 0.12)',
      }
    : {
        page: '#000000',
        text: '#f0fdff',
        muted: '#8ea2b8',
        panel: 'rgba(0, 0, 0, 0.85)',
        line: 'rgba(0, 217, 255, 0.16)',
      };

  return (
    <div
      className="relative min-h-screen overflow-x-hidden font-sans selection:bg-[#00eaff] selection:text-black"
      style={{ backgroundColor: '#000000', color: palette.text }}
    >
      {/* Clean full dark black space background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundColor: '#000000',
        }}
      />

      {/* Gentle Twinkling Starfield preserved on pure black */}
      <Starfield />

      {/* ----------------------------------------------------------- */}
      {/* HEADER: Exactly matching reference image */}
      {/* ----------------------------------------------------------- */}
      <header
        className="sticky top-0 z-40 h-[66px] px-6 md:px-12 flex items-center justify-between transition-all"
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
          backgroundColor: '#000000',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Left: Satellite/Planet Logo + SATCOM HEALTH */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer bg-transparent border-0 text-left p-0"
        >
          <div className="relative w-8 h-8 flex items-center justify-center bg-[#020305] rounded-lg border border-cyan-400/40 shadow-[0_0_10px_rgba(0,234,255,0.3)]">
            <OrbitalLogoIcon size={24} />
          </div>
          <span
            className="font-display font-black text-[13px] tracking-[0.24em] uppercase text-white"
          >
            SATSHIELD AI
          </span>
        </button>

        {/* Center: Navigation Links */}
        <nav
          className="hidden lg:flex items-center gap-9 font-mono-hud text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-300"
        >
          {NAV_LINKS.map((link) =>
            link.path ? (
              <button
                key={link.label}
                type="button"
                onClick={() => navigate(link.path)}
                className="hover:text-[#00eaff] transition-colors cursor-pointer bg-transparent border-0"
              >
                {link.label}
              </button>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-[#00eaff] transition-colors no-underline"
                style={{ color: 'inherit' }}
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        {/* Right: Enter Console Button + Theme Icon Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleEnterConsole}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-lg font-sans text-[11.5px] font-black tracking-[0.14em] uppercase cursor-pointer transition-all duration-200 hover:scale-[1.03] group relative overflow-hidden text-black bg-white hover:bg-slate-100"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 14px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.2)',
            }}
          >
            <span className="relative z-10 text-black font-black">
              ENTER CONSOLE
            </span>
            <span className="text-slate-900 font-black group-hover:translate-x-1 transition-transform">→</span>
          </button>
          <button
            type="button"
            onClick={() => setLight((v) => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{
              border: '1px solid rgba(0, 217, 255, 0.3)',
              color: '#8ea2b8',
              background: 'rgba(0, 217, 255, 0.03)',
            }}
            aria-label="Toggle theme"
          >
            {light ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ border: '1px solid rgba(0, 217, 255, 0.3)', background: 'transparent', color: '#8ea2b8' }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Interactive Anomaly Simulation Banner */}
      <AnomalySimulationBanner
        stage={simulationStage}
        onViewDiagnosis={() => setShowDiagnosisModal(true)}
        onAcknowledgeAlert={() => setSimulationStage('DIAGNOSIS')}
        onResetNominal={handleResetNominal}
      />

      {/* Mobile Nav Menu */}
      {menuOpen && (
        <div
          className="lg:hidden relative z-40 px-6 py-5 space-y-4"
          style={{ background: '#000000', borderBottom: '1px solid rgba(255, 255, 255, 0.18)' }}
        >
          {NAV_LINKS.map((link) =>
            link.path ? (
              <button
                key={link.label}
                type="button"
                className="block w-full text-left font-mono-hud text-xs tracking-widest uppercase cursor-pointer bg-transparent border-0 text-white"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(link.path);
                }}
              >
                {link.label}
              </button>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="block font-mono-hud text-xs tracking-widest uppercase text-white no-underline"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ),
          )}
          <button
            type="button"
            onClick={handleEnterConsole}
            className="w-full py-2.5 rounded-lg font-sans text-xs font-black uppercase cursor-pointer mt-2 tracking-wider flex items-center justify-center gap-2 text-black bg-white hover:bg-slate-100 shadow-md"
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
            }}
          >
            <span className="text-black font-black">ENTER CONSOLE</span>
            <span className="text-slate-900 font-black">→</span>
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* TELEMETRY TICKER: Exact layout from reference image */}
      {/* ----------------------------------------------------------- */}
      <div
        className="relative z-20 h-9 overflow-hidden flex items-center"
        style={{
          borderBottom: `1px solid rgba(0, 217, 255, 0.12)`,
          backgroundColor: '#1f2937',
        }}
      >
        <div className="hidden sm:flex items-center gap-2 pl-6 pr-4 h-full bg-[#1f2937] border-r border-cyan-500/20 shrink-0 z-10 text-[9.5px] font-sans font-bold text-[#00ff9d] tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse shadow-[0_0_6px_#00ff9d]" />
          <span>LIVE CCSDS FEED</span>
        </div>
        <div
          className="animate-marquee font-mono-hud text-[10px] tracking-wider whitespace-nowrap"
          style={{ color: '#8ea2b8' }}
        >
          {ticker.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 mx-8">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
              />
              <span>{item.text}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* HERO SECTION: Exactly matching reference image */}
      {/* ----------------------------------------------------------- */}
      <section className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 pt-8 md:pt-12 pb-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4">
          {/* LEFT SIDE: Content, Headline, Buttons, Stats (approx 44%) */}
          <div className="w-full lg:w-[44%] space-y-6 md:space-y-7 animate-fade-in order-1">
            {/* Glowing Badge above headline */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[10.5px] font-sans font-bold tracking-[0.16em] uppercase text-cyan-300 bg-cyan-950/50 border border-cyan-500/35 shadow-[0_0_14px_rgba(0,217,255,0.25)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00eaff] animate-ping" />
              <span>● AI-POWERED SATELLITE HEALTH MONITORING</span>
            </div>

            {/* Headline: "Every subsystem, watched." */}
            <h1
              className="font-extrabold text-[46px] sm:text-6xl lg:text-[72px] leading-[0.98] tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', 'Orbitron', sans-serif",
                letterSpacing: '-0.025em',
              }}
            >
              <span className="block text-white">Every subsystem,</span>
              <span
                className="block"
                style={{
                  color: '#2563eb',
                  textShadow: '0 2px 16px rgba(37, 99, 235, 0.4)',
                }}
              >
                watched.
              </span>
            </h1>

            {/* Subtitle Paragraph */}
            <p
              className="text-[15.5px] md:text-[17px] leading-relaxed max-w-[46ch]"
              style={{ color: '#869ab0' }}
            >
              Real-time telemetry. AI-driven anomaly prediction. Mission-ready intelligence for critical space assets.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={handleEnterConsole}
                className="relative group px-8 py-3.5 rounded-xl font-sans font-black text-[13px] tracking-[0.15em] uppercase cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden flex items-center gap-2.5 text-[#0f172a] hover:bg-[#f1f5f9]"
                style={{
                  background: '#e2e8f0',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  boxShadow: 'none',
                }}
              >
                <span className="font-black text-[#0f172a] tracking-[0.15em]">ENTER CONSOLE</span>
                <span className="text-base font-black text-[#0f172a] group-hover:translate-x-1.5 transition-transform duration-200">→</span>
              </button>
              <button
                type="button"
                onClick={handleSimulateAnomaly}
                disabled={simulationStage === 'ANALYZING'}
                className="px-7 py-3.5 rounded-xl font-mono-hud font-bold text-[12px] tracking-[0.14em] uppercase cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:bg-[#133266] active:scale-[0.98] flex items-center gap-2 text-[#93c5fd]"
                style={{
                  background: '#0c234a',
                  border: '1px solid #1d4ed8',
                  color: '#93c5fd',
                  boxShadow: 'none',
                }}
              >
                <span className="text-[#60a5fa]">▷</span>
                <span>{simulationStage === 'ANALYZING' ? 'SIMULATING ANOMALY...' : 'SIMULATE ANOMALY'}</span>
              </button>
            </div>

            {/* Quick Interactive Satellite Telemetry Focus Bar */}
            <div className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-sans font-bold tracking-wider text-slate-400 uppercase">
                  FOCUS SATELLITE TELEMETRY
                </span>
                <span className="text-[10px] font-sans font-semibold text-cyan-400">
                  {activeHeroSat.name} · {activeHeroSat.subsystems.aocs.altitude.toFixed(0)} KM ALT
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                {satellites.map((s) => {
                  const isAct = s.id === activeHeroSat.id;
                  const satColor = s.color || SATELLITE_COLORS[s.id] || '#00BFFF';
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveHeroSatId(s.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                        isAct
                          ? 'bg-black text-white'
                          : 'bg-black/60 text-slate-400 hover:text-white'
                      }`}
                      style={{
                        borderColor: isAct ? satColor : `${satColor}50`,
                        boxShadow: isAct ? `0 0 14px ${satColor}40` : `0 0 6px ${satColor}15`,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: satColor, boxShadow: `0 0 8px ${satColor}` }}
                        />
                        <span
                          className="text-[11px] font-bold truncate"
                          style={{ color: isAct ? satColor : '#F1F5F9' }}
                        >
                          {s.name}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5 pl-3.5">
                        {s.overallHealth}% HLTH
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Statistics Row: Dynamic Telemetry for Selected Satellite */}
            <div className="pt-5 flex items-center gap-5 sm:gap-7">
              {/* Stat 1: Uptime */}
              <div>
                <Activity className="w-4 h-4 text-[#00eaff] mb-1.5" />
                <div className="font-display text-[24px] md:text-[28px] font-bold text-white leading-none tracking-tight">
                  {statUptime}%
                </div>
                <div className="mt-1 font-mono-hud text-[8px] font-semibold tracking-[0.18em] uppercase text-[#8ea2b8]">
                  FLEET UPTIME
                </div>
              </div>

              {/* Vertical divider */}
              <div className="h-10 w-[1px] bg-slate-800" />

              {/* Stat 2: Battery & Temp of Focus Satellite */}
              <div>
                <Zap className="w-4 h-4 text-[#00eaff] mb-1.5" />
                <div className="font-display text-[24px] md:text-[28px] font-bold text-white leading-none tracking-tight">
                  {activeHeroSat.subsystems.power.batteryCharge}%
                </div>
                <div className="mt-1 font-mono-hud text-[8px] font-semibold tracking-[0.18em] uppercase text-[#8ea2b8]">
                  {activeHeroSat.name} BATT · {activeHeroSat.subsystems.thermal.internalTemp}°C
                </div>
              </div>

              {/* Vertical divider */}
              <div className="h-10 w-[1px] bg-slate-800" />

              {/* Stat 3: Fleet Status */}
              <div>
                <Crosshair className="w-4 h-4 text-[#00eaff] mb-1.5" />
                <div className="font-display text-[24px] md:text-[28px] font-bold text-white leading-none tracking-tight">
                  {onlineCount} / {satellites.length}
                </div>
                <div className="mt-1 font-mono-hud text-[8px] font-semibold tracking-[0.18em] uppercase text-[#8ea2b8]">
                  FLEET ONLINE
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Realistic 3D Earth, Orbits & Telemetry HUD with Cosmic Nebula Aura */}
          <div className="w-full lg:w-[56%] flex items-center justify-center lg:justify-end order-2 relative">
            {/* Deep space radial cosmic aura */}
            <div
              className="absolute inset-0 pointer-events-none -z-10 rounded-full"
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(0, 180, 255, 0.08) 0%, rgba(30, 58, 138, 0.05) 45%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
            <HeroHUD
              selectedSatelliteId={activeHeroSatId}
              onSelectSatellite={setActiveHeroSatId}
              aiEngineStatus={aiEngineStatus}
            />
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* HORIZONTAL GLASSMORPHISM FEATURE BAR (5 Sections) */}
        {/* ----------------------------------------------------------- */}
        <div className="mt-10">
          <div
            className="rounded-2xl p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 14px 40px rgba(0, 0, 0, 0.45), 0 0 25px rgba(255, 255, 255, 0.15)',
            }}
          >
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="rounded-xl p-3 transition-all hover:bg-slate-50 cursor-default flex items-start gap-3"
              >
                <div
                  className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: feat.bg,
                    border: `1.5px solid ${feat.border}`,
                    boxShadow: `0 2px 8px ${feat.color}25`,
                  }}
                >
                  <feat.Icon className="w-4.5 h-4.5" style={{ color: feat.color }} />
                </div>
                <div>
                  <div className="font-mono-hud text-[10.5px] font-black tracking-[0.14em] uppercase text-slate-950">
                    {feat.title}
                  </div>
                  <div className="mt-0.5 text-[11.5px] leading-snug text-slate-600 font-medium">
                    {feat.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SCROLL TO EXPLORE INDICATOR */}
        <div className="flex flex-col items-center justify-center pt-8 pb-2">
          <a
            href="#pipeline"
            className="flex items-center gap-2 font-mono-hud text-[9.5px] tracking-[0.24em] uppercase text-[#8ea2b8] hover:text-[#00eaff] transition-colors no-underline"
          >
            <span className="w-3.5 h-5 rounded-full border border-cyan-500/40 flex items-start justify-center pt-1">
              <span className="w-1 h-1.5 rounded-full bg-[#00eaff] animate-bounce" />
            </span>
            <span>SCROLL TO EXPLORE</span>
            <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
          </a>
        </div>
      </section>

      {/* ----------------------------------------------------------- */}
      {/* MISSION OVERVIEW STRIP (04 SATELLITES, 96.8% HEALTH, etc.) */}
      {/* ----------------------------------------------------------- */}
      <MissionOverviewStrip
        satellites={satellites}
        activeAlertsCount={alerts.filter((a) => !a.resolved).length}
      />

      {/* ----------------------------------------------------------- */}
      {/* LIVE TELEMETRY SECTION (6 Animated Mini Charts) */}
      {/* ----------------------------------------------------------- */}
      <LiveTelemetrySection
        activeSatellite={activeHeroSat}
        onOpenConsole={handleEnterConsole}
      />

      {/* ----------------------------------------------------------- */}
      {/* SIH PRESENTATION REQUIREMENT: AI HEALTH & PREDICTION PIPELINE */}
      {/* ----------------------------------------------------------- */}
      <section id="pipeline" className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 py-16">
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full font-mono-hud text-[10px] tracking-[0.24em] uppercase mb-3 bg-cyan-950/50 text-cyan-400 border border-cyan-500/30">
            <Cpu className="w-3.5 h-3.5" />
            AI TELEMETRY HEALTH & PREDICTION ENGINE
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            End-to-End Satellite Health & Anomaly Pipeline
          </h2>
          <p className="mt-3 text-base md:text-lg" style={{ color: '#8ea2b8' }}>
            Within milliseconds of telemetry downlink, deep multi-variate models correlate parameter drift
            across Power, Thermal, AOCS, and Communications to predict failure before mission disruption.
          </p>
        </div>

        {/* 6-Stage Flowchart Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PIPELINE_STAGES.map((stage, idx) => (
            <div
              key={stage.step}
              className="rounded-xl p-6 relative group transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
              style={{
                backgroundColor: '#FFFFFF',
                border: `1.5px solid ${stage.border}`,
                boxShadow: `0 10px 30px rgba(0, 0, 0, 0.45), 0 0 20px ${stage.color}20`,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="font-mono-hud text-[10px] font-bold px-2.5 py-0.5 rounded"
                  style={{
                    backgroundColor: stage.bg,
                    color: stage.color,
                    border: `1px solid ${stage.border}`,
                  }}
                >
                  {stage.tag}
                </span>
                <span className="font-mono-hud text-sm font-bold text-slate-400">STAGE {stage.step}</span>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-200 group-hover:scale-110"
                style={{
                  backgroundColor: stage.bg,
                  border: `1.5px solid ${stage.border}`,
                  boxShadow: `0 4px 14px ${stage.color}30`,
                }}
              >
                <stage.icon className="w-6 h-6" style={{ color: stage.color }} />
              </div>
              <h3 className="font-display text-xl font-black text-slate-950 mb-1">{stage.title}</h3>
              <div
                className="font-mono-hud text-[11.5px] mb-2.5 font-bold tracking-wide"
                style={{ color: stage.color }}
              >
                {stage.subtitle}
              </div>
              <p className="text-sm leading-relaxed text-slate-800 font-semibold">
                {stage.desc}
              </p>
              {idx < PIPELINE_STAGES.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <ArrowRight className="w-5 h-5 text-white/70" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- */}
      {/* CONSTELLATION STATUS — Dashboard-Style Globe + Satellite List */}
      {/* ----------------------------------------------------------- */}
      <section id="constellation" className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 py-14">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="font-mono-hud text-[11px] tracking-[0.22em] uppercase mb-2 text-[#00eaff]">
              ORBITAL ASSETS
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
              Constellation Health Overview
            </h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Live 3D orbital tracking of all active satellites — click any asset to inspect real-time telemetry.
            </p>
          </div>
          <button
            type="button"
            onClick={handleEnterConsole}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-mono-hud text-xs font-bold uppercase cursor-pointer self-start md:self-auto transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#F1F5F9',
              boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
            }}
          >
            <span>FULL CONSTELLATION</span>
            <span>↗</span>
          </button>
        </div>

        {/* Main Dashboard-Style Panel */}
        <div
          className="rounded-xl p-4 select-none relative overflow-hidden"
          style={{
            background: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            boxShadow: '0 4px 40px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            minHeight: '500px',
          }}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-1">
            <h3 className="font-sans font-bold text-[13px] text-[#F1F5F9] uppercase tracking-wider">
              CONSTELLATION OVERVIEW
            </h3>
            <span className="font-mono text-[10px] text-[#22C55E] font-bold">
              {satellites.length} ASSETS TRACKED
            </span>
          </div>

          {/* Globe + Satellite List */}
          <div className="relative flex-1 flex items-center" style={{ minHeight: '440px' }}>
            {/* 3D Earth Globe */}
            <div className="w-full h-full absolute inset-0" style={{ minHeight: '440px' }}>
              <DashboardGlobe3D />
            </div>

            {/* Right Overlay: Satellite Cards */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 space-y-2 z-10 font-sans pointer-events-auto w-[200px] md:w-[220px] max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {satellites.map((sat) => {
                const satColor = sat.color || SATELLITE_COLORS[sat.id] || '#00BFFF';
                const isSelected = sat.id === activeHeroSatId;
                const isCrit = sat.healthStatus === 'critical';
                const isWarn = sat.healthStatus === 'warning';
                const statusColor = isCrit ? '#EF4444' : isWarn ? '#F59E0B' : '#22C55E';

                return (
                  <button
                    key={sat.id}
                    type="button"
                    onClick={() => setActiveHeroSatId(sat.id)}
                    className={`w-full p-2.5 rounded-lg border transition-all cursor-pointer text-left block group ${
                      isSelected ? 'bg-[#111111] scale-[1.02]' : 'bg-[#080808]/90 hover:bg-[#111111]'
                    }`}
                    style={{
                      borderColor: isSelected ? satColor : `${satColor}60`,
                      boxShadow: isSelected
                        ? `0 0 14px ${satColor}50, inset 0 0 10px ${satColor}20`
                        : `0 0 8px ${satColor}20`,
                    }}
                  >
                    {/* Name + Health */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: satColor, boxShadow: `0 0 6px ${satColor}` }}
                        />
                        <span
                          className="font-bold text-[12px] tracking-wide truncate transition-colors"
                          style={{ color: isSelected ? satColor : '#F1F5F9' }}
                        >
                          {sat.name}
                        </span>
                      </div>
                      <span
                        className="font-mono text-[9px] font-bold shrink-0"
                        style={{ color: statusColor }}
                      >
                        {sat.overallHealth}%
                      </span>
                    </div>
                    {/* Alt + ID */}
                    <div className="flex items-center justify-between text-[9.5px] font-mono text-[#94A3B8] mt-0.5 pl-3.5">
                      <span>{sat.subsystems.aocs.altitude.toFixed(0)} km</span>
                      <span
                        className="text-[8.5px] px-1 rounded font-bold uppercase"
                        style={{ color: satColor, backgroundColor: `${satColor}15` }}
                      >
                        {sat.id}
                      </span>
                    </div>
                    {/* Battery bar */}
                    <div className="mt-1.5 pl-3.5">
                      <div className="h-1 rounded-full bg-slate-800/80 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${sat.subsystems.power.batteryCharge}%`,
                            backgroundColor: satColor,
                            boxShadow: `0 0 4px ${satColor}`,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom-right: Launch Console button */}
            <div className="absolute right-4 bottom-3 z-10">
              <button
                type="button"
                onClick={handleEnterConsole}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded font-sans text-[10px] font-bold tracking-wider cursor-pointer transition-all hover:bg-white/10"
                style={{
                  background: '#080808',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#F1F5F9',
                }}
              >
                <span>FULL CONSTELLATION</span>
                <span className="text-[11px]">↗</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- */}
      {/* CAPABILITIES SECTION */}
      {/* ----------------------------------------------------------- */}
      <section id="capabilities" className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 py-14">
        <div className="font-mono-hud text-[11px] tracking-[0.22em] uppercase mb-2 text-[#00eaff]">
          MISSION CAPABILITIES
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10 max-w-2xl text-white">
          Built for Space Operators Who Require Uncompromised Telemetry Integrity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              title: '3D Subsystem Digital Twin',
              body: 'Inspect attitude dynamics, battery cell depletion, and thermal gradients across every panel in real time with interactive WebGL rendering.',
              icon: Layers,
              color: '#00BFFF', // Electric Cyan
            },
            {
              title: 'Predictive Anomaly Injection',
              body: 'Rehearse solar flare degradation, link loss, and sensor drift under simulated flight conditions to train neural decision policies.',
              icon: AlertTriangle,
              color: '#F59E0B', // Solar Gold / Amber
            },
            {
              title: 'Multi-Ground Station Windows',
              body: 'Real-time visibility countdowns for Madrid, Goldstone, Canberra, and ISRO ground tracking complexes keep contact windows locked.',
              icon: SatelliteDish,
              color: '#10B981', // Emerald Green
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl p-6 relative group transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-400/50"
              style={{
                background: 'linear-gradient(180deg, #0d1f3b 0%, #081528 100%)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: '#030816',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8), 0 2px 6px rgba(0, 0, 0, 0.5)',
                }}
              >
                <card.icon className="w-6 h-6" style={{ color: card.color }} />
              </div>
              <div className="font-display text-xl font-bold mb-2.5 text-white">{card.title}</div>
              <p className="text-sm leading-relaxed text-slate-200">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- */}
      {/* ABOUT & MISSION CALL TO ACTION */}
      {/* ----------------------------------------------------------- */}
      <section id="about" className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 py-16">
        <div
          className="rounded-2xl px-8 py-12 md:px-14 md:py-16 overflow-hidden relative"
          style={{
            background: 'linear-gradient(180deg, #0d1f3b 0%, #081528 100%)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="font-mono-hud text-[11px] tracking-[0.24em] uppercase mb-3 text-cyan-400 font-bold">
            SPACE ASSET SAFETY
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold max-w-3xl mb-5 text-white leading-tight">
            AI-Powered Satellite Health Monitoring & Early Anomaly Prediction
          </h2>
          <p className="max-w-2xl text-base md:text-lg leading-relaxed mb-8 text-slate-200">
            Designed for commercial satellite operators, research constellations, and Smart India Hackathon
            (SIH) mission control demonstrations. Monitor health telemetry, trigger fault scenarios, and explore
            real-time early prediction models.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleEnterConsole}
              className="px-8 py-3.5 rounded-xl font-mono-hud font-bold text-[12px] tracking-[0.14em] uppercase cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-white hover:bg-slate-900"
              style={{
                background: '#040a17',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              }}
            >
              Open Mission Control Console →
            </button>
            <button
              type="button"
              onClick={() => navigate('/alerts')}
              className="px-8 py-3.5 rounded-xl font-mono-hud font-bold text-[12px] tracking-[0.14em] uppercase cursor-pointer transition-all duration-200 hover:scale-[1.02] text-white hover:bg-slate-900"
              style={{
                background: 'rgba(2, 6, 20, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              }}
            >
              View Active Alerts System
            </button>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- */}
      {/* FOOTER */}
      {/* ----------------------------------------------------------- */}
      <footer className="relative z-10 px-6 md:px-12 py-10 mt-6" style={{ borderTop: `1px solid rgba(0, 217, 255, 0.12)` }}>
        <div
          className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 font-mono-hud text-[10.5px] tracking-[0.18em] uppercase"
          style={{ color: '#8ea2b8' }}
        >
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#00eaff]" />
            <span>SATSHIELD AI • AI-POWERED SATELLITE OPERATIONS PLATFORM</span>
          </div>
          <div>LEO • MEO • GEO TELEMETRY MONITORING • CCSDS COMPLIANT</div>
        </div>
      </footer>

      {/* AI Explanation Modal */}
      <AIDiagnosisModal
        isOpen={showDiagnosisModal}
        onClose={() => setShowDiagnosisModal(false)}
        onOpenConsole={handleEnterConsole}
        onResetNominal={handleResetNominal}
      />
    </div>
  );
};
