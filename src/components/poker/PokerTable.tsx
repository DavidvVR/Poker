"use client";

import { useEffect, useState } from "react";
import { recordAction } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { getGameState } from "@/lib/supabase/games";
import { PokerCard } from "./PokerCard";

type PokerTableProps = {
  roomCode: string;
  gameId: string;
  playerName: string;
  onLeave: () => void;
};

export function PokerTable({ roomCode, gameId, playerName, onLeave }: PokerTableProps) {
  const [action, setAction] = useState("Tu turno");
  const [pot, setPot] = useState(0);
  const [currentTurnName, setCurrentTurnName] = useState("Esperando turno");
  const [roundLabel, setRoundLabel] = useState("Preflop");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [activePlayerName, setActivePlayerName] = useState(playerName || "Tú");
  const [playersSummary, setPlayersSummary] = useState([
    { name: playerName || "Tú", stack: 1000, status: "Activa" },
    { name: "Ana", stack: 920, status: "Esperando" },
    { name: "Luis", stack: 1080, status: "Esperando" },
  ]);

  useEffect(() => {
    if (!gameId) return;

    let isCanceled = false;
    const client = createClient();
    const channel = client.channel(`game-${gameId}`);

    const refreshGame = async () => {
      try {
        const result = await getGameState(gameId);
        if (!isCanceled) {
          setPot(result.game.pot ?? 0);
          setCurrentTurnName(result.game.currentTurnName ?? "Esperando turno");
          setRoundLabel(result.game.roundLabel ?? "Preflop");
        }
      } catch (error) {
        console.error(error);
      }
    };

    channel.on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` }, () => {
      void refreshGame();
    });

    channel.on("postgres_changes", { event: "*", schema: "public", table: "game_actions", filter: `game_id=eq.${gameId}` }, () => {
      void refreshGame();
    });

    void channel.subscribe();
    void refreshGame();

    return () => {
      isCanceled = true;
      void client.removeChannel(channel);
    };
  }, [gameId]);

  const handleAction = async (label: string, actionName: string, amount = 0) => {
    setIsSubmittingAction(true);
    setErrorMessage(null);

    try {
      const result = await recordAction({ gameId, userName: playerName || "Tú", action: actionName, amount });
      setAction(label);
      setPot(result.game.pot);
      const nextTurnName = result.game.currentTurnName ?? "Esperando turno";
      setCurrentTurnName(nextTurnName);
      setActivePlayerName(nextTurnName);
      setRoundLabel(result.game.roundLabel ?? "Preflop");
      setPlayersSummary((current) =>
        current.map((player, index) => {
          if (player.name === nextTurnName) {
            return { ...player, status: "Activa" };
          }

          if (player.name === activePlayerName) {
            return { ...player, status: "Esperando" };
          }

          if (index === 0 && player.name === (playerName || "Tú")) {
            return { ...player, status: player.name === nextTurnName ? "Activa" : "Esperando" };
          }

          return player;
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar la acción.";
      setAction(`Error: ${message}`);
      setErrorMessage(message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <main className="table-page">
      <header className="table-header">
        <button className="brand plain" onClick={onLeave}>
          <span>♠</span> Póker
        </button>
        <div className="room-pill">MESA {roomCode}</div>
        <button className="leave" onClick={onLeave}>
          Salir
        </button>
      </header>

      <section className="poker-table">
        <div className="table-status">
          <div>
            <strong>Ronda</strong>
            <span>{roundLabel}</span>
          </div>
          <div>
            <strong>Turno</strong>
            <span>{currentTurnName}</span>
          </div>
          <div>
            <strong>Bote</strong>
            <span>{pot}</span>
          </div>
        </div>

        <div className="felt">
          <div className="board-label">
            BOTE <strong>{pot}</strong>
          </div>
          <div className="cards">
            <PokerCard value="A" suit="♠" />
            <PokerCard value="K" suit="♥" />
            <PokerCard value="7" suit="♦" />
          </div>

          <div className={`player top ${activePlayerName === "Ana" ? "active" : ""}`}>
            <span className="avatar warm">A</span>
            <strong>Ana</strong>
            <small>920</small>
          </div>

          <div className={`player right ${activePlayerName === "Luis" ? "active" : ""}`}>
            <span className="avatar blue">L</span>
            <strong>Luis</strong>
            <small>1080</small>
          </div>

          <div className={`player bottom ${activePlayerName === (playerName || "Tú") ? "active" : ""}`}>
            <span className="avatar">T</span>
            <strong>{playerName || "Tú"}</strong>
            <small>1000</small>
            <div className="hand">
              <PokerCard value="A" suit="♥" />
              <PokerCard value="Q" suit="♥" />
            </div>
          </div>
        </div>
      </section>

      <section className="action-panel">
        <p>{action}</p>
        {errorMessage && <p className="notice">{errorMessage}</p>}
        <div className="player-summary-list">
          {playersSummary.map((player) => (
            <div key={player.name} className="player-summary-item">
              <strong>{player.name}</strong>
              <span>{player.stack} fichas</span>
              <small>{player.status}</small>
            </div>
          ))}
        </div>
        <div>
          <button onClick={() => handleAction("Te retiraste de esta mano", "fold", 0)} disabled={isSubmittingAction}>
            Retirarse
          </button>
          <button onClick={() => handleAction("Pasaste", "check", 0)} disabled={isSubmittingAction}>
            Pasar
          </button>
          <button className="call" onClick={() => handleAction("Igualaste 20 fichas", "call", 20)} disabled={isSubmittingAction}>
            Igualar 20
          </button>
        </div>
      </section>
    </main>
  );
}
