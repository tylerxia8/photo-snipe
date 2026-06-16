export type PracticeBotDifficulty = "easy" | "medium" | "hard";

export interface PracticeBotProfile {
  id: PracticeBotDifficulty;
  label: string;
  opponentName: string;
  /** Design target for tuning — typical player win rate vs this bot. */
  targetPlayerWinRate: number;
  aimErrorDeg: number;
  reactionDelayMs: readonly [number, number];
  trackTurnSpeedDegPerSec: number;
  strafeOnExposureMs: readonly [number, number];
  strafeOnExposureChance: number;
  movementSpeedMultiplier: number;
  shootChanceWhenValid: number;
  retreatWhenClose: boolean;
  huntWhenFar: boolean;
}

export const PRACTICE_BOT_PROFILES: Record<PracticeBotDifficulty, PracticeBotProfile> = {
  easy: {
    id: "easy",
    label: "Easy",
    opponentName: "Rookie Bot",
    targetPlayerWinRate: 0.75,
    aimErrorDeg: 14,
    reactionDelayMs: [1000, 1900],
    trackTurnSpeedDegPerSec: 95,
    strafeOnExposureMs: [350, 650],
    strafeOnExposureChance: 0.4,
    movementSpeedMultiplier: 0.68,
    shootChanceWhenValid: 0.5,
    retreatWhenClose: false,
    huntWhenFar: true,
  },
  medium: {
    id: "medium",
    label: "Medium",
    opponentName: "Field Bot",
    targetPlayerWinRate: 0.45,
    aimErrorDeg: 4,
    reactionDelayMs: [320, 680],
    trackTurnSpeedDegPerSec: 280,
    strafeOnExposureMs: [800, 1200],
    strafeOnExposureChance: 0.85,
    movementSpeedMultiplier: 0.94,
    shootChanceWhenValid: 0.9,
    retreatWhenClose: true,
    huntWhenFar: true,
  },
  hard: {
    id: "hard",
    label: "Hard",
    opponentName: "Training Bot",
    targetPlayerWinRate: 0.35,
    aimErrorDeg: 0,
    reactionDelayMs: [0, 150],
    trackTurnSpeedDegPerSec: Number.POSITIVE_INFINITY,
    strafeOnExposureMs: [1200, 2000],
    strafeOnExposureChance: 1,
    movementSpeedMultiplier: 1,
    shootChanceWhenValid: 1,
    retreatWhenClose: true,
    huntWhenFar: true,
  },
};

export const PRACTICE_BOT_DIFFICULTIES: PracticeBotDifficulty[] = ["easy", "medium", "hard"];

export function getPracticeBotProfile(
  difficulty: PracticeBotDifficulty,
): PracticeBotProfile {
  return PRACTICE_BOT_PROFILES[difficulty];
}

export function formatPracticeDifficultyWinRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) {
    return "no matches";
  }
  const rate = Math.round((wins / total) * 100);
  return `${wins}W · ${losses}L · ${rate}%`;
}
