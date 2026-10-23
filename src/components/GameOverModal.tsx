import React, { useEffect } from 'react';
import { Card, GameResult } from '../types/game';
import { CardView } from './CardView';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/sound';
import { Trophy, RotateCcw, AlertTriangle, Users, ShieldAlert, Sparkles } from 'lucide-react';

interface GameOverModalProps {
  result: GameResult;
  isHost: boolean;
  onRestart: () => void;
  onInspectCard?: (card: Card) => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  result,
  isHost,
  onRestart,
  onInspectCard,
}) => {
  useEffect(() => {
    sounds.victory();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }
  }, []);

  const getVictoryBadge = () => {
    switch (result.victoryType) {
      case 'detective':
        return {
          title: '探偵の検挙！',
          color: 'from-blue-600 to-indigo-800 text-sky-200 border-sky-400',
          icon: '🔍',
        };
      case 'dog':
        return {
          title: 'いぬの嗅覚！',
          color: 'from-amber-600 to-yellow-800 text-amber-200 border-amber-400',
          icon: '🐕',
        };
      case 'culprit':
        return {
          title: '犯人逃亡成功！',
          color: 'from-red-600 to-rose-900 text-red-200 border-red-400',
          icon: '🎭',
        };
    }
  };

  const badge = getVictoryBadge();

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl animate-scale-up my-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-block p-3 rounded-full bg-amber-500/20 border border-amber-500/40 mb-2">
            <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
          </div>
          <div className="text-[11px] font-mono tracking-widest text-amber-400 uppercase">
            ━━━━━━━━ GAME OVER ━━━━━━━━
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            ゲーム決着！
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-md mx-auto">
            {result.victoryReason}
          </p>
        </div>

        {/* Winners Banner */}
        <div className={`p-4 rounded-2xl bg-gradient-to-r ${badge.color} border shadow-xl mb-4 text-center`}>
          <div className="text-xs font-bold tracking-wider uppercase opacity-90">
            {badge.icon} {badge.title}
          </div>
          <div className="text-lg sm:text-xl font-black mt-1 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-white">🏆 勝者:</span>
            {result.winners.map((w) => (
              <span key={w.id} className="bg-black/40 px-3 py-0.5 rounded-full text-white font-extrabold text-sm sm:text-base border border-white/20">
                {w.name} {w.role === 'accomplice' && '（共犯者）'}
              </span>
            ))}
          </div>
        </div>

        {/* Secret Information Unveiled */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-red-500/30 flex items-center gap-2.5">
            <span className="text-2xl">🎭</span>
            <div>
              <div className="text-[10px] text-stone-400 font-bold">正真正銘の犯人</div>
              <div className="font-black text-red-300 text-sm truncate">{result.culpritPlayerName}</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-purple-500/30 flex items-center gap-2.5">
            <span className="text-2xl">😈</span>
            <div>
              <div className="text-[10px] text-stone-400 font-bold">たくらみ（共犯者）</div>
              <div className="font-black text-purple-300 text-sm truncate">
                {result.accomplicePlayerIds.length > 0
                  ? result.allPlayerHands
                      .filter((p) => result.accomplicePlayerIds.includes(p.playerId))
                      .map((p) => p.playerName)
                      .join(', ')
                  : 'なし'}
              </div>
            </div>
          </div>
        </div>

        {/* All Players Final Hands (Spec Requirement) */}
        <div className="mb-5 bg-slate-950/60 p-3.5 rounded-2xl border border-white/10">
          <h3 className="text-xs font-bold text-stone-300 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            各プレイヤーの最終手札公開（タップで拡大）
          </h3>
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
            {result.allPlayerHands.map((p) => (
              <div
                key={p.playerId}
                className="p-2 rounded-xl bg-slate-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">{p.playerName}</span>
                  {p.isCulprit && (
                    <span className="px-1.5 py-0.2 bg-red-600/80 text-white text-[9px] rounded font-bold">
                      犯人
                    </span>
                  )}
                  {p.isAccomplice && (
                    <span className="px-1.5 py-0.2 bg-purple-600/80 text-white text-[9px] rounded font-bold">
                      共犯
                    </span>
                  )}
                </div>

                <div className="flex gap-1.5 overflow-x-auto py-0.5">
                  {p.hand.length === 0 ? (
                    <span className="text-[10px] text-stone-500 py-1">手札なし（すべて使い切り）</span>
                  ) : (
                    p.hand.map((card) => (
                      <div
                        key={card.id}
                        className="shrink-0 cursor-pointer hover:scale-105 transition"
                        onClick={() => onInspectCard && onInspectCard(card)}
                      >
                        <CardView card={card} size="sm" showDetails={false} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Replay action: Return to lobby */}
        <div className="flex gap-2">
          {isHost ? (
            <button
              onClick={onRestart}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              ロビーに戻って再戦準備
            </button>
          ) : (
            <div className="w-full py-3 bg-slate-800 text-stone-300 font-bold text-xs rounded-xl text-center">
              ホストが「ロビーに戻る」を押すのを待っています...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
