import React from 'react';
import { Card } from '../types/game';
import { Search } from 'lucide-react';

interface CardViewProps {
  card?: Card;
  isFaceDown?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  onInspect?: (card: Card) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDetails?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceDown = false,
  isSelected = false,
  isDisabled = false,
  onClick,
  onInspect,
  size = 'md',
  className = '',
  showDetails = true,
}) => {
  const sizeClasses = {
    sm: 'w-16 h-24 text-[10px] p-1.5 rounded-xl',
    md: 'w-24 sm:w-28 h-36 sm:h-40 text-xs p-2.5 rounded-2xl',
    lg: 'w-32 sm:w-36 h-48 sm:h-52 text-sm p-3.5 rounded-2xl',
  }[size];

  if (isFaceDown || !card) {
    return (
      <div
        onClick={!isDisabled ? onClick : undefined}
        className={`relative select-none flex flex-col items-center justify-center border-2 border-amber-400/80 shadow-lg transition-transform ${sizeClasses} ${
          isSelected ? '-translate-y-3 ring-4 ring-amber-400' : ''
        } ${!isDisabled && onClick ? 'cursor-pointer hover:-translate-y-1' : ''} ${className}`}
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%)',
        }}
      >
        <div className="absolute inset-1 rounded-xl border-2 border-amber-400/40 flex flex-col items-center justify-center overflow-hidden bg-slate-900/90">
          <div className="absolute -inset-4 opacity-25 bg-[radial-gradient(#fbbf24_1.5px,transparent_1.5px)] [background-size:8px_8px]" />
          <div className="relative text-center">
            <span className="text-xl sm:text-2xl filter drop-shadow">🎭</span>
            <div className="text-[9px] font-black tracking-widest text-amber-300 mt-0.5">
              踊る犯人
            </div>
          </div>
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

  return (
    <div
      onClick={!isDisabled ? onClick : undefined}
      className={`relative select-none flex flex-col justify-between border-2 bg-gradient-to-b shadow-xl transition-all duration-200 ${getGradient()} ${sizeClasses} ${
        isSelected ? '-translate-y-4 ring-4 ring-yellow-300 shadow-yellow-400/50 shadow-2xl' : ''
      } ${
        isDisabled
          ? 'opacity-40 grayscale-[40%] cursor-not-allowed'
          : onClick
          ? 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl'
          : ''
      } ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="font-black tracking-tight truncate leading-tight drop-shadow-md text-[11px] sm:text-[13px]">
          {card.name}
        </span>
        <span className="text-base sm:text-xl shrink-0 filter drop-shadow">{card.icon}</span>
      </div>

      {/* Center Icon Graphic */}
      <div className="flex-1 flex flex-col items-center justify-center my-0.5 relative">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/25 backdrop-blur-sm border border-white/40 flex items-center justify-center text-lg sm:text-2xl shadow-inner">
          {card.icon}
        </div>

        {/* Quick Zoom Inspect Button */}
        {onInspect && (
          <button
            onClick={handleInspectClick}
            className="absolute -top-1 -right-1 p-1 rounded-full bg-black/60 hover:bg-black/90 text-white transition shadow cursor-pointer"
            title="大きく表示"
          >
            <Search className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* Description without kana: Clear & Highly Legible */}
      {showDetails && size !== 'sm' && (
        <div className="text-[10px] sm:text-[11px] leading-tight text-white bg-black/55 backdrop-blur-sm p-1.5 rounded-lg border border-white/20 font-bold line-clamp-3 shadow-inner">
          {card.description}
        </div>
      )}

      {/* Bottom tag */}
      <div className="flex items-center justify-between text-[9px] text-white/90 font-bold mt-0.5">
        {card.type === 'culprit' ? (
          <span className="bg-red-900 text-rose-200 text-[8px] px-1.5 py-0.2 rounded font-black border border-red-300">
            1枚限定
          </span>
        ) : (
          <span className="text-[8px] opacity-80">タップで詳細</span>
        )}
      </div>
    </div>
  );
};
