export type ChatMessage = {
  id: string;
  playerName: string;
  message: string;
  createdAt: string;
};

export async function sendChatMessage({ roomId, userName, message }: { roomId: string; userName: string; message: string }) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, userName, message }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo enviar el mensaje.");
  }

  return payload as { message: ChatMessage };
}
