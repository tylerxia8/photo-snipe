import { describe, expect, it } from "vitest";
import { boxToAabb } from "./solid-box.js";
import {
  SCHOOL_CLASSROOMS,
  SCHOOL_SPAWN_A,
  SCHOOL_SPAWN_B,
  SCHOOL_SOLID_BOXES,
  SCHOOL_UPSTAIRS_SPAWN,
} from "./school-layout.js";

const PLAYER_HALF_WIDTH = 0.3;
const PLAYER_HEIGHT = 1.8;
const GRID_STEP = 0.4;
const MAX_STEP_UP = 0.48;
const ON_TOP_EPS = 0.05;

function blockingSolids() {
  return SCHOOL_SOLID_BOXES.filter((solid) => solid.category === "prop" || solid.category === "wall");
}

function standSurfaces() {
  const surfaces: Array<{ minX: number; maxX: number; minZ: number; maxZ: number; feetY: number }> = [
    { minX: -24, maxX: 24, minZ: -24, maxZ: 24, feetY: 1 },
  ];
  for (const solid of SCHOOL_SOLID_BOXES) {
    if (solid.category !== "prop" && solid.category !== "floor") {
      continue;
    }
    const box = boxToAabb(solid);
    if (box.max.y - box.min.y > 0.35) {
      continue;
    }
    surfaces.push({
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z,
      feetY: box.max.y,
    });
  }
  return surfaces;
}

function overFootprint(x: number, z: number, surface: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  return (
    x + PLAYER_HALF_WIDTH > surface.minX &&
    x - PLAYER_HALF_WIDTH < surface.maxX &&
    z + PLAYER_HALF_WIDTH > surface.minZ &&
    z - PLAYER_HALF_WIDTH < surface.maxZ
  );
}

function findStepUpY(x: number, z: number, feetY: number): number | null {
  let best = -Infinity;
  for (const surface of standSurfaces()) {
    if (!overFootprint(x, z, surface)) {
      continue;
    }
    if (surface.feetY <= feetY + 0.02 || surface.feetY > feetY + MAX_STEP_UP) {
      continue;
    }
    if (surface.feetY > best) {
      best = surface.feetY;
    }
  }
  return best > -Infinity ? best : null;
}

function snapToSupport(x: number, z: number, feetY: number): number {
  let best = -Infinity;
  for (const surface of standSurfaces()) {
    if (!overFootprint(x, z, surface)) {
      continue;
    }
    if (surface.feetY <= feetY + ON_TOP_EPS && surface.feetY > best) {
      best = surface.feetY;
    }
  }
  let stepped = best > -Infinity ? best : feetY;
  for (const surface of standSurfaces()) {
    if (!overFootprint(x, z, surface)) {
      continue;
    }
    if (surface.feetY <= stepped + ON_TOP_EPS || surface.feetY > stepped + MAX_STEP_UP) {
      continue;
    }
    if (surface.feetY > stepped) {
      stepped = surface.feetY;
    }
  }
  return stepped;
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
    if (solid.category === "prop" && solid.sy <= 0.25) {
      const belowTop = feetY < box.max.y - ON_TOP_EPS;
      const withinStep = box.max.y <= feetY + MAX_STEP_UP;
      const passesUnder = feetY < box.min.y - ON_TOP_EPS;
      if (passesUnder || (belowTop && withinStep)) {
        continue;
      }
      if (!belowTop) {
        if (
          maxX > box.min.x &&
          minX < box.max.x &&
          maxZ > box.min.z &&
          minZ < box.max.z
        ) {
          continue;
        }
      }
    }
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
      const nextX = current.x + dx;
      const nextZ = current.z + dz;
      let nextY = current.y;

      if (feetBlocked(nextX, nextZ, nextY)) {
        let stepped = false;
        for (let attempt = 0; attempt < 12; attempt++) {
          const stepY = findStepUpY(nextX, nextZ, nextY);
          if (stepY === null || stepY <= nextY + 0.01) {
            break;
          }
          nextY = stepY;
          stepped = true;
          if (!feetBlocked(nextX, nextZ, nextY)) {
            break;
          }
        }
        if (!stepped || feetBlocked(nextX, nextZ, nextY)) {
          continue;
        }
      }

      nextY = snapToSupport(nextX, nextZ, nextY);

      const id = key(nextX, nextZ, nextY);
      if (visited.has(id)) {
        continue;
      }
      visited.add(id);
      queue.push({ x: nextX, z: nextZ, y: nextY });
    }
  }

  return false;
}

describe("school layout", () => {
  it("keeps spawn points out of solid props", () => {
    expect(feetBlocked(SCHOOL_SPAWN_A.x, SCHOOL_SPAWN_A.z, SCHOOL_SPAWN_A.y)).toBe(false);
    expect(feetBlocked(SCHOOL_SPAWN_B.x, SCHOOL_SPAWN_B.z, SCHOOL_SPAWN_B.y)).toBe(false);
  });

  it("keeps key hallway points walkable on floor 1", () => {
    for (const [x, z] of [
      [0, -10],
      [0, -4],
      [0, 0],
      [0, 4],
      [0, 10],
      [0, 14],
      [-6, 0],
      [6, 0],
    ] as const) {
      expect(feetBlocked(x, z, 1)).toBe(false);
    }
  });

  it("connects cafeteria and gym spawns through the main hall", () => {
    expect(canWalkBetween(SCHOOL_SPAWN_A, SCHOOL_SPAWN_B)).toBe(true);
  });

  it("connects the main hallway to the second floor via stairs", () => {
    expect(canWalkBetween({ x: -10, z: -2.5, y: 1 }, SCHOOL_UPSTAIRS_SPAWN)).toBe(true);
    expect(canWalkBetween({ x: 10, z: -2.5, y: 1 }, SCHOOL_UPSTAIRS_SPAWN)).toBe(true);
  });

  it("defines eight classrooms across both floors", () => {
    expect(SCHOOL_CLASSROOMS).toHaveLength(8);
    expect(SCHOOL_CLASSROOMS.filter((room) => room.floor === 1)).toHaveLength(4);
    expect(SCHOOL_CLASSROOMS.filter((room) => room.floor === 2)).toHaveLength(4);
  });
});
