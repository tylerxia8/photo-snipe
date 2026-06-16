import { colliderBox, solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

export const SCHOOL_HALF = 26;
export const SCHOOL_FLOOR1_HEIGHT = 3.6;
export const SCHOOL_FLOOR2_Y = 3.6;
export const SCHOOL_FLOOR2_FEET_Y = SCHOOL_FLOOR2_Y + 0.1;
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
const STAIR_STEPS = 10;
const STAIR_RISE = FLOOR1_H / STAIR_STEPS;
const STAIR_RUN = 0.45;
const STAIRWELL_HALF_Z = 4.5;

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
  boardWall: "north" | "south" | "west" | "east";
}

export const SCHOOL_CLASSROOMS: SchoolClassroom[] = [
  { id: "w1", floor: 1, minX: -25, maxX: -8, minZ: 5, maxZ: 9, boardWall: "north" },
  { id: "w2", floor: 1, minX: -25, maxX: -8, minZ: -18, maxZ: -11, boardWall: "south" },
  { id: "e1", floor: 1, minX: 8, maxX: 25, minZ: 5, maxZ: 9, boardWall: "north" },
  { id: "e2", floor: 1, minX: 8, maxX: 25, minZ: -18, maxZ: -11, boardWall: "south" },
  { id: "w1-up", floor: 2, minX: -25, maxX: -8, minZ: 6, maxZ: 20, boardWall: "north" },
  { id: "w2-up", floor: 2, minX: -25, maxX: -8, minZ: -20, maxZ: -6, boardWall: "south" },
  { id: "e1-up", floor: 2, minX: 8, maxX: 25, minZ: 6, maxZ: 20, boardWall: "north" },
  { id: "e2-up", floor: 2, minX: 8, maxX: 25, minZ: -20, maxZ: -6, boardWall: "south" },
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

/** Four walls around a room with a single doorway on one face. */
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
    solidBox(cx, F1_CEILING_Y - 0.175, cz, sx, 0.35, sz, "wall", true),
  );
}

function classroomDoorGap(room: SchoolClassroom): [number, number] {
  const midZ = (room.minZ + room.maxZ) / 2;
  return [midZ - 1.6, midZ + 1.6];
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
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const ox = (col - 0.5) * 2.4;
      const oz = faceNorth ? room.minZ + 3 + row * 2.2 : room.maxZ - 3 - row * 2.2;
      solids.push(colliderBox(centerX + ox, cy, oz, 1.2, 1.5, 0.8, true));
    }
  }
  const teacherZ = faceNorth ? room.maxZ - 1.4 : room.minZ + 1.4;
  solids.push(colliderBox(centerX, cy, teacherZ, 1.6, 1.5, 1, true));
}

function addStairwell(
  solids: ArenaSolidBox[],
  x: number,
): { x: number; z: number } {
  const zMin = -STAIRWELL_HALF_Z;
  const zMax = STAIRWELL_HALF_Z;
  const zStart = -4.5;
  const zDir = 1 as const;

  addWallSegmentsX(solids, x - 1.55, zMin, zMax, [], WALL_CY_F1, FLOOR1_H);
  addWallSegmentsX(solids, x + 1.55, zMin, zMax, [], WALL_CY_F1, FLOOR1_H);
  addWallSegmentsZ(solids, zMin, x - 1.55, x + 1.55, [], WALL_CY_F1, FLOOR1_H);

  for (let i = 0; i < STAIR_STEPS; i++) {
    const topY = (i + 1) * STAIR_RISE;
    const z = zStart + zDir * (i * STAIR_RUN + STAIR_RUN * 0.5);
    solids.push(
      solidBox(x, topY * 0.5, z, 2.6, topY, STAIR_RUN * 0.92, "prop", true),
    );
  }

  const landingZ = 0;
  solids.push(
    solidBox(x, FLOOR2_Y - 0.05, landingZ, 3.2, 0.12, 3.6, "prop", false),
  );

  return { x, z: landingZ };
}

export const SCHOOL_SOLID_BOXES: ArenaSolidBox[] = [
  solidBox(0, -0.1, 0, FOOTPRINT, 0.2, FOOTPRINT, "floor", false),
  solidBox(0, TOTAL_H + 0.05, 0, FOOTPRINT, 0.1, FOOTPRINT, "ceiling", false),

  solidBox(0, TOTAL_H * 0.5, -HALF, FOOTPRINT, TOTAL_H, WALL_THICKNESS, "wall", true),
  solidBox(0, TOTAL_H * 0.5, HALF, FOOTPRINT, TOTAL_H, WALL_THICKNESS, "wall", true),
  solidBox(HALF, TOTAL_H * 0.5, 0, WALL_THICKNESS, TOTAL_H, FOOTPRINT, "wall", true),
  solidBox(-HALF, TOTAL_H * 0.5, 0, WALL_THICKNESS, TOTAL_H, FOOTPRINT, "wall", true),
];

/** Opaque first-floor ceiling — blocks sight and access to floor 2 except stairwells and gym atrium. */
addF1CeilingSlab(SCHOOL_SOLID_BOXES, -15, -13, 14, 12);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, -15, 13, 14, 12);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, 15, -13, 14, 12);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, 15, 13, 14, 12);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, 0, -17, 36, 10);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, 0, 0, 8, 7);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, 0, 6.75, 7, 6.5);
addF1CeilingSlab(SCHOOL_SOLID_BOXES, 0, -6.75, 7, 6.5);

/** Second-floor decks — only reachable via stairs; gym atrium stays open below. */
SCHOOL_SOLID_BOXES.push(
  solidBox(-15, FLOOR2_Y - 0.1, -13, 14, 0.2, 12, "prop", false),
  solidBox(-15, FLOOR2_Y - 0.1, 13, 14, 0.2, 12, "prop", false),
  solidBox(15, FLOOR2_Y - 0.1, -13, 14, 0.2, 12, "prop", false),
  solidBox(15, FLOOR2_Y - 0.1, 13, 14, 0.2, 12, "prop", false),
  solidBox(0, FLOOR2_Y - 0.1, 0, 40, 0.2, 7, "prop", false),
  solidBox(-18, FLOOR2_Y - 0.1, 0, 3.2, 0.2, 9, "prop", false),
  solidBox(18, FLOOR2_Y - 0.1, 0, 3.2, 0.2, 9, "prop", false),
);

/** Fully enclosed gym and cafeteria with doorway into the spur hallways. */
addEnclosedRoom(
  SCHOOL_SOLID_BOXES,
  SCHOOL_GYM.minX,
  SCHOOL_GYM.maxX,
  SCHOOL_GYM.minZ,
  SCHOOL_GYM.maxZ,
  WALL_CY_F1,
  FLOOR1_H,
  { face: "north", xGap: [-4, 4] },
);
addEnclosedRoom(
  SCHOOL_SOLID_BOXES,
  SCHOOL_CAFE.minX,
  SCHOOL_CAFE.maxX,
  SCHOOL_CAFE.minZ,
  SCHOOL_CAFE.maxZ,
  WALL_CY_F1,
  FLOOR1_H,
  { face: "south", xGap: [-4, 4] },
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

export const SCHOOL_STAIRS = [
  { x: -18, zStart: -4.5, zDir: 1 as const },
  { x: 18, zStart: -4.5, zDir: 1 as const },
];

export const SCHOOL_STAIRWELLS = [
  { x: -18, minZ: -STAIRWELL_HALF_Z, maxZ: STAIRWELL_HALF_Z },
  { x: 18, minZ: -STAIRWELL_HALF_Z, maxZ: STAIRWELL_HALF_Z },
];

export const SCHOOL_STAIR_LANDINGS: Array<{ x: number; z: number }> = [];

for (const stair of SCHOOL_STAIRS) {
  SCHOOL_STAIR_LANDINGS.push(addStairwell(SCHOOL_SOLID_BOXES, stair.x));
}

export const SCHOOL_HALL_LOCKERS: Array<[number, number]> = [
  [-10, -2.5],
  [-10, 2.5],
  [10, -2.5],
  [10, 2.5],
];

for (const [x, z] of SCHOOL_HALL_LOCKERS) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 1.1, z, 2.4, 2.2, 0.8, true));
}

SCHOOL_SOLID_BOXES.push(colliderBox(0, 1.05, -20.5, 14, 2.1, 1.2, true));

export const SCHOOL_CAFE_TABLES: Array<[number, number]> = [
  [-10, -18],
  [10, -18],
  [-10, -14],
  [10, -14],
  [-10, -22],
  [10, -22],
];

for (const [x, z] of SCHOOL_CAFE_TABLES) {
  SCHOOL_SOLID_BOXES.push(colliderBox(x, 0.75, z, 2.6, 1.5, 1.4, true));
}

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
