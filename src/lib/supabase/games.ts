export type GameSummary = {
  id: string;
  roomId: string;
  status: string;
  pot: number;
  currentTurn: string | null;
  currentTurnName: string | null;
  dealerPosition: number;
  roundStage?: string;
  roundLabel?: string;
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
    players: Array<{ id: string; name: string; isHost: boolean; isReady: boolean; seat: number }>;
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
  };
}
