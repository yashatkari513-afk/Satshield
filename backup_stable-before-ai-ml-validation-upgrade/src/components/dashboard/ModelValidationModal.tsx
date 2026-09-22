import React, { useState, useMemo } from 'react';
import {
  Brain,
  ShieldCheck,
  Activity,
  Zap,
  BarChart3,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  X,
  Layers,
  ChevronRight,
  Sparkles,
  Info,
  Radio,
  FileCode2,
} from 'lucide-react';
import {
  runModelValidation,
  generateValidationDataset,
  ValidationReport,
  ValidationSample,
  SampleEvaluationResult,
} from '../../services/modelValidationService';

interface ModelValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelValidationModal: React.FC<ModelValidationModalProps> = ({ isOpen, onClose }) => {
  const [threshold, setThreshold] = useState<number>(0.35);
  const [activeTab, setActiveTab] = useState<'metrics' | 'subsystems' | 'sweep' | 'samples'>('metrics');
  const [sampleFilter, setSampleFilter] = useState<'ALL' | 'TP' | 'TN' | 'FP' | 'FN'>('ALL');
  const [selectedSample, setSelectedSample] = useState<SampleEvaluationResult | null>(null);
  const [isReRunning, setIsReRunning] = useState<boolean>(false);
  const [runCount, setRunCount] = useState<number>(1);

  // Re-run validation whenever threshold or runCount changes
  const report: ValidationReport = useMemo(() => {
    return runModelValidation({ threshold });
  }, [threshold, runCount]);

  if (!isOpen) return null;

  const handleReRun = () => {
    setIsReRunning(true);
    setTimeout(() => {
      setRunCount((c) => c + 1);
      setIsReRunning(false);
    }, 250);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `satshield_model_validation_report_th${Math.round(threshold * 100)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredSamples = report.sampleDetails.filter((item) => {
    if (sampleFilter === 'ALL') return true;
    return item.classificationCategory === sampleFilter;
  });

  const { truePositives: tp, trueNegatives: tn, falsePositives: fp, falseNegatives: fn } = report.confusionMatrix;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn select-none font-sans">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: '#04060A',
          border: '1px solid rgba(0, 191, 255, 0.4)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(0, 191, 255, 0.2)',
        }}
      >
        {/* ── 1. MODAL HEADER ── */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#070B12]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#00BFFF]/10 border border-[#00BFFF]/40 text-[#00BFFF] shadow-[0_0_12px_rgba(0,191,255,0.3)]">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#F1F5F9] flex items-center gap-2">
                  <span>AI/ML MODEL VALIDATION & PERFORMANCE METRICS</span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black bg-[#00BFFF] text-black tracking-widest leading-none">
                    BENCHMARK
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                Empirical quantitative evaluation of SATSHIELD anomaly detection engine on labeled telemetry dataset.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReRun}
              disabled={isReRunning}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/20 text-xs font-bold text-[#38BDF8] flex items-center gap-1.5 transition-all cursor-pointer"
              title="Re-execute benchmark inference stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReRunning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">LIVE BENCHMARK</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 rounded-lg bg-[#00BFFF] hover:bg-[#00BFFF]/90 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,191,255,0.3)]"
              title="Export report JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EXPORT</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── 2. DATASET DECLARATION BANNER ── */}
        <div className="px-5 py-2.5 bg-[#090D16] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono text-[10px] font-bold">
              {report.datasetTag}
            </span>
            <span className="text-[#94A3B8]">
              Evaluated on <strong className="text-white">{report.totalSamples} labeled frames</strong> ({report.normalSamples} Nominal, {report.anomalySamples} Injected Anomalies)
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-[#94A3B8]">
            <div>
              ENGINE: <span className="text-[#38BDF8] font-bold">STATISTICAL Z-SCORE + ENVELOPE</span>
            </div>
            <div className="hidden md:block">
              LATENCY: <span className="text-[#4ADE80] font-bold">{report.latency.averageLatencyMs.toFixed(3)} ms/sample</span>
            </div>
            <div className="hidden lg:block">
              THROUGHPUT: <span className="text-[#4ADE80] font-bold">{Math.round(report.latency.throughputSamplesPerSec).toLocaleString()} samples/sec</span>
            </div>
          </div>
        </div>

        {/* ── 3. TAB SELECTOR ── */}
        <div className="px-5 pt-3 pb-2 border-b border-white/10 bg-[#06090F] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'metrics'
                  ? 'bg-[#00BFFF] text-black shadow-[0_0_12px_rgba(0,191,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>CONFUSION MATRIX & METRICS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subsystems')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'subsystems'
                  ? 'bg-[#00BFFF] text-black shadow-[0_0_12px_rgba(0,191,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>SUBSYSTEM BREAKDOWN</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sweep')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sweep'
                  ? 'bg-[#00BFFF] text-black shadow-[0_0_12px_rgba(0,191,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>THRESHOLD SENSITIVITY (ROC)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('samples')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'samples'
                  ? 'bg-[#00BFFF] text-black shadow-[0_0_12px_rgba(0,191,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>TELEMETRY INSPECTOR</span>
            </button>
          </div>

          {/* Threshold Quick Slider */}
          <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-lg border border-white/10 shrink-0">
            <span className="text-[10.5px] text-[#94A3B8] font-bold uppercase">THRESHOLD:</span>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-20 sm:w-28 accent-[#00BFFF] cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-[#00BFFF] w-8">
              {threshold.toFixed(2)}
            </span>
          </div>
        </div>

        {/* ── 4. SCROLLABLE TAB BODY ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar space-y-4">
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: CONFUSION MATRIX & CORE METRICS                         */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'metrics' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {/* Accuracy */}
                <div className="p-3 rounded-xl bg-black/70 border border-white/15 flex flex-col justify-between">
                  <div className="text-[10px] uppercase font-bold text-[#94A3B8]">Accuracy</div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#F1F5F9] my-1">
                    {(report.accuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono">
                    {tp + tn} / {report.totalSamples} correct
                  </div>
                </div>

                {/* Precision */}
                <div className="p-3 rounded-xl bg-black/70 border border-cyan-500/30 flex flex-col justify-between shadow-[0_0_15px_rgba(0,191,255,0.1)]">
                  <div className="text-[10px] uppercase font-bold text-[#00BFFF]">Precision (PPV)</div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#00BFFF] my-1">
                    {(report.precision * 100).toFixed(1)}%
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono">
                    TP / (TP + FP) = {tp}/{tp + fp}
                  </div>
                </div>

                {/* Recall / Sensitivity */}
                <div className="p-3 rounded-xl bg-black/70 border border-emerald-500/30 flex flex-col justify-between shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <div className="text-[10px] uppercase font-bold text-[#10B981]">Recall (Sensitivity)</div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#10B981] my-1">
                    {(report.recall * 100).toFixed(1)}%
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono">
                    TP / (TP + FN) = {tp}/{tp + fn}
                  </div>
                </div>

                {/* F1 Score */}
                <div className="p-3 rounded-xl bg-black/70 border border-purple-500/30 flex flex-col justify-between shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                  <div className="text-[10px] uppercase font-bold text-[#C084FC]">F1-Score</div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#C084FC] my-1">
                    {report.f1Score.toFixed(4)}
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono">
                    Harmonic mean (P, R)
                  </div>
                </div>

                {/* False Positive Rate */}
                <div className="p-3 rounded-xl bg-black/70 border border-amber-500/30 flex flex-col justify-between">
                  <div className="text-[10px] uppercase font-bold text-[#F59E0B]">False Alarm (FPR)</div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#F59E0B] my-1">
                    {(report.falsePositiveRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono">
                    FP = {fp} / {report.normalSamples} norm
                  </div>
                </div>

                {/* False Negative Rate */}
                <div className="p-3 rounded-xl bg-black/70 border border-rose-500/30 flex flex-col justify-between">
                  <div className="text-[10px] uppercase font-bold text-[#F43F5E]">Miss Rate (FNR)</div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-[#F43F5E] my-1">
                    {(report.falseNegativeRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono">
                    FN = {fn} / {report.anomalySamples} anom
                  </div>
                </div>
              </div>

              {/* Confusion Matrix Visualizer + Score Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* 2x2 Matrix Card */}
                <div className="lg:col-span-7 p-4 rounded-xl bg-black/80 border border-white/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#00BFFF]" />
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                        EMPIRICAL CONFUSION MATRIX
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Threshold: <strong className="text-[#00BFFF]">{threshold.toFixed(2)}</strong>
                    </span>
                  </div>

                  {/* 2x2 Visual Table */}
                  <div className="p-3 rounded-lg bg-[#020306] border border-white/10 overflow-x-auto">
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 text-[10px] text-slate-500 font-mono"></th>
                          <th colSpan={2} className="p-1.5 text-[11px] font-bold text-[#00BFFF] uppercase tracking-wider border-b border-white/10">
                            PREDICTED BY SATSHIELD
                          </th>
                        </tr>
                        <tr>
                          <th className="p-2 text-[10px] text-slate-500 font-mono text-left">ACTUAL GROUND TRUTH</th>
                          <th className="p-2 text-[11px] font-bold text-slate-300 font-mono bg-white/[0.02] border-r border-white/10">
                            PREDICTED NORMAL
                          </th>
                          <th className="p-2 text-[11px] font-bold text-slate-300 font-mono bg-white/[0.02]">
                            PREDICTED ANOMALY
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Row 1: Actual Normal */}
                        <tr className="border-b border-white/10">
                          <td className="p-2.5 text-left font-bold text-xs text-slate-300 bg-white/[0.02]">
                            <div className="font-mono text-[11px]">ACTUAL NORMAL</div>
                            <div className="text-[9px] text-slate-500">{report.normalSamples} samples</div>
                          </td>
                          {/* TRUE NEGATIVE */}
                          <td className="p-3 bg-emerald-500/10 border-r border-white/10">
                            <div className="text-lg font-black font-mono text-emerald-400">{tn}</div>
                            <div className="text-[10px] font-bold uppercase text-emerald-300 mt-0.5">
                              TRUE NEGATIVE (TN)
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              {((tn / report.normalSamples) * 100).toFixed(1)}% of normal
                            </div>
                          </td>
                          {/* FALSE POSITIVE */}
                          <td className="p-3 bg-amber-500/10">
                            <div className="text-lg font-black font-mono text-amber-400">{fp}</div>
                            <div className="text-[10px] font-bold uppercase text-amber-300 mt-0.5">
                              FALSE POSITIVE (FP)
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              False alarms
                            </div>
                          </td>
                        </tr>

                        {/* Row 2: Actual Anomaly */}
                        <tr>
                          <td className="p-2.5 text-left font-bold text-xs text-slate-300 bg-white/[0.02]">
                            <div className="font-mono text-[11px]">ACTUAL ANOMALY</div>
                            <div className="text-[9px] text-slate-500">{report.anomalySamples} samples</div>
                          </td>
                          {/* FALSE NEGATIVE */}
                          <td className="p-3 bg-rose-500/10 border-r border-white/10">
                            <div className="text-lg font-black font-mono text-rose-400">{fn}</div>
                            <div className="text-[10px] font-bold uppercase text-rose-300 mt-0.5">
                              FALSE NEGATIVE (FN)
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              Missed anomalies
                            </div>
                          </td>
                          {/* TRUE POSITIVE */}
                          <td className="p-3 bg-cyan-500/15">
                            <div className="text-lg font-black font-mono text-[#38BDF8]">{tp}</div>
                            <div className="text-[10px] font-bold uppercase text-cyan-300 mt-0.5">
                              TRUE POSITIVE (TP)
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              {((tp / report.anomalySamples) * 100).toFixed(1)}% detected
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[10.5px] text-[#94A3B8] leading-relaxed">
                    <strong>Interpretation:</strong> The detector correctly caught <strong className="text-white">{tp}</strong> of {report.anomalySamples} anomalies with <strong className="text-white">{fn}</strong> missed detections. False alarms are quantified at {fp} instances on baseline telemetry.
                  </p>
                </div>

                {/* Score Separation & Latency Card */}
                <div className="lg:col-span-5 p-4 rounded-xl bg-black/80 border border-white/20 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                        ANOMALY SCORE SEPARATION
                      </h3>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Statistical separation between nominal and anomalous telemetry frames:
                    </p>

                    <div className="space-y-3 mt-3">
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span className="text-emerald-400 font-bold">NOMINAL MEAN SCORE:</span>
                          <span className="text-white font-bold">{report.meanAnomalyScoreNormal.toFixed(4)}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, report.meanAnomalyScoreNormal * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span className="text-rose-400 font-bold">ANOMALY MEAN SCORE:</span>
                          <span className="text-white font-bold">{report.meanAnomalyScoreAnomaly.toFixed(4)}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, report.meanAnomalyScoreAnomaly * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Benchmark Latency Box */}
                  <div className="p-3 rounded-lg bg-[#070C15] border border-cyan-500/20 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[#94A3B8] font-mono">
                      <span>INFERENCE EXECUTION:</span>
                      <span className="text-white font-bold">{report.latency.totalExecutionTimeMs.toFixed(1)} ms total</span>
                    </div>
                    <div className="flex items-center justify-between text-[#94A3B8] font-mono">
                      <span>AVERAGE LATENCY:</span>
                      <span className="text-[#38BDF8] font-bold">{report.latency.averageLatencyMs.toFixed(3)} ms / frame</span>
                    </div>
                    <div className="flex items-center justify-between text-[#94A3B8] font-mono">
                      <span>PROCESSING RATE:</span>
                      <span className="text-[#4ADE80] font-bold">{Math.round(report.latency.throughputSamplesPerSec).toLocaleString()} frames/sec</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 2: SUBSYSTEM BREAKDOWN                                     */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'subsystems' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-black/80 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#00BFFF]" />
                      <span>PER-SUBSYSTEM DETECTION PERFORMANCE</span>
                    </h3>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Empirical evaluation across all 6 monitored satellite subsystems.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#00BFFF] font-bold">
                    {report.subsystemBreakdown.length} SUBSYSTEMS EVALUATED
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/15 text-slate-400 text-[11px]">
                        <th className="py-2.5 px-3">SUBSYSTEM</th>
                        <th className="py-2.5 px-3 text-center">TOTAL FRAMES</th>
                        <th className="py-2.5 px-3 text-center">ANOMALY FRAMES</th>
                        <th className="py-2.5 px-3 text-center">DETECTED (TP)</th>
                        <th className="py-2.5 px-3 text-center">MISSED (FN)</th>
                        <th className="py-2.5 px-3 text-right">RECALL (RATE)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {report.subsystemBreakdown.map((sub) => {
                        const recallPct = (sub.recall * 100).toFixed(1);
                        const isPerfect = sub.recall === 1;

                        return (
                          <tr key={sub.subsystem} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#00BFFF]" />
                              <span>{sub.subsystem}</span>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-300">{sub.totalSamples}</td>
                            <td className="py-3 px-3 text-center text-amber-400 font-bold">{sub.anomalySamples}</td>
                            <td className="py-3 px-3 text-center text-emerald-400 font-bold">{sub.correctlyDetected}</td>
                            <td className="py-3 px-3 text-center text-rose-400 font-bold">{sub.missed}</td>
                            <td className="py-3 px-3 text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isPerfect
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                }`}
                              >
                                {recallPct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 3: THRESHOLD SENSITIVITY (ROC / SWEEP)                    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'sweep' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl bg-black/80 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      <span>THRESHOLD SENSITIVITY SWEEP (0.10 → 0.90)</span>
                    </h3>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Quantifies the trade-off between Precision and Recall across varying anomaly decision thresholds.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/15 text-slate-400 text-[11px]">
                        <th className="py-2.5 px-3">THRESHOLD</th>
                        <th className="py-2.5 px-3 text-center">TP</th>
                        <th className="py-2.5 px-3 text-center">FP (ALARMS)</th>
                        <th className="py-2.5 px-3 text-center">FN (MISSED)</th>
                        <th className="py-2.5 px-3 text-center">PRECISION</th>
                        <th className="py-2.5 px-3 text-center">RECALL</th>
                        <th className="py-2.5 px-3 text-center">F1-SCORE</th>
                        <th className="py-2.5 px-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {report.thresholdSweep.map((pt) => {
                        const isCurrent = Math.abs(pt.threshold - threshold) < 0.01;

                        return (
                          <tr
                            key={pt.threshold}
                            className={`transition-colors ${
                              isCurrent ? 'bg-[#00BFFF]/10 border-l-2 border-[#00BFFF]' : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-bold text-white">
                              {pt.threshold.toFixed(2)} {isCurrent && <span className="text-[9px] text-[#00BFFF] uppercase font-bold">(ACTIVE)</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{pt.tp}</td>
                            <td className="py-2.5 px-3 text-center text-amber-400 font-bold">{pt.fp}</td>
                            <td className="py-2.5 px-3 text-center text-rose-400 font-bold">{pt.fn}</td>
                            <td className="py-2.5 px-3 text-center text-cyan-300">{(pt.precision * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-center text-emerald-300">{(pt.recall * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-center text-purple-300 font-bold">{pt.f1Score.toFixed(4)}</td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setThreshold(pt.threshold)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                  isCurrent
                                    ? 'bg-[#00BFFF] text-black'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                              >
                                SET
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 4: SAMPLE TELEMETRY INSPECTOR                             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'samples' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Category Filter Pills */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[#94A3B8] font-bold uppercase text-[10px]">FILTER:</span>
                  {(['ALL', 'TP', 'TN', 'FP', 'FN'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSampleFilter(cat)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        sampleFilter === cat
                          ? 'bg-[#00BFFF] text-black shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      {cat} ({cat === 'ALL' ? report.totalSamples : report.sampleDetails.filter((s) => s.classificationCategory === cat).length})
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Showing {filteredSamples.length} frames
                </span>
              </div>

              {/* Sample list grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto custom-scrollbar p-1">
                {filteredSamples.slice(0, 40).map((item) => {
                  const isSelected = selectedSample?.sample.id === item.sample.id;
                  const cat = item.classificationCategory;
                  const catColor = cat === 'TP' ? '#38BDF8' : cat === 'TN' ? '#4ADE80' : cat === 'FP' ? '#FBBF24' : '#FB7185';

                  return (
                    <div
                      key={item.sample.id}
                      onClick={() => setSelectedSample(item)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected ? 'bg-white/10' : 'bg-black/60 hover:bg-white/5'
                      }`}
                      style={{
                        borderColor: isSelected ? catColor : 'rgba(255,255,255,0.12)',
                      }}
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                        <span className="font-mono text-[11px] font-bold text-white">
                          {item.sample.id} ({item.sample.satelliteName})
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                          style={{
                            backgroundColor: `${catColor}20`,
                            color: catColor,
                            border: `1px solid ${catColor}50`,
                          }}
                        >
                          {cat} · SCORE {item.prediction.anomalyScore.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-1.5 truncate">
                        {item.sample.description}
                      </p>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-2">
                        <span>Actual: <strong className="text-white">{item.sample.groundTruthLabel}</strong></span>
                        <span>Predicted: <strong className="text-white">{item.predictedIsAnomaly ? 'ANOMALY' : 'NORMAL'}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inspector Detail Box */}
              {selectedSample && (
                <div className="p-4 rounded-xl bg-black/90 border border-white/25 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <span className="font-bold text-white text-sm">
                      SAMPLE DETAIL: {selectedSample.sample.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSample(null)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div>VOLTAGE: <strong className="text-white">{selectedSample.sample.telemetry.voltage} V</strong></div>
                    <div>CURRENT: <strong className="text-white">{selectedSample.sample.telemetry.current} A</strong></div>
                    <div>TEMP: <strong className="text-white">{selectedSample.sample.telemetry.temperature} °C</strong></div>
                    <div>BATTERY: <strong className="text-white">{selectedSample.sample.telemetry.batteryLevel} %</strong></div>
                  </div>
                  <div className="text-[#94A3B8] text-[11px] pt-1">
                    <strong>Detection Reason:</strong> {selectedSample.prediction.explanation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 5. MODAL FOOTER ── */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#070B12] flex items-center justify-between">
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
            <span>SATSHIELD AI BENCHMARK ENGINE v4.2</span>
            <span>·</span>
            <span className="text-emerald-400">MATHEMATICALLY VERIFIED</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
