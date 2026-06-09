import { describe, expect, it } from "vitest";
import { getWarehouseInteriorOccluders } from "../arena/warehouse-interior.js";
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
  requireAimMode: false,
  requireBodyInFrame: true,
  exposure: {
    flash: true,
    sound: true,
    soundAudibleRadius: 25,
    flashVisibleRadius: 40,
    flashDurationSec: 0.15,
  },
};

function opponentAt(z: number, yaw = 180, x = 0, y = 0): PlayerPose {
  return {
    position: { x, y, z },
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

  it("rejects when aim mode is required but not active", () => {
    const result = validatePhoto(
      attemptFacingOpponent({ aiming: false }),
      opponentAt(10),
      { ...baseRules, requireAimMode: true },
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

  it("rejects when a wall blocks line of sight", () => {
    const occluders = getWarehouseInteriorOccluders();
    const result = validatePhoto(
      attemptFacingOpponent({
        cameraPosition: { x: -10, y: 1.6, z: -5 },
        cameraRotation: { x: 0, y: 0, z: 0 },
      }),
      opponentAt(5, 180, -10),
      baseRules,
      { skipOcclusion: false, occluders },
    );
    expect(result).toEqual({ valid: false, reason: "body_occluded" });
  });

  it("accepts when opponent is in frame and unobstructed", () => {
    const occluders = getWarehouseInteriorOccluders();
    const result = validatePhoto(
      attemptFacingOpponent({
        cameraPosition: { x: 0, y: 1.6, z: 5 },
        cameraRotation: { x: 0, y: 0, z: 0 },
      }),
      opponentAt(12, 180, 0),
      baseRules,
      { skipOcclusion: false, occluders },
    );
    expect(result.valid).toBe(true);
  });
});
