import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { AlertOctagon, Activity } from 'lucide-react';

export const AnomalyDetection: React.FC = () => {
  const { activeSatellite, setFocusedSubsystem } = useTelemetry();
  const anomaly = activeSatellite.aiAnomaly || {
    detectedAnomaly: 'NO ANOMALY DETECTED',
    severity: 'LOW',
    confidence: 99,
    detectedTimestamp: '00:00:00 UTC',
    description: 'System running within normal thresholds.',
  };

  const severityColor =
    anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH'
      ? 'text-[#ff5470] border-[#ff5470]/50 bg-[#ff5470]/10'
      : anomaly.severity === 'MEDIUM'
      ? 'text-[#f5a623] border-[#f5a623]/50 bg-[#f5a623]/10'
      : 'text-[#4dd8e6] border-[#4dd8e6]/50 bg-[#4dd8e6]/10';

  return (
    <div className="sat-panel rounded-xl p-4 space-y-4 font-mono-hud text-xs flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2a42]">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-4 h-4 text-[#4dd8e6]" />
            <span className="font-display font-semibold text-xs text-[#eaf2fb] uppercase tracking-wider">
              AI ANOMALY DETECTION
            </span>
          </div>
          <span className="inline-flex items-center gap-2 text-[10px] text-[#4dd8e6] font-bold bg-[#0d1526] px-2 py-1 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4dd8e6] animate-ping" />
            SYSTEM ANALYSIS ACTIVE
          </span>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-[10px] text-[#8fa3bf] uppercase tracking-wider">DETECTED ANOMALY</div>
            <div className="font-display font-bold text-sm text-[#eaf2fb] mt-1 uppercase tracking-wide">
              {anomaly.detectedAnomaly}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-2.5 rounded-lg bg-[#030303] border border-[#1c2a42] hover:border-[#4dd8e6]/30 transition-all duration-300">
              <div className="text-[9px] text-[#8fa3bf] uppercase">SEVERITY</div>
              <div className={`text-xs font-bold mt-1 ${severityColor.split(' ')[0]}`}>{anomaly.severity}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#030303] border border-[#1c2a42] hover:border-[#4dd8e6]/30 transition-all duration-300">
              <div className="text-[9px] text-[#8fa3bf] uppercase">CONFIDENCE</div>
              <div className="text-xs font-bold text-[#4dd8e6] mt-1">{anomaly.confidence}%</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#030303] border border-[#1c2a42] hover:border-[#4dd8e6]/30 transition-all duration-300">
              <div className="text-[9px] text-[#8fa3bf] uppercase">DETECTED</div>
              <div className="text-[10px] font-bold text-[#eaf2fb] mt-1">{anomaly.detectedTimestamp}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={() => setFocusedSubsystem('power')}
        className="w-full py-2.5 bg-[#030303] hover:bg-[#1c2a42] border border-[#4dd8e6]/40 hover:border-[#4dd8e6] text-[#4dd8e6] font-mono-hud font-bold text-xs rounded-lg transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(0,217,255,0.2)]"
      >
        <Activity className="w-3.5 h-3.5" /> [VIEW DETAILS]
      </button>
    </div>
  );
};
