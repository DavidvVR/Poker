"use client";

import { FormEvent, useState } from "react";
import { PokerTable } from "./PokerTable";
import { makeCode, normalizeRoomCode, type Screen } from "@/lib/poker";

export function PokerApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [room, setRoom] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const enter = (event: FormEvent, create = false) => {
    event.preventDefault();

    if (!name.trim() || (!create && code.trim().length < 4)) {
      return setNotice("Escribe tu nombre y un código de mesa válido.");
    }

    const nextRoom = create ? makeCode() : normalizeRoomCode(code);
    setRoom(nextRoom);
    setNotice("");
    setCopied(false);
    setScreen("lobby");
  };

  const goHome = () => {
    setScreen("home");
    setCode("");
    setNotice("");
    setCopied(false);
  };

  const handleCopyCode = async () => {
    if (!room) return;

    try {
      await navigator.clipboard?.writeText(room);
      setCopied(true);
      setNotice("Código copiado. Ya puedes enviarlo a tus amigos.");
    } catch {
      setNotice("No se pudo copiar automáticamente, pero puedes copiarlo manualmente.");
    }
  };

  if (screen === "table") {
    return <PokerTable onLeave={() => setScreen("home")} />;
  }

  return (
    <main className="site-shell">
      <nav className="nav">
        <div className="brand">
          <span>♠</span> Póker
        </div>
        <div className="nav-note">TEXAS HOLD&apos;EM · FICHAS FICTICIAS</div>
      </nav>

      {screen === "home" ? (
        <section className="home-card">
          <div className="flow-pill">Paso 1 · Identifícate</div>
          <p className="eyebrow">MESA PRIVADA</p>
          <h1>
            La partida empieza
            <br />
            cuando llegan tus amigos.
          </h1>
          <p className="intro">
            Crea una mesa privada, comparte el código y juega Texas Hold&apos;em desde cualquier dispositivo.
          </p>

          <div className="helper-card">
            Elige tu nombre y elige si crear una nueva mesa o entrar a una ya existente.
          </div>

          <form className="name-form" onSubmit={(event) => enter(event, true)}>
            <label htmlFor="name">¿Cómo te llamas?</label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre"
              maxLength={20}
            />
            <button className="primary" type="submit">
              Crear una mesa <span>→</span>
            </button>
          </form>

          <div className="or">
            <span />o únete a una mesa<span />
          </div>

          <form className="join-form" onSubmit={(event) => enter(event)}>
            <input
              aria-label="Código de mesa"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="CÓDIGO"
              maxLength={8}
            />
            <button className="secondary" type="submit">
              Unirme
            </button>
          </form>

          {notice && <p className="notice">{notice}</p>}
        </section>
      ) : (
        <section className="lobby-card">
          <div className="flow-pill">Paso 2 · Invita a tus amigos</div>
          <p className="eyebrow">SALA DE ESPERA</p>
          <h1>Invita a la mesa.</h1>
          <p className="intro">
            Comparte este código con tus amigos. La partida empieza cuando tú lo decidas.
          </p>

          <div className="room-code">{room}</div>
          <button className="copy" onClick={handleCopyCode} type="button">
            {copied ? "Código copiado" : "Copiar código"}
          </button>

          <div className="helper-card">
            {copied ? "Listo para compartir. Ya puedes enviar el código a tu grupo." : "Envía este código para que todos entren a la mesa."}
          </div>

          <div className="waiting-player">
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>Anfitrión · listo</small>
            </div>
            <i />
          </div>

          <div className="action-stack">
            <button className="primary start" onClick={() => setScreen("table")}>
              Empezar partida <span>→</span>
            </button>
            <button className="text-button" onClick={goHome}>
              Volver al inicio
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
