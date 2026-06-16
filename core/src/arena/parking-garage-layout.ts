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

/** Simple indoor garage — open floor, concrete pillars, parked cars, spawn cover. */
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
  [-14, -14],
  [14, 14],
  [-6, -4],
  [6, 4],
] as const) {
  PARKING_GARAGE_SOLID_BOXES.push(solidBox(x, WALL_HEIGHT * 0.5, z, 1.1, WALL_HEIGHT, 1.1, "prop", true));
}

/** Spawn cover — one car directly ahead of each spawn so players start behind metal. */
for (const [x, z] of [
  [-10, -12.5],
  [10, 12.5],
  [-14, 0],
  [14, 0],
] as const) {
  PARKING_GARAGE_SOLID_BOXES.push(solidBox(x, 0.75, z, 4.2, 1.5, 2, "prop", true));
}

PARKING_GARAGE_SOLID_BOXES.push(
  solidBox(0, 0.55, -5, 16, 1.1, 0.7, "prop", true),
  solidBox(0, 0.55, 5, 16, 1.1, 0.7, "prop", true),
  solidBox(0, 1.2, -11, 30, 2.4, 0.6, "prop", true),
  solidBox(0, 1.2, 11, 30, 2.4, 0.6, "prop", true),
);

/** Behind the south spawn car, facing its rear (+Z). */
export const PARKING_GARAGE_SPAWN_A = { x: -10, z: -16, y: 1 } as const;
/** Behind the north spawn car, facing its rear (-Z). */
export const PARKING_GARAGE_SPAWN_B = { x: 10, z: 16, y: 1 } as const;

export const PARKING_GARAGE_SPAWN_A_ROTATION = [0, 0, 0] as const;
export const PARKING_GARAGE_SPAWN_B_ROTATION = [0, 180, 0] as const;
