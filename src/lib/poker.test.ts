import test from "node:test";
import assert from "node:assert/strict";
import { buildDealtPokerState, evaluateBestHand, getBettingState, getHandSetup, getHandSummary, getPotPayouts, getTableRoles, getTurnHelp, getWinningPlayers } from "./poker.ts";

test("calcula la apuesta actual a partir de las acciones previas", () => {
  const state = getBettingState({
    previousActions: [{ action: "raise", amount: 20 }],
    playerContribution: 0,
  });

  assert.equal(state.currentBet, 20);
  assert.equal(state.requiredCallAmount, 20);
  assert.equal(state.canCheck, false);
  assert.equal(state.minimumRaise, 40);
});

test("permite pasar cuando no hay apuesta abierta", () => {
  const state = getBettingState({
    previousActions: [{ action: "check", amount: 0 }],
    playerContribution: 0,
  });

  assert.equal(state.currentBet, 0);
  assert.equal(state.requiredCallAmount, 0);
  assert.equal(state.canCheck, true);
});

test("define la subida mínima para la siguiente ronda de apuestas", () => {
  const state = getBettingState({
    previousActions: [{ action: "raise", amount: 20 }, { action: "raise", amount: 20 }],
    playerContribution: 20,
  });

  assert.equal(state.currentBet, 20);
  assert.equal(state.requiredCallAmount, 0);
  assert.equal(state.minimumRaise, 40);
  assert.equal(state.canCheck, false);
});

test("evalúa correctamente una escalera de color", () => {
  const result = evaluateBestHand([
    { value: "A", suit: "♠", label: "A♠" },
    { value: "K", suit: "♠", label: "K♠" },
    { value: "Q", suit: "♠", label: "Q♠" },
    { value: "J", suit: "♠", label: "J♠" },
    { value: "T", suit: "♠", label: "T♠" },
    { value: "2", suit: "♥", label: "2♥" },
    { value: "3", suit: "♦", label: "3♦" },
  ]);

  assert.equal(result.rank, 4);
  assert.equal(result.label, "Escalera");
});

test("genera un mensaje útil cuando no hay apuesta abierta y es tu turno", () => {
  const help = getTurnHelp({
    isMyTurn: true,
    currentBet: 0,
    requiredCallAmount: 0,
    minimumRaise: 20,
    roundLabel: "Preflop",
    currentPlayerName: "Tú",
    currentTurnName: "Tú",
  });

  assert.equal(help.title, "Tu turno");
  assert.equal(help.detail, "No hay apuesta abierta. Puedes pasar, subir o entrar en la mano en Preflop.");
  assert.equal(help.primaryAction, "Pasar");
});

test("genera un mensaje útil cuando hay que igualar una apuesta", () => {
  const help = getTurnHelp({
    isMyTurn: true,
    currentBet: 40,
    requiredCallAmount: 40,
    minimumRaise: 60,
    roundLabel: "Flop",
    currentPlayerName: "Tú",
    currentTurnName: "Tú",
  });

  assert.equal(help.title, "Debes igualar");
  assert.equal(help.detail, "La mesa abrió 40 fichas. Iguala 40 para seguir en la mano.");
  assert.equal(help.primaryAction, "Igualar");
});

test("resume la mano con un mensaje claro para la mesa", () => {
  const summary = getHandSummary({
    roundLabel: "Turn",
    pot: 120,
    communityCardsCount: 4,
    currentTurnName: "Ana",
    isShowdown: false,
    handResult: null,
    showdownSummary: null,
  });

  assert.equal(summary.title, "Ronda en curso");
  assert.equal(summary.detail, "Bote 120 · 4 cartas comunitarias visibles · Ana está actuando.");
  assert.equal(summary.badge, "Turn");
});

test("asigna dealer y ciegas a partir de la posición de la mesa", () => {
  const roles = getTableRoles({
    players: [{ name: "Tú" }, { name: "Ana" }, { name: "Luis" }],
    dealerIndex: 0,
  });

  assert.equal(roles.dealerName, "Tú");
  assert.equal(roles.smallBlindName, "Ana");
  assert.equal(roles.bigBlindName, "Luis");
});

test("rota el dealer y prepara ciegas y primer turno para la nueva mano", () => {
  const setup = getHandSetup({ playerCount: 3, currentDealerIndex: 0 });

  assert.deepEqual(setup, {
    dealerIndex: 1,
    smallBlindIndex: 2,
    bigBlindIndex: 0,
    firstTurnIndex: 1,
    smallBlind: 10,
    bigBlind: 20,
  });
});

test("en heads-up el dealer pone la ciega pequeña", () => {
  const setup = getHandSetup({ playerCount: 2, currentDealerIndex: 1 });

  assert.equal(setup.dealerIndex, 0);
  assert.equal(setup.smallBlindIndex, 0);
  assert.equal(setup.bigBlindIndex, 1);
  assert.equal(setup.firstTurnIndex, 0);
});

test("genera manos distintas incluso cuando el seed coincide", () => {
  const firstHand = buildDealtPokerState({ playerNames: ["Ana", "Luis"], seed: "same-seed", pot: 0 });
  const secondHand = buildDealtPokerState({ playerNames: ["Ana", "Luis"], seed: "same-seed", pot: 0 });

  assert.notDeepEqual(firstHand.players[0].hand, secondHand.players[0].hand);
  assert.notDeepEqual(firstHand.communityCards, secondHand.communityCards);
});

test("reparte el bote entre ganadores sin perder fichas", () => {
  const payouts = getPotPayouts({ pot: 101, winnerIds: ["ana", "luis"] });

  assert.deepEqual(payouts, { ana: 51, luis: 50 });
  assert.equal(Object.values(payouts).reduce((total, payout) => total + payout, 0), 101);
});

test("elige al ganador con mayor mano", () => {
  const winner = getWinningPlayers([
    {
      id: "uno",
      name: "Ana",
      hand: [
        { value: "A", suit: "♠", label: "A♠" },
        { value: "K", suit: "♥", label: "K♥" },
      ],
    },
    {
      id: "dos",
      name: "Luis",
      hand: [
        { value: "Q", suit: "♣", label: "Q♣" },
        { value: "J", suit: "♦", label: "J♦" },
      ],
    },
  ], [
    { value: "A", suit: "♦", label: "A♦" },
    { value: "3", suit: "♠", label: "3♠" },
    { value: "5", suit: "♣", label: "5♣" },
    { value: "7", suit: "♥", label: "7♥" },
    { value: "9", suit: "♠", label: "9♠" },
  ]);

  assert.equal(winner[0].name, "Ana");
  assert.equal(winner[0].evaluation.label, "Par");
});
