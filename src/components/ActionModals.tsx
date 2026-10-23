import React, { useState } from 'react';
import { Card, ClientGameState, PlayerPublic } from '../types/game';
import { CardView } from './CardView';
import { DEFAULT_INCIDENTS } from '../game/cardData';
import { sounds } from '../utils/sound';
import { Eye, Handshake, Search, AlertTriangle, Dog, Sparkles, Send, Check } from 'lucide-react';

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
  onInspectCard,
}) => {
  const { phase, currentTurnPlayerId, activeCardAction, secretInfo, players, myHand } = gameState;
  const isMyTurn = currentTurnPlayerId === myPlayerId;

  // Local states
  const [customIncident, setCustomIncident] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedMyCardId, setSelectedMyCardId] = useState<string>('');
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);

  const opponents = players.filter((p) => p.id !== myPlayerId && p.handCount > 0);

  // 1. First Discoverer Modal
  if (phase === 'first_discoverer_turn' && isMyTurn) {
    const handleStart = () => {
      const inc = customIncident.trim() || DEFAULT_INCIDENTS[Math.floor(Math.random() * DEFAULT_INCIDENTS.length)];
      sounds.turnAlert();
      onFirstDiscovererSubmit(inc);
    };

    return (
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

    return (
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

    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-orange-500/80 rounded-2xl max-w-lg w-full p-5 shadow-2xl">
          <div className="text-center mb-3">
            <span className="text-3xl">🤝</span>
            <h2 className="text-lg font-black text-orange-300">秘密の取り引き</h2>
            <p className="text-xs text-stone-300">
              相手を指名し、自分が渡すカードを1枚選択してください。
            </p>
          </div>

          {/* Step 1: Select Target */}
          <div className="mb-3">
            <label className="text-xs font-bold text-stone-400 mb-1.5 block">
              1. 誰と取り引きしますか？
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {opponents.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTargetId(p.id)}
                  className={`p-2 rounded-lg border text-xs font-bold transition ${
                    selectedTargetId === p.id
                      ? 'bg-orange-950 border-orange-400 text-white ring-2 ring-orange-400'
                      : 'bg-slate-800/80 border-white/10 text-stone-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="truncate">{p.name}</div>
                  <div className="text-[10px] text-stone-400">手札 {p.handCount}枚</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Card to Give */}
          <div className="mb-4">
            <label className="text-xs font-bold text-stone-400 mb-1.5 block">
              2. 相手に渡すカードを選んでください
            </label>
            <div className="flex gap-2 overflow-x-auto py-1">
              {myHand.map((c) => (
                <div key={c.id} className="shrink-0">
                  <CardView
                    card={c}
                    size="sm"
                    isSelected={selectedMyCardId === c.id}
                    onClick={() => setSelectedMyCardId(c.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            disabled={!selectedTargetId || !selectedMyCardId}
            onClick={handleSendTrade}
            className={`w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition ${
              selectedTargetId && selectedMyCardId
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-slate-950 cursor-pointer'
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

    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-orange-500 rounded-2xl max-w-md w-full p-5 text-center shadow-2xl animate-bounce-short">
          <div className="text-4xl mb-2">🤝</div>
          <h2 className="text-lg font-black text-orange-300">取り引きの要請！</h2>
          <p className="text-xs text-stone-200 mt-1 mb-4">
            【{fromPlayerName}】から取り引きを申し込まれました。<br />
            渡すカードを1枚選んでください（内容は相手に知られません）。
          </p>

          <div className="flex gap-2 overflow-x-auto justify-center py-2 mb-4">
            {myHand.map((c) => (
              <div key={c.id} className="shrink-0">
                <CardView
                  card={c}
                  size="sm"
                  isSelected={selectedMyCardId === c.id}
                  onClick={() => setSelectedMyCardId(c.id)}
                />
              </div>
            ))}
          </div>

          <button
            disabled={!selectedMyCardId}
            onClick={handleAcceptTrade}
            className={`w-full py-2.5 rounded-xl font-black text-sm shadow-lg transition ${
              selectedMyCardId
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 hover:brightness-110 cursor-pointer'
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
    return (
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
                className="p-3 rounded-xl border border-white/10 bg-slate-800 hover:bg-cyan-950 hover:border-cyan-400 text-stone-200 transition-all flex flex-col items-center"
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

  // 6. Witness Secret Result Revealed (I am viewing their cards)
  if (secretInfo?.witnessCards) {
    const { targetName, cards } = secretInfo.witnessCards;
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-cyan-400 rounded-2xl max-w-lg w-full p-5 text-center shadow-2xl animate-fade-in">
          <div className="text-3xl mb-1">👁️</div>
          <h2 className="text-base font-black text-cyan-300">
            【{targetName}】の手札を目撃しました！
          </h2>
          <p className="text-[11px] text-stone-300 mb-3">
            この情報はあなただけに表示されています。
          </p>

          <div className="flex gap-2 overflow-x-auto justify-center py-2 mb-4">
            {cards.map((c) => (
              <div key={c.id} className="shrink-0">
                <CardView card={c} size="md" />
              </div>
            ))}
          </div>

          <button
            onClick={onWitnessDone}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
          >
            確認しました（手番終了）
          </button>
        </div>
      </div>
    );
  }

  // 7. Dog Action Modal (I played Dog)
  if (isMyTurn && activeCardAction?.cardType === 'dog') {
    const selectedOpponent = opponents.find((p) => p.id === selectedTargetId);

    const handleSniff = () => {
      if (!selectedTargetId) return;
      onDogAction(selectedTargetId, selectedCardIndex);
      setSelectedTargetId('');
      setSelectedCardIndex(0);
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-amber-600 rounded-2xl max-w-md w-full p-5 text-center shadow-2xl">
          <div className="text-4xl mb-2">🐕</div>
          <h2 className="text-lg font-black text-amber-300">いぬの鋭い嗅覚！</h2>
          <p className="text-xs text-stone-300 mt-1 mb-4">
            指名した相手の手札から1枚選び公開します。「犯人」なら即時勝利！（アリバイ無効）
          </p>

          {/* Select Opponent */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {opponents.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedTargetId(p.id);
                  setSelectedCardIndex(0);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                  selectedTargetId === p.id
                    ? 'bg-amber-950 border-amber-400 text-white ring-2 ring-amber-400'
                    : 'bg-slate-800/80 border-white/10 text-stone-300 hover:bg-slate-800'
                }`}
              >
                <div>{p.name}</div>
                <div className="text-[10px] text-stone-400">手札 {p.handCount}枚</div>
              </button>
            ))}
          </div>

          {/* Select Card Index */}
          {selectedOpponent && (
            <div className="mb-4">
              <label className="text-xs font-bold text-amber-200 mb-2 block">
                {selectedOpponent.name}のどの手札を嗅ぎますか？
              </label>
              <div className="flex gap-2 justify-center">
                {Array.from({ length: selectedOpponent.handCount }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCardIndex(idx)}
                    className={`w-12 h-16 rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition ${
                      selectedCardIndex === idx
                        ? 'border-yellow-400 bg-amber-950 text-yellow-300 -translate-y-1 ring-2 ring-yellow-400'
                        : 'border-white/20 bg-slate-800 text-stone-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>#{idx + 1}</span>
                    <span className="text-base mt-0.5">❓</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            disabled={!selectedTargetId}
            onClick={handleSniff}
            className={`w-full py-2.5 rounded-xl font-black text-sm shadow-lg transition ${
              selectedTargetId
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 cursor-pointer'
                : 'bg-slate-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            このカードを暴く！
          </button>
        </div>
      </div>
    );
  }

  // 8. Boy Secret Notice (I played Boy)
  if (secretInfo?.boyCulpritHolder && isMyTurn && activeCardAction?.cardType === 'boy') {
    const { name } = secretInfo.boyCulpritHolder;
    return (
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

  // 9. Rumor Phase (Everyone simultaneously draws from right neighbor)
  if (phase === 'waiting_rumor' && secretInfo?.rumorWaitPrompt) {
    const { rightNeighborName, rightNeighborCardCount } = secretInfo.rumorWaitPrompt;

    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-pink-500 rounded-2xl max-w-md w-full p-5 text-center shadow-2xl animate-fade-in">
          <div className="text-4xl mb-2">💬</div>
          <h2 className="text-lg font-black text-pink-300">【うわさ】の刻！</h2>
          <p className="text-xs text-stone-300 mt-1 mb-3">
            全員が一斉に右隣のプレイヤーの手札から1枚引きます。<br />
            右隣の【{rightNeighborName}】の手札から引くカードを選んでください！
          </p>

          <div className="flex gap-2 justify-center py-3 mb-4">
            {Array.from({ length: rightNeighborCardCount }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => onRumorPick(idx)}
                className="w-14 h-20 rounded-xl border-2 border-pink-400/60 bg-slate-800 hover:bg-pink-950 hover:border-pink-300 hover:-translate-y-1 transition-all flex flex-col items-center justify-center shadow-lg group cursor-pointer"
              >
                <span className="text-lg group-hover:scale-125 transition-transform">🎭</span>
                <span className="text-[10px] text-pink-300 font-bold mt-1">#{idx + 1}</span>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-stone-400">
            全員の選択が揃い次第、同時に手札が入れ替わります。
          </p>
        </div>
      </div>
    );
  }

  // 10. Information Manipulation Phase (Everyone passes 1 card to left neighbor)
  if (phase === 'waiting_info_manipulation' && secretInfo?.infoManipulationPrompt) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-violet-500 rounded-2xl max-w-md w-full p-5 text-center shadow-2xl animate-fade-in">
          <div className="text-4xl mb-2">🔄</div>
          <h2 className="text-lg font-black text-violet-300">【情報操作】の刻！</h2>
          <p className="text-xs text-stone-300 mt-1 mb-3">
            全員が一斉に左隣のプレイヤーへ手札を1枚渡します。<br />
            渡すカードを1枚選んでください！
          </p>

          <div className="flex gap-2 overflow-x-auto justify-center py-2 mb-4">
            {myHand.map((c) => (
              <div key={c.id} className="shrink-0">
                <CardView
                  card={c}
                  size="sm"
                  isSelected={selectedMyCardId === c.id}
                  onClick={() => setSelectedMyCardId(c.id)}
                />
              </div>
            ))}
          </div>

          <button
            disabled={!selectedMyCardId}
            onClick={() => {
              if (!selectedMyCardId) return;
              onInfoManipulationPick(selectedMyCardId);
              setSelectedMyCardId('');
            }}
            className={`w-full py-2.5 rounded-xl font-black text-xs shadow-lg transition ${
              selectedMyCardId
                ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:brightness-110 cursor-pointer'
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
