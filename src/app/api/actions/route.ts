import { NextRequest, NextResponse } from "next/server";
import { getRoundLabel, getRoundStageFromActionCount, isAllowedAction } from "@/lib/poker";
import { createAdminClient } from "@/lib/supabase/admin";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return "No se pudo completar la acción con Supabase.";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body?.action !== "record") {
      return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { gameId, userName, actionName, amount } = body as {
      gameId: string;
      userName: string;
      actionName: string;
      amount: number;
    };

    const normalizedActionName = actionName?.trim().toLowerCase() ?? "";
    const normalizedAmount = typeof amount === "number" ? amount : 0;

    if (!gameId) {
      return NextResponse.json({ error: "Falta el id de la partida." }, { status: 400 });
    }

    if (!isAllowedAction(normalizedActionName)) {
      return NextResponse.json({ error: "La acción debe ser fold, check, call o raise." }, { status: 400 });
    }

    if (normalizedActionName === "raise" && normalizedAmount <= 0) {
      return NextResponse.json({ error: "La subida debe llevar una cantidad mayor a cero." }, { status: 400 });
    }

    if (["fold", "check"].includes(normalizedActionName) && normalizedAmount !== 0) {
      return NextResponse.json({ error: "Las acciones fold y check no admiten cantidad." }, { status: 400 });
    }

    const { data: profileData, error: profileError } = await adminClient
      .from("profiles")
      .insert({ full_name: userName || "Jugador" })
      .select("id")
      .single();

    if (profileError) {
      return NextResponse.json({ error: getErrorMessage(profileError) }, { status: 400 });
    }

    const { data: gameData, error: gameLoadError } = await adminClient
      .from("games")
      .select("id, pot, current_turn, room_id")
      .eq("id", gameId)
      .single();

    if (gameLoadError || !gameData) {
      return NextResponse.json({ error: getErrorMessage(gameLoadError ?? new Error("No se encontró la partida.")) }, { status: 404 });
    }

    const { data: roomPlayers, error: playersError } = await adminClient
      .from("room_players")
      .select("user_id, seat")
      .eq("room_id", gameData.room_id)
      .order("seat");

    if (playersError) {
      return NextResponse.json({ error: getErrorMessage(playersError) }, { status: 400 });
    }

    if (!roomPlayers?.length) {
      return NextResponse.json({ error: "No hay jugadores disponibles para seguir la partida." }, { status: 400 });
    }

    const orderedPlayers = (roomPlayers ?? [])
      .map((row) => ({ userId: (row as { user_id?: string }).user_id, seat: (row as { seat?: number }).seat ?? 0 }))
      .sort((left, right) => (left.seat ?? 0) - (right.seat ?? 0));

    const currentIndex = orderedPlayers.findIndex((player) => player.userId === gameData.current_turn);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % orderedPlayers.length : 0;
    const nextTurnUserId = orderedPlayers[nextIndex]?.userId ?? gameData.current_turn;
    const nextPot = gameData.pot + normalizedAmount;

    const { count } = await adminClient
      .from("game_actions")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId);

    const nextRoundStage = getRoundStageFromActionCount(count ?? 0);

    const { data: actionData, error: actionError } = await adminClient
      .from("game_actions")
      .insert({ game_id: gameId, user_id: profileData.id, action: normalizedActionName, amount: normalizedAmount })
      .select("id")
      .single();

    if (actionError || !actionData) {
      return NextResponse.json({ error: getErrorMessage(actionError ?? new Error("No se pudo registrar la acción.")) }, { status: 400 });
    }

    const { error: gameUpdateError } = await adminClient
      .from("games")
      .update({ pot: nextPot, current_turn: nextTurnUserId })
      .eq("id", gameId);

    if (gameUpdateError) {
      return NextResponse.json({ error: getErrorMessage(gameUpdateError) }, { status: 400 });
    }

    const { data: turnProfile, error: turnProfileError } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", nextTurnUserId)
      .maybeSingle();

    if (turnProfileError) {
      return NextResponse.json({ error: getErrorMessage(turnProfileError) }, { status: 400 });
    }

    return NextResponse.json({
      actionId: actionData.id,
      message: `${normalizedActionName} registrado`,
      game: {
        id: gameId,
        pot: nextPot,
        currentTurn: nextTurnUserId,
        currentTurnName: turnProfile?.full_name ?? null,
        roundStage: nextRoundStage,
        roundLabel: getRoundLabel(nextRoundStage),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
