import { describe, expect, it } from "vitest";
import { boxToAabb } from "./solid-box.js";
import {
  DUCT_NETWORK_SOLID_BOXES,
  DUCT_SPAWN_A,
  DUCT_SPAWN_B,
} from "./duct-layout.js";

const PLAYER_HALF_WIDTH = 0.3;
const FEET_Y = 1;
const PLAYER_HEIGHT = 1.8;
const GRID_STEP = 0.4;

function blockingSolids() {
  return DUCT_NETWORK_SOLID_BOXES.filter(
    (solid) =>
      solid.category === "prop" || solid.category === "wall",
  );
}

function feetBlocked(x: number, z: number): boolean {
  const minX = x - PLAYER_HALF_WIDTH;
  const maxX = x + PLAYER_HALF_WIDTH;
  const minZ = z - PLAYER_HALF_WIDTH;
  const maxZ = z + PLAYER_HALF_WIDTH;
  const minY = FEET_Y;
  const maxY = FEET_Y + PLAYER_HEIGHT;

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
  from: { x: number; z: number },
  to: { x: number; z: number },
): boolean {
  const key = (x: number, z: number) => `${x.toFixed(2)},${z.toFixed(2)}`;
  const visited = new Set<string>();
  const queue: Array<{ x: number; z: number }> = [from];
  visited.add(key(from.x, from.z));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (
      Math.hypot(current.x - to.x, current.z - to.z) <
      GRID_STEP + PLAYER_HALF_WIDTH
    ) {
      return true;
    }

    for (const [dx, dz] of [
      [GRID_STEP, 0],
      [-GRID_STEP, 0],
      [0, GRID_STEP],
      [0, -GRID_STEP],
    ] as const) {
      const next = { x: current.x + dx, z: current.z + dz };
      const id = key(next.x, next.z);
      if (visited.has(id) || feetBlocked(next.x, next.z)) {
        continue;
      }
      visited.add(id);
      queue.push(next);
    }
  }

  return false;
}

describe("duct network layout", () => {
  it("keeps spawn points out of solid props", () => {
    expect(feetBlocked(DUCT_SPAWN_A.x, DUCT_SPAWN_A.z)).toBe(false);
    expect(feetBlocked(DUCT_SPAWN_B.x, DUCT_SPAWN_B.z)).toBe(false);
  });

  it("connects both spawns through one walkable network", () => {
    expect(canWalkBetween(DUCT_SPAWN_A, DUCT_SPAWN_B)).toBe(true);
  });

  it("connects each spawn to the center cross passage", () => {
    const centerCross = { x: 2, z: 0 };
    expect(canWalkBetween(DUCT_SPAWN_A, centerCross)).toBe(true);
    expect(canWalkBetween(DUCT_SPAWN_B, centerCross)).toBe(true);
  });
});
