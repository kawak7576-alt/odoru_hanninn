export type CardType =
  | 'first_discoverer'
  | 'culprit'
  | 'detective'
  | 'alibi'
  | 'trade'
  | 'rumor'
  | 'info_manipulation'
  | 'witness'
  | 'civilian'
  | 'conspiracy'
  | 'dog'
  | 'boy';

export type CardCategory = 'culprit' | 'investigation' | 'action' | 'information' | 'status';

export interface Card {
  id: string;
  type: CardType;
  name: string;
  kana: string;
  category: CardCategory;
  categoryLabel?: string;
  description: string;
  summary?: string;
  detail?: string;
  target?: string;
  condition?: string;
  restriction?: string;
  icon: string;
  badgeColor: string;
}

export interface CardMovementItem {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  cardName?: string;
  isSecret: boolean;
}

export interface CardMovementEvent {
  id: string;
  timestamp: number;
  effect: 'trade' | 'rumor' | 'info_manipulation' | 'dog' | 'play';
  effectName: string;
  summary: string;
  movements: CardMovementItem[];
}

export interface PlayerPublic {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  seatIndex: number;
  handCount: number;
  playedCards: Card[];
  isAccomplice: boolean;
  isDeadOrOut?: boolean;
}

export interface PlayerPrivate extends PlayerPublic {
  hand: Card[];
}

export type GamePhase =
  | 'lobby'
  | 'first_discoverer_turn'
  | 'playing'
  | 'waiting_trade'
  | 'waiting_rumor'
  | 'waiting_info_manipulation'
  | 'game_over';

export type VictoryType = 'detective' | 'dog' | 'culprit';

export interface GameResult {
  winners: { id: string; name: string; role: 'detective' | 'dog' | 'culprit' | 'accomplice' }[];
  victoryType: VictoryType;
  victoryReason: string;
  culpritPlayerId: string;
  culpritPlayerName: string;
  accomplicePlayerIds: string[];
  allPlayerHands: {
    playerId: string;
    playerName: string;
    isAccomplice: boolean;
    isCulprit: boolean;
    hand: Card[];
  }[];
  rounds: number;
  incident: string;
  endedAt: number;
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  text: string;
  type: 'system' | 'incident' | 'play' | 'action' | 'alert' | 'victory';
}

export interface TradeState {
  fromPlayerId: string;
  toPlayerId: string;
  offeredCard?: Card;
  receivedCard?: Card;
  completed: boolean;
}

export interface RumorState {
  playerChoices: Record<string, number>; // playerId -> chosen card index from right neighbor
  participants: string[];
}

export interface InfoManipulationState {
  playerChoices: Record<string, string>; // playerId -> cardId to pass to left neighbor
  participants: string[];
}

export interface MatchRecord {
  id: string;
  roomId: string;
  timestamp: number;
  playerCount: number;
  incident: string;
  victoryType: VictoryType;
  victoryReason: string;
  winnerNames: string[];
  culpritName: string;
  rounds: number;
}

// Client received view
export interface ClientGameState {
  roomId: string;
  phase: GamePhase;
  incident: string;
  round: number;
  turnIndex: number;
  currentTurnPlayerId: string;
  players: PlayerPublic[];
  myHand: Card[];
  discardPile: Card[];
  latestPlayedCard: { card: Card; playerId: string; playerName: string } | null;
  logs: GameLogEntry[];
  result: GameResult | null;

  // Pending action states for current player
  activeCardAction?: {
    cardType: CardType;
    turnPlayerId: string;
    actionType: 'detective' | 'trade' | 'witness' | 'dog' | 'boy' | 'rumor' | 'info_manipulation';
  } | null;

  // Private secret data for me
  secretInfo?: {
    boyCulpritHolder?: { id: string; name: string };
    witnessCards?: { targetId: string; targetName: string; cards: Card[] };
    revealedCard?: { card: Card; targetName: string; isCulprit: boolean };
    tradeOfferPrompt?: { fromPlayerId: string; fromPlayerName: string };
    rumorWaitPrompt?: { rightNeighborId: string; rightNeighborName: string; rightNeighborCardCount: number; canDraw?: boolean };
    infoManipulationPrompt?: boolean | { canGive: boolean };
  } | null;

  // Recent card movement event sanitized for this player
  latestMovement?: CardMovementEvent | null;
}
