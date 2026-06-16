import { describe, expect, it } from "vitest";
import { getOccludersForRound } from "./registry.js";
import { boxToAabb } from "./solid-box.js";
import { hasLineOfSight, vec3 } from "../photo-validation/occlusion.js";
import {
  DEFAULT_BODY_HALF_HEIGHT,
  DEFAULT_BODY_OFFSET,
  DEFAULT_BODY_RADIUS,
  validatePhoto,
} from "../photo-validation/validate.js";
import type { RoundRules } from "../types.js";
import {
  PARKING_GARAGE_SPAWN_A,
  PARKING_GARAGE_SPAWN_A_ROTATION,
  PARKING_GARAGE_SPAWN_B,
  PARKING_GARAGE_SPAWN_B_ROTATION,
  PARKING_GARAGE_SOLID_BOXES,
} from "./parking-garage-layout.js";

const parkingRules: RoundRules = {
  roundTimeLimitSec: 300,
  photoCooldownSec: 2,
  maxPhotoDistance: 52,
  minPhotoDistance: 1,
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

const PLAYER_HALF_WIDTH = 0.3;
const PLAYER_HEIGHT = 1.8;
const GRID_STEP = 0.4;
const EYE_OFFSET = 0.6;
const BODY_HALF_HEIGHT = 0.9;

function blockingSolids() {
  return PARKING_GARAGE_SOLID_BOXES.filter(
    (solid) => solid.category === "prop" || solid.category === "wall",
  );
}

function feetBlocked(x: number, z: number, feetY: number): boolean {
  const minX = x - PLAYER_HALF_WIDTH;
  const maxX = x + PLAYER_HALF_WIDTH;
  const minZ = z - PLAYER_HALF_WIDTH;
  const maxZ = z + PLAYER_HALF_WIDTH;
  const minY = feetY;
  const maxY = feetY + PLAYER_HEIGHT;

  for (const solid of blockingSolids()) {
    const box = boxToAabb(solid);
    if (
      maxX > box.min.x &&
      minX < box.max.x &&
      maxY > box.min.y &&
      minY < box.max.y &&
      maxZ > box.min.z &&
      minZ < box.max.z
    ) {
      return true;
    }
  }
  return false;
}

function canWalkBetween(
  from: { x: number; z: number; y: number },
  to: { x: number; z: number; y: number },
): boolean {
  const key = (x: number, z: number, y: number) => `${x.toFixed(2)},${z.toFixed(2)},${y.toFixed(2)}`;
  const visited = new Set<string>();
  const queue: Array<{ x: number; z: number; y: number }> = [from];
  visited.add(key(from.x, from.z, from.y));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (
      Math.hypot(current.x - to.x, current.z - to.z) < GRID_STEP + PLAYER_HALF_WIDTH &&
      Math.abs(current.y - to.y) < 0.2
    ) {
      return true;
    }

    for (const [dx, dz] of [
      [GRID_STEP, 0],
      [-GRID_STEP, 0],
      [0, GRID_STEP],
      [0, -GRID_STEP],
    ] as const) {
      const next = { x: current.x + dx, z: current.z + dz, y: current.y };
      const id = key(next.x, next.z, next.y);
      if (visited.has(id) || feetBlocked(next.x, next.z, next.y)) {
        continue;
      }
      visited.add(id);
      queue.push(next);
    }
  }

  return false;
}

function spawnCamera(spawn: { x: number; z: number; y: number }) {
  return vec3(spawn.x, spawn.y + EYE_OFFSET, spawn.z);
}

function spawnBodyCenter(spawn: { x: number; z: number; y: number }) {
  return vec3(spawn.x, spawn.y + BODY_HALF_HEIGHT, spawn.z);
}

describe("parking garage layout", () => {
  it("keeps spawn points out of solid props", () => {
    expect(feetBlocked(PARKING_GARAGE_SPAWN_A.x, PARKING_GARAGE_SPAWN_A.z, PARKING_GARAGE_SPAWN_A.y)).toBe(
      false,
    );
    expect(feetBlocked(PARKING_GARAGE_SPAWN_B.x, PARKING_GARAGE_SPAWN_B.z, PARKING_GARAGE_SPAWN_B.y)).toBe(
      false,
    );
  });

  it("blocks spawn line of sight between players behind cover", () => {
    const occluders = getOccludersForRound("parking-garage-01");
    const aCam = spawnCamera(PARKING_GARAGE_SPAWN_A);
    const bBody = spawnBodyCenter(PARKING_GARAGE_SPAWN_B);
    const bCam = spawnCamera(PARKING_GARAGE_SPAWN_B);
    const aBody = spawnBodyCenter(PARKING_GARAGE_SPAWN_A);

    expect(hasLineOfSight(aCam, bBody, occluders)).toBe(false);
    expect(hasLineOfSight(bCam, aBody, occluders)).toBe(false);
  });

  it("places spawns behind nearby cover props", () => {
    const coverNear = (spawn: { x: number; z: number }) =>
      PARKING_GARAGE_SOLID_BOXES.some((solid) => {
        if (solid.category !== "prop" || solid.sy < 1) {
          return false;
        }
        const box = boxToAabb(solid);
        const dx = Math.abs(spawn.x - solid.cx);
        const dz = Math.abs(spawn.z - solid.cz);
        return dx < solid.sx * 0.75 + 1.5 && dz < solid.sz * 0.75 + 2.5;
      });

    expect(coverNear(PARKING_GARAGE_SPAWN_A)).toBe(true);
    expect(coverNear(PARKING_GARAGE_SPAWN_B)).toBe(true);
  });

  it("starts players facing their spawn car, not the opponent", () => {
    expect(PARKING_GARAGE_SPAWN_A_ROTATION[1]).toBe(0);
    expect(PARKING_GARAGE_SPAWN_B_ROTATION[1]).toBe(180);
  });

  it("keeps open paths between the center pillars", () => {
    for (const [x, z] of [
      [0, -3],
      [0, 3],
      [-3, 0],
      [3, 0],
    ] as const) {
      expect(feetBlocked(x, z, 1)).toBe(false);
    }
  });

  it("connects both spawns through the garage floor", () => {
    expect(canWalkBetween(PARKING_GARAGE_SPAWN_A, PARKING_GARAGE_SPAWN_B)).toBe(true);
  });

  it("keeps cars and pillars from overlapping", () => {
    const props = PARKING_GARAGE_SOLID_BOXES.filter((solid) => solid.category === "prop");
    for (let i = 0; i < props.length; i += 1) {
      const a = boxToAabb(props[i]!);
      for (let j = i + 1; j < props.length; j += 1) {
        const b = boxToAabb(props[j]!);
        const xOverlap = a.max.x > b.min.x && a.min.x < b.max.x;
        const yOverlap = a.max.y > b.min.y && a.min.y < b.max.y;
        const zOverlap = a.max.z > b.min.z && a.min.z < b.max.z;
        expect(xOverlap && yOverlap && zOverlap).toBe(false);
      }
    }
  });

  it("allows snapping over spawn cover when the opponent is in frame", () => {
    const occluders = getOccludersForRound("parking-garage-01");
    const result = validatePhoto(
      {
        playerId: "A",
        timestampMs: 1000,
        cameraPosition: { x: -10, y: 1.6, z: -14 },
        cameraRotation: { x: 0, y: 0, z: 0 },
        fovDeg: 60,
        aiming: true,
      },
      {
        position: { x: -10, y: 1, z: 0 },
        rotation: { x: 0, y: 180, z: 0 },
        aiming: false,
        bodyOffset: DEFAULT_BODY_OFFSET,
        bodyRadius: DEFAULT_BODY_RADIUS,
        bodyHalfHeight: DEFAULT_BODY_HALF_HEIGHT,
      },
      parkingRules,
      { skipOcclusion: false, occluders },
    );
    expect(result.valid).toBe(true);
  });

  it("allows snapping when peeking around spawn cover", () => {
    const occluders = getOccludersForRound("parking-garage-01");
    const result = validatePhoto(
      {
        playerId: "A",
        timestampMs: 1000,
        cameraPosition: { x: -11.2, y: 1.6, z: -15 },
        cameraRotation: { x: -0.05, y: 20, z: 0 },
        fovDeg: 75,
        aiming: true,
      },
      {
        position: { x: 10, y: 1, z: -5 },
        rotation: { x: 0, y: 180, z: 0 },
        aiming: false,
        bodyOffset: DEFAULT_BODY_OFFSET,
        bodyRadius: DEFAULT_BODY_RADIUS,
        bodyHalfHeight: DEFAULT_BODY_HALF_HEIGHT,
      },
      parkingRules,
      { skipOcclusion: false, occluders, aspectRatio: 16 / 9 },
    );
    expect(result.valid).toBe(true);
  });
});
