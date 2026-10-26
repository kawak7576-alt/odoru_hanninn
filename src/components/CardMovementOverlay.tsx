import React, { useEffect, useState } from 'react';
import { CardMovementEvent } from '../types/game';
import { ArrowRight, ArrowLeftRight, Check, X } from 'lucide-react';

interface CardMovementOverlayProps {
  movement?: CardMovementEvent | null;
  onDismiss?: () => void;
}

export const CardMovementOverlay: React.FC<CardMovementOverlayProps> = ({
  movement,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    if (movement && movement.id !== currentId) {
      setCurrentId(movement.id);
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, 2400);

      return () => clearTimeout(timer);
    }
  }, [movement, currentId, onDismiss]);

  if (!visible || !movement) return null;

  const handleClose = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  return (
    <div className="fixed top-12 sm:top-14 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
      <div
        onClick={handleClose}
        className="pointer-events-auto max-w-sm sm:max-w-md w-full bg-slate-950/45 backdrop-blur-md border border-amber-400/50 rounded-2xl p-3 shadow-2xl shadow-amber-500/15 animate-fade-in-down cursor-pointer hover:bg-slate-950/55 transition select-none"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
          <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs">
            <span className="text-base">🎴</span>
            <span>カード移動：【{movement.effectName}】</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-stone-400/80 mr-1 hidden xs:inline">タップで閉じる</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-stone-300"
              title="閉じる"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Movement paths representation */}
        <div className="space-y-1.5 mb-2">
          {movement.movements.slice(0, 3).map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-black/35 backdrop-blur-xs rounded-xl px-2.5 py-1.5 border border-white/10 text-xs font-bold"
            >
              <span className={`truncate max-w-[85px] ${item.fromName === 'あなた' ? 'text-amber-300 font-black' : 'text-stone-200'}`}>
                {item.fromName}
              </span>

              <div className="flex items-center gap-1 text-amber-400 px-2 shrink-0 animate-pulse">
                <span className="text-xs">🎴</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>

              <span className={`truncate max-w-[85px] text-right ${item.toName === 'あなた' ? 'text-emerald-400 font-black' : 'text-stone-200'}`}>
                {item.toName}
              </span>

              {/* If card identity is authorized, display it; else show secret card back */}
              <div className="ml-1 shrink-0">
                {item.cardName ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-400/50 font-black">
                    「{item.cardName}」
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-stone-300 border border-white/15">
                    裏面1枚
                  </span>
                )}
              </div>
            </div>
          ))}

          {movement.movements.length > 3 && (
            <div className="text-center text-[10px] text-stone-300/80 font-bold">
              他 {movement.movements.length - 3} 名の間でも同時に移動
            </div>
          )}
        </div>

        {/* Personalized summary caption */}
        <div className="text-center text-xs font-black text-amber-200 bg-amber-950/40 py-1.5 px-2.5 rounded-xl border border-amber-500/30 backdrop-blur-xs leading-snug">
          {movement.summary}
        </div>
      </div>
    </div>
  );
};
