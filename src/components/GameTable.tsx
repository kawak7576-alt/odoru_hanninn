import React, { useState, useEffect } from 'react';
import { Card, ClientGameState, PlayerPublic } from '../types/game';
import { CardView } from './CardView';
import { TableMovementArrows } from './TableMovementArrows';
import { getStoredCardBackImage, DEFAULT_CARD_BACK_IMAGE } from '../utils/cardImageSetting';
import { Bot, Crown, Sparkles, User, AlertCircle, Search } from 'lucide-react';

interface GameTableProps {
  gameState: ClientGameState;
  myPlayerId: string;
  onSelectOpponent?: (player: PlayerPublic) => void;
  selectablePlayerIds?: string[];
  onInspectCard?: (card: Card, sourceLabel?: string) => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  myPlayerId,
  onSelectOpponent,
  selectablePlayerIds = [],
  onInspectCard,
}) => {
  const { players, currentTurnPlayerId, round, incident, discardPile, latestPlayedCard } = gameState;

  const [cardBackSrc, setCardBackSrc] = useState<string>(getStoredCardBackImage());

  useEffect(() => {
    const handleUpdate = () => {
      setCardBackSrc(getStoredCardBackImage());
    };
    window.addEventListener('odoru_card_image_updated', handleUpdate);
    return () => {
      window.removeEventListener('odoru_card_image_updated', handleUpdate);
    };
  }, []);

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
      return { top: '20%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    const startAngle = Math.PI * 0.90;
    const endAngle = Math.PI * 0.10;
    const angle = startAngle - (index / (total - 1)) * (startAngle - endAngle);

    // Keep top players well within the safe zone so their hand cards never clip
    const rx = 38;
    const ry = 28;
    const cx = 50;
    const cy = 48;

    const x = cx + rx * Math.cos(angle);
    const y = cy - ry * Math.sin(angle);

    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="relative w-full h-[360px] sm:h-[430px] md:h-[470px] flex items-center justify-center p-1 sm:p-2 select-none">
      {/* Cheerful Casino Green Felt Table with squarer corners for more perimeter space */}
      <div
        className="relative w-full max-w-4xl h-full rounded-3xl sm:rounded-[40px] p-2 sm:p-5 shadow-2xl flex items-center justify-center transition-all"
        style={{
          background: 'radial-gradient(ellipse at center, #15803d 0%, #166534 65%, #14532d 100%)',
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.45), 0 12px 30px rgba(0,0,0,0.5)',
          border: '7px solid #854d0e',
          outline: '3px solid #facc15',
        }}
      >
        {/* Felt ornamental inner ring */}
        <div className="absolute inset-2 sm:inset-3 rounded-2xl sm:rounded-[32px] border-2 border-yellow-300/30 pointer-events-none" />

        {/* Animated Card Movement Arrows & Gliding Cards */}
        <TableMovementArrows
          movement={gameState.latestMovement}
          otherPlayers={otherPlayers}
          myPlayerId={myPlayerId}
          cardBackSrc={cardBackSrc}
        />

        {/* Center Community Field: lowered placement and slightly scaled down field card */}
        <div className="absolute top-[64%] sm:top-[62%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 max-w-[280px] sm:max-w-xs text-center pointer-events-auto">
          {/* Central Discard Pile / Field Card */}
          <div className="relative w-24 sm:w-26 h-34 sm:h-38 flex items-center justify-center">
            {discardPile.length === 0 ? (
              <div className="w-24 sm:w-26 h-34 sm:h-38 rounded-xl border-2 border-dashed border-emerald-300/40 flex flex-col items-center justify-center text-emerald-100 text-xs font-bold bg-black/20 shadow-inner">
                <span className="font-black text-xs sm:text-sm">場札</span>
                <span className="text-[9px] opacity-75 mt-0.5">捨て札置き場</span>
              </div>
            ) : (
              <>
                {/* Previous discarded cards stack */}
                {discardPile.slice(-3, -1).map((c, i) => (
                  <div
                    key={c.id + i}
                    onClick={() => onInspectCard && onInspectCard(c, '捨て札置き場')}
                    className="absolute opacity-35 scale-95 cursor-pointer hover:opacity-75 transition pointer-events-none"
                    style={{
                      transform: `rotate(${((i + 1) * 12 - 8)}deg) translate(${i * 3}px, ${i * 3}px)`,
                    }}
                  >
                    <CardView card={c} size="field" showDetails={false} />
                  </div>
                ))}

                {/* Latest Played Card: exact same design as hand cards, slightly scaled down */}
                {latestPlayedCard && (
                  <div
                    onClick={() => onInspectCard && onInspectCard(latestPlayedCard.card, `${latestPlayedCard.playerName}が出したカード`)}
                    className="relative z-20 cursor-pointer group hover:scale-105 active:scale-95 transition-transform"
                    title="タップして詳細を表示"
                  >
                    <CardView
                      card={latestPlayedCard.card}
                      size="field"
                      onClick={() => onInspectCard && onInspectCard(latestPlayedCard.card, `${latestPlayedCard.playerName}が出したカード`)}
                    />
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-950/95 px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] text-amber-300 font-black whitespace-nowrap border border-amber-400 shadow-lg flex items-center gap-1 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                      <Search className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                      <span>{latestPlayedCard.playerName}が出したカード</span>
                    </div>
                  </div>
                )}
              </>
            )}
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
                        className="absolute w-7 sm:w-8 h-10 sm:h-12 rounded-lg border border-amber-300/80 shadow-md bg-slate-900 transition-transform origin-bottom overflow-hidden ring-1 ring-black/40"
                        style={{
                          transform: `translateX(${xOffset}px) rotate(${angleOffset}deg)`,
                          zIndex: cIdx,
                        }}
                      >
                        <img
                          src={cardBackSrc}
                          alt="手札裏面"
                          className="w-full h-full object-fill pointer-events-none select-none"
                          draggable={false}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_CARD_BACK_IMAGE;
                          }}
                        />
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
