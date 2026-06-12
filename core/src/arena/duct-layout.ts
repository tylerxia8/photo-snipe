import { solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

const HALF = 22;
const FOOTPRINT = HALF * 2;
const WALL_HEIGHT = 3.2;
const WALL_THICKNESS = 0.35;
const DUCT_HALF_WIDTH = 1.4;
const WEST_DUCT_X = -12;
const EAST_DUCT_X = 12;

export const DUCT_NETWORK_LAYOUT: ArenaLayoutConfig = {
  id: "duct-network-01",
  name: "Air Duct Network",
  halfExtent: HALF,
  wallHeight: WALL_HEIGHT,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
};

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

/** Solid insulation between parallel ducts — forces use of cross connectors. */
function addInterDuctBarrier(
  solids: ArenaSolidBox[],
  zCenter: number,
  zLength: number,
): void {
  const cy = WALL_HEIGHT * 0.5;
  const span = EAST_DUCT_X - WEST_DUCT_X + DUCT_HALF_WIDTH * 2;
  solids.push(
    solidBox(0, cy, zCenter, span, WALL_HEIGHT, zLength, "prop", true),
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

// Twin parallel trunk lines with three cross ducts — a ladder, not a grid maze.
addDuctRunZ(DUCT_NETWORK_SOLID_BOXES, WEST_DUCT_X, -20, 20);
addDuctRunZ(DUCT_NETWORK_SOLID_BOXES, EAST_DUCT_X, -20, 20);
addDuctRunX(DUCT_NETWORK_SOLID_BOXES, -12, WEST_DUCT_X, EAST_DUCT_X);
addDuctRunX(DUCT_NETWORK_SOLID_BOXES, 0, WEST_DUCT_X, EAST_DUCT_X);
addDuctRunX(DUCT_NETWORK_SOLID_BOXES, 12, WEST_DUCT_X, EAST_DUCT_X);

// Block the space between trunks except at the cross ducts above.
addInterDuctBarrier(DUCT_NETWORK_SOLID_BOXES, -17, 4.5);
addInterDuctBarrier(DUCT_NETWORK_SOLID_BOXES, -6, 4.5);
addInterDuctBarrier(DUCT_NETWORK_SOLID_BOXES, 6, 4.5);
addInterDuctBarrier(DUCT_NETWORK_SOLID_BOXES, 17, 4.5);

// Outer insulation mass (large panels, not a cell grid).
DUCT_NETWORK_SOLID_BOXES.push(
  solidBox(-17.5, cy, 0, 9, WALL_HEIGHT, 38, "prop", true),
  solidBox(17.5, cy, 0, 9, WALL_HEIGHT, 38, "prop", true),
);

// Junction fan and corner vent props.
DUCT_NETWORK_SOLID_BOXES.push(
  solidBox(0, 1.1, 0, 1.6, 2.2, 1.6, "prop", true),
  solidBox(WEST_DUCT_X, 0.55, -17, 1.2, 1.1, 1.2, "prop", true),
  solidBox(EAST_DUCT_X, 0.55, 17, 1.2, 1.1, 1.2, "prop", true),
);
