import React, { useState } from 'react';
import { Terminal, Send, Play, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const CommandConsole: React.FC = () => {
  const { commandLogs, executeCommand, activeSatellite } = useTelemetry();
  const [commandInput, setCommandInput] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim() || isTransmitting) return;

    setIsTransmitting(true);
    const cmd = commandInput;
    setCommandInput('');
    await executeCommand(cmd);
    setIsTransmitting(false);
  };

  const handleQuickCommand = async (cmd: string) => {
    if (isTransmitting) return;
    setIsTransmitting(true);
    await executeCommand(cmd);
    setIsTransmitting(false);
  };

  return (
    <div className="flex flex-col h-full rounded-xl glass-panel border border-cyan-500/30 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-orbitron font-semibold text-xs tracking-wider text-cyan-200 uppercase">
            Spacecraft Command Console ({activeSatellite.name})
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono-hud text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Uplink Locked
        </div>
      </div>

      {/* Quick Action Presets */}
      <div className="p-2.5 bg-slate-900/40 border-b border-slate-800 flex flex-wrap gap-2">
        <button
          onClick={() => handleQuickCommand('POWER REBOOT_BUS')}
          disabled={isTransmitting}
          className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-cyan-900/40 border border-slate-700 hover:border-cyan-500/50 text-[10px] font-mono-hud text-cyan-300 transition-all flex items-center gap-1 disabled:opacity-50"
        >
          <Play className="w-3 h-3 text-cyan-400" /> REBOOT POWER BUS
        </button>
        <button
          onClick={() => handleQuickCommand('SOLAR ALIGN_AUTO')}
          disabled={isTransmitting}
          className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-cyan-900/40 border border-slate-700 hover:border-cyan-500/50 text-[10px] font-mono-hud text-cyan-300 transition-all flex items-center gap-1 disabled:opacity-50"
        >
          <Play className="w-3 h-3 text-amber-400" /> ALIGN SOLAR PANELS
        </button>
        <button
          onClick={() => handleQuickCommand('AOCS DESATURATE')}
          disabled={isTransmitting}
          className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-cyan-900/40 border border-slate-700 hover:border-cyan-500/50 text-[10px] font-mono-hud text-cyan-300 transition-all flex items-center gap-1 disabled:opacity-50"
        >
          <Play className="w-3 h-3 text-emerald-400" /> DESATURATE WHEELS
        </button>
        <button
          onClick={() => handleQuickCommand('COMM SYNC_ANTENNA')}
          disabled={isTransmitting}
          className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-cyan-900/40 border border-slate-700 hover:border-cyan-500/50 text-[10px] font-mono-hud text-cyan-300 transition-all flex items-center gap-1 disabled:opacity-50"
        >
          <Play className="w-3 h-3 text-cyan-400" /> SYNC DISH ANTENNA
        </button>
      </div>

      {/* Terminal Output Log Area */}
      <div className="flex-1 p-3 font-mono-hud text-[11px] overflow-y-auto space-y-2.5 bg-[#040812]">
        {commandLogs.length === 0 ? (
          <div className="text-slate-500 italic text-center py-6">
            Command buffer clear. Select preset or enter spacecraft telemetry command frame above.
          </div>
        ) : (
          commandLogs.map((log) => (
            <div key={log.id} className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span className="text-cyan-400 font-bold">[{log.timestamp}]</span>
                <span className="text-slate-500">ID: {log.id}</span>
                <span
                  className={`flex items-center gap-1 font-bold ${
                    log.status === 'SUCCESS'
                      ? 'text-emerald-400'
                      : log.status === 'EXECUTING'
                      ? 'text-amber-400 animate-pulse'
                      : 'text-red-400'
                  }`}
                >
                  {log.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                  {log.status === 'EXECUTING' && <Clock className="w-3 h-3 animate-spin" />}
                  {log.status === 'FAILED' && <AlertCircle className="w-3 h-3" />}
                  {log.status}
                </span>
              </div>
              <div className="mt-1 text-slate-200 font-bold">&gt; {log.command}</div>
              <div className="mt-0.5 text-slate-300 text-[10px]">{log.response}</div>
            </div>
          ))
        )}
      </div>

      {/* CLI Input Form */}
      <form onSubmit={handleSubmit} className="p-2.5 bg-slate-950/90 border-t border-cyan-500/20 flex gap-2">
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Enter uplink command frame (e.g. POWER REBOOT_BUS)..."
          className="flex-1 px-3 py-1.5 bg-slate-900/90 border border-cyan-500/30 rounded text-xs font-mono-hud text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />
        <button
          type="submit"
          disabled={isTransmitting || !commandInput.trim()}
          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-orbitron font-bold text-xs rounded transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" /> UPLINK
        </button>
      </form>
    </div>
  );
};
