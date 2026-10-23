import React, { useEffect, useState } from 'react';
import { MatchRecord } from '../types/game';
import { Trophy, History, ShieldAlert, Award, X, Sparkles, Clock, Users } from 'lucide-react';

interface HistoryDashboardProps {
  onClose: () => void;
}

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ onClose }) => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/matches')
      .then((res) => res.json())
      .then((data) => {
        if (data.matches) {
          setMatches(data.matches);
        }
      })
      .catch((err) => console.error('Failed to fetch matches:', err))
      .finally(() => setLoading(false));
  }, []);

  const totalMatches = matches.length;
  const detectiveWins = matches.filter((m) => m.victoryType === 'detective').length;
  const dogWins = matches.filter((m) => m.victoryType === 'dog').length;
  const culpritWins = matches.filter((m) => m.victoryType === 'culprit').length;

  const detPct = totalMatches ? Math.round((detectiveWins / totalMatches) * 100) : 0;
  const dogPct = totalMatches ? Math.round((dogWins / totalMatches) * 100) : 0;
  const culpritPct = totalMatches ? Math.round((culpritWins / totalMatches) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">対戦履歴＆戦績ダッシュボード</h2>
              <p className="text-[11px] text-stone-400">過去の推理勝負の記録と勝利傾向</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 shrink-0">
          <div className="bg-slate-950 p-3 rounded-2xl border border-white/5 flex flex-col">
            <span className="text-[10px] text-stone-400 font-bold uppercase">総対戦数</span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{totalMatches} <span className="text-xs font-normal text-stone-400">戦</span></span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-blue-500/30 flex flex-col">
            <span className="text-[10px] text-sky-400 font-bold flex items-center gap-1">
              <span>🔍 探偵勝利</span>
            </span>
            <span className="text-xl sm:text-2xl font-black text-sky-200 mt-0.5">
              {detPct}% <span className="text-xs font-normal text-stone-400">({detectiveWins}勝)</span>
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-amber-500/30 flex flex-col">
            <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
              <span>🐕 いぬ勝利</span>
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-200 mt-0.5">
              {dogPct}% <span className="text-xs font-normal text-stone-400">({dogWins}勝)</span>
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-red-500/30 flex flex-col">
            <span className="text-[10px] text-red-400 font-bold flex items-center gap-1">
              <span>🎭 犯人逃亡</span>
            </span>
            <span className="text-xl sm:text-2xl font-black text-red-200 mt-0.5">
              {culpritPct}% <span className="text-xs font-normal text-stone-400">({culpritWins}勝)</span>
            </span>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
          {loading ? (
            <div className="py-12 text-center text-xs text-stone-400">読み込み中...</div>
          ) : matches.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400 bg-slate-950/40 rounded-2xl border border-dashed border-white/10">
              まだ対戦記録がありません。ゲームをプレイするとここに記録されます！
            </div>
          ) : (
            matches.map((match) => {
              const date = new Date(match.timestamp);
              const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(
                date.getMinutes()
              ).padStart(2, '0')}`;

              const typeBadge = {
                detective: { text: '探偵検挙', color: 'bg-blue-900/60 text-sky-200 border-sky-400/40' },
                dog: { text: 'いぬ嗅覚', color: 'bg-amber-900/60 text-amber-200 border-amber-400/40' },
                culprit: { text: '犯人逃亡', color: 'bg-red-900/60 text-red-200 border-red-400/40' },
              }[match.victoryType];

              return (
                <div
                  key={match.id}
                  className="p-3 rounded-2xl bg-slate-950 border border-white/5 hover:border-amber-500/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeBadge.color}`}>
                        {typeBadge.text}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">{dateStr}</span>
                      <span className="text-[10px] text-stone-400 bg-white/5 px-1.5 py-0.5 rounded">
                        {match.playerCount}人対戦
                      </span>
                    </div>
                    <div className="text-stone-300 font-medium">
                      事件: 「{match.incident || '謎の事件'}」
                    </div>
                    <div className="text-[11px] text-stone-400">
                      勝因: {match.victoryReason}
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="text-amber-300 font-black text-sm">
                      勝者: {match.winnerNames.join(', ')}
                    </div>
                    <div className="text-[10px] text-red-400/90 font-mono">
                      真犯人: {match.culpritName}（第{match.rounds}巡）
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
