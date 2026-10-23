import { Card, CardType } from '../types/game';

export interface CardMeta {
  type: CardType;
  name: string;
  kana: string;
  category: Card['category'];
  description: string;
  detail: string;
  icon: string;
  badgeColor: string;
  totalCount: number;
}

export const CARD_DEFINITIONS: Record<CardType, CardMeta> = {
  first_discoverer: {
    type: 'first_discoverer',
    name: '第一発見者',
    kana: '',
    category: 'status',
    description: '事件の発見者！このカードを出してゲームを開始する。',
    detail: 'ゲーム開始時に最初に場に出します。今回起きた事件の内容を発表し、時計回りにゲームが進行します。',
    icon: '🚨',
    badgeColor: 'from-amber-400 to-yellow-400',
    totalCount: 1,
  },
  culprit: {
    type: 'culprit',
    name: '犯人',
    kana: '',
    category: 'culprit',
    description: '手札がこれ1枚の時だけ出せる！出せば犯人側の完全勝利！',
    detail: '手札に2枚以上あるときは出せません。手札を減らして最後の1枚として出すことに成功すれば、犯人と「たくらみ」を出した共犯者が即座に勝利します！',
    icon: '🎭',
    badgeColor: 'from-rose-500 to-red-600',
    totalCount: 1,
  },
  detective: {
    type: 'detective',
    name: '探偵',
    kana: '',
    category: 'investigation',
    description: '第2巡目以降に使用可能。1人を指名して犯人か暴く！',
    detail: '指名した相手が「犯人」カードを持ち、かつ「アリバイ」を持っていなければ探偵の即勝利！相手がアリバイを持っていればシロ扱いになります。',
    icon: '🔍',
    badgeColor: 'from-blue-500 to-cyan-600',
    totalCount: 4,
  },
  alibi: {
    type: 'alibi',
    name: 'アリバイ',
    kana: '',
    category: 'status',
    description: '手札に持っていると、探偵の告発から身を守れる！',
    detail: '犯人カードと一緒に手札に持っていれば、探偵に疑われても「犯人ではない」と逃れられます。場に出してしまうと保護効果は失われます。',
    icon: '📜',
    badgeColor: 'from-emerald-400 to-teal-500',
    totalCount: 5,
  },
  trade: {
    type: 'trade',
    name: '取り引き',
    kana: '',
    category: 'action',
    description: '他の1人を指名し、お互いの手札を1枚ずつ秘密裏に交換！',
    detail: 'あなたと指名相手がそれぞれ1枚選んで裏向きで交換します。渡したカードは他プレイヤーには見えません。犯人カードのなすり付けにも！',
    icon: '🤝',
    badgeColor: 'from-amber-500 to-orange-500',
    totalCount: 5,
  },
  rumor: {
    type: 'rumor',
    name: 'うわさ',
    kana: '',
    category: 'action',
    description: '全員が一斉に、右隣のプレイヤーの手札から1枚引く！',
    detail: '全プレイヤーが同時に右隣の手札から1枚を引いて交換します。手札が一斉に移動し、犯人カードの行方が混沌とします。',
    icon: '💬',
    badgeColor: 'from-pink-400 to-rose-400',
    totalCount: 4,
  },
  info_manipulation: {
    type: 'info_manipulation',
    name: '情報操作',
    kana: '',
    category: 'action',
    description: '全員が一斉に、自分の手札から1枚選んで左隣へ渡す！',
    detail: '全プレイヤーが同時に、自分が選んだ手札1枚を左隣の人へ渡します。不要なカードや、計画的に犯人カードを送り込めます。',
    icon: '🔄',
    badgeColor: 'from-indigo-400 to-purple-500',
    totalCount: 3,
  },
  witness: {
    type: 'witness',
    name: '目撃者',
    kana: '',
    category: 'investigation',
    description: '他の1人を指名し、その人の手札をすべて覗き見られる！',
    detail: '指名した相手の手札すべてをあなただけが確認できます。相手が犯人か、アリバイを持っているかを正確に把握できます。',
    icon: '👁️',
    badgeColor: 'from-sky-400 to-blue-500',
    totalCount: 3,
  },
  civilian: {
    type: 'civilian',
    name: '一般人',
    kana: '',
    category: 'status',
    description: '特殊効果なし！善良な市民。安全に手番をパスできる。',
    detail: '場に出しても何も起きません。手札を安全に減らしたいときや、手番を穏便にやり過ごしたいときに役立ちます。',
    icon: '👤',
    badgeColor: 'from-stone-400 to-slate-500',
    totalCount: 2,
  },
  conspiracy: {
    type: 'conspiracy',
    name: 'たくらみ',
    kana: '',
    category: 'status',
    description: '犯人の共犯者になる！犯人が逃亡勝利したとき、あなたも勝利！',
    detail: 'このカードを出した人は犯人の共犯者となります。犯人が最後に犯人を出して勝利したとき、共犯者も一緒に勝利します！',
    icon: '😈',
    badgeColor: 'from-purple-500 to-fuchsia-600',
    totalCount: 2,
  },
  dog: {
    type: 'dog',
    name: 'いぬ',
    kana: '',
    category: 'investigation',
    description: '1人の手札から1枚選び公開！「犯人」なら即座に勝利！',
    detail: '指名した相手の手札から1枚を指定して全員に公開します。もしそれが「犯人」ならいぬの即座勝利！（アリバイは無効）外れたら相手の手札に戻ります。',
    icon: '🐕',
    badgeColor: 'from-amber-500 to-yellow-600',
    totalCount: 1,
  },
  boy: {
    type: 'boy',
    name: '少年',
    kana: '',
    category: 'investigation',
    description: '現在誰が犯人カードを持っているか、あなただけに教えられる！',
    detail: '鋭い少年の直感により、現在犯人カードを持っているプレイヤーの名前があなただけに密かに通知されます。',
    icon: '👦',
    badgeColor: 'from-emerald-400 to-teal-600',
    totalCount: 1,
  },
};

/**
 * Creates full 32-card deck
 */
export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  let idCounter = 1;

  for (const [type, meta] of Object.entries(CARD_DEFINITIONS) as [CardType, CardMeta][]) {
    for (let i = 0; i < meta.totalCount; i++) {
      deck.push({
        id: `card_${type}_${idCounter++}`,
        type,
        name: meta.name,
        kana: meta.kana,
        category: meta.category,
        description: meta.description,
        icon: meta.icon,
        badgeColor: meta.badgeColor,
      });
    }
  }

  return deck;
}

/**
 * Fisher-Yates shuffle
 */
export function shuffleCards<T>(cards: T[]): T[] {
  const array = [...cards];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Builds deck strictly adhering to 3rd edition rules according to player count (3-8)
 */
export function buildDeckForPlayerCount(playerCount: number): Card[] {
  if (playerCount < 3 || playerCount > 8) {
    throw new Error(`Player count must be between 3 and 8, received ${playerCount}`);
  }

  // 8 players uses all 32 cards
  if (playerCount === 8) {
    return shuffleCards(createFullDeck());
  }

  const fullDeck = createFullDeck();
  const mandatoryCounts: Partial<Record<CardType, number>> = {
    first_discoverer: 1,
    culprit: 1,
  };

  switch (playerCount) {
    case 3:
      mandatoryCounts.detective = 1;
      mandatoryCounts.alibi = 1;
      break;
    case 4:
      mandatoryCounts.detective = 1;
      mandatoryCounts.alibi = 1;
      mandatoryCounts.conspiracy = 1;
      break;
    case 5:
      mandatoryCounts.detective = 1;
      mandatoryCounts.alibi = 2;
      mandatoryCounts.conspiracy = 1;
      break;
    case 6:
      mandatoryCounts.detective = 2;
      mandatoryCounts.alibi = 2;
      mandatoryCounts.conspiracy = 2;
      break;
    case 7:
      mandatoryCounts.detective = 2;
      mandatoryCounts.alibi = 3;
      mandatoryCounts.conspiracy = 2;
      break;
  }

  const selectedCards: Card[] = [];
  const remainingPool: Card[] = [];

  const poolByType: Record<CardType, Card[]> = {
    first_discoverer: [],
    culprit: [],
    detective: [],
    alibi: [],
    trade: [],
    rumor: [],
    info_manipulation: [],
    witness: [],
    civilian: [],
    conspiracy: [],
    dog: [],
    boy: [],
  };

  for (const card of fullDeck) {
    poolByType[card.type].push(card);
  }

  for (const [typeKey, reqCount] of Object.entries(mandatoryCounts)) {
    const cardType = typeKey as CardType;
    const cards = poolByType[cardType];
    for (let i = 0; i < (reqCount || 0); i++) {
      if (cards.length > 0) {
        selectedCards.push(cards.pop()!);
      }
    }
  }

  for (const cards of Object.values(poolByType)) {
    remainingPool.push(...cards);
  }

  const shuffledRemaining = shuffleCards(remainingPool);
  const neededRandomCount = playerCount * 4 - selectedCards.length;

  for (let i = 0; i < neededRandomCount; i++) {
    if (shuffledRemaining.length > 0) {
      selectedCards.push(shuffledRemaining.pop()!);
    }
  }

  return shuffleCards(selectedCards);
}

export const DEFAULT_INCIDENTS = [
  '冷蔵庫のプレミアムプリンが忽然と姿を消した！',
  '部室の大事なトロフィーが何者かに持ち去られた！',
  '探偵事務所の秘伝のティーカップが割られていた！',
  '怪盗から「今夜、美術館の宝石をいただく」と予告状が届いた！',
  '校長室の金魚鉢から幻の巨大金魚が消滅した！',
  '夜食のカップラーメンのお湯を誰かが勝手に注いでいた！',
];
