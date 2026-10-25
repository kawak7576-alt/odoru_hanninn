import React from 'react';
import { Card } from '../types/game';
import { CARD_DEFINITIONS, getCardClassification } from '../game/cardData';
import { X, Play, Check, AlertCircle, Sparkles, Target, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface CardDetailModalProps {
  card: Card | null;
  canPlay?: boolean;
  unplayableReason?: string;
  isMyTurn?: boolean;
  onPlay?: (cardId: string) => void;
  onClose: () => void;
  isFieldCard?: boolean;
  fieldSourceLabel?: string;
  playButtonText?: string;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  canPlay = false,
  unplayableReason,
  isMyTurn = false,
  onPlay,
  onClose,
  isFieldCard = false,
  fieldSourceLabel,
  playButtonText,
}) => {
  if (!card) return null;

  const meta = CARD_DEFINITIONS[card.type];

  // Visual header style according to card category
  const getModalStyle = () => {
    switch (card.type) {
      case 'culprit':
        return {
          gradient: 'from-rose-500 via-red-600 to-rose-700',
          border: 'border-red-400',
          badge: 'bg-red-950 text-rose-200 border-red-300',
          category: '犯人陣営',
        };
      case 'detective':
        return {
          gradient: 'from-sky-500 via-blue-600 to-indigo-700',
          border: 'border-sky-300',
          badge: 'bg-blue-950 text-sky-200 border-sky-300',
          category: '捜査カード',
        };
      case 'alibi':
        return {
          gradient: 'from-emerald-500 via-teal-600 to-emerald-700',
          border: 'border-emerald-300',
          badge: 'bg-emerald-950 text-emerald-200 border-emerald-300',
          category: '保護・状況カード',
        };
      case 'first_discoverer':
        return {
          gradient: 'from-amber-400 via-orange-500 to-amber-600',
          border: 'border-yellow-300',
          badge: 'bg-amber-950 text-yellow-200 border-yellow-300',
          category: 'スタートカード',
        };
      case 'dog':
        return {
          gradient: 'from-amber-500 via-yellow-600 to-amber-700',
          border: 'border-amber-300',
          badge: 'bg-amber-950 text-yellow-200 border-yellow-300',
          category: '捜査カード',
        };
      case 'boy':
        return {
          gradient: 'from-teal-400 via-emerald-600 to-teal-700',
          border: 'border-teal-300',
          badge: 'bg-teal-950 text-teal-200 border-teal-300',
          category: '捜査・直感カード',
        };
      case 'conspiracy':
        return {
          gradient: 'from-purple-500 via-fuchsia-600 to-purple-800',
          border: 'border-purple-300',
          badge: 'bg-purple-950 text-purple-200 border-purple-300',
          category: '状況・共犯カード',
        };
      case 'witness':
        return {
          gradient: 'from-cyan-400 via-sky-500 to-blue-600',
          border: 'border-cyan-300',
          badge: 'bg-cyan-950 text-cyan-200 border-cyan-300',
          category: '捜査カード',
        };
      case 'trade':
        return {
          gradient: 'from-amber-400 via-orange-500 to-amber-600',
          border: 'border-orange-300',
          badge: 'bg-orange-950 text-orange-200 border-orange-300',
          category: 'アクションカード',
        };
      case 'rumor':
        return {
          gradient: 'from-pink-400 via-rose-500 to-pink-600',
          border: 'border-pink-300',
          badge: 'bg-pink-950 text-pink-200 border-pink-300',
          category: 'アクションカード',
        };
      case 'info_manipulation':
        return {
          gradient: 'from-indigo-400 via-violet-500 to-purple-600',
          border: 'border-violet-300',
          badge: 'bg-indigo-950 text-violet-200 border-violet-300',
          category: 'アクションカード',
        };
      default:
        return {
          gradient: 'from-slate-500 via-stone-600 to-slate-700',
          border: 'border-slate-300',
          badge: 'bg-slate-950 text-slate-200 border-slate-300',
          category: '一般市民カード',
        };
    }
  };

  const style = getModalStyle();

  const handlePlayClick = () => {
    if (!canPlay || !onPlay) return;
    onPlay(card.id);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-sm w-full bg-slate-900 border-2 border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-scale-up max-h-[92vh]"
      >
        {/* Top Banner Card Header */}
        <div className={`p-4 bg-gradient-to-r ${style.gradient} text-white flex items-center justify-between border-b border-white/20 relative`}>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl filter drop-shadow">{card.icon}</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black drop-shadow tracking-tight">
                {card.name}
              </h2>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black border bg-black/40 border-white/30 text-white uppercase tracking-wider">
                {getCardClassification(card.type)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition cursor-pointer"
            title="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-3 scrollbar-thin text-stone-200 text-xs">
          {/* Summary Box */}
          <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30">
            <div className="flex items-center gap-1.5 text-amber-300 font-black text-[11px] mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>効果の要約</span>
            </div>
            <p className="text-xs font-bold text-white leading-snug">
              {card.summary || meta.summary || card.description}
            </p>
          </div>

          {/* Exact Official Rule Description */}
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10">
            <span className="text-[10px] text-stone-400 font-bold block mb-1">
              公式ルール詳細
            </span>
            <p className="text-xs leading-relaxed text-stone-200 font-medium">
              {card.detail || meta.detail || card.description}
            </p>
          </div>

          {/* Specifications Grid: Target, Condition, Restriction */}
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-white/5">
              <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-bold">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                <span>対象プレイヤー</span>
              </div>
              <span className="text-white font-bold text-xs">
                {card.target || meta.target || 'なし（場に出す）'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-white/5">
              <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>使用条件</span>
              </div>
              <span className="text-white font-bold text-xs text-right max-w-[60%]">
                {card.condition || meta.condition || 'いつでも使用可能'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-white/5">
              <div className="flex items-center gap-1.5 text-stone-400 text-[11px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>使用制限</span>
              </div>
              <span className="text-amber-300 font-bold text-xs text-right max-w-[60%]">
                {card.restriction || meta.restriction || 'なし'}
              </span>
            </div>
          </div>

          {/* Status Alert */}
          {isFieldCard ? (
            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-amber-400/40 flex items-center gap-2.5 text-amber-200">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs leading-snug">
                <span className="font-black text-amber-300 block">
                  {fieldSourceLabel || '場に出されたカードです'}
                </span>
                <span className="text-[11px] text-stone-300">
                  効果・詳細ルールの確認画面です
                </span>
              </div>
            </div>
          ) : (
            <>
              {!canPlay && (
                <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 flex items-start gap-2 text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs leading-snug">
                    <span className="font-black block">現在このカードは出せません</span>
                    <span className="text-[11px] text-red-300">{unplayableReason}</span>
                  </div>
                </div>
              )}

              {canPlay && isMyTurn && (
                <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center gap-2 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>使用条件を満たしています。今すぐ場に出せます！</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons: 「このカードを出す」 and 「戻る」 or 「閉じる」 for field cards */}
        <div className="p-3 bg-slate-950 border-t border-white/10 flex gap-2 shrink-0">
          {onPlay && !isFieldCard ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-stone-300 font-bold text-xs sm:text-sm transition cursor-pointer active:scale-95"
              >
                戻る
              </button>

              <button
                type="button"
                disabled={!canPlay}
                onClick={handlePlayClick}
                className={`flex-2 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 ${
                  canPlay
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-amber-400/30 cursor-pointer'
                    : 'bg-slate-800 text-stone-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                {playButtonText?.includes('決定') ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Play className={`w-4 h-4 ${canPlay ? 'fill-slate-950' : 'fill-stone-500'}`} />
                )}
                <span>{playButtonText || 'このカードを出す'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/30 transition cursor-pointer active:scale-95"
            >
              <span>閉じる</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
