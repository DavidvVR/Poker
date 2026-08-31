export async function recordAction({ gameId, userName, action, amount }: { gameId: string; userName: string; action: string; amount: number }) {
  const response = await fetch("/api/actions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "record", gameId, userName, actionName: action, amount }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo registrar la acción.");
  }

  return payload as {
    actionId: string;
    message: string;
    game: {
      id: string;
      pot: number;
      currentTurn: string | null;
      currentTurnName: string | null;
      roundStage?: string;
      roundLabel?: string;
    };
  };
}
