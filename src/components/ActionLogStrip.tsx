import React from 'react';
import { GameLogEntry } from '../types/game';
import { MessageSquare, ChevronRight, Sparkles, AlertCircle, History } from 'lucide-react';

interface ActionLogStripProps {
  logs: GameLogEntry[];
  onOpenFullLog: () => void;
}

export const ActionLogStrip: React.FC<ActionLogStripProps> = ({ logs, onOpenFullLog }) => {
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;

  if (!latestLog) {
    return (
      <div
        onClick={onOpenFullLog}
        className="w-full max-w-xl mx-auto px-3 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between text-xs text-stone-400 cursor-pointer hover:bg-slate-900 transition"
      >
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span>直近の行動ログ：ゲーム待機中...</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
      </div>
    );
  }

  const getLogBadge = (type: GameLogEntry['type']) => {
    switch (type) {
      case 'incident':
        return { label: '事件', color: 'bg-amber-500/20 text-amber-300 border-amber-400/40' };
      case 'alert':
        return { label: '効果', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40' };
      case 'victory':
        return { label: '勝敗', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' };
      case 'system':
        return { label: '巡目', color: 'bg-sky-500/20 text-sky-300 border-sky-400/40' };
      default:
        return { label: '行動', color: 'bg-white/10 text-stone-200 border-white/20' };
    }
  };

  const badge = getLogBadge(latestLog.type);

  const date = new Date(latestLog.timestamp);
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

  return (
    <div
      onClick={onOpenFullLog}
      className="w-full max-w-2xl mx-auto px-3 py-2 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-400/30 flex items-center justify-between gap-2 shadow-lg cursor-pointer hover:border-amber-400/60 transition active:scale-[0.99] group"
      title="タップして全行動ログを表示"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border shrink-0 ${badge.color}`}>
          {badge.label}
        </span>
        <span className="text-[10px] text-stone-400 shrink-0 font-mono hidden sm:inline">
          {timeStr}
        </span>
        <p className="text-xs font-bold text-stone-100 truncate group-hover:text-amber-200 transition">
          {latestLog.text}
        </p>
      </div>

      <div className="flex items-center gap-1 text-[11px] font-black text-amber-300 shrink-0 pl-1">
        <span className="hidden sm:inline">履歴</span>
        <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
};
