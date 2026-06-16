import { colliderBox, solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

export const CITY_STREETS_HALF = 32;
export const CITY_STREETS_ROAD_HALF = 5;
export const CITY_STREETS_SIDEWALK = 2.5;

/** NW green — kept west of adjacent mid-rise blocks (x <= -22). */
export const CITY_STREETS_PARK = {
  cx: -27,
  cz: -23,
  sx: 10,
  sz: 12,
};

const HALF = CITY_STREETS_HALF;
const FOOTPRINT = HALF * 2;
const ROAD_HALF = CITY_STREETS_ROAD_HALF;
const PARAPET = 1.2;
const WALL_THICKNESS = 0.35;
const CAR_BODY_H = 2.1;
const FENCE_H = 1.2;

export const CITY_STREETS_LAYOUT: ArenaLayoutConfig = {
  id: "city-streets-01",
  name: "Urban Streets",
  halfExtent: HALF,
  wallHeight: PARAPET,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
};

function pushBuilding(
  solids: ArenaSolidBox[],
  cx: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
): void {
  solids.push(solidBox(cx, sy * 0.5, cz, sx, sy, sz, "prop", true));
}

/** Open-air downtown — boulevard, cross street, skyscrapers, park, and street cover. */
export const CITY_STREETS_SOLID_BOXES: ArenaSolidBox[] = [
  solidBox(0, -0.1, 0, FOOTPRINT, 0.2, FOOTPRINT, "floor", false),
  solidBox(0, 12, 0, FOOTPRINT, 0.2, FOOTPRINT, "ceiling", false),

  solidBox(0, PARAPET * 0.5, -HALF, FOOTPRINT, PARAPET, WALL_THICKNESS, "wall", true),
  solidBox(0, PARAPET * 0.5, HALF, FOOTPRINT, PARAPET, WALL_THICKNESS, "wall", true),
  solidBox(HALF, PARAPET * 0.5, 0, WALL_THICKNESS, PARAPET, FOOTPRINT, "wall", true),
  solidBox(-HALF, PARAPET * 0.5, 0, WALL_THICKNESS, PARAPET, FOOTPRINT, "wall", true),
];

/** Skyscrapers and mid-rise blocks along the grid (roads stay clear). */
export const CITY_STREETS_BUILDINGS: Array<[number, number, number, number, number]> = [
  [22, -22, 14, 22, 14],
  [22, -11, 9, 16, 9],
  [-13, -24, 11, 14, 9],
  [-13, -12, 9, 11, 8],
  [13, -24, 10, 13, 9],
  [13, -12, 11, 15, 8],
  [-13, 12, 10, 12, 9],
  [-13, 24, 11, 13, 9],
  [13, 12, 9, 11, 8],
  [22, 22, 12, 18, 13],
  [24, 14, 8, 14, 8],
  [-22, 14, 10, 12, 10],
  [-22, 24, 9, 10, 9],
  [14, 24, 10, 15, 9],
];

const park = CITY_STREETS_PARK;

for (const [cx, cz, sx, sy, sz] of CITY_STREETS_BUILDINGS) {
  pushBuilding(CITY_STREETS_SOLID_BOXES, cx, cz, sx, sy, sz);
}

/** Park trees — open grass, clear of fountain, benches, and north fence rail. */
export const CITY_STREETS_PARK_TREES = [
  [-29, -26],
  [-25, -26],
  [-29, -19],
  [-25, -18],
] as const;

for (const [x, z] of CITY_STREETS_PARK_TREES) {
  CITY_STREETS_SOLID_BOXES.push(colliderBox(x, 1.35, z, 1.5, 2.7, 1.5, true));
}

export const CITY_STREETS_PARK_FOUNTAIN = { x: -27, z: -23 };
export const CITY_STREETS_PARK_BENCHES = [
  { x: -24, z: -20 },
  { x: -30, z: -24 },
] as const;

CITY_STREETS_SOLID_BOXES.push(
  colliderBox(CITY_STREETS_PARK_BENCHES[0].x, 0.65, CITY_STREETS_PARK_BENCHES[0].z, 3.2, 1.3, 1.2, true),
);
CITY_STREETS_SOLID_BOXES.push(
  colliderBox(CITY_STREETS_PARK_BENCHES[1].x, 0.65, CITY_STREETS_PARK_BENCHES[1].z, 3.2, 1.3, 1.2, true),
);
CITY_STREETS_SOLID_BOXES.push(
  colliderBox(
    CITY_STREETS_PARK_FOUNTAIN.x,
    0.85,
    CITY_STREETS_PARK_FOUNTAIN.z,
    2.8,
    1.7,
    2.8,
    true,
  ),
);

/** Park fence on north and west — south/east stay open. */
export const CITY_STREETS_FENCE_SEGMENTS: Array<[number, number, number, number]> = [
  [park.cx, park.cz - park.sz * 0.5 + 0.2, park.sx + 0.4, 0.4],
  [park.cx - park.sx * 0.5 + 0.2, park.cz, 0.4, park.sz + 0.4],
];

for (const [cx, cz, sx, sz] of CITY_STREETS_FENCE_SEGMENTS) {
  CITY_STREETS_SOLID_BOXES.push(
    colliderBox(cx, FENCE_H * 0.5, cz, sx, FENCE_H, sz, true),
  );
}

/**
 * Parked cars — [cx, cz, footX, footZ] in world axes.
 * footX/footZ always match the visible body after decor rotation.
 */
export const CITY_STREETS_PARKED_CARS: Array<[number, number, number, number]> = [
  [-3.8, -28, 1.9, 4.2],
  [3.8, -28, 1.9, 4.2],
  [-3.8, -20, 1.9, 4.2],
  [3.8, -20, 1.9, 4.2],
  [-3.8, -12, 1.9, 4.2],
  [3.8, -12, 1.9, 4.2],
  [-3.8, 12, 1.9, 4.2],
  [3.8, 12, 1.9, 4.2],
  [-3.8, 20, 1.9, 4.2],
  [3.8, 20, 1.9, 4.2],
  [-3.8, 28, 1.9, 4.2],
  [3.8, 28, 1.9, 4.2],
  [-28, -3.8, 4.2, 1.9],
  [-28, 3.8, 4.2, 1.9],
  [-20, -3.8, 4.2, 1.9],
  [-20, 3.8, 4.2, 1.9],
  [28, -3.8, 4.2, 1.9],
  [28, 3.8, 4.2, 1.9],
  [20, -3.8, 4.2, 1.9],
  [20, 3.8, 4.2, 1.9],
];

for (const [cx, cz, footX, footZ] of CITY_STREETS_PARKED_CARS) {
  CITY_STREETS_SOLID_BOXES.push(
    colliderBox(cx, CAR_BODY_H * 0.5, cz, footX, CAR_BODY_H, footZ, true, "car"),
  );
}

/** Yellow cab — open stretch of the north–south boulevard. */
export const CITY_STREETS_TAXI = { cx: 0, cz: 6, footX: 4.4, footZ: 2 };

CITY_STREETS_SOLID_BOXES.push(
  colliderBox(
    CITY_STREETS_TAXI.cx,
    CAR_BODY_H * 0.5,
    CITY_STREETS_TAXI.cz,
    CITY_STREETS_TAXI.footX,
    CAR_BODY_H,
    CITY_STREETS_TAXI.footZ,
    true,
    "car",
  ),
);

/** Hot dog carts near sidewalks. */
export const CITY_STREETS_VENDORS: Array<[number, number, number, number, number, number]> = [
  [-7.5, 0.75, 8, 1.4, 1.5, 1.1],
  [7.5, 0.75, -9, 1.4, 1.5, 1.1],
  [-8.5, 0.75, -6, 1.4, 1.5, 1.1],
  [8.5, 0.75, 14, 1.4, 1.5, 1.1],
];

for (const [x, y, z, sx, sy, sz] of CITY_STREETS_VENDORS) {
  CITY_STREETS_SOLID_BOXES.push(colliderBox(x, y, z, sx, sy, sz, true));
}

/** Street lamps along intersections and block corners. */
for (const [x, z] of [
  [-ROAD_HALF - 2, -12],
  [ROAD_HALF + 2, -12],
  [-ROAD_HALF - 2, 12],
  [ROAD_HALF + 2, 12],
  [-12, -ROAD_HALF - 2],
  [-12, ROAD_HALF + 2],
  [12, -ROAD_HALF - 2],
  [12, ROAD_HALF + 2],
  [-ROAD_HALF - 2, -28],
  [ROAD_HALF + 2, -28],
  [-ROAD_HALF - 2, 28],
  [ROAD_HALF + 2, 28],
] as const) {
  CITY_STREETS_SOLID_BOXES.push(solidBox(x, 1.85, z, 0.35, 3.7, 0.35, "prop", true));
}

export const CITY_STREETS_SPAWN_A = { x: -19, z: -30 };
export const CITY_STREETS_SPAWN_B = { x: 19, z: 30 };

export function parkFootprintOverlapsBuilding(): boolean {
  const parkBox = {
    minX: park.cx - park.sx / 2,
    maxX: park.cx + park.sx / 2,
    minZ: park.cz - park.sz / 2,
    maxZ: park.cz + park.sz / 2,
  };

  return CITY_STREETS_BUILDINGS.some(([cx, cz, sx, , sz]) => {
    const minX = cx - sx / 2;
    const maxX = cx + sx / 2;
    const minZ = cz - sz / 2;
    const maxZ = cz + sz / 2;
    return (
      parkBox.maxX > minX &&
      parkBox.minX < maxX &&
      parkBox.maxZ > minZ &&
      parkBox.minZ < maxZ
    );
  });
}

function footprintBox(cx: number, cz: number, sx: number, sz: number) {
  return { minX: cx - sx / 2, maxX: cx + sx / 2, minZ: cz - sz / 2, maxZ: cz + sz / 2 };
}

function footprintsOverlap(
  a: ReturnType<typeof footprintBox>,
  b: ReturnType<typeof footprintBox>,
): boolean {
  return a.maxX > b.minX && a.minX < b.maxX && a.maxZ > b.minZ && a.minZ < b.maxZ;
}

/** Validate taxi and parked cars do not overlap buildings or each other. */
export function cityStreetsVehicleOverlaps(): boolean {
  const cars = [
    ...CITY_STREETS_PARKED_CARS.map(([cx, cz, footX, footZ]) => ({ cx, cz, footX, footZ })),
    CITY_STREETS_TAXI,
  ];

  for (let i = 0; i < cars.length; i++) {
    const a = footprintBox(cars[i]!.cx, cars[i]!.cz, cars[i]!.footX, cars[i]!.footZ);
    for (let j = i + 1; j < cars.length; j++) {
      const b = footprintBox(cars[j]!.cx, cars[j]!.cz, cars[j]!.footX, cars[j]!.footZ);
      if (footprintsOverlap(a, b)) {
        return true;
      }
    }
    for (const [cx, cz, sx, , sz] of CITY_STREETS_BUILDINGS) {
      if (footprintsOverlap(a, footprintBox(cx, cz, sx, sz))) {
        return true;
      }
    }
  }
  return false;
}
