import { describe, expect, it } from "vitest";
import { computeMatchCredits } from "./match-rewards.js";

describe("computeMatchCredits", () => {
  it("awards base credits for a loss", () => {
    expect(
      computeMatchCredits({
        mode: "online",
        didWin: false,
        arenaWinStreak: 0,
        consecutiveLossesBeforeMatch: 2,
        performance: { photoAttempts: 3, invalidPhotoAttempts: 2 },
      }).total,
    ).toBe(15);
  });

  it("adds streak and performance bonuses on wins", () => {
    const breakdown = computeMatchCredits({
      mode: "online",
      didWin: true,
      arenaWinStreak: 3,
      consecutiveLossesBeforeMatch: 0,
      performance: { photoAttempts: 1, invalidPhotoAttempts: 0 },
    });

    expect(breakdown.base).toBe(80);
    expect(breakdown.streakBonus).toBe(30);
    expect(breakdown.firstSnapBonus).toBe(50);
    expect(breakdown.cleanRoundBonus).toBe(30);
    expect(breakdown.total).toBe(190);
  });

  it("adds comeback bonus after a loss streak", () => {
    const breakdown = computeMatchCredits({
      mode: "practice",
      didWin: true,
      arenaWinStreak: 1,
      consecutiveLossesBeforeMatch: 4,
      performance: { photoAttempts: 2, invalidPhotoAttempts: 1 },
    });

    expect(breakdown.base).toBe(40);
    expect(breakdown.recoveryBonus).toBe(35);
    expect(breakdown.firstSnapBonus).toBe(0);
    expect(breakdown.cleanRoundBonus).toBe(0);
    expect(breakdown.total).toBe(75);
  });
});
