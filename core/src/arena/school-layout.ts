import { colliderBox, solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

export const SCHOOL_HALF = 26;
export const SCHOOL_FLOOR1_HEIGHT = 3.6;
export const SCHOOL_FLOOR2_Y = 3.6;
export const SCHOOL_FLOOR2_FEET_Y = SCHOOL_FLOOR2_Y + 0.1;
export const SCHOOL_TOTAL_HEIGHT = 7.2;

const HALF = SCHOOL_HALF;
const FOOTPRINT = HALF * 2;
const WALL_THICKNESS = 0.35;
const FLOOR1_H = SCHOOL_FLOOR1_HEIGHT;
const FLOOR2_Y = SCHOOL_FLOOR2_Y;
const TOTAL_H = SCHOOL_TOTAL_HEIGHT;
const WALL_CY_F1 = FLOOR1_H * 0.5;
const WALL_CY_F2 = FLOOR2_Y + FLOOR1_H * 0.5;
const STAIR_STEPS = 9;
const STAIR_RISE = FLOOR1_H / STAIR_STEPS;
const STAIR_RUN = 0.55;

export const SCHOOL_LAYOUT: ArenaLayoutConfig = {
  id: "school-01",
  name: "School",
  halfExtent: HALF,
  wallHeight: TOTAL_H,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
};

function addWallSegmentsX(
  solids: ArenaSolidBox[],
  x: number,
  zMin: number,
  zMax: number,
  gaps: Array<[number, number]>,
  cy: number,
  sy: number,
): void {
  const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
  let cursor = zMin;
  for (const [gapMin, gapMax] of sorted) {
    if (gapMin > cursor) {
      const len = gapMin - cursor;
      solids.push(
        solidBox(x, cy, (cursor + gapMin) / 2, WALL_THICKNESS, sy, len, "wall", true),
      );
    }
    cursor = Math.max(cursor, gapMax);
  }
  if (cursor < zMax) {
    const len = zMax - cursor;
    solids.push(
      solidBox(x, cy, (cursor + zMax) / 2, WALL_THICKNESS, sy, len, "wall", true),
    );
  }
}

function addWallSegmentsZ(
  solids: ArenaSolidBox[],
  z: number,
  xMin: number,
  xMax: number,
  gaps: Array<[number, number]>,
  cy: number,
  sy: number,
): void {
  const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
  let cursor = xMin;
  for (const [gapMin, gapMax] of sorted) {
    if (gapMin > cursor) {
      const len = gapMin - cursor;
      solids.push(
        solidBox((cursor + gapMin) / 2, cy, z, len, sy, WALL_THICKNESS, "wall", true),
      );
    }
    cursor = Math.max(cursor, gapMax);
  }
  if (cursor < xMax) {
    const len = xMax - cursor;
    solids.push(
      solidBox((cursor + xMax) / 2, cy, z, len, sy, WALL_THICKNESS, "wall", true),
    );
  }
}

function addStairRun(
  solids: ArenaSolidBox[],
  x: number,
  zStart: number,
  zDir: 1 | -1,
): void {
  for (let i = 0; i < STAIR_STEPS; i++) {
    const topY = (i + 1) * STAIR_RISE;
    const z = zStart + zDir * (i * STAIR_RUN + STAIR_RUN * 0.5);
    solids.push(
      solidBox(x, topY * 0.5, z, 2.6, topY, STAIR_RUN * 0.92, "prop", true),
    );
  }
}

export const SCHOOL_SOLID_BOXES: ArenaSolidBox[] = [
  solidBox(0, -0.1, 0, FOOTPRINT, 0.2, FOOTPRINT, "floor", false),
  solidBox(0, TOTAL_H + 0.05, 0, FOOTPRINT, 0.1, FOOTPRINT, "ceiling", false),

  solidBox(0, TOTAL_H * 0.5, -HALF, FOOTPRINT, TOTAL_H, WALL_THICKNESS, "wall", true),
  solidBox(0, TOTAL_H * 0.5, HALF, FOOTPRINT, TOTAL_H, WALL_THICKNESS, "wall", true),
  solidBox(HALF, TOTAL_H * 0.5, 0, WALL_THICKNESS, TOTAL_H, FOOTPRINT, "wall", true),
  solidBox(-HALF, TOTAL_H * 0.5, 0, WALL_THICKNESS, TOTAL_H, FOOTPRINT, "wall", true),
];

/** Second-floor decks — gym stays open as a double-height atrium. */
SCHOOL_SOLID_BOXES.push(
  solidBox(-15, FLOOR2_Y - 0.1, 0, 18, 0.2, 36, "prop", false),
  solidBox(15, FLOOR2_Y - 0.1, 0, 18, 0.2, 36, "prop", false),
  solidBox(0, FLOOR2_Y - 0.1, 0, 12, 0.2, 10, "prop", false),
);

const hallDoor = (): Array<[number, number]> => [
  [-14, -10],
  [10, 14],
];

/** Floor 1 room dividers. */
addWallSegmentsZ(SCHOOL_SOLID_BOXES, 8, -22, 22, hallDoor(), WALL_CY_F1, FLOOR1_H);
addWallSegmentsZ(SCHOOL_SOLID_BOXES, -8, -22, 22, hallDoor(), WALL_CY_F1, FLOOR1_H);
addWallSegmentsX(SCHOOL_SOLID_BOXES, -8, -18, 18, [[-14, -10], [-2, 2], [10, 14]], WALL_CY_F1, FLOOR1_H);
addWallSegmentsX(SCHOOL_SOLID_BOXES, 8, -18, 18, [[-2, 2]], WALL_CY_F1, FLOOR1_H);
addWallSegmentsZ(SCHOOL_SOLID_BOXES, 0, -24, -8, [[-16, -12]], WALL_CY_F1, FLOOR1_H);

/** Floor 2 classroom dividers. */
addWallSegmentsZ(SCHOOL_SOLID_BOXES, 6, -22, 22, hallDoor(), WALL_CY_F2, FLOOR1_H);
addWallSegmentsZ(SCHOOL_SOLID_BOXES, -6, -22, 22, hallDoor(), WALL_CY_F2, FLOOR1_H);
addWallSegmentsX(SCHOOL_SOLID_BOXES, -6, -22, 22, [[-14, -10], [-2, 2], [10, 14]], WALL_CY_F2, FLOOR1_H);
addWallSegmentsX(SCHOOL_SOLID_BOXES, 6, -22, 22, [[-14, -10], [-2, 2], [10, 14]], WALL_CY_F2, FLOOR1_H);

/** Twin stair runs from the main hallway up to the second floor. */
export const SCHOOL_STAIRS = [
  { x: -12, zStart: -3.5, zDir: 1 as const },
  { x: 12, zStart: -3.5, zDir: 1 as const },
];

for (const stair of SCHOOL_STAIRS) {
  addStairRun(SCHOOL_SOLID_BOXES, stair.x, stair.zStart, stair.zDir);
}

/** Locker banks along the east-wing hallway. */
export const SCHOOL_LOCKER_ROWS: Array<[number, number]> = [
  [18, -15],
  [18, -9],
  [18, -3],
  [18, 3],
  [18, 9],
  [18, 15],
];

for (const [x, z] of SCHOOL_LOCKER_ROWS) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 1.1, z, 0.8, 2.2, 2.4, true));
}

/** Cafeteria tables. */
export const SCHOOL_CAFE_TABLES: Array<[number, number]> = [
  [-14, -18],
  [-6, -18],
  [6, -18],
  [14, -18],
  [-14, -12],
  [0, -12],
  [14, -12],
];

for (const [x, z] of SCHOOL_CAFE_TABLES) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 0.75, z, 2.4, 1.5, 1.2, true));
}

/** Gym bleachers along the north wall. */
for (const x of [-16, -8, 0, 8, 16] as const) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 0.9, 21, 5.5, 1.8, 2.2, true));
}

/** Floor 1 classroom desks. */
export const SCHOOL_CLASSROOM_DESKS: Array<[number, number]> = [
  [-18, 10],
  [-14, 10],
  [-18, 4],
  [-14, 4],
  [-18, -4],
  [-14, -4],
  [-18, -10],
  [-14, -10],
];

for (const [x, z] of SCHOOL_CLASSROOM_DESKS) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 0.75, z, 1.4, 1.5, 0.9, true));
}

/** Floor 2 classroom desks. */
export const SCHOOL_UPSTAIRS_DESKS: Array<[number, number]> = [
  [-16, 16],
  [-10, 16],
  [10, 16],
  [16, 16],
  [-16, -16],
  [-10, -16],
  [10, -16],
  [16, -16],
];

for (const [x, z] of SCHOOL_UPSTAIRS_DESKS) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, FLOOR2_Y + 0.75, z, 1.4, 1.5, 0.9, true));
}

/** Teacher desks / chalkboard walls. */
SCHOOL_SOLID_BOXES.push(
  colliderBox(-16, 1.2, 16, 3.6, 2.4, 0.35, true),
  colliderBox(-16, 1.2, -16, 3.6, 2.4, 0.35, true),
  colliderBox(-16, FLOOR2_Y + 1.2, 16, 3.6, 2.4, 0.35, true),
  colliderBox(16, FLOOR2_Y + 1.2, 16, 3.6, 2.4, 0.35, true),
);

export const SCHOOL_SPAWN_A = { x: -16, z: -18, y: 1 } as const;
export const SCHOOL_SPAWN_B = { x: 16, z: 18, y: 1 } as const;

export const SCHOOL_UPSTAIRS_SPAWN = { x: 0, z: 0, y: SCHOOL_FLOOR2_FEET_Y } as const;
