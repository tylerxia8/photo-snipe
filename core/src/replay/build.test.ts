import { describe, expect, it } from "vitest";
import { buildWinReplay, recordSample, type StateSample } from "./build.js";

function sample(
  timestampMs: number,
  x: number,
  z: number,
  yaw: number,
): StateSample {
  return {
    timestampMs,
    position: [x, 1, z],
    rotation: [0, yaw, 0],
  };
}

describe("buildWinReplay", () => {
  it("builds winner POV frames ending on the winning camera", () => {
    const winnerSamples: StateSample[] = [];
    const loserSamples: StateSample[] = [];

    for (let i = 0; i <= 30; i += 1) {
      const t = 1_000 + i * 100;
      recordSample(winnerSamples, sample(t, i, 0, 0));
      recordSample(loserSamples, sample(t, 10 - i, 5, 180));
    }

    const winTimestampMs = 4_000;
    const replay = buildWinReplay({
      roundId: "warehouse-interior-01",
      winnerName: "Alpha",
      winnerSkinId: "teal",
      loserSkinId: "crimson",
      winnerSamples,
      loserSamples,
      winCameraPosition: [2, 2.2, -4],
      winCameraRotation: [-5, 15, 0],
      fovDeg: 75,
      aspectRatio: 16 / 9,
      winTimestampMs,
    });

    expect(replay).not.toBeNull();
    expect(replay!.frames.length).toBeGreaterThan(1);
    expect(replay!.snapAtMs).toBe(replay!.frames[replay!.frames.length - 1].t);
    expect(replay!.frames[replay!.frames.length - 1].cam).toEqual([2, 2.2, -4]);
    expect(replay!.frames[0].cam[1]).toBeCloseTo(1.6, 5);
  });
});
