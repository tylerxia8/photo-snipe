import { colliderBox, solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

export const SCHOOL_HALF = 24;
export const SCHOOL_FLOOR1_HEIGHT = 3.6;
export const SCHOOL_FLOOR2_Y = 3.6;
export const SCHOOL_FLOOR2_FEET_Y = SCHOOL_FLOOR2_Y;
export const SCHOOL_TOTAL_HEIGHT = 7.2;
export const SCHOOL_F1_CEILING_Y = SCHOOL_FLOOR2_Y;

const HALF = SCHOOL_HALF;
const FOOTPRINT = HALF * 2;
const WALL_THICKNESS = 0.35;
const FLOOR1_H = SCHOOL_FLOOR1_HEIGHT;
const FLOOR2_Y = SCHOOL_FLOOR2_Y;
const F1_CEILING_Y = SCHOOL_F1_CEILING_Y;
const TOTAL_H = SCHOOL_TOTAL_HEIGHT;
const WALL_CY_F1 = FLOOR1_H * 0.5;
const WALL_CY_F2 = FLOOR2_Y + FLOOR1_H * 0.5;
const STAIR_STEPS = 8;
const FLOOR1_FEET_Y = 1;
const STAIR_RISE = (FLOOR2_Y - FLOOR1_FEET_Y) / STAIR_STEPS;
const STAIR_RUN = 0.55;
const DOOR_HALF = 2.5;

/** Classic cross-shaped main hall (like CS Office / F.E.A.R. school wings). */
export const SCHOOL_MAIN_HALL = { minX: -18, maxX: 18, minZ: -2.5, maxZ: 2.5 };

export const SCHOOL_GYM = { minX: -16, maxX: 16, minZ: 6, maxZ: 20 };
export const SCHOOL_CAFE = { minX: -16, maxX: 16, minZ: -20, maxZ: -6 };

export interface SchoolClassroom {
  id: string;
  floor: 1 | 2;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  boardWall: "north" | "south";
}

export const SCHOOL_CLASSROOMS: SchoolClassroom[] = [
  { id: "w1", floor: 1, minX: -23, maxX: -6, minZ: 3, maxZ: 10, boardWall: "north" },
  { id: "w2", floor: 1, minX: -23, maxX: -6, minZ: -10, maxZ: -3, boardWall: "south" },
  { id: "e1", floor: 1, minX: 6, maxX: 23, minZ: 3, maxZ: 10, boardWall: "north" },
  { id: "e2", floor: 1, minX: 6, maxX: 23, minZ: -10, maxZ: -3, boardWall: "south" },
  { id: "w1-up", floor: 2, minX: -23, maxX: -6, minZ: 4, maxZ: 18, boardWall: "north" },
  { id: "w2-up", floor: 2, minX: -23, maxX: -6, minZ: -18, maxZ: -4, boardWall: "south" },
  { id: "e1-up", floor: 2, minX: 6, maxX: 23, minZ: 4, maxZ: 18, boardWall: "north" },
  { id: "e2-up", floor: 2, minX: 6, maxX: 23, minZ: -18, maxZ: -4, boardWall: "south" },
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
      solids.push(
        solidBox(x, cy, (cursor + gapMin) / 2, WALL_THICKNESS, sy, gapMin - cursor, "wall", true),
      );
    }
    cursor = Math.max(cursor, gapMax);
  }
  if (cursor < zMax) {
    solids.push(
      solidBox(x, cy, (cursor + zMax) / 2, WALL_THICKNESS, sy, zMax - cursor, "wall", true),
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
      solids.push(
        solidBox((cursor + gapMin) / 2, cy, z, gapMin - cursor, sy, WALL_THICKNESS, "wall", true),
      );
    }
    cursor = Math.max(cursor, gapMax);
  }
  if (cursor < xMax) {
    solids.push(
      solidBox((cursor + xMax) / 2, cy, z, xMax - cursor, sy, WALL_THICKNESS, "wall", true),
    );
  }
}

function addEnclosedRoom(
  solids: ArenaSolidBox[],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  cy: number,
  sy: number,
  door:
    | { face: "west"; zGap: [number, number] }
    | { face: "east"; zGap: [number, number] }
    | { face: "north"; xGap: [number, number] }
    | { face: "south"; xGap: [number, number] },
): void {
  if (door.face === "west") {
    addWallSegmentsX(solids, minX, minZ, maxZ, [], cy, sy);
    addWallSegmentsX(solids, maxX, minZ, maxZ, [door.zGap], cy, sy);
    addWallSegmentsZ(solids, minZ, minX, maxX, [], cy, sy);
    addWallSegmentsZ(solids, maxZ, minX, maxX, [], cy, sy);
    return;
  }
  if (door.face === "east") {
    addWallSegmentsX(solids, maxX, minZ, maxZ, [], cy, sy);
    addWallSegmentsX(solids, minX, minZ, maxZ, [door.zGap], cy, sy);
    addWallSegmentsZ(solids, minZ, minX, maxX, [], cy, sy);
    addWallSegmentsZ(solids, maxZ, minX, maxX, [], cy, sy);
    return;
  }
  if (door.face === "north") {
    addWallSegmentsZ(solids, maxZ, minX, maxX, [], cy, sy);
    addWallSegmentsZ(solids, minZ, minX, maxX, [door.xGap], cy, sy);
    addWallSegmentsX(solids, minX, minZ, maxZ, [], cy, sy);
    addWallSegmentsX(solids, maxX, minZ, maxZ, [], cy, sy);
    return;
  }
  addWallSegmentsZ(solids, minZ, minX, maxX, [], cy, sy);
  addWallSegmentsZ(solids, maxZ, minX, maxX, [door.xGap], cy, sy);
  addWallSegmentsX(solids, minX, minZ, maxZ, [], cy, sy);
  addWallSegmentsX(solids, maxX, minZ, maxZ, [], cy, sy);
}

function addF1CeilingSlab(
  solids: ArenaSolidBox[],
  cx: number,
  cz: number,
  sx: number,
  sz: number,
): void {
  solids.push(
    solidBox(cx, F1_CEILING_Y - 0.175, cz, sx, 0.35, sz, "ceiling", true),
  );
}

function classroomDoorGap(room: SchoolClassroom): [number, number] {
  const midZ = (room.minZ + room.maxZ) / 2;
  return [midZ - DOOR_HALF, midZ + DOOR_HALF];
}

function addClassroomShell(solids: ArenaSolidBox[], room: SchoolClassroom, cy: number, sy: number): void {
  const door = classroomDoorGap(room);
  if (room.minX < 0) {
    addEnclosedRoom(solids, room.minX, room.maxX, room.minZ, room.maxZ, cy, sy, {
      face: "east",
      zGap: door,
    });
  } else {
    addEnclosedRoom(solids, room.minX, room.maxX, room.minZ, room.maxZ, cy, sy, {
      face: "west",
      zGap: door,
    });
  }
}

function addClassroomDesks(solids: ArenaSolidBox[], room: SchoolClassroom): void {
  const cy = room.floor === 1 ? 0.75 : FLOOR2_Y + 0.75;
  const centerX = (room.minX + room.maxX) / 2;
  const faceNorth = room.boardWall === "north";
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const ox = (col - 0.5) * 2.2;
      const oz = faceNorth ? room.minZ + 2.5 + row * 2 : room.maxZ - 2.5 - row * 2;
      solids.push(colliderBox(centerX + ox, cy, oz, 1.1, 1.4, 0.75, true));
    }
  }
}

/** Thin tread colliders only — movement code steps up between them. */
function addStairAlcove(solids: ArenaSolidBox[], x: number): { x: number; z: number } {
  addWallSegmentsX(solids, x - 1.35, -2.8, 2.8, [], WALL_CY_F1, FLOOR1_H);
  addWallSegmentsX(solids, x + 1.35, -2.8, 2.8, [], WALL_CY_F1, FLOOR1_H);

  for (let i = 0; i < STAIR_STEPS; i++) {
    const topY = FLOOR1_FEET_Y + (i + 1) * STAIR_RISE;
    const z = -2 + i * STAIR_RUN + STAIR_RUN * 0.5;
    solids.push(colliderBox(x, topY - 0.06, z, 2.4, 0.12, STAIR_RUN * 0.88, false));
  }

  solids.push(solidBox(x, FLOOR2_Y - 0.05, 0, 2.8, 0.12, 6, "prop", false));
  return { x, z: 0 };
}

export const SCHOOL_SOLID_BOXES: ArenaSolidBox[] = [
  solidBox(0, -0.1, 0, FOOTPRINT, 0.2, FOOTPRINT, "floor", false),
  solidBox(0, TOTAL_H + 0.05, 0, FOOTPRINT, 0.1, FOOTPRINT, "ceiling", false),

  solidBox(0, TOTAL_H * 0.5, -HALF, FOOTPRINT, TOTAL_H, WALL_THICKNESS, "wall", true),
  solidBox(0, TOTAL_H * 0.5, HALF, FOOTPRINT, TOTAL_H, WALL_THICKNESS, "wall", true),
  solidBox(HALF, TOTAL_H * 0.5, 0, WALL_THICKNESS, TOTAL_H, FOOTPRINT, "wall", true),
  solidBox(-HALF, TOTAL_H * 0.5, 0, WALL_THICKNESS, TOTAL_H, FOOTPRINT, "wall", true),
];

/** First-floor ceiling hides floor 2 — open only above gym atrium and stair alcoves. */
addF1CeilingSlab(SCHOOL_SOLID_BOXES, -14.5, 7, 13, 10);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, 14.5, 7, 13, 10);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, -14.5, -13, 13, 10);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, 14.5, -13, 13, 10);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, 0, -13, 10, 10);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, 0, 0, 6, 5);

/** Second floor — hall segments with stair alcoves cut out at x = ±10. */
SCHOOL_SOLID_BOXES.push(
  solidBox(-15, FLOOR2_Y - 0.1, 0, 6, 0.2, 5, "prop", false),
  solidBox(-7, FLOOR2_Y - 0.1, 0, 10, 0.2, 5, "prop", false),
  solidBox(0, FLOOR2_Y - 0.1, 0, 4, 0.2, 5, "prop", false),
  solidBox(7, FLOOR2_Y - 0.1, 0, 10, 0.2, 5, "prop", false),
  solidBox(15, FLOOR2_Y - 0.1, 0, 6, 0.2, 5, "prop", false),
  solidBox(-14.5, FLOOR2_Y - 0.1, 11, 13, 0.2, 14, "prop", false),
  solidBox(-14.5, FLOOR2_Y - 0.1, -11, 13, 0.2, 14, "prop", false),
  solidBox(14.5, FLOOR2_Y - 0.1, 11, 13, 0.2, 14, "prop", false),
  solidBox(14.5, FLOOR2_Y - 0.1, -11, 13, 0.2, 14, "prop", false),
  solidBox(-10, FLOOR2_Y - 0.1, 0, 2.8, 0.2, 6, "prop", false),
  solidBox(10, FLOOR2_Y - 0.1, 0, 2.8, 0.2, 6, "prop", false),
);

addEnclosedRoom(
  SCHOOL_SOLID_BOXES,
  SCHOOL_GYM.minX,
  SCHOOL_GYM.maxX,
  SCHOOL_GYM.minZ,
  SCHOOL_GYM.maxZ,
  WALL_CY_F1,
  FLOOR1_H,
  { face: "north", xGap: [-DOOR_HALF, DOOR_HALF] },
);
addEnclosedRoom(
  SCHOOL_SOLID_BOXES,
  SCHOOL_CAFE.minX,
  SCHOOL_CAFE.maxX,
  SCHOOL_CAFE.minZ,
  SCHOOL_CAFE.maxZ,
  WALL_CY_F1,
  FLOOR1_H,
  { face: "south", xGap: [-DOOR_HALF, DOOR_HALF] },
);

for (const room of SCHOOL_CLASSROOMS.filter((room) => room.floor === 1)) {
  addClassroomShell(SCHOOL_SOLID_BOXES, room, WALL_CY_F1, FLOOR1_H);
  addClassroomDesks(SCHOOL_SOLID_BOXES, room);
}

for (const room of SCHOOL_CLASSROOMS.filter((room) => room.floor === 2)) {
  addClassroomShell(SCHOOL_SOLID_BOXES, room, WALL_CY_F2, FLOOR1_H);
  addClassroomDesks(SCHOOL_SOLID_BOXES, room);
}

for (const room of SCHOOL_CLASSROOMS) {
  const cy = room.floor === 1 ? 1.3 : FLOOR2_Y + 1.3;
  const cx = (room.minX + room.maxX) / 2;
  const cz = room.boardWall === "north" ? room.maxZ - 0.25 : room.minZ + 0.25;
  SCHOOL_SOLID_BOXES.push(colliderBox(cx, cy, cz, 3.8, 2, 0.3, true));
}

export const SCHOOL_STAIRS = [
  { x: -10, zStart: -2, zDir: 1 as const },
  { x: 10, zStart: -2, zDir: 1 as const },
];

export const SCHOOL_STAIRWELLS = [
  { x: -10, minZ: -2.8, maxZ: 2.8 },
  { x: 10, minZ: -2.8, maxZ: 2.8 },
];

export const SCHOOL_STAIR_LANDINGS: Array<{ x: number; z: number }> = [
  addStairAlcove(SCHOOL_SOLID_BOXES, -10),
  addStairAlcove(SCHOOL_SOLID_BOXES, 10),
];

export const SCHOOL_HALL_LOCKERS: Array<[number, number]> = [
  [-6, -1.8],
  [-6, 1.8],
  [6, -1.8],
  [6, 1.8],
];

for (const [x, z] of SCHOOL_HALL_LOCKERS) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 1.05, z, 2, 2.1, 0.7, true));
}

SCHOOL_SOLID_BOXES.push(colliderBox(0, 1, -17, 12, 2, 1, true));

export const SCHOOL_CAFE_TABLES: Array<[number, number]> = [
  [-8, -16],
  [8, -16],
  [-8, -12],
  [8, -12],
];

for (const [x, z] of SCHOOL_CAFE_TABLES) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 0.75, z, 2.4, 1.4, 1.2, true));
}

for (const x of [-12, 12] as const) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 1, 13, 4, 2, 8, true));
}
SCHOOL_SOLID_BOXES.push(
  colliderBox(0, 2.6, 8, 0.3, 0.4, 0.3, true),
  colliderBox(0, 2.6, 18, 0.3, 0.4, 0.3, true),
);

export const SCHOOL_SPAWN_A = { x: 0, z: -14, y: 1 } as const;
export const SCHOOL_SPAWN_B = { x: 0, z: 14, y: 1 } as const;
export const SCHOOL_UPSTAIRS_SPAWN = { x: 0, z: 0, y: SCHOOL_FLOOR2_FEET_Y } as const;
