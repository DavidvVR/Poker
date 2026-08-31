import { NextRequest, NextResponse } from "next/server";
import { normalizeRoomCode } from "@/lib/poker";
import { createAdminClient } from "@/lib/supabase/admin";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }

  return "No se pudo completar la acción con Supabase.";
}

function isDuplicateError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("duplicate") || message.includes("unique") || message.includes("already exists");
}

function mapRoomPlayers(rows: Array<Record<string, unknown>> | null | undefined, hostId: string | null) {
  return (rows ?? [])
    .map((row) => {
      const profile = (row as { profiles?: { full_name?: string | null } }).profiles;
      return {
        id: (row as { id?: string }).id,
        name: profile?.full_name ?? "Jugador",
        isHost: (row as { user_id?: string }).user_id === hostId,
        isReady: Boolean((row as { is_ready?: boolean }).is_ready),
        seat: (row as { seat?: number }).seat ?? 0,
      };
    })
    .sort((left, right) => left.seat - right.seat || Number(right.isHost) - Number(left.isHost));
}

function buildAssignedHand(existingHands: Array<Array<{ value?: string; suit?: string; label?: string }> | null | undefined>, seed: string) {
  const suits = ["♠", "♥", "♦", "♣"] as const;
  const values = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
  const allCards = values.flatMap((value) => suits.map((suit) => ({ value, suit, label: `${value}${suit}` })));
  const usedLabels = new Set(
    (existingHands ?? [])
      .flatMap((hand) => Array.isArray(hand) ? hand : [])
      .map((card) => card?.label)
      .filter((label): label is string => Boolean(label))
  );
  const availableCards = allCards.filter((card) => !usedLabels.has(card.label));

  let seedValue = 0;
  for (const character of seed) {
    seedValue += character.charCodeAt(0);
  }

  const shuffledCards = [...availableCards];
  for (let index = shuffledCards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(((seedValue + index) % (index + 1) + (index + 1)) % (index + 1));
    [shuffledCards[index], shuffledCards[swapIndex]] = [shuffledCards[swapIndex], shuffledCards[index]];
  }

  return shuffledCards.slice(0, 2);
}

async function loadPlayers(adminClient: ReturnType<typeof createAdminClient>, roomId: string, hostId: string | null) {
  const { data, error } = await adminClient
    .from("room_players")
    .select("id, seat, is_ready, user_id, profiles(full_name)")
    .eq("room_id", roomId)
    .order("seat");

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return mapRoomPlayers((data as Array<Record<string, unknown>> | null) ?? [], hostId);
}

function validateRoomCode(value: string) {
  const normalized = normalizeRoomCode(value);
  return normalized.length >= 4 && normalized.length <= 8;
}

function validatePlayerName(value: string) {
  return value.trim().length >= 2 && value.trim().length <= 20;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "create") {
      const adminClient = createAdminClient();
      const code = normalizeRoomCode(typeof body?.code === "string" ? body.code : "");
      const hostName = typeof body?.hostName === "string" ? body.hostName.trim() : "";

      if (!validatePlayerName(hostName)) {
        return NextResponse.json({ error: "Escribe un nombre válido para el anfitrión." }, { status: 400 });
      }

      if (!validateRoomCode(code)) {
        return NextResponse.json({ error: "El código de sala debe tener entre 4 y 8 caracteres." }, { status: 400 });
      }

      const { data: existingRoom, error: existingRoomError } = await adminClient
        .from("rooms")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      if (existingRoomError) {
        return NextResponse.json({ error: getErrorMessage(existingRoomError) }, { status: 400 });
      }

      if (existingRoom) {
        return NextResponse.json({ error: "Ese código de sala ya está en uso." }, { status: 409 });
      }

      const { data: profileData, error: profileError } = await adminClient
        .from("profiles")
        .insert({ full_name: hostName })
        .select("id")
        .single();

      if (profileError) {
        return NextResponse.json({ error: getErrorMessage(profileError) }, { status: 400 });
      }

      const { data: roomData, error: roomError } = await adminClient
        .from("rooms")
        .insert({ code, host_id: profileData.id, status: "waiting" })
        .select("id, code, status, host_id")
        .single();

      if (roomError || !roomData) {
        if (isDuplicateError(roomError)) {
          return NextResponse.json({ error: "Ese código de sala ya está en uso." }, { status: 409 });
        }

        return NextResponse.json({ error: getErrorMessage(roomError ?? new Error("No se pudo crear la sala.")) }, { status: 400 });
      }

      const { data: hostPlayerData, error: hostPlayerError } = await adminClient
        .from("room_players")
        .insert({ room_id: roomData.id, user_id: profileData.id, seat: 0, is_ready: true, chips: 1000 })
        .select("id")
        .single();

      if (hostPlayerError) {
        return NextResponse.json({ error: getErrorMessage(hostPlayerError) }, { status: 400 });
      }

      const players = await loadPlayers(adminClient, roomData.id, roomData.host_id);

      return NextResponse.json({
        room: { id: roomData.id, code: roomData.code, status: roomData.status, hostId: roomData.host_id },
        hostId: profileData.id,
        playerId: hostPlayerData.id,
        players,
      });
    }

    if (action === "join") {
      const adminClient = createAdminClient();
      const code = normalizeRoomCode(typeof body?.code === "string" ? body.code : "");
      const userName = typeof body?.userName === "string" ? body.userName.trim() : "";

      if (!validatePlayerName(userName)) {
        return NextResponse.json({ error: "Escribe un nombre válido para unirte a la sala." }, { status: 400 });
      }

      if (!validateRoomCode(code)) {
        return NextResponse.json({ error: "El código de sala debe tener entre 4 y 8 caracteres." }, { status: 400 });
      }

      const { data: profileData, error: profileError } = await adminClient
        .from("profiles")
        .insert({ full_name: userName })
        .select("id")
        .single();

      if (profileError) {
        return NextResponse.json({ error: getErrorMessage(profileError) }, { status: 400 });
      }

      const { data: roomData, error: roomError } = await adminClient
        .from("rooms")
        .select("id, code, status, host_id")
        .eq("code", code)
        .single();

      if (roomError || !roomData) {
        return NextResponse.json(
          { error: roomError ? getErrorMessage(roomError) : "No se encontró la sala" },
          { status: 404 }
        );
      }

      const { data: existingRoomPlayers, error: existingRoomPlayersError } = await adminClient
        .from("room_players")
        .select("seat")
        .eq("room_id", roomData.id);

      if (existingRoomPlayersError) {
        return NextResponse.json({ error: getErrorMessage(existingRoomPlayersError) }, { status: 400 });
      }

      const nextSeat = ((existingRoomPlayers ?? []).reduce((maxSeat, row) => {
        const seatValue = Number((row as { seat?: number }).seat ?? 0);
        return Math.max(maxSeat, seatValue);
      }, -1) + 1);

      const { data, error } = await adminClient
        .from("room_players")
        .insert({ room_id: roomData.id, user_id: profileData.id, seat: nextSeat, is_ready: false, chips: 1000 })
        .select("id")
        .single();

      if (error) {
        if (isDuplicateError(error)) {
          return NextResponse.json({ error: "Ya estás unido a esta sala." }, { status: 409 });
        }

        return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
      }

      const { data: activeGame, error: activeGameError } = await adminClient
        .from("games")
        .select("id, status")
        .eq("room_id", roomData.id)
        .maybeSingle();

      if (!activeGameError && activeGame && activeGame.status !== "finished") {
        const { data: existingGamePlayer, error: existingGamePlayerError } = await adminClient
          .from("game_players")
          .select("id, hand")
          .eq("game_id", activeGame.id)
          .eq("user_id", profileData.id)
          .maybeSingle();

        if (!existingGamePlayerError && !existingGamePlayer) {
          const { data: currentGamePlayers, error: currentGamePlayersError } = await adminClient
            .from("game_players")
            .select("hand")
            .eq("game_id", activeGame.id);

          if (!currentGamePlayersError) {
            const newHand = buildAssignedHand(
              (currentGamePlayers ?? []).map((row) => (Array.isArray((row as { hand?: unknown }).hand) ? (row as { hand?: Array<{ value?: string; suit?: string; label?: string }> }).hand : [])),
              `${activeGame.id}-${nextSeat}`
            );

            await adminClient
              .from("game_players")
              .insert({
                game_id: activeGame.id,
                user_id: profileData.id,
                chips: 1000,
                position: nextSeat,
                folded: false,
                all_in: false,
                hand: newHand,
              });
          }
        }
      }

      const players = await loadPlayers(adminClient, roomData.id, roomData.host_id);

      return NextResponse.json({ room: { id: roomData.id, code: roomData.code, status: roomData.status, hostId: roomData.host_id }, playerId: data.id, players });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = normalizeRoomCode(searchParams.get("code") ?? "");

    if (!validateRoomCode(code)) {
      return NextResponse.json({ error: "El código de sala debe tener entre 4 y 8 caracteres." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: roomData, error: roomError } = await adminClient
      .from("rooms")
      .select("id, code, status, host_id")
      .eq("code", code)
      .single();

    if (roomError || !roomData) {
      return NextResponse.json({ error: roomError ? getErrorMessage(roomError) : "No se encontró la sala" }, { status: 404 });
    }

    const players = await loadPlayers(adminClient, roomData.id, roomData.host_id);

    const { data: gameData, error: gameError } = await adminClient
      .from("games")
      .select("id")
      .eq("room_id", roomData.id)
      .maybeSingle();

    if (gameError) {
      return NextResponse.json({ error: getErrorMessage(gameError) }, { status: 400 });
    }

    return NextResponse.json({
      room: { id: roomData.id, code: roomData.code, status: roomData.status, hostId: roomData.host_id },
      players,
      gameId: gameData?.id ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
