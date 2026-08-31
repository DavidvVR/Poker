export type GamePlayerSummary = {
  id: string;
  name: string;
  hand: Array<{ value: string; suit: string; label: string }>;
  stack: number;
  status: string;
  seat: number;
};

export type GameSummary = {
  id: string;
  roomId: string;
  status: string;
  pot: number;
  currentTurn: string | null;
  currentTurnName: string | null;
  dealerPosition: number;
  smallBlind?: number;
  bigBlind?: number;
  roundStage?: string;
  roundLabel?: string;
  actionCount?: number;
  communityCards?: Array<{ value: string; suit: string; label: string }>;
  resultMessage?: string | null;
};

export type GameActionSummary = {
  id: string;
  userId: string;
  playerName: string;
  action: string;
  amount: number;
  createdAt: string;
};

export async function startGame({ roomId }: { roomId: string }) {
  const response = await fetch("/api/games", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "start", roomId }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo iniciar la partida.");
  }

  return payload as {
    game: GameSummary;
    players: GamePlayerSummary[];
  };
}

export async function getGameState(gameId: string) {
  const response = await fetch(`/api/games?gameId=${encodeURIComponent(gameId)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo cargar la partida.");
  }

  return payload as {
    game: GameSummary;
    players: GamePlayerSummary[];
    actions: GameActionSummary[];
  };
}

export async function resetHand({ gameId }: { gameId: string }) {
  const response = await fetch("/api/games", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "reset-hand", gameId }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo reiniciar la mano.");
  }

  return payload as {
    game: GameSummary;
    players: GamePlayerSummary[];
  };
}
