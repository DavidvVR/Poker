export type RoomPlayerSummary = {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  seat: number;
};

export type RoomSummary = {
  id: string;
  code: string;
  status: string;
  hostId: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return "No se pudo completar la acción con Supabase.";
}

export async function createRoom({ code, hostName }: { code: string; hostName: string }) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "create", code, hostName }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo crear la sala.");
  }

  return payload as {
    room: RoomSummary;
    players: RoomPlayerSummary[];
    playerId: string;
  };
}

export async function joinRoom({ code, userName }: { code: string; userName: string }) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "join", code, userName }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo unir a la sala.");
  }

  return payload as {
    room: RoomSummary;
    players: RoomPlayerSummary[];
    playerId: string;
  };
}

export async function getRoomState(code: string) {
  const response = await fetch(`/api/rooms?code=${encodeURIComponent(code)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo cargar la sala.");
  }

  return payload as {
    room: RoomSummary;
    players: RoomPlayerSummary[];
    gameId: string | null;
  };
}
