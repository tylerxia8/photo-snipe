import { describe, expect, it } from "vitest";
import {
  DEFAULT_BODY_HALF_HEIGHT,
  DEFAULT_BODY_OFFSET,
  DEFAULT_BODY_RADIUS,
  validatePhoto,
} from "./validate.js";
import type { PhotoAttempt, PlayerPose, RoundRules } from "../types.js";

const baseRules: RoundRules = {
  roundTimeLimitSec: 300,
  photoCooldownSec: 2,
  maxPhotoDistance: 60,
  minPhotoDistance: 3,
  requireAimMode: true,
  requireBodyInFrame: true,
  exposure: {
    flash: true,
    sound: true,
    soundAudibleRadius: 25,
    flashVisibleRadius: 40,
    flashDurationSec: 0.15,
  },
};

function opponentAt(z: number, yaw = 180): PlayerPose {
  return {
    position: { x: 0, y: 0, z },
    rotation: { x: 0, y: yaw, z: 0 },
    aiming: false,
    bodyOffset: DEFAULT_BODY_OFFSET,
    bodyRadius: DEFAULT_BODY_RADIUS,
    bodyHalfHeight: DEFAULT_BODY_HALF_HEIGHT,
  };
}

function attemptFacingOpponent(
  overrides: Partial<PhotoAttempt> = {},
): PhotoAttempt {
  return {
    playerId: "A",
    timestampMs: 1000,
    cameraPosition: { x: 0, y: 1.6, z: -10 },
    cameraRotation: { x: 0, y: 0, z: 0 },
    fovDeg: 60,
    aiming: true,
    ...overrides,
  };
}

describe("validatePhoto", () => {
  it("accepts when any body part is in frame", () => {
    const result = validatePhoto(
      attemptFacingOpponent(),
      opponentAt(10),
      baseRules,
      { skipOcclusion: true },
    );
    expect(result.valid).toBe(true);
  });

  it("accepts partial body visibility", () => {
    const result = validatePhoto(
      attemptFacingOpponent({ cameraRotation: { x: 0, y: 8, z: 0 } }),
      opponentAt(10),
      baseRules,
      { skipOcclusion: true },
    );
    expect(result.valid).toBe(true);
  });

  it("rejects when not aiming", () => {
    const result = validatePhoto(
      attemptFacingOpponent({ aiming: false }),
      opponentAt(10),
      baseRules,
      { skipOcclusion: true },
    );
    expect(result).toEqual({ valid: false, reason: "not_aiming" });
  });

  it("rejects when on cooldown", () => {
    const result = validatePhoto(
      attemptFacingOpponent({ timestampMs: 1500 }),
      opponentAt(10),
      baseRules,
      { skipOcclusion: true, lastAttemptMs: 1000 },
    );
    expect(result).toEqual({ valid: false, reason: "cooldown" });
  });

  it("rejects when opponent is too far", () => {
    const result = validatePhoto(
      attemptFacingOpponent(),
      opponentAt(200),
      baseRules,
      { skipOcclusion: true },
    );
    expect(result).toEqual({ valid: false, reason: "too_far" });
  });

  it("rejects when opponent is too close", () => {
    const result = validatePhoto(
      attemptFacingOpponent({ cameraPosition: { x: 0, y: 1.6, z: 0 } }),
      opponentAt(1),
      baseRules,
      { skipOcclusion: true },
    );
    expect(result).toEqual({ valid: false, reason: "too_close" });
  });

  it("rejects when no body part is in frame", () => {
    const result = validatePhoto(
      attemptFacingOpponent({
        cameraRotation: { x: 0, y: 90, z: 0 },
      }),
      opponentAt(10),
      baseRules,
      { skipOcclusion: true },
    );
    expect(result).toEqual({ valid: false, reason: "body_out_of_frame" });
  });
});
