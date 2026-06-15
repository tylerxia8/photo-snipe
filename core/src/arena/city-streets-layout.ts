import { colliderBox, solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

export const CITY_STREETS_HALF = 32;
export const CITY_STREETS_ROAD_HALF = 5;
export const CITY_STREETS_SIDEWALK = 2.5;

/** NW corner green — walkable, low cover only. */
export const CITY_STREETS_PARK = {
  cx: -22,
  cz: -22,
  sx: 18,
  sz: 16,
};

const HALF = CITY_STREETS_HALF;
const FOOTPRINT = HALF * 2;
const ROAD_HALF = CITY_STREETS_ROAD_HALF;
const PARAPET = 1.2;
const WALL_THICKNESS = 0.35;
const FENCE_H = 1.5;

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

/** Park trees — kept west of adjacent mid-rise blocks. */
export const CITY_STREETS_PARK_TREES = [
  [-27, -26],
  [-29, -28],
  [-24, -24],
  [-27, -22],
  [-25, -27],
] as const;

for (const [x, z] of CITY_STREETS_PARK_TREES) {
  CITY_STREETS_SOLID_BOXES.push(colliderBox(x, 1.75, z, 2.2, 3.5, 2.2, true));
}

CITY_STREETS_SOLID_BOXES.push(colliderBox(-22, 0.65, -22, 3.2, 1.3, 1.2, true));
CITY_STREETS_SOLID_BOXES.push(colliderBox(-19, 0.65, -19, 3.2, 1.3, 1.2, true));
CITY_STREETS_SOLID_BOXES.push(colliderBox(-24, 0.85, -24, 2.8, 1.7, 2.8, true));

/** Park fence — three sides plus a south gate; east side uses building walls. */
export const CITY_STREETS_FENCE_SEGMENTS: Array<[number, number, number, number]> = [
  [park.cx, park.cz - park.sz * 0.5 + 0.2, park.sx + 0.4, 0.4],
  [park.cx - park.sx * 0.5 + 0.2, park.cz, 0.4, park.sz + 0.4],
  [park.cx - 4, park.cz + park.sz * 0.5 - 0.2, 7, 0.4],
  [park.cx + 4.5, park.cz + park.sz * 0.5 - 0.2, 6, 0.4],
];

for (const [cx, cz, sx, sz] of CITY_STREETS_FENCE_SEGMENTS) {
  CITY_STREETS_SOLID_BOXES.push(
    colliderBox(cx, FENCE_H * 0.5, cz, sx, FENCE_H, sz, true),
  );
}

/** Parked cars along curbs — [cx, cz, sx, sy, sz]. */
export const CITY_STREETS_PARKED_CARS: Array<[number, number, number, number, number]> = [
  [-3.8, -28, 1.9, 1.25, 4.2],
  [3.8, -28, 1.9, 1.25, 4.2],
  [-3.8, -20, 1.9, 1.25, 4.2],
  [3.8, -20, 1.9, 1.25, 4.2],
  [-3.8, -12, 1.9, 1.25, 4.2],
  [3.8, -12, 1.9, 1.25, 4.2],
  [-3.8, 12, 1.9, 1.25, 4.2],
  [3.8, 12, 1.9, 1.25, 4.2],
  [-3.8, 20, 1.9, 1.25, 4.2],
  [3.8, 20, 1.9, 1.25, 4.2],
  [-3.8, 28, 1.9, 1.25, 4.2],
  [3.8, 28, 1.9, 1.25, 4.2],
  [-28, -3.8, 4.2, 1.25, 1.9],
  [-28, 3.8, 4.2, 1.25, 1.9],
  [-20, -3.8, 4.2, 1.25, 1.9],
  [-20, 3.8, 4.2, 1.25, 1.9],
  [28, -3.8, 4.2, 1.25, 1.9],
  [28, 3.8, 4.2, 1.25, 1.9],
  [20, -3.8, 4.2, 1.25, 1.9],
  [20, 3.8, 4.2, 1.25, 1.9],
];

for (const [cx, cz, sx, sy, sz] of CITY_STREETS_PARKED_CARS) {
  CITY_STREETS_SOLID_BOXES.push(
    colliderBox(cx, sy * 0.5 + 0.35, cz, sx, sy, sz, true),
  );
}

export const CITY_STREETS_TAXI = { cx: 2.5, cz: -10, sx: 4.4, sy: 1.8, sz: 2 };

CITY_STREETS_SOLID_BOXES.push(
  colliderBox(
    CITY_STREETS_TAXI.cx,
    CITY_STREETS_TAXI.sy * 0.5 + 0.35,
    CITY_STREETS_TAXI.cz,
    CITY_STREETS_TAXI.sx,
    CITY_STREETS_TAXI.sy,
    CITY_STREETS_TAXI.sz,
    true,
  ),
);

/** Hot dog carts, newsstands, and bus shelters near sidewalks. */
export const CITY_STREETS_VENDORS: Array<[number, number, number, number, number, number]> = [
  [-7.5, 0.75, 8, 1.4, 1.5, 1.1],
  [7.5, 0.75, -9, 1.4, 1.5, 1.1],
  [-8.5, 0.75, -6, 1.4, 1.5, 1.1],
  [8.5, 0.75, 14, 1.4, 1.5, 1.1],
  [-9, 0.55, 18, 1.5, 1.1, 1.4],
  [9, 0.55, -18, 1.5, 1.1, 1.4],
  [-6, 1.35, -2, 2.8, 2.7, 1.6],
  [6, 1.35, 2, 2.8, 2.7, 1.6],
  [-11, 0.9, 0, 2.2, 1.8, 1.4],
  [11, 0.9, 0, 2.2, 1.8, 1.4],
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
