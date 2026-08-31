"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendChatMessage, type ChatMessage } from "@/lib/supabase/chat";

type ChatPanelProps = {
  roomId: string;
  playerName: string;
};

export function ChatPanel({ roomId, playerName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCanceled = false;
    const client = createClient();

    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/chat?roomId=${encodeURIComponent(roomId)}`);
        const payload = await response.json();

        if (!isCanceled && Array.isArray(payload.messages)) {
          setMessages(payload.messages);
        }
      } catch {
        // silently ignore initial load errors
      }
    };

    const channel = client.channel(`chat-${roomId}`);

    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` }, (event) => {
      const row = event.new as { id?: string; message?: string; created_at?: string };

      setMessages((current) => {
        if (current.some((msg) => msg.id === row.id)) return current;
        return [...current.slice(-59), {
          id: row.id ?? crypto.randomUUID(),
          playerName: "…",
          message: row.message ?? "",
          createdAt: row.created_at ?? new Date().toISOString(),
        }];
      });

      void loadHistory();
    });

    const pollTimer = window.setInterval(() => {
      void loadHistory();
    }, 2000);

    void channel.subscribe();
    void loadHistory();

    return () => {
      isCanceled = true;
      window.clearInterval(pollTimer);
      void client.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (messages.length === 0) return;

    const container = bottomRef.current?.parentElement;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 80;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen && messages.length > lastSeenCount) {
      setHasNewMessages(true);
    }
  }, [messages, isOpen, lastSeenCount]);

  useEffect(() => {
    if (isOpen) {
      setHasNewMessages(false);
      setLastSeenCount(messages.length);
    }
  }, [isOpen, messages.length]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();

    if (!text || isSending) return;

    setIsSending(true);
    setDraft("");

    try {
      const response = await sendChatMessage({ roomId, userName: playerName, message: text });
      setMessages((current) => {
        if (current.some((msg) => msg.id === response.message.id)) {
          return current;
        }
        return [...current, response.message];
      });
      window.setTimeout(() => {
        void fetch(`/api/chat?roomId=${encodeURIComponent(roomId)}`)
          .then((res) => res.json())
          .then((payload) => {
            if (Array.isArray(payload.messages)) {
              setMessages(payload.messages);
            }
          })
          .catch(() => undefined);
      }, 400);
    } catch {
      setDraft(text);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`chat-shell ${isOpen ? "open" : ""}`}>
      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <strong>Chat de mesa</strong>
            <button type="button" className="chat-close" onClick={() => setIsOpen(false)} aria-label="Cerrar chat">
              ×
            </button>
          </div>
          <div className="chat-messages" role="log" aria-live="polite">
            {messages.length === 0
              ? <p className="chat-empty">Nadie ha escrito nada todavía.</p>
              : messages.map((msg) => (
                  <div key={msg.id} className={`chat-msg ${msg.playerName === playerName ? "mine" : ""}`}>
                    <span className="chat-author">{msg.playerName}</span>
                    <span className="chat-text">{msg.message}</span>
                  </div>
                ))}
            <div ref={bottomRef} />
          </div>
          <form className="chat-form" onSubmit={handleSend}>
            <input
              aria-label="Escribe un mensaje"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un mensaje…"
              maxLength={200}
              disabled={isSending}
            />
            <button type="submit" disabled={!draft.trim() || isSending}>
              {isSending ? "…" : "→"}
            </button>
          </form>
        </div>
      )}
      <button type="button" className={`chat-fab ${hasNewMessages ? "has-new" : ""}`} onClick={() => setIsOpen((value) => !value)} aria-label={isOpen ? "Cerrar chat" : "Abrir chat"}>
        <span>💬</span>
        {hasNewMessages && !isOpen && <span className="chat-badge">{Math.max(messages.length - lastSeenCount, 1)}</span>}
      </button>
    </div>
  );
}
