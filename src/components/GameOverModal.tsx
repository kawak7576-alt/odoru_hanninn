import React, { useEffect, useState } from 'react';
import { Card, GameResult, GameMode, SeriesState, PlayerPublic } from '../types/game';
import { CardView } from './CardView';
import { CardThumbnail } from './CardThumbnail';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/sound';
import {
  Trophy,
  RotateCcw,
  Users,
  Sparkles,
  Play,
  Award,
  Crown,
  Medal,
  ChevronRight,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface GameOverModalProps {
  result: GameResult;
  isHost: boolean;
  onRestart: () => void;
  onNextGame?: () => void;
  gameMode?: GameMode;
  seriesState?: SeriesState | null;
  players?: PlayerPublic[];
  onInspectCard?: (card: Card) => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  result,
  isHost,
  onRestart,
  onNextGame,
  gameMode = 'single',
  seriesState,
  players = [],
  onInspectCard,
}) => {
  const [showHands, setShowHands] = useState<boolean>(true);

  const isMatch5 = gameMode === 'match5' && !!seriesState;
  const isFinalGame = isMatch5 && (seriesState.isFinal || seriesState.currentGame >= 5);

  useEffect(() => {
    sounds.victory();
    try {
      if (isFinalGame) {
        // Grand celebration for series finale
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
        });
        setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
          });
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
          });
        }, 300);
      } else {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (e) {
      // ignore
    }
  }, [isFinalGame]);

  const getVictoryBadge = () => {
    switch (result.victoryType) {
      case 'detective':
        return {
          title: '探偵の検挙！',
          color: 'from-blue-600 to-indigo-800 text-sky-200 border-sky-400',
          icon: '🔍',
          pointDesc: isMatch5 ? '+1 Pt 獲得（探偵カード的中）' : undefined,
        };
      case 'dog':
        return {
          title: 'いぬの嗅覚！',
          color: 'from-amber-600 to-yellow-800 text-amber-200 border-amber-400',
          icon: '🐕',
          pointDesc: isMatch5 ? '+3 Pt 獲得（いぬカード的中）' : undefined,
        };
      case 'culprit':
        return {
          title: '犯人逃亡成功！',
          color: 'from-red-600 to-rose-900 text-red-200 border-red-400',
          icon: '🎭',
          pointDesc: isMatch5 ? '+2 Pt 獲得（犯人最後の1枚出し）' : undefined,
        };
    }
  };

  const badge = getVictoryBadge();

  // Calculate sorted rankings for seriesState
  const rankedPlayers = React.useMemo(() => {
    if (!seriesState) return [];

    // Combine player names from players prop and result.allPlayerHands
    const nameMap: Record<string, string> = {};
    players.forEach((p) => {
      nameMap[p.id] = p.name;
    });
    result.allPlayerHands.forEach((p) => {
      if (!nameMap[p.playerId]) nameMap[p.playerId] = p.playerName;
    });

    const entries = Object.keys(seriesState.scores).map((pId) => ({
      id: pId,
      name: nameMap[pId] || `プレイヤー (${pId.substring(0, 4)})`,
      totalScore: seriesState.scores[pId] || 0,
    }));

    entries.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranking with tie handling
    let currentRank = 1;
    return entries.map((entry, idx) => {
      if (idx > 0 && entry.totalScore < entries[idx - 1].totalScore) {
        currentRank = idx + 1;
      }
      return {
        ...entry,
        rank: currentRank,
      };
    });
  }, [seriesState, players, result]);

  // Points awarded in current game (if in seriesState history)
  const currentRoundPoints = React.useMemo(() => {
    if (!seriesState || seriesState.history.length === 0) return null;
    const currentHist = seriesState.history[seriesState.history.length - 1];
    return currentHist?.pointsAwarded || [];
  }, [seriesState]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl animate-scale-up my-auto max-h-[94vh] flex flex-col">
        {/* Scrollable content area */}
        <div className="overflow-y-auto pr-1 -mr-1 scrollbar-thin scrollbar-thumb-amber-500/40 space-y-4">
          {/* Header section */}
          <div className="text-center">
            {isMatch5 ? (
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black mb-2 shadow-sm">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <span>
                    5ゲームマッチ【第{seriesState?.currentGame}戦 / 全5戦】
                    {isFinalGame ? '（最終決着）' : ''}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {isFinalGame ? '🏆 5ゲームマッチ 最終結果！' : `第${seriesState?.currentGame}戦 決着！`}
                </h1>
                <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-md mx-auto">
                  {result.victoryReason}
                </p>
              </div>
            ) : (
              <div>
                <div className="inline-block p-2.5 rounded-full bg-amber-500/20 border border-amber-500/40 mb-2">
                  <Trophy className="w-7 h-7 text-yellow-400 animate-bounce" />
                </div>
                <div className="text-[11px] font-mono tracking-widest text-amber-400 uppercase">
                  ━━━━━━━━ GAME OVER ━━━━━━━━
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">ゲーム決着！</h1>
                <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-md mx-auto">
                  {result.victoryReason}
                </p>
              </div>
            )}
          </div>

          {/* Winners Banner */}
          <div
            className={`p-3.5 rounded-2xl bg-gradient-to-r ${badge.color} border shadow-xl text-center`}
          >
            <div className="text-xs font-bold tracking-wider uppercase opacity-90 flex items-center justify-center gap-1.5">
              <CardThumbnail cardType={result.victoryType} size="xs" alt={badge.title} />
              <span>{badge.title}</span>
              {badge.pointDesc && (
                <span className="ml-1 bg-yellow-400 text-slate-950 font-black px-2 py-0.5 rounded-full text-[11px] shadow-sm">
                  {badge.pointDesc}
                </span>
              )}
            </div>
            <div className="text-base sm:text-lg font-black mt-1 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-white">勝者:</span>
              {result.winners.map((w) => (
                <span
                  key={w.id}
                  className="bg-black/40 px-2.5 py-0.5 rounded-full text-white font-extrabold text-sm sm:text-base border border-white/20"
                >
                  {w.name} {w.role === 'accomplice' && '（共犯者）'}
                </span>
              ))}
            </div>
          </div>

          {/* 5-Game Match Final Podium (Rendered on Game 5 Final Results) */}
          {isFinalGame && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/60 via-slate-950/80 to-slate-950 border-2 border-yellow-500/60 shadow-xl">
              <div className="text-center mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-yellow-400 flex items-center justify-center gap-1.5">
                  <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
                  総合チャンピオン表彰台
                </span>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  🥇 優勝: {rankedPlayers[0]?.name || '未定'} ({rankedPlayers[0]?.totalScore || 0} Pt)
                </div>
              </div>

              {/* Podium Display (2nd, 1st, 3rd) */}
              <div className="grid grid-cols-3 gap-2 items-end pt-3 max-w-md mx-auto text-center">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-400/20 border border-slate-300 flex items-center justify-center text-slate-300 font-black text-sm mb-1 shadow-md">
                    🥈
                  </div>
                  <div className="text-xs font-black text-stone-200 truncate max-w-full px-1">
                    {rankedPlayers[1]?.name || '-'}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-300">
                    {rankedPlayers[1] ? `${rankedPlayers[1].totalScore} Pt` : ''}
                  </div>
                  <div className="w-full h-16 bg-gradient-to-t from-slate-700 to-slate-600 rounded-t-xl mt-1.5 flex items-center justify-center border-t border-slate-400/50">
                    <span className="text-xs font-black text-slate-200">2位</span>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center">
                  <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400 -mb-1 animate-bounce" />
                  <div className="w-10 h-10 rounded-full bg-yellow-500/30 border-2 border-yellow-400 flex items-center justify-center text-yellow-300 font-black text-base mb-1 shadow-lg shadow-yellow-500/30">
                    🥇
                  </div>
                  <div className="text-sm font-black text-yellow-300 truncate max-w-full px-1">
                    {rankedPlayers[0]?.name || '-'}
                  </div>
                  <div className="text-xs font-mono font-black text-yellow-400">
                    {rankedPlayers[0] ? `${rankedPlayers[0].totalScore} Pt` : ''}
                  </div>
                  <div className="w-full h-22 bg-gradient-to-t from-amber-600 to-yellow-500 rounded-t-xl mt-1.5 flex items-center justify-center border-t-2 border-yellow-300 shadow-lg shadow-amber-500/30">
                    <span className="text-sm font-black text-slate-950">🏆 1位</span>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-800/30 border border-amber-600 flex items-center justify-center text-amber-500 font-black text-sm mb-1 shadow-md">
                    🥉
                  </div>
                  <div className="text-xs font-black text-stone-200 truncate max-w-full px-1">
                    {rankedPlayers[2]?.name || '-'}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-amber-400">
                    {rankedPlayers[2] ? `${rankedPlayers[2].totalScore} Pt` : ''}
                  </div>
                  <div className="w-full h-12 bg-gradient-to-t from-amber-800 to-amber-700 rounded-t-xl mt-1.5 flex items-center justify-center border-t border-amber-500/50">
                    <span className="text-xs font-black text-amber-200">3位</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5-Game Match Scoreboard / Cumulative Standings */}
          {isMatch5 && (
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-400/30 shadow-md">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/10">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  {isFinalGame ? '【最終総合順位・ポイント内訳】' : '【現在の総合順位表】'}
                </span>
                <span className="text-[10px] text-stone-400 font-bold">
                  探偵: +1Pt (犯人・たくらみ:-1) / 逃亡: +2Pt (たくらみ:+1) / いぬ: +3Pt
                </span>
              </div>

              {/* Standings Table */}
              <div className="space-y-1.5">
                {rankedPlayers.map((entry) => {
                  const gainedThisRound = currentRoundPoints?.find((p) => p.playerId === entry.id);

                  let rankBadge = `${entry.rank}位`;
                  let rankBg = 'bg-slate-800 text-stone-300 border-white/10';
                  if (entry.rank === 1) {
                    rankBadge = '🥇 1位';
                    rankBg = 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50 font-black';
                  } else if (entry.rank === 2) {
                    rankBadge = '🥈 2位';
                    rankBg = 'bg-slate-300/20 text-slate-200 border-slate-300/50 font-black';
                  } else if (entry.rank === 3) {
                    rankBadge = '🥉 3位';
                    rankBg = 'bg-amber-700/20 text-amber-300 border-amber-600/50 font-black';
                  }

                  return (
                    <div
                      key={entry.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition ${
                        entry.rank === 1
                          ? 'bg-amber-950/40 border-amber-500/40'
                          : 'bg-slate-900/80 border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] border ${rankBg}`}>
                          {rankBadge}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {entry.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {gainedThisRound && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border animate-pulse ${
                            gainedThisRound.points >= 0
                              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                              : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                          }`}>
                            {gainedThisRound.points > 0 ? `+${gainedThisRound.points}` : gainedThisRound.points}Pt
                          </span>
                        )}
                        <span className="font-mono text-xs sm:text-sm font-black text-amber-300 bg-black/50 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                          {entry.totalScore} <span className="text-[10px] font-sans">Pt</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Match breakdown (games 1 to current) */}
              {seriesState.history.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-white/10">
                  <div className="text-[10px] font-bold text-stone-400 mb-1.5">試合ごとの決着履歴:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    {seriesState.history.map((hist) => (
                      <div
                        key={hist.gameNumber}
                        className="p-1.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between"
                      >
                        <span className="font-bold text-stone-300">
                          第{hist.gameNumber}戦:{' '}
                          <span className="text-amber-400 font-black">
                            {hist.victoryType === 'detective'
                              ? '探偵勝利'
                              : hist.victoryType === 'dog'
                              ? 'いぬ勝利'
                              : '犯人逃亡'}
                          </span>
                        </span>
                        <span className="text-stone-400 truncate max-w-[120px]">
                          {hist.winnerNames.join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Secret Roles Unveiled */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-red-500/30 flex items-center gap-2.5">
              <CardThumbnail cardType="culprit" size="md" alt="正真正銘の犯人" />
              <div className="min-w-0">
                <div className="text-[10px] text-stone-400 font-bold">正真正銘の犯人</div>
                <div className="font-black text-red-300 text-xs sm:text-sm truncate">
                  {result.culpritPlayerName}
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-purple-500/30 flex items-center gap-2.5">
              <CardThumbnail cardType="conspiracy" size="md" alt="たくらみ（共犯者）" />
              <div className="min-w-0">
                <div className="text-[10px] text-stone-400 font-bold">たくらみ（共犯者）</div>
                <div className="font-black text-purple-300 text-xs sm:text-sm truncate">
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

          {/* Collapsible Final Hands Section */}
          <div className="bg-slate-950/60 rounded-2xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setShowHands(!showHands)}
              className="w-full p-2.5 flex items-center justify-between text-left hover:bg-white/5 transition cursor-pointer"
            >
              <div className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>各プレイヤーの最終手札公開（タップで開閉）</span>
              </div>
              {showHands ? (
                <ChevronUp className="w-4 h-4 text-stone-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-400" />
              )}
            </button>

            {showHands && (
              <div className="p-3 pt-0 space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {result.allPlayerHands.map((p) => (
                  <div
                    key={p.playerId}
                    className="p-2 rounded-xl bg-slate-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5">
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

                    <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-amber-500/40">
                      {p.hand.length === 0 ? (
                        <span className="text-[11px] text-stone-500 py-2 font-bold">
                          手札なし（すべて使い切り）
                        </span>
                      ) : (
                        p.hand.map((card) => (
                          <div
                            key={card.id}
                            className="shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition"
                            onClick={() => onInspectCard && onInspectCard(card)}
                          >
                            <CardView card={card} size="field" showDetails={true} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/10 mt-3 flex flex-col sm:flex-row gap-2 shrink-0">
          {isMatch5 ? (
            isFinalGame ? (
              // 5-Game Match Finale Completed -> Button to return to matching screen (Lobby)
              isHost ? (
                <button
                  onClick={onRestart}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>マッチング画面に戻る</span>
                </button>
              ) : (
                <div className="w-full py-3 bg-slate-800 text-stone-300 font-bold text-xs rounded-xl text-center">
                  ホストが「マッチング画面に戻る」を押すのを待っています...
                </div>
              )
            ) : (
              // 5-Game Match Interim Game (1 to 4) -> Button to start next game
              isHost ? (
                <div className="w-full flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={onNextGame}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>次のゲームへ（第{(seriesState?.currentGame || 0) + 1}戦へ）</span>
                  </button>
                  <button
                    onClick={onRestart}
                    className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-stone-300 hover:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    title="シリーズを中断してマッチング画面に戻る"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ロビーへ戻る</span>
                  </button>
                </div>
              ) : (
                <div className="w-full py-3 bg-slate-800 text-stone-300 font-bold text-xs rounded-xl text-center">
                  ホストが「次のゲームへ」を押すのを待っています...（第
                  {(seriesState?.currentGame || 0) + 1}戦へ）
                </div>
              )
            )
          ) : (
            // Single game mode -> Return to lobby
            isHost ? (
              <button
                onClick={onRestart}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ロビーに戻って再戦準備</span>
              </button>
            ) : (
              <div className="w-full py-3 bg-slate-800 text-stone-300 font-bold text-xs rounded-xl text-center">
                ホストが「ロビーに戻る」を押すのを待っています...
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
