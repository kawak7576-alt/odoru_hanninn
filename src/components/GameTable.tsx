import React from 'react';
import { Card, ClientGameState, PlayerPublic } from '../types/game';
import { CardView } from './CardView';
import { Bot, Crown, Sparkles, User, AlertCircle, Search } from 'lucide-react';

interface GameTableProps {
  gameState: ClientGameState;
  myPlayerId: string;
  onSelectOpponent?: (player: PlayerPublic) => void;
  selectablePlayerIds?: string[];
  onInspectCard?: (card: Card) => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  myPlayerId,
  onSelectOpponent,
  selectablePlayerIds = [],
  onInspectCard,
}) => {
  const { players, currentTurnPlayerId, round, incident, discardPile, latestPlayedCard } = gameState;

  // Other players (excluding myself) ordered clockwise starting from the next player
  const myIndex = players.findIndex((p) => p.id === myPlayerId);
  const otherPlayers: PlayerPublic[] = [];

  if (myIndex !== -1) {
    for (let i = 1; i < players.length; i++) {
      const idx = (myIndex + i) % players.length;
      otherPlayers.push(players[idx]);
    }
  } else {
    otherPlayers.push(...players);
  }

  // Calculate coordinates on an oval/ellipse table
  const getPlayerPosition = (index: number, total: number) => {
    if (total === 1) {
      return { top: '14%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    const startAngle = Math.PI * 0.95;
    const endAngle = Math.PI * 0.05;
    const angle = startAngle - (index / (total - 1)) * (startAngle - endAngle);

    const rx = 40;
    const ry = 36;
    const cx = 50;
    const cy = 46;

    const x = cx + rx * Math.cos(angle);
    const y = cy - ry * Math.sin(angle);

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="relative w-full h-[370px] sm:h-[450px] md:h-[490px] flex items-center justify-center p-2 select-none">
      {/* Cheerful Casino Green Felt Table */}
      <div
        className="relative w-full max-w-4xl h-full rounded-[100px] sm:rounded-[140px] md:rounded-[180px] p-3 sm:p-5 shadow-2xl flex items-center justify-center transition-all overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at center, #15803d 0%, #166534 65%, #14532d 100%)',
          boxShadow: 'inset 0 0 50px rgba(0,0,0,0.4), 0 15px 35px rgba(0,0,0,0.5)',
          border: '10px solid #854d0e',
          outline: '3px solid #facc15',
        }}
      >
        {/* Felt ornamental inner ring */}
        <div className="absolute inset-3 sm:inset-5 rounded-[85px] sm:rounded-[120px] md:rounded-[160px] border-2 border-yellow-300/30 pointer-events-none" />

        {/* Center Community Field */}
        <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 max-w-[260px] sm:max-w-xs text-center pointer-events-auto">
          {/* Central Discard Pile */}
          <div className="relative w-24 sm:w-28 h-32 sm:h-36 flex items-center justify-center">
            {discardPile.length === 0 ? (
              <div className="w-20 sm:w-24 h-28 sm:h-32 rounded-2xl border-2 border-dashed border-emerald-300/40 flex flex-col items-center justify-center text-emerald-100 text-xs font-bold bg-black/15 shadow-inner">
                <span>場札</span>
                <span className="text-[10px] opacity-75">捨て札置き場</span>
              </div>
            ) : (
              <>
                {/* Previous discarded cards stack */}
                {discardPile.slice(-3, -1).map((c, i) => (
                  <div
                    key={c.id + i}
                    onClick={() => onInspectCard && onInspectCard(c)}
                    className="absolute opacity-40 scale-95 cursor-pointer hover:opacity-80 transition"
                    style={{
                      transform: `rotate(${((i + 1) * 14 - 10)}deg) translate(${i * 4}px, ${i * 4}px)`,
                    }}
                  >
                    <CardView card={c} size="sm" showDetails={false} />
                  </div>
                ))}

                {/* Latest Discarded Card (Tapping it triggers zoom inspect!) */}
                {latestPlayedCard && (
                  <div
                    onClick={() => onInspectCard && onInspectCard(latestPlayedCard.card)}
                    className="relative animate-bounce-short z-20 cursor-pointer group"
                    title="タップしてカードを大きく表示"
                  >
                    <CardView
                      card={latestPlayedCard.card}
                      size="md"
                      onInspect={onInspectCard}
                    />
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-950/90 px-2 py-0.5 rounded-full text-[9px] text-amber-300 font-black whitespace-nowrap border border-amber-400 shadow-md flex items-center gap-1 group-hover:scale-105 transition">
                      <Search className="w-2.5 h-2.5" />
                      <span>{latestPlayedCard.playerName}の手札</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Round Indicator Badge */}
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-950/90 border border-emerald-400/50 rounded-full text-[10px] sm:text-xs text-yellow-300 font-extrabold shadow">
              第{round}巡目 {round >= 2 ? '（🔍探偵可能）' : '（1巡目:探偵不可）'}
            </span>
            <span className="px-2 py-0.5 bg-black/60 border border-white/20 rounded-full text-[10px] sm:text-xs text-stone-200 font-bold">
              捨て札: {discardPile.length}枚
            </span>
          </div>
        </div>

        {/* Players arranged along the table perimeter */}
        {otherPlayers.map((player, index) => {
          const isTurn = player.id === currentTurnPlayerId;
          const isSelectable = selectablePlayerIds.includes(player.id);
          const pos = getPlayerPosition(index, otherPlayers.length);

          return (
            <div
              key={player.id}
              onClick={() => isSelectable && onSelectOpponent && onSelectOpponent(player)}
              style={pos}
              className={`absolute flex flex-col items-center transition-all z-20 ${
                isSelectable ? 'cursor-pointer hover:scale-110 animate-pulse' : ''
              }`}
            >
              {/* Target Selection Indicator */}
              {isSelectable && (
                <div className="absolute -top-7 px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full shadow-lg border-2 border-yellow-200 whitespace-nowrap animate-bounce">
                  指名する！
                </div>
              )}

              {/* Fan of Face-Down Cards (Visualizes player's actual hand count) */}
              <div className="relative h-10 sm:h-12 w-20 sm:w-24 mb-1 flex items-center justify-center">
                {player.handCount === 0 ? (
                  <span className="text-[10px] text-stone-300 bg-black/60 px-1.5 py-0.5 rounded font-bold">
                    手札なし
                  </span>
                ) : (
                  Array.from({ length: Math.min(player.handCount, 6) }).map((_, cIdx) => {
                    const totalCards = Math.min(player.handCount, 6);
                    const angleOffset = (cIdx - (totalCards - 1) / 2) * 14;
                    const xOffset = (cIdx - (totalCards - 1) / 2) * 9;
                    return (
                      <div
                        key={cIdx}
                        className="absolute w-7 sm:w-9 h-10 sm:h-12 rounded-lg border-2 border-amber-300/80 shadow-md bg-gradient-to-br from-blue-900 to-slate-950 transition-transform origin-bottom overflow-hidden"
                        style={{
                          transform: `translateX(${xOffset}px) rotate(${angleOffset}deg)`,
                          zIndex: cIdx,
                        }}
                      >
                        <div className="w-full h-full p-0.5 flex items-center justify-center">
                          <div className="w-full h-full border border-amber-300/40 rounded flex items-center justify-center text-[10px] text-amber-300">
                            🎭
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Player Avatar Circle */}
              <div
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-xl border-3 transition-all ${
                  isTurn
                    ? 'border-yellow-300 ring-4 ring-yellow-400/60 scale-110 shadow-yellow-400/60 bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950'
                    : isSelectable
                    ? 'border-yellow-300 ring-4 ring-amber-400/80 bg-emerald-700 text-white'
                    : 'border-white/40 bg-slate-800 text-stone-200'
                }`}
              >
                {player.isBot ? (
                  <Bot className={`w-6 h-6 sm:w-7 sm:h-7 ${isTurn ? 'text-slate-950' : 'text-sky-300'}`} />
                ) : (
                  <User className={`w-6 h-6 sm:w-7 sm:h-7 ${isTurn ? 'text-slate-950' : 'text-stone-200'}`} />
                )}

                {/* Host Crown */}
                {player.isHost && (
                  <span className="absolute -top-1.5 -left-1 text-yellow-300 filter drop-shadow">
                    <Crown className="w-4 h-4 fill-yellow-400" />
                  </span>
                )}

                {/* Hand Count Badge */}
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center border-2 border-white shadow">
                  {player.handCount}
                </span>

                {/* Turn Pulsing Indicator */}
                {isTurn && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-80" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-yellow-400" />
                  </span>
                )}
              </div>

              {/* Player Name Tag */}
              <div className="mt-1 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex items-center gap-1 shadow max-w-[95px] sm:max-w-[125px]">
                <span
                  className={`text-[10px] sm:text-xs font-black truncate ${
                    isTurn ? 'text-yellow-300' : 'text-stone-100'
                  }`}
                >
                  {player.name}
                </span>
                {!player.connected && !player.isBot && (
                  <span className="text-[9px] text-rose-400 font-bold">切断</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
