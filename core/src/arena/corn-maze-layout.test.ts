import { describe, expect, it } from "vitest";
import { boxToAabb } from "./solid-box.js";
import {
  CORN_MAZE_GRID,
  CORN_MAZE_SOLID_BOXES,
  CORN_SPAWN_A,
  CORN_SPAWN_B,
  isCornMazeWalkable,
} from "./corn-maze-layout.js";

const PLAYER_HALF_WIDTH = 0.3;
const FEET_Y = 1;
const PLAYER_HEIGHT = 1.8;

function blockingSolids() {
  return CORN_MAZE_SOLID_BOXES.filter((solid) => solid.category === "prop");
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

function gridCenter(col: number, row: number): { x: number; z: number } {
  return {
    x: -CORN_MAZE_GRID.half + (col + 0.5) * CORN_MAZE_GRID.cell,
    z: -CORN_MAZE_GRID.half + (row + 0.5) * CORN_MAZE_GRID.cell,
  };
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
      CORN_MAZE_GRID.cell * 0.6
    ) {
      return true;
    }

    for (const [dx, dz] of [
      [CORN_MAZE_GRID.cell, 0],
      [-CORN_MAZE_GRID.cell, 0],
      [0, CORN_MAZE_GRID.cell],
      [0, -CORN_MAZE_GRID.cell],
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

describe("corn maze layout", () => {
  it("marks every non-wall tile as walkable in the grid", () => {
    for (let row = 0; row < CORN_MAZE_GRID.rows; row++) {
      for (let col = 0; col < CORN_MAZE_GRID.cols; col++) {
        const walkable = isCornMazeWalkable(col, row);
        const center = gridCenter(col, row);
        if (walkable) {
          expect(feetBlocked(center.x, center.z)).toBe(false);
        }
      }
    }
  });

  it("keeps spawn points clear", () => {
    expect(feetBlocked(CORN_SPAWN_A.x, CORN_SPAWN_A.z)).toBe(false);
    expect(feetBlocked(CORN_SPAWN_B.x, CORN_SPAWN_B.z)).toBe(false);
  });

  it("connects both spawns through the maze", () => {
    expect(canWalkBetween(CORN_SPAWN_A, CORN_SPAWN_B)).toBe(true);
  });
});
