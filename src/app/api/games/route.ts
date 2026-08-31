import { NextRequest, NextResponse } from "next/server";
import { buildDealtPokerState, getHandSetup, getRoundLabel, getRoundStageFromActionCount, getShowdownResultMessage } from "@/lib/poker";
import { createAdminClient } from "@/lib/supabase/admin";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return "No se pudo completar la acción con Supabase.";
}

function mapGamePlayers(rows: Array<Record<string, unknown>> | null | undefined, hostId: string | null) {
  return (rows ?? [])
    .map((row) => ({
      id: (row as { id?: string }).id,
      name: ((row as { profiles?: { full_name?: string | null } }).profiles?.full_name) ?? "Jugador",
      isHost: (row as { user_id?: string }).user_id === hostId,
      isReady: Boolean((row as { is_ready?: boolean }).is_ready),
      seat: (row as { seat?: number }).seat ?? 0,
    }))
    .sort((left, right) => left.seat - right.seat);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body?.action === "reset-hand") {
      const adminClient = createAdminClient();
      const { gameId } = body as { gameId: string };

      if (!gameId) {
        return NextResponse.json({ error: "Falta el id de la partida." }, { status: 400 });
      }

      const { data: gameData, error: gameLoadError } = await adminClient
        .from("games")
        .select("id, room_id, dealer_position")
        .eq("id", gameId)
        .single();

      if (gameLoadError || !gameData) {
        return NextResponse.json({ error: getErrorMessage(gameLoadError ?? new Error("No se encontró la partida.")) }, { status: 404 });
      }

      const { data: roomPlayers, error: playersError } = await adminClient
        .from("room_players")
        .select("id, seat, is_ready, user_id, profiles(full_name)")
        .eq("room_id", gameData.room_id)
        .order("seat");

      if (playersError) {
        return NextResponse.json({ error: getErrorMessage(playersError) }, { status: 400 });
      }

      const playerNames = (roomPlayers ?? []).map((row, index) => {
        const profileName = ((row as { profiles?: { full_name?: string | null } }).profiles?.full_name)?.trim();
        return profileName || `Jugador ${index + 1}`;
      });
      const handSetup = getHandSetup({
        playerCount: roomPlayers?.length ?? 0,
        currentDealerIndex: gameData.dealer_position ?? 0,
      });
      const dealtState = buildDealtPokerState({ playerNames, seed: `${gameId}-${handSetup.dealerIndex}`, pot: 0 });
      const { data: existingGamePlayers, error: existingPlayersError } = await adminClient
        .from("game_players")
        .select("user_id, chips, position")
        .eq("game_id", gameId)
        .order("position");

      if (existingPlayersError) {
        return NextResponse.json({ error: getErrorMessage(existingPlayersError) }, { status: 400 });
      }

      const playerUpdates = (existingGamePlayers ?? []).map((row, index) => {
        const currentChips = (row as { chips?: number }).chips ?? 1000;
        const blind = index === handSetup.smallBlindIndex
          ? handSetup.smallBlind
          : index === handSetup.bigBlindIndex
            ? handSetup.bigBlind
            : 0;
        const paidBlind = Math.min(currentChips, blind);

        return {
          userId: (row as { user_id?: string }).user_id,
          chips: currentChips - paidBlind,
          paidBlind,
          hand: dealtState.players[index]?.hand ?? [],
        };
      });
      const nextPot = playerUpdates.reduce((total, player) => total + player.paidBlind, 0);
      const nextTurnUserId = playerUpdates[handSetup.firstTurnIndex]?.userId ?? null;

      const { error: updateGameError } = await adminClient
        .from("games")
        .update({
          pot: nextPot,
          current_turn: nextTurnUserId,
          dealer_position: handSetup.dealerIndex,
          status: "playing",
        })
        .eq("id", gameId);

      if (updateGameError) {
        return NextResponse.json({ error: getErrorMessage(updateGameError) }, { status: 400 });
      }

      const resetPlayerResults = await Promise.all(playerUpdates.map((player) => adminClient
        .from("game_players")
        .update({
          chips: player.chips,
          folded: false,
          all_in: player.chips === 0,
          hand: player.hand,
        })
        .eq("game_id", gameId)
        .eq("user_id", player.userId)));
      const resetPlayersError = resetPlayerResults.find((result) => result.error)?.error;

      if (resetPlayersError) {
        return NextResponse.json({ error: getErrorMessage(resetPlayersError) }, { status: 400 });
      }

      const { error: clearActionsError } = await adminClient
        .from("game_actions")
        .delete()
        .eq("game_id", gameId);

      if (clearActionsError) {
        return NextResponse.json({ error: getErrorMessage(clearActionsError) }, { status: 400 });
      }

      const { data: refreshedGamePlayers, error: refreshedGamePlayersError } = await adminClient
        .from("game_players")
        .select("user_id, hand, chips, folded, all_in, position, profiles(full_name)")
        .eq("game_id", gameId)
        .order("position");

      if (refreshedGamePlayersError) {
        return NextResponse.json({ error: getErrorMessage(refreshedGamePlayersError) }, { status: 400 });
      }

      const players = (refreshedGamePlayers ?? [])
        .map((row, index) => ({
          id: (row as { user_id?: string }).user_id ?? `player-${index}`,
          name: ((row as { profiles?: { full_name?: string | null } }).profiles?.full_name) ?? `Jugador ${index + 1}`,
          hand: Array.isArray((row as { hand?: unknown }).hand)
            ? ((row as { hand?: Array<{ value?: string; suit?: string; label?: string }> }).hand ?? []).map((card) => ({
                value: card?.value ?? "?",
                suit: card?.suit ?? "",
                label: card?.label ?? "?",
              }))
            : [],
          stack: (row as { chips?: number }).chips ?? 1000,
          status: index === handSetup.firstTurnIndex ? "Activa" : "Esperando",
          seat: (row as { position?: number }).position ?? index,
        }))
        .sort((left, right) => left.seat - right.seat);

      return NextResponse.json({
        game: {
          id: gameId,
          roomId: gameData.room_id,
          status: "playing",
          pot: nextPot,
          currentTurn: nextTurnUserId,
          currentTurnName: players[handSetup.firstTurnIndex]?.name ?? null,
          dealerPosition: handSetup.dealerIndex,
          smallBlind: handSetup.smallBlind,
          bigBlind: handSetup.bigBlind,
          roundStage: "preflop",
          roundLabel: getRoundLabel("preflop"),
          actionCount: 0,
          communityCards: dealtState.communityCards,
        },
        players,
      });
    }

    if (body?.action !== "start") {
      return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { roomId } = body as { roomId: string };

    if (!roomId) {
      return NextResponse.json({ error: "Falta el id de la sala." }, { status: 400 });
    }

    const { data: existingGame, error: existingGameError } = await adminClient
      .from("games")
      .select("id")
      .eq("room_id", roomId)
      .maybeSingle();

    if (existingGameError) {
      return NextResponse.json({ error: getErrorMessage(existingGameError) }, { status: 400 });
    }

    if (existingGame) {
      return NextResponse.json({ error: "La sala ya tiene una partida activa" }, { status: 409 });
    }

    const { data: roomPlayers, error: playersError } = await adminClient
      .from("room_players")
      .select("id, seat, is_ready, user_id, profiles(full_name)")
      .eq("room_id", roomId)
      .order("seat");

    if (playersError) {
      return NextResponse.json({ error: getErrorMessage(playersError) }, { status: 400 });
    }

    if (!roomPlayers?.length) {
      return NextResponse.json({ error: "No hay jugadores suficientes en la sala para iniciar la partida." }, { status: 400 });
    }

    const handSetup = getHandSetup({ playerCount: roomPlayers.length, currentDealerIndex: 0, rotateDealer: false });
    const firstPlayer = roomPlayers[handSetup.firstTurnIndex];
    const initialTurnUserId = firstPlayer ? (firstPlayer as { user_id?: string }).user_id : null;
    const initialRoundStage = getRoundStageFromActionCount(0);
    const playerNames = (roomPlayers ?? []).map((row, index) => {
      const profileName = ((row as { profiles?: { full_name?: string | null } }).profiles?.full_name)?.trim();
      return profileName || `Jugador ${index + 1}`;
    });
    const dealtState = buildDealtPokerState({ playerNames, seed: roomId, pot: 0 });
    const initialPot = handSetup.smallBlind + handSetup.bigBlind;

    const { data: gameData, error: gameError } = await adminClient
      .from("games")
      .insert({
        room_id: roomId,
        current_turn: initialTurnUserId,
        dealer_position: 0,
        pot: initialPot,
        status: "waiting",
      })
      .select("id, room_id, status, pot, current_turn, dealer_position")
      .single();

    if (gameError || !gameData) {
      return NextResponse.json({ error: getErrorMessage(gameError ?? new Error("No se pudo crear la partida.")) }, { status: 400 });
    }

    const gamePlayers = (roomPlayers ?? []).map((row, index) => ({
      game_id: gameData.id,
      user_id: (row as { user_id?: string }).user_id,
      chips: 1000 - (index === handSetup.smallBlindIndex ? handSetup.smallBlind : index === handSetup.bigBlindIndex ? handSetup.bigBlind : 0),
      position: (row as { seat?: number }).seat ?? 0,
      folded: false,
      all_in: false,
      hand: dealtState.players[index]?.hand ?? [],
    }));

    const { error: clearGamePlayersError } = await adminClient
      .from("game_players")
      .delete()
      .eq("game_id", gameData.id);

    if (clearGamePlayersError) {
      return NextResponse.json({ error: getErrorMessage(clearGamePlayersError) }, { status: 400 });
    }

    const { error: gamePlayersError } = await adminClient
      .from("game_players")
      .insert(gamePlayers);

    if (gamePlayersError) {
      return NextResponse.json({ error: getErrorMessage(gamePlayersError) }, { status: 400 });
    }

    const players = (roomPlayers ?? [])
      .map((row, index) => ({
        id: (row as { id?: string }).id ?? `${gameData.id}-${index}`,
        name: ((row as { profiles?: { full_name?: string | null } }).profiles?.full_name) ?? `Jugador ${index + 1}`,
        hand: dealtState.players[index]?.hand ?? [],
        stack: 1000 - (index === handSetup.smallBlindIndex ? handSetup.smallBlind : index === handSetup.bigBlindIndex ? handSetup.bigBlind : 0),
        status: index === handSetup.firstTurnIndex ? "Activa" : "Esperando",
        seat: (row as { seat?: number }).seat ?? index,
      }))
      .sort((left, right) => left.seat - right.seat);

    return NextResponse.json({
      game: {
        id: gameData.id,
        roomId: gameData.room_id,
        status: gameData.status,
        pot: gameData.pot,
        currentTurn: gameData.current_turn,
        currentTurnName: firstPlayer ? ((firstPlayer as { profiles?: { full_name?: string | null } }).profiles?.full_name ?? "Jugador") : null,
        dealerPosition: gameData.dealer_position,
        roundStage: initialRoundStage,
        roundLabel: getRoundLabel(initialRoundStage),
        smallBlind: handSetup.smallBlind,
        bigBlind: handSetup.bigBlind,
        communityCards: dealtState.communityCards,
      },
      players,
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json({ error: "Falta el id de la partida" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: gameData, error: gameError } = await adminClient
      .from("games")
      .select("id, room_id, status, pot, current_turn, dealer_position")
      .eq("id", gameId)
      .single();

    if (gameError || !gameData) {
      return NextResponse.json({ error: getErrorMessage(gameError ?? new Error("No se encontró la partida.")) }, { status: 404 });
    }

    const { data: turnProfile, error: turnProfileError } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", gameData.current_turn)
      .maybeSingle();

    if (turnProfileError) {
      return NextResponse.json({ error: getErrorMessage(turnProfileError) }, { status: 400 });
    }

    const { data: gamePlayers, error: gamePlayersError } = await adminClient
      .from("game_players")
      .select("user_id, hand, chips, folded, all_in, position, profiles(full_name)")
      .eq("game_id", gameId)
      .order("position");

    if (gamePlayersError) {
      return NextResponse.json({ error: getErrorMessage(gamePlayersError) }, { status: 400 });
    }

    const { data: gameActions, error: gameActionsError } = await adminClient
      .from("game_actions")
      .select("id, user_id, action, amount, created_at, profiles(full_name)")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(4);

    if (gameActionsError) {
      return NextResponse.json({ error: getErrorMessage(gameActionsError) }, { status: 400 });
    }

    const { count: actionCount, error: actionCountError } = await adminClient
      .from("game_actions")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId);

    const normalizedActionCount = actionCountError ? 0 : (actionCount ?? 0);
    const roundStage = getRoundStageFromActionCount(normalizedActionCount);
    const roundLabel = getRoundLabel(roundStage);
    const players = (gamePlayers ?? [])
      .map((row, index) => ({
        id: (row as { user_id?: string }).user_id ?? `player-${index}`,
        name: ((row as { profiles?: { full_name?: string | null } }).profiles?.full_name) ?? `Jugador ${index + 1}`,
        hand: Array.isArray((row as { hand?: unknown }).hand)
          ? ((row as { hand?: Array<{ value?: string; suit?: string; label?: string }> }).hand ?? []).map((card) => ({
              value: card?.value ?? "?",
              suit: card?.suit ?? "",
              label: card?.label ?? "?",
            }))
          : [],
        stack: (row as { chips?: number }).chips ?? 1000,
        status: (row as { folded?: boolean }).folded ? "Retirado" : "Esperando",
        seat: (row as { position?: number }).position ?? index,
      }))
      .sort((left, right) => left.seat - right.seat);
    const actions = (gameActions ?? []).map((row) => ({
      id: (row as { id?: string }).id ?? "",
      userId: (row as { user_id?: string }).user_id ?? "",
      playerName: ((row as { profiles?: { full_name?: string | null } }).profiles?.full_name) ?? "Jugador",
      action: (row as { action?: string }).action ?? "check",
      amount: (row as { amount?: number }).amount ?? 0,
      createdAt: (row as { created_at?: string }).created_at ?? "",
    })).reverse();
    const resultMessage = getShowdownResultMessage(actions);

    return NextResponse.json({
      game: {
        id: gameData.id,
        roomId: gameData.room_id,
        status: gameData.status,
        pot: gameData.pot,
        currentTurn: gameData.current_turn,
        currentTurnName: turnProfile?.full_name ?? null,
        dealerPosition: gameData.dealer_position,
        smallBlind: 10,
        bigBlind: 20,
        roundStage,
        roundLabel,
        actionCount: normalizedActionCount,
        communityCards: [],
        resultMessage,
      },
      players,
      actions,
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
