import React, { useEffect, useState, useMemo } from 'react';
import { CardMovementEvent, PlayerPublic } from '../types/game';
import { DEFAULT_CARD_BACK_IMAGE } from '../utils/cardImageSetting';

interface Point {
  x: number;
  y: number;
}

interface TableMovementArrowsProps {
  movement?: CardMovementEvent | null;
  otherPlayers: PlayerPublic[];
  myPlayerId: string;
  cardBackSrc: string;
}

export const TableMovementArrows: React.FC<TableMovementArrowsProps> = ({
  movement,
  otherPlayers,
  myPlayerId,
  cardBackSrc,
}) => {
  const [activeEvent, setActiveEvent] = useState<CardMovementEvent | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // Trigger animation whenever movement id changes
  useEffect(() => {
    if (!movement) return;

    setActiveEvent(movement);
    setIsVisible(true);
    setProgress(0);

    const startTime = performance.now();
    const duration = 1600; // 1.6s for card gliding motion
    let animFrame: number;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const p = Math.min(1, elapsed / duration);
      // Smooth ease-in-out curve
      const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      setProgress(eased);

      if (p < 1) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);

    // Keep the arrows and badge visible for 2.6s, then fade out
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2600);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(dismissTimer);
    };
  }, [movement?.id]);

  // Coordinate mapper for any player ID or 'FIELD'
  const getCoords = (id: string): Point => {
    if (id === 'FIELD' || id === 'discard' || id === 'field') {
      return { x: 50, y: 62 }; // Center field discard pile
    }
    if (id === myPlayerId) {
      return { x: 50, y: 91 }; // Local player hand (bottom center)
    }

    const idx = otherPlayers.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const total = otherPlayers.length;
      if (total === 1) {
        return { x: 50, y: 22 };
      }
      const startAngle = Math.PI * 0.90;
      const endAngle = Math.PI * 0.10;
      const angle = startAngle - (idx / (total - 1)) * (startAngle - endAngle);
      const rx = 38;
      const ry = 28;
      const cx = 50;
      const cy = 48;
      return {
        x: cx + rx * Math.cos(angle),
        y: cy - ry * Math.sin(angle),
      };
    }

    return { x: 50, y: 50 };
  };

  // Helper to compute quadratic bezier point at t
  const getBezierPoint = (p0: Point, ctrl: Point, p1: Point, t: number): Point => {
    const mt = 1 - t;
    return {
      x: mt * mt * p0.x + 2 * mt * t * ctrl.x + t * t * p1.x,
      y: mt * mt * p0.y + 2 * mt * t * ctrl.y + t * t * p1.y,
    };
  };

  if (!isVisible || !activeEvent || activeEvent.movements.length === 0) {
    return null;
  }

  const { effect, effectName, movements } = activeEvent;

  // 1. Trade (取り引き): Bidirectional exchange between 2 players
  if (effect === 'trade' && movements.length >= 2) {
    const p1 = movements[0];
    const p2 = movements[1];
    const start1 = getCoords(p1.fromId);
    const end1 = getCoords(p1.toId);

    const mx = (start1.x + end1.x) / 2;
    const my = (start1.y + end1.y) / 2;

    const dx = end1.x - start1.x;
    const dy = end1.y - start1.y;
    const len = Math.hypot(dx, dy) || 1;
    // Perpendicular unit vector
    const nx = -dy / len;
    const ny = dx / len;
    const curveOffset = 7;

    // Arrow 1: P1 -> P2 (curved one way)
    const ctrl1 = { x: mx + nx * curveOffset, y: my + ny * curveOffset };
    // Arrow 2: P2 -> P1 (curved other way)
    const ctrl2 = { x: mx - nx * curveOffset, y: my - ny * curveOffset };

    const cardPos1 = getBezierPoint(start1, ctrl1, end1, progress);
    const cardPos2 = getBezierPoint(end1, ctrl2, start1, progress);

    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none z-30 transition-opacity duration-300">
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="trade-arrow-1"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#facc15" />
            </marker>
            <marker
              id="trade-arrow-2"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
            </marker>
            <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#facc15" floodOpacity="0.8" />
            </filter>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#38bdf8" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Path 1: P1 -> P2 */}
          <path
            d={`M ${start1.x} ${start1.y} Q ${ctrl1.x} ${ctrl1.y} ${end1.x} ${end1.y}`}
            fill="none"
            stroke="#facc15"
            strokeWidth="1.2"
            strokeDasharray="2.5 1.5"
            className="animate-dash-flow"
            filter="url(#glow-gold)"
            markerEnd="url(#trade-arrow-1)"
          />

          {/* Path 2: P2 -> P1 */}
          <path
            d={`M ${end1.x} ${end1.y} Q ${ctrl2.x} ${ctrl2.y} ${start1.x} ${start1.y}`}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.2"
            strokeDasharray="2.5 1.5"
            className="animate-dash-flow"
            filter="url(#glow-cyan)"
            markerEnd="url(#trade-arrow-2)"
          />
        </svg>

        {/* Gliding Mini Card 1 */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-8 sm:w-7 sm:h-10 rounded-md border border-amber-300 shadow-xl overflow-hidden bg-slate-900 transition-transform pointer-events-none"
          style={{ left: `${cardPos1.x}%`, top: `${cardPos1.y}%` }}
        >
          <img
            src={cardBackSrc}
            alt="裏面"
            className="w-full h-full object-fill pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_CARD_BACK_IMAGE;
            }}
          />
        </div>

        {/* Gliding Mini Card 2 */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-8 sm:w-7 sm:h-10 rounded-md border border-sky-300 shadow-xl overflow-hidden bg-slate-900 transition-transform pointer-events-none"
          style={{ left: `${cardPos2.x}%`, top: `${cardPos2.y}%` }}
        >
          <img
            src={cardBackSrc}
            alt="裏面"
            className="w-full h-full object-fill pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_CARD_BACK_IMAGE;
            }}
          />
        </div>

        {/* Central Trade Badge */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 bg-slate-950/70 backdrop-blur-md border-2 border-amber-400/80 rounded-full px-3 py-1 shadow-2xl flex items-center gap-1.5 text-xs font-black text-amber-300 z-40 animate-bounce-short whitespace-nowrap"
          style={{ left: `${mx}%`, top: `${my}%` }}
        >
          <span className="text-sm">🔄</span>
          <span>取り引き</span>
          <span className="text-white text-[11px] font-bold">
            {p1.fromName} ⇆ {p1.toName}
          </span>
        </div>
      </div>
    );
  }

  // 2. Play (手札から場へ / 第一発見者 / 犯人逃亡): Hand -> Field
  if (effect === 'play') {
    const item = movements[0];
    const start = getCoords(item.fromId);
    const end = getCoords('FIELD');

    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    // Slight curve
    const ctrl = { x: mx, y: my - 3 };
    const cardPos = getBezierPoint(start, ctrl, end, progress);

    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none z-30 transition-opacity duration-300">
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="play-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#facc15" />
            </marker>
            <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#facc15" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Path from Player to Field */}
          <path
            d={`M ${start.x} ${start.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`}
            fill="none"
            stroke="#facc15"
            strokeWidth="1.4"
            strokeDasharray="2.5 1.5"
            className="animate-dash-flow"
            filter="url(#glow-gold)"
            markerEnd="url(#play-arrow)"
          />
        </svg>

        {/* Gliding Mini Card */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-8 sm:w-7 sm:h-10 rounded-md border border-amber-300 shadow-xl overflow-hidden bg-slate-900 transition-transform pointer-events-none"
          style={{ left: `${cardPos.x}%`, top: `${cardPos.y}%` }}
        >
          <img
            src={cardBackSrc}
            alt="裏面"
            className="w-full h-full object-fill pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_CARD_BACK_IMAGE;
            }}
          />
        </div>

        {/* Visual Badge: 手札 ➔ 場 */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 bg-slate-950/70 backdrop-blur-md border-2 border-amber-400/80 rounded-full px-3 py-1 shadow-2xl flex items-center gap-1.5 text-xs font-black text-amber-300 z-40 animate-bounce-short whitespace-nowrap"
          style={{ left: `${mx}%`, top: `${Math.min(my, 50)}%` }}
        >
          <span className="text-sm">🎴</span>
          <span className="text-yellow-300">
            {item.fromName === 'あなた' ? '手札' : `${item.fromName}の手札`} ➔ 場
          </span>
          {item.cardName && (
            <span className="px-1.5 py-0.2 bg-emerald-950/80 text-emerald-300 border border-emerald-400/50 rounded text-[10px]">
              「{item.cardName}」
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. Rumor (うわさ) / Info Manipulation (情報操作)
  if (effect === 'rumor' || effect === 'info_manipulation') {
    const isRumor = effect === 'rumor';
    const mainColor = isRumor ? '#c084fc' : '#22d3ee';
    const badgeBorder = isRumor ? 'border-purple-400 text-purple-300' : 'border-cyan-400 text-cyan-300';
    const label = isRumor ? 'うわさ：全員が右隣から1枚引く ↻' : '情報操作：全員が手札を1枚左隣へ渡す ↻';

    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none z-30 transition-opacity duration-300">
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id={`arrow-${effect}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={mainColor} />
            </marker>
            <filter id={`glow-${effect}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor={mainColor} floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Render paths for each transfer */}
          {movements.map((m, idx) => {
            const start = getCoords(m.fromId);
            const end = getCoords(m.toId);
            const mx = (start.x + end.x) / 2;
            const my = (start.y + end.y) / 2;
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const ctrl = { x: mx + nx * 5, y: my + ny * 5 };

            return (
              <path
                key={idx}
                d={`M ${start.x} ${start.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`}
                fill="none"
                stroke={mainColor}
                strokeWidth="1.2"
                strokeDasharray="2.5 1.5"
                className="animate-dash-flow"
                filter={`url(#glow-${effect})`}
                markerEnd={`url(#arrow-${effect})`}
              />
            );
          })}
        </svg>

        {/* Gliding Mini Cards along each path */}
        {movements.map((m, idx) => {
          const start = getCoords(m.fromId);
          const end = getCoords(m.toId);
          const mx = (start.x + end.x) / 2;
          const my = (start.y + end.y) / 2;
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const ctrl = { x: mx + nx * 5, y: my + ny * 5 };
          const cardPos = getBezierPoint(start, ctrl, end, progress);

          return (
            <div
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-7 sm:w-6 sm:h-8 rounded border border-white/60 shadow-lg overflow-hidden bg-slate-900 pointer-events-none"
              style={{ left: `${cardPos.x}%`, top: `${cardPos.y}%` }}
            >
              <img
                src={cardBackSrc}
                alt="裏面"
                className="w-full h-full object-fill pointer-events-none"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_CARD_BACK_IMAGE;
                }}
              />
            </div>
          );
        })}

        {/* Central Rotating Effect Badge */}
        <div
          className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/70 backdrop-blur-md border-2 ${badgeBorder} rounded-full px-3.5 py-1.5 shadow-2xl flex items-center gap-1.5 text-xs font-black z-40 animate-bounce-short whitespace-nowrap`}
        >
          <span className="text-sm">{isRumor ? '📢' : '🔄'}</span>
          <span>{label}</span>
        </div>
      </div>
    );
  }

  // 4. Dog (いぬ): Sniff / Reveal target player's card
  if (effect === 'dog') {
    const item = movements[0];
    const start = getCoords(item.fromId);
    const end = getCoords(item.toId);
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const ctrl = { x: mx, y: my - 4 };
    const cardPos = getBezierPoint(start, ctrl, end, progress);

    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none z-30 transition-opacity duration-300">
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="dog-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>
            <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.8" floodColor="#f59e0b" floodOpacity="0.8" />
            </filter>
          </defs>

          <path
            d={`M ${start.x} ${start.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.3"
            strokeDasharray="2.5 1.5"
            className="animate-dash-flow"
            filter="url(#glow-amber)"
            markerEnd="url(#dog-arrow)"
          />
        </svg>

        {/* Gliding Card */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-8 sm:w-7 sm:h-10 rounded-md border border-amber-400 shadow-xl overflow-hidden bg-slate-900 pointer-events-none"
          style={{ left: `${cardPos.x}%`, top: `${cardPos.y}%` }}
        >
          <img
            src={cardBackSrc}
            alt="裏面"
            className="w-full h-full object-fill pointer-events-none"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_CARD_BACK_IMAGE;
            }}
          />
        </div>

        {/* Central Badge */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 bg-slate-950/70 backdrop-blur-md border-2 border-amber-500/80 rounded-full px-3 py-1 shadow-2xl flex items-center gap-1.5 text-xs font-black text-amber-300 z-40 animate-bounce-short whitespace-nowrap"
          style={{ left: `${mx}%`, top: `${my}%` }}
        >
          <span className="text-sm">🐕</span>
          <span>いぬ：手札を嗅ぎ当てた！</span>
          {item.cardName && (
            <span className="px-1.5 py-0.2 bg-amber-950/80 text-amber-200 border border-amber-400/50 rounded text-[10px]">
              「{item.cardName}」
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
};
