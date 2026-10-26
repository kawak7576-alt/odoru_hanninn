import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import {
  Card,
  CardMovementEvent,
  CardMovementItem,
  CardType,
  ClientGameState,
  GameLogEntry,
  GamePhase,
  GameResult,
  InfoManipulationState,
  MatchRecord,
  PlayerPrivate,
  PlayerPublic,
  RumorState,
  TradeState,
  VictoryType,
} from './src/types/game.js';
import {
  CARD_DEFINITIONS,
  DEFAULT_INCIDENTS,
  buildDeckForPlayerCount,
} from './src/game/cardData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawCardTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  card: Card;
  isPublic?: boolean;
}

interface RawMovementRecord {
  id: string;
  timestamp: number;
  effect: 'trade' | 'rumor' | 'info_manipulation' | 'dog' | 'play';
  effectName: string;
  transfers: RawCardTransfer[];
}

interface InternalRoom {
  id: string;
  hostPlayerId: string;
  phase: GamePhase;
  players: PlayerPrivate[];
  deck: Card[];
  discardPile: Card[];
  incident: string;
  round: number;
  turnSeatIndex: number;
  turnsCompletedInRound: number;
  accomplicePlayerIds: Set<string>;
  logs: GameLogEntry[];
  result: GameResult | null;
  latestPlayedCard: { card: Card; playerId: string; playerName: string } | null;
  latestMovement?: RawMovementRecord | null;

  activeCardAction?: {
    cardType: CardType;
    turnPlayerId: string;
    actionType: 'detective' | 'trade' | 'witness' | 'dog' | 'boy' | 'rumor' | 'info_manipulation';
  } | null;

  tradeState?: TradeState | null;
  rumorState?: RumorState | null;
  infoManipulationState?: InfoManipulationState | null;
  witnessInfo?: { turnPlayerId: string; targetId: string; targetName: string; cards: Card[] } | null;
  boyNotifiedPlayerId?: string | null;
  revealedDogCard?: { card: Card; targetName: string; isCulprit: boolean } | null;
  botActionTimer?: NodeJS.Timeout | null;
  lastAdvanceTurnTime?: number;
}

const rooms = new Map<string, InternalRoom>();
const sockets = new Map<string, WebSocket>();
const playerRooms = new Map<string, string>(); // playerId -> 2-digit roomId
const matchHistory: MatchRecord[] = [];

function clearRoomBotTimer(room: InternalRoom) {
  if (room.botActionTimer) {
    clearTimeout(room.botActionTimer);
    room.botActionTimer = null;
  }
}

function scheduleRoomBotAction(room: InternalRoom, callback: () => void, delayMs: number) {
  clearRoomBotTimer(room);
  room.botActionTimer = setTimeout(() => {
    room.botActionTimer = null;
    callback();
  }, delayMs);
}

function normalizeRoomId(rawId: string | number | null | undefined): string {
  if (rawId === null || rawId === undefined) return '01';
  const clean = String(rawId).trim().replace(/\D/g, '');
  if (!clean) return '01';
  const num = parseInt(clean, 10);
  if (isNaN(num) || num <= 0) return '01';
  const clamped = Math.min(Math.max(1, num), 99);
  return clamped.toString().padStart(2, '0');
}

function getOrCreateRoom(roomId: string): InternalRoom {
  const normId = normalizeRoomId(roomId);
  let room = rooms.get(normId);
  if (!room) {
    room = {
      id: normId,
      hostPlayerId: '',
      phase: 'lobby',
      players: [],
      deck: [],
      discardPile: [],
      incident: '',
      round: 1,
      turnSeatIndex: 0,
      turnsCompletedInRound: 0,
      accomplicePlayerIds: new Set<string>(),
      logs: [],
      result: null,
      latestPlayedCard: null,
      botActionTimer: null,
    };
    rooms.set(normId, room);
  }
  return room;
}

function syncRoomHost(room: InternalRoom) {
  const currentHost = room.players.find((p) => p.id === room.hostPlayerId);
  // In lobby, if host is missing or disconnected, transfer crown to first connected human player
  if (!currentHost || (room.phase === 'lobby' && !currentHost.connected)) {
    const firstConnectedHuman = room.players.find((p) => !p.isBot && p.connected);
    if (firstConnectedHuman) {
      room.hostPlayerId = firstConnectedHuman.id;
    } else if (room.players.length > 0) {
      room.hostPlayerId = room.players[0].id;
    } else {
      room.hostPlayerId = '';
    }
  }
}

function pruneDisconnectedLobbyPlayers(room: InternalRoom) {
  if (room.phase !== 'lobby') return;
  const beforeCount = room.players.length;
  room.players = room.players.filter((p) => {
    if (p.isBot) return true;
    if (p.connected) return true;
    const ws = sockets.get(p.id);
    return !!(ws && ws.readyState === WebSocket.OPEN);
  });
  if (room.players.length !== beforeCount) {
    room.players.forEach((p, i) => {
      p.seatIndex = i;
    });
    syncRoomHost(room);
  }
}

const BOT_NAMES = [
  '明智警部🤖',
  'ホームズ🤖',
  'ポワロ助手🤖',
  '金田一少年🤖',
  '怪盗ルパン🤖',
  '謎の令嬢🤖',
  '怪しい執事🤖',
];

function generateId(prefix: string = ''): string {
  return `${prefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function addLog(room: InternalRoom, text: string, type: GameLogEntry['type'] = 'play') {
  const entry: GameLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    text,
    type,
  };
  room.logs.push(entry);
  if (room.logs.length > 80) {
    room.logs.shift();
  }
}

function getSanitizedStateForPlayer(room: InternalRoom, playerId: string): ClientGameState {
  const me = room.players.find((p) => p.id === playerId);
  const myHand = me ? me.hand : [];

  const publicPlayers: PlayerPublic[] = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.id === room.hostPlayerId,
    isBot: p.isBot,
    connected: p.connected,
    seatIndex: p.seatIndex,
    handCount: p.hand.length,
    playedCards: p.playedCards,
    isAccomplice: room.phase === 'game_over' ? p.isAccomplice : false,
    isDeadOrOut: p.hand.length === 0,
  }));

  const currentTurnPlayer = room.players[room.turnSeatIndex];

  let secretInfo: ClientGameState['secretInfo'] = null;

  if (room.boyNotifiedPlayerId === playerId) {
    const culpritHolder = room.players.find((p) => p.hand.some((c) => c.type === 'culprit'));
    if (culpritHolder) {
      secretInfo = {
        ...(secretInfo || {}),
        boyCulpritHolder: { id: culpritHolder.id, name: culpritHolder.name },
      };
    }
  }

  if (room.witnessInfo && room.witnessInfo.turnPlayerId === playerId) {
    secretInfo = {
      ...(secretInfo || {}),
      witnessCards: {
        targetId: room.witnessInfo.targetId,
        targetName: room.witnessInfo.targetName,
        cards: room.witnessInfo.cards,
      },
    };
  }

  if (room.revealedDogCard) {
    secretInfo = {
      ...(secretInfo || {}),
      revealedCard: room.revealedDogCard,
    };
  }

  if (room.tradeState && !room.tradeState.completed) {
    if (room.tradeState.toPlayerId === playerId) {
      const fromPlayer = room.players.find((p) => p.id === room.tradeState!.fromPlayerId);
      secretInfo = {
        ...(secretInfo || {}),
        tradeOfferPrompt: {
          fromPlayerId: room.tradeState.fromPlayerId,
          fromPlayerName: fromPlayer?.name || '相手',
        },
      };
    }
  }

  if (room.phase === 'waiting_rumor' && room.rumorState) {
    const N = room.players.length;
    const myIdx = room.players.findIndex((p) => p.id === playerId);
    if (myIdx !== -1) {
      const rightIdx = (myIdx - 1 + N) % N;
      const rightNeighbor = room.players[rightIdx];
      secretInfo = {
        ...(secretInfo || {}),
        rumorWaitPrompt: {
          rightNeighborId: rightNeighbor.id,
          rightNeighborName: rightNeighbor.name,
          rightNeighborCardCount: rightNeighbor.hand.length,
          canDraw: rightNeighbor.hand.length > 0,
        },
      };
    }
  }

  if (room.phase === 'waiting_info_manipulation' && room.infoManipulationState) {
    const myPlayer = room.players.find((p) => p.id === playerId);
    secretInfo = {
      ...(secretInfo || {}),
      infoManipulationPrompt: {
        canGive: (myPlayer?.hand.length ?? 0) > 0,
      },
    };
  }

  let latestMovement: CardMovementEvent | null = null;
  if (room.latestMovement) {
    const lm = room.latestMovement;
    let customSummary = '';
    if (lm.effect === 'trade') {
      const p1 = lm.transfers[0];
      const p2 = lm.transfers[1];
      if (p1 && p2) {
        if (p1.fromId === playerId) {
          customSummary = `【${p1.toName}】にカードを渡し、【${p1.toName}】から「${p2.card.name}」を受け取りました`;
        } else if (p2.fromId === playerId) {
          customSummary = `【${p2.toName}】にカードを渡し、【${p2.toName}】から「${p1.card.name}」を受け取りました`;
        } else {
          customSummary = `【${p1.fromName}】と【${p1.toName}】の間でカードが1枚移動しました`;
        }
      }
    } else if (lm.effect === 'rumor') {
      const myTransfer = lm.transfers.find((t) => t.toId === playerId);
      if (myTransfer) {
        customSummary = `右隣の【${myTransfer.fromName}】の手札から「${myTransfer.card.name}」を受け取りました`;
      } else {
        customSummary = `全員が右隣の手札からカードを1枚引きました`;
      }
    } else if (lm.effect === 'info_manipulation') {
      const myGive = lm.transfers.find((t) => t.fromId === playerId);
      const myReceive = lm.transfers.find((t) => t.toId === playerId);
      if (myGive && myReceive) {
        customSummary = `左隣の【${myGive.toName}】へ「${myGive.card.name}」を渡し、右隣の【${myReceive.fromName}】からカードを受け取りました`;
      } else {
        customSummary = `全員が左隣の手札へカードを1枚渡しました`;
      }
    } else if (lm.effect === 'dog') {
      const dogTransfer = lm.transfers[0];
      if (dogTransfer) {
        customSummary = `いぬが【${dogTransfer.fromName}】の手札から「${dogTransfer.card.name}」を暴きました！`;
      }
    } else if (lm.effect === 'play') {
      const playTransfer = lm.transfers[0];
      if (playTransfer) {
        if (playTransfer.fromId === playerId) {
          customSummary = `手札から「${playTransfer.card.name}」を場に出しました`;
        } else {
          customSummary = `【${playTransfer.fromName}】が手札から「${playTransfer.card.name}」を場に出しました`;
        }
      }
    }

    const movements: CardMovementItem[] = lm.transfers.map((t) => {
      const isParticipant = t.fromId === playerId || t.toId === playerId || t.toId === 'FIELD' || !!t.isPublic;
      const canSeeCard = !!t.isPublic || isParticipant;
      return {
        fromId: t.fromId,
        fromName: t.fromId === playerId ? 'あなた' : t.fromName,
        toId: t.toId,
        toName: t.toId === playerId ? 'あなた' : (t.toId === 'FIELD' ? '場' : t.toName),
        cardName: canSeeCard ? t.card.name : undefined,
        isSecret: !canSeeCard,
      };
    });

    latestMovement = {
      id: lm.id,
      timestamp: lm.timestamp,
      effect: lm.effect,
      effectName: lm.effectName,
      summary: customSummary || `${lm.effectName}によりカードが移動しました`,
      movements,
    };
  }

  return {
    roomId: room.id,
    phase: room.phase,
    incident: room.incident,
    round: room.round,
    turnIndex: room.turnSeatIndex,
    currentTurnPlayerId: currentTurnPlayer ? currentTurnPlayer.id : '',
    players: publicPlayers,
    myHand,
    discardPile: room.discardPile,
    latestPlayedCard: room.latestPlayedCard,
    logs: room.logs,
    result: room.result,
    activeCardAction: room.activeCardAction,
    secretInfo,
    latestMovement,
  };
}

function broadcastRoom(target: InternalRoom | string) {
  const roomId = typeof target === 'string' ? normalizeRoomId(target) : target.id;
  const room = typeof target === 'string' ? rooms.get(roomId) : target;
  if (!room) return;

  for (const player of room.players) {
    if (player.isBot) continue;
    const ws = sockets.get(player.id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const state = getSanitizedStateForPlayer(room, player.id);
      ws.send(JSON.stringify({ type: 'ROOM_UPDATE', state }));
    }
  }

  // Also send to any spectators mapped to this roomId
  for (const [pId, mappedRoomId] of playerRooms.entries()) {
    if (mappedRoomId === room.id && !room.players.some((p) => p.id === pId)) {
      const ws = sockets.get(pId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        const state = getSanitizedStateForPlayer(room, pId);
        ws.send(JSON.stringify({ type: 'ROOM_UPDATE', state }));
      }
    }
  }

  handleBotTurn(room);
}

function sendToPlayer(playerId: string, msg: any) {
  const ws = sockets.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function advanceTurn(room: InternalRoom) {
  if (room.phase === 'game_over') return;

  const now = Date.now();
  if (room.lastAdvanceTurnTime && now - room.lastAdvanceTurnTime < 350) {
    // Prevent duplicate turn advancement caused by concurrent triggers or rapid double-submits
    return;
  }
  room.lastAdvanceTurnTime = now;

  clearRoomBotTimer(room);

  room.activeCardAction = null;
  room.witnessInfo = null;
  room.boyNotifiedPlayerId = null;
  room.revealedDogCard = null;

  const playersWithCards = room.players.filter((p) => p.hand.length > 0);
  if (playersWithCards.length === 0) {
    finishGame(room, 'culprit', 'すべてのカードが出尽くしました！犯人は闇へと消え去りました。');
    return;
  }

  room.turnsCompletedInRound++;

  const totalPlayingPlayers = Math.max(1, playersWithCards.length);
  if (room.turnsCompletedInRound >= totalPlayingPlayers) {
    room.round++;
    room.turnsCompletedInRound = 0;
    addLog(room, `第${room.round}巡目に突入しました！`, 'system');
  }

  let nextSeat = (room.turnSeatIndex + 1) % room.players.length;
  let loopCount = 0;
  while (room.players[nextSeat].hand.length === 0 && loopCount < room.players.length) {
    nextSeat = (nextSeat + 1) % room.players.length;
    loopCount++;
  }

  room.turnSeatIndex = nextSeat;
  const nextPlayer = room.players[room.turnSeatIndex];
  addLog(room, `${nextPlayer.name}のターンです。`, 'system');

  room.phase = 'playing';
  broadcastRoom(room);
}

function finishGame(room: InternalRoom, victoryType: VictoryType, victoryReason: string, winnerIds?: string[]) {
  room.phase = 'game_over';

  const culpritPlayer = room.players.find((p) => p.hand.some((c) => c.type === 'culprit'))
    || room.players.find((p) => p.playedCards.some((c) => c.type === 'culprit'))
    || room.players[0];

  const winners: GameResult['winners'] = [];

  if (victoryType === 'culprit') {
    winners.push({
      id: culpritPlayer.id,
      name: culpritPlayer.name,
      role: 'culprit',
    });
    for (const accompliceId of room.accomplicePlayerIds) {
      if (accompliceId !== culpritPlayer.id) {
        const accomplice = room.players.find((p) => p.id === accompliceId);
        if (accomplice) {
          winners.push({
            id: accomplice.id,
            name: accomplice.name,
            role: 'accomplice',
          });
        }
      }
    }
  } else if (victoryType === 'detective') {
    const detectivePlayerId = winnerIds && winnerIds[0] ? winnerIds[0] : room.players[room.turnSeatIndex].id;
    const det = room.players.find((p) => p.id === detectivePlayerId);
    if (det) {
      winners.push({
        id: det.id,
        name: det.name,
        role: 'detective',
      });
    }
  } else if (victoryType === 'dog') {
    const dogPlayerId = winnerIds && winnerIds[0] ? winnerIds[0] : room.players[room.turnSeatIndex].id;
    const dog = room.players.find((p) => p.id === dogPlayerId);
    if (dog) {
      winners.push({
        id: dog.id,
        name: dog.name,
        role: 'dog',
      });
    }
  }

  const result: GameResult = {
    winners,
    victoryType,
    victoryReason,
    culpritPlayerId: culpritPlayer.id,
    culpritPlayerName: culpritPlayer.name,
    accomplicePlayerIds: Array.from(room.accomplicePlayerIds),
    allPlayerHands: room.players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      isAccomplice: room.accomplicePlayerIds.has(p.id),
      isCulprit: p.id === culpritPlayer.id,
      hand: [...p.hand],
    })),
    rounds: room.round,
    incident: room.incident,
    endedAt: Date.now(),
  };

  room.result = result;
  addLog(room, `【ゲーム終了】${victoryReason}`, 'victory');

  const record: MatchRecord = {
    id: generateId('MATCH_'),
    roomId: room.id,
    timestamp: Date.now(),
    playerCount: room.players.length,
    incident: room.incident,
    victoryType,
    victoryReason,
    winnerNames: winners.map((w) => w.name),
    culpritName: culpritPlayer.name,
    rounds: room.round,
  };
  matchHistory.unshift(record);
  if (matchHistory.length > 50) matchHistory.pop();

  broadcastRoom(room);
}

function handleBotTurn(room: InternalRoom) {
  if (room.phase === 'game_over' || room.phase === 'lobby') return;

  if (room.phase === 'waiting_trade' && room.tradeState && !room.tradeState.completed) {
    const targetPlayer = room.players.find((p) => p.id === room.tradeState!.toPlayerId);
    if (targetPlayer && targetPlayer.isBot) {
      scheduleRoomBotAction(room, () => {
        if (!room.tradeState || room.tradeState.completed) return;
        const nonCulprit = targetPlayer.hand.filter((c) => c.type !== 'culprit');
        const cardToGive = nonCulprit.length > 0
          ? nonCulprit[Math.floor(Math.random() * nonCulprit.length)]
          : targetPlayer.hand[0];
        executeTradeComplete(room, cardToGive.id);
      }, 1000);
    }
    return;
  }

  if (room.phase === 'waiting_rumor' && room.rumorState) {
    for (const pId of room.rumorState.participants) {
      const p = room.players.find((x) => x.id === pId);
      if (p && p.isBot && room.rumorState.playerChoices[pId] === undefined) {
        const myIdx = room.players.findIndex((x) => x.id === pId);
        const rightNeighbor = room.players[(myIdx - 1 + room.players.length) % room.players.length];
        if (rightNeighbor && rightNeighbor.hand.length > 0) {
          setTimeout(() => {
            if (room.phase !== 'waiting_rumor' || !room.rumorState) return;
            if (room.rumorState.playerChoices[pId] !== undefined) return;
            const chosenIndex = Math.floor(Math.random() * rightNeighbor.hand.length);
            handleRumorPick(room, pId, chosenIndex);
          }, 800 + Math.random() * 500);
        }
      }
    }
    return;
  }

  if (room.phase === 'waiting_info_manipulation' && room.infoManipulationState) {
    for (const pId of room.infoManipulationState.participants) {
      const p = room.players.find((x) => x.id === pId);
      if (p && p.isBot && room.infoManipulationState.playerChoices[pId] === undefined) {
        setTimeout(() => {
          if (room.phase !== 'waiting_info_manipulation' || !room.infoManipulationState) return;
          if (room.infoManipulationState.playerChoices[pId] !== undefined) return;
          if (p.hand.length > 0) {
            const nonCulprit = p.hand.filter((c) => c.type !== 'culprit');
            const cardToGive = nonCulprit.length > 0
              ? nonCulprit[Math.floor(Math.random() * nonCulprit.length)]
              : p.hand[0];
            handleInfoManipulationPick(room, pId, cardToGive.id);
          }
        }, 800 + Math.random() * 600);
      }
    }
    return;
  }

  const currentTurnPlayer = room.players[room.turnSeatIndex];
  if (!currentTurnPlayer || !currentTurnPlayer.isBot) return;

  if (room.phase === 'first_discoverer_turn') {
    scheduleRoomBotAction(room, () => {
      if (room.phase !== 'first_discoverer_turn') return;
      const incident = DEFAULT_INCIDENTS[Math.floor(Math.random() * DEFAULT_INCIDENTS.length)];
      handlePlayFirstDiscoverer(room, currentTurnPlayer.id, incident);
    }, 1200);
    return;
  }

  if (room.activeCardAction) {
    const act = room.activeCardAction;
    if (act.turnPlayerId === currentTurnPlayer.id) {
      scheduleRoomBotAction(room, () => {
        if (!room.activeCardAction || room.activeCardAction.turnPlayerId !== currentTurnPlayer.id) return;
        executeBotCardAction(room, currentTurnPlayer, act.cardType);
      }, 1100);
    }
    return;
  }

  if (room.phase === 'playing') {
    scheduleRoomBotAction(room, () => {
      if (room.phase !== 'playing' || room.players[room.turnSeatIndex]?.id !== currentTurnPlayer.id) return;
      executeBotPlayCard(room, currentTurnPlayer);
    }, 1000 + Math.random() * 400);
  }
}

function executeBotPlayCard(room: InternalRoom, bot: PlayerPrivate) {
  if (bot.hand.length === 0) {
    advanceTurn(room);
    return;
  }

  if (bot.hand.length === 1 && bot.hand[0].type === 'culprit') {
    handlePlayCard(room, bot.id, bot.hand[0].id);
    return;
  }

  const playableCards = bot.hand.filter((c) => {
    if (c.type === 'culprit') return false;
    if (c.type === 'detective' && room.round < 2) return false;
    return true;
  });

  if (playableCards.length === 0) {
    handlePlayCard(room, bot.id, bot.hand[0].id);
    return;
  }

  playableCards.sort((a, b) => {
    if (a.type === 'detective' && room.round >= 2) return -1;
    if (a.type === 'dog') return -1;
    if (a.type === 'trade') return 0;
    return Math.random() - 0.5;
  });

  const cardToPlay = playableCards[0];
  handlePlayCard(room, bot.id, cardToPlay.id);
}

function executeBotCardAction(room: InternalRoom, bot: PlayerPrivate, cardType: CardType) {
  // CRITICAL: Immediately clear activeCardAction so broadcastRoom cannot re-trigger executeBotCardAction!
  room.activeCardAction = null;

  const otherPlayers = room.players.filter((p) => p.id !== bot.id && p.hand.length > 0);
  if (otherPlayers.length === 0) {
    advanceTurn(room);
    return;
  }

  const randomTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];

  switch (cardType) {
    case 'detective':
      handleDetectiveAccusation(room, bot.id, randomTarget.id);
      break;
    case 'trade': {
      const nonCulprit = bot.hand.filter((c) => c.type !== 'culprit');
      const cardToGive = nonCulprit.length > 0 ? nonCulprit[0] : bot.hand[0];
      handleTradeOffer(room, bot.id, randomTarget.id, cardToGive.id);
      break;
    }
    case 'witness':
      handleWitnessAction(room, bot.id, randomTarget.id);
      scheduleRoomBotAction(room, () => {
        advanceTurn(room);
      }, 1600);
      break;
    case 'dog': {
      const targetCardIndex = Math.floor(Math.random() * randomTarget.hand.length);
      handleDogAction(room, bot.id, randomTarget.id, targetCardIndex);
      break;
    }
    case 'boy':
      scheduleRoomBotAction(room, () => {
        advanceTurn(room);
      }, 1500);
      break;
    default:
      advanceTurn(room);
      break;
  }
}

function handlePlayFirstDiscoverer(room: InternalRoom, playerId: string, customIncident?: string) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return;

  const cardIdx = player.hand.findIndex((c) => c.type === 'first_discoverer');
  if (cardIdx === -1) return;

  const [card] = player.hand.splice(cardIdx, 1);
  player.playedCards.push(card);
  room.discardPile.push(card);
  room.latestPlayedCard = { card, playerId: player.id, playerName: player.name };

  const incident = customIncident && customIncident.trim()
    ? customIncident.trim()
    : DEFAULT_INCIDENTS[Math.floor(Math.random() * DEFAULT_INCIDENTS.length)];
  room.incident = incident;

  room.latestMovement = {
    id: generateId('MOV_'),
    timestamp: Date.now(),
    effect: 'play',
    effectName: '第一発見者',
    transfers: [
      {
        fromId: player.id,
        fromName: player.name,
        toId: 'FIELD',
        toName: '場',
        card,
        isPublic: true,
      },
    ],
  };

  addLog(room, `${player.name}が第一発見者として名乗り出ました！`, 'incident');
  addLog(room, `【事件発生】「${incident}」`, 'incident');

  advanceTurn(room);
}

function handlePlayCard(room: InternalRoom, playerId: string, cardId: string) {
  if (room.phase !== 'playing') return;
  const currentTurnPlayer = room.players[room.turnSeatIndex];
  if (!currentTurnPlayer || currentTurnPlayer.id !== playerId) return;

  const cardIndex = currentTurnPlayer.hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return;

  const card = currentTurnPlayer.hand[cardIndex];

  if (card.type === 'culprit') {
    if (currentTurnPlayer.hand.length > 1) {
      sendToPlayer(playerId, {
        type: 'ERROR',
        message: '犯人カードは手札が最後の1枚になるまで出せません！',
      });
      return;
    }
    currentTurnPlayer.hand.splice(cardIndex, 1);
    currentTurnPlayer.playedCards.push(card);
    room.discardPile.push(card);
    room.latestPlayedCard = { card, playerId: currentTurnPlayer.id, playerName: currentTurnPlayer.name };
    room.latestMovement = {
      id: generateId('MOV_'),
      timestamp: Date.now(),
      effect: 'play',
      effectName: '犯人逃亡',
      transfers: [
        {
          fromId: currentTurnPlayer.id,
          fromName: currentTurnPlayer.name,
          toId: 'FIELD',
          toName: '場',
          card,
          isPublic: true,
        },
      ],
    };
    addLog(room, `${currentTurnPlayer.name}が最後の1枚として「犯人」を堂々と公開しました！`, 'victory');
    finishGame(room, 'culprit', `${currentTurnPlayer.name}が最後の1枚として犯人を出し、逃亡に成功しました！`);
    return;
  }

  if (card.type === 'detective' && room.round < 2) {
    sendToPlayer(playerId, {
      type: 'ERROR',
      message: '探偵カードは第2巡目以降からしか使えません！',
    });
    return;
  }

  currentTurnPlayer.hand.splice(cardIndex, 1);
  currentTurnPlayer.playedCards.push(card);
  room.discardPile.push(card);
  room.latestPlayedCard = { card, playerId: currentTurnPlayer.id, playerName: currentTurnPlayer.name };
  room.latestMovement = {
    id: generateId('MOV_'),
    timestamp: Date.now(),
    effect: 'play',
    effectName: '手札から場へ',
    transfers: [
      {
        fromId: currentTurnPlayer.id,
        fromName: currentTurnPlayer.name,
        toId: 'FIELD',
        toName: '場',
        card,
        isPublic: true,
      },
    ],
  };

  addLog(room, `${currentTurnPlayer.name}が「${card.name}」を出しました。`);

  switch (card.type) {
    case 'civilian':
      advanceTurn(room);
      break;

    case 'alibi':
      addLog(room, `アリバイが公開されました。（手札からの保護は失われました）`);
      advanceTurn(room);
      break;

    case 'conspiracy':
      room.accomplicePlayerIds.add(currentTurnPlayer.id);
      currentTurnPlayer.isAccomplice = true;
      addLog(room, `${currentTurnPlayer.name}は犯人の共犯者となりました！`, 'alert');
      advanceTurn(room);
      break;

    case 'boy': {
      room.boyNotifiedPlayerId = currentTurnPlayer.id;
      room.activeCardAction = {
        cardType: 'boy',
        turnPlayerId: currentTurnPlayer.id,
        actionType: 'boy',
      };
      addLog(room, `${currentTurnPlayer.name}は少年の直感で犯人カードの行方を感知しました...`);
      broadcastRoom(room);
      break;
    }

    case 'detective':
      room.activeCardAction = {
        cardType: 'detective',
        turnPlayerId: currentTurnPlayer.id,
        actionType: 'detective',
      };
      broadcastRoom(room);
      break;

    case 'trade': {
      if (currentTurnPlayer.hand.length === 0) {
        addLog(room, `${currentTurnPlayer.name}の手札が0枚のため、取り引きは何も起きませんでした。`, 'system');
        advanceTurn(room);
        break;
      }
      const opponentsWithCards = room.players.filter(
        (p) => p.id !== currentTurnPlayer.id && p.hand.length > 0
      );
      if (opponentsWithCards.length === 0) {
        addLog(room, `相手プレイヤーの手札が0枚のため、取り引きは何も起きませんでした。`, 'system');
        advanceTurn(room);
        break;
      }
      room.activeCardAction = {
        cardType: 'trade',
        turnPlayerId: currentTurnPlayer.id,
        actionType: 'trade',
      };
      broadcastRoom(room);
      break;
    }

    case 'witness':
      room.activeCardAction = {
        cardType: 'witness',
        turnPlayerId: currentTurnPlayer.id,
        actionType: 'witness',
      };
      broadcastRoom(room);
      break;

    case 'dog':
      room.activeCardAction = {
        cardType: 'dog',
        turnPlayerId: currentTurnPlayer.id,
        actionType: 'dog',
      };
      broadcastRoom(room);
      break;

    case 'rumor': {
      room.phase = 'waiting_rumor';
      const N = room.players.length;
      const participants: string[] = [];
      for (let i = 0; i < N; i++) {
        const p = room.players[i];
        const rightNeighbor = room.players[(i - 1 + N) % N];
        if (rightNeighbor.hand.length > 0) {
          participants.push(p.id);
        }
      }

      if (participants.length === 0) {
        addLog(room, `【うわさ】引くことができる手札がないため、何も起きませんでした。`, 'system');
        advanceTurn(room);
        break;
      }

      room.rumorState = {
        participants,
        playerChoices: {},
      };
      addLog(room, `【うわさ】全員が右隣のプレイヤーの手札から1枚引きます！`, 'alert');
      broadcastRoom(room);
      break;
    }

    case 'info_manipulation': {
      room.phase = 'waiting_info_manipulation';
      const participants = room.players.filter((p) => p.hand.length > 0).map((p) => p.id);

      if (participants.length === 0) {
        addLog(room, `【情報操作】渡すことができる手札がないため、何も起きませんでした。`, 'system');
        advanceTurn(room);
        break;
      }

      room.infoManipulationState = {
        participants,
        playerChoices: {},
      };
      addLog(room, `【情報操作】全員が自分の手札から1枚選んで左隣へ渡します！`, 'alert');
      broadcastRoom(room);
      break;
    }

    default:
      advanceTurn(room);
      break;
  }
}

function handleDetectiveAccusation(room: InternalRoom, turnPlayerId: string, targetPlayerId: string) {
  const turnPlayer = room.players.find((p) => p.id === turnPlayerId);
  const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
  if (!turnPlayer || !targetPlayer) return;

  addLog(room, `${turnPlayer.name}が${targetPlayer.name}を犯人として告発しました！`, 'alert');

  const hasCulprit = targetPlayer.hand.some((c) => c.type === 'culprit');
  const hasAlibi = targetPlayer.hand.some((c) => c.type === 'alibi');

  if (hasCulprit && !hasAlibi) {
    finishGame(
      room,
      'detective',
      `探偵【${turnPlayer.name}】が犯人【${targetPlayer.name}】の特定に成功しました！`,
      [turnPlayer.id]
    );
  } else {
    if (hasCulprit && hasAlibi) {
      addLog(room, `${targetPlayer.name}「私にはアリバイがあります！」（告発失敗）`, 'system');
    } else {
      addLog(room, `${targetPlayer.name}は犯人ではありませんでした！（シロでした）`, 'system');
    }
    advanceTurn(room);
  }
}

function handleTradeOffer(room: InternalRoom, fromPlayerId: string, toPlayerId: string, cardId: string) {
  const fromPlayer = room.players.find((p) => p.id === fromPlayerId);
  const toPlayer = room.players.find((p) => p.id === toPlayerId);
  if (!fromPlayer || !toPlayer) return;

  if (fromPlayer.hand.length === 0 || toPlayer.hand.length === 0) {
    addLog(room, `手札がないため、取り引きは何も起きませんでした。`, 'system');
    advanceTurn(room);
    return;
  }

  const card = fromPlayer.hand.find((c) => c.id === cardId);
  if (!card) return;

  room.phase = 'waiting_trade';
  room.activeCardAction = null;
  room.tradeState = {
    fromPlayerId,
    toPlayerId,
    offeredCard: card,
    completed: false,
  };

  addLog(room, `${fromPlayer.name}が${toPlayer.name}に取り引きを持ちかけました。`);
  broadcastRoom(room);
}

function executeTradeComplete(room: InternalRoom, toPlayerCardId: string) {
  if (!room.tradeState || room.tradeState.completed) return;
  const { fromPlayerId, toPlayerId, offeredCard } = room.tradeState;
  const fromPlayer = room.players.find((p) => p.id === fromPlayerId);
  const toPlayer = room.players.find((p) => p.id === toPlayerId);

  if (!fromPlayer || !toPlayer || !offeredCard) return;

  const targetCardIdx = toPlayer.hand.findIndex((c) => c.id === toPlayerCardId);
  if (targetCardIdx === -1) return;

  const [receivedCard] = toPlayer.hand.splice(targetCardIdx, 1);
  const offeredCardIdx = fromPlayer.hand.findIndex((c) => c.id === offeredCard.id);
  if (offeredCardIdx === -1) return;

  fromPlayer.hand.splice(offeredCardIdx, 1);

  fromPlayer.hand.push(receivedCard);
  toPlayer.hand.push(offeredCard);

  room.tradeState.completed = true;
  room.tradeState = null;
  room.phase = 'playing';

  room.latestMovement = {
    id: generateId('MOV_'),
    timestamp: Date.now(),
    effect: 'trade',
    effectName: '取り引き',
    transfers: [
      { fromId: fromPlayer.id, fromName: fromPlayer.name, toId: toPlayer.id, toName: toPlayer.name, card: offeredCard },
      { fromId: toPlayer.id, fromName: toPlayer.name, toId: fromPlayer.id, toName: fromPlayer.name, card: receivedCard },
    ],
  };

  addLog(room, `【取り引き】${fromPlayer.name}と${toPlayer.name}の間でカードが1枚ずつ秘密裏に交換されました。`, 'play');
  advanceTurn(room);
}

function handleWitnessAction(room: InternalRoom, turnPlayerId: string, targetPlayerId: string) {
  room.activeCardAction = null;
  const turnPlayer = room.players.find((p) => p.id === turnPlayerId);
  const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
  if (!turnPlayer || !targetPlayer) return;

  room.witnessInfo = {
    turnPlayerId,
    targetId: targetPlayer.id,
    targetName: targetPlayer.name,
    cards: [...targetPlayer.hand],
  };

  addLog(room, `${turnPlayer.name}が${targetPlayer.name}の手札を目撃しました！`);
  broadcastRoom(room);
}

function handleDogAction(room: InternalRoom, turnPlayerId: string, targetPlayerId: string, cardIndex: number) {
  room.activeCardAction = null;
  const turnPlayer = room.players.find((p) => p.id === turnPlayerId);
  const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
  if (!turnPlayer || !targetPlayer) return;

  if (cardIndex < 0 || cardIndex >= targetPlayer.hand.length) {
    cardIndex = 0;
  }

  const chosenCard = targetPlayer.hand[cardIndex];
  if (!chosenCard) return;

  const isCulprit = chosenCard.type === 'culprit';

  room.revealedDogCard = {
    card: chosenCard,
    targetName: targetPlayer.name,
    isCulprit,
  };

  room.latestMovement = {
    id: generateId('MOV_'),
    timestamp: Date.now(),
    effect: 'dog',
    effectName: 'いぬ',
    transfers: [
      { fromId: targetPlayer.id, fromName: targetPlayer.name, toId: turnPlayer.id, toName: turnPlayer.name, card: chosenCard, isPublic: true },
    ],
  };

  addLog(
    room,
    `いぬが${targetPlayer.name}の手札から1枚を嗅ぎ当てました！「${chosenCard.name}」！`,
    isCulprit ? 'victory' : 'play'
  );

  if (isCulprit) {
    finishGame(
      room,
      'dog',
      `いぬ【${turnPlayer.name}】が${targetPlayer.name}の手札から見事「犯人」を引き当てました！`,
      [turnPlayer.id]
    );
  } else {
    broadcastRoom(room);
    scheduleRoomBotAction(room, () => {
      advanceTurn(room);
    }, 2000);
  }
}

function handleRumorPick(room: InternalRoom, playerId: string, chosenIndex: number) {
  if (room.phase !== 'waiting_rumor' || !room.rumorState) return;
  if (room.rumorState.playerChoices[playerId] !== undefined) return;

  room.rumorState.playerChoices[playerId] = chosenIndex;
  broadcastRoom(room);

  const allSubmitted = room.rumorState.participants.every(
    (pId) => room.rumorState!.playerChoices[pId] !== undefined
  );

  if (allSubmitted) {
    executeSimultaneousRumor(room);
  }
}

function executeSimultaneousRumor(room: InternalRoom) {
  if (!room.rumorState) return;
  const N = room.players.length;

  const handSnapshots: Record<string, Card[]> = {};
  for (const p of room.players) {
    handSnapshots[p.id] = [...p.hand];
  }

  const cardsDrawnBy: Record<string, Card> = {};

  for (let i = 0; i < N; i++) {
    const p = room.players[i];
    const rightNeighbor = room.players[(i - 1 + N) % N];
    if (rightNeighbor.hand.length > 0) {
      const chosenIdx = room.rumorState.playerChoices[p.id] ?? 0;
      const targetSnapshot = handSnapshots[rightNeighbor.id];
      if (targetSnapshot && targetSnapshot.length > 0) {
        const safeIdx = Math.min(Math.max(0, chosenIdx), targetSnapshot.length - 1);
        cardsDrawnBy[p.id] = targetSnapshot[safeIdx];
      }
    }
  }

  const transfers: RawCardTransfer[] = [];

  // Remove cards that were drawn by left neighbors
  for (let i = 0; i < N; i++) {
    const p = room.players[i];
    const leftNeighbor = room.players[(i + 1) % N];
    const cardLost = cardsDrawnBy[leftNeighbor.id];
    if (cardLost) {
      const idxToRemove = p.hand.findIndex((c) => c.id === cardLost.id);
      if (idxToRemove !== -1) {
        p.hand.splice(idxToRemove, 1);
      }
    }
  }

  // Add cards drawn by players from their right neighbors
  for (let i = 0; i < N; i++) {
    const p = room.players[i];
    const rightNeighbor = room.players[(i - 1 + N) % N];
    const cardGained = cardsDrawnBy[p.id];
    if (cardGained) {
      p.hand.push(cardGained);
      transfers.push({
        fromId: rightNeighbor.id,
        fromName: rightNeighbor.name,
        toId: p.id,
        toName: p.name,
        card: cardGained,
      });
    }
  }

  room.phase = 'playing';
  room.rumorState = null;
  room.latestMovement = {
    id: generateId('MOV_'),
    timestamp: Date.now(),
    effect: 'rumor',
    effectName: 'うわさ',
    transfers,
  };
  addLog(room, `【うわさ】右隣のプレイヤーの手札からカードが移動しました。`, 'alert');
  advanceTurn(room);
}

function handleInfoManipulationPick(room: InternalRoom, playerId: string, cardId: string) {
  if (room.phase !== 'waiting_info_manipulation' || !room.infoManipulationState) return;
  if (room.infoManipulationState.playerChoices[playerId] !== undefined) return;

  room.infoManipulationState.playerChoices[playerId] = cardId;
  broadcastRoom(room);

  const allSubmitted = room.infoManipulationState.participants.every(
    (pId) => room.infoManipulationState!.playerChoices[pId] !== undefined
  );

  if (allSubmitted) {
    executeSimultaneousInfoManipulation(room);
  }
}

function executeSimultaneousInfoManipulation(room: InternalRoom) {
  if (!room.infoManipulationState) return;
  const N = room.players.length;

  const passedCards: Record<string, Card> = {};

  for (const p of room.players) {
    if (p.hand.length > 0) {
      const chosenCardId = room.infoManipulationState.playerChoices[p.id];
      const card = p.hand.find((c) => c.id === chosenCardId) || p.hand[0];
      if (card) {
        passedCards[p.id] = card;
      }
    }
  }

  const transfers: RawCardTransfer[] = [];

  // Remove passed cards from players who gave
  for (const p of room.players) {
    const cardToGive = passedCards[p.id];
    if (cardToGive) {
      const idxToRemove = p.hand.findIndex((c) => c.id === cardToGive.id);
      if (idxToRemove !== -1) {
        p.hand.splice(idxToRemove, 1);
      }
    }
  }

  // Add cards passed from right neighbors
  for (let i = 0; i < N; i++) {
    const p = room.players[i];
    const rightNeighbor = room.players[(i - 1 + N) % N];
    const cardToReceive = passedCards[rightNeighbor.id];
    if (cardToReceive) {
      p.hand.push(cardToReceive);
      transfers.push({
        fromId: rightNeighbor.id,
        fromName: rightNeighbor.name,
        toId: p.id,
        toName: p.name,
        card: cardToReceive,
      });
    }
  }

  room.phase = 'playing';
  room.infoManipulationState = null;
  room.latestMovement = {
    id: generateId('MOV_'),
    timestamp: Date.now(),
    effect: 'info_manipulation',
    effectName: '情報操作',
    transfers,
  };
  addLog(room, `【情報操作】全員が左隣のプレイヤーへカードを渡しました。`, 'alert');
  advanceTurn(room);
}

function resetRoomToLobby(room: InternalRoom) {
  clearRoomBotTimer(room);
  room.phase = 'lobby';
  room.deck = [];
  room.discardPile = [];
  room.incident = '';
  room.round = 1;
  room.turnSeatIndex = 0;
  room.turnsCompletedInRound = 0;
  room.accomplicePlayerIds.clear();
  room.result = null;
  room.latestPlayedCard = null;
  room.activeCardAction = null;
  room.tradeState = null;
  room.rumorState = null;
  room.infoManipulationState = null;
  room.witnessInfo = null;
  room.boyNotifiedPlayerId = null;
  room.revealedDogCard = null;
  room.latestMovement = null;

  for (const player of room.players) {
    player.hand = [];
    player.playedCards = [];
    player.isAccomplice = false;
  }

  pruneDisconnectedLobbyPlayers(room);
  syncRoomHost(room);

  addLog(room, 'ロビーに戻りました。席順変更や参加者の調整ができます。', 'system');
  broadcastRoom(room);
}

function startGame(room: InternalRoom) {
  clearRoomBotTimer(room);
  // Prune any disconnected players in lobby before starting game
  pruneDisconnectedLobbyPlayers(room);
  syncRoomHost(room);

  const activeConnectedPlayers = room.players.filter((p) => p.isBot || p.connected);
  if (activeConnectedPlayers.length < 3 || activeConnectedPlayers.length > 8) {
    addLog(room, `接続中のプレイ人数は3人〜8人である必要があります。（現在${activeConnectedPlayers.length}人）`, 'alert');
    broadcastRoom(room);
    return;
  }

  const deck = buildDeckForPlayerCount(room.players.length);
  room.deck = deck;
  room.discardPile = [];
  room.latestPlayedCard = null;
  room.latestMovement = null;
  room.round = 1;
  room.turnsCompletedInRound = 0;
  room.accomplicePlayerIds.clear();
  room.result = null;
  room.activeCardAction = null;
  room.witnessInfo = null;
  room.boyNotifiedPlayerId = null;
  room.revealedDogCard = null;
  room.tradeState = null;
  room.rumorState = null;
  room.infoManipulationState = null;

  for (const player of room.players) {
    player.hand = [];
    player.playedCards = [];
    player.isAccomplice = false;
    for (let i = 0; i < 4; i++) {
      if (deck.length > 0) {
        player.hand.push(deck.pop()!);
      }
    }
  }

  const firstDiscovererIndex = room.players.findIndex((p) =>
    p.hand.some((c) => c.type === 'first_discoverer')
  );

  if (firstDiscovererIndex === -1) {
    room.turnSeatIndex = 0;
  } else {
    room.turnSeatIndex = firstDiscovererIndex;
  }

  const startPlayer = room.players[room.turnSeatIndex];
  room.phase = 'first_discoverer_turn';

  addLog(room, `==== ゲームが開始されました（${room.players.length}人対戦）====`, 'system');
  addLog(
    room,
    `【第一発見者】${startPlayer.name}が第一発見者カードを持っています。事件を発表してください！`,
    'alert'
  );

  broadcastRoom(room);
}

// ==================== HTTP & WebSocket App Setup ====================
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

app.get('/api/matches', (_req, res) => {
  res.json({ matches: matchHistory });
});

app.get('/api/health', (_req, res) => {
  const totalPlayers = Array.from(rooms.values()).reduce((sum, r) => sum + r.players.length, 0);
  res.json({ status: 'ok', activeRoomsCount: rooms.size, totalPlayersCount: totalPlayers });
});

app.get('/api/rooms', (_req, res) => {
  const activeRooms = Array.from(rooms.values())
    .map((r) => ({
      id: r.id,
      playerCount: r.players.length,
      phase: r.phase,
      round: r.round,
    }))
    .sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
  res.json({ rooms: activeRooms });
});

// Endpoint to generate and download a pristine, complete ZIP file of the repository
app.get('/api/download-zip', (_req, res) => {
  try {
    const pythonCode = `
import zipfile, os, sys, io
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'dist', '.git', '.aistudio', '.cache', '__pycache__')]
        for f in files:
            if f.endswith('.zip') or f == '.env':
                continue
            path = os.path.join(root, f)
            arcname = os.path.relpath(path, '.')
            z.write(path, arcname)
sys.stdout.buffer.write(buf.getvalue())
`;
    const zipBuffer = execSync('python3', { input: pythonCode, maxBuffer: 60 * 1024 * 1024 });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="odoru-hannin.zip"');
    res.setHeader('Content-Length', zipBuffer.length.toString());
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('ZIP generation error:', err);
    res.status(500).json({ error: 'Failed to generate zip' });
  }
});

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  boundPlayerId?: string;
  boundRoomId?: string;
}

// Keep-alive heartbeat every 20 seconds to prevent proxies (e.g. Render, Cloud Run) from terminating idle connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as ExtWebSocket;
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      // ignore
    }
  });
}, 20000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

wss.on('connection', (rawWs: WebSocket) => {
  const ws = rawWs as ExtWebSocket;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (messageRaw: string) => {
    ws.isAlive = true;
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type } = data;

      // Keepalive PING from client
      if (type === 'PING') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
        return;
      }

      // Room resolution
      const pId = data.playerId || ws.boundPlayerId;
      const targetRoomId = normalizeRoomId(
        data.roomId || (pId ? playerRooms.get(pId) : null) || ws.boundRoomId || '01'
      );
      const room = getOrCreateRoom(targetRoomId);

      switch (type) {
        case 'JOIN_GAME': {
          const { playerId, playerName, roomId } = data;
          const assignedPlayerId = playerId || generateId('P_');
          const roomToJoin = normalizeRoomId(roomId || targetRoomId);
          const currentRoom = getOrCreateRoom(roomToJoin);

          ws.boundPlayerId = assignedPlayerId;
          ws.boundRoomId = roomToJoin;
          sockets.set(assignedPlayerId, ws);
          playerRooms.set(assignedPlayerId, roomToJoin);

          // If room is in lobby, prune any stale ghost players whose sockets have closed
          if (currentRoom.phase === 'lobby') {
            pruneDisconnectedLobbyPlayers(currentRoom);
          }

          // Check if already in this room (reconnection!)
          const existingPlayer = currentRoom.players.find((p) => p.id === assignedPlayerId);
          if (existingPlayer) {
            existingPlayer.connected = true;
            if (playerName && playerName.trim()) {
              existingPlayer.name = playerName.trim();
            }
            syncRoomHost(currentRoom);
            addLog(currentRoom, `${existingPlayer.name}が再接続しました。`, 'system');
            broadcastRoom(currentRoom);
            return;
          }

          // If room is in lobby, join as participant
          if (currentRoom.phase === 'lobby') {
            if (currentRoom.players.length >= 8) {
              ws.send(
                JSON.stringify({
                  type: 'ERROR',
                  message: `部屋【${roomToJoin}】は定員（最大8名）に達しています。`,
                })
              );
              return;
            }

            const isFirst = currentRoom.players.length === 0;
            if (isFirst || !currentRoom.hostPlayerId) {
              currentRoom.hostPlayerId = assignedPlayerId;
            }

            const newPlayer: PlayerPrivate = {
              id: assignedPlayerId,
              name: playerName || `探偵${currentRoom.players.length + 1}`,
              isHost: assignedPlayerId === currentRoom.hostPlayerId,
              isBot: false,
              connected: true,
              seatIndex: currentRoom.players.length,
              hand: [],
              handCount: 0,
              playedCards: [],
              isAccomplice: false,
            };

            currentRoom.players.push(newPlayer);
            syncRoomHost(currentRoom);
            addLog(currentRoom, `${newPlayer.name}が部屋【${currentRoom.id}】に参加しました。`, 'system');
            broadcastRoom(currentRoom);
            return;
          }

          // If game is in progress in this room, send view state
          const state = getSanitizedStateForPlayer(currentRoom, assignedPlayerId);
          ws.send(JSON.stringify({ type: 'ROOM_UPDATE', state }));
          break;
        }

        case 'SWITCH_ROOM': {
          const { playerId, targetRoomId, playerName } = data;
          const assignedId = playerId || ws.boundPlayerId;
          if (!assignedId) return;

          const oldRoomId = playerRooms.get(assignedId);
          const newRoomId = normalizeRoomId(targetRoomId);

          if (oldRoomId && oldRoomId !== newRoomId) {
            const oldRoom = rooms.get(oldRoomId);
            if (oldRoom) {
              if (oldRoom.phase === 'lobby') {
                const idx = oldRoom.players.findIndex((p) => p.id === assignedId);
                if (idx !== -1) {
                  const removed = oldRoom.players.splice(idx, 1)[0];
                  oldRoom.players.forEach((p, i) => { p.seatIndex = i; });
                  syncRoomHost(oldRoom);
                  addLog(oldRoom, `${removed.name}が退出しました。`, 'system');
                  broadcastRoom(oldRoom);
                }
              } else {
                const player = oldRoom.players.find((p) => p.id === assignedId);
                if (player) {
                  player.connected = false;
                  broadcastRoom(oldRoom);
                }
              }
            }
          }

          playerRooms.set(assignedId, newRoomId);
          ws.boundRoomId = newRoomId;

          const newRoom = getOrCreateRoom(newRoomId);
          if (newRoom.phase === 'lobby') {
            pruneDisconnectedLobbyPlayers(newRoom);
          }

          const existing = newRoom.players.find((p) => p.id === assignedId);
          if (existing) {
            existing.connected = true;
            if (playerName && playerName.trim()) {
              existing.name = playerName.trim();
            }
            syncRoomHost(newRoom);
            addLog(newRoom, `${existing.name}が再接続しました。`, 'system');
            broadcastRoom(newRoom);
            return;
          }

          if (newRoom.phase === 'lobby') {
            if (newRoom.players.length < 8) {
              const isFirst = newRoom.players.length === 0;
              if (isFirst || !newRoom.hostPlayerId) {
                newRoom.hostPlayerId = assignedId;
              }
              const newPlayer: PlayerPrivate = {
                id: assignedId,
                name: playerName || `探偵${newRoom.players.length + 1}`,
                isHost: assignedId === newRoom.hostPlayerId,
                isBot: false,
                connected: true,
                seatIndex: newRoom.players.length,
                hand: [],
                handCount: 0,
                playedCards: [],
                isAccomplice: false,
              };
              newRoom.players.push(newPlayer);
              syncRoomHost(newRoom);
              addLog(newRoom, `${newPlayer.name}が部屋【${newRoom.id}】に参加しました。`, 'system');
              broadcastRoom(newRoom);
              return;
            } else {
              ws.send(JSON.stringify({ type: 'ERROR', message: `部屋【${newRoomId}】は定員に達しています。` }));
            }
          }

          const state = getSanitizedStateForPlayer(newRoom, assignedId);
          ws.send(JSON.stringify({ type: 'ROOM_UPDATE', state }));
          break;
        }

        case 'KICK_DISCONNECTED': {
          const { targetPlayerId } = data;
          if (room.phase !== 'lobby') return;
          if (targetPlayerId === 'all') {
            const beforeCount = room.players.length;
            room.players = room.players.filter((p) => p.isBot || p.connected);
            if (room.players.length !== beforeCount) {
              room.players.forEach((p, i) => { p.seatIndex = i; });
              syncRoomHost(room);
              addLog(room, '切断中のプレイヤーをロビーから一括退出させました。', 'system');
              broadcastRoom(room);
            }
            return;
          }
          const idx = room.players.findIndex((p) => p.id === targetPlayerId);
          if (idx !== -1 && !room.players[idx].connected && !room.players[idx].isBot) {
            const removed = room.players.splice(idx, 1)[0];
            room.players.forEach((p, i) => { p.seatIndex = i; });
            syncRoomHost(room);
            addLog(room, `切断中の${removed.name}をロビーから整理しました。`, 'system');
            broadcastRoom(room);
          }
          break;
        }

        case 'UPDATE_NAME': {
          const { playerId, playerName } = data;
          const p = room.players.find((x) => x.id === playerId);
          if (p && playerName && playerName.trim()) {
            p.name = playerName.trim();
            broadcastRoom(room);
          }
          break;
        }

        case 'SHUFFLE_PLAYERS': {
          if (room.phase !== 'lobby') return;
          for (let i = room.players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [room.players[i], room.players[j]] = [room.players[j], room.players[i]];
          }
          room.players.forEach((p, idx) => {
            p.seatIndex = idx;
          });
          addLog(room, 'プレイヤーの席順がシャッフルされました！', 'system');
          broadcastRoom(room);
          break;
        }

        case 'ADD_BOT': {
          if (room.phase !== 'lobby') return;
          if (room.players.length >= 8) {
            ws.send(JSON.stringify({ type: 'ERROR', message: '最大8人までです。' }));
            return;
          }

          const botId = generateId('BOT_');
          const botName = BOT_NAMES[(room.players.length - 1) % BOT_NAMES.length];

          const botPlayer: PlayerPrivate = {
            id: botId,
            name: botName,
            isHost: false,
            isBot: true,
            connected: true,
            seatIndex: room.players.length,
            hand: [],
            handCount: 0,
            playedCards: [],
            isAccomplice: false,
          };

          room.players.push(botPlayer);
          addLog(room, `${botName}が参加しました。`, 'system');
          broadcastRoom(room);
          break;
        }

        case 'REMOVE_BOT': {
          const { botId } = data;
          if (room.phase !== 'lobby') return;

          const idx = room.players.findIndex((p) => p.id === botId && p.isBot);
          if (idx !== -1) {
            const removed = room.players.splice(idx, 1)[0];
            room.players.forEach((p, i) => {
              p.seatIndex = i;
            });
            addLog(room, `${removed.name}が退出しました。`, 'system');
            broadcastRoom(room);
          }
          break;
        }

        case 'START_GAME': {
          startGame(room);
          break;
        }

        case 'PLAY_FIRST_DISCOVERER': {
          const { playerId, incident } = data;
          handlePlayFirstDiscoverer(room, playerId, incident);
          break;
        }

        case 'PLAY_CARD': {
          const { playerId, cardId } = data;
          handlePlayCard(room, playerId, cardId);
          break;
        }

        case 'ACTION_DETECTIVE': {
          const { playerId, targetPlayerId } = data;
          handleDetectiveAccusation(room, playerId, targetPlayerId);
          break;
        }

        case 'ACTION_TRADE_OFFER': {
          const { playerId, targetPlayerId, cardId } = data;
          handleTradeOffer(room, playerId, targetPlayerId, cardId);
          break;
        }

        case 'ACTION_TRADE_ACCEPT': {
          const { cardId } = data;
          executeTradeComplete(room, cardId);
          break;
        }

        case 'ACTION_WITNESS': {
          const { playerId, targetPlayerId } = data;
          handleWitnessAction(room, playerId, targetPlayerId);
          break;
        }

        case 'ACTION_WITNESS_DONE': {
          advanceTurn(room);
          break;
        }

        case 'ACTION_DOG': {
          const { playerId, targetPlayerId, cardIndex } = data;
          handleDogAction(room, playerId, targetPlayerId, cardIndex);
          break;
        }

        case 'ACTION_BOY_DONE': {
          advanceTurn(room);
          break;
        }

        case 'ACTION_RUMOR_PICK': {
          const { playerId, cardIndex } = data;
          handleRumorPick(room, playerId, cardIndex);
          break;
        }

        case 'ACTION_INFO_MANIPULATION_PICK': {
          const { playerId, cardId } = data;
          handleInfoManipulationPick(room, playerId, cardId);
          break;
        }

        case 'RESET_ROOM':
        case 'RESTART_GAME': {
          resetRoomToLobby(room);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    const boundId = ws.boundPlayerId;
    if (!boundId) return;

    // CRITICAL: Check if a newer socket has already replaced this one for the player!
    if (sockets.get(boundId) !== ws) {
      return;
    }

    sockets.delete(boundId);

    const assignedRoomId = playerRooms.get(boundId) || ws.boundRoomId;
    if (assignedRoomId) {
      const room = rooms.get(assignedRoomId);
      if (room) {
        const player = room.players.find((p) => p.id === boundId);
        if (player) {
          player.connected = false;

          if (room.phase === 'lobby') {
            syncRoomHost(room);
            broadcastRoom(room);

            // 6-second grace timer for lobby: if not reconnected, auto-remove from lobby
            setTimeout(() => {
              if (room.phase === 'lobby') {
                const cur = room.players.find((p) => p.id === boundId);
                if (cur && !cur.connected) {
                  const idx = room.players.findIndex((p) => p.id === boundId);
                  if (idx !== -1) {
                    const removed = room.players.splice(idx, 1)[0];
                    room.players.forEach((p, i) => { p.seatIndex = i; });
                    syncRoomHost(room);
                    addLog(room, `${removed.name}がロビーから退出しました。`, 'system');
                    broadcastRoom(room);
                  }
                }
              }
            }, 6000);
          } else {
            addLog(room, `${player.name}が一時切断中（再接続待機）`, 'system');
            broadcastRoom(room);
          }
        }
      }
    }
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
