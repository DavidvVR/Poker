export type Screen = "home" | "lobby" | "table";
export type GameRoundStage = "preflop" | "flop" | "turn" | "river" | "showdown";

export const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const normalizeRoomCode = (value: string) => value.trim().toUpperCase();

export const ROUND_STAGE_LABELS: Record<GameRoundStage, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

export const getRoundStageFromActionCount = (actionCount: number): GameRoundStage => {
  if (actionCount >= 8) return "showdown";
  if (actionCount >= 6) return "river";
  if (actionCount >= 4) return "turn";
  if (actionCount >= 2) return "flop";
  return "preflop";
};

export const getRoundLabel = (stage: GameRoundStage) => ROUND_STAGE_LABELS[stage] ?? ROUND_STAGE_LABELS.preflop;

export const isAllowedAction = (value: string) => ["fold", "check", "call", "raise"].includes(value.trim().toLowerCase());
