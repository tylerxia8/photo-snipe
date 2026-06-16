import { solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

const HALF = 20;
const FOOTPRINT = HALF * 2;
const WALL_HEIGHT = 4.5;
const WALL_THICKNESS = 0.35;

export const PARKING_GARAGE_LAYOUT: ArenaLayoutConfig = {
  id: "parking-garage-01",
  name: "Parking Garage",
  halfExtent: HALF,
  wallHeight: WALL_HEIGHT,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
};

/** Simple indoor garage — open floor, concrete pillars, a few parked cars. */
export const PARKING_GARAGE_SOLID_BOXES: ArenaSolidBox[] = [
  solidBox(0, -0.1, 0, FOOTPRINT, 0.2, FOOTPRINT, "floor", false),
  solidBox(0, WALL_HEIGHT + 0.05, 0, FOOTPRINT, 0.1, FOOTPRINT, "ceiling", false),

  solidBox(0, WALL_HEIGHT * 0.5, -HALF, FOOTPRINT, WALL_HEIGHT, WALL_THICKNESS, "wall", true),
  solidBox(0, WALL_HEIGHT * 0.5, HALF, FOOTPRINT, WALL_HEIGHT, WALL_THICKNESS, "wall", true),
  solidBox(HALF, WALL_HEIGHT * 0.5, 0, WALL_THICKNESS, WALL_HEIGHT, FOOTPRINT, "wall", true),
  solidBox(-HALF, WALL_HEIGHT * 0.5, 0, WALL_THICKNESS, WALL_HEIGHT, FOOTPRINT, "wall", true),
];

for (const [x, z] of [
  [-12, -8],
  [12, -8],
  [-12, 0],
  [12, 0],
  [-12, 8],
  [12, 8],
  [-6, -12],
  [6, -12],
  [-6, 12],
  [6, 12],
] as const) {
  PARKING_GARAGE_SOLID_BOXES.push(solidBox(x, WALL_HEIGHT * 0.5, z, 1.1, WALL_HEIGHT, 1.1, "prop", true));
}

for (const [x, z, sx, sz] of [
  [-9, -13, 4.2, 2],
  [9, -13, 4.2, 2],
  [-9, 13, 4.2, 2],
  [9, 13, 4.2, 2],
] as const) {
  PARKING_GARAGE_SOLID_BOXES.push(solidBox(x, 0.75, z, sx, 1.5, sz, "prop", true));
}

PARKING_GARAGE_SOLID_BOXES.push(
  solidBox(0, 0.55, -5, 3.6, 1.1, 0.7, "prop", true),
  solidBox(0, 0.55, 5, 3.6, 1.1, 0.7, "prop", true),
);

export const PARKING_GARAGE_SPAWN_A = { x: 0, z: -16, y: 1 } as const;
export const PARKING_GARAGE_SPAWN_B = { x: 0, z: 16, y: 1 } as const;
