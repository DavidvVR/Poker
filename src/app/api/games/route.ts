import { NextRequest, NextResponse } from "next/server";
import { getRoundLabel, getRoundStageFromActionCount } from "@/lib/poker";
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

    const firstPlayer = (roomPlayers ?? [])[0];
    const initialTurnUserId = firstPlayer ? (firstPlayer as { user_id?: string }).user_id : null;
    const initialRoundStage = getRoundStageFromActionCount(0);

    const { data: gameData, error: gameError } = await adminClient
      .from("games")
      .insert({ room_id: roomId, current_turn: initialTurnUserId, dealer_position: 0, pot: 0, status: "waiting" })
      .select("id, room_id, status, pot, current_turn, dealer_position")
      .single();

    if (gameError || !gameData) {
      return NextResponse.json({ error: getErrorMessage(gameError ?? new Error("No se pudo crear la partida.")) }, { status: 400 });
    }

    const gamePlayers = (roomPlayers ?? []).map((row) => ({
      game_id: gameData.id,
      user_id: (row as { user_id?: string }).user_id,
      chips: 1000,
      position: (row as { seat?: number }).seat ?? 0,
      folded: false,
      all_in: false,
    }));

    const { error: gamePlayersError } = await adminClient
      .from("game_players")
      .insert(gamePlayers);

    if (gamePlayersError) {
      return NextResponse.json({ error: getErrorMessage(gamePlayersError) }, { status: 400 });
    }

    const players = mapGamePlayers(roomPlayers ?? [], null);

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

    const initialRoundStage = getRoundStageFromActionCount(0);

    return NextResponse.json({
      game: {
        id: gameData.id,
        roomId: gameData.room_id,
        status: gameData.status,
        pot: gameData.pot,
        currentTurn: gameData.current_turn,
        currentTurnName: turnProfile?.full_name ?? null,
        dealerPosition: gameData.dealer_position,
        roundStage: initialRoundStage,
        roundLabel: getRoundLabel(initialRoundStage),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
