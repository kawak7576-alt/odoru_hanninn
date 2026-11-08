import React, { useState, useEffect } from 'react';
import { CardType } from '../types/game';
import {
  getStoredCardImage,
  getStoredCardBackImage,
  isCardImageEnabled,
  DEFAULT_CARD_IMAGE,
  DEFAULT_CARD_BACK_IMAGE,
  CARD_SPRITE_GRID,
} from '../utils/cardImageSetting';

export interface CardThumbnailProps {
  cardType?: CardType;
  isBack?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
}

export const CardThumbnail: React.FC<CardThumbnailProps> = ({
  cardType = 'civilian',
  isBack = false,
  size = 'sm',
  className = '',
  alt,
}) => {
  const [cardImageSrc, setCardImageSrc] = useState<string>(getStoredCardImage());
  const [cardBackSrc, setCardBackSrc] = useState<string>(getStoredCardBackImage());
  const [useImage, setUseImage] = useState<boolean>(isCardImageEnabled());
  const [activeFrontSrc, setActiveFrontSrc] = useState<string>(cardImageSrc);
  const [imageError, setImageError] = useState<boolean>(false);

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

  // Pre-validate custom front image to avoid broken background
  useEffect(() => {
    setImageError(false);
    if (!cardImageSrc) {
      setActiveFrontSrc(DEFAULT_CARD_IMAGE);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setActiveFrontSrc(cardImageSrc);
      setImageError(false);
    };
    img.onerror = () => {
      if (cardImageSrc !== DEFAULT_CARD_IMAGE) {
        setActiveFrontSrc(DEFAULT_CARD_IMAGE);
        const defImg = new Image();
        defImg.onerror = () => setImageError(true);
        defImg.src = DEFAULT_CARD_IMAGE;
      } else {
        setImageError(true);
      }
    };
    img.src = cardImageSrc;
  }, [cardImageSrc]);

  const sizeClasses = {
    xs: 'w-4 h-5.5 rounded-[4px]',
    sm: 'w-5 h-7 rounded-[5px]',
    md: 'w-7 h-9.5 rounded-md',
    lg: 'w-9 h-12.5 rounded-lg',
  }[size];

  // 1. Render Card Back
  if (isBack) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden border border-amber-400/70 shadow-sm bg-slate-900 select-none ${sizeClasses} ${className}`}
      >
        <img
          src={cardBackSrc}
          alt={alt || 'カード裏面'}
          className="w-full h-full object-fill pointer-events-none select-none"
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_CARD_BACK_IMAGE;
          }}
        />
      </div>
    );
  }

  // 2. Render Card Front via Sprite Sheet Slice
  if (useImage && activeFrontSrc && !imageError) {
    const sprite = CARD_SPRITE_GRID[cardType] || { col: 0, row: 0 };
    const posX = (sprite.col / 3) * 100;
    const posY = (sprite.row / 2) * 100;

    return (
      <div
        className={`relative shrink-0 overflow-hidden border border-amber-300/80 shadow-md bg-slate-900 select-none ${sizeClasses} ${className}`}
        style={{
          backgroundImage: `url("${activeFrontSrc}")`,
          backgroundSize: '400% 300%',
          backgroundPosition: `${posX}% ${posY}%`,
          backgroundRepeat: 'no-repeat',
        }}
        title={alt}
      />
    );
  }

  // 3. Fallback CSS / Emoji mode
  const getFallbackStyle = () => {
    switch (cardType) {
      case 'culprit':
        return { bg: 'from-rose-500 to-red-700 border-red-300', emoji: '🎭' };
      case 'detective':
        return { bg: 'from-sky-500 to-blue-700 border-sky-300', emoji: '🔍' };
      case 'alibi':
        return { bg: 'from-emerald-500 to-teal-700 border-emerald-300', emoji: '📋' };
      case 'first_discoverer':
        return { bg: 'from-amber-400 to-orange-600 border-yellow-300', emoji: '📢' };
      case 'dog':
        return { bg: 'from-amber-500 to-yellow-600 border-amber-300', emoji: '🐕' };
      case 'boy':
        return { bg: 'from-teal-400 to-emerald-600 border-teal-300', emoji: '👦' };
      case 'conspiracy':
        return { bg: 'from-purple-500 to-fuchsia-800 border-purple-300', emoji: '😈' };
      case 'witness':
        return { bg: 'from-cyan-400 to-blue-600 border-cyan-300', emoji: '👁️' };
      case 'trade':
        return { bg: 'from-amber-400 to-orange-600 border-orange-300', emoji: '🤝' };
      case 'rumor':
        return { bg: 'from-pink-400 to-rose-600 border-pink-300', emoji: '👂' };
      case 'info_manipulation':
        return { bg: 'from-indigo-400 to-purple-600 border-indigo-300', emoji: '🔀' };
      default:
        return { bg: 'from-slate-500 to-stone-700 border-slate-300', emoji: '👤' };
    }
  };

  const fb = getFallbackStyle();

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center bg-gradient-to-br ${fb.bg} border shadow select-none ${sizeClasses} ${className}`}
      title={alt}
    >
      <span className="text-[10px] leading-none filter drop-shadow">{fb.emoji}</span>
    </div>
  );
};
