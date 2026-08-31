import { NextRequest, NextResponse } from "next/server";
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
    const { roomId, userName, message } = body as { roomId: string; userName: string; message: string };

    if (!roomId || !userName?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
    }

    if (message.trim().length > 200) {
      return NextResponse.json({ error: "El mensaje no puede superar 200 caracteres." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("full_name", userName.trim())
      .limit(1)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: getErrorMessage(profileError) }, { status: 400 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Jugador no encontrado." }, { status: 404 });
    }

    const { data: chatData, error: chatError } = await adminClient
      .from("chat_messages")
      .insert({ room_id: roomId, user_id: profile.id, message: message.trim() })
      .select("id, message, created_at, profiles(full_name)")
      .single();

    if (chatError || !chatData) {
      return NextResponse.json({ error: getErrorMessage(chatError ?? new Error("No se pudo guardar el mensaje.")) }, { status: 400 });
    }

    return NextResponse.json({
      message: {
        id: chatData.id,
        playerName: (chatData as unknown as { profiles?: { full_name?: string | null } }).profiles?.full_name ?? userName,
        message: chatData.message,
        createdAt: chatData.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "Falta el id de la sala." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("chat_messages")
      .select("id, message, created_at, profiles(full_name)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(60);

    if (error) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
    }

    const messages = (data ?? []).map((row) => ({
      id: row.id,
      playerName: (row as unknown as { profiles?: { full_name?: string | null } }).profiles?.full_name ?? "Jugador",
      message: row.message,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
