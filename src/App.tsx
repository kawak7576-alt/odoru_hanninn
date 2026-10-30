import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, ClientGameState } from './types/game';
import { GameTable } from './components/GameTable';
import { PlayerHand } from './components/PlayerHand';
import { Lobby } from './components/Lobby';
import { ActionModals } from './components/ActionModals';
import { GameOverModal } from './components/GameOverModal';
import { HistoryDashboard } from './components/HistoryDashboard';
import { RulesModal } from './components/RulesModal';
import { GameLogDrawer } from './components/GameLogDrawer';
import { CardDetailModal } from './components/CardDetailModal';
import { RoomSelectModal } from './components/RoomSelectModal';
import { CardImageModal } from './components/CardImageModal';
import {
  getStoredAppIcon,
  DEFAULT_APP_ICON,
  updateFavicon,
  fetchRemoteCustomImages,
  applyRemoteCustomImages,
} from './utils/cardImageSetting';
import { normalizeRoomId } from './utils/roomId';
import { sounds } from './utils/sound';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  History,
  AlertCircle,
  RotateCcw,
  Lightbulb,
  X,
  Download,
  Wifi,
  WifiOff,
  Loader2,
  Share2,
  Check,
  DoorOpen,
} from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);

  const [myPlayerId] = useState<string>(() => {
    try {
      let pId = localStorage.getItem('odoru_player_id');
      if (!pId) {
        pId = `P_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        localStorage.setItem('odoru_player_id', pId);
      }
      return pId;
    } catch {
      return `P_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    }
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('odoru_player_name') || '探偵';
    } catch {
      return '探偵';
    }
  });

  // Room state (2-digit: "01" - "99")
  const getInitialRoom = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) return normalizeRoomId(roomParam);
      const saved = localStorage.getItem('odoru_room_id');
      if (saved) return normalizeRoomId(saved);
    } catch {
      // ignore
    }
    return '01';
  };

  const [roomId, setRoomId] = useState<string>(getInitialRoom);
  const [showRoomSelect, setShowRoomSelect] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Modals & Panels
  const [showRules, setShowRules] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showIncidentMemo, setShowIncidentMemo] = useState(false);
  const [showCardImageModal, setShowCardImageModal] = useState(false);
  const [appIcon, setAppIcon] = useState<string>(getStoredAppIcon);
  const [inspectedCard, setInspectedCard] = useState<Card | null>(null);

  useEffect(() => {
    fetchRemoteCustomImages();
    const handleUpdate = () => {
      const icon = getStoredAppIcon();
      setAppIcon(icon);
      updateFavicon(icon);
    };
    window.addEventListener('odoru_card_image_updated', handleUpdate);
    updateFavicon(getStoredAppIcon());
    return () => window.removeEventListener('odoru_card_image_updated', handleUpdate);
  }, []);
  const [inspectedCardSource, setInspectedCardSource] = useState<string | undefined>(undefined);
  const [soundEnabled, setSoundEnabled] = useState(sounds.isEnabled());

  const handleInspectCard = useCallback((card: Card, sourceLabel?: string) => {
    sounds.selectCard();
    setInspectedCard(card);
    setInspectedCardSource(sourceLabel);
  }, []);

  // WebSocket ref & reconnect timer
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Refs for stable connection handling without thrashing sockets
  const roomIdRef = useRef<string>(roomId);
  roomIdRef.current = roomId;
  const playerNameRef = useRef<string>(playerName);
  playerNameRef.current = playerName;
  const myPlayerIdRef = useRef<string>(myPlayerId);
  myPlayerIdRef.current = myPlayerId;

  // Synchronize URL and localStorage with current 2-digit roomId
  useEffect(() => {
    try {
      localStorage.setItem('odoru_room_id', roomId);
      const url = new URL(window.location.href);
      if (url.searchParams.get('room') !== roomId) {
        url.searchParams.set('room', roomId);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      console.error(e);
    }
  }, [roomId]);

  // Connect & maintain WebSocket with automatic reconnection
  const connectWebSocket = useCallback(() => {
    if (!isMountedRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      setIsConnected(true);
      setIsReconnecting(false);

      const pId = myPlayerIdRef.current;
      const pName = playerNameRef.current;
      const curRoom = roomIdRef.current;

      // Join / reconnect with 2-digit room code
      ws.send(
        JSON.stringify({
          type: 'JOIN_GAME',
          playerId: pId,
          playerName: pName,
          roomId: curRoom,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'PONG') {
          setIsConnected(true);
          return;
        }
        if (msg.type === 'SYNC_CUSTOM_IMAGES') {
          if (msg.images) {
            applyRemoteCustomImages(msg.images);
          }
          return;
        }
        if (msg.type === 'ROOM_UPDATE') {
          setGameState(msg.state);
          if (msg.state.roomId && msg.state.roomId !== roomIdRef.current) {
            setRoomId(msg.state.roomId);
          }
        } else if (msg.type === 'ERROR') {
          setErrorToast(msg.message);
          setTimeout(() => setErrorToast(null), 3500);
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      setIsReconnecting(true);

      // Attempt automatic reconnect after 1.5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          connectWebSocket();
        }
      }, 1500);
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connectWebSocket();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Keep-alive heartbeat every 20s to prevent Render/Cloud proxies from dropping connection
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, 20000);

    const handleNetworkChange = () => {
      if (document.visibilityState === 'visible' || navigator.onLine) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          connectWebSocket();
        }
      }
    };

    window.addEventListener('online', handleNetworkChange);
    document.addEventListener('visibilitychange', handleNetworkChange);

    return () => {
      clearInterval(pingInterval);
      window.removeEventListener('online', handleNetworkChange);
      document.removeEventListener('visibilitychange', handleNetworkChange);
    };
  }, [connectWebSocket]);

  // Audio trigger on turn changes
  useEffect(() => {
    if (gameState && myPlayerId) {
      if (gameState.currentTurnPlayerId === myPlayerId && gameState.phase === 'playing') {
        sounds.turnAlert();
      }
    }
  }, [gameState?.currentTurnPlayerId, gameState?.phase, myPlayerId]);

  const sendWs = (payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ ...payload, roomId }));
    }
  };

  // Switch 2-digit room
  const handleSwitchRoom = (targetRoomId: string) => {
    const cleanId = normalizeRoomId(targetRoomId);
    setRoomId(cleanId);
    roomIdRef.current = cleanId;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SWITCH_ROOM',
          playerId: myPlayerId,
          targetRoomId: cleanId,
          playerName,
        })
      );
    }
  };

  // Copy 2-digit room invite link
  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setCopiedInvite(true);
          setTimeout(() => setCopiedInvite(false), 2500);
        })
        .catch(() => {
          fallbackCopy(url);
        });
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  // Profile actions
  const handleUpdateName = (name: string) => {
    setPlayerName(name);
    playerNameRef.current = name;
    localStorage.setItem('odoru_player_name', name);
    sendWs({
      type: 'UPDATE_NAME',
      playerId: myPlayerId,
      playerName: name,
    });
  };

  // Clean up disconnected ghost players in lobby
  const handleKickDisconnected = (targetPlayerId: string) => {
    sendWs({
      type: 'KICK_DISCONNECTED',
      targetPlayerId,
    });
  };

  // Lobby actions
  const handleAddBot = () => {
    sendWs({ type: 'ADD_BOT' });
  };

  const handleRemoveBot = (botId: string) => {
    sendWs({ type: 'REMOVE_BOT', botId });
  };

  const handleShufflePlayers = () => {
    sendWs({ type: 'SHUFFLE_PLAYERS' });
  };

  const handleStartGame = () => {
    sendWs({ type: 'START_GAME' });
  };

  const handleResetRoom = () => {
    sendWs({ type: 'RESET_ROOM' });
    setShowResetConfirm(false);
  };

  // Gameplay actions
  const handleFirstDiscovererSubmit = (incident: string) => {
    sendWs({
      type: 'PLAY_FIRST_DISCOVERER',
      playerId: myPlayerId,
      incident,
    });
  };

  const handlePlayCard = (cardId: string) => {
    sendWs({
      type: 'PLAY_CARD',
      playerId: myPlayerId,
      cardId,
    });
  };

  const handleDetectiveAccuse = (targetPlayerId: string) => {
    sendWs({
      type: 'ACTION_DETECTIVE',
      playerId: myPlayerId,
      targetPlayerId,
    });
  };

  const handleTradeOffer = (targetPlayerId: string, cardId: string) => {
    sendWs({
      type: 'ACTION_TRADE_OFFER',
      playerId: myPlayerId,
      targetPlayerId,
      cardId,
    });
  };

  const handleTradeAccept = (cardId: string) => {
    sendWs({
      type: 'ACTION_TRADE_ACCEPT',
      cardId,
    });
  };

  const handleWitnessTarget = (targetPlayerId: string) => {
    sendWs({
      type: 'ACTION_WITNESS',
      playerId: myPlayerId,
      targetPlayerId,
    });
  };

  const handleWitnessDone = () => {
    sendWs({ type: 'ACTION_WITNESS_DONE' });
  };

  const handleDogAction = (targetPlayerId: string, cardIndex: number) => {
    sendWs({
      type: 'ACTION_DOG',
      playerId: myPlayerId,
      targetPlayerId,
      cardIndex,
    });
  };

  const handleBoyDone = () => {
    sendWs({ type: 'ACTION_BOY_DONE' });
  };

  const handleRumorPick = (cardIndex: number) => {
    sendWs({
      type: 'ACTION_RUMOR_PICK',
      playerId: myPlayerId,
      cardIndex,
    });
  };

  const handleInfoManipulationPick = (cardId: string) => {
    sendWs({
      type: 'ACTION_INFO_MANIPULATION_PICK',
      playerId: myPlayerId,
      cardId,
    });
  };

  const handleRestartGame = () => {
    sendWs({ type: 'RESTART_GAME' });
  };

  const handleToggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
  };

  // Complete, verified ZIP download using in-memory fetch blob
  const handleDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      const res = await fetch('/api/download-zip');
      if (!res.ok) {
        throw new Error(`ダウンロードに失敗しました (Status: ${res.status})`);
      }
      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error('ZIPアーカイブが空です。再度お試しください。');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'odoru-hannin.zip';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('ZIP download error:', err);
      setErrorToast(err.message || 'ZIPダウンロードに失敗しました');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const isHost = gameState?.players.find((p) => p.id === myPlayerId)?.isHost ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white flex flex-col font-sans selection:bg-amber-400 selection:text-black">
      {/* Reconnection Status Banner */}
      {isReconnecting && (
        <div className="w-full bg-amber-500 text-slate-950 py-1 px-4 text-center text-xs font-black flex items-center justify-center gap-2 animate-pulse shadow-md sticky top-0 z-50">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>サーバーと再接続中... 手札と状態を自動復元します</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="w-full border-b border-white/10 bg-slate-900/90 backdrop-blur-md px-2.5 sm:px-5 py-1.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <img
            src={appIcon}
            alt="踊る犯人 アイコン"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-amber-400/60 shadow-md shadow-amber-500/20"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_APP_ICON;
            }}
          />
          <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center whitespace-nowrap">
            <span className="text-amber-400">踊る犯人</span>
          </h1>

          {/* Room Number Badge & Quick Switch */}
          <button
            onClick={() => setShowRoomSelect(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/80 hover:bg-slate-950 border border-amber-400/50 text-xs font-black text-amber-300 transition cursor-pointer shadow-sm ml-0.5"
            title="部屋番号を変更または確認"
          >
            <span className="text-stone-400 text-[10px]">部屋</span>
            <span className="text-amber-400 font-mono text-xs tracking-wider font-black">#{roomId}</span>
          </button>

          {/* Connection status badge */}
          <div className="hidden sm:flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-slate-950/60 border border-white/5 text-[11px] font-bold">
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300">オンライン</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="text-amber-300">再接続中</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Quick Invite Link Copy */}
          <button
            onClick={handleCopyInviteLink}
            className={`px-2 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm ${
              copiedInvite
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-white/5 hover:bg-white/15 text-stone-200 border-white/10'
            }`}
            title="友達をこの部屋に招待するURLをコピー"
          >
            {copiedInvite ? (
              <>
                <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                <span className="text-[10px] font-black">コピー済</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-[11px]">招待</span>
              </>
            )}
          </button>

          {/* Reset button: curved arrow icon only */}
          {gameState && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-400/40 transition flex items-center justify-center cursor-pointer shadow-sm"
              title="ゲームをリセットしてロビーに戻る"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            </button>
          )}

          <button
            onClick={() => setShowRules(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-stone-300 transition flex items-center gap-1 text-xs font-bold"
            title="ルール説明"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">ルール</span>
          </button>
          <button
            onClick={() => setShowDashboard(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-stone-300 transition flex items-center gap-1 text-xs font-bold"
            title="対戦履歴"
          >
            <History className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">戦績</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 max-w-6xl w-full mx-auto relative">
        {!gameState || gameState.phase === 'lobby' ? (
          <div className="my-auto w-full">
            <Lobby
              gameState={gameState}
              myPlayerId={myPlayerId}
              playerName={playerName}
              setPlayerName={setPlayerName}
              onUpdateName={handleUpdateName}
              roomId={roomId}
              onOpenRoomSelect={() => setShowRoomSelect(true)}
              onCopyInviteLink={handleCopyInviteLink}
              copiedInvite={copiedInvite}
              onAddBot={handleAddBot}
              onRemoveBot={handleRemoveBot}
              onShufflePlayers={handleShufflePlayers}
              onStartGame={handleStartGame}
              onOpenRules={() => setShowRules(true)}
              onOpenDashboard={() => setShowDashboard(true)}
              onOpenCardImageModal={() => setShowCardImageModal(true)}
              onDownloadZip={handleDownloadZip}
              isDownloadingZip={isDownloadingZip}
              onKickDisconnected={handleKickDisconnected}
            />
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col justify-between relative gap-1.5 sm:gap-2">
            {/* 2. 現在の巡目やゲーム状況: （左から、事件メモ　第〇巡目　捨て札：〇枚） */}
            <div className="w-full flex items-center justify-between px-2.5 sm:px-3 py-1 bg-slate-950/85 rounded-2xl border border-white/10 backdrop-blur-md shadow-sm relative z-30">
              {/* 左：事件メモ */}
              <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
                <div className="relative">
                  <button
                    onClick={() => setShowIncidentMemo(!showIncidentMemo)}
                    className={`px-2.5 py-1 rounded-xl shadow flex items-center gap-1 transition-all transform active:scale-95 cursor-pointer border text-xs font-black ${
                      gameState.incident
                        ? 'bg-amber-400 text-slate-950 border-yellow-200 hover:bg-yellow-300 shadow-amber-400/30'
                        : 'bg-slate-800 text-amber-300 border-white/10'
                    }`}
                    title="事件メモを開く"
                  >
                    <Lightbulb className="w-3.5 h-3.5 fill-current" />
                    <span>事件メモ</span>
                  </button>

                  {/* Popover incident memo - displayed cleanly in front of the table */}
                  {showIncidentMemo && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                        onClick={() => setShowIncidentMemo(false)}
                      />
                      <div className="absolute top-11 left-0 w-72 sm:w-84 bg-slate-900 border-2 border-amber-400 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md z-50 text-left animate-scale-up">
                        <div className="flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
                          <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs">
                            <Lightbulb className="w-4 h-4 fill-amber-400" />
                            <span>捜査メモ：事件の概要</span>
                          </div>
                          <button
                            onClick={() => setShowIncidentMemo(false)}
                            className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-white leading-relaxed bg-black/50 p-2.5 rounded-xl border border-white/10">
                          {gameState.incident || 'まだ事件は発生していません（第一発見者が発表します）'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {gameState.incident && (
                  <span className="text-[11px] font-bold text-amber-200 truncate max-w-[110px] sm:max-w-xs hidden xs:inline">
                    「{gameState.incident}」
                  </span>
                )}
              </div>

              {/* 真ん中：第〇巡目 */}
              <div className="shrink-0 px-2 flex justify-center">
                <div className="text-xs font-mono font-black text-amber-300 bg-amber-950/80 px-3 py-0.5 rounded-full border border-amber-500/50 shadow-sm">
                  第{gameState.round}巡目
                </div>
              </div>

              {/* 右：捨て札：〇枚 */}
              <div className="flex-1 flex items-center justify-end">
                <div className="text-xs font-bold text-stone-200 bg-black/60 px-2.5 py-0.5 rounded-full border border-white/15 shadow-sm whitespace-nowrap">
                  捨て札: <span className="font-mono text-amber-400 font-black">{gameState.discardPile.length}</span>枚
                </div>
              </div>
            </div>

            {/* 3. プレイヤーの配置と手札枚数: Casino Green Felt Table */}
            <GameTable
              gameState={gameState}
              myPlayerId={myPlayerId}
              onInspectCard={handleInspectCard}
            />

            {/* 4. 自分のターンと次の操作 & 自分の手札 */}
            <div className="w-full">
              <PlayerHand
                gameState={gameState}
                myPlayerId={myPlayerId}
                onPlayCard={handlePlayCard}
                onOpenRules={() => setShowRules(true)}
                onOpenDashboard={() => setShowDashboard(true)}
                onToggleLog={() => setShowLogDrawer(true)}
                soundEnabled={soundEnabled}
                onToggleSound={handleToggleSound}
              />
            </div>
          </div>
        )}
      </main>

      {/* Interactive Action Modals */}
      {gameState && (
        <ActionModals
          gameState={gameState}
          myPlayerId={myPlayerId}
          onFirstDiscovererSubmit={handleFirstDiscovererSubmit}
          onDetectiveAccuse={handleDetectiveAccuse}
          onTradeOffer={handleTradeOffer}
          onTradeAccept={handleTradeAccept}
          onWitnessTarget={handleWitnessTarget}
          onWitnessDone={handleWitnessDone}
          onDogAction={handleDogAction}
          onBoyDone={handleBoyDone}
          onRumorPick={handleRumorPick}
          onInfoManipulationPick={handleInfoManipulationPick}
          onInspectCard={(card) => handleInspectCard(card, 'カード詳細')}
        />
      )}

      {/* Game Over Modal */}
      {gameState && gameState.phase === 'game_over' && gameState.result && (
        <GameOverModal
          result={gameState.result}
          isHost={isHost}
          onRestart={handleRestartGame}
          onInspectCard={(card) => handleInspectCard(card, '決着カード')}
        />
      )}

      {/* Card Detail Modal (Exact same detail screen as hand cards when tapping field/played cards) */}
      {inspectedCard && (
        <CardDetailModal
          card={inspectedCard}
          isFieldCard={true}
          fieldSourceLabel={inspectedCardSource || '場に出されたカード'}
          onClose={() => {
            setInspectedCard(null);
            setInspectedCardSource(undefined);
          }}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl animate-scale-up">
            <div className="text-3xl mb-2">🔄</div>
            <h2 className="text-lg font-black text-white">ゲームをリセットしますか？</h2>
            <p className="text-xs text-stone-300 mt-1 mb-5">
              現在のゲーム進行をリセットし、参加者全員が待機ロビーに戻ります。
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-stone-300 font-bold text-xs transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleResetRoom}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-red-600/30 transition"
              >
                リセットしてロビーへ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      {showRoomSelect && (
        <RoomSelectModal
          currentRoomId={roomId}
          onSelectRoom={handleSwitchRoom}
          onClose={() => setShowRoomSelect(false)}
        />
      )}
      {showRules && (
        <RulesModal
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onClose={() => setShowRules(false)}
        />
      )}
      {showDashboard && <HistoryDashboard onClose={() => setShowDashboard(false)} />}
      <CardImageModal
        isOpen={showCardImageModal}
        onClose={() => setShowCardImageModal(false)}
      />
      {gameState && (
        <GameLogDrawer
          logs={gameState.logs}
          isOpen={showLogDrawer}
          onClose={() => setShowLogDrawer(false)}
        />
      )}

      {/* Error / System Toast */}
      {errorToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-950 border border-red-500 rounded-xl text-red-200 text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{errorToast}</span>
        </div>
      )}
    </div>
  );
}
