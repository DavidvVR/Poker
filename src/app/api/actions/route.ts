import { NextRequest, NextResponse } from "next/server";
import { getPotPayouts, getRoundLabel, getRoundProgressionLabel, getRoundStageFromActionCount, getWinningPlayers, isAllowedAction } from "@/lib/poker";
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

    const { data: gameData, error: gameLoadError } = await adminClient
      .from("games")
      .select("id, pot, current_turn, room_id, status, community_cards")
      .eq("id", gameId)
      .single();

    if (gameLoadError || !gameData) {
      return NextResponse.json({ error: getErrorMessage(gameLoadError ?? new Error("No se encontró la partida.")) }, { status: 404 });
    }

    if (gameData.status === "finished") {
      return NextResponse.json({ error: "La mano ya terminó. Inicia una nueva mano para continuar." }, { status: 409 });
    }

    const { data: actingProfile, error: actingProfileError } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", gameData.current_turn)
      .maybeSingle();

    if (actingProfileError) {
      return NextResponse.json({ error: getErrorMessage(actingProfileError) }, { status: 400 });
    }

    if (!actingProfile || actingProfile.full_name.trim().toLocaleLowerCase() !== userName.trim().toLocaleLowerCase()) {
      return NextResponse.json({ error: "No es tu turno." }, { status: 409 });
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
    const { count } = await adminClient
      .from("game_actions")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId);

    const nextActionCount = (count ?? 0) + 1;
    const nextRoundStage = getRoundStageFromActionCount(nextActionCount);
    const nextPot = gameData.pot + normalizedAmount;
    const roundLabel = getRoundProgressionLabel(nextRoundStage, nextActionCount);

    const { data: currentPlayerRow, error: currentPlayerRowError } = await adminClient
      .from("game_players")
      .select("id, user_id, chips, folded, all_in")
      .eq("game_id", gameId)
      .eq("user_id", gameData.current_turn)
      .maybeSingle();

    if (currentPlayerRowError) {
      return NextResponse.json({ error: getErrorMessage(currentPlayerRowError) }, { status: 400 });
    }

    let nextChips = (currentPlayerRow?.chips ?? 1000) - (normalizedActionName === "call" || normalizedActionName === "raise" ? normalizedAmount : 0);
    let nextFolded = Boolean(currentPlayerRow?.folded);
    let nextAllIn = Boolean(currentPlayerRow?.all_in);
    let actionState = "acting" as "acting" | "folded" | "checked" | "called" | "raised" | "all-in";

    if (normalizedActionName === "fold") {
      nextFolded = true;
      nextAllIn = false;
      actionState = "folded";
    } else if (normalizedActionName === "check") {
      actionState = "checked";
    } else if (normalizedActionName === "call") {
      nextChips = Math.max(0, nextChips);
      nextAllIn = nextChips <= 0;
      actionState = nextAllIn ? "all-in" : "called";
    } else if (normalizedActionName === "raise") {
      nextChips = Math.max(0, nextChips);
      nextAllIn = nextChips <= 0;
      actionState = nextAllIn ? "all-in" : "raised";
    }

    const { error: playerUpdateError } = await adminClient
      .from("game_players")
      .update({
        folded: nextFolded,
        all_in: nextAllIn,
        chips: nextChips,
      })
      .eq("game_id", gameId)
      .eq("user_id", gameData.current_turn);

    if (playerUpdateError) {
      return NextResponse.json({ error: getErrorMessage(playerUpdateError) }, { status: 400 });
    }

    const { data: updatedPlayersRows, error: updatedPlayersError } = await adminClient
      .from("game_players")
      .select("user_id, hand, chips, folded, all_in, position, profiles(full_name)")
      .eq("game_id", gameId)
      .order("position");

    if (updatedPlayersError) {
      return NextResponse.json({ error: getErrorMessage(updatedPlayersError) }, { status: 400 });
    }

    const activePlayers = (updatedPlayersRows ?? []).filter((row) => !Boolean((row as { folded?: boolean }).folded));
    const shouldShowdown = activePlayers.length <= 1 || nextActionCount >= 8;
    let nextTurnUserId = null as string | null;

    if (!shouldShowdown) {
      for (let offset = 1; offset <= orderedPlayers.length; offset += 1) {
        const candidate = orderedPlayers[(currentIndex + offset) % orderedPlayers.length];
        if (!candidate) continue;

        const candidateRow = (updatedPlayersRows ?? []).find((row) => (row as { user_id?: string }).user_id === candidate.userId);
        if (candidateRow && !Boolean((candidateRow as { folded?: boolean }).folded)) {
          nextTurnUserId = candidate.userId ?? null;
          break;
        }
      }
    }

    const finalRoundStage = shouldShowdown ? "showdown" : nextRoundStage;
    const contenders = activePlayers.map((row, index) => ({
      id: (row as { user_id?: string }).user_id ?? `player-${index}`,
      name: ((row as { profiles?: { full_name?: string | null } }).profiles?.full_name) ?? `Jugador ${index + 1}`,
      hand: Array.isArray((row as { hand?: unknown }).hand)
        ? (row as { hand: Array<{ value: string; suit: string; label: string }> }).hand
        : [],
    }));
    const communityCards = Array.isArray(gameData.community_cards)
      ? gameData.community_cards as Array<{ value: string; suit: string; label: string }>
      : [];
    const winners = shouldShowdown
      ? (contenders.length === 1 ? contenders : getWinningPlayers(contenders, communityCards))
      : [];
    const payouts = getPotPayouts({ pot: nextPot, winnerIds: winners.map((winner) => winner.id) });
    const awardedStacks = new Map<string, number>();

    if (shouldShowdown) {
      const payoutResults = await Promise.all((updatedPlayersRows ?? []).map((row) => {
        const userId = (row as { user_id?: string }).user_id ?? "";
        const awardedStack = ((row as { chips?: number }).chips ?? 0) + (payouts[userId] ?? 0);
        awardedStacks.set(userId, awardedStack);
        return adminClient
          .from("game_players")
          .update({ chips: awardedStack })
          .eq("game_id", gameId)
          .eq("user_id", userId);
      }));
      const payoutError = payoutResults.find((result) => result.error)?.error;

      if (payoutError) {
        return NextResponse.json({ error: getErrorMessage(payoutError) }, { status: 400 });
      }
    }

    const winnerNames = winners.map((winner) => winner.name).join(" y ");
    const winningHand = "evaluation" in (winners[0] ?? {})
      ? (winners[0] as { evaluation?: { label?: string } }).evaluation?.label
      : null;
    const resultMessage = shouldShowdown
      ? (winnerNames ? `Showdown. ${winnerNames} gana${winners.length > 1 ? "n" : ""} la mano${winningHand ? ` con ${winningHand}` : ""}.` : "Showdown. La mano termina.")
      : `${normalizedActionName} registrado`;

    const { data: actionData, error: actionError } = await adminClient
      .from("game_actions")
      .insert({ game_id: gameId, user_id: gameData.current_turn, action: normalizedActionName, amount: normalizedAmount })
      .select("id")
      .single();

    if (actionError || !actionData) {
      return NextResponse.json({ error: getErrorMessage(actionError ?? new Error("No se pudo registrar la acción.")) }, { status: 400 });
    }

    const { error: gameUpdateError } = await adminClient
      .from("games")
      .update({
        pot: nextPot,
        current_turn: nextTurnUserId,
        action_count: nextActionCount,
        round_stage: finalRoundStage,
        round_label: getRoundLabel(finalRoundStage),
        result_message: shouldShowdown ? resultMessage : null,
        status: shouldShowdown ? "finished" : (gameData.status === "waiting" ? "playing" : gameData.status),
      })
      .eq("id", gameId);

    if (gameUpdateError) {
      return NextResponse.json({ error: getErrorMessage(gameUpdateError) }, { status: 400 });
    }

    let nextTurnName: string | null = null;

    if (nextTurnUserId) {
      const { data: turnProfile, error: turnProfileError } = await adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", nextTurnUserId)
        .maybeSingle();

      if (turnProfileError) {
        return NextResponse.json({ error: getErrorMessage(turnProfileError) }, { status: 400 });
      }

      nextTurnName = turnProfile?.full_name ?? null;
    }

    const players = (updatedPlayersRows ?? [])
      .map((row, index) => ({
        id: (row as { user_id?: string }).user_id ?? `player-${index}`,
        name: ((row as { profiles?: { full_name?: string | null } }).profiles?.full_name) ?? `Jugador ${index + 1}`,
        hand: [],
        stack: awardedStacks.get((row as { user_id?: string }).user_id ?? "") ?? (row as { chips?: number }).chips ?? 1000,
        status: Boolean((row as { folded?: boolean }).folded) ? "Retirado" : ((row as { user_id?: string }).user_id === nextTurnUserId ? "Activa" : "Esperando"),
        seat: (row as { position?: number }).position ?? index,
      }))
      .sort((left, right) => left.seat - right.seat);

    return NextResponse.json({
      actionId: actionData.id,
      message: resultMessage,
      game: {
        id: gameId,
        pot: nextPot,
        currentTurn: nextTurnUserId,
        currentTurnName: nextTurnName,
        roundStage: finalRoundStage,
        roundLabel: getRoundLabel(finalRoundStage),
        status: shouldShowdown ? "finished" : (gameData.status === "waiting" ? "playing" : gameData.status),
        resultMessage,
      },
      players,
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
