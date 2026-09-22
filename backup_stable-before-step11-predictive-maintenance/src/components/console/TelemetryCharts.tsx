import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const TelemetryCharts: React.FC = ({ className = '' }: { className?: string }) => {
  const { activeSatellite } = useTelemetry();
  const subs = activeSatellite.subsystems;

  // Real-time telemetry history array from context
  const historyData = subs.power.history;

  const chartCards = [
    { 
      title: 'TEMPERATURE', 
      value: `${subs.thermal.internalTemp}°C`, 
      color: '#4dd8e6', 
      dataKey: 'temp',
      domain: ['dataMin - 2', 'dataMax + 2']
    },
    { 
      title: 'BATTERY VOLTAGE', 
      value: `${subs.power.batteryVoltage}V`, 
      color: '#4dd8e6', 
      dataKey: 'batteryVoltage',
      domain: ['dataMin - 1', 'dataMax + 1']
    },
    { 
      title: 'SOLAR POWER', 
      value: `${subs.power.solarOutput}W`, 
      color: '#f5a623', 
      dataKey: 'solarOutput',
      domain: ['dataMin - 50', 'dataMax + 50']
    },
    { 
      title: 'CURRENT', 
      value: `${subs.power.current}A`, 
      color: '#4dd8e6', 
      dataKey: 'current',
      domain: ['dataMin - 2', 'dataMax + 2']
    },
    { 
      title: 'SIGNAL STRENGTH', 
      value: `${subs.comm.signalStrength}dBm`, 
      color: '#4dd8e6', 
      dataKey: 'batteryCharge',
      domain: ['dataMin - 10', 'dataMax + 10']
    },
    { 
      title: 'POWER DRAW', 
      value: `${subs.power.powerConsumption}W`, 
      color: '#4dd8e6', 
      dataKey: 'powerDraw',
      domain: ['dataMin - 20', 'dataMax + 20']
    },
  ];

  return (
    <div className={`sat-panel rounded-xl p-5 space-y-4 font-mono-hud text-xs ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c2a42]">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4dd8e6] shadow-[0_0_10px_#4dd8e6] animate-pulse" />
          <span className="font-display font-semibold text-xs text-[#eaf2fb] uppercase tracking-wider">
            LIVE TELEMETRY STREAM ({activeSatellite.name})
          </span>
        </div>
        <span className="text-[10px] text-[#8fa3bf] bg-[#0d1526] px-2 py-1 rounded-md">REAL-TIME 1.5S SAMPLING</span>
      </div>

      {/* 6 Recharts Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {chartCards.map((chart, index) => (
          <div 
            key={chart.title} 
            className="p-3 rounded-lg bg-[#030303] border border-[#1c2a42] flex flex-col justify-between h-40 hover:border-[#4dd8e6]/30 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,217,255,0.1)]"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8fa3bf] uppercase tracking-wide">{chart.title}</span>
              <span className="font-bold" style={{ color: chart.color }}>{chart.value}</span>
            </div>
            <div className="h-24 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1c2a42" opacity={0.3} />
                  <YAxis hide domain={chart.domain} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#030303', 
                      borderColor: chart.color, 
                      fontSize: 10,
                      borderRadius: '8px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey={chart.dataKey} 
                    stroke={chart.color} 
                    strokeWidth={2} 
                    dot={false} 
                    isAnimationActive={false}
                    style={{ filter: `drop-shadow(0 0 4px ${chart.color})` }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
