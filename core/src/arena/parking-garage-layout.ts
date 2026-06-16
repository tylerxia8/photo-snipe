import { colliderBox, solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

const HALF = 20;
const FOOTPRINT = HALF * 2;
const WALL_HEIGHT = 4.5;
const WALL_THICKNESS = 0.35;

/** Structural columns — wide enough to duck behind in firefights. */
export const PARKING_GARAGE_PILLAR_SIZE = 1.8;
/** Parked sedans — tall and wide enough for movement + photo cover. */
export const PARKING_GARAGE_CAR_LENGTH = 4.6;
export const PARKING_GARAGE_CAR_HEIGHT = 2.0;
export const PARKING_GARAGE_CAR_WIDTH = 2.4;

export const PARKING_GARAGE_PILLAR_POSITIONS = [
  [-12, -8],
  [12, -8],
  [-12, 8],
  [12, 8],
  [0, -6],
  [0, 6],
  [-6, 0],
  [6, 0],
  [0, 0],
] as const;

/** Parked car slots — model front faces +Z at 0°, +X at 90°, etc. */
export const PARKING_GARAGE_CARS = [
  { x: -10, z: -13, facingY: 0 },
  { x: 10, z: 13, facingY: 180 },
  { x: -14, z: 0, facingY: 90 },
  { x: 14, z: 0, facingY: 270 },
  { x: 0, z: -12, facingY: 0 },
  { x: 0, z: 12, facingY: 180 },
] as const;

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
    colliderBox(
      x,
      WALL_HEIGHT * 0.5,
      z,
      PARKING_GARAGE_PILLAR_SIZE,
      WALL_HEIGHT,
      PARKING_GARAGE_PILLAR_SIZE,
      true,
    ),
  );
}

function addCar(boxes: ArenaSolidBox[], x: number, z: number, facingY: number): void {
  const alongX = facingY === 90 || facingY === 270;
  const sx = alongX ? PARKING_GARAGE_CAR_LENGTH : PARKING_GARAGE_CAR_WIDTH;
  const sz = alongX ? PARKING_GARAGE_CAR_WIDTH : PARKING_GARAGE_CAR_LENGTH;
  boxes.push(
    colliderBox(
      x,
      PARKING_GARAGE_CAR_HEIGHT * 0.5,
      z,
      sx,
      PARKING_GARAGE_CAR_HEIGHT,
      sz,
      true,
    ),
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

for (const [x, z] of PARKING_GARAGE_PILLAR_POSITIONS) {
  addPillar(PARKING_GARAGE_SOLID_BOXES, x, z);
}

for (const { x, z, facingY } of PARKING_GARAGE_CARS) {
  addCar(PARKING_GARAGE_SOLID_BOXES, x, z, facingY);
}

/** Behind the south spawn car, facing its rear (+Z). */
export const PARKING_GARAGE_SPAWN_A = { x: -10, z: -16, y: 1 } as const;
/** Behind the north spawn car, facing its rear (-Z). */
export const PARKING_GARAGE_SPAWN_B = { x: 10, z: 16, y: 1 } as const;

export const PARKING_GARAGE_SPAWN_A_ROTATION = [0, 0, 0] as const;
export const PARKING_GARAGE_SPAWN_B_ROTATION = [0, 180, 0] as const;
