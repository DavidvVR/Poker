"use client";

import { FormEvent, useEffect, useState } from "react";
import { PokerTable } from "./PokerTable";
import { makeCode, normalizeRoomCode, type Screen } from "@/lib/poker";
import { createClient } from "@/lib/supabase/client";
import { createRoom, getRoomState, joinRoom, type RoomPlayerSummary } from "@/lib/supabase/rooms";
import { startGame } from "@/lib/supabase/games";

export function PokerApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [players, setPlayers] = useState<RoomPlayerSummary[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState("Conectando");

  const enter = async (event: FormEvent, create = false) => {
    event.preventDefault();

    if (!name.trim() || (!create && code.trim().length < 4)) {
      return setNotice("Escribe tu nombre y un código de mesa válido.");
    }

    if (create) {
      setIsCreatingRoom(true);
      setNotice("Creando la sala...");

      try {
        const nextRoomCode = makeCode();
        const result = await createRoom({ code: nextRoomCode, hostName: name.trim() });
        setRoomId(result.room.id);
        setRoomCode(result.room.code);
        setPlayers(result.players ?? []);
        setNotice("");
        setCopied(false);
        setScreen("lobby");
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo crear la sala.";
        console.error(message);
        setNotice(`No se pudo crear la sala. ${message}`);
      } finally {
        setIsCreatingRoom(false);
      }

      return;
    }

    setIsJoiningRoom(true);
    setNotice("Uniéndote a la sala...");

    try {
      const nextRoom = normalizeRoomCode(code);
      const result = await joinRoom({ code: nextRoom, userName: name.trim() });
      setRoomId(result.room.id);
      setRoomCode(result.room.code);
      setPlayers(result.players ?? []);
      setNotice("");
      setCopied(false);
      setScreen("lobby");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo unir a la sala.";
      console.error(message);
      setNotice(`No se pudo unir a la sala. ${message}`);
    } finally {
      setIsJoiningRoom(false);
    }
  };

  useEffect(() => {
    if (screen !== "lobby" || !roomCode || !roomId) {
      return;
    }

    let isCanceled = false;
    let refreshVersion = 0;
    const client = createClient();
    const channel = client.channel(`room-${roomId}`);

    const refreshPlayers = async () => {
      const requestVersion = ++refreshVersion;
      try {
        const data = await getRoomState(roomCode);
        if (!isCanceled && requestVersion === refreshVersion) {
          setPlayers(data.players ?? []);
          if (data.gameId) {
            setGameId(data.gameId);
            setNotice("");
            setScreen("table");
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    channel.on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => {
      void refreshPlayers();
    });

    channel.on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` }, () => {
      void refreshPlayers();
    });

    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "games", filter: `room_id=eq.${roomId}` }, () => {
      void refreshPlayers();
    });

    void channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setRealtimeStatus("En vivo");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeStatus("Reconectando");
      if (status === "CLOSED") setRealtimeStatus("Desconectado");
    });
    void refreshPlayers();

    return () => {
      isCanceled = true;
      refreshVersion += 1;
      void client.removeChannel(channel);
    };
  }, [roomCode, roomId, screen]);

  const goHome = () => {
    setScreen("home");
    setCode("");
    setRoomId("");
    setRoomCode("");
    setNotice("");
    setCopied(false);
    setPlayers([]);
    setGameId(null);
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;

    try {
      await navigator.clipboard?.writeText(roomCode);
      setCopied(true);
      setNotice("Código copiado. Ya puedes enviarlo a tus amigos.");
    } catch {
      setNotice("No se pudo copiar automáticamente, pero puedes copiarlo manualmente.");
    }
  };

  const handleStartGame = async () => {
    if (!roomId) return;

    setIsStartingGame(true);
    setNotice("Iniciando la partida...");

    try {
      const result = await startGame({ roomId });
      setGameId(result.game.id);
      console.info("Partida iniciada", result.game.id);
      setNotice("");
      setScreen("table");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar la partida.";
      console.error(message);
      setNotice(`No se pudo iniciar la partida. ${message}`);
    } finally {
      setIsStartingGame(false);
    }
  };

  if (screen === "table") {
    return <PokerTable roomCode={roomCode} roomId={roomId} gameId={gameId ?? ""} playerName={name} onLeave={() => setScreen("home")} />;
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
            <button className="primary" type="submit" disabled={isCreatingRoom}>
              {isCreatingRoom ? "Creando..." : "Crear una mesa"} <span>→</span>
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
            <button className="secondary" type="submit" disabled={isJoiningRoom}>
              {isJoiningRoom ? "Uniéndote..." : "Unirme"}
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

          <div className="room-code">{roomCode}</div>
          <button className="copy" onClick={handleCopyCode} type="button">
            {copied ? "Código copiado" : "Copiar código"}
          </button>

          <div className="helper-card">
            {copied ? "Listo para compartir. Ya puedes enviar el código a tu grupo." : "Envía este código para que todos entren a la mesa."}
          </div>

          <div className="players-card">
            <div className="players-header">
              <strong>Jugadores en la sala</strong>
              <span className={`realtime-indicator ${realtimeStatus === "En vivo" ? "online" : ""}`}>{realtimeStatus}</span>
              <span>{players.length} {players.length === 1 ? "jugador" : "jugadores"}</span>
            </div>

            {players.length > 0 ? (
              <ul className="player-list">
                {players.map((player) => (
                  <li key={player.id} className="player-item">
                    <span className="avatar small">{player.name.slice(0, 1).toUpperCase()}</span>
                    <div className="player-meta">
                      <strong>{player.name}</strong>
                      <small>{player.isHost ? "Anfitrión" : player.isReady ? "Listo" : "Esperando"}</small>
                    </div>
                    <span className={`player-badge ${player.isHost ? "host" : player.isReady ? "ready" : "waiting"}`}>
                      {player.isHost ? "Host" : player.isReady ? "Listo" : "Espera"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="players-empty">Aún no hay jugadores en la mesa.</p>
            )}
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
            <button className="primary start" onClick={handleStartGame} disabled={isStartingGame}>
              {isStartingGame ? "Iniciando..." : "Empezar partida"} <span>→</span>
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
