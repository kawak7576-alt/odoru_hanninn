import React, { useState, useEffect } from 'react';
import { X, Hash, Shuffle, Users, Check, ArrowRight } from 'lucide-react';
import { normalizeRoomId, generateRandomRoomId } from '../utils/roomId';

interface RoomInfo {
  id: string;
  playerCount: number;
  phase: string;
  round: number;
}

interface RoomSelectModalProps {
  currentRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onClose: () => void;
}

export const RoomSelectModal: React.FC<RoomSelectModalProps> = ({
  currentRoomId,
  onSelectRoom,
  onClose,
}) => {
  const [inputRoom, setInputRoom] = useState(currentRoomId);
  const [activeRooms, setActiveRooms] = useState<RoomInfo[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    setLoadingRooms(true);
    fetch('/api/rooms')
      .then((res) => res.json())
      .then((data) => {
        if (isSubscribed && data.rooms) {
          setActiveRooms(data.rooms);
        }
      })
      .catch((err) => console.error('Failed to load active rooms:', err))
      .finally(() => {
        if (isSubscribed) setLoadingRooms(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleApply = (target?: string) => {
    const chosen = normalizeRoomId(target !== undefined ? target : inputRoom);
    onSelectRoom(chosen);
    onClose();
  };

  const handleRandom = () => {
    const randomId = generateRandomRoomId();
    setInputRoom(randomId);
    handleApply(randomId);
  };

  const quickRooms = ['01', '02', '03', '07', '12', '77'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border-2 border-amber-400/80 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-scale-up text-white relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-stone-400 hover:text-white transition"
          title="閉じる"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 mb-2">
            <Hash className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">部屋番号の選択・変更</h2>
          <p className="text-xs text-stone-400 mt-1">
            友達と同じ<strong className="text-amber-300">2桁の番号（01〜99）</strong>を入力すると合流できます
          </p>
        </div>

        {/* 2-Digit Input Form */}
        <div className="mb-5 bg-slate-950 p-4 rounded-2xl border border-white/10 shadow-inner">
          <label className="block text-xs font-bold text-stone-300 mb-2 text-center">
            部屋番号を入力（01〜99）
          </label>
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center justify-center px-4 py-2 bg-slate-900 border-2 border-amber-400/80 rounded-2xl shadow">
              <span className="text-stone-500 font-mono text-xl mr-1">#</span>
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={2}
                value={inputRoom}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 2);
                  setInputRoom(cleaned);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
                placeholder="01"
                className="w-16 bg-transparent text-center font-mono text-3xl font-black text-amber-300 focus:outline-none tracking-widest"
                autoFocus
              />
            </div>

            <button
              onClick={() => handleApply()}
              className="px-4 py-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-yellow-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>決定</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex justify-center">
            <button
              onClick={handleRandom}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-400" />
              <span>ランダムな部屋番号にする</span>
            </button>
          </div>
        </div>

        {/* Quick select pills */}
        <div className="mb-4">
          <div className="text-[11px] font-bold text-stone-400 mb-1.5 flex items-center gap-1">
            <span>人気の部屋番号:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickRooms.map((num) => (
              <button
                key={num}
                onClick={() => handleApply(num)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black border transition cursor-pointer ${
                  currentRoomId === num
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-slate-950 hover:bg-white/10 text-stone-200 border-white/10'
                }`}
              >
                #{num}
              </button>
            ))}
          </div>
        </div>

        {/* Currently active rooms list */}
        <div>
          <div className="text-[11px] font-bold text-stone-400 mb-1.5 flex items-center justify-between">
            <span>プレイヤーがいる部屋:</span>
            {loadingRooms && <span className="text-stone-500 text-[10px]">更新中...</span>}
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
            {activeRooms.length === 0 ? (
              <div className="py-3 text-center text-xs text-stone-500 bg-slate-950/40 rounded-xl border border-white/5">
                現在他のプレイヤーがいる部屋はありません（一番乗りです！）
              </div>
            ) : (
              activeRooms.map((r) => {
                const isCurrent = r.id === currentRoomId;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleApply(r.id)}
                    className={`w-full p-2 rounded-xl border text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-950/40 border-amber-400/60 text-amber-200'
                        : 'bg-slate-950/70 hover:bg-slate-950 border-white/5 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-amber-400">#{r.id}</span>
                      <span className="text-[11px] text-stone-400">
                        {r.phase === 'lobby' ? '待機中' : `対戦中 (巡${r.round})`}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded">
                          現在地
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-stone-400 text-[11px]">
                      <Users className="w-3 h-3 text-sky-400" />
                      <span>{r.playerCount}人</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
