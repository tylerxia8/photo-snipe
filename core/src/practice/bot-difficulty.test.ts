import { describe, expect, it } from "vitest";
import {
  getPracticeBotProfile,
  PRACTICE_BOT_DIFFICULTIES,
  PRACTICE_BOT_PROFILES,
} from "./bot-difficulty.js";

describe("practice bot difficulty", () => {
  it("defines easy, medium, and hard profiles", () => {
    expect(PRACTICE_BOT_DIFFICULTIES).toEqual(["easy", "medium", "hard"]);
    expect(getPracticeBotProfile("hard").opponentName).toBe("Training Bot");
  });

  it("ramps bot skill from easy to hard", () => {
    const easy = PRACTICE_BOT_PROFILES.easy;
    const medium = PRACTICE_BOT_PROFILES.medium;
    const hard = PRACTICE_BOT_PROFILES.hard;

    expect(easy.targetPlayerWinRate).toBeGreaterThan(medium.targetPlayerWinRate);
    expect(medium.targetPlayerWinRate).toBeGreaterThan(hard.targetPlayerWinRate);

    expect(easy.aimErrorDeg).toBeGreaterThan(medium.aimErrorDeg);
    expect(medium.aimErrorDeg).toBeGreaterThan(hard.aimErrorDeg);

    expect(easy.reactionDelayMs[1]).toBeGreaterThan(medium.reactionDelayMs[1]);
    expect(medium.reactionDelayMs[1]).toBeGreaterThan(hard.reactionDelayMs[1]);

    expect(easy.shootChanceWhenValid).toBeLessThan(medium.shootChanceWhenValid);
    expect(medium.shootChanceWhenValid).toBeLessThan(hard.shootChanceWhenValid);
  });
});
