import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';
import {
  Card,
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
}

const SHARED_ROOM_ID = 'SHARED';

function createSharedRoom(): InternalRoom {
  return {
    id: SHARED_ROOM_ID,
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
  };
}

const sharedRoom: InternalRoom = createSharedRoom();
const sockets = new Map<string, WebSocket>();
const matchHistory: MatchRecord[] = [];

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
    const alivePlayers = room.players.filter((p) => p.hand.length > 0);
    const myIdx = alivePlayers.findIndex((p) => p.id === playerId);
    if (myIdx !== -1) {
      const rightIdx = (myIdx - 1 + alivePlayers.length) % alivePlayers.length;
      const rightNeighbor = alivePlayers[rightIdx];
      secretInfo = {
        ...(secretInfo || {}),
        rumorWaitPrompt: {
          rightNeighborId: rightNeighbor.id,
          rightNeighborName: rightNeighbor.name,
          rightNeighborCardCount: rightNeighbor.hand.length,
        },
      };
    }
  }

  if (room.phase === 'waiting_info_manipulation' && room.infoManipulationState) {
    secretInfo = {
      ...(secretInfo || {}),
      infoManipulationPrompt: true,
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
  };
}

function broadcastRoom() {
  for (const player of sharedRoom.players) {
    if (player.isBot) continue;
    const ws = sockets.get(player.id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const state = getSanitizedStateForPlayer(sharedRoom, player.id);
      ws.send(JSON.stringify({ type: 'ROOM_UPDATE', state }));
    }
  }

  for (const [pId, ws] of sockets.entries()) {
    if (!sharedRoom.players.some((p) => p.id === pId) && ws.readyState === WebSocket.OPEN) {
      const state = getSanitizedStateForPlayer(sharedRoom, pId);
      ws.send(JSON.stringify({ type: 'ROOM_UPDATE', state }));
    }
  }

  handleBotTurn(sharedRoom);
}

function sendToPlayer(playerId: string, msg: any) {
  const ws = sockets.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function advanceTurn(room: InternalRoom) {
  if (room.phase === 'game_over') return;

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

  if (room.turnsCompletedInRound >= room.players.length) {
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
  broadcastRoom();
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
    roomId: 'SHARED',
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

  broadcastRoom();
}

function handleBotTurn(room: InternalRoom) {
  if (room.phase === 'game_over' || room.phase === 'lobby') return;

  if (room.phase === 'waiting_trade' && room.tradeState && !room.tradeState.completed) {
    const targetPlayer = room.players.find((p) => p.id === room.tradeState!.toPlayerId);
    if (targetPlayer && targetPlayer.isBot) {
      setTimeout(() => {
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
        setTimeout(() => {
          if (room.phase !== 'waiting_rumor' || !room.rumorState) return;
          const alivePlayers = room.players.filter((x) => x.hand.length > 0);
          const myIdx = alivePlayers.findIndex((x) => x.id === pId);
          const rightIdx = (myIdx - 1 + alivePlayers.length) % alivePlayers.length;
          const rightNeighbor = alivePlayers[rightIdx];
          const chosenIndex = Math.floor(Math.random() * rightNeighbor.hand.length);
          handleRumorPick(room, pId, chosenIndex);
        }, 800 + Math.random() * 500);
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
          const nonCulprit = p.hand.filter((c) => c.type !== 'culprit');
          const cardToGive = nonCulprit.length > 0
            ? nonCulprit[Math.floor(Math.random() * nonCulprit.length)]
            : p.hand[0];
          handleInfoManipulationPick(room, pId, cardToGive.id);
        }, 800 + Math.random() * 600);
      }
    }
    return;
  }

  const currentTurnPlayer = room.players[room.turnSeatIndex];
  if (!currentTurnPlayer || !currentTurnPlayer.isBot) return;

  if (room.phase === 'first_discoverer_turn') {
    setTimeout(() => {
      if (room.phase !== 'first_discoverer_turn') return;
      const incident = DEFAULT_INCIDENTS[Math.floor(Math.random() * DEFAULT_INCIDENTS.length)];
      handlePlayFirstDiscoverer(room, currentTurnPlayer.id, incident);
    }, 1200);
    return;
  }

  if (room.activeCardAction) {
    const act = room.activeCardAction;
    if (act.turnPlayerId === currentTurnPlayer.id) {
      setTimeout(() => {
        executeBotCardAction(room, currentTurnPlayer, act.cardType);
      }, 1100);
    }
    return;
  }

  if (room.phase === 'playing') {
    setTimeout(() => {
      if (room.phase !== 'playing' || room.players[room.turnSeatIndex]?.id !== currentTurnPlayer.id) return;
      executeBotPlayCard(room, currentTurnPlayer);
    }, 1000 + Math.random() * 500);
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
      setTimeout(() => advanceTurn(room), 1500);
      break;
    case 'dog': {
      const targetCardIndex = Math.floor(Math.random() * randomTarget.hand.length);
      handleDogAction(room, bot.id, randomTarget.id, targetCardIndex);
      break;
    }
    case 'boy':
      setTimeout(() => advanceTurn(room), 1500);
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
      broadcastRoom();
      break;
    }

    case 'detective':
      room.activeCardAction = {
        cardType: 'detective',
        turnPlayerId: currentTurnPlayer.id,
        actionType: 'detective',
      };
      broadcastRoom();
      break;

    case 'trade':
      room.activeCardAction = {
        cardType: 'trade',
        turnPlayerId: currentTurnPlayer.id,
        actionType: 'trade',
      };
      broadcastRoom();
      break;

    case 'witness':
      room.activeCardAction = {
        cardType: 'witness',
        turnPlayerId: currentTurnPlayer.id,
        actionType: 'witness',
      };
      broadcastRoom();
      break;

    case 'dog':
      room.activeCardAction = {
        cardType: 'dog',
        turnPlayerId: currentTurnPlayer.id,
        actionType: 'dog',
      };
      broadcastRoom();
      break;

    case 'rumor': {
      room.phase = 'waiting_rumor';
      const participants = room.players.filter((p) => p.hand.length > 0).map((p) => p.id);
      room.rumorState = {
        participants,
        playerChoices: {},
      };
      addLog(room, `【うわさ】全員が右隣のプレイヤーの手札から1枚引きます！`, 'alert');
      broadcastRoom();
      break;
    }

    case 'info_manipulation': {
      room.phase = 'waiting_info_manipulation';
      const participants = room.players.filter((p) => p.hand.length > 0).map((p) => p.id);
      room.infoManipulationState = {
        participants,
        playerChoices: {},
      };
      addLog(room, `【情報操作】全員が自分の手札から1枚選んで左隣へ渡します！`, 'alert');
      broadcastRoom();
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
  broadcastRoom();
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

  addLog(room, `${fromPlayer.name}と${toPlayer.name}の間で秘密裏に取り引きが成立しました。`);
  advanceTurn(room);
}

function handleWitnessAction(room: InternalRoom, turnPlayerId: string, targetPlayerId: string) {
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
  broadcastRoom();
}

function handleDogAction(room: InternalRoom, turnPlayerId: string, targetPlayerId: string, cardIndex: number) {
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
    broadcastRoom();
    setTimeout(() => {
      advanceTurn(room);
    }, 2000);
  }
}

function handleRumorPick(room: InternalRoom, playerId: string, chosenIndex: number) {
  if (room.phase !== 'waiting_rumor' || !room.rumorState) return;

  room.rumorState.playerChoices[playerId] = chosenIndex;
  broadcastRoom();

  const allSubmitted = room.rumorState.participants.every(
    (pId) => room.rumorState!.playerChoices[pId] !== undefined
  );

  if (allSubmitted) {
    executeSimultaneousRumor(room);
  }
}

function executeSimultaneousRumor(room: InternalRoom) {
  if (!room.rumorState) return;
  const alivePlayers = room.players.filter((p) => p.hand.length > 0);
  const N = alivePlayers.length;

  const handSnapshots: Record<string, Card[]> = {};
  for (const p of alivePlayers) {
    handSnapshots[p.id] = [...p.hand];
  }

  const cardsDrawnBy: Record<string, Card> = {};

  for (let i = 0; i < N; i++) {
    const p = alivePlayers[i];
    const rightNeighbor = alivePlayers[(i - 1 + N) % N];
    const chosenIdx = room.rumorState.playerChoices[p.id] ?? 0;
    const targetSnapshot = handSnapshots[rightNeighbor.id];
    const safeIdx = Math.min(Math.max(0, chosenIdx), targetSnapshot.length - 1);
    cardsDrawnBy[p.id] = targetSnapshot[safeIdx];
  }

  for (let i = 0; i < N; i++) {
    const p = alivePlayers[i];
    const cardToLose = cardsDrawnBy[alivePlayers[(i + 1) % N].id];
    const cardToGain = cardsDrawnBy[p.id];

    const idxToRemove = p.hand.findIndex((c) => c.id === cardToLose.id);
    if (idxToRemove !== -1) {
      p.hand.splice(idxToRemove, 1);
    }
    p.hand.push(cardToGain);
  }

  room.phase = 'playing';
  room.rumorState = null;
  addLog(room, `全員が右隣のプレイヤーの手札からカードを受け取りました。`, 'alert');
  advanceTurn(room);
}

function handleInfoManipulationPick(room: InternalRoom, playerId: string, cardId: string) {
  if (room.phase !== 'waiting_info_manipulation' || !room.infoManipulationState) return;

  room.infoManipulationState.playerChoices[playerId] = cardId;
  broadcastRoom();

  const allSubmitted = room.infoManipulationState.participants.every(
    (pId) => room.infoManipulationState!.playerChoices[pId] !== undefined
  );

  if (allSubmitted) {
    executeSimultaneousInfoManipulation(room);
  }
}

function executeSimultaneousInfoManipulation(room: InternalRoom) {
  if (!room.infoManipulationState) return;
  const alivePlayers = room.players.filter((p) => p.hand.length > 0);
  const N = alivePlayers.length;

  const passedCards: Record<string, Card> = {};

  for (const p of alivePlayers) {
    const chosenCardId = room.infoManipulationState.playerChoices[p.id];
    const card = p.hand.find((c) => c.id === chosenCardId) || p.hand[0];
    passedCards[p.id] = card;
  }

  for (let i = 0; i < N; i++) {
    const p = alivePlayers[i];
    const cardToGive = passedCards[p.id];
    const rightNeighbor = alivePlayers[(i - 1 + N) % N];
    const cardToReceive = passedCards[rightNeighbor.id];

    const idxToRemove = p.hand.findIndex((c) => c.id === cardToGive.id);
    if (idxToRemove !== -1) {
      p.hand.splice(idxToRemove, 1);
    }
    p.hand.push(cardToReceive);
  }

  room.phase = 'playing';
  room.infoManipulationState = null;
  addLog(room, `全員が左隣のプレイヤーへカードを渡しました。`, 'alert');
  advanceTurn(room);
}

function resetRoomToLobby(room: InternalRoom) {
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

  for (const player of room.players) {
    player.hand = [];
    player.playedCards = [];
    player.isAccomplice = false;
  }

  addLog(room, 'ロビーに戻りました。席順変更や参加者の調整ができます。', 'system');
  broadcastRoom();
}

function startGame(room: InternalRoom) {
  if (room.players.length < 3 || room.players.length > 8) {
    addLog(room, `プレイ人数は3人〜8人である必要があります。（現在${room.players.length}人）`, 'alert');
    broadcastRoom();
    return;
  }

  const deck = buildDeckForPlayerCount(room.players.length);
  room.deck = deck;
  room.discardPile = [];
  room.latestPlayedCard = null;
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

  broadcastRoom();
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
  res.json({ status: 'ok', playersCount: sharedRoom.players.length, phase: sharedRoom.phase });
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

wss.on('connection', (ws: WebSocket) => {
  let boundPlayerId: string | null = null;

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type } = data;

      switch (type) {
        // Universal single room join / reconnect
        case 'JOIN_GAME': {
          const { playerId, playerName } = data;
          const pId = playerId || generateId('P_');
          boundPlayerId = pId;
          sockets.set(pId, ws);

          // Check for existing player (reconnection!)
          const existingPlayer = sharedRoom.players.find((p) => p.id === pId);
          if (existingPlayer) {
            existingPlayer.connected = true;
            if (playerName && playerName.trim()) {
              existingPlayer.name = playerName.trim();
            }
            if (!sharedRoom.hostPlayerId) {
              sharedRoom.hostPlayerId = existingPlayer.id;
            }
            addLog(sharedRoom, `${existingPlayer.name}が再接続しました。`, 'system');
            broadcastRoom();
            return;
          }

          // If in lobby, join as a player
          if (sharedRoom.phase === 'lobby') {
            if (sharedRoom.players.length >= 8) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'ルームが定員（最大8名）に達しています。' }));
              return;
            }

            const isFirst = sharedRoom.players.length === 0;
            if (isFirst || !sharedRoom.hostPlayerId) {
              sharedRoom.hostPlayerId = pId;
            }

            const newPlayer: PlayerPrivate = {
              id: pId,
              name: playerName || `探偵${sharedRoom.players.length + 1}`,
              isHost: pId === sharedRoom.hostPlayerId,
              isBot: false,
              connected: true,
              seatIndex: sharedRoom.players.length,
              hand: [],
              handCount: 0,
              playedCards: [],
              isAccomplice: false,
            };

            sharedRoom.players.push(newPlayer);
            addLog(sharedRoom, `${newPlayer.name}が参加しました。`, 'system');
            broadcastRoom();
            return;
          }

          // If game is in progress, send current game state to observe
          const state = getSanitizedStateForPlayer(sharedRoom, pId);
          ws.send(JSON.stringify({ type: 'ROOM_UPDATE', state }));
          break;
        }

        case 'UPDATE_NAME': {
          const { playerId, playerName } = data;
          const p = sharedRoom.players.find((x) => x.id === playerId);
          if (p && playerName && playerName.trim()) {
            p.name = playerName.trim();
            broadcastRoom();
          }
          break;
        }

        case 'SHUFFLE_PLAYERS': {
          if (sharedRoom.phase !== 'lobby') return;
          for (let i = sharedRoom.players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sharedRoom.players[i], sharedRoom.players[j]] = [sharedRoom.players[j], sharedRoom.players[i]];
          }
          sharedRoom.players.forEach((p, idx) => {
            p.seatIndex = idx;
          });
          addLog(sharedRoom, 'プレイヤーの席順がシャッフルされました！', 'system');
          broadcastRoom();
          break;
        }

        case 'ADD_BOT': {
          if (sharedRoom.phase !== 'lobby') return;
          if (sharedRoom.players.length >= 8) {
            ws.send(JSON.stringify({ type: 'ERROR', message: '最大8人までです。' }));
            return;
          }

          const botId = generateId('BOT_');
          const botName = BOT_NAMES[(sharedRoom.players.length - 1) % BOT_NAMES.length];

          const botPlayer: PlayerPrivate = {
            id: botId,
            name: botName,
            isHost: false,
            isBot: true,
            connected: true,
            seatIndex: sharedRoom.players.length,
            hand: [],
            handCount: 0,
            playedCards: [],
            isAccomplice: false,
          };

          sharedRoom.players.push(botPlayer);
          addLog(sharedRoom, `${botName}が参加しました。`, 'system');
          broadcastRoom();
          break;
        }

        case 'REMOVE_BOT': {
          const { botId } = data;
          if (sharedRoom.phase !== 'lobby') return;

          const idx = sharedRoom.players.findIndex((p) => p.id === botId && p.isBot);
          if (idx !== -1) {
            const removed = sharedRoom.players.splice(idx, 1)[0];
            sharedRoom.players.forEach((p, i) => {
              p.seatIndex = i;
            });
            addLog(sharedRoom, `${removed.name}が退出しました。`, 'system');
            broadcastRoom();
          }
          break;
        }

        case 'START_GAME': {
          startGame(sharedRoom);
          break;
        }

        case 'PLAY_FIRST_DISCOVERER': {
          const { playerId, incident } = data;
          handlePlayFirstDiscoverer(sharedRoom, playerId, incident);
          break;
        }

        case 'PLAY_CARD': {
          const { playerId, cardId } = data;
          handlePlayCard(sharedRoom, playerId, cardId);
          break;
        }

        case 'ACTION_DETECTIVE': {
          const { playerId, targetPlayerId } = data;
          handleDetectiveAccusation(sharedRoom, playerId, targetPlayerId);
          break;
        }

        case 'ACTION_TRADE_OFFER': {
          const { playerId, targetPlayerId, cardId } = data;
          handleTradeOffer(sharedRoom, playerId, targetPlayerId, cardId);
          break;
        }

        case 'ACTION_TRADE_ACCEPT': {
          const { cardId } = data;
          executeTradeComplete(sharedRoom, cardId);
          break;
        }

        case 'ACTION_WITNESS': {
          const { playerId, targetPlayerId } = data;
          handleWitnessAction(sharedRoom, playerId, targetPlayerId);
          break;
        }

        case 'ACTION_WITNESS_DONE': {
          advanceTurn(sharedRoom);
          break;
        }

        case 'ACTION_DOG': {
          const { playerId, targetPlayerId, cardIndex } = data;
          handleDogAction(sharedRoom, playerId, targetPlayerId, cardIndex);
          break;
        }

        case 'ACTION_BOY_DONE': {
          advanceTurn(sharedRoom);
          break;
        }

        case 'ACTION_RUMOR_PICK': {
          const { playerId, cardIndex } = data;
          handleRumorPick(sharedRoom, playerId, cardIndex);
          break;
        }

        case 'ACTION_INFO_MANIPULATION_PICK': {
          const { playerId, cardId } = data;
          handleInfoManipulationPick(sharedRoom, playerId, cardId);
          break;
        }

        case 'RESET_ROOM':
        case 'RESTART_GAME': {
          resetRoomToLobby(sharedRoom);
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
    if (boundPlayerId) {
      const player = sharedRoom.players.find((p) => p.id === boundPlayerId);
      if (player) {
        player.connected = false;
        addLog(sharedRoom, `${player.name}が一時切断中（再接続待機）`, 'system');
        broadcastRoom();
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
