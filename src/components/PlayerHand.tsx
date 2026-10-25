import React, { useState } from 'react';
import { Card, ClientGameState } from '../types/game';
import { CardView } from './CardView';
import { CardDetailModal } from './CardDetailModal';
import { Play, AlertCircle, HelpCircle, History, Volume2, VolumeX, MessageSquare, Sparkles, ChevronRight } from 'lucide-react';
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
}) => {
  const { myHand, currentTurnPlayerId, round, phase, activeCardAction } = gameState;
  const isMyTurn = currentTurnPlayerId === myPlayerId && phase === 'playing' && !activeCardAction;

  // Selected card for modal inspection and play flow
  const [modalCard, setModalCard] = useState<Card | null>(null);

  // Validate if a card can be played
  const getPlayableStatus = (card: Card): { canPlay: boolean; reason?: string } => {
    if (!isMyTurn) {
      const turnPlayer = gameState.players.find((p) => p.id === currentTurnPlayerId);
      return {
        canPlay: false,
        reason: `${turnPlayer ? turnPlayer.name : '相手'}の手番中です（効果の確認のみ可能）`,
      };
    }
    if (card.type === 'culprit' && myHand.length > 1) {
      return {
        canPlay: false,
        reason: '犯人カードは手札が「最後の1枚」になるまで出せません！',
      };
    }
    if (card.type === 'detective' && round < 2) {
      return {
        canPlay: false,
        reason: '探偵カードは第2巡目以降から使えます（現在は第1巡目です）',
      };
    }
    return { canPlay: true };
  };

  const handleCardClick = (card: Card) => {
    sounds.selectCard();
    setModalCard(card);
  };

  const handleExecutePlay = (cardId: string) => {
    sounds.playCard();
    onPlayCard(cardId);
    setModalCard(null);
  };

  const turnPlayerName = gameState.players.find((p) => p.id === currentTurnPlayerId)?.name || '他プレイヤー';

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* 5. 自分のターンと次の操作: Stepped Instruction Ribbon */}
      <div className={`w-full flex items-center justify-between px-3 py-2 mb-2 rounded-2xl border backdrop-blur-md shadow-lg transition-all ${
        isMyTurn
          ? 'bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-amber-950/90 border-amber-400/80 text-amber-200'
          : 'bg-slate-900/90 border-white/10 text-stone-300'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          {isMyTurn ? (
            <>
              <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0 animate-ping" />
              <div className="text-xs font-black truncate leading-tight">
                <span className="text-yellow-300">【あなたの手番】</span>
                <span className="text-white ml-1">出したいカードをタップして詳細を確認してください</span>
              </div>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <div className="text-xs font-medium truncate leading-tight">
                <span className="text-emerald-300 font-bold">【{turnPlayerName}】</span>
                <span className="text-stone-300 ml-1">が思考中...（カードをタップして効果を確認できます）</span>
              </div>
            </>
          )}
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-stone-300 hover:text-white transition"
            title="サウンド切替"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-stone-500" />}
          </button>
          <button
            onClick={onToggleLog}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-stone-300 hover:text-white transition flex items-center gap-1 text-[11px] font-bold"
            title="事件ログ"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">ログ</span>
          </button>
          <button
            onClick={onOpenRules}
            className="p-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 transition flex items-center gap-1 text-[11px] font-bold"
            title="ルール説明"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">ルール</span>
          </button>
        </div>
      </div>

      {/* 6. 自分の手札: Hand Cards Area with Horizontal Scroll Affordance */}
      <div className="w-full rounded-3xl bg-gradient-to-t from-slate-950 via-slate-900 to-slate-950/80 border-2 border-white/15 p-2.5 sm:p-3 shadow-2xl relative">
        {/* Hand Header info */}
        <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-white/10 text-xs font-bold text-stone-300">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400">🎴</span>
            <span className="font-black text-white text-xs sm:text-sm">自分の手札</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/40">
              {myHand.length}枚
            </span>
          </div>

          <div className="text-[10px] text-stone-400 font-medium">
            {myHand.length > 2 ? 'タップして効果確認・場に出す →' : 'タップで詳細表示'}
          </div>
        </div>

        {/* Scroll Container with visual edge fades */}
        <div className="relative w-full">
          {/* Left scroll edge shadow */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-950 to-transparent z-10" />

          {/* Right scroll edge shadow with hint */}
          {myHand.length > 3 && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent z-10 flex items-center justify-end pr-1">
              <ChevronRight className="w-4 h-4 text-amber-400/80 animate-pulse" />
            </div>
          )}

          <div className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-amber-500/40 scrollbar-track-black/20">
            {myHand.length === 0 ? (
              <div className="w-full text-center text-stone-400 text-xs py-8 flex flex-col items-center gap-1.5">
                <span className="text-2xl">✨</span>
                <span className="font-bold text-stone-300">手札のカードをすべて使い切りました！</span>
                <span className="text-[11px] text-stone-500">ゲームの決着を見守りましょう</span>
              </div>
            ) : (
              myHand.map((card) => {
                const status = getPlayableStatus(card);

                return (
                  <div key={card.id} className="relative shrink-0">
                    <CardView
                      card={card}
                      size="hand"
                      isDisabled={!status.canPlay && isMyTurn}
                      unplayableReason={!status.canPlay && isMyTurn ? status.reason : undefined}
                      onClick={() => handleCardClick(card)}
                    />
                    {/* Glowing highlight ring when my turn and card is playable */}
                    {isMyTurn && status.canPlay && (
                      <div className="absolute inset-0 rounded-xl border-2 border-yellow-300 pointer-events-none shadow-lg shadow-yellow-400/30 animate-pulse" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Central Card Detail Modal on Tap */}
      {modalCard && (
        <CardDetailModal
          card={modalCard}
          canPlay={getPlayableStatus(modalCard).canPlay}
          unplayableReason={getPlayableStatus(modalCard).reason}
          isMyTurn={isMyTurn}
          onPlay={handleExecutePlay}
          onClose={() => setModalCard(null)}
        />
      )}
    </div>
  );
};
