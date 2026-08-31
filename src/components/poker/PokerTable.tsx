"use client";

import { useEffect, useState } from "react";
import { createPokerTableView, getBettingState, getHandSummary, getNextRoundStage, getNextTurnIndex, getPlayerStateClassName, getPlayerStatusLabel, getTableRoles, getTurnHelp, getVisibleCommunityCards, getWinningPlayers, type GameRoundStage, type PlayerActionState, type PokerCardModel } from "@/lib/poker";
import { recordAction } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { getGameState, resetHand } from "@/lib/supabase/games";
import { ChatPanel } from "./ChatPanel";
import { PokerCard } from "./PokerCard";

type PokerTableProps = {
  roomCode: string;
  roomId: string;
  gameId: string;
  playerName: string;
  onLeave: () => void;
};

type PlayerSummaryEntry = {
  name: string;
  stack: number;
  status: string;
  state: PlayerActionState;
};

function getRoundDescription(roundLabel: string) {
  switch (roundLabel) {
    case "Flop":
      return "Se revelan tres cartas comunitarias y la acción se vuelve más intensa.";
    case "Turn":
      return "Se muestra la cuarta carta comunitaria y el bote empieza a tomar forma.";
    case "River":
      return "Se muestra la quinta y última carta comunitaria.";
    case "Showdown":
      return "La mano llega al showdown y se define el ganador.";
    default:
      return "Comienza la mano con las dos cartas ocultas de cada jugador.";
  }
}

function formatRealtimeAction(playerName: string, actionName: string, amount: number) {
  if (actionName === "fold") return `${playerName} se retiró.`;
  if (actionName === "check") return `${playerName} pasó.`;
  if (actionName === "call") return `${playerName} igualó ${amount} fichas.`;
  if (actionName === "raise") return `${playerName} subió ${amount} fichas.`;
  return `${playerName} actuó.`;
}

export function PokerTable({ roomCode, roomId, gameId, playerName, onLeave }: PokerTableProps) {
  const [action, setAction] = useState("Tu turno");
  const [pot, setPot] = useState(0);
  const [currentTurnName, setCurrentTurnName] = useState("Esperando turno");
  const [roundStage, setRoundStage] = useState<GameRoundStage>("preflop");
  const [roundLabel, setRoundLabel] = useState("Preflop");
  const [dealerPosition, setDealerPosition] = useState(0);
  const [blindValues, setBlindValues] = useState({ small: 10, big: 20 });
  const [realtimeStatus, setRealtimeStatus] = useState("Conectando");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [activePlayerName, setActivePlayerName] = useState(playerName || "Tú");
  const [playersSummary, setPlayersSummary] = useState<PlayerSummaryEntry[]>([
    { name: playerName || "Tú", stack: 1000, status: "Activa", state: "acting" },
    { name: "Ana", stack: 920, status: "Esperando", state: "idle" },
    { name: "Luis", stack: 1080, status: "Esperando", state: "idle" },
  ]);
  const [pokerState, setPokerState] = useState(() => createPokerTableView({ playerNames: [playerName || "Tú", "Ana", "Luis"], seed: gameId, pot: 0 }));
  const [actionCount, setActionCount] = useState(0);
  const [handResult, setHandResult] = useState<string | null>(null);
  const [isShowdown, setIsShowdown] = useState(false);
  const [roundNotice, setRoundNotice] = useState<string | null>(null);
  const [raiseAmount, setRaiseAmount] = useState<string | number>(20);
  const [showdownSummary, setShowdownSummary] = useState<string | null>(null);
  const [playerStates, setPlayerStates] = useState<Record<string, PlayerActionState>>(() => ({ [playerName || "Tú"]: "acting" }));
  const [bettingHistory, setBettingHistory] = useState<{ action: "fold" | "check" | "call" | "raise"; amount: number }[]>([]);
  const [recentActions, setRecentActions] = useState<string[]>([
    "La mano está lista para arrancar.",
    "Tu turno aparecerá aquí cuando llegue el momento.",
  ]);

  useEffect(() => {
    if (!gameId) return;

    const nextPokerState = createPokerTableView({ playerNames: [playerName || "Tú", "Ana", "Luis"], seed: gameId, pot: 0 });
    setPokerState(nextPokerState);
    setCurrentTurnName(nextPokerState.currentTurnName);
    setRoundStage("preflop");
    setRoundLabel("Preflop");
    setActionCount(0);
    setActivePlayerName(nextPokerState.currentTurnName);

    let isCanceled = false;
    let refreshVersion = 0;
    const client = createClient();
    const channel = client.channel(`game-${gameId}`);

    const refreshGame = async () => {
      const requestVersion = ++refreshVersion;
      try {
        const result = await getGameState(gameId);
        if (!isCanceled && requestVersion === refreshVersion) {
          const nextTurnName = result.game.currentTurnName ?? "Esperando turno";
          const nextRoundStage = (result.game.roundStage as GameRoundStage | undefined) ?? "preflop";
          const nextRoundLabel = result.game.roundLabel ?? "Preflop";
          const nextIsShowdown = (result.game.status ?? "playing") === "finished";
          const nextTurnPrompt = nextIsShowdown
            ? "Showdown. El resultado se define en esta mano."
            : nextTurnName === (playerName || "Tú")
              ? `Tu turno en ${nextRoundLabel}. Elige pasar, igualar o subir.`
              : `${nextTurnName} está actuando en ${nextRoundLabel}.`;
          const nextPlayersSummary: PlayerSummaryEntry[] = Array.isArray(result.players)
            ? result.players.map((player) => ({
                name: player.name,
                stack: player.stack ?? 1000,
                status: player.name === nextTurnName ? "Activa" : "Esperando",
                state: player.name === nextTurnName
                  ? "acting"
                  : result.actions.findLast((entry) => entry.userId === player.id)?.action === "fold"
                    ? "folded"
                    : result.actions.findLast((entry) => entry.userId === player.id)?.action === "check"
                      ? "checked"
                      : result.actions.findLast((entry) => entry.userId === player.id)?.action === "call"
                        ? "called"
                        : result.actions.findLast((entry) => entry.userId === player.id)?.action === "raise"
                          ? "raised"
                          : "idle",
              }))
            : [];

          setPot(result.game.pot ?? 0);
          setCurrentTurnName(nextTurnName);
          setPlayerStates((current) => ({ ...current, [nextTurnName]: "acting" }));
          setRoundStage(nextRoundStage);
          setRoundLabel(nextRoundLabel);
          setDealerPosition(result.game.dealerPosition ?? 0);
          setBlindValues({ small: result.game.smallBlind ?? 10, big: result.game.bigBlind ?? 20 });
          setActionCount(result.game.actionCount ?? 0);
          setIsShowdown(nextIsShowdown);
          setHandResult(result.game.resultMessage ?? null);
          if (nextIsShowdown) {
            const winners = getWinningPlayers(
              (Array.isArray(result.players) ? result.players : []).map((player) => ({ id: player.id, name: player.name, hand: Array.isArray(player.hand) ? player.hand : [] })),
              Array.isArray(result.game.communityCards) ? result.game.communityCards : []
            );
            setShowdownSummary(winners.length > 0 ? `${winners.map((winner) => winner.name).join(" y ")} gana con ${winners[0].evaluation.label}.` : "La mano terminó sin un ganador claro.");
          } else {
            setShowdownSummary(null);
          }
          setAction(nextTurnPrompt);
          setRoundNotice(nextRoundLabel !== roundLabel ? `Ronda ${nextRoundLabel}: ${getRoundDescription(nextRoundLabel)}` : null);
          setBettingHistory(result.actions.map((entry) => ({
            action: entry.action as "fold" | "check" | "call" | "raise",
            amount: entry.amount,
          })));
          setRecentActions(result.actions.length > 0
            ? result.actions.map((entry) => formatRealtimeAction(entry.playerName, entry.action, entry.amount))
            : [result.game.resultMessage ?? nextTurnPrompt]);
          setPlayersSummary((currentPlayersSummary) => nextPlayersSummary.length > 0 ? nextPlayersSummary : currentPlayersSummary);
          setPokerState((current) => ({
            ...current,
            roundStage: nextRoundStage,
            roundLabel: nextRoundLabel,
            currentTurnName: nextTurnName,
            communityCards: Array.isArray(result.game.communityCards) && result.game.communityCards.length > 0
              ? result.game.communityCards.map((card) => ({
                  value: card.value,
                  suit: card.suit,
                  label: card.label,
                }))
              : current.communityCards,
            players: Array.isArray(result.players)
              ? result.players.map((player) => ({
                  name: player.name,
                  hand: Array.isArray(player.hand) ? player.hand : [],
                  stack: player.stack ?? 1000,
                  status: player.name === nextTurnName ? "Activa" : getPlayerStatusLabel("idle"),
                }))
              : current.players,
          }));
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

    channel.on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gameId}` }, () => {
      void refreshGame();
    });

    const intervalId = window.setInterval(() => {
      void refreshGame();
    }, 2500);

    void channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setRealtimeStatus("En vivo");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeStatus("Reconectando");
      if (status === "CLOSED") setRealtimeStatus("Desconectado");
    });
    void refreshGame();

    return () => {
      isCanceled = true;
      refreshVersion += 1;
      window.clearInterval(intervalId);
      void client.removeChannel(channel);
    };
  }, [gameId]);

  const handleAction = async (label: string, actionName: string, amount = 0) => {
    setIsSubmittingAction(true);
    setErrorMessage(null);

    try {
      const result = await recordAction({ gameId, userName: playerName || "Tú", action: actionName, amount });
      setPot(result.game.pot);
      const nextTurnName = result.game.currentTurnName ?? "Esperando turno";
      const nextRoundLabelValue = result.game.roundLabel ?? roundLabel;
      const nextActionMessage = actionName === "fold"
        ? `Te retiraste. ${nextTurnName} toma el turno.`
        : actionName === "check"
          ? `Pasaste. ${nextTurnName} sigue con la acción.`
          : actionName === "call"
            ? `Igualaste ${amount} fichas. ${nextTurnName} sigue.`
            : `Subiste ${amount} fichas. ${nextTurnName} continúa.`;
      const nextActionPrompt = actionName === "fold"
        ? `Te retiraste. El turno pasa a ${nextTurnName}.`
        : actionName === "check"
          ? `Pasaste. El turno sigue en la mesa.`
          : actionName === "call"
            ? `Igualaste ${amount} fichas y mantienes la mano.`
            : `Subiste ${amount} fichas. La mesa responde.`;
      setAction(nextActionPrompt);
      const nextActionCount = actionCount + 1;
      const nextTurnIndex = getNextTurnIndex(pokerState.currentTurnIndex, pokerState.players.length);
      const nextStage = getNextRoundStage(roundStage, nextActionCount);
      const nextRoundLabel = nextStage === roundStage ? nextRoundLabelValue : nextStage === "flop" ? "Flop" : nextStage === "turn" ? "Turn" : nextStage === "river" ? "River" : "Showdown";
      setActionCount(nextActionCount);
      setCurrentTurnName(nextTurnName);
      setActivePlayerName(nextTurnName);
      setRoundStage(nextStage);
      setRoundLabel(nextRoundLabel);
      setIsShowdown(Boolean(result.game.status && result.game.status === "finished"));
      setHandResult((result.game as { resultMessage?: string }).resultMessage ?? null);
      setRoundNotice(nextRoundLabel !== roundLabel ? `Ronda ${nextRoundLabel}: ${getRoundDescription(nextRoundLabel)}` : null);
      setBettingHistory((current) => {
        const nextEntry = actionName === "raise"
          ? { action: "raise" as const, amount }
          : actionName === "call"
            ? { action: "call" as const, amount }
            : actionName === "check"
              ? { action: "check" as const, amount: 0 }
              : { action: "fold" as const, amount: 0 };

        return [...current.slice(-3), nextEntry];
      });
      setRecentActions((current) => {
        if (current[current.length - 1] === nextActionMessage) {
          return current;
        }
        return [...current.slice(-3), nextActionMessage];
      });
      setPokerState((current) => ({
        ...current,
        currentTurnIndex: nextTurnIndex,
        currentTurnName: nextTurnName,
        roundStage: nextStage,
        roundLabel: nextRoundLabel,
      }));
      setPlayersSummary((current) =>
        current.map((player) => {
          const nextState: PlayerActionState = player.name === nextTurnName
            ? "acting"
            : player.name === (playerName || "Tú")
              ? (actionName === "fold" ? "folded" : actionName === "check" ? "checked" : actionName === "call" ? "called" : "raised")
              : player.state ?? "idle";

          return {
            ...player,
            status: nextState === "acting" ? "Activa" : nextState === "folded" ? "Retirado" : nextState === "checked" ? "Check" : nextState === "called" ? "Call" : nextState === "raised" ? "Raise" : "Esperando",
            state: nextState,
          };
        })
      );
      setPlayerStates((current) => ({
        ...current,
        [playerName || "Tú"]: actionName === "fold" ? "folded" : actionName === "check" ? "checked" : actionName === "call" ? "called" : actionName === "raise" ? "raised" : current[playerName || "Tú"] ?? "idle",
        [nextTurnName]: "acting",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar la acción.";
      setAction(`Error: ${message}`);
      setErrorMessage(message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const visibleCommunityCards = getVisibleCommunityCards(roundStage, pokerState.communityCards);
  const myStack = playersSummary.find((p) => p.name === (playerName || "Tú"))?.stack ?? 0;
  const currentPlayerCards = pokerState.players.find((entry) => entry.name === (playerName || "Tú"))?.hand ?? [];
  const currentUserName = playerName || "Tú";
  const currentPlayerSeat = pokerState.players.find((entry) => entry.name === currentUserName) ?? pokerState.players[0];
  const otherPlayers = pokerState.players.filter((entry) => entry.name !== currentUserName);
  const tableSeats = [
    { position: "top", player: otherPlayers[0] ?? null },
    { position: "right", player: otherPlayers[1] ?? null },
    { position: "bottom", player: currentPlayerSeat ?? null },
  ];
  const isMyTurn = currentTurnName === currentUserName;
  const bettingState = getBettingState({ previousActions: bettingHistory, playerContribution: 0 });
  const turnHelp = getTurnHelp({
    isMyTurn,
    currentBet: bettingState.currentBet,
    requiredCallAmount: bettingState.requiredCallAmount,
    minimumRaise: bettingState.minimumRaise,
    roundLabel,
    currentPlayerName: currentUserName,
    currentTurnName,
  });
  const handSummary = getHandSummary({
    roundLabel,
    pot,
    communityCardsCount: visibleCommunityCards.length,
    currentTurnName,
    isShowdown,
    handResult,
    showdownSummary,
  });
  const tableRoles = getTableRoles({
    players: pokerState.players.map((player) => ({ name: player.name })),
    dealerIndex: dealerPosition,
  });
  const turnPrompt = isShowdown
    ? "Showdown. El resultado se define en esta mano."
    : isMyTurn
      ? `Tu turno en ${roundLabel}. Elige pasar, igualar o subir.`
      : `${currentTurnName} está actuando en ${roundLabel}.`;

  const handleNewHand = async () => {
    setIsSubmittingAction(true);
    setErrorMessage(null);

    try {
      const result = await resetHand({ gameId });
      setAction("Nueva mano lista. La mesa vuelve a estar preparada para repartir.");
      setIsShowdown(false);
      setHandResult(null);
      setShowdownSummary(null);
      setRoundNotice(`Nueva mano iniciada: ${getRoundDescription("Preflop")}`);
      setPot(result.game.pot ?? 0);
      setActionCount(result.game.actionCount ?? 0);
      setRoundStage((result.game.roundStage as GameRoundStage | undefined) ?? "preflop");
      setRoundLabel(result.game.roundLabel ?? "Preflop");
      setDealerPosition(result.game.dealerPosition ?? 0);
      setBlindValues({ small: result.game.smallBlind ?? 10, big: result.game.bigBlind ?? 20 });
      const nextTurnName = result.game.currentTurnName ?? (playerName || "Tú");
      setCurrentTurnName(nextTurnName);
      setActivePlayerName(nextTurnName);
      setPlayersSummary((Array.isArray(result.players) ? result.players : []).map((player) => ({
        name: player.name,
        stack: player.stack ?? 1000,
        status: player.name === nextTurnName ? "Activa" : "Esperando",
        state: player.name === nextTurnName ? "acting" : "idle",
      })));
      setPlayerStates({ [nextTurnName]: "acting" });
      setBettingHistory([]);
      setRecentActions([
        "Nueva mano preparada.",
        "El turno y las fichas se reinician para esta mano.",
      ]);
      setPokerState((current) => ({
        ...current,
        roundStage: (result.game.roundStage as GameRoundStage | undefined) ?? "preflop",
        roundLabel: result.game.roundLabel ?? "Preflop",
        currentTurnName: result.game.currentTurnName ?? (playerName || "Tú"),
        communityCards: Array.isArray(result.game.communityCards) && result.game.communityCards.length > 0
          ? result.game.communityCards.map((card) => ({
              value: card.value,
              suit: card.suit,
              label: card.label,
            }))
          : [],
        pot: result.game.pot ?? 0,
        players: Array.isArray(result.players)
          ? result.players.map((player) => ({
              name: player.name,
              hand: Array.isArray(player.hand) ? player.hand : [],
              stack: player.stack ?? 1000,
              status: player.name === nextTurnName ? "Activa" : "Esperando",
            }))
          : current.players,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo reiniciar la mano.";
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
        <div className="my-stack-pill">
          <span>{playerName || "Tú"}</span>
          <strong>{myStack}</strong>
          <small>fichas</small>
        </div>
        <span className={`realtime-indicator ${realtimeStatus === "En vivo" ? "online" : ""}`}>{realtimeStatus}</span>
        <button className="leave" onClick={onLeave}>
          Salir
        </button>
      </header>

      <section className="poker-table">
        <div className="table-status">
          <div>
            <strong>Turno</strong>
            <span>{currentTurnName}</span>
          </div>
          <div>
            <strong>Bote</strong>
            <span>{pot}</span>
          </div>
          <div>
            <strong>Dealer</strong>
            <span>{tableRoles.dealerName || "—"}</span>
          </div>
          <div>
            <strong>Ciegas</strong>
            <span>{blindValues.small}/{blindValues.big}</span>
          </div>
        </div>

        <div className="felt">
          <div className="board-label">
            BOTE <strong>{pot}</strong>
          </div>
          <div className="cards">
            {visibleCommunityCards.length > 0 ? (
              visibleCommunityCards.map((card) => <PokerCard key={`${card.value}-${card.suit}`} value={card.value} suit={card.suit} />)
            ) : (
              <PokerCard value="?" suit="" />
            )}
          </div>

          {tableSeats.map((seat) => {
            const seatState = seat.player?.name ? (playerStates[seat.player.name] ?? "idle") : "idle";
            return (
              <div key={`${seat.position}-${seat.player?.name ?? "seat"}`} className={`player ${seat.position} ${seat.player && activePlayerName === seat.player.name ? "active" : ""} ${seat.player ? "" : "empty"}`}>
                <span className={`avatar ${seat.position === "top" ? "warm" : seat.position === "right" ? "blue" : ""}`}>
                  {(seat.player?.name ?? "?").charAt(0).toUpperCase()}
                </span>
                <strong>{seat.player?.name ?? "Esperando"}</strong>
                <small>{seat.player ? `${seat.player.stack} fichas · ${seat.player.status}` : "Aún no hay jugador"}</small>
                {seat.player ? (
                  <>
                    <div className="seat-roles">
                      {seat.player.name === tableRoles.dealerName ? <span title="Dealer">D</span> : null}
                      {seat.player.name === tableRoles.smallBlindName ? <span title={`Ciega pequeña ${blindValues.small}`}>SB</span> : null}
                      {seat.player.name === tableRoles.bigBlindName ? <span title={`Ciega grande ${blindValues.big}`}>BB</span> : null}
                    </div>
                    <span className={`seat-state ${getPlayerStateClassName(seatState)}`}>{getPlayerStatusLabel(seatState)}</span>
                  </>
                ) : null}
                {seat.position === "bottom" && seat.player ? (
                  <div className="hand">
                    {currentPlayerCards.length > 0 ? (
                      currentPlayerCards.map((card) => <PokerCard key={`${card.value}-${card.suit}`} value={card.value} suit={card.suit} />)
                    ) : (
                      <PokerCard value="?" suit="" />
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="action-panel">
        {isShowdown ? (
          <div className="hand-result-panel" aria-live="polite">
            <div className="hand-result-heading">
              <span className="status-pill active">Resultado final</span>
              <strong>{handSummary.title}</strong>
            </div>
            <p>{showdownSummary ?? handResult ?? "La mano ha terminado."}</p>
            <div className="hand-result-stats">
              <span><small>Bote final</small><strong>{pot}</strong></span>
              <span><small>Mesa</small><strong>{visibleCommunityCards.length} cartas</strong></span>
            </div>
            <button className="new-hand-primary" onClick={handleNewHand} disabled={isSubmittingAction}>
              Jugar nueva mano
            </button>
          </div>
        ) : null}
        {roundNotice ? <div className="notice round-banner">{roundNotice}</div> : null}
        <div className="side-status-card">
          <span className="status-pill active">Ronda en curso</span>
          <strong>{roundLabel}</strong>
          <p>{roundNotice ?? getRoundDescription(roundLabel)}</p>
        </div>
        <div className="action-callout">
          <span className={`status-pill ${isMyTurn ? "active" : ""}`}>{turnHelp.title}</span>
          <p>{turnHelp.detail}</p>
        </div>
        {errorMessage && <p className="notice">{errorMessage}</p>}
        <div className="player-summary-list">
          {playersSummary.map((player) => (
            <div key={player.name} className={`player-summary-item ${getPlayerStateClassName(player.state ?? "idle")}`}>
              <strong>{player.name}</strong>
              <span>{player.stack} fichas</span>
              <small>{player.status}</small>
            </div>
          ))}
        </div>
        <div>
          <button onClick={() => handleAction("Te retiraste de esta mano", "fold", 0)} disabled={isSubmittingAction || isShowdown || !isMyTurn}>
            Retirarse
          </button>
          <button onClick={() => handleAction("Pasaste", "check", 0)} disabled={isSubmittingAction || isShowdown || !isMyTurn || !bettingState.canCheck}>
            Pasar
          </button>
          <button className="call" onClick={() => handleAction(`Igualaste ${bettingState.requiredCallAmount} fichas`, "call", bettingState.requiredCallAmount)} disabled={isSubmittingAction || isShowdown || !isMyTurn || bettingState.requiredCallAmount <= 0}>
            Igualar {bettingState.requiredCallAmount}
          </button>
          <button onClick={() => handleAction(`Subiste ${Number(raiseAmount) || 0} fichas`, "raise", Number(raiseAmount) || 0)} disabled={isSubmittingAction || isShowdown || !isMyTurn || Number(raiseAmount) <= 0}>
            Subir {Number(raiseAmount) || 0}
          </button>
          <button onClick={handleNewHand} disabled={isSubmittingAction || !isShowdown}>
            Nueva mano
          </button>
        </div>
        <div className="raise-control">
          <label htmlFor="raise-amount">Cantidad de subida</label>
          <input
            id="raise-amount"
            type="number"
            min="10"
            step="10"
            value={raiseAmount}
            onChange={(event) => {
              const nextValue = event.target.value;
              setRaiseAmount(nextValue === "" ? "" : Number(nextValue));
            }}
          />
        </div>
      </section>

      <ChatPanel roomId={roomId} playerName={playerName || "Tú"} />
    </main>
  );
}
