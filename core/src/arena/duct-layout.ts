import { solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

const HALF = 22;
const FOOTPRINT = HALF * 2;
const WALL_HEIGHT = 3.2;
const WALL_THICKNESS = 0.35;
const DUCT_HALF_WIDTH = 1.3;
const FILL_CELL = 2.5;

export const DUCT_NETWORK_LAYOUT: ArenaLayoutConfig = {
  id: "duct-network-01",
  name: "Air Duct Network",
  halfExtent: HALF,
  wallHeight: WALL_HEIGHT,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
};

interface CorridorRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Serpentine duct path — narrow runs connected by tight corners. */
const CORRIDORS: CorridorRect[] = [
  { minX: -15.3, maxX: -12.7, minZ: -20, maxZ: -4 },
  { minX: -15.3, maxX: 5.3, minZ: -5.3, maxZ: -2.7 },
  { minX: 4.7, maxX: 7.3, minZ: -4, maxZ: 10 },
  { minX: -10.3, maxX: 7.3, minZ: 8.7, maxZ: 11.3 },
  { minX: -11.3, maxX: -8.7, minZ: 10, maxZ: 20 },
];

function inCorridor(x: number, z: number): boolean {
  return CORRIDORS.some(
    (rect) =>
      x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ,
  );
}

function addDuctRunZ(
  solids: ArenaSolidBox[],
  x: number,
  zMin: number,
  zMax: number,
): void {
  const zMid = (zMin + zMax) / 2;
  const zLen = zMax - zMin;
  const cy = WALL_HEIGHT * 0.5;
  solids.push(
    solidBox(x - DUCT_HALF_WIDTH, cy, zMid, WALL_THICKNESS, WALL_HEIGHT, zLen, "prop", true),
    solidBox(x + DUCT_HALF_WIDTH, cy, zMid, WALL_THICKNESS, WALL_HEIGHT, zLen, "prop", true),
  );
}

function addDuctRunX(
  solids: ArenaSolidBox[],
  z: number,
  xMin: number,
  xMax: number,
): void {
  const xMid = (xMin + xMax) / 2;
  const xLen = xMax - xMin;
  const cy = WALL_HEIGHT * 0.5;
  solids.push(
    solidBox(xMid, cy, z - DUCT_HALF_WIDTH, xLen, WALL_HEIGHT, WALL_THICKNESS, "prop", true),
    solidBox(xMid, cy, z + DUCT_HALF_WIDTH, xLen, WALL_HEIGHT, WALL_THICKNESS, "prop", true),
  );
}

export const DUCT_NETWORK_SOLID_BOXES: ArenaSolidBox[] = [
  solidBox(0, -0.1, 0, FOOTPRINT, 0.2, FOOTPRINT, "floor", false),
  solidBox(0, WALL_HEIGHT + 0.05, 0, FOOTPRINT, 0.1, FOOTPRINT, "ceiling", false),

  solidBox(0, WALL_HEIGHT * 0.5, -HALF, FOOTPRINT, WALL_HEIGHT, WALL_THICKNESS, "wall", true),
  solidBox(0, WALL_HEIGHT * 0.5, HALF, FOOTPRINT, WALL_HEIGHT, WALL_THICKNESS, "wall", true),
  solidBox(HALF, WALL_HEIGHT * 0.5, 0, WALL_THICKNESS, WALL_HEIGHT, FOOTPRINT, "wall", true),
  solidBox(-HALF, WALL_HEIGHT * 0.5, 0, WALL_THICKNESS, WALL_HEIGHT, FOOTPRINT, "wall", true),
];

addDuctRunZ(DUCT_NETWORK_SOLID_BOXES, -14, -20, -4);
addDuctRunX(DUCT_NETWORK_SOLID_BOXES, -4, -14, 6);
addDuctRunZ(DUCT_NETWORK_SOLID_BOXES, 6, -4, 10);
addDuctRunX(DUCT_NETWORK_SOLID_BOXES, 10, -10, 6);
addDuctRunZ(DUCT_NETWORK_SOLID_BOXES, -10, 10, 20);

const cy = WALL_HEIGHT * 0.5;
for (let x = -HALF + FILL_CELL * 0.5; x <= HALF - FILL_CELL * 0.5; x += FILL_CELL) {
  for (let z = -HALF + FILL_CELL * 0.5; z <= HALF - FILL_CELL * 0.5; z += FILL_CELL) {
    if (inCorridor(x, z)) {
      continue;
    }
    DUCT_NETWORK_SOLID_BOXES.push(
      solidBox(x, cy, z, FILL_CELL, WALL_HEIGHT, FILL_CELL, "prop", true),
    );
  }
}

for (const [x, z] of [
  [-14, -17],
  [6, 0],
  [-10, 17],
] as const) {
  DUCT_NETWORK_SOLID_BOXES.push(solidBox(x, 0.55, z, 1.4, 1.1, 1.4, "prop", true));
}

DUCT_NETWORK_SOLID_BOXES.push(solidBox(0, 1.2, 0, 2.2, 2.4, 2.2, "prop", true));
