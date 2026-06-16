import { describe, expect, it } from "vitest";
import { boxToAabb } from "./solid-box.js";
import {
  CITY_STREETS_BUILDINGS,
  CITY_STREETS_PARK,
  CITY_STREETS_PARK_BENCHES,
  CITY_STREETS_PARK_FOUNTAIN,
  CITY_STREETS_PARK_TREES,
  CITY_STREETS_PARKED_CARS,
  CITY_STREETS_ROAD_HALF,
  CITY_STREETS_HALF,
  CITY_STREETS_SPAWN_A,
  CITY_STREETS_SPAWN_B,
  CITY_STREETS_SOLID_BOXES,
  CITY_STREETS_TAXI,
  cityStreetsVehicleOverlaps,
  parkFootprintOverlapsBuilding,
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

function footprintOverlaps(
  ax: number,
  az: number,
  sx: number,
  sz: number,
  bx: number,
  bz: number,
  bsx: number,
  bsz: number,
): boolean {
  const aMinX = ax - sx / 2;
  const aMaxX = ax + sx / 2;
  const aMinZ = az - sz / 2;
  const aMaxZ = az + sz / 2;
  const bMinX = bx - bsx / 2;
  const bMaxX = bx + bsx / 2;
  const bMinZ = bz - bsz / 2;
  const bMaxZ = bz + bsz / 2;
  return aMaxX > bMinX && aMinX < bMaxX && aMaxZ > bMinZ && aMinZ < bMaxZ;
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

  it("keeps the park footprint clear of building volumes", () => {
    expect(parkFootprintOverlapsBuilding()).toBe(false);
    expect(CITY_STREETS_PARK.cx + CITY_STREETS_PARK.sx / 2).toBeLessThanOrEqual(-22);
  });

  it("uses collider-only volumes for decor props like cars and park trees", () => {
    const decorColliders = CITY_STREETS_SOLID_BOXES.filter((solid) => solid.decorMesh === false);
    expect(decorColliders.length).toBeGreaterThan(25);
  });

  it("keeps park trees out of building footprints", () => {
    const buildings = CITY_STREETS_BUILDINGS.map(([cx, cz, sx, , sz]) => {
      return {
        minX: cx - sx / 2,
        maxX: cx + sx / 2,
        minZ: cz - sz / 2,
        maxZ: cz + sz / 2,
      };
    });

    for (const [x, z] of CITY_STREETS_PARK_TREES) {
      const treeRadius = 0.75;
      for (const building of buildings) {
        const xOverlap =
          x + treeRadius > building.minX && x - treeRadius < building.maxX;
        const zOverlap =
          z + treeRadius > building.minZ && z - treeRadius < building.maxZ;
        expect(xOverlap && zOverlap).toBe(false);
      }
    }
  });

  it("keeps park trees clear of the fountain and benches", () => {
    for (const [x, z] of CITY_STREETS_PARK_TREES) {
      expect(
        footprintOverlaps(
          x,
          z,
          1.5,
          1.5,
          CITY_STREETS_PARK_FOUNTAIN.x,
          CITY_STREETS_PARK_FOUNTAIN.z,
          2.8,
          2.8,
        ),
      ).toBe(false);

      for (const bench of CITY_STREETS_PARK_BENCHES) {
        expect(footprintOverlaps(x, z, 1.5, 1.5, bench.x, bench.z, 3.2, 1.2)).toBe(false);
      }
    }
  });

  it("keeps vehicles clear of each other and buildings", () => {
    expect(cityStreetsVehicleOverlaps()).toBe(false);
  });

  it("matches car colliders to their world-axis footprints", () => {
    for (const [cx, cz, footX, footZ] of CITY_STREETS_PARKED_CARS) {
      const collider = CITY_STREETS_SOLID_BOXES.find(
        (solid) =>
          solid.decorMesh === false &&
          Math.abs(solid.cx - cx) < 0.01 &&
          Math.abs(solid.cz - cz) < 0.01 &&
          solid.sy >= 2,
      );
      expect(collider).toBeDefined();
      expect(collider!.sx).toBeCloseTo(footX);
      expect(collider!.sz).toBeCloseTo(footZ);
    }

    const taxiCollider = CITY_STREETS_SOLID_BOXES.find(
      (solid) =>
        solid.decorMesh === false &&
        Math.abs(solid.cx - CITY_STREETS_TAXI.cx) < 0.01 &&
        Math.abs(solid.cz - CITY_STREETS_TAXI.cz) < 0.01,
    );
    expect(taxiCollider!.sx).toBeCloseTo(CITY_STREETS_TAXI.footX);
    expect(taxiCollider!.sz).toBeCloseTo(CITY_STREETS_TAXI.footZ);
  });

  it("gives parked cars solid body collision", () => {
    const cars = CITY_STREETS_SOLID_BOXES.filter(
      (solid) => solid.decorMesh === false && solid.sy >= 2,
    );
    expect(cars.length).toBeGreaterThan(20);
    for (const car of cars) {
      const box = boxToAabb(car);
      expect(box.max.y).toBeGreaterThanOrEqual(2);
    }
  });
});
