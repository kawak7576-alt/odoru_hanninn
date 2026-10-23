import React, { useState } from 'react';
import { ClientGameState } from '../types/game';
import {
  Users,
  Bot,
  Play,
  Crown,
  HelpCircle,
  History,
  Trash2,
  Shuffle,
  Download,
  Edit2,
  Check,
  DoorOpen,
  Share2,
} from 'lucide-react';

interface LobbyProps {
  gameState: ClientGameState | null;
  myPlayerId: string;
  playerName: string;
  setPlayerName: (name: string) => void;
  onUpdateName: (name: string) => void;
  roomId: string;
  onOpenRoomSelect: () => void;
  onCopyInviteLink: () => void;
  copiedInvite: boolean;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onShufflePlayers: () => void;
  onStartGame: () => void;
  onOpenRules: () => void;
  onOpenDashboard: () => void;
  onDownloadZip: () => void;
  isDownloadingZip?: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({
  gameState,
  myPlayerId,
  playerName,
  setPlayerName,
  onUpdateName,
  roomId,
  onOpenRoomSelect,
  onCopyInviteLink,
  copiedInvite,
  onAddBot,
  onRemoveBot,
  onShufflePlayers,
  onStartGame,
  onOpenRules,
  onOpenDashboard,
  onDownloadZip,
  isDownloadingZip = false,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName);

  const players = gameState?.players || [];
  const myPlayer = players.find((p) => p.id === myPlayerId);
  const isHost = myPlayer?.isHost ?? false;
  const canStart = players.length >= 3 && players.length <= 8;

  const handleSaveName = () => {
    if (tempName.trim()) {
      setPlayerName(tempName.trim());
      onUpdateName(tempName.trim());
    }
    setEditingName(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-6 bg-slate-900/95 border-2 border-amber-400/50 rounded-3xl shadow-2xl backdrop-blur-md">
      {/* Top Header */}
      <div className="text-center mb-4">
        <div className="inline-block p-3.5 rounded-3xl bg-amber-500/15 border border-amber-400/40 text-amber-400 mb-2 shadow-inner">
          <span className="text-3xl sm:text-4xl">🎭</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">踊る犯人</h1>
        <p className="text-xs text-amber-300 font-bold mt-0.5">オンライン対戦ロビー</p>
      </div>

      {/* 2-Digit Room Indicator & Invite Bar */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-950 to-amber-500/10 border-2 border-amber-400/50 mb-4 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-left">
            <span className="text-[11px] font-bold text-stone-400 block">部屋番号（2桁）</span>
            <div className="flex items-baseline gap-1">
              <span className="text-amber-400 text-sm font-mono font-bold">#</span>
              <span className="text-3xl font-black font-mono tracking-widest text-white drop-shadow">
                {roomId}
              </span>
            </div>
          </div>
          <button
            onClick={onOpenRoomSelect}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/10"
            title="部屋番号を変更または作成"
          >
            <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>部屋を変更</span>
          </button>
        </div>

        <button
          onClick={onCopyInviteLink}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
            copiedInvite
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-yellow-500/20'
          }`}
          title="友達をこの部屋に招待するURLをコピー"
        >
          {copiedInvite ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>URLをコピーしました！</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>招待URLをコピー</span>
            </>
          )}
        </button>
      </div>

      {/* Player Name Profile Bar */}
      <div className="p-3 rounded-2xl bg-slate-950 border border-white/10 mb-4 flex items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-stone-400 font-bold shrink-0">あなたの名前:</span>
          {editingName ? (
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              maxLength={15}
              autoFocus
              className="flex-1 bg-slate-900 border border-amber-400 rounded-xl px-2.5 py-1 text-xs text-white font-bold focus:outline-none"
            />
          ) : (
            <span className="font-black text-amber-300 text-sm truncate">
              {playerName || '名無し探偵'}
            </span>
          )}
        </div>

        {editingName ? (
          <button
            onClick={handleSaveName}
            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow flex items-center gap-1 cursor-pointer transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>保存</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setTempName(playerName);
              setEditingName(true);
            }}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition"
          >
            <Edit2 className="w-3 h-3 text-amber-400" />
            <span>変更</span>
          </button>
        )}
      </div>

      {/* Players List (3 - 8 required) */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-300">
            <Users className="w-4 h-4 text-amber-400" />
            <span>参加プレイヤー ({players.length}/8名)</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isHost && players.length >= 2 && (
              <button
                onClick={onShufflePlayers}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 rounded-lg text-amber-300 text-[11px] font-bold flex items-center gap-1 shadow transition cursor-pointer"
                title="席順をランダムにシャッフル"
              >
                <Shuffle className="w-3 h-3 text-amber-400" />
                <span>席順シャッフル</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
          {players.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400 bg-slate-950/50 rounded-2xl border border-white/5">
              接続中...
            </div>
          ) : (
            players.map((p, index) => {
              const isMe = p.id === myPlayerId;
              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                    isMe
                      ? 'bg-amber-950/50 border-amber-400 text-amber-200 shadow-md'
                      : 'bg-slate-950/80 border-white/5 text-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-[11px] font-bold text-stone-400 flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {p.isBot ? (
                        <Bot className="w-4 h-4 text-sky-400" />
                      ) : p.connected ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                      <span className="font-bold text-xs sm:text-sm">
                        {p.name} {isMe && '（あなた）'}
                      </span>
                      {!p.connected && !p.isBot && (
                        <span className="text-[10px] text-rose-400 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-500/40">
                          一時切断（待機中）
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.isHost && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[10px] font-bold">
                        <Crown className="w-3 h-3 fill-yellow-400" />
                        ホスト
                      </span>
                    )}
                    {isHost && p.isBot && (
                      <button
                        onClick={() => onRemoveBot(p.id)}
                        className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                        title="ボットを外す"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Bot Controls (Host only) */}
      {isHost && players.length < 8 && (
        <div className="mb-4">
          <button
            onClick={onAddBot}
            className="w-full py-2 bg-slate-800/90 hover:bg-slate-700/90 border border-white/10 text-stone-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span>ボットを追加する（一人プレイ・検証・人数合わせ）</span>
          </button>
        </div>
      )}

      {/* Start Game Action */}
      <div className="space-y-2.5">
        {isHost ? (
          <button
            disabled={!canStart}
            onClick={onStartGame}
            className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              canStart
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-yellow-500/30'
                : 'bg-slate-800 text-stone-500 cursor-not-allowed border border-white/5'
            }`}
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>
              {canStart
                ? 'ゲームを開始する！'
                : `あと${Math.max(0, 3 - players.length)}人必要です（3〜8人対戦）`}
            </span>
          </button>
        ) : (
          <div className="py-3 bg-slate-950/70 rounded-2xl border border-white/5 text-stone-300 text-xs font-bold text-center">
            ホストがゲームを開始するのを待っています...
          </div>
        )}

        {/* Bottom utility buttons */}
        <div className="flex gap-2">
          <button
            onClick={onOpenRules}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-stone-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            ルール説明
          </button>
          <button
            onClick={onOpenDashboard}
            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-stone-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-sky-400" />
            対戦履歴
          </button>
          <button
            onClick={onDownloadZip}
            disabled={isDownloadingZip}
            className="py-2 px-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow"
            title="ソースコード一式をZIPダウンロード"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isDownloadingZip ? '作成中...' : 'ZIP保存'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
