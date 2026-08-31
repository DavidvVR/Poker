export type Screen = "home" | "lobby" | "table";
export type GameRoundStage = "preflop" | "flop" | "turn" | "river" | "showdown";

export type PokerCardModel = {
  value: string;
  suit: string;
  label: string;
};

export type PokerPlayerView = {
  name: string;
  hand: PokerCardModel[];
  stack: number;
  status: string;
};

export type PokerTableViewModel = {
  players: PokerPlayerView[];
  communityCards: PokerCardModel[];
  currentTurnIndex: number;
  currentTurnName: string;
  dealerIndex: number;
  roundStage: GameRoundStage;
  roundLabel: string;
  pot: number;
};

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;

const createSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const getRandomIndex = (max: number) => {
  if (typeof globalThis !== "undefined" && typeof globalThis.crypto?.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] % max;
  }

  return Math.floor(Math.random() * max);
};

const createDeck = () => VALUES.flatMap((value) => SUITS.map((suit) => ({ value, suit, label: `${value}${suit}` })));

export const shuffleDeck = (seed: string) => {
  const deck = createDeck();
  const shuffled = [...deck];
  const randomSeed = createSeed(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = (randomSeed + getRandomIndex(index + 1) + index) % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

export const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const normalizeRoomCode = (value: string) => value.trim().toUpperCase();

export const ROUND_STAGE_LABELS: Record<GameRoundStage, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

export const getRoundStageFromActionCount = (actionCount: number): GameRoundStage => {
  if (actionCount >= 8) return "showdown";
  if (actionCount >= 6) return "river";
  if (actionCount >= 4) return "turn";
  if (actionCount >= 2) return "flop";
  return "preflop";
};

export const getRoundProgressionLabel = (stage: GameRoundStage, actionCount: number) => {
  if (stage === "showdown") return "Showdown";
  if (stage === "river") return "River";
  if (stage === "turn") return "Turn";
  if (stage === "flop") return "Flop";
  if (actionCount >= 2) return "Flop";
  return "Preflop";
};

export const getRoundLabel = (stage: GameRoundStage) => ROUND_STAGE_LABELS[stage] ?? ROUND_STAGE_LABELS.preflop;

export const isAllowedAction = (value: string) => ["fold", "check", "call", "raise"].includes(value.trim().toLowerCase());

export type PlayerActionState = "idle" | "acting" | "folded" | "checked" | "called" | "raised" | "all-in";

export const getPlayerActionLabel = (action: string) => {
  if (action === "fold") return "Fold";
  if (action === "check") return "Check";
  if (action === "call") return "Call";
  if (action === "raise") return "Raise";
  return "Actuando";
};

export const getPlayerStatusLabel = (actionState: PlayerActionState) => {
  if (actionState === "folded") return "Retirado";
  if (actionState === "checked") return "Check";
  if (actionState === "called") return "Call";
  if (actionState === "raised") return "Raise";
  if (actionState === "all-in") return "All-in";
  if (actionState === "acting") return "Actuando";
  return "Esperando";
};

export const getPlayerStateClassName = (state: PlayerActionState) => {
  if (state === "folded") return "state-folded";
  if (state === "checked") return "state-checked";
  if (state === "called") return "state-called";
  if (state === "raised") return "state-raised";
  if (state === "all-in") return "state-all-in";
  if (state === "acting") return "state-acting";
  return "state-idle";
};

export const buildDealtPokerState = ({ playerNames, seed = "", pot = 0 }: { playerNames: string[]; seed?: string; pot?: number }) => {
  const deck = shuffleDeck(`${seed}-${playerNames.join("-")}`);
  const players = playerNames.map((name, index) => ({
    name,
    hand: [deck[index * 2], deck[index * 2 + 1]],
    stack: 1000,
    status: index === 0 ? "Activa" : "Esperando",
  }));

  const communityCards = deck.slice(playerNames.length * 2, playerNames.length * 2 + 5);

  return { players, communityCards, pot };
};

export const createPokerTableView = ({ playerNames, seed = "", pot = 0 }: { playerNames: string[]; seed?: string; pot?: number }): PokerTableViewModel => {
  const { players, communityCards } = buildDealtPokerState({ playerNames, seed, pot });
  const dealerIndex = 0;
  const currentTurnIndex = (dealerIndex + 1) % players.length;

  return {
    players,
    communityCards,
    currentTurnIndex,
    currentTurnName: players[currentTurnIndex]?.name ?? players[0]?.name ?? "Jugador",
    dealerIndex,
    roundStage: "preflop",
    roundLabel: getRoundLabel("preflop"),
    pot,
  };
};

export const getVisibleCommunityCards = (stage: GameRoundStage, communityCards: PokerCardModel[]) => {
  const countByStage: Record<GameRoundStage, number> = {
    preflop: 0,
    flop: 3,
    turn: 4,
    river: 5,
    showdown: 5,
  };

  return communityCards.slice(0, countByStage[stage]);
};

export const getNextTurnIndex = (currentTurnIndex: number, playerCount: number) => (currentTurnIndex + 1) % playerCount;

export const getNextRoundStage = (stage: GameRoundStage, actionCount: number): GameRoundStage => {
  if (stage === "preflop" && actionCount >= 2) return "flop";
  if (stage === "flop" && actionCount >= 4) return "turn";
  if (stage === "turn" && actionCount >= 6) return "river";
  if (stage === "river" && actionCount >= 8) return "showdown";
  return stage;
};

export type HandEvaluation = {
  rank: number;
  label: string;
  values: number[];
};

export type HandResult = {
  id: string;
  name: string;
  hand: PokerCardModel[];
  evaluation: HandEvaluation;
};

const cardValueMap: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const sortDescending = (values: number[]) => [...values].sort((left, right) => right - left);

const getCardValues = (cards: PokerCardModel[]) => cards.map((card) => cardValueMap[card.value] ?? 0).sort((left, right) => right - left);

export const evaluateBestHand = (cards: PokerCardModel[]): HandEvaluation => {
  const values = sortDescending(getCardValues(cards));
  const grouped = values.reduce<Record<number, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});
  const counts = Object.values(grouped).sort((left, right) => right - left);
  const sortedRanks = sortDescending(Object.keys(grouped).map((value) => Number(value)));
  const uniqueValues = [...new Set(values)].sort((left, right) => right - left);

  const isStraight = uniqueValues.length >= 5 && uniqueValues[0] - uniqueValues[4] === 4;

  if (counts[0] === 4) {
    return { rank: 7, label: "Póker", values: sortDescending(values.filter((value) => value !== sortedRanks[1])) };
  }

  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: 6, label: "Full", values: [sortedRanks[0], sortedRanks[1]] };
  }

  if (isStraight) {
    return { rank: 4, label: "Escalera", values: [uniqueValues[0]] };
  }

  if (counts[0] === 3) {
    return { rank: 3, label: "Trío", values: [sortedRanks[0], ...sortDescending(values.filter((value) => value !== sortedRanks[0]).slice(0, 2))] };
  }

  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: 2, label: "Doble pareja", values: [sortedRanks[0], sortedRanks[1], values[4] ?? 0] };
  }

  if (counts[0] === 2) {
    return { rank: 1, label: "Par", values: [sortedRanks[0], ...values.filter((value) => value !== sortedRanks[0]).slice(0, 3)] };
  }

  return { rank: 0, label: "Carta alta", values };
};

export const getWinningPlayers = (players: Array<{ id: string; name: string; hand: PokerCardModel[] }>, communityCards: PokerCardModel[]) => {
  const evaluatedPlayers = players.map((player) => ({
    ...player,
    evaluation: evaluateBestHand([...player.hand, ...communityCards]),
  }));

  const sorted = [...evaluatedPlayers].sort((left, right) => {
    if (left.evaluation.rank !== right.evaluation.rank) {
      return right.evaluation.rank - left.evaluation.rank;
    }

    for (let index = 0; index < Math.max(left.evaluation.values.length, right.evaluation.values.length); index += 1) {
      const leftValue = left.evaluation.values[index] ?? 0;
      const rightValue = right.evaluation.values[index] ?? 0;
      if (leftValue !== rightValue) {
        return rightValue - leftValue;
      }
    }

    return 0;
  });

  const bestRank = sorted[0]?.evaluation.rank ?? 0;
  const bestValues = sorted[0]?.evaluation.values ?? [];

  return sorted.filter((player) => player.evaluation.rank === bestRank && player.evaluation.values.every((value, index) => value === bestValues[index])) as HandResult[];
};

export const getPotPayouts = ({ pot, winnerIds }: { pot: number; winnerIds: string[] }) => {
  if (winnerIds.length === 0) return {} as Record<string, number>;

  const basePayout = Math.floor(pot / winnerIds.length);
  const remainder = pot % winnerIds.length;

  return winnerIds.reduce<Record<string, number>>((payouts, winnerId, index) => {
    payouts[winnerId] = basePayout + (index < remainder ? 1 : 0);
    return payouts;
  }, {});
};

export type BettingAction = { action: "fold" | "check" | "call" | "raise"; amount?: number };

export type BettingState = {
  currentBet: number;
  requiredCallAmount: number;
  minimumRaise: number;
  canCheck: boolean;
};

export const getBettingState = ({
  previousActions,
  playerContribution = 0,
}: {
  previousActions: BettingAction[];
  playerContribution?: number;
}): BettingState => {
  const currentBet = previousActions.reduce((highestBet, entry) => {
    if (entry.action === "raise") {
      return Math.max(highestBet, entry.amount ?? 0);
    }
    return highestBet;
  }, 0);

  const requiredCallAmount = Math.max(0, currentBet - playerContribution);
  const minimumRaise = Math.max(20, currentBet + 20);
  const canCheck = currentBet === 0;

  return {
    currentBet,
    requiredCallAmount,
    minimumRaise,
    canCheck,
  };
};

export type TurnHelp = {
  title: string;
  detail: string;
  primaryAction: string;
};

export type HandSummary = {
  title: string;
  detail: string;
  badge: string;
};

export const getTurnHelp = ({
  isMyTurn,
  currentBet,
  requiredCallAmount,
  minimumRaise,
  roundLabel,
  currentPlayerName,
  currentTurnName,
}: {
  isMyTurn: boolean;
  currentBet: number;
  requiredCallAmount: number;
  minimumRaise: number;
  roundLabel: string;
  currentPlayerName: string;
  currentTurnName: string;
}): TurnHelp => {
  if (!isMyTurn) {
    return {
      title: "Turno en curso",
      detail: `${currentTurnName} está actuando en ${roundLabel}. Espera tu momento para reaccionar.`,
      primaryAction: "Esperar",
    };
  }

  if (requiredCallAmount > 0) {
    return {
      title: "Debes igualar",
      detail: `La mesa abrió ${currentBet} fichas. Iguala ${requiredCallAmount} para seguir en la mano.`,
      primaryAction: "Igualar",
    };
  }

  return {
    title: "Tu turno",
    detail: `No hay apuesta abierta. Puedes pasar, subir o entrar en la mano en ${roundLabel}.`,
    primaryAction: "Pasar",
  };
};

export const getHandSummary = ({
  roundLabel,
  pot,
  communityCardsCount,
  currentTurnName,
  isShowdown,
  handResult,
  showdownSummary,
}: {
  roundLabel: string;
  pot: number;
  communityCardsCount: number;
  currentTurnName: string;
  isShowdown: boolean;
  handResult: string | null;
  showdownSummary: string | null;
}): HandSummary => {
  if (isShowdown && handResult) {
    return {
      title: "Showdown",
      detail: handResult,
      badge: "Final",
    };
  }

  if (isShowdown && showdownSummary) {
    return {
      title: "Mano cerrada",
      detail: showdownSummary,
      badge: "Resultado",
    };
  }

  return {
    title: "Ronda en curso",
    detail: `Bote ${pot} · ${communityCardsCount} cartas comunitarias visibles · ${currentTurnName} está actuando.`,
    badge: roundLabel,
  };
};

export const getTableRoles = ({ players, dealerIndex }: { players: Array<{ name: string }>; dealerIndex: number }) => {
  const safePlayers = players.filter((player) => player.name);
  if (safePlayers.length === 0) {
    return { dealerName: "", smallBlindName: "", bigBlindName: "" };
  }

  const normalizedDealerIndex = dealerIndex % safePlayers.length;
  const smallBlindIndex = safePlayers.length === 2 ? normalizedDealerIndex : (normalizedDealerIndex + 1) % safePlayers.length;
  const bigBlindIndex = (smallBlindIndex + 1) % safePlayers.length;
  const dealerName = safePlayers[normalizedDealerIndex]?.name ?? "";
  const smallBlindName = safePlayers[smallBlindIndex]?.name ?? "";
  const bigBlindName = safePlayers[bigBlindIndex]?.name ?? "";

  return { dealerName, smallBlindName, bigBlindName };
};

export const getHandSetup = ({
  playerCount,
  currentDealerIndex,
  rotateDealer = true,
  smallBlind = 10,
  bigBlind = 20,
}: {
  playerCount: number;
  currentDealerIndex: number;
  rotateDealer?: boolean;
  smallBlind?: number;
  bigBlind?: number;
}) => {
  const safePlayerCount = Math.max(1, playerCount);
  const dealerIndex = (currentDealerIndex + (rotateDealer ? 1 : 0)) % safePlayerCount;
  const smallBlindIndex = safePlayerCount === 2 ? dealerIndex : (dealerIndex + 1) % safePlayerCount;
  const bigBlindIndex = (smallBlindIndex + 1) % safePlayerCount;
  const firstTurnIndex = safePlayerCount === 2 ? dealerIndex : (bigBlindIndex + 1) % safePlayerCount;

  return {
    dealerIndex,
    smallBlindIndex,
    bigBlindIndex,
    firstTurnIndex,
    smallBlind,
    bigBlind,
  };
};
