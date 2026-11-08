import React, { useState, useEffect, useMemo } from 'react';
import { Card, ClientGameState } from '../types/game';
import { CardView } from './CardView';
import { CardDetailModal } from './CardDetailModal';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { sounds } from '../utils/sound';
import { getStoredCardBackImage, DEFAULT_CARD_BACK_IMAGE } from '../utils/cardImageSetting';

interface PlayerHandProps {
  gameState: ClientGameState;
  myPlayerId: string;
  onPlayCard: (cardId: string) => void;
  onOpenRules?: () => void;
  onOpenDashboard?: () => void;
  onToggleLog: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onInspectCard?: (card: Card) => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  gameState,
  myPlayerId,
  onPlayCard,
  onToggleLog,
}) => {
  const { myHand, currentTurnPlayerId, round, phase, activeCardAction } = gameState;
  const isMyTurn = currentTurnPlayerId === myPlayerId && phase === 'playing' && !activeCardAction;

  // Selected card for modal inspection and play flow
  const [modalCard, setModalCard] = useState<Card | null>(null);
  const [cardBackSrc, setCardBackSrc] = useState<string>(getStoredCardBackImage);

  useEffect(() => {
    const handleUpdate = () => {
      setCardBackSrc(getStoredCardBackImage());
    };
    window.addEventListener('odoru_card_image_updated', handleUpdate);
    return () => window.removeEventListener('odoru_card_image_updated', handleUpdate);
  }, []);

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

  // Find the most recent card action or resolution log
  const latestActionLog = useMemo(() => {
    const logs = gameState.logs || [];
    for (let i = logs.length - 1; i >= 0; i--) {
      const text = logs[i].text;
      if (
        (text.startsWith('【') || text.includes('カードにより') || text.includes('手札') || text.includes('出しました') || text.includes('告発')) &&
        !text.includes('のターンです') &&
        !text.includes('に突入しました') &&
        !text.includes('が再接続しました') &&
        !text.includes('が参加しました') &&
        !text.includes('がロビーから退出')
      ) {
        return text;
      }
    }
    return logs[logs.length - 1]?.text || '【捜査中】カードを出して事件の真相に迫りましょう';
  }, [gameState.logs]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* 5. 直前の行動ログ表示バー: 【プレイヤー名】○○カードにより、○○～ 💬ログ */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 sm:py-2 mb-2 rounded-2xl border border-amber-400/40 bg-slate-900/95 backdrop-blur-md shadow-lg gap-2 text-stone-200">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-amber-400 text-xs shrink-0 select-none">⚡</span>
          <div className="text-xs font-bold leading-tight line-clamp-2 text-stone-100 flex-1">
            {latestActionLog}
          </div>
        </div>

        {/* 💬 ログ ボタン */}
        <button
          onClick={onToggleLog}
          className="px-2.5 py-1 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 active:scale-95 text-amber-300 hover:text-amber-200 border border-amber-400/30 transition flex items-center gap-1 text-xs font-black shrink-0 cursor-pointer shadow-sm"
          title="事件ログ履歴を開く"
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span>ログ</span>
        </button>
      </div>

      {/* 6. 自分の手札: Hand Cards Area with Horizontal Scroll Affordance */}
      <div className="w-full rounded-3xl bg-gradient-to-t from-slate-950 via-slate-900 to-slate-950/80 border-2 border-white/15 p-2.5 sm:p-3 shadow-2xl relative">
        {/* Hand Header info */}
        <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-white/10 text-xs font-bold text-stone-300">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-5 sm:w-5.5 h-7 sm:h-7.5 rounded-[4px] overflow-hidden border border-amber-400/80 shadow-md shrink-0 bg-slate-900 flex items-center justify-center transition-transform hover:scale-105">
              <img
                src={cardBackSrc}
                alt="手札カード裏面"
                className="w-full h-full object-fill select-none pointer-events-none"
                draggable={false}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_CARD_BACK_IMAGE;
                }}
              />
            </div>
            <span className="font-black text-white text-xs sm:text-sm">自分の手札</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/40">
              {myHand.length}枚
            </span>

            {/* あなたの手番 / 【○○】が思考中 (手札枚数の右側に配置) */}
            {isMyTurn ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-yellow-400/25 text-yellow-300 text-xs font-black border border-yellow-400/60 shadow-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                <span>あなたの手番</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/90 text-stone-300 text-xs font-medium border border-white/10 truncate max-w-[170px] sm:max-w-[260px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">【{turnPlayerName}】が思考中...</span>
              </span>
            )}
          </div>

          <div className="text-[10px] text-stone-400 font-medium hidden sm:block">
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
