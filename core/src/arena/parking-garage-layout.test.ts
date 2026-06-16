import { describe, expect, it } from "vitest";
import { boxToAabb } from "./solid-box.js";
import {
  PARKING_GARAGE_SPAWN_A,
  PARKING_GARAGE_SPAWN_B,
  PARKING_GARAGE_SOLID_BOXES,
} from "./parking-garage-layout.js";

const PLAYER_HALF_WIDTH = 0.3;
const PLAYER_HEIGHT = 1.8;
const GRID_STEP = 0.4;

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

describe("parking garage layout", () => {
  it("keeps spawn points out of solid props", () => {
    expect(feetBlocked(PARKING_GARAGE_SPAWN_A.x, PARKING_GARAGE_SPAWN_A.z, PARKING_GARAGE_SPAWN_A.y)).toBe(
      false,
    );
    expect(feetBlocked(PARKING_GARAGE_SPAWN_B.x, PARKING_GARAGE_SPAWN_B.z, PARKING_GARAGE_SPAWN_B.y)).toBe(
      false,
    );
  });

  it("keeps the center lane walkable", () => {
    for (const [x, z] of [
      [0, -10],
      [0, 0],
      [0, 10],
    ] as const) {
      expect(feetBlocked(x, z, 1)).toBe(false);
    }
  });

  it("connects both spawns through the garage floor", () => {
    expect(canWalkBetween(PARKING_GARAGE_SPAWN_A, PARKING_GARAGE_SPAWN_B)).toBe(true);
  });
});
