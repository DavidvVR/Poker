export type Screen = "home" | "lobby" | "table";

export const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const normalizeRoomCode = (value: string) => value.trim().toUpperCase();
