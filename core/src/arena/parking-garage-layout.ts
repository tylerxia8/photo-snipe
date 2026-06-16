import { solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

const HALF = 20;
const FOOTPRINT = HALF * 2;
const WALL_HEIGHT = 4.5;
const WALL_THICKNESS = 0.35;

/** Structural columns — wide enough to duck behind in firefights. */
const PILLAR_SIZE = 1.8;
/** Parked sedans — tall and wide enough for movement + photo cover. */
const CAR_LENGTH = 4.6;
const CAR_HEIGHT = 2.0;
const CAR_WIDTH = 2.4;

export const PARKING_GARAGE_LAYOUT: ArenaLayoutConfig = {
  id: "parking-garage-01",
  name: "Parking Garage",
  halfExtent: HALF,
  wallHeight: WALL_HEIGHT,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
};

function addPillar(boxes: ArenaSolidBox[], x: number, z: number): void {
  boxes.push(
    solidBox(x, WALL_HEIGHT * 0.5, z, PILLAR_SIZE, WALL_HEIGHT, PILLAR_SIZE, "prop", true),
  );
}

function addCar(boxes: ArenaSolidBox[], x: number, z: number): void {
  boxes.push(
    solidBox(x, CAR_HEIGHT * 0.5, z, CAR_LENGTH, CAR_HEIGHT, CAR_WIDTH, "prop", true),
  );
}

/** Simple indoor garage — open floor with concrete pillars and parked cars only. */
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
  [-12, 8],
  [12, 8],
  [0, -6],
  [0, 6],
  [-6, 0],
  [6, 0],
  [0, 0],
] as const) {
  addPillar(PARKING_GARAGE_SOLID_BOXES, x, z);
}

for (const [x, z] of [
  [-10, -13],
  [10, 13],
  [-14, 0],
  [14, 0],
  [-8, -10],
  [8, 10],
] as const) {
  addCar(PARKING_GARAGE_SOLID_BOXES, x, z);
}

/** Behind the south spawn car, facing its rear (+Z). */
export const PARKING_GARAGE_SPAWN_A = { x: -10, z: -16, y: 1 } as const;
/** Behind the north spawn car, facing its rear (-Z). */
export const PARKING_GARAGE_SPAWN_B = { x: 10, z: 16, y: 1 } as const;

export const PARKING_GARAGE_SPAWN_A_ROTATION = [0, 0, 0] as const;
export const PARKING_GARAGE_SPAWN_B_ROTATION = [0, 180, 0] as const;
