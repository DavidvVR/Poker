"use client";

import { FormEvent, useState } from "react";

type Screen = "home" | "lobby" | "table";
const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState("");
  const [notice, setNotice] = useState("");
  const enter = (event: FormEvent, create = false) => {
    event.preventDefault();
    if (!name.trim() || (!create && code.trim().length < 4)) return setNotice("Escribe tu nombre y un código de mesa válido.");
    setRoom(create ? makeCode() : code.trim().toUpperCase()); setNotice(""); setScreen("lobby");
  };
  if (screen === "table") return <PokerTable onLeave={() => setScreen("home")} />;
  return <main className="site-shell">
    <nav className="nav"><div className="brand"><span>♠</span> Póker</div><div className="nav-note">TEXAS HOLD&apos;EM · FICHAS FICTICIAS</div></nav>
    {screen === "home" ? <section className="home-card">
      <p className="eyebrow">MESA PRIVADA</p><h1>La partida empieza<br />cuando llegan tus amigos.</h1>
      <p className="intro">Crea una mesa privada, comparte el código y juega Texas Hold&apos;em desde cualquier dispositivo.</p>
      <form className="name-form" onSubmit={(e) => enter(e, true)}><label htmlFor="name">¿Cómo te llamas?</label><input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" maxLength={20}/><button className="primary">Crear una mesa <span>→</span></button></form>
      <div className="or"><span/>o únete a una mesa<span/></div>
      <form className="join-form" onSubmit={(e) => enter(e)}><input aria-label="Código de mesa" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CÓDIGO" maxLength={8}/><button className="secondary">Unirme</button></form>{notice && <p className="notice">{notice}</p>}
    </section> : <section className="lobby-card">
      <p className="eyebrow">SALA DE ESPERA</p><h1>Invita a la mesa.</h1><p className="intro">Comparte este código con tus amigos. La partida empieza cuando tú lo decidas.</p>
      <div className="room-code">{room}</div><button className="copy" onClick={() => navigator.clipboard?.writeText(room)}>Copiar código</button>
      <div className="waiting-player"><span className="avatar">{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>Anfitrión · listo</small></div><i/></div>
      <button className="primary start" onClick={() => setScreen("table")}>Empezar partida <span>→</span></button><button className="text-button" onClick={() => setScreen("home")}>Cancelar</button>
    </section>}</main>;
}

function PokerTable({ onLeave }: { onLeave: () => void }) {
  const [action, setAction] = useState("Tu turno");
  return <main className="table-page"><header className="table-header"><button className="brand plain" onClick={onLeave}><span>♠</span> Póker</button><div className="room-pill">MESA PRIVADA</div><button className="leave" onClick={onLeave}>Salir</button></header>
    <section className="poker-table"><div className="felt"><div className="board-label">BOTE <strong>30</strong></div><div className="cards"><Card value="A" suit="♠"/><Card value="K" suit="♥"/><Card value="7" suit="♦"/></div>
      <div className="player top"><span className="avatar warm">A</span><strong>Ana</strong><small>920</small></div><div className="player right"><span className="avatar blue">L</span><strong>Luis</strong><small>1080</small></div>
      <div className="player bottom active"><span className="avatar">T</span><strong>Tú</strong><small>1000</small><div className="hand"><Card value="A" suit="♥"/><Card value="Q" suit="♥"/></div></div></div></section>
    <section className="action-panel"><p>{action}</p><div><button onClick={() => setAction("Te retiraste de esta mano")}>Retirarse</button><button onClick={() => setAction("Pasaste")}>Pasar</button><button className="call" onClick={() => setAction("Igualaste 20 fichas")}>Igualar 20</button></div></section></main>;
}
function Card({ value, suit }: { value: string; suit: string }) { const red = suit === "♥" || suit === "♦"; return <div className={`card ${red ? "red" : ""}`}><b>{value}</b><span>{suit}</span></div>; }
