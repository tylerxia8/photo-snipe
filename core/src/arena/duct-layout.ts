import { solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

const HALF = 22;
const FOOTPRINT = HALF * 2;
const WALL_HEIGHT = 3.2;
const WALL_THICKNESS = 0.35;
const DUCT_HALF_WIDTH = 1.4;
const WEST_DUCT_X = -12;
const EAST_DUCT_X = 12;
const TRUNK_Z_MIN = -20;
const TRUNK_Z_MAX = 20;
const CROSS_Z = [-12, 0, 12] as const;

/** Inner x faces of the twin trunks — walkable corridor ends here. */
const TRUNK_GAP_X_MIN = WEST_DUCT_X + DUCT_HALF_WIDTH + WALL_THICKNESS / 2;
const TRUNK_GAP_X_MAX = EAST_DUCT_X - DUCT_HALF_WIDTH - WALL_THICKNESS / 2;

export const DUCT_NETWORK_LAYOUT: ArenaLayoutConfig = {
  id: "duct-network-01",
  name: "Air Duct Network",
  halfExtent: HALF,
  wallHeight: WALL_HEIGHT,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
};

function crossOpenings(): Array<[number, number]> {
  const half = DUCT_HALF_WIDTH + WALL_THICKNESS / 2;
  return CROSS_Z.map((z) => [z - half, z + half] as [number, number]);
}

function addDuctRunZ(
  solids: ArenaSolidBox[],
  x: number,
  zMin: number,
  zMax: number,
): void {
  if (zMax - zMin < 0.2) {
    return;
  }
  const zMid = (zMin + zMax) / 2;
  const zLen = zMax - zMin;
  const cy = WALL_HEIGHT * 0.5;
  solids.push(
    solidBox(
      x - DUCT_HALF_WIDTH,
      cy,
      zMid,
      WALL_THICKNESS,
      WALL_HEIGHT,
      zLen,
      "prop",
      true,
    ),
    solidBox(
      x + DUCT_HALF_WIDTH,
      cy,
      zMid,
      WALL_THICKNESS,
      WALL_HEIGHT,
      zLen,
      "prop",
      true,
    ),
  );
}

/** Trunk side walls with gaps at each cross duct so players can enter the junction. */
function addTrunkRunZ(
  solids: ArenaSolidBox[],
  x: number,
  zMin: number,
  zMax: number,
): void {
  const openings = crossOpenings()
    .filter(([openMin, openMax]) => openMax > zMin && openMin < zMax)
    .sort((a, b) => a[0] - b[0]);

  let cursor = zMin;
  for (const [openMin, openMax] of openings) {
    if (openMin > cursor) {
      addDuctRunZ(solids, x, cursor, openMin);
    }
    cursor = Math.max(cursor, openMax);
  }
  if (cursor < zMax) {
    addDuctRunZ(solids, x, cursor, zMax);
  }
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
    solidBox(
      xMid,
      cy,
      z - DUCT_HALF_WIDTH,
      xLen,
      WALL_HEIGHT,
      WALL_THICKNESS,
      "prop",
      true,
    ),
    solidBox(
      xMid,
      cy,
      z + DUCT_HALF_WIDTH,
      xLen,
      WALL_HEIGHT,
      WALL_THICKNESS,
      "prop",
      true,
    ),
  );
}

/** Insulation filling the gap between trunks only — never blocks trunk corridors. */
function addInterDuctBarrier(
  solids: ArenaSolidBox[],
  zCenter: number,
  zLength: number,
): void {
  const cy = WALL_HEIGHT * 0.5;
  const xSpan = TRUNK_GAP_X_MAX - TRUNK_GAP_X_MIN;
  const xCenter = (TRUNK_GAP_X_MIN + TRUNK_GAP_X_MAX) / 2;
  solids.push(
    solidBox(xCenter, cy, zCenter, xSpan, WALL_HEIGHT, zLength, "prop", true),
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

const cy = WALL_HEIGHT * 0.5;

// Twin parallel trunk lines with three cross ducts — one connected ladder network.
addTrunkRunZ(DUCT_NETWORK_SOLID_BOXES, WEST_DUCT_X, TRUNK_Z_MIN, TRUNK_Z_MAX);
addTrunkRunZ(DUCT_NETWORK_SOLID_BOXES, EAST_DUCT_X, TRUNK_Z_MIN, TRUNK_Z_MAX);
addDuctRunX(DUCT_NETWORK_SOLID_BOXES, -12, WEST_DUCT_X, EAST_DUCT_X);
addDuctRunX(DUCT_NETWORK_SOLID_BOXES, 0, WEST_DUCT_X, EAST_DUCT_X);
addDuctRunX(DUCT_NETWORK_SOLID_BOXES, 12, WEST_DUCT_X, EAST_DUCT_X);

// Block cut-throughs in the middle gap only, leaving cross ducts and trunk ends open.
addInterDuctBarrier(DUCT_NETWORK_SOLID_BOXES, -17, 5.5);
addInterDuctBarrier(DUCT_NETWORK_SOLID_BOXES, -6, 8);
addInterDuctBarrier(DUCT_NETWORK_SOLID_BOXES, 6, 8);
addInterDuctBarrier(DUCT_NETWORK_SOLID_BOXES, 17, 5.5);

// Outer insulation mass (outside trunk walls, not inside walkable paths).
DUCT_NETWORK_SOLID_BOXES.push(
  solidBox(-17.5, cy, 0, 8.5, WALL_HEIGHT, 38, "prop", true),
  solidBox(17.5, cy, 0, 8.5, WALL_HEIGHT, 38, "prop", true),
);

// Center junction fan — pass around via cross duct sides.
DUCT_NETWORK_SOLID_BOXES.push(
  solidBox(0, 1.1, 0, 1.6, 2.2, 1.6, "prop", true),
);

export const DUCT_SPAWN_A = { x: WEST_DUCT_X, z: -18 } as const;
export const DUCT_SPAWN_B = { x: EAST_DUCT_X, z: 18 } as const;
