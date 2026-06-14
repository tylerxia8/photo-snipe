import { solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

const WALL_HEIGHT = 6;
const WALL_THICKNESS = 0.4;
const CROSS_WALL_WIDTH = 6;
const CROSS_WALL_X = 21;
const HALF_EXTENT = 24;

export const FREIGHT_DEPOT_LAYOUT: ArenaLayoutConfig = {
  id: "freight-depot-01",
  name: "Freight Depot",
  halfExtent: HALF_EXTENT,
  wallHeight: WALL_HEIGHT,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
};

/** Wide-aisle loading dock — wide cross-aisles and pallet cover. */
export const FREIGHT_DEPOT_SOLID_BOXES: ArenaSolidBox[] = [
  solidBox(0, -0.1, 0, 48, 0.2, 48, "floor", false),
  solidBox(0, WALL_HEIGHT + 0.05, 0, 48, 0.1, 48, "ceiling", false),

  solidBox(0, WALL_HEIGHT * 0.5, -24, 48, WALL_HEIGHT, WALL_THICKNESS, "wall", true),
  solidBox(0, WALL_HEIGHT * 0.5, 24, 48, WALL_HEIGHT, WALL_THICKNESS, "wall", true),
  solidBox(24, WALL_HEIGHT * 0.5, 0, WALL_THICKNESS, WALL_HEIGHT, 48, "wall", true),
  solidBox(-24, WALL_HEIGHT * 0.5, 0, WALL_THICKNESS, WALL_HEIGHT, 48, "wall", true),
];

for (const z of [-14, 0, 14] as const) {
  FREIGHT_DEPOT_SOLID_BOXES.push(
    solidBox(-CROSS_WALL_X, 2.5, z, CROSS_WALL_WIDTH, 5, WALL_THICKNESS, "wall", true),
    solidBox(CROSS_WALL_X, 2.5, z, CROSS_WALL_WIDTH, 5, WALL_THICKNESS, "wall", true),
  );
}

for (const z of [-18, -8, 8, 18] as const) {
  FREIGHT_DEPOT_SOLID_BOXES.push(
    solidBox(16, 1.25, z, 4, 2.5, 6, "prop", true),
    solidBox(-16, 1.25, z, 4, 2.5, 6, "prop", true),
  );
}

for (const [x, z] of [
  [8, -6],
  [-8, 6],
  [8, 6],
  [-8, -6],
] as const) {
  FREIGHT_DEPOT_SOLID_BOXES.push(solidBox(x, 3, z, 0.8, 6, 0.8, "prop", true));
}

FREIGHT_DEPOT_SOLID_BOXES.push(
  solidBox(0, 1, 0, 7, 2, 5, "prop", true),
  solidBox(0, 2.6, 0, 5, 2, 3.5, "prop", true),
);

const crates: Array<[number, number, number, number, number, number]> = [
  [6, 0.75, -20, 2, 1.5, 2],
  [-5, 0.75, -18, 1.5, 1.2, 1.5],
  [10, 0.75, -6, 2, 1.5, 2],
  [-10, 0.75, -4, 1.5, 1.2, 1.5],
  [5, 0.75, 8, 2, 1.5, 2],
  [-6, 0.75, 12, 1.5, 1.2, 1.5],
  [8, 0.75, 20, 2, 1.5, 2],
  [-7, 0.75, 18, 1.5, 1.2, 1.5],
  [3, 0.75, -2, 2, 1.5, 2],
  [-4, 0.75, 3, 1.5, 1.2, 1.5],
];
for (const [x, y, z, sx, sy, sz] of crates) {
  FREIGHT_DEPOT_SOLID_BOXES.push(solidBox(x, y, z, sx, sy, sz, "prop", true));
}

// Loading-bay door frames (match client dock decor — block walk-through).
for (const z of [-12.2, 12.2] as const) {
  FREIGHT_DEPOT_SOLID_BOXES.push(
    solidBox(0, 2.1, z, 8, 4.2, 0.35, "prop", true),
  );
}

export const FREIGHT_SPAWN_A = { x: 0, z: -18 } as const;
export const FREIGHT_SPAWN_B = { x: 0, z: 18 } as const;
