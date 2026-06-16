import { describe, expect, it } from "vitest";
import { boxToAabb } from "./solid-box.js";
import {
  SCHOOL_FLOOR2_FEET_Y,
  SCHOOL_SPAWN_A,
  SCHOOL_SPAWN_B,
  SCHOOL_SOLID_BOXES,
  SCHOOL_STAIRS,
  SCHOOL_UPSTAIRS_SPAWN,
} from "./school-layout.js";

const PLAYER_HALF_WIDTH = 0.3;
const PLAYER_HEIGHT = 1.8;
const GRID_STEP = 0.4;

function blockingSolids() {
  return SCHOOL_SOLID_BOXES.filter((solid) => solid.category === "prop" || solid.category === "wall");
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
      Math.abs(current.y - to.y) < 0.6
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

    if (Math.abs(current.y - 1) < 0.05) {
      for (const stair of SCHOOL_STAIRS) {
        const top = {
          x: stair.x,
          z: stair.zStart + stair.zDir * (8 * 0.55 + 0.3),
          y: SCHOOL_FLOOR2_FEET_Y,
        };
        if (
          Math.hypot(current.x - stair.x, current.z - stair.zStart) < 2.5 &&
          !visited.has(key(top.x, top.z, top.y))
        ) {
          visited.add(key(top.x, top.z, top.y));
          queue.push(top);
        }
      }
    }
  }

  return false;
}

describe("school layout", () => {
  it("keeps spawn points out of solid props", () => {
    expect(feetBlocked(SCHOOL_SPAWN_A.x, SCHOOL_SPAWN_A.z, SCHOOL_SPAWN_A.y)).toBe(false);
    expect(feetBlocked(SCHOOL_SPAWN_B.x, SCHOOL_SPAWN_B.z, SCHOOL_SPAWN_B.y)).toBe(false);
  });

  it("connects cafeteria and gym spawns through the main hallway", () => {
    expect(canWalkBetween(SCHOOL_SPAWN_A, SCHOOL_SPAWN_B)).toBe(true);
  });

  it("connects the main hallway to the upstairs landing via stairs", () => {
    const hall = { x: 0, z: 0, y: 1 };
    expect(canWalkBetween(hall, SCHOOL_UPSTAIRS_SPAWN)).toBe(true);
  });
});
