import React, { useState } from 'react';
import { Card, ClientGameState } from '../types/game';
import { CardView } from './CardView';
import { Play, AlertCircle, HelpCircle, History, Volume2, VolumeX, MessageSquare, Info } from 'lucide-react';
import { sounds } from '../utils/sound';

interface PlayerHandProps {
  gameState: ClientGameState;
  myPlayerId: string;
  onPlayCard: (cardId: string) => void;
  onOpenRules: () => void;
  onOpenDashboard: () => void;
  onToggleLog: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onInspectCard?: (card: Card) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  gameState,
  myPlayerId,
  onPlayCard,
  onOpenRules,
  onOpenDashboard,
  onToggleLog,
  soundEnabled,
  onToggleSound,
  onInspectCard,
}) => {
  const { myHand, currentTurnPlayerId, round, phase, activeCardAction } = gameState;
  const isMyTurn = currentTurnPlayerId === myPlayerId && phase === 'playing' && !activeCardAction;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const selectedCard = myHand.find((c) => c.id === selectedCardId);

  // Validate if selected card can be played
  const getPlayableStatus = (card: Card): { canPlay: boolean; reason?: string } => {
    if (!isMyTurn) {
      return { canPlay: false, reason: '現在あなたのターンではありません' };
    }
    if (card.type === 'culprit' && myHand.length > 1) {
      return {
        canPlay: false,
        reason: '犯人は手札が残り1枚になるまで出せません！',
      };
    }
    if (card.type === 'detective' && round < 2) {
      return {
        canPlay: false,
        reason: '探偵は第2巡目以降から使えます（現在は第1巡目です）',
      };
    }
    return { canPlay: true };
  };

  const handleCardClick = (card: Card) => {
    sounds.selectCard();
    if (selectedCardId === card.id) {
      setSelectedCardId(null);
    } else {
      setSelectedCardId(card.id);
    }
  };

  const handlePlaySelected = () => {
    if (!selectedCard) return;
    const status = getPlayableStatus(selectedCard);
    if (!status.canPlay) return;

    sounds.playCard();
    onPlayCard(selectedCard.id);
    setSelectedCardId(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Turn Notice Ribbon */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 mb-1.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-xs shadow-md">
        <div className="flex items-center gap-2">
          {isMyTurn ? (
            <div className="flex items-center gap-1.5 text-yellow-300 font-extrabold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              あなたのターンです！カードを1枚選んで出してください
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-stone-300 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {gameState.players.find((p) => p.id === currentTurnPlayerId)?.name || '他プレイヤー'}の手番中...
            </div>
          )}
        </div>

        {/* Utility Tray Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-stone-300 hover:text-white transition"
            title="サウンド切替"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>
          <button
            onClick={onToggleLog}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-stone-300 hover:text-white transition"
            title="事件ログ"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">ログ</span>
          </button>
          <button
            onClick={onOpenDashboard}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-stone-300 hover:text-white transition"
            title="対戦履歴と戦績"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">戦績</span>
          </button>
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-amber-300 hover:text-amber-200 transition font-bold"
            title="遊び方・カード一覧"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">ルール</span>
          </button>
        </div>
      </div>

      {/* Selected Card Action Dock (When card is tapped) */}
      {selectedCard && (
        <div className="w-full mb-2 p-3 bg-slate-900/95 backdrop-blur-md border-2 border-amber-400/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-1.5 bg-black/40 rounded-xl">{selectedCard.icon}</span>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-300 text-base">{selectedCard.name}</span>
                {onInspectCard && (
                  <button
                    onClick={() => onInspectCard(selectedCard)}
                    className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold border border-white/20 flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>🔍</span>
                    <span>拡大表示</span>
                  </button>
                )}
              </div>
              <p className="text-xs font-bold text-white leading-snug mt-1">
                {selectedCard.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            {(() => {
              const status = getPlayableStatus(selectedCard);
              if (!status.canPlay) {
                return (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/80 border border-red-500/40 rounded-lg text-red-200 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{status.reason}</span>
                  </div>
                );
              }
              return (
                <button
                  onClick={handlePlaySelected}
                  className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  このカードを場に出す
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Hand Cards Dock */}
      <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-gradient-to-t from-black/90 via-slate-950/80 to-slate-900/60 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto py-2 px-1 min-h-[150px] scrollbar-thin scrollbar-thumb-amber-600/40">
          {myHand.length === 0 ? (
            <div className="text-stone-400 text-xs py-6 flex flex-col items-center gap-1">
              <span>手札がありません</span>
              <span className="text-[10px] text-stone-500">勝敗が決まるのを見守りましょう</span>
            </div>
          ) : (
            myHand.map((card) => {
              const isSelected = selectedCardId === card.id;
              const { canPlay } = getPlayableStatus(card);

              return (
                <div key={card.id} className="relative group shrink-0">
                  <CardView
                    card={card}
                    isSelected={isSelected}
                    isDisabled={!canPlay && isMyTurn}
                    onClick={() => handleCardClick(card)}
                    onInspect={onInspectCard}
                    size="md"
                  />
                  {/* Playable Pulse Ring when my turn */}
                  {isMyTurn && canPlay && !isSelected && (
                    <div className="absolute inset-0 rounded-xl border-2 border-yellow-400/60 pointer-events-none animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
