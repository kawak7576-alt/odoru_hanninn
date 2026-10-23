import React from 'react';
import { GameLogEntry } from '../types/game';
import { MessageSquare, X, ShieldAlert, Sparkles } from 'lucide-react';

interface GameLogDrawerProps {
  logs: GameLogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const GameLogDrawer: React.FC<GameLogDrawerProps> = ({ logs, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-white/10 w-full max-w-sm h-full flex flex-col p-4 shadow-2xl animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span className="font-black text-sm text-white">事件の捜査ログ</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 scrollbar-thin text-xs">
          {logs.length === 0 ? (
            <div className="text-center text-stone-500 py-10">ログはまだありません</div>
          ) : (
            [...logs].reverse().map((log) => {
              const date = new Date(log.timestamp);
              const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(
                date.getMinutes()
              ).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

              let color = 'text-stone-300';
              if (log.type === 'incident') color = 'text-amber-300 font-bold';
              if (log.type === 'alert') color = 'text-yellow-400 font-bold';
              if (log.type === 'victory') color = 'text-emerald-300 font-black';
              if (log.type === 'system') color = 'text-sky-300';

              return (
                <div key={log.id} className="p-2 rounded-xl bg-slate-950/70 border border-white/5">
                  <div className="flex items-center justify-between text-[10px] text-stone-500 mb-0.5">
                    <span>捜査記録</span>
                    <span>{timeStr}</span>
                  </div>
                  <div className={`${color} leading-snug`}>{log.text}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
