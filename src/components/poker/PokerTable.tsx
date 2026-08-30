"use client";

import { useState } from "react";
import { PokerCard } from "./PokerCard";

type PokerTableProps = {
  onLeave: () => void;
};

export function PokerTable({ onLeave }: PokerTableProps) {
  const [action, setAction] = useState("Tu turno");

  return (
    <main className="table-page">
      <header className="table-header">
        <button className="brand plain" onClick={onLeave}>
          <span>♠</span> Póker
        </button>
        <div className="room-pill">MESA PRIVADA</div>
        <button className="leave" onClick={onLeave}>
          Salir
        </button>
      </header>

      <section className="poker-table">
        <div className="felt">
          <div className="board-label">
            BOTE <strong>30</strong>
          </div>
          <div className="cards">
            <PokerCard value="A" suit="♠" />
            <PokerCard value="K" suit="♥" />
            <PokerCard value="7" suit="♦" />
          </div>

          <div className="player top">
            <span className="avatar warm">A</span>
            <strong>Ana</strong>
            <small>920</small>
          </div>

          <div className="player right">
            <span className="avatar blue">L</span>
            <strong>Luis</strong>
            <small>1080</small>
          </div>

          <div className="player bottom active">
            <span className="avatar">T</span>
            <strong>Tú</strong>
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
        <div>
          <button onClick={() => setAction("Te retiraste de esta mano")}>Retirarse</button>
          <button onClick={() => setAction("Pasaste")}>Pasar</button>
          <button className="call" onClick={() => setAction("Igualaste 20 fichas")}>
            Igualar 20
          </button>
        </div>
      </section>
    </main>
  );
}
