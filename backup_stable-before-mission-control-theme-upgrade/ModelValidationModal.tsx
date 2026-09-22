import React, { useState, useMemo, useEffect } from 'react';
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
  RotateCcw,
  Check,
  Target,
  Cpu,
  Database,
  Gauge,
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import {
  runModelValidation,
  ValidationReport,
  SampleEvaluationResult,
} from '../../services/modelValidationService';

interface ModelValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelValidationModal: React.FC<ModelValidationModalProps> = ({ isOpen, onClose }) => {
  const { anomalyThreshold, setAnomalyThreshold } = useSimulation();

  const [sliderValue, setSliderValue] = useState<number>(anomalyThreshold || 0.35);
  const [activeTab, setActiveTab] = useState<'metrics' | 'sweep' | 'subsystems' | 'samples'>('metrics');
  const [sampleFilter, setSampleFilter] = useState<'ALL' | 'TP' | 'TN' | 'FP' | 'FN'>('ALL');
  const [selectedSample, setSelectedSample] = useState<SampleEvaluationResult | null>(null);
  const [validationState, setValidationState] = useState<'IDLE' | 'RUNNING' | 'COMPLETE'>('IDLE');
  const [runCounter, setRunCounter] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize local slider if context anomalyThreshold updates externally
  useEffect(() => {
    setSliderValue(anomalyThreshold);
  }, [anomalyThreshold]);

  // Show transient toast feedback
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Re-run validation whenever anomalyThreshold or runCounter changes
  const report: ValidationReport = useMemo(() => {
    return runModelValidation({ threshold: anomalyThreshold });
  }, [anomalyThreshold, runCounter]);

  if (!isOpen) return null;

  // Real RUN VALIDATION handler executing actual detector over all benchmark samples
  const handleRunValidation = () => {
    setValidationState('RUNNING');
    showToast('⚡ Running live empirical validation across 208 benchmark telemetry frames...');
    
    setTimeout(() => {
      setRunCounter((c) => c + 1);
      setValidationState('COMPLETE');
      showToast('✓ Validation complete: 208 frames evaluated against detector');
      
      setTimeout(() => {
        setValidationState('IDLE');
      }, 2500);
    }, 500);
  };

  // Real RESET THRESHOLD handler (Restores default 0.35 threshold)
  const handleResetThreshold = () => {
    const defaultTh = 0.35;
    setSliderValue(defaultTh);
    setAnomalyThreshold(defaultTh);
    showToast(`↺ Threshold reset to nominal default (${defaultTh.toFixed(2)})`);
  };

  // Real APPLY THRESHOLD handler for manual slider
  const handleApplySlider = () => {
    setAnomalyThreshold(sliderValue);
    showToast(`✓ Active threshold updated to ${sliderValue.toFixed(2)}`);
  };

  // Real SET THRESHOLD handler from table rows
  const handleSetThreshold = (targetTh: number) => {
    setSliderValue(targetTh);
    setAnomalyThreshold(targetTh);
    showToast(`✓ Threshold ${targetTh.toFixed(2)} Applied to Detector`);
  };

  // Export structured JSON report
  const handleDownloadJSON = () => {
    const exportData = {
      ...report,
      activeApplicationThreshold: anomalyThreshold,
      generatedTimestamp: new Date().toISOString(),
      formulaDefinitions: {
        precision: 'TP / (TP + FP)',
        recall: 'TP / (TP + FN)',
        f1Score: '2 * Precision * Recall / (Precision + Recall)',
        falsePositiveRate: 'FP / (FP + TN)',
        falseNegativeRate: 'FN / (FN + TP)',
        specificity: 'TN / (TN + FP)',
        detectionRate: 'TP / (TP + FN)',
        accuracy: '(TP + TN) / (TP + TN + FP + FN)',
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `satshield_model_validation_th${Math.round(anomalyThreshold * 100)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('📥 Validation report exported as JSON');
  };

  const filteredSamples = report.sampleDetails.filter((item) => {
    if (sampleFilter === 'ALL') return true;
    return item.classificationCategory === sampleFilter;
  });

  const { truePositives: tp, trueNegatives: tn, falsePositives: fp, falseNegatives: fn } = report.confusionMatrix;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn select-none font-sans">
      <div
        className="relative w-full max-w-5xl max-h-[94vh] rounded-2xl flex flex-col overflow-hidden bg-white border border-slate-300 shadow-[0_25px_70px_rgba(0,0,0,0.35)]"
      >
        {/* ── TOAST NOTIFICATION BANNER ── */}
        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900 border border-sky-400 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-xl animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── 1. MODAL HEADER (PROFESSIONAL WHITE BACKGROUND WITH ACCENTS) ── */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-300 flex items-center justify-between bg-gradient-to-r from-white via-sky-50/50 to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md p-0.5">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-600 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span>AI/ML MODEL VALIDATION & PERFORMANCE METRICS</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-black bg-gradient-to-r from-sky-500 to-blue-600 text-white tracking-widest leading-none shadow-sm">
                  VALIDATION CONSOLE
                </span>
              </div>
              <p className="text-[11.5px] text-slate-600 mt-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Scientific empirical validation of SATSHIELD anomaly detection engine on labeled multi-orbit telemetry benchmark.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* COLORFUL RUN VALIDATION Button with 3-State UX */}
            <button
              type="button"
              onClick={handleRunValidation}
              disabled={validationState === 'RUNNING'}
              className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-75 ${
                validationState === 'COMPLETE'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 ring-2 ring-emerald-300 border border-emerald-700'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border border-emerald-600'
              }`}
              title="Run live empirical validation across all 208 benchmark frames"
            >
              {validationState === 'RUNNING' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>VALIDATING...</span>
                </>
              ) : validationState === 'COMPLETE' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>VALIDATION COMPLETE</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                  <span>RUN VALIDATION</span>
                </>
              )}
            </button>

            {/* COLORFUL RESET Button (Purple/Violet Glow) */}
            <button
              type="button"
              onClick={handleResetThreshold}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-105 active:scale-95 border border-purple-700"
              title="Reset decision threshold to nominal default (0.35)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>

            {/* COLORFUL EXPORT Button (Electric Sky/Blue Glow) */}
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all border border-blue-600"
              title="Export complete validation metrics as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl bg-slate-100 hover:bg-rose-100 border border-slate-300 hover:border-rose-300 transition-all cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* ── 2. VALIDATION INFORMATION & DATASET BANNER (HONEST METADATA) ── */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-mono text-[10px] font-black shadow-sm">
              {report.datasetTag}
            </span>
            <span className="text-slate-700">
              Dataset: <strong className="text-blue-700 font-bold">Synthetic/Simulated Telemetry</strong> ({report.totalSamples} samples · <span className="text-emerald-700 font-bold">{report.normalSamples} Nominal</span> / <span className="text-rose-700 font-bold">{report.anomalySamples} Anomalous</span>)
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-600">DATA QUALITY:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {report.dataQuality}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-700 flex-wrap">
            <div className="bg-white px-2.5 py-0.5 rounded-lg border border-slate-300 shadow-xs">
              <span className="text-sky-700 font-bold">METHOD:</span> <span className="text-slate-900 font-black">STATISTICAL Z-SCORE + ENVELOPE</span>
            </div>
            <div className="hidden md:flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-lg border border-slate-300 shadow-xs">
              <span className="text-amber-700 font-bold">THRESHOLD:</span> <span className="text-amber-900 font-black">{anomalyThreshold.toFixed(2)}</span>
            </div>
            <div className="hidden lg:flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-lg border border-slate-300 shadow-xs">
              <span className="text-emerald-700 font-bold">LATENCY:</span> <span className="text-emerald-900 font-black">{report.latency.averageLatencyMs.toFixed(3)} ms/sample</span>
            </div>
            <div className="hidden xl:flex items-center gap-1 bg-white px-2.5 py-0.5 rounded-lg border border-slate-300 shadow-xs">
              <span className="text-slate-600 font-bold">STATUS:</span> <span className="text-emerald-700 font-black">VALIDATION READY</span>
            </div>
          </div>
        </div>

        {/* ── 3. PROFESSIONAL TAB SELECTOR & THRESHOLD CONTROLLER ── */}
        <div className="px-4 sm:px-6 pt-3 pb-2.5 border-b border-slate-300 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {/* Tab 1: Performance & Confusion Matrix (Cyan/Blue Theme) */}
            <button
              type="button"
              onClick={() => setActiveTab('metrics')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
                activeTab === 'metrics'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-blue-600 shadow-md scale-102 ring-2 ring-blue-300'
                  : 'bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-blue-700 border-slate-300'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>PERFORMANCE & CONFUSION MATRIX</span>
            </button>

            {/* Tab 2: Threshold Sensitivity ROC (Purple/Pink Theme) */}
            <button
              type="button"
              onClick={() => setActiveTab('sweep')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
                activeTab === 'sweep'
                  ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white border-purple-600 shadow-md scale-102 ring-2 ring-purple-300'
                  : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border-slate-300'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>THRESHOLD SENSITIVITY (ROC)</span>
            </button>

            {/* Tab 3: Subsystem Breakdown (Amber/Orange Theme) */}
            <button
              type="button"
              onClick={() => setActiveTab('subsystems')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
                activeTab === 'subsystems'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600 shadow-md scale-102 ring-2 ring-amber-300'
                  : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>SUBSYSTEM BREAKDOWN</span>
            </button>

            {/* Tab 4: Telemetry Inspector (Emerald/Teal Theme) */}
            <button
              type="button"
              onClick={() => setActiveTab('samples')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
                activeTab === 'samples'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-600 shadow-md scale-102 ring-2 ring-emerald-300'
                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-300'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>TELEMETRY INSPECTOR</span>
            </button>
          </div>

          {/* Interactive Threshold Control Bar on White */}
          <div className="flex items-center gap-2.5 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-300 shadow-xs shrink-0">
            <span className="text-[11px] text-slate-800 font-black uppercase tracking-wide flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              THRESHOLD:
            </span>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={sliderValue}
              onChange={(e) => setSliderValue(parseFloat(e.target.value))}
              className="w-20 sm:w-28 accent-blue-600 cursor-pointer h-1.5 bg-slate-300 rounded-lg"
            />
            <span className="text-xs font-mono font-black text-blue-800 bg-white px-2.5 py-0.5 rounded-lg border border-blue-300 shadow-xs">
              {sliderValue.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={handleApplySlider}
              className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer shadow-sm border ${
                sliderValue === anomalyThreshold
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-blue-600 hover:scale-105'
              }`}
            >
              {sliderValue === anomalyThreshold ? '✓ ACTIVE' : 'APPLY'}
            </button>
          </div>
        </div>

        {/* ── 4. SCROLLABLE TAB BODY (CLEAN WHITE BACKGROUND WITH CRISP BORDERS) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar space-y-4 bg-slate-50/50">
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: MODEL PERFORMANCE & CONFUSION MATRIX                   */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'metrics' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Vibrant 7-KPI Grid (Crisp Professional Borders) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                {/* 1. Precision (Cyan/Sky) */}
                <div className="p-3.5 rounded-xl bg-white border-2 border-sky-300 flex flex-col justify-between shadow-xs hover:border-sky-500 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between pb-1 border-b border-sky-100">
                    <span className="text-[10px] uppercase font-black text-sky-800 tracking-wider">Precision (PPV)</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-sky-200" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-sky-600 my-1.5 group-hover:scale-105 transition-transform">
                    {report.totalSamples > 0 ? `${(report.precision * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-[9.5px] text-slate-600 font-mono truncate font-bold pt-1 border-t border-slate-100" title="TP / (TP + FP)">
                    TP / (TP+FP) = {tp}/{tp + fp}
                  </div>
                </div>

                {/* 2. Recall (Purple) */}
                <div className="p-3.5 rounded-xl bg-white border-2 border-purple-300 flex flex-col justify-between shadow-xs hover:border-purple-500 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between pb-1 border-b border-purple-100">
                    <span className="text-[10px] uppercase font-black text-purple-800 tracking-wider">Recall (Sens.)</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-200" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-purple-600 my-1.5 group-hover:scale-105 transition-transform">
                    {report.totalSamples > 0 ? `${(report.recall * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-[9.5px] text-slate-600 font-mono truncate font-bold pt-1 border-t border-slate-100" title="TP / (TP + FN)">
                    TP / (TP+FN) = {tp}/{tp + fn}
                  </div>
                </div>

                {/* 3. F1 Score (Teal) */}
                <div className="p-3.5 rounded-xl bg-white border-2 border-teal-300 flex flex-col justify-between shadow-xs hover:border-teal-500 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between pb-1 border-b border-teal-100">
                    <span className="text-[10px] uppercase font-black text-teal-800 tracking-wider">F1-Score</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-2 ring-teal-200" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-teal-600 my-1.5 group-hover:scale-105 transition-transform">
                    {report.totalSamples > 0 ? report.f1Score.toFixed(4) : 'N/A'}
                  </div>
                  <div className="text-[9.5px] text-slate-600 font-mono truncate font-bold pt-1 border-t border-slate-100">
                    Harmonic mean (P, R)
                  </div>
                </div>

                {/* 4. Specificity (Blue) */}
                <div className="p-3.5 rounded-xl bg-white border-2 border-blue-300 flex flex-col justify-between shadow-xs hover:border-blue-500 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between pb-1 border-b border-blue-100">
                    <span className="text-[10px] uppercase font-black text-blue-800 tracking-wider">Specificity (TNR)</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-200" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 my-1.5 group-hover:scale-105 transition-transform">
                    {report.totalSamples > 0 ? `${(report.specificity * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-[9.5px] text-slate-600 font-mono truncate font-bold pt-1 border-t border-slate-100" title="TN / (TN + FP)">
                    TN / (TN+FP) = {tn}/{tn + fp}
                  </div>
                </div>

                {/* 5. False Alarm / FPR (Amber) */}
                <div className="p-3.5 rounded-xl bg-white border-2 border-amber-300 flex flex-col justify-between shadow-xs hover:border-amber-500 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between pb-1 border-b border-amber-100">
                    <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider">False Alarm (FPR)</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 my-1.5 group-hover:scale-105 transition-transform">
                    {report.totalSamples > 0 ? `${(report.falsePositiveRate * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-[9.5px] text-slate-600 font-mono truncate font-bold pt-1 border-t border-slate-100" title="FP / (FP + TN)">
                    FP / (FP+TN) = {fp}/{fp + tn}
                  </div>
                </div>

                {/* 6. Miss Rate / FNR (Rose) */}
                <div className="p-3.5 rounded-xl bg-white border-2 border-rose-300 flex flex-col justify-between shadow-xs hover:border-rose-500 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between pb-1 border-b border-rose-100">
                    <span className="text-[10px] uppercase font-black text-rose-800 tracking-wider">Miss Rate (FNR)</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 my-1.5 group-hover:scale-105 transition-transform">
                    {report.totalSamples > 0 ? `${(report.falseNegativeRate * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-[9.5px] text-slate-600 font-mono truncate font-bold pt-1 border-t border-slate-100" title="FN / (FN + TP)">
                    FN / (FN+TP) = {fn}/{fn + tp}
                  </div>
                </div>

                {/* 7. Overall Accuracy (Emerald) */}
                <div className="p-3.5 rounded-xl bg-white border-2 border-emerald-300 flex flex-col justify-between shadow-xs hover:border-emerald-500 hover:shadow-md transition-all group col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                    <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">Accuracy</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 my-1.5 group-hover:scale-105 transition-transform">
                    {report.totalSamples > 0 ? `${(report.accuracy * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-[9.5px] text-slate-600 font-mono truncate font-bold pt-1 border-t border-slate-100">
                    {tp + tn} / {report.totalSamples} correct
                  </div>
                </div>
              </div>

              {/* Professional 2x2 Confusion Matrix + Score Separation */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* 2x2 Matrix Card on White with Professional Crisp Borders */}
                <div className="lg:col-span-7 p-4.5 rounded-2xl bg-white border border-slate-300 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                        CONFUSION MATRIX (EMPIRICAL BENCHMARK)
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[10.5px] font-mono font-black shadow-xs">
                      Active Threshold: {anomalyThreshold.toFixed(2)}
                    </span>
                  </div>

                  {/* 2x2 Matrix Visual Table with Crisp Enterprise Borders */}
                  <div className="rounded-xl border-2 border-slate-300 overflow-hidden shadow-xs bg-white">
                    <table className="w-full text-center border-collapse font-sans">
                      <thead>
                        {/* Top Grouping Header */}
                        <tr className="border-b-2 border-slate-300">
                          <th className="p-2.5 text-[11px] text-slate-500 font-mono font-bold bg-slate-100 border-r-2 border-slate-300">
                            GROUND TRUTH \ PREDICTION
                          </th>
                          <th colSpan={2} className="p-2.5 text-[11px] font-black text-blue-800 uppercase tracking-widest bg-blue-50 border-b border-blue-200">
                            PREDICTED BY SATSHIELD ANOMALY DETECTOR
                          </th>
                        </tr>
                        {/* Sub Column Headers */}
                        <tr className="border-b-2 border-slate-300 bg-slate-50 text-[11px]">
                          <th className="p-2.5 text-left text-slate-700 font-mono font-black bg-slate-100/90 border-r-2 border-slate-300">
                            ACTUAL CLASS
                          </th>
                          <th className="p-2.5 font-black text-emerald-900 font-mono bg-emerald-100/80 border-r-2 border-slate-300">
                            PREDICTED NORMAL
                          </th>
                          <th className="p-2.5 font-black text-sky-900 font-mono bg-sky-100/80">
                            PREDICTED ANOMALY
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Row 1: Actual Normal */}
                        <tr className="border-b-2 border-slate-300">
                          <td className="p-3 text-left font-bold text-xs bg-slate-50/90 border-r-2 border-slate-300">
                            <div className="font-mono text-[11.5px] text-slate-900 font-black">ACTUAL NORMAL</div>
                            <div className="text-[10px] text-emerald-800 font-mono font-bold">{report.normalSamples} frames</div>
                          </td>
                          {/* TRUE NEGATIVE (Emerald Cell with Crisp Internal Border) */}
                          <td className="p-3.5 bg-emerald-50/90 border-r-2 border-slate-300 relative group hover:bg-emerald-100/70 transition-colors">
                            <div className="text-2xl font-black font-mono text-emerald-700">{tn}</div>
                            <div className="inline-block px-2 py-0.5 rounded-md bg-emerald-200/80 border border-emerald-300 text-[10px] font-black uppercase text-emerald-900 mt-1 tracking-wider">
                              TRUE NEGATIVE (TN)
                            </div>
                            <div className="text-[10px] text-emerald-800 font-mono font-bold mt-1">
                              {((tn / report.normalSamples) * 100).toFixed(1)}% of normal baseline
                            </div>
                          </td>
                          {/* FALSE POSITIVE (Amber Cell with Crisp Internal Border) */}
                          <td className="p-3.5 bg-amber-50/90 relative group hover:bg-amber-100/70 transition-colors">
                            <div className="text-2xl font-black font-mono text-amber-700">{fp}</div>
                            <div className="inline-block px-2 py-0.5 rounded-md bg-amber-200/80 border border-amber-300 text-[10px] font-black uppercase text-amber-900 mt-1 tracking-wider">
                              FALSE POSITIVE (FP)
                            </div>
                            <div className="text-[10px] text-amber-800 font-mono font-bold mt-1">
                              False alarms (Type I Error)
                            </div>
                          </td>
                        </tr>

                        {/* Row 2: Actual Anomaly */}
                        <tr>
                          <td className="p-3 text-left font-bold text-xs bg-slate-50/90 border-r-2 border-slate-300">
                            <div className="font-mono text-[11.5px] text-slate-900 font-black">ACTUAL ANOMALY</div>
                            <div className="text-[10px] text-rose-800 font-mono font-bold">{report.anomalySamples} frames</div>
                          </td>
                          {/* FALSE NEGATIVE (Rose Cell with Crisp Internal Border) */}
                          <td className="p-3.5 bg-rose-50/90 border-r-2 border-slate-300 relative group hover:bg-rose-100/70 transition-colors">
                            <div className="text-2xl font-black font-mono text-rose-700">{fn}</div>
                            <div className="inline-block px-2 py-0.5 rounded-md bg-rose-200/80 border border-rose-300 text-[10px] font-black uppercase text-rose-900 mt-1 tracking-wider">
                              FALSE NEGATIVE (FN)
                            </div>
                            <div className="text-[10px] text-rose-800 font-mono font-bold mt-1">
                              Missed anomalies (Type II Error)
                            </div>
                          </td>
                          {/* TRUE POSITIVE (Sky/Blue Cell with Crisp Internal Border) */}
                          <td className="p-3.5 bg-sky-50/90 relative group hover:bg-sky-100/70 transition-colors">
                            <div className="text-2xl font-black font-mono text-sky-700">{tp}</div>
                            <div className="inline-block px-2 py-0.5 rounded-md bg-sky-200/80 border border-sky-300 text-[10px] font-black uppercase text-sky-900 mt-1 tracking-wider">
                              TRUE POSITIVE (TP)
                            </div>
                            <div className="text-[10px] text-sky-800 font-mono font-bold mt-1">
                              {((tp / report.anomalySamples) * 100).toFixed(1)}% detection rate
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-[11.5px] text-slate-800 leading-relaxed shadow-xs">
                    <strong>Validation Summary:</strong> At threshold <strong className="text-amber-800 font-bold">{anomalyThreshold.toFixed(2)}</strong>, the detector accurately identifies <strong className="text-emerald-700 font-black">{tp}</strong> of {report.anomalySamples} anomalies ({((tp / report.anomalySamples) * 100).toFixed(1)}% Recall) with <strong className="text-rose-700 font-black">{fn}</strong> missed anomalies and <strong className="text-amber-700 font-black">{fp}</strong> false alarms on baseline telemetry.
                  </div>
                </div>

                {/* Score Separation & Processing Benchmark Card */}
                <div className="lg:col-span-5 p-4.5 rounded-2xl bg-white border border-slate-300 space-y-3.5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                      <Sliders className="w-4 h-4 text-purple-600" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                        ANOMALY SCORE SEPARATION
                      </h3>
                    </div>
                    <p className="text-[11.5px] text-slate-600">
                      Statistical score separation between nominal and anomalous telemetry frames:
                    </p>

                    <div className="space-y-4 mt-4">
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1.5">
                          <span className="text-emerald-800 font-bold">NOMINAL MEAN SCORE:</span>
                          <span className="text-emerald-900 font-black bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-300">{report.meanAnomalyScoreNormal.toFixed(4)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-300 p-0.5">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(5, report.meanAnomalyScoreNormal * 100))}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1.5">
                          <span className="text-rose-800 font-bold">ANOMALY MEAN SCORE:</span>
                          <span className="text-rose-900 font-black bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-300">{report.meanAnomalyScoreAnomaly.toFixed(4)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-300 p-0.5">
                          <div
                            className="bg-gradient-to-r from-rose-500 to-red-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, report.meanAnomalyScoreAnomaly * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Benchmark Performance Summary Box with Crisp Borders */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-700 pb-1.5 border-b border-slate-200">
                      <span className="font-bold">TOTAL BENCHMARK TIME:</span>
                      <span className="text-slate-900 font-black bg-white px-2.5 py-0.5 rounded-lg border border-slate-300">{report.latency.totalExecutionTimeMs.toFixed(1)} ms</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 pb-1.5 border-b border-slate-200">
                      <span className="font-bold">AVERAGE LATENCY:</span>
                      <span className="text-blue-700 font-black bg-white px-2.5 py-0.5 rounded-lg border border-blue-300">{report.latency.averageLatencyMs.toFixed(3)} ms / frame</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-bold">PROCESSING THROUGHPUT:</span>
                      <span className="text-emerald-700 font-black bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300">{Math.round(report.latency.throughputSamplesPerSec).toLocaleString()} frames/sec</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 2: THRESHOLD SENSITIVITY ROC & SET ACTION (CRISP BORDERS) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'sweep' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4.5 rounded-2xl bg-white border border-slate-300 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3.5 pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-600" />
                      <span>THRESHOLD SENSITIVITY ROC & ACTIVE SELECTOR</span>
                    </h3>
                    <p className="text-[11.5px] text-slate-600 mt-0.5">
                      Click <strong className="text-blue-600 font-black">SET</strong> on any threshold row to apply it directly to the anomaly detector. Only one threshold is ACTIVE at a time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetThreshold}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black font-mono flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-105 active:scale-95 border border-purple-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                    <span>DEFAULT (0.35)</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border-2 border-slate-300 shadow-xs bg-white">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b-2 border-slate-300 bg-slate-100 text-[11px]">
                        <th className="py-3 px-3.5 text-slate-800 font-black border-r border-slate-300">THRESHOLD</th>
                        <th className="py-3 px-3 text-center text-emerald-800 font-black border-r border-slate-300 bg-emerald-50/50">TP</th>
                        <th className="py-3 px-3 text-center text-amber-800 font-black border-r border-slate-300 bg-amber-50/50">FP (ALARMS)</th>
                        <th className="py-3 px-3 text-center text-rose-800 font-black border-r border-slate-300 bg-rose-50/50">FN (MISSED)</th>
                        <th className="py-3 px-3 text-center text-sky-800 font-black border-r border-slate-300">PRECISION</th>
                        <th className="py-3 px-3 text-center text-purple-800 font-black border-r border-slate-300">RECALL</th>
                        <th className="py-3 px-3 text-center text-teal-800 font-black border-r border-slate-300">F1-SCORE</th>
                        <th className="py-3 px-3.5 text-right text-slate-800 font-black">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-t border-slate-300">
                      {report.thresholdSweep.map((pt, idx) => {
                        const isCurrent = Math.abs(pt.threshold - anomalyThreshold) < 0.01;

                        return (
                          <tr
                            key={pt.threshold}
                            className={`transition-all border-b border-slate-200 ${
                              isCurrent
                                ? 'bg-sky-50/90 font-bold'
                                : idx % 2 === 0
                                ? 'bg-white hover:bg-slate-50'
                                : 'bg-slate-50/60 hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3.5 font-black text-slate-900 text-sm border-r border-slate-200">
                              <span className={isCurrent ? 'text-blue-700 font-black' : 'text-slate-800'}>
                                {pt.threshold.toFixed(2)}
                              </span>
                              {isCurrent && (
                                <span className="ml-2.5 px-2.5 py-0.5 rounded-full text-[9.5px] bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black uppercase tracking-widest shadow-xs">
                                  ACTIVE
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center text-emerald-700 font-black border-r border-slate-200 bg-emerald-50/30">{pt.tp}</td>
                            <td className="py-2.5 px-3 text-center text-amber-700 font-black border-r border-slate-200 bg-amber-50/30">{pt.fp}</td>
                            <td className="py-2.5 px-3 text-center text-rose-700 font-black border-r border-slate-200 bg-rose-50/30">{pt.fn}</td>
                            <td className="py-2.5 px-3 text-center text-sky-700 font-black border-r border-slate-200">{(pt.precision * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-center text-purple-700 font-black border-r border-slate-200">{(pt.recall * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-center text-teal-700 font-black border-r border-slate-200">{pt.f1Score.toFixed(4)}</td>
                            <td className="py-2.5 px-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleSetThreshold(pt.threshold)}
                                className={`px-4 py-1.5 rounded-xl text-[11px] font-black tracking-wider cursor-pointer transition-all shadow-xs border ${
                                  isCurrent
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300'
                                    : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-blue-600 font-black hover:scale-105 active:scale-95'
                                }`}
                              >
                                {isCurrent ? '✓ ACTIVE' : 'SET'}
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
          {/* TAB 3: SUBSYSTEM BREAKDOWN (CRISP ENTERPRISE TABLE)            */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'subsystems' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4.5 rounded-2xl bg-white border border-slate-300 shadow-sm">
                <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-500" />
                      <span>PER-SUBSYSTEM DETECTION PERFORMANCE</span>
                    </h3>
                    <p className="text-[11.5px] text-slate-600 mt-0.5">
                      Empirical quantitative evaluation across all 6 monitored spacecraft subsystems.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-mono font-black border border-amber-300">
                    {report.subsystemBreakdown.length} SUBSYSTEMS EVALUATED
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border-2 border-slate-300 shadow-xs bg-white">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b-2 border-slate-300 bg-slate-100 text-[11px]">
                        <th className="py-3 px-3.5 text-slate-800 font-black border-r border-slate-300">SUBSYSTEM</th>
                        <th className="py-3 px-3 text-center text-slate-700 font-black border-r border-slate-300">TOTAL FRAMES</th>
                        <th className="py-3 px-3 text-center text-amber-800 font-black border-r border-slate-300 bg-amber-50/50">ANOMALIES</th>
                        <th className="py-3 px-3 text-center text-emerald-800 font-black border-r border-slate-300 bg-emerald-50/50">DETECTED (TP)</th>
                        <th className="py-3 px-3 text-center text-rose-800 font-black border-r border-slate-300 bg-rose-50/50">MISSED (FN)</th>
                        <th className="py-3 px-3.5 text-right text-blue-800 font-black">RECALL (RATE)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-t border-slate-300">
                      {report.subsystemBreakdown.map((sub, idx) => {
                        const recallPct = (sub.recall * 100).toFixed(1);
                        const isPerfect = sub.recall === 1;

                        const subColors: Record<string, string> = {
                          POWER: '#D97706',
                          BATTERY: '#0284C7',
                          THERMAL: '#E11D48',
                          COMMUNICATION: '#7C3AED',
                          ATTITUDE: '#059669',
                          SENSOR: '#DB2777',
                        };
                        const color = subColors[sub.subsystem] || '#0284C7';

                        return (
                          <tr key={sub.subsystem} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-50'}`}>
                            <td className="py-3 px-3.5 font-black text-slate-900 flex items-center gap-2.5 border-r border-slate-200">
                              <span
                                className="w-3 h-3 rounded-full border border-slate-300"
                                style={{ backgroundColor: color }}
                              />
                              <span style={{ color }} className="text-sm font-black">{sub.subsystem}</span>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-800 font-bold border-r border-slate-200">{sub.totalSamples}</td>
                            <td className="py-3 px-3 text-center text-amber-700 font-black text-sm border-r border-slate-200 bg-amber-50/30">{sub.anomalySamples}</td>
                            <td className="py-3 px-3 text-center text-emerald-700 font-black text-sm border-r border-slate-200 bg-emerald-50/30">{sub.correctlyDetected}</td>
                            <td className="py-3 px-3 text-center text-rose-700 font-black text-sm border-r border-slate-200 bg-rose-50/30">{sub.missed}</td>
                            <td className="py-3 px-3.5 text-right">
                              <span
                                className={`px-3 py-1 rounded-full text-[11.5px] font-black border ${
                                  isPerfect
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-sky-100 text-sky-800 border-sky-300'
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
          {/* TAB 4: TELEMETRY SAMPLE INSPECTOR (CRISP CARD BORDERS)        */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'samples' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Category Filter Pills */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-slate-800 font-black uppercase text-[11px]">FILTER:</span>
                  {(['ALL', 'TP', 'TN', 'FP', 'FN'] as const).map((cat) => {
                    const count = cat === 'ALL' ? report.totalSamples : report.sampleDetails.filter((s) => s.classificationCategory === cat).length;
                    const catStyles: Record<string, string> = {
                      ALL: 'from-sky-500 to-blue-600 border-blue-600',
                      TP: 'from-sky-500 to-emerald-500 border-emerald-600',
                      TN: 'from-emerald-500 to-teal-500 border-teal-600',
                      FP: 'from-amber-500 to-orange-500 border-amber-600',
                      FN: 'from-rose-500 to-red-600 border-rose-600',
                    };

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSampleFilter(cat)}
                        className={`px-3.5 py-1.5 rounded-xl text-[11.5px] font-mono font-black uppercase transition-all cursor-pointer border ${
                          sampleFilter === cat
                            ? `bg-gradient-to-r ${catStyles[cat]} text-white shadow-sm scale-105`
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11.5px] font-mono text-blue-800 font-black bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  Showing {filteredSamples.length} telemetry frames
                </span>
              </div>

              {/* Sample list grid with crisp borders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto custom-scrollbar p-1">
                {filteredSamples.slice(0, 40).map((item) => {
                  const isSelected = selectedSample?.sample.id === item.sample.id;
                  const cat = item.classificationCategory;
                  const catColor = cat === 'TP' ? '#0284C7' : cat === 'TN' ? '#059669' : cat === 'FP' ? '#D97706' : '#E11D48';

                  return (
                    <div
                      key={item.sample.id}
                      onClick={() => setSelectedSample(item)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50 border-sky-500 shadow-md scale-101 ring-2 ring-sky-200'
                          : 'bg-white hover:bg-slate-50 border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-mono text-xs font-black text-slate-900">
                          {item.sample.id} ({item.sample.satelliteName})
                        </span>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black"
                          style={{
                            backgroundColor: `${catColor}15`,
                            color: catColor,
                            border: `1px solid ${catColor}60`,
                          }}
                        >
                          {cat} · SCORE {item.prediction.anomalyScore.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-700 mt-2 truncate font-medium">
                        {item.sample.description}
                      </p>
                      <div className="flex justify-between items-center text-[10.5px] font-mono text-slate-600 mt-2.5 pt-1 border-t border-slate-100">
                        <span>Actual: <strong className="text-slate-900 font-bold">{item.sample.groundTruthLabel}</strong></span>
                        <span>Predicted: <strong className="text-blue-700 font-bold">{item.predictedIsAnomaly ? 'ANOMALY' : 'NORMAL'}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inspector Detail Box with crisp border */}
              {selectedSample && (
                <div className="p-4 rounded-xl bg-slate-100 border-2 border-slate-300 space-y-2.5 text-xs font-mono shadow-md animate-fadeIn">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-300">
                    <span className="font-black text-slate-900 text-sm">
                      FRAME DETAIL: {selectedSample.sample.id} ({selectedSample.sample.satelliteName})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSample(null)}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer text-base px-2 py-0.5 rounded hover:bg-slate-200 border border-slate-300"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border-2 border-sky-300 shadow-xs">VOLTAGE: <strong className="text-sky-800 font-bold">{selectedSample.sample.telemetry.voltage} V</strong></div>
                    <div className="p-2.5 rounded-lg bg-white border-2 border-amber-300 shadow-xs">CURRENT: <strong className="text-amber-800 font-bold">{selectedSample.sample.telemetry.current} A</strong></div>
                    <div className="p-2.5 rounded-lg bg-white border-2 border-rose-300 shadow-xs">TEMP: <strong className="text-rose-800 font-bold">{selectedSample.sample.telemetry.temperature} °C</strong></div>
                    <div className="p-2.5 rounded-lg bg-white border-2 border-emerald-300 shadow-xs">BATTERY: <strong className="text-emerald-800 font-bold">{selectedSample.sample.telemetry.batteryLevel} %</strong></div>
                  </div>
                  <div className="text-slate-800 text-[11.5px] pt-1 leading-relaxed bg-white p-3 rounded-lg border border-slate-300">
                    <strong className="text-blue-800 font-bold">Detection Explanation:</strong> {selectedSample.prediction.explanation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 5. MODAL FOOTER ── */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-300 bg-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-600 font-mono flex items-center gap-2">
            <span>SATSHIELD AI BENCHMARK ENGINE v4.2</span>
            <span>•</span>
            <span className="text-blue-800 font-bold bg-white px-2.5 py-0.5 rounded-lg border border-slate-300">
              ACTIVE THRESHOLD: {anomalyThreshold.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 border border-rose-700"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
