import React from 'react';
import { Card } from '../types/game';
import { getCardClassification, CardPlayClassification, getCardSurfaceDescription } from '../game/cardData';
import { AlertCircle } from 'lucide-react';

interface CardViewProps {
  card?: Card;
  isFaceDown?: boolean;
  faceDownBadge?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  unplayableReason?: string;
  onClick?: () => void;
  onInspect?: (card: Card) => void;
  size?: 'sm' | 'md' | 'lg' | 'hand' | 'field';
  className?: string;
  showDetails?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceDown = false,
  faceDownBadge,
  isSelected = false,
  isDisabled = false,
  unplayableReason,
  onClick,
  onInspect,
  size = 'hand',
  className = '',
  showDetails = true,
}) => {
  const sizeClasses = {
    sm: 'w-16 h-24 text-[10px] p-1.5 rounded-lg',
    md: 'w-24 sm:w-28 h-36 sm:h-40 text-xs p-2 rounded-xl',
    lg: 'w-32 sm:w-36 h-48 sm:h-52 text-sm p-2.5 rounded-xl',
    hand: 'w-28 sm:w-32 h-40 sm:h-44 text-xs p-2 rounded-xl min-w-[112px] sm:min-w-[128px]',
    field: 'w-24 sm:w-26 h-34 sm:h-38 text-[11px] p-1.5 rounded-xl min-w-[96px] sm:min-w-[104px]',
  }[size];

  if (isFaceDown || !card) {
    return (
      <div
        onClick={!isDisabled ? onClick : undefined}
        className={`relative select-none flex flex-col items-center justify-center border-2 border-amber-400/80 shadow-lg transition-transform ${sizeClasses} ${
          isSelected ? '-translate-y-3 ring-4 ring-amber-400 shadow-amber-400/50 scale-105' : ''
        } ${!isDisabled && onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)',
        }}
      >
        <div className="absolute inset-1 rounded-lg border border-amber-400/40 flex flex-col items-center justify-center overflow-hidden bg-slate-900/90">
          <div className="absolute -inset-4 opacity-25 bg-[radial-gradient(#fbbf24_1.5px,transparent_1.5px)] [background-size:8px_8px]" />
          {faceDownBadge && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/60 text-[10px] font-black text-amber-300">
              {faceDownBadge}
            </div>
          )}
          <div className="relative text-center">
            <span className="text-3xl filter drop-shadow">🎭</span>
            <div className="text-[11px] font-black tracking-widest text-amber-300 mt-1">
              踊る犯人
            </div>
          </div>
          {isSelected && (
            <div className="absolute bottom-2 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-md">
              選択中
            </div>
          )}
        </div>
      </div>
    );
  }

  // Cheerful, bright gradient schemes based on card type
  const getGradient = () => {
    switch (card.type) {
      case 'culprit':
        return 'from-rose-500 via-red-600 to-rose-700 border-red-300 text-white';
      case 'detective':
        return 'from-sky-500 via-blue-600 to-indigo-600 border-sky-200 text-white';
      case 'alibi':
        return 'from-emerald-500 via-teal-600 to-emerald-700 border-emerald-200 text-white';
      case 'first_discoverer':
        return 'from-amber-400 via-orange-500 to-amber-600 border-yellow-200 text-white';
      case 'dog':
        return 'from-amber-500 via-yellow-600 to-amber-700 border-amber-200 text-white';
      case 'boy':
        return 'from-teal-400 via-emerald-500 to-teal-700 border-teal-200 text-white';
      case 'conspiracy':
        return 'from-purple-500 via-fuchsia-600 to-purple-800 border-purple-200 text-white';
      case 'witness':
        return 'from-cyan-400 via-sky-500 to-blue-600 border-cyan-200 text-white';
      case 'trade':
        return 'from-amber-400 via-orange-500 to-amber-600 border-orange-200 text-white';
      case 'rumor':
        return 'from-pink-400 via-rose-500 to-pink-600 border-pink-200 text-white';
      case 'info_manipulation':
        return 'from-indigo-400 via-violet-500 to-purple-600 border-indigo-200 text-white';
      default:
        return 'from-slate-500 via-stone-600 to-slate-700 border-slate-200 text-white';
    }
  };

  const handleInspectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInspect) {
      onInspect(card);
    }
  };

  // Concise text to display on the card body (simple surface text as specified)
  const summaryText = getCardSurfaceDescription(card.type) || card.summary || card.description;

  const classification = getCardClassification(card.type);

  const getClassificationBadgeStyle = (cls: CardPlayClassification) => {
    switch (cls) {
      case 'アクション':
        return 'bg-sky-950/90 text-sky-200 border-sky-400/50';
      case 'パッシブ':
        return 'bg-emerald-950/90 text-emerald-200 border-emerald-400/50';
      case 'スペシャル':
        return 'bg-amber-950/90 text-amber-200 border-amber-400/50';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative select-none flex flex-col justify-between border-2 bg-gradient-to-b shadow-xl transition-all duration-200 active:scale-95 ${getGradient()} ${sizeClasses} ${
        isSelected
          ? '-translate-y-3.5 ring-4 ring-amber-300 shadow-amber-400/60 shadow-2xl scale-105'
          : ''
      } ${
        isDisabled
          ? 'opacity-70 grayscale-[35%]'
          : onClick
          ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl'
          : ''
      } ${className}`}
    >
      {/* 1. Top Header: Card name on left, classification on right */}
      <div className="flex items-center justify-between gap-1 border-b border-white/20 pb-0.5 shrink-0">
        <span className={`font-black tracking-tight truncate leading-tight drop-shadow-md ${
          size === 'field' ? 'text-[11.5px] sm:text-xs' : 'text-xs sm:text-sm'
        }`}>
          {card.name}
        </span>
        <span className={`px-1.5 py-0.5 rounded font-black border uppercase tracking-wider shrink-0 whitespace-nowrap ${
          size === 'field' ? 'text-[7.5px] leading-tight' : 'text-[8.5px] sm:text-[9px]'
        } ${getClassificationBadgeStyle(classification)}`}>
          {classification}
        </span>
      </div>

      {/* 2. Middle: Centered emoji illustration */}
      <div className="flex-1 flex items-center justify-center my-0.5 min-h-0">
        <span className={`${size === 'field' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'} filter drop-shadow select-none transform hover:scale-105 transition-transform`}>
          {card.icon}
        </span>
      </div>

      {/* 3. Bottom: Card effect description box */}
      {showDetails && size !== 'sm' ? (
        <div className="w-full shrink-0 -mx-0.5">
          <div className={`w-full bg-black/65 backdrop-blur-sm rounded-lg px-1.5 py-1 border border-white/20 shadow-inner flex items-center justify-center text-center ${
            size === 'field' ? 'min-h-[46px] sm:min-h-[50px]' : 'min-h-[54px] sm:min-h-[58px]'
          }`}>
            <p className={`font-black leading-tight text-white drop-shadow tracking-tight ${
              size === 'field' ? 'text-[9.5px] sm:text-[10px]' : 'text-[10.5px] sm:text-[11.5px]'
            }`}>
              {summaryText}
            </p>
          </div>
        </div>
      ) : null}

      {/* 4. Unplayable restriction badge if applicable */}
      {unplayableReason && (
        <div className="mt-1 flex items-center justify-center gap-1 bg-red-950/95 text-red-200 border border-red-400/80 rounded px-1 py-0.5 text-[8px] font-black truncate shadow shrink-0">
          <AlertCircle className="w-2.5 h-2.5 shrink-0 text-red-400" />
          <span className="truncate">{unplayableReason}</span>
        </div>
      )}
    </div>
  );
};
