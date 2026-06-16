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
const STAIR_STEPS = 10;
const STAIR_RISE = FLOOR1_H / STAIR_STEPS;
const STAIR_RUN = 0.5;

/** Main east–west hallway band (both floors). */
export const SCHOOL_MAIN_HALL = { minX: -20, maxX: 20, minZ: -3.5, maxZ: 3.5 };

/** North spur to the gym and south spur to the cafeteria. */
export const SCHOOL_NORTH_SPUR = { minX: -3.5, maxX: 3.5, minZ: 3.5, maxZ: 20 };
export const SCHOOL_SOUTH_SPUR = { minX: -3.5, maxX: 3.5, minZ: -20, maxZ: -3.5 };

export const SCHOOL_GYM = { minX: -18, maxX: 18, minZ: 10, maxZ: 24 };
export const SCHOOL_CAFE = { minX: -18, maxX: 18, minZ: -24, maxZ: -10 };

export interface SchoolClassroom {
  id: string;
  floor: 1 | 2;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Chalkboard is placed on this wall (inside the room). */
  boardWall: "north" | "south" | "west" | "east";
}

export const SCHOOL_CLASSROOMS: SchoolClassroom[] = [
  { id: "w1", floor: 1, minX: -22, maxX: -8, minZ: 5, maxZ: 18, boardWall: "north" },
  { id: "w2", floor: 1, minX: -22, maxX: -8, minZ: -18, maxZ: -5, boardWall: "south" },
  { id: "e1", floor: 1, minX: 8, maxX: 22, minZ: 5, maxZ: 18, boardWall: "north" },
  { id: "e2", floor: 1, minX: 8, maxX: 22, minZ: -18, maxZ: -5, boardWall: "south" },
  { id: "w1-up", floor: 2, minX: -22, maxX: -8, minZ: 6, maxZ: 20, boardWall: "north" },
  { id: "w2-up", floor: 2, minX: -22, maxX: -8, minZ: -20, maxZ: -6, boardWall: "south" },
  { id: "e1-up", floor: 2, minX: 8, maxX: 22, minZ: 6, maxZ: 20, boardWall: "north" },
  { id: "e2-up", floor: 2, minX: 8, maxX: 22, minZ: -20, maxZ: -6, boardWall: "south" },
];

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
): { x: number; z: number } {
  for (let i = 0; i < STAIR_STEPS; i++) {
    const topY = (i + 1) * STAIR_RISE;
    const z = zStart + zDir * (i * STAIR_RUN + STAIR_RUN * 0.5);
    solids.push(
      solidBox(x, topY * 0.5, z, 2.8, topY, STAIR_RUN * 0.92, "prop", true),
    );
  }
  const landingZ = zStart + zDir * (STAIR_STEPS * STAIR_RUN + 0.8);
  solids.push(
    solidBox(x, FLOOR2_Y - 0.05, landingZ, 3.2, 0.12, 2.8, "prop", false),
  );
  return { x, z: landingZ };
}

function classroomDoorGap(room: SchoolClassroom): [number, number] {
  const midZ = (room.minZ + room.maxZ) / 2;
  return [midZ - 1.6, midZ + 1.6];
}

function addClassroomWalls(
  solids: ArenaSolidBox[],
  room: SchoolClassroom,
  cy: number,
  sy: number,
): void {
  const door = classroomDoorGap(room);
  if (room.minX < 0) {
    addWallSegmentsX(solids, room.maxX, room.minZ, room.maxZ, [door], cy, sy);
  } else {
    addWallSegmentsX(solids, room.minX, room.minZ, room.maxZ, [door], cy, sy);
  }
}

function addClassroomDesks(solids: ArenaSolidBox[], room: SchoolClassroom): void {
  const cy = room.floor === 1 ? 0.75 : FLOOR2_Y + 0.75;
  const centerX = (room.minX + room.maxX) / 2;
  const centerZ = (room.minZ + room.maxZ) / 2;
  const faceNorth = room.boardWall === "north";
  const rows = 3;
  const cols = 2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ox = (col - 0.5) * 2.4;
      const oz = faceNorth ? room.minZ + 3 + row * 2.2 : room.maxZ - 3 - row * 2.2;
      solids.push(colliderBox(centerX + ox, cy, oz, 1.2, 1.5, 0.8, true));
    }
  }
  const teacherZ = faceNorth ? room.maxZ - 1.4 : room.minZ + 1.4;
  solids.push(colliderBox(centerX, cy, teacherZ, 1.6, 1.5, 1, true));
}

export const SCHOOL_SOLID_BOXES: ArenaSolidBox[] = [
  solidBox(0, -0.1, 0, FOOTPRINT, 0.2, FOOTPRINT, "floor", false),
  solidBox(0, TOTAL_H + 0.05, 0, FOOTPRINT, 0.1, FOOTPRINT, "ceiling", false),

  solidBox(0, TOTAL_H * 0.5, -HALF, FOOTPRINT, TOTAL_H, WALL_THICKNESS, "wall", true),
  solidBox(0, TOTAL_H * 0.5, HALF, FOOTPRINT, TOTAL_H, WALL_THICKNESS, "wall", true),
  solidBox(HALF, TOTAL_H * 0.5, 0, WALL_THICKNESS, TOTAL_H, FOOTPRINT, "wall", true),
  solidBox(-HALF, TOTAL_H * 0.5, 0, WALL_THICKNESS, TOTAL_H, FOOTPRINT, "wall", true),
];

/** Second-floor decks — gym atrium stays open below. */
SCHOOL_SOLID_BOXES.push(
  solidBox(-15, FLOOR2_Y - 0.1, -13, 14, 0.2, 12, "prop", false),
  solidBox(-15, FLOOR2_Y - 0.1, 13, 14, 0.2, 12, "prop", false),
  solidBox(15, FLOOR2_Y - 0.1, -13, 14, 0.2, 12, "prop", false),
  solidBox(15, FLOOR2_Y - 0.1, 13, 14, 0.2, 12, "prop", false),
  solidBox(0, FLOOR2_Y - 0.1, 0, 16, 0.2, 7, "prop", false),
);

const hallDoor = (): Array<[number, number]> => [[-4, 4]];

/** Gym and cafeteria entries off the north/south spurs. */
addWallSegmentsZ(SCHOOL_SOLID_BOXES, 10, -18, 18, hallDoor(), WALL_CY_F1, FLOOR1_H);
addWallSegmentsZ(SCHOOL_SOLID_BOXES, -10, -18, 18, hallDoor(), WALL_CY_F1, FLOOR1_H);

/** Floor 1 classrooms open into the main hall. */
for (const room of SCHOOL_CLASSROOMS.filter((room) => room.floor === 1)) {
  addClassroomWalls(SCHOOL_SOLID_BOXES, room, WALL_CY_F1, FLOOR1_H);
  addClassroomDesks(SCHOOL_SOLID_BOXES, room);
}

/** Floor 2 classroom walls. */
for (const room of SCHOOL_CLASSROOMS.filter((room) => room.floor === 2)) {
  addClassroomWalls(SCHOOL_SOLID_BOXES, room, WALL_CY_F2, FLOOR1_H);
  addClassroomDesks(SCHOOL_SOLID_BOXES, room);
}

/** Chalkboards inside classrooms. */
for (const room of SCHOOL_CLASSROOMS) {
  const cy = room.floor === 1 ? 1.35 : FLOOR2_Y + 1.35;
  const cx = (room.minX + room.maxX) / 2;
  const cz =
    room.boardWall === "north"
      ? room.maxZ - 0.25
      : room.boardWall === "south"
        ? room.minZ + 0.25
        : (room.minZ + room.maxZ) / 2;
  const sx = room.boardWall === "west" || room.boardWall === "east" ? 0.35 : 4.2;
  const sz = room.boardWall === "west" || room.boardWall === "east" ? 4.2 : 0.35;
  SCHOOL_SOLID_BOXES.push(colliderBox(cx, cy, cz, sx, 2.2, sz, true));
}

/** Twin stairwells off the main hall — each lands on the second-floor hallway. */
export const SCHOOL_STAIRS = [
  { x: -16, zStart: -1.5, zDir: 1 as const },
  { x: 16, zStart: -1.5, zDir: 1 as const },
];

export const SCHOOL_STAIR_LANDINGS: Array<{ x: number; z: number }> = [];

for (const stair of SCHOOL_STAIRS) {
  const landing = addStairRun(SCHOOL_SOLID_BOXES, stair.x, stair.zStart, stair.zDir);
  SCHOOL_STAIR_LANDINGS.push(landing);
}

/** Hall locker alcoves (cover along the main corridor). */
export const SCHOOL_HALL_LOCKERS: Array<[number, number]> = [
  [-12, -2.5],
  [-12, 2.5],
  [12, -2.5],
  [12, 2.5],
];

for (const [x, z] of SCHOOL_HALL_LOCKERS) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 1.1, z, 2.4, 2.2, 0.8, true));
}

/** Cafeteria serving line and lunch tables. */
SCHOOL_SOLID_BOXES.push(
  colliderBox(0, 1.05, -10.4, 14, 2.1, 1.2, true),
);

export const SCHOOL_CAFE_TABLES: Array<[number, number]> = [
  [-10, -18],
  [0, -18],
  [10, -18],
  [-10, -14],
  [0, -14],
  [10, -14],
  [-10, -22],
  [10, -22],
];

for (const [x, z] of SCHOOL_CAFE_TABLES) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 0.75, z, 2.6, 1.5, 1.4, true));
}

/** Gym side bleachers and basket poles. */
for (const x of [-15, 15] as const) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 1.1, 17, 4.5, 2.2, 10, true));
}
SCHOOL_SOLID_BOXES.push(
  colliderBox(0, 2.8, 12.5, 0.35, 0.5, 0.35, true),
  colliderBox(0, 2.8, 21.5, 0.35, 0.5, 0.35, true),
);

export const SCHOOL_SPAWN_A = { x: 0, z: -16, y: 1 } as const;
export const SCHOOL_SPAWN_B = { x: 0, z: 16, y: 1 } as const;
export const SCHOOL_UPSTAIRS_SPAWN = { x: 0, z: 0, y: SCHOOL_FLOOR2_FEET_Y } as const;
