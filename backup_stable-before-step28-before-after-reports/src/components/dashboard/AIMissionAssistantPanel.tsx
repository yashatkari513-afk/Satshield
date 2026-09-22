import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Activity,
  Trash2,
  HelpCircle,
  ChevronRight,
  Zap,
  TrendingUp,
  Sliders,
  Compass,
  Radio,
  Battery,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import {
  askAIMissionAssistant,
  AssistantMessage,
  AssistantResponse,
} from '../../services/MissionAssistantService';
import {
  WhatIfService,
  WhatIfScenarioResponse,
} from '../../services/WhatIfService';

interface AIMissionAssistantPanelProps {
  onSelectSatellite?: (id: string) => void;
  className?: string;
  isCompact?: boolean;
}

const QUICK_QUESTIONS = [
  { id: 'whatif_temp', label: 'What if temperature continues increasing?', icon: TrendingUp, color: '#F43F5E' },
  { id: 'whatif_soc', label: 'What if battery SOC keeps dropping?', icon: Battery, color: '#F59E0B' },
  { id: 'whatif_volt', label: 'What happens if voltage continues falling?', icon: Zap, color: '#EAB308' },
  { id: 'why_risk', label: 'Why is this satellite at risk?', icon: AlertTriangle, color: '#EF4444' },
  { id: 'health_summary', label: 'Show health summary', icon: Activity, color: '#00BFFF' },
  { id: 'prediction_ett', label: 'Show threshold prediction (ETT)', icon: Clock, color: '#8B5CF6' },
  { id: 'operator_action', label: 'What should the operator do?', icon: ShieldCheck, color: '#10B981' },
];

export const AIMissionAssistantPanel: React.FC<AIMissionAssistantPanelProps> = ({
  onSelectSatellite,
  className = '',
  isCompact = false,
}) => {
  const {
    activeSatelliteId,
    satellitesData,
    latestMLResult,
    currentDiagnosis,
  } = useSimulation();

  const currentSat = satellitesData[activeSatelliteId] || satellitesData[Object.keys(satellitesData)[0]] || {
    name: 'AGIS-3',
    id: 'SAT-001',
    status: 'NOMINAL',
    mission: 'COMMS SATELLITE',
    telemetry: { temperature: 25.1, voltage: 28.2, battery: 90, signalStrength: 95 },
  };

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Hello Flight Director. I am SATSHIELD AI Mission Assistant for **${currentSat.name}** (${currentSat.id}). I provide explainable, telemetry-grounded operational assessments and Step 27 What-If scenario projections. Ask me any question regarding health, anomalies, margins, trends, or hypothetical scenarios.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Step 27 What-If Scenario State
  const [showWhatIfSection, setShowWhatIfSection] = useState(true);
  const [selectedWhatIfParam, setSelectedWhatIfParam] = useState('temperature_c');
  const [whatIfHorizon, setWhatIfHorizon] = useState(10.0);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfScenarioResponse | null>(null);
  const [isWhatIfLoading, setIsWhatIfLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Live What-If Scenario update when active satellite or parameter changes
  useEffect(() => {
    let isCancelled = false;
    const fetchWhatIf = async () => {
      setIsWhatIfLoading(true);
      try {
        const res = await WhatIfService.analyzeScenario({
          satelliteId: currentSat.id,
          parameter: selectedWhatIfParam,
          telemetry: currentSat.telemetry,
          projectionHorizonMinutes: whatIfHorizon,
        });
        if (!isCancelled) {
          setWhatIfResult(res);
        }
      } catch (err) {
        console.warn('What-If projection error:', err);
      } finally {
        if (!isCancelled) setIsWhatIfLoading(false);
      }
    };
    fetchWhatIf();
    return () => {
      isCancelled = true;
    };
  }, [activeSatelliteId, selectedWhatIfParam, whatIfHorizon, currentSat.telemetry]);

  // Update welcome message if active satellite changes
  useEffect(() => {
    setMessages((prev) => {
      const contextNotice: AssistantMessage = {
        id: `context-switch-${Date.now()}`,
        sender: 'assistant',
        text: `Switched operational context to **${currentSat.name}** (${currentSat.id}). What-If scenario analysis is now grounded in this spacecraft's live telemetry stream.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      return [...prev, contextNotice];
    });
  }, [activeSatelliteId]);

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
      const response: AssistantResponse = await askAIMissionAssistant(
        textToSend,
        currentSat.id,
        currentSat.telemetry,
        latestMLResult || (currentDiagnosis ? {
          raw_anomaly_score: parseFloat(currentDiagnosis.anomalyScore || '0.08'),
          prediction: currentDiagnosis.severity === 'CRITICAL' ? 'ANOMALY' : 'NORMAL',
          subsystem: currentDiagnosis.subsystem,
          evidence: currentDiagnosis.evidence,
          recommended_action: currentDiagnosis.recommendedAction,
          probable_root_cause: currentDiagnosis.probableRootCause,
          risk_level: currentDiagnosis.riskLevel,
        } : undefined)
      );

      const assistantMsg: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString(),
        responsePayload: response,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AssistantMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: `Error processing query: ${err?.message || 'Unable to reach assistant service.'}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Conversation buffer cleared. Active spacecraft: **${currentSat.name}** (${currentSat.id}). How can I assist with your mission?`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  return (
    <div
      className={`rounded-xl flex flex-col font-sans relative overflow-hidden ${className}`}
      style={{
        background: '#000000',
        border: '1px solid #1E293B',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* ── HEADER BAR ── */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-black/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#00BFFF]/10 border border-[#00BFFF]/30 flex items-center justify-center text-[#00BFFF]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#F1F5F9]">
                AI MISSION ASSISTANT
              </h3>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                STEP 26 ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8]">
              Context: <span className="text-[#00BFFF] font-bold">{currentSat.name}</span> ({currentSat.id}) · Decision Support Layer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowWhatIfSection((prev) => !prev)}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer border ${
              showWhatIfSection
                ? 'bg-[#00BFFF]/20 text-[#38BDF8] border-[#00BFFF]/40'
                : 'bg-white/5 text-[#94A3B8] border-white/10 hover:text-white'
            }`}
            title="Toggle What-If Scenario Analysis Section"
          >
            <TrendingUp className="w-3 h-3 text-[#00BFFF]" />
            <span>WHAT-IF</span>
          </button>
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/10 transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── STEP 27 WHAT-IF SCENARIO PROJECTION SECTION ── */}
      {showWhatIfSection && (
        <div className="px-3.5 py-3 border-b border-[#00BFFF]/20 bg-[#020612]/90 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#00BFFF]" />
              <span className="text-[10px] font-mono font-bold uppercase text-[#38BDF8] tracking-wider">
                WHAT-IF SCENARIO ANALYSIS · {currentSat.name}
              </span>
            </div>
            <span className="text-[9px] font-mono text-[#64748B]">
              Deterministic Projection
            </span>
          </div>

          {/* Parameter & Horizon Selector Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'temperature_c', label: 'Thermal' },
                { id: 'battery_soc_percent', label: 'Battery' },
                { id: 'voltage_v', label: 'Voltage' },
                { id: 'current_a', label: 'Current' },
                { id: 'communication_signal_db', label: 'RF Signal' },
                { id: 'attitude_error_deg', label: 'Attitude' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedWhatIfParam(item.id)}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold transition-all cursor-pointer border ${
                    selectedWhatIfParam === item.id
                      ? 'bg-[#00BFFF] text-black border-[#00BFFF]'
                      : 'bg-white/5 text-[#94A3B8] border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 font-mono text-[9px] text-[#94A3B8]">
              <span className="text-[#64748B]">Horizon:</span>
              {[5, 10, 15, 30].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setWhatIfHorizon(h)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    whatIfHorizon === h
                      ? 'bg-purple-500/30 text-purple-300 font-bold border border-purple-500/50'
                      : 'bg-white/5 text-[#64748B] hover:text-white'
                  }`}
                >
                  T+{h}m
                </button>
              ))}
            </div>
          </div>

          {/* Live What-If Result Display Card */}
          {whatIfResult && (
            <div className="p-2.5 rounded-lg bg-black/70 border border-white/10 text-xs font-sans space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <span>If current {whatIfResult.parameter.toLowerCase()} trend continues...</span>
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">
                    Current: <span className="text-white font-bold">{whatIfResult.current_value !== null ? `${whatIfResult.current_value} ${whatIfResult.unit}` : 'N/A'}</span> · Trend: <span className="text-[#38BDF8] font-bold">{whatIfResult.trend_slope_formatted}</span> · Limit: <span className="text-[#F59E0B] font-bold">{whatIfResult.operational_threshold !== null ? `${whatIfResult.operational_threshold} ${whatIfResult.unit}` : 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 font-mono">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                      whatIfResult.projected_risk === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : whatIfResult.projected_risk === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    }`}
                  >
                    PROJECTED: {whatIfResult.projected_risk}
                  </span>
                </div>
              </div>

              {/* Projection Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[9.5px]">
                <div className="p-1.5 rounded bg-white/[0.03] border border-white/5">
                  <span className="text-[#64748B] block text-[8.5px]">PROJECTED AT T+{whatIfHorizon}m</span>
                  <span className="text-white font-bold">{whatIfResult.projected_value !== null ? `${whatIfResult.projected_value} ${whatIfResult.unit}` : 'N/A'}</span>
                </div>
                <div className="p-1.5 rounded bg-white/[0.03] border border-white/5">
                  <span className="text-[#64748B] block text-[8.5px]">TIME TO THRESHOLD</span>
                  <span className="text-[#38BDF8] font-bold">{whatIfResult.estimated_time_formatted}</span>
                </div>
                <div className="p-1.5 rounded bg-white/[0.03] border border-white/5">
                  <span className="text-[#64748B] block text-[8.5px]">CURRENT RISK</span>
                  <span className="text-white font-bold">{whatIfResult.current_risk}</span>
                </div>
                <div className="p-1.5 rounded bg-white/[0.03] border border-white/5">
                  <span className="text-[#64748B] block text-[8.5px]">SCENARIO STATUS</span>
                  <span className="text-[#A78BFA] font-bold">{whatIfResult.scenario_status}</span>
                </div>
              </div>

              {/* Why & Recommended Action */}
              <div className="space-y-1 text-[10.5px] border-t border-white/5 pt-1.5">
                <p className="text-[#CBD5E1]">
                  <span className="font-bold text-[#38BDF8]">Why: </span>{whatIfResult.explanation}
                </p>
                <p className="text-[#94A3B8]">
                  <span className="font-bold text-emerald-400">Action: </span>{whatIfResult.recommended_action}
                </p>
              </div>

              {/* Quick Query CTA */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleSendQuery(`What if ${whatIfResult.parameter.toLowerCase()} continues at current trend?`)}
                  className="text-[9.5px] font-mono text-[#00BFFF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Ask Assistant about this projection</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── QUICK QUESTIONS CHIPS ── */}
      <div className="px-3.5 py-2 border-b border-white/[0.06] bg-[#030712] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[9.5px] font-mono font-bold text-[#64748B] uppercase shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#00BFFF]" /> Quick:
        </span>
        {QUICK_QUESTIONS.map((q) => {
          const Icon = q.icon;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => handleSendQuery(q.label)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white/[0.04] hover:bg-white/[0.08] text-[#CBD5E1] hover:text-[#F8FAFC] border border-white/10 hover:border-[#00BFFF]/40 transition-all shrink-0 cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
            >
              <Icon className="w-2.5 h-2.5" style={{ color: q.color }} />
              <span>{q.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── CONVERSATION STREAM BODY ── */}
      <div className="flex-1 p-3.5 space-y-3 overflow-y-auto custom-scrollbar min-h-[260px] max-h-[500px]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const p = msg.responsePayload;

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded-md bg-[#00BFFF]/10 border border-[#00BFFF]/30 flex items-center justify-center text-[#00BFFF] shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#00BFFF]/15 border border-[#00BFFF]/30 text-[#F1F5F9]'
                    : msg.isError
                    ? 'bg-red-500/10 border border-red-500/30 text-red-200'
                    : 'bg-[#050811] border border-white/10 text-[#E2E8F0]'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-white/5 text-[9.5px] text-[#94A3B8]">
                  <span className="font-mono font-bold uppercase text-[#38BDF8]">
                    {isUser ? 'Flight Operator' : `AI Assistant · ${p?.satellite_name || currentSat.name}`}
                  </span>
                  <span className="font-mono">{msg.timestamp}</span>
                </div>

                {/* Message Body Content */}
                <div className="whitespace-pre-wrap font-sans space-y-1.5">
                  {msg.text}
                </div>

                {/* Structured Payload Badges (if present) */}
                {p && !isUser && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 font-mono text-[9px]">
                    <span
                      className={`px-1.5 py-0.5 rounded border font-bold ${
                        p.risk_level === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border-red-500/40'
                          : p.risk_level === 'HIGH' || p.risk_level === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}
                    >
                      RISK: {p.risk_level}
                    </span>

                    {p.prediction?.score !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#94A3B8]">
                        SCORE: {p.prediction.score >= 0 ? '+' : ''}{p.prediction.score.toFixed(4)}
                      </span>
                    )}

                    {p.root_cause?.subsystem && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
                        ROOT: {p.root_cause.subsystem}
                      </span>
                    )}

                    {p.mission_impact?.urgency && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300">
                        URGENCY: {p.mission_impact.urgency}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-6 h-6 rounded-md bg-[#1E293B] border border-white/20 flex items-center justify-center text-[#94A3B8] shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 justify-start animate-pulse">
            <div className="w-6 h-6 rounded-md bg-[#00BFFF]/10 border border-[#00BFFF]/30 flex items-center justify-center text-[#00BFFF] shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-2.5 rounded-xl bg-[#050811] border border-white/10 text-xs text-[#94A3B8] font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-ping" />
              <span>Grounding query in live {currentSat.name} telemetry & ML analysis...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT PROMPT BAR ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery();
        }}
        className="p-3 bg-[#03060E] border-t border-white/[0.08] flex items-center gap-2 shrink-0"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={`Ask about ${currentSat.name} (e.g. 'Why is risk high?', 'Show margins')...`}
            disabled={isLoading}
            className="w-full bg-[#090D18] border border-white/15 focus:border-[#00BFFF] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none font-sans transition-colors disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading}
          className="px-3.5 py-2 rounded-lg bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,191,255,0.3)] shrink-0"
        >
          <span>SEND</span>
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
