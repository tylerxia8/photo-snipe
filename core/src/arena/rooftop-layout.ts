import { solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

const HALF = 18;
const FOOTPRINT = HALF * 2;
const PARAPET = 1.4;
const WALL_THICKNESS = 0.35;

export const ROOFTOP_LAYOUT: ArenaLayoutConfig = {
  id: "rooftop-01",
  name: "City Rooftop",
  halfExtent: HALF,
  wallHeight: PARAPET,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
  interiorWalls: [
    { x: -8, z: 0, halfZ: 5 },
    { x: 8, z: 0, halfZ: 5 },
  ],
};

/** Open-air rooftop with HVAC cover and low parapet walls. */
export const ROOFTOP_SOLID_BOXES: ArenaSolidBox[] = [
  solidBox(0, -0.1, 0, FOOTPRINT, 0.2, FOOTPRINT, "floor", false),
  solidBox(0, 12, 0, FOOTPRINT, 0.2, FOOTPRINT, "ceiling", false),

  solidBox(0, PARAPET * 0.5, -HALF, FOOTPRINT, PARAPET, WALL_THICKNESS, "wall", true),
  solidBox(0, PARAPET * 0.5, HALF, FOOTPRINT, PARAPET, WALL_THICKNESS, "wall", true),
  solidBox(HALF, PARAPET * 0.5, 0, WALL_THICKNESS, PARAPET, FOOTPRINT, "wall", true),
  solidBox(-HALF, PARAPET * 0.5, 0, WALL_THICKNESS, PARAPET, FOOTPRINT, "wall", true),

  solidBox(-8, PARAPET * 0.5, 0, WALL_THICKNESS, PARAPET, 10, "wall", true),
  solidBox(8, PARAPET * 0.5, 0, WALL_THICKNESS, PARAPET, 10, "wall", true),
];

const hvacUnits: Array<[number, number, number, number, number, number]> = [
  [-12, 1.1, -10, 3.5, 2.2, 2.8],
  [12, 1.1, -10, 3.5, 2.2, 2.8],
  [-12, 1.1, 10, 3.5, 2.2, 2.8],
  [12, 1.1, 10, 3.5, 2.2, 2.8],
  [0, 1.4, 0, 5, 2.8, 4],
  [-5, 0.9, -2, 2.2, 1.8, 2.2],
  [5, 0.9, 2, 2.2, 1.8, 2.2],
];

for (const [x, y, z, sx, sy, sz] of hvacUnits) {
  ROOFTOP_SOLID_BOXES.push(solidBox(x, y, z, sx, sy, sz, "prop", true));
}

for (const [x, z] of [
  [-4, -14],
  [4, 14],
] as const) {
  ROOFTOP_SOLID_BOXES.push(solidBox(x, 1.8, z, 1.2, 3.6, 1.2, "prop", true));
}

for (const [x, z, sx, sz] of [
  [-14, 0, 2.5, 6],
  [14, 0, 2.5, 6],
] as const) {
  ROOFTOP_SOLID_BOXES.push(solidBox(x, 0.55, z, sx, 1.1, sz, "prop", true));
}
