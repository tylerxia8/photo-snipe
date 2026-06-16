export interface MatchPerformanceSnapshot {
  photoAttempts: number;
  invalidPhotoAttempts: number;
}

export interface MatchCreditBreakdown {
  base: number;
  streakBonus: number;
  recoveryBonus: number;
  firstSnapBonus: number;
  cleanRoundBonus: number;
  total: number;
}

export function computeMatchCredits(options: {
  mode: "practice" | "online";
  didWin: boolean;
  /** Arena win streak after this match is recorded (wins only). */
  arenaWinStreak: number;
  /** Global loss streak before this match was recorded. */
  consecutiveLossesBeforeMatch: number;
  performance: MatchPerformanceSnapshot;
}): MatchCreditBreakdown {
  const base = options.didWin
    ? options.mode === "online"
      ? 80
      : 40
    : 15;

  if (!options.didWin) {
    return {
      base,
      streakBonus: 0,
      recoveryBonus: 0,
      firstSnapBonus: 0,
      cleanRoundBonus: 0,
      total: base,
    };
  }

  const streakBonus =
    options.arenaWinStreak >= 2
      ? Math.min(40, (options.arenaWinStreak - 1) * 15)
      : 0;

  const recoveryBonus = options.consecutiveLossesBeforeMatch >= 3 ? 35 : 0;

  const firstSnapWin =
    options.performance.photoAttempts === 1 && options.performance.invalidPhotoAttempts === 0;
  const firstSnapBonus = firstSnapWin ? (options.mode === "online" ? 50 : 25) : 0;

  const cleanRound =
    options.performance.invalidPhotoAttempts === 0 && options.performance.photoAttempts > 0;
  const cleanRoundBonus = cleanRound ? (options.mode === "online" ? 30 : 15) : 0;

  return {
    base,
    streakBonus,
    recoveryBonus,
    firstSnapBonus,
    cleanRoundBonus,
    total: base + streakBonus + recoveryBonus + firstSnapBonus + cleanRoundBonus,
  };
}

export function formatCreditBreakdown(breakdown: MatchCreditBreakdown): string {
  const parts = [`${breakdown.base} base`];
  if (breakdown.streakBonus > 0) {
    parts.push(`+${breakdown.streakBonus} streak`);
  }
  if (breakdown.recoveryBonus > 0) {
    parts.push(`+${breakdown.recoveryBonus} comeback`);
  }
  if (breakdown.firstSnapBonus > 0) {
    parts.push(`+${breakdown.firstSnapBonus} first snap`);
  }
  if (breakdown.cleanRoundBonus > 0) {
    parts.push(`+${breakdown.cleanRoundBonus} clean round`);
  }
  return parts.join(" · ");
}
