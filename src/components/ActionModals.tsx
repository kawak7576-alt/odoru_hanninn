import React, { useState } from 'react';
import { Card, ClientGameState } from '../types/game';
import { CardView } from './CardView';
import { CardDetailModal } from './CardDetailModal';
import { DEFAULT_INCIDENTS } from '../game/cardData';
import { sounds } from '../utils/sound';
import { Handshake, Search, ChevronRight } from 'lucide-react';

interface ActionModalsProps {
  gameState: ClientGameState;
  myPlayerId: string;
  onFirstDiscovererSubmit: (incident: string) => void;
  onDetectiveAccuse: (targetPlayerId: string) => void;
  onTradeOffer: (targetPlayerId: string, cardId: string) => void;
  onTradeAccept: (cardId: string) => void;
  onWitnessTarget: (targetPlayerId: string) => void;
  onWitnessDone: () => void;
  onDogAction: (targetPlayerId: string, cardIndex: number) => void;
  onBoyDone: () => void;
  onRumorPick: (cardIndex: number) => void;
  onInfoManipulationPick: (cardId: string) => void;
  onInspectCard?: (card: Card) => void;
}

// Unified horizontal scroll container for cards in action modals
const ScrollableCardList: React.FC<{
  children: React.ReactNode;
  count: number;
  hint?: string;
}> = ({ children, count, hint = '横スクロールできます →' }) => (
  <div className="w-full relative my-2">
    {count > 2 && (
      <div className="text-[10px] text-amber-300/80 font-bold mb-1 flex items-center justify-end gap-1 px-1">
        <span>{hint}</span>
        <ChevronRight className="w-3 h-3 text-amber-400 animate-pulse" />
      </div>
    )}
    <div className="relative w-full rounded-2xl bg-black/40 border border-white/10 p-2 shadow-inner">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-slate-900 to-transparent z-10 rounded-l-2xl" />
      {count > 2 && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-900 to-transparent z-10 flex items-center justify-end pr-0.5 rounded-r-2xl">
          <ChevronRight className="w-4 h-4 text-amber-400/80 animate-pulse" />
        </div>
      )}
      <div className="flex items-center gap-3 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-amber-500/40 scrollbar-track-black/20">
        {children}
      </div>
    </div>
  </div>
);

export const ActionModals: React.FC<ActionModalsProps> = ({
  gameState,
  myPlayerId,
  onFirstDiscovererSubmit,
  onDetectiveAccuse,
  onTradeOffer,
  onTradeAccept,
  onWitnessTarget,
  onWitnessDone,
  onDogAction,
  onBoyDone,
  onRumorPick,
  onInfoManipulationPick,
}) => {
  const { phase, currentTurnPlayerId, activeCardAction, secretInfo, players, myHand } = gameState;
  const isMyTurn = currentTurnPlayerId === myPlayerId;

  // Local states
  const [customIncident, setCustomIncident] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedMyCardId, setSelectedMyCardId] = useState<string>('');
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [selectedRumorIdx, setSelectedRumorIdx] = useState<number | null>(null);
  const [submittedRumor, setSubmittedRumor] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState(false);

  React.useEffect(() => {
    if (phase !== 'waiting_rumor') {
      setSubmittedRumor(false);
      setSelectedRumorIdx(null);
    }
    if (phase !== 'waiting_info_manipulation') {
      setSubmittedInfo(false);
      setSelectedMyCardId('');
    }
  }, [phase]);

  // Detail inspection modal inside action modal
  const [detailCard, setDetailCard] = useState<{
    card: Card;
    isFieldCard?: boolean;
    fieldSourceLabel?: string;
    playButtonText?: string;
    onPlay?: (cardId: string) => void;
  } | null>(null);

  const opponents = players.filter((p) => p.id !== myPlayerId && p.handCount > 0);

  // Render modal wrapped with CardDetailModal so detailed screen is always accessible
  const renderModal = (content: React.ReactNode) => (
    <>
      {content}
      {detailCard && (
        <CardDetailModal
          card={detailCard.card}
          canPlay={!!detailCard.onPlay}
          isFieldCard={detailCard.isFieldCard}
          fieldSourceLabel={detailCard.fieldSourceLabel}
          playButtonText={detailCard.playButtonText}
          onPlay={detailCard.onPlay}
          onClose={() => setDetailCard(null)}
        />
      )}
    </>
  );

  // 1. First Discoverer Modal
  if (phase === 'first_discoverer_turn' && isMyTurn) {
    const handleStart = () => {
      const inc = customIncident.trim() || DEFAULT_INCIDENTS[Math.floor(Math.random() * DEFAULT_INCIDENTS.length)];
      sounds.turnAlert();
      onFirstDiscovererSubmit(inc);
    };

    return renderModal(
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-5 text-center shadow-2xl animate-scale-up">
          <div className="text-4xl mb-2">🚨</div>
          <h2 className="text-lg font-black text-amber-300">あなたが「第一発見者」です！</h2>
          <p className="text-xs text-stone-300 mt-1 mb-4">
            今回起きた事件の概要を発表して、ゲームをスタートさせましょう。
          </p>

          <input
            type="text"
            value={customIncident}
            onChange={(e) => setCustomIncident(e.target.value)}
            placeholder="例: 冷蔵庫のプリンが消えました！"
            className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400 mb-3"
            maxLength={50}
          />

          <div className="flex flex-wrap gap-1.5 justify-center mb-4">
            {DEFAULT_INCIDENTS.slice(0, 3).map((text, i) => (
              <button
                key={i}
                onClick={() => setCustomIncident(text)}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-stone-300 px-2 py-1 rounded border border-white/10"
              >
                {text}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onFirstDiscovererSubmit('')}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-stone-300 text-xs font-bold transition"
            >
              おまかせで開始
            </button>
            <button
              onClick={handleStart}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 transition"
            >
              事件を発表して開始！
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Detective Modal (when I played Detective)
  if (isMyTurn && activeCardAction?.cardType === 'detective') {
    const handleAccuse = () => {
      if (!selectedTargetId) return;
      sounds.accuse();
      onDetectiveAccuse(selectedTargetId);
      setSelectedTargetId('');
    };

    return renderModal(
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-sky-500/80 rounded-2xl max-w-md w-full p-5 text-center shadow-2xl">
          <div className="text-4xl mb-2">🔍</div>
          <h2 className="text-lg font-black text-sky-300">探偵の推理！誰を疑いますか？</h2>
          <p className="text-xs text-stone-300 mt-1 mb-4">
            指名した相手が「犯人」を持ち、かつ「アリバイ」を持っていなければ即座に勝利！
          </p>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {opponents.map((p) => {
              const isSelected = selectedTargetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedTargetId(p.id)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-sky-950 border-sky-400 ring-2 ring-sky-400 text-white shadow-lg'
                      : 'bg-slate-800/80 border-white/10 text-stone-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-bold text-sm">{p.name}</span>
                  <span className="text-[10px] text-stone-400 mt-0.5">手札: {p.handCount}枚</span>
                </button>
              );
            })}
          </div>

          <button
            disabled={!selectedTargetId}
            onClick={handleAccuse}
            className={`w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition ${
              selectedTargetId
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white cursor-pointer'
                : 'bg-slate-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <Search className="w-4 h-4" />
            このプレイヤーを犯人として告発する！
          </button>
        </div>
      </div>
    );
  }

  // 3. Trade Offer Modal (I played Trade)
  if (isMyTurn && activeCardAction?.cardType === 'trade') {
    const handleSendTrade = () => {
      if (!selectedTargetId || !selectedMyCardId) return;
      onTradeOffer(selectedTargetId, selectedMyCardId);
      setSelectedTargetId('');
      setSelectedMyCardId('');
    };

    return renderModal(
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div className="bg-slate-900 border-2 border-orange-500/80 rounded-3xl max-w-lg w-full p-4 sm:p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
          <div className="text-center mb-2">
            <span className="text-3xl">🤝</span>
            <h2 className="text-lg font-black text-orange-300">秘密の取り引き</h2>
            <p className="text-xs text-stone-300 mt-0.5">
              相手を指名し、自分が渡すカードを1枚選択してください。
            </p>
          </div>

          {/* Step 1: Select Target */}
          <div className="mb-2">
            <label className="text-xs font-black text-amber-300 mb-1 block">
              1. 誰と取り引きしますか？
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {opponents.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTargetId(p.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center cursor-pointer ${
                    selectedTargetId === p.id
                      ? 'bg-orange-950 border-orange-400 text-white ring-2 ring-orange-400 shadow-lg'
                      : 'bg-slate-800/80 border-white/10 text-stone-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="truncate font-black">{p.name}</div>
                  <div className="text-[10px] text-stone-400">手札 {p.handCount}枚</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Card to Give (unified hand design and size) */}
          <div className="mb-3">
            <label className="text-xs font-black text-amber-300 mb-0.5 block">
              2. 相手に渡すカードを選んでください
            </label>
            <ScrollableCardList count={myHand.length}>
              {myHand.map((c) => (
                <div key={c.id} className="shrink-0 relative">
                  <CardView
                    card={c}
                    size="hand"
                    isSelected={selectedMyCardId === c.id}
                    onClick={() => {
                      sounds.selectCard();
                      setDetailCard({
                        card: c,
                        isFieldCard: false,
                        playButtonText: 'このカードで決定',
                        onPlay: (cardId) => {
                          setSelectedMyCardId(cardId);
                          setDetailCard(null);
                        },
                      });
                    }}
                  />
                </div>
              ))}
            </ScrollableCardList>
            <p className="text-[10px] text-stone-400 text-center">
              ※ カードをタップすると詳細画面が開き、「決定」または「戻る」で選択できます
            </p>
          </div>

          <button
            disabled={!selectedTargetId || !selectedMyCardId}
            onClick={handleSendTrade}
            className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition ${
              selectedTargetId && selectedMyCardId
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-slate-950 cursor-pointer shadow-orange-500/30'
                : 'bg-slate-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <Handshake className="w-4 h-4" />
            取り引きを申し込む
          </button>
        </div>
      </div>
    );
  }

  // 4. Trade Received Prompt (Someone offered trade to me)
  if (secretInfo?.tradeOfferPrompt) {
    const { fromPlayerName } = secretInfo.tradeOfferPrompt;
    const handleAcceptTrade = () => {
      if (!selectedMyCardId) return;
      onTradeAccept(selectedMyCardId);
      setSelectedMyCardId('');
    };

    return renderModal(
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div className="bg-slate-900 border-2 border-orange-500 rounded-3xl max-w-lg w-full p-4 sm:p-5 text-center shadow-2xl animate-bounce-short flex flex-col max-h-[92vh] overflow-y-auto">
          <div className="text-3xl mb-1">🤝</div>
          <h2 className="text-lg font-black text-orange-300">取り引きの要請！</h2>
          <p className="text-xs text-stone-200 mt-1 mb-2">
            【{fromPlayerName}】から取り引きを申し込まれました。<br />
            渡すカードを1枚選んでください（内容は相手に知られません）。
          </p>

          <ScrollableCardList count={myHand.length}>
            {myHand.map((c) => (
              <div key={c.id} className="shrink-0 relative">
                <CardView
                  card={c}
                  size="hand"
                  isSelected={selectedMyCardId === c.id}
                  onClick={() => {
                    sounds.selectCard();
                    setDetailCard({
                      card: c,
                      isFieldCard: false,
                      playButtonText: 'このカードで決定',
                      onPlay: (cardId) => {
                        setSelectedMyCardId(cardId);
                        setDetailCard(null);
                      },
                    });
                  }}
                />
              </div>
            ))}
          </ScrollableCardList>
          <p className="text-[10px] text-stone-400 text-center mb-3">
            ※ カードをタップすると詳細画面が開き、「決定」または「戻る」で選択できます
          </p>

          <button
            disabled={!selectedMyCardId}
            onClick={handleAcceptTrade}
            className={`w-full py-3 rounded-xl font-black text-sm shadow-lg transition ${
              selectedMyCardId
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:brightness-110 cursor-pointer shadow-orange-500/30'
                : 'bg-slate-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            カードを渡して取り引き完了
          </button>
        </div>
      </div>
    );
  }

  // 5. Witness Target Selection (I played Witness)
  if (isMyTurn && activeCardAction?.cardType === 'witness' && !secretInfo?.witnessCards) {
    return renderModal(
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-cyan-500/80 rounded-2xl max-w-md w-full p-5 text-center shadow-2xl">
          <div className="text-4xl mb-2">👁️</div>
          <h2 className="text-lg font-black text-cyan-300">目撃者の視線！誰の手札を見ますか？</h2>
          <p className="text-xs text-stone-300 mt-1 mb-4">
            指名した相手の手札すべてをあなただけが確認できます。
          </p>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {opponents.map((p) => (
              <button
                key={p.id}
                onClick={() => onWitnessTarget(p.id)}
                className="p-3 rounded-xl border border-white/10 bg-slate-800 hover:bg-cyan-950 hover:border-cyan-400 text-stone-200 transition-all flex flex-col items-center cursor-pointer"
              >
                <span className="font-bold text-sm">{p.name}</span>
                <span className="text-[10px] text-stone-400 mt-0.5">手札: {p.handCount}枚</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 6. Witness Secret Result Revealed (I am viewing their cards with unified design & detail tap)
  if (secretInfo?.witnessCards) {
    const { targetName, cards } = secretInfo.witnessCards;
    return renderModal(
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div className="bg-slate-900 border-2 border-cyan-400 rounded-3xl max-w-lg w-full p-4 sm:p-5 text-center shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
          <div className="text-3xl mb-1">👁️</div>
          <h2 className="text-base sm:text-lg font-black text-cyan-300">
            【{targetName}】の手札を目撃しました！
          </h2>
          <p className="text-xs text-stone-300 mt-1 mb-2">
            この情報はあなただけに表示されています（カードをタップで詳細確認）。
          </p>

          <ScrollableCardList count={cards.length}>
            {cards.map((c) => (
              <div key={c.id} className="shrink-0 relative">
                <CardView
                  card={c}
                  size="hand"
                  onClick={() => {
                    sounds.selectCard();
                    setDetailCard({
                      card: c,
                      isFieldCard: true,
                      fieldSourceLabel: `目撃した【${targetName}】の手札`,
                    });
                  }}
                  onInspect={(card) => {
                    setDetailCard({
                      card,
                      isFieldCard: true,
                      fieldSourceLabel: `目撃した【${targetName}】の手札`,
                    });
                  }}
                />
              </div>
            ))}
          </ScrollableCardList>
          <p className="text-[10px] text-cyan-300/80 mb-3">
            ※ カードをタップすると、公式ルールや効果の詳細ポップアップが開きます
          </p>

          <button
            onClick={onWitnessDone}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm rounded-xl shadow-lg shadow-cyan-500/30 cursor-pointer transition active:scale-95"
          >
            確認しました（手番終了）
          </button>
        </div>
      </div>
    );
  }

  // 7. Dog Action Modal (Face-down cards unified with hand size)
  if (isMyTurn && activeCardAction?.cardType === 'dog') {
    const selectedOpponent = opponents.find((p) => p.id === selectedTargetId);

    const handleSniff = () => {
      if (!selectedTargetId) return;
      onDogAction(selectedTargetId, selectedCardIndex);
      setSelectedTargetId('');
      setSelectedCardIndex(0);
    };

    return renderModal(
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div className="bg-slate-900 border-2 border-amber-600 rounded-3xl max-w-lg w-full p-4 sm:p-5 text-center shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
          <div className="text-3xl mb-1">🐕</div>
          <h2 className="text-lg font-black text-amber-300">いぬの鋭い嗅覚！</h2>
          <p className="text-xs text-stone-300 mt-1 mb-3">
            指名した相手の手札から1枚選び公開します。「犯人」なら即時勝利！（アリバイ無効）
          </p>

          {/* Select Opponent */}
          <div className="mb-3 text-left">
            <label className="text-xs font-black text-amber-300 mb-1 block">
              1. どのプレイヤーの手札を嗅ぎますか？
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {opponents.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedTargetId(p.id);
                    setSelectedCardIndex(0);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center cursor-pointer ${
                    selectedTargetId === p.id
                      ? 'bg-amber-950 border-amber-400 text-white ring-2 ring-amber-400 shadow-lg'
                      : 'bg-slate-800/80 border-white/10 text-stone-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="truncate font-black">{p.name}</div>
                  <div className="text-[10px] text-stone-400">手札 {p.handCount}枚</div>
                </button>
              ))}
            </div>
          </div>

          {/* Select Card Index with Face-Down CardView (exact same size as hand cards) */}
          {selectedOpponent && (
            <div className="mb-3 text-left">
              <label className="text-xs font-black text-amber-300 mb-1 block">
                2. 【{selectedOpponent.name}】のどの手札を嗅ぎますか？
              </label>
              <ScrollableCardList count={selectedOpponent.handCount} hint="横にスクロールして手札を選択 →">
                {Array.from({ length: selectedOpponent.handCount }).map((_, idx) => (
                  <div key={idx} className="shrink-0 relative">
                    <CardView
                      isFaceDown={true}
                      faceDownBadge={`手札 #${idx + 1}`}
                      size="hand"
                      isSelected={selectedCardIndex === idx}
                      onClick={() => {
                        sounds.selectCard();
                        setSelectedCardIndex(idx);
                      }}
                    />
                  </div>
                ))}
              </ScrollableCardList>
            </div>
          )}

          <button
            disabled={!selectedTargetId}
            onClick={handleSniff}
            className={`w-full py-3 rounded-xl font-black text-sm shadow-lg transition ${
              selectedTargetId
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 cursor-pointer shadow-amber-500/30'
                : 'bg-slate-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            {selectedOpponent
              ? `手札 #${selectedCardIndex + 1} を暴く！`
              : '対象プレイヤーを選択してください'}
          </button>
        </div>
      </div>
    );
  }

  // 8. Boy Secret Notice (I played Boy)
  if (secretInfo?.boyCulpritHolder && isMyTurn && activeCardAction?.cardType === 'boy') {
    const { name } = secretInfo.boyCulpritHolder;
    return renderModal(
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-teal-400 rounded-2xl max-w-md w-full p-5 text-center shadow-2xl animate-fade-in">
          <div className="text-4xl mb-2">👦</div>
          <h2 className="text-lg font-black text-teal-300">少年の直感！</h2>
          <p className="text-xs text-stone-300 mt-1 mb-3">
            少年が耳元でこっそり犯人カードの持ち主を囁きました...
          </p>

          <div className="my-4 p-4 rounded-xl bg-teal-950/70 border border-teal-400/40 text-sm">
            <span className="text-stone-300 text-xs block mb-1">現在「犯人」カードを持っているのは...</span>
            <span className="text-xl font-black text-teal-200">【 {name} 】</span>
          </div>

          <p className="text-[10px] text-teal-400/80 mb-4">
            ※ この情報はあなただけに教えられました。他プレイヤーには絶対に秘密です！
          </p>

          <button
            onClick={onBoyDone}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl shadow cursor-pointer"
          >
            理解しました（手番終了）
          </button>
        </div>
      </div>
    );
  }

  // 9. Rumor Phase (Everyone draws from right neighbor with face-down cards matching hand size)
  if (phase === 'waiting_rumor' && secretInfo?.rumorWaitPrompt) {
    const { rightNeighborName, rightNeighborCardCount } = secretInfo.rumorWaitPrompt;

    if (rightNeighborCardCount === 0) {
      return renderModal(
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-pink-500 rounded-3xl max-w-lg w-full p-5 text-center shadow-2xl flex flex-col items-center">
            <div className="text-3xl mb-2">💬</div>
            <h2 className="text-lg font-black text-pink-300">【うわさ】発動中</h2>
            <p className="text-xs text-stone-200 mt-1 mb-4 leading-relaxed">
              右隣の【{rightNeighborName}】の手札が0枚のため、引くカードはありません。<br />
              他のプレイヤーの選択完了を待っています...
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-pink-400 font-bold bg-pink-950/60 border border-pink-500/40 px-4 py-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
              待機中（全員の完了待ち）...
            </div>
          </div>
        </div>
      );
    }

    if (submittedRumor) {
      return renderModal(
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-pink-500 rounded-3xl max-w-lg w-full p-5 text-center shadow-2xl flex flex-col items-center">
            <div className="text-3xl mb-2">💬</div>
            <h2 className="text-lg font-black text-pink-300">【うわさ】選択完了！</h2>
            <p className="text-xs text-stone-200 mt-1 mb-4 leading-relaxed">
              右隣の【{rightNeighborName}】の手札を選択しました。<br />
              全員の選択が揃うとカードが一斉に移動します。
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-pink-400 font-bold bg-pink-950/60 border border-pink-500/40 px-4 py-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
              他のプレイヤーの選択を待っています...
            </div>
          </div>
        </div>
      );
    }

    return renderModal(
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div className="bg-slate-900 border-2 border-pink-500 rounded-3xl max-w-lg w-full p-4 sm:p-5 text-center shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
          <div className="text-3xl mb-1">💬</div>
          <h2 className="text-lg font-black text-pink-300">【うわさ】の刻！</h2>
          <p className="text-xs text-stone-300 mt-1 mb-2">
            全員が一斉に右隣のプレイヤーの手札から1枚引きます。<br />
            右隣の【{rightNeighborName}】の手札から引くカードを選んでください！
          </p>

          <ScrollableCardList count={rightNeighborCardCount} hint="横にスクロールして手札を選択 →">
            {Array.from({ length: rightNeighborCardCount }).map((_, idx) => (
              <div key={idx} className="shrink-0 relative">
                <CardView
                  isFaceDown={true}
                  faceDownBadge={`手札 #${idx + 1}`}
                  size="hand"
                  isSelected={selectedRumorIdx === idx}
                  onClick={() => {
                    sounds.selectCard();
                    setSelectedRumorIdx(idx);
                  }}
                />
              </div>
            ))}
          </ScrollableCardList>

          <p className="text-[10px] text-stone-400 mb-3">
            ※ 全員の選択が揃い次第、同時に手札が入れ替わります。
          </p>

          <button
            disabled={selectedRumorIdx === null}
            onClick={() => {
              if (selectedRumorIdx !== null) {
                onRumorPick(selectedRumorIdx);
                setSubmittedRumor(true);
              }
            }}
            className={`w-full py-3 rounded-xl font-black text-sm shadow-lg transition ${
              selectedRumorIdx !== null
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:brightness-110 cursor-pointer shadow-pink-500/30 active:scale-95'
                : 'bg-slate-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            {selectedRumorIdx !== null
              ? `手札 #${selectedRumorIdx + 1} を引く！`
              : '引く手札をタップして選択してください'}
          </button>
        </div>
      </div>
    );
  }

  // 10. Information Manipulation Phase (Giving 1 card to left neighbor with unified hand design & detail)
  if (phase === 'waiting_info_manipulation' && secretInfo?.infoManipulationPrompt) {
    if (myHand.length === 0) {
      return renderModal(
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-violet-500 rounded-3xl max-w-lg w-full p-5 text-center shadow-2xl flex flex-col items-center">
            <div className="text-3xl mb-2">🔄</div>
            <h2 className="text-lg font-black text-violet-300">【情報操作】発動中</h2>
            <p className="text-xs text-stone-200 mt-1 mb-4 leading-relaxed">
              現在あなたの手札が0枚のため、左隣へ渡すカードはありません。<br />
              （右隣のプレイヤーがカードを持っていれば受け取ることができます）<br />
              他のプレイヤーの選択完了を待っています...
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-violet-400 font-bold bg-violet-950/60 border border-violet-500/40 px-4 py-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping"></span>
              待機中（全員の完了待ち）...
            </div>
          </div>
        </div>
      );
    }

    if (submittedInfo) {
      return renderModal(
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-violet-500 rounded-3xl max-w-lg w-full p-5 text-center shadow-2xl flex flex-col items-center">
            <div className="text-3xl mb-2">🔄</div>
            <h2 className="text-lg font-black text-violet-300">【情報操作】選択完了！</h2>
            <p className="text-xs text-stone-200 mt-1 mb-4 leading-relaxed">
              左隣へ渡すカードを選択しました。<br />
              全員の選択が揃うとカードが一斉に移動します。
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-violet-400 font-bold bg-violet-950/60 border border-violet-500/40 px-4 py-2.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping"></span>
              他のプレイヤーの選択を待っています...
            </div>
          </div>
        </div>
      );
    }

    return renderModal(
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div className="bg-slate-900 border-2 border-violet-500 rounded-3xl max-w-lg w-full p-4 sm:p-5 text-center shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
          <div className="text-3xl mb-1">🔄</div>
          <h2 className="text-lg font-black text-violet-300">【情報操作】の刻！</h2>
          <p className="text-xs text-stone-300 mt-1 mb-2">
            全員が一斉に左隣のプレイヤーへ手札を1枚渡します。<br />
            渡すカードを1枚選んでください！
          </p>

          <ScrollableCardList count={myHand.length}>
            {myHand.map((c) => (
              <div key={c.id} className="shrink-0 relative">
                <CardView
                  card={c}
                  size="hand"
                  isSelected={selectedMyCardId === c.id}
                  onClick={() => {
                    sounds.selectCard();
                    setDetailCard({
                      card: c,
                      isFieldCard: false,
                      playButtonText: 'このカードで決定',
                      onPlay: (cardId) => {
                        setSelectedMyCardId(cardId);
                        setDetailCard(null);
                      },
                    });
                  }}
                />
              </div>
            ))}
          </ScrollableCardList>
          <p className="text-[10px] text-stone-400 text-center mb-3">
            ※ カードをタップすると詳細画面が開き、「決定」または「戻る」で選択できます
          </p>

          <button
            disabled={!selectedMyCardId}
            onClick={() => {
              if (!selectedMyCardId) return;
              onInfoManipulationPick(selectedMyCardId);
              setSubmittedInfo(true);
            }}
            className={`w-full py-3 rounded-xl font-black text-sm shadow-lg transition ${
              selectedMyCardId
                ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:brightness-110 cursor-pointer shadow-violet-500/30 active:scale-95'
                : 'bg-slate-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            このカードを左隣へ渡す
          </button>
        </div>
      </div>
    );
  }

  return null;
};
