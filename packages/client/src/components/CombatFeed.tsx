import React, { useState, useRef, useEffect } from 'react';
import { ScrollText, ChevronUp, X } from 'lucide-react';

interface CombatFeedProps {
  combatLog: string[];
}

export const CombatFeed: React.FC<CombatFeedProps> = ({ combatLog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [combatLog, isOpen]);

  const latestLog = combatLog.length > 0 ? combatLog[combatLog.length - 1] : 'Combat begins...';

  const formatLogClass = (log: string) => {
    if (log.includes('Victory') || log.includes('vanquished'))
      return 'bg-amber-950/60 border-amber-500/80 text-amber-200 font-bold';
    if (log.includes('💀') || log.includes('fallen'))
      return 'bg-red-950/70 border-red-700 text-red-200 font-bold';
    if (log.includes('Flash Heal') || (log.includes('+') && log.includes('HP')))
      return 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300';
    if (log.includes('Intervene') || log.includes('absorbed'))
      return 'bg-blue-950/40 border-blue-800/40 text-blue-300';
    if (log.includes('Sanctuary') || log.includes('Shield'))
      return 'bg-indigo-950/40 border-indigo-800/40 text-indigo-300';
    if (log.includes('dodges') || log.includes('Smoke Screen'))
      return 'bg-purple-950/40 border-purple-800/40 text-purple-300';
    if (log.includes('Overseer') || log.includes('Soul Cleave') || log.includes('Shadow Bolt'))
      return 'bg-red-950/30 border-red-900/40 text-red-300';
    return 'bg-dungeon-darker/60 border-dungeon-border/40 text-slate-300';
  };

  return (
    <>
      {/* 1-Line Compact Battle Ticker */}
      <div
        onClick={() => setIsOpen(true)}
        className="bg-dungeon-card/90 border border-dungeon-border/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-sm cursor-pointer hover:border-slate-500 transition-all text-xs"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ScrollText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="font-mono text-[11px] text-slate-300 truncate">
            {latestLog}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono flex-shrink-0 bg-dungeon-darker px-1.5 py-0.5 rounded border border-dungeon-border">
          <span>Log</span>
          <ChevronUp className="w-3 h-3 text-slate-400" />
        </div>
      </div>

      {/* Expanded Combat Log Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-2 sm:p-4 animate-in fade-in">
          <div className="bg-dungeon-card border border-dungeon-border rounded-2xl max-w-lg w-full mx-auto flex flex-col max-h-[75vh] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-dungeon-border flex items-center justify-between bg-dungeon-darker">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                  Combat History ({combatLog.length} events)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Log Content */}
            <div className="p-3 overflow-y-auto space-y-1.5 font-mono text-xs flex-1">
              {combatLog.length === 0 ? (
                <div className="text-slate-500 italic py-4 text-center">Combat log is quiet...</div>
              ) : (
                combatLog.map((log, index) => (
                  <div
                    key={index}
                    className={`py-1.5 px-2.5 rounded-lg border leading-relaxed text-[11px] ${formatLogClass(log)}`}
                  >
                    <span className="text-slate-500 mr-1.5">&gt;</span>
                    {log}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Modal Footer */}
            <div className="p-2 border-t border-dungeon-border bg-dungeon-darker flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
