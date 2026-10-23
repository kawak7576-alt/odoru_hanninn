import React from 'react';
import { Card } from '../types/game';
import { CARD_DEFINITIONS } from '../game/cardData';
import { X, Sparkles, AlertCircle } from 'lucide-react';

interface CardZoomModalProps {
  card: Card | null;
  onClose: () => void;
}

export const CardZoomModal: React.FC<CardZoomModalProps> = ({ card, onClose }) => {
  if (!card) return null;

  const meta = CARD_DEFINITIONS[card.type];

  // Bright vibrant background gradient based on card type
  const getCardStyle = () => {
    switch (card.type) {
      case 'culprit':
        return {
          bg: 'from-rose-500 via-red-600 to-rose-700',
          border: 'border-red-400',
          badgeBg: 'bg-red-950/80 text-rose-200 border-red-300',
          typeLabel: '【犯人陣営】',
        };
      case 'detective':
        return {
          bg: 'from-sky-500 via-blue-600 to-indigo-700',
          border: 'border-sky-300',
          badgeBg: 'bg-blue-950/80 text-sky-200 border-sky-300',
          typeLabel: '【捜査カード】',
        };
      case 'alibi':
        return {
          bg: 'from-emerald-500 via-teal-600 to-green-700',
          border: 'border-emerald-300',
          badgeBg: 'bg-emerald-950/80 text-emerald-200 border-emerald-300',
          typeLabel: '【保護カード】',
        };
      case 'first_discoverer':
        return {
          bg: 'from-amber-400 via-orange-500 to-amber-600',
          border: 'border-amber-300',
          badgeBg: 'bg-amber-950/80 text-amber-200 border-amber-300',
          typeLabel: '【スタートカード】',
        };
      case 'dog':
        return {
          bg: 'from-amber-500 via-yellow-600 to-amber-700',
          border: 'border-yellow-300',
          badgeBg: 'bg-amber-950/80 text-yellow-200 border-yellow-300',
          typeLabel: '【捜査カード】',
        };
      case 'boy':
        return {
          bg: 'from-teal-400 via-emerald-600 to-teal-700',
          border: 'border-teal-300',
          badgeBg: 'bg-teal-950/80 text-teal-200 border-teal-300',
          typeLabel: '【直感カード】',
        };
      case 'conspiracy':
        return {
          bg: 'from-purple-500 via-fuchsia-600 to-purple-800',
          border: 'border-purple-300',
          badgeBg: 'bg-purple-950/80 text-purple-200 border-purple-300',
          typeLabel: '【共犯カード】',
        };
      case 'witness':
        return {
          bg: 'from-cyan-400 via-sky-500 to-blue-600',
          border: 'border-cyan-300',
          badgeBg: 'bg-cyan-950/80 text-cyan-200 border-cyan-300',
          typeLabel: '【捜査カード】',
        };
      case 'trade':
        return {
          bg: 'from-amber-400 via-orange-500 to-amber-600',
          border: 'border-orange-300',
          badgeBg: 'bg-orange-950/80 text-orange-200 border-orange-300',
          typeLabel: '【交換カード】',
        };
      case 'rumor':
        return {
          bg: 'from-pink-400 via-rose-500 to-pink-600',
          border: 'border-pink-300',
          badgeBg: 'bg-pink-950/80 text-pink-200 border-pink-300',
          typeLabel: '【交換カード】',
        };
      case 'info_manipulation':
        return {
          bg: 'from-indigo-400 via-violet-500 to-purple-600',
          border: 'border-violet-300',
          badgeBg: 'bg-indigo-950/80 text-violet-200 border-violet-300',
          typeLabel: '【交換カード】',
        };
      default:
        return {
          bg: 'from-slate-500 via-stone-600 to-slate-700',
          border: 'border-slate-300',
          badgeBg: 'bg-slate-950/80 text-slate-200 border-slate-300',
          typeLabel: '【市民カード】',
        };
    }
  };

  const style = getCardStyle();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-sm w-full bg-slate-900 border-2 border-white/20 rounded-3xl p-5 shadow-2xl flex flex-col items-center animate-scale-up"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-slate-900 hover:bg-amber-300 transition shadow-lg flex items-center justify-center font-black cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Card Preview */}
        <div
          className={`w-full rounded-2xl p-4 bg-gradient-to-b ${style.bg} border-4 ${style.border} shadow-2xl text-white flex flex-col justify-between`}
        >
          {/* Card Top */}
          <div className="flex items-center justify-between border-b border-white/20 pb-2">
            <div>
              <span className="text-[11px] font-black tracking-wider uppercase opacity-90 block">
                {style.typeLabel}
              </span>
              <h2 className="text-2xl font-black drop-shadow tracking-tight">{card.name}</h2>
            </div>
            <span className="text-4xl filter drop-shadow">{card.icon}</span>
          </div>

          {/* Center Graphic */}
          <div className="my-5 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-5xl shadow-inner">
              {card.icon}
            </div>
          </div>

          {/* Big Readable Effect Box */}
          <div className="bg-black/60 backdrop-blur-md rounded-xl p-3.5 border border-white/20 shadow-inner">
            <div className="text-[11px] text-amber-300 font-bold mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>カードの効果</span>
            </div>
            <p className="text-sm font-bold text-white leading-relaxed">
              {meta ? meta.detail : card.description}
            </p>
          </div>

          {/* Bottom Count */}
          <div className="mt-3 flex items-center justify-between text-xs text-white/90 font-bold">
            <span className="bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10">
              デッキ総数: {meta ? meta.totalCount : 1}枚
            </span>
            {card.type === 'culprit' && (
              <span className="bg-red-950 text-red-200 px-2 py-0.5 rounded-full border border-red-400 font-black text-[11px]">
                手札残り1枚の時のみ発動可
              </span>
            )}
          </div>
        </div>

        {/* Dismiss hint */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm rounded-xl shadow cursor-pointer transition"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
