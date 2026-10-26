import React, { useState, useEffect } from 'react';
import { Card } from '../types/game';
import { getCardClassification, CardPlayClassification, getCardSurfaceDescription } from '../game/cardData';
import {
  getStoredCardImage,
  isCardImageEnabled,
  getStoredCardBackImage,
  DEFAULT_CARD_BACK_IMAGE,
  CARD_SPRITE_GRID,
} from '../utils/cardImageSetting';

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
  onClick,
  onInspect,
  size = 'hand',
  className = '',
  showDetails = true,
}) => {
  const [cardImageSrc, setCardImageSrc] = useState<string>(getStoredCardImage());
  const [cardBackSrc, setCardBackSrc] = useState<string>(getStoredCardBackImage());
  const [useImage, setUseImage] = useState<boolean>(isCardImageEnabled());

  useEffect(() => {
    const handleUpdate = () => {
      setCardImageSrc(getStoredCardImage());
      setCardBackSrc(getStoredCardBackImage());
      setUseImage(isCardImageEnabled());
    };
    window.addEventListener('odoru_card_image_updated', handleUpdate);
    return () => {
      window.removeEventListener('odoru_card_image_updated', handleUpdate);
    };
  }, []);

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
        className={`relative select-none rounded-xl overflow-hidden shadow-lg transition-transform border border-amber-950/30 bg-slate-900 ${sizeClasses} ${
          isSelected ? '-translate-y-3 ring-4 ring-amber-400 shadow-amber-400/50 scale-105' : ''
        } ${!isDisabled && onClick ? 'cursor-pointer active:scale-95 hover:-translate-y-1' : ''} ${className}`}
      >
        <img
          src={cardBackSrc}
          alt="カード裏面"
          className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none select-none"
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_CARD_BACK_IMAGE;
          }}
        />
        {faceDownBadge && (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-slate-950/85 border border-amber-400/70 text-[10px] font-black text-amber-300 shadow">
            {faceDownBadge}
          </div>
        )}
        {isSelected && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-md whitespace-nowrap">
            選択中
          </div>
        )}
      </div>
    );
  }

  // 1. If custom card image is enabled, render the sprite sheet slice!
  if (useImage && cardImageSrc) {
    const sprite = CARD_SPRITE_GRID[card.type] || { col: 0, row: 0 };
    const posX = (sprite.col / 3) * 100;
    const posY = (sprite.row / 2) * 100;

    return (
      <div
        onClick={!isDisabled ? onClick : undefined}
        className={`relative select-none rounded-xl overflow-hidden shadow-xl transition-all duration-200 border-2 border-amber-950/40 ${sizeClasses} ${
          isSelected
            ? '-translate-y-3.5 ring-4 ring-amber-300 shadow-amber-400/60 shadow-2xl scale-105'
            : ''
        } ${
          isDisabled
            ? 'opacity-70 grayscale-[35%]'
            : onClick
            ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl active:scale-95'
            : ''
        } ${className}`}
        style={{
          backgroundImage: `url(${cardImageSrc})`,
          backgroundSize: '400% 300%',
          backgroundPosition: `${posX}% ${posY}%`,
          backgroundRepeat: 'no-repeat',
        }}
      >
        {isSelected && (
          <div className="absolute inset-0 border-2 border-amber-300 rounded-xl pointer-events-none" />
        )}
      </div>
    );
  }

  // 2. CSS Text Mode Fallback (Refined according to user specifications)
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
      onClick={!isDisabled ? onClick : undefined}
      className={`relative select-none flex flex-col justify-between border-2 bg-gradient-to-b shadow-xl transition-all duration-200 ${getGradient()} ${sizeClasses} ${
        isSelected
          ? '-translate-y-3.5 ring-4 ring-amber-300 shadow-amber-400/60 shadow-2xl scale-105'
          : ''
      } ${
        isDisabled
          ? 'opacity-70 grayscale-[35%]'
          : onClick
          ? 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl active:scale-95'
          : ''
      } ${className}`}
    >
      {/* 1. Top Header: Card name on top, classification below with rounded pill */}
      <div className="flex flex-col items-center justify-center border-b border-white/20 pb-0.5 shrink-0 w-full text-center">
        <span className={`font-black tracking-tight leading-tight drop-shadow-md ${
          size === 'field' ? 'text-[11.5px] sm:text-xs' : 'text-xs sm:text-sm'
        }`}>
          {card.name}
        </span>
        <span className={`mt-0.5 px-2 py-0 rounded-full font-bold border tracking-wider shrink-0 whitespace-nowrap ${
          size === 'field' ? 'text-[7px] leading-tight' : 'text-[7.5px] sm:text-[8px] leading-tight'
        } ${getClassificationBadgeStyle(classification)}`}>
          （{classification}）
        </span>
      </div>

      {/* 2. Middle: Large centered emoji illustration */}
      <div className="flex-1 flex items-center justify-center my-0.5 min-h-0">
        <span className={`${size === 'field' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'} filter drop-shadow select-none transform hover:scale-105 transition-transform`}>
          {card.icon}
        </span>
      </div>

      {/* 3. Bottom: Card effect description box (No text below this box) */}
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
    </div>
  );
};

