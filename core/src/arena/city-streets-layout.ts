import { solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

const HALF = 20;
const FOOTPRINT = HALF * 2;
const STREET_HALF = 3;
const PARAPET = 1.2;
const WALL_THICKNESS = 0.35;
const BUILDING_H = 10;
const BLOCK = 11;

export const CITY_STREETS_LAYOUT: ArenaLayoutConfig = {
  id: "city-streets-01",
  name: "Urban Streets",
  halfExtent: HALF,
  wallHeight: PARAPET,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
};

/** Open-air downtown grid — avenues, corner towers, and street cover. */
export const CITY_STREETS_SOLID_BOXES: ArenaSolidBox[] = [
  solidBox(0, -0.1, 0, FOOTPRINT, 0.2, FOOTPRINT, "floor", false),
  solidBox(0, 12, 0, FOOTPRINT, 0.2, FOOTPRINT, "ceiling", false),

  solidBox(0, PARAPET * 0.5, -HALF, FOOTPRINT, PARAPET, WALL_THICKNESS, "wall", true),
  solidBox(0, PARAPET * 0.5, HALF, FOOTPRINT, PARAPET, WALL_THICKNESS, "wall", true),
  solidBox(HALF, PARAPET * 0.5, 0, WALL_THICKNESS, PARAPET, FOOTPRINT, "wall", true),
  solidBox(-HALF, PARAPET * 0.5, 0, WALL_THICKNESS, PARAPET, FOOTPRINT, "wall", true),
];

const cornerBlocks: Array<[number, number]> = [
  [-14, -14],
  [14, -14],
  [-14, 14],
  [14, 14],
];

for (const [x, z] of cornerBlocks) {
  CITY_STREETS_SOLID_BOXES.push(
    solidBox(x, BUILDING_H * 0.5, z, BLOCK, BUILDING_H, BLOCK, "prop", true),
  );
}

/** Mid-rise facades lining the alleys beside the main avenues. */
const alleyBuildings: Array<[number, number, number, number, number, number]> = [
  [-6.5, BUILDING_H * 0.5, -10, 4, BUILDING_H, 7],
  [-6.5, BUILDING_H * 0.5, 10, 4, BUILDING_H, 7],
  [6.5, BUILDING_H * 0.5, -10, 4, BUILDING_H, 7],
  [6.5, BUILDING_H * 0.5, 10, 4, BUILDING_H, 7],
  [-10, BUILDING_H * 0.5, -6.5, 7, BUILDING_H, 4],
  [10, BUILDING_H * 0.5, -6.5, 7, BUILDING_H, 4],
  [-10, BUILDING_H * 0.5, 6.5, 7, BUILDING_H, 4],
  [10, BUILDING_H * 0.5, 6.5, 7, BUILDING_H, 4],
];

for (const [x, y, z, sx, sy, sz] of alleyBuildings) {
  CITY_STREETS_SOLID_BOXES.push(solidBox(x, y, z, sx, sy, sz, "prop", true));
}

/** Low street cover — cars, kiosks, dumpsters, and bus shelters. */
const streetProps: Array<[number, number, number, number, number, number]> = [
  [-8, 0.65, -16, 1.9, 1.3, 4.2],
  [8, 0.65, 16, 1.9, 1.3, 4.2],
  [-8, 0.65, 16, 1.9, 1.3, 4.2],
  [8, 0.65, -16, 1.9, 1.3, 4.2],
  [-5, 0.65, -6, 1.9, 1.3, 4],
  [5, 0.65, 6, 1.9, 1.3, 4],
  [-5, 0.65, 8, 1.9, 1.3, 4],
  [5, 0.65, -8, 1.9, 1.3, 4],
  [-9, 0.55, 0, 1.6, 1.1, 1.6],
  [9, 0.55, 0, 1.6, 1.1, 1.6],
  [0, 0.55, -9, 1.6, 1.1, 1.6],
  [0, 0.55, 9, 1.6, 1.1, 1.6],
  [-11, 0.9, -4, 2.2, 1.8, 1.4],
  [11, 0.9, 4, 2.2, 1.8, 1.4],
  [-11, 0.9, 4, 2.2, 1.8, 1.4],
  [11, 0.9, -4, 2.2, 1.8, 1.4],
  [-7, 1.35, -2, 2.8, 2.7, 1.6],
  [7, 1.35, 2, 2.8, 2.7, 1.6],
  [2, 1.35, -7, 1.6, 2.7, 2.8],
  [-2, 1.35, 7, 1.6, 2.7, 2.8],
  [-4, 0.45, 0, 1.8, 0.9, 1],
  [4, 0.45, 0, 1.8, 0.9, 1],
];

for (const [x, y, z, sx, sy, sz] of streetProps) {
  CITY_STREETS_SOLID_BOXES.push(solidBox(x, y, z, sx, sy, sz, "prop", true));
}

/** Thin lamp posts and hydrants — partial sight-line breaks. */
for (const [x, z] of [
  [-STREET_HALF - 1.2, -12],
  [STREET_HALF + 1.2, -12],
  [-STREET_HALF - 1.2, 12],
  [STREET_HALF + 1.2, 12],
  [-12, -STREET_HALF - 1.2],
  [-12, STREET_HALF + 1.2],
  [12, -STREET_HALF - 1.2],
  [12, STREET_HALF + 1.2],
] as const) {
  CITY_STREETS_SOLID_BOXES.push(solidBox(x, 1.75, z, 0.35, 3.5, 0.35, "prop", true));
}
