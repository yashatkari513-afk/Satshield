import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { Cpu, ShieldAlert } from 'lucide-react';

export const AIPrediction: React.FC = () => {
  const { activeSatellite } = useTelemetry();
  const pred = activeSatellite.aiPrediction || {
    potentialIssue: 'SYSTEM NOMINAL',
    probability: 2,
    estimatedTimeDays: 180,
    recommendedAction: 'Maintain current stationkeeping schedule.',
  };

  const probColor =
    pred.probability > 70 ? 'text-[#ff5470]' : pred.probability > 40 ? 'text-[#f5a623]' : 'text-[#4dd8e6]';

  return (
    <div className="sat-panel rounded-xl p-4 space-y-4 font-mono-hud text-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2a42]">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-[#f5a623]" />
            <span className="font-display font-semibold text-xs text-[#eaf2fb] uppercase tracking-wider">
              AI FAILURE PREDICTION
            </span>
          </div>
          <span className="text-[10px] text-[#8fa3bf] bg-[#0d1526] px-2 py-1 rounded-md">PREDICTIVE MAINTENANCE</span>
        </div>

        {/* Potential Issue */}
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-[10px] text-[#8fa3bf] uppercase tracking-wider">POTENTIAL ISSUE</div>
            <div className="font-display font-bold text-sm text-[#eaf2fb] mt-1 uppercase tracking-wide">
              {pred.potentialIssue}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-[#030303] border border-[#1c2a42] hover:border-[#4dd8e6]/30 transition-all duration-300">
              <div className="text-[9px] text-[#8fa3bf] uppercase">PROBABILITY</div>
              <div className={`text-lg font-display font-bold mt-1 ${probColor}`}>{pred.probability}%</div>
            </div>

            <div className="p-3 rounded-lg bg-[#030303] border border-[#1c2a42] hover:border-[#4dd8e6]/30 transition-all duration-300">
              <div className="text-[9px] text-[#8fa3bf] uppercase">ESTIMATED TIME</div>
              <div className="text-lg font-display font-bold text-[#eaf2fb] mt-1">{pred.estimatedTimeDays} DAYS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Action */}
      <div className="p-3 rounded-lg bg-[#030303] border border-[#1c2a42]/80 space-y-2 hover:border-[#f5a623]/30 transition-all duration-300">
        <div className="text-[9px] text-[#f5a623] font-bold uppercase flex items-center gap-2">
          <ShieldAlert className="w-3 h-3 text-[#f5a623]" /> RECOMMENDED ACTION
        </div>
        <div className="text-[11px] text-[#8fa3bf] leading-relaxed font-sans">
          {pred.recommendedAction}
        </div>
      </div>
    </div>
  );
};
