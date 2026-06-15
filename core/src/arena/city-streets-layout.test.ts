import { describe, expect, it } from "vitest";
import { boxToAabb } from "./solid-box.js";
import {
  CITY_STREETS_PARK,
  CITY_STREETS_ROAD_HALF,
  CITY_STREETS_HALF,
  CITY_STREETS_SPAWN_A,
  CITY_STREETS_SPAWN_B,
  CITY_STREETS_SOLID_BOXES,
} from "./city-streets-layout.js";

function onRoad(x: number, z: number): boolean {
  return Math.abs(x) <= CITY_STREETS_ROAD_HALF || Math.abs(z) <= CITY_STREETS_ROAD_HALF;
}

function overlapsRoad(box: ReturnType<typeof boxToAabb>): boolean {
  const roadMin = -CITY_STREETS_ROAD_HALF;
  const roadMax = CITY_STREETS_ROAD_HALF;
  const xOverlap = box.max.x > roadMin && box.min.x < roadMax;
  const zOverlap = box.max.z > roadMin && box.min.z < roadMax;
  return xOverlap && zOverlap;
}

describe("city streets layout", () => {
  it("uses a larger downtown footprint", () => {
    expect(CITY_STREETS_HALF).toBe(32);
  });

  it("keeps building volumes off the main roads", () => {
    const buildings = CITY_STREETS_SOLID_BOXES.filter(
      (solid) => solid.category === "prop" && solid.sy >= 10,
    );
    expect(buildings.length).toBeGreaterThan(8);
    for (const building of buildings) {
      expect(overlapsRoad(boxToAabb(building))).toBe(false);
    }
  });

  it("places spawns behind blocks, off the open boulevard", () => {
    expect(onRoad(CITY_STREETS_SPAWN_A.x, CITY_STREETS_SPAWN_A.z)).toBe(false);
    expect(onRoad(CITY_STREETS_SPAWN_B.x, CITY_STREETS_SPAWN_B.z)).toBe(false);

    const buildings = CITY_STREETS_SOLID_BOXES.filter(
      (solid) => solid.category === "prop" && solid.sy >= 10,
    );
    const spawnInsideBuilding = (x: number, z: number) =>
      buildings.some((building) => {
        const box = boxToAabb(building);
        return x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z;
      });

    expect(spawnInsideBuilding(CITY_STREETS_SPAWN_A.x, CITY_STREETS_SPAWN_A.z)).toBe(false);
    expect(spawnInsideBuilding(CITY_STREETS_SPAWN_B.x, CITY_STREETS_SPAWN_B.z)).toBe(false);
  });

  it("defines a walkable park block", () => {
    expect(CITY_STREETS_PARK.sx).toBeGreaterThan(12);
    expect(onRoad(CITY_STREETS_PARK.cx, CITY_STREETS_PARK.cz)).toBe(false);
  });

  it("uses collider-only volumes for decor props like cars and park trees", () => {
    const decorColliders = CITY_STREETS_SOLID_BOXES.filter((solid) => solid.decorMesh === false);
    expect(decorColliders.length).toBeGreaterThan(25);
  });
});
