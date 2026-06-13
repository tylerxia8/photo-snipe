import { solidBox, type ArenaLayoutConfig, type ArenaSolidBox } from "./solid-box.js";

const HALF = 21;
const FOOTPRINT = HALF * 2;
const CELL = 2.8;
const CORN_HEIGHT = 2.75;
const WALL_THICKNESS = 0.35;

/**
 * # = corn wall, . = path, A/B = spawn markers.
 * 15×15 grid — footprint fills the 42m arena.
 */
const MAZE_ROWS = [
  "###############",
  "#A.............#",
  "#.###.###.###.#",
  "#...#...#...#.#",
  "###.#.#.#.#.#.#",
  "#...#.....#...#",
  "#.#.#####.#.#.#",
  "#.#.....#.#.#.#",
  "#.#.###.#.#.#.#",
  "#...#...#.....#",
  "###.#.#####.###",
  "#...#.......#.#",
  "#.###.###.#.#.#",
  "#.........B..#",
  "###############",
] as const;

export const CORN_MAZE_LAYOUT: ArenaLayoutConfig = {
  id: "corn-maze-01",
  name: "Corn Maze",
  halfExtent: HALF,
  wallHeight: CORN_HEIGHT,
  wallThickness: WALL_THICKNESS,
  defaultFeetY: 1,
};

function cellCenter(col: number, row: number): { x: number; z: number } {
  return {
    x: -HALF + (col + 0.5) * CELL,
    z: -HALF + (row + 0.5) * CELL,
  };
}

function parseMaze(): {
  solids: ArenaSolidBox[];
  spawnA: { x: number; z: number };
  spawnB: { x: number; z: number };
} {
  const solids: ArenaSolidBox[] = [
    solidBox(0, -0.1, 0, FOOTPRINT, 0.2, FOOTPRINT, "floor", false),
    solidBox(0, 12, 0, FOOTPRINT, 0.2, FOOTPRINT, "ceiling", false),
  ];

  let spawnA = { x: 0, z: -HALF + CELL * 1.5 };
  let spawnB = { x: 0, z: HALF - CELL * 1.5 };

  for (let row = 0; row < MAZE_ROWS.length; row++) {
    const line = MAZE_ROWS[row]!;
    for (let col = 0; col < line.length; col++) {
      const tile = line[col]!;
      const { x, z } = cellCenter(col, row);

      if (tile === "#") {
        solids.push(
          solidBox(x, CORN_HEIGHT * 0.5, z, CELL, CORN_HEIGHT, CELL, "prop", true),
        );
        continue;
      }

      if (tile === "A") {
        spawnA = { x, z };
      } else if (tile === "B") {
        spawnB = { x, z };
      }
    }
  }

  return { solids, spawnA, spawnB };
}

const parsed = parseMaze();

export const CORN_MAZE_SOLID_BOXES: ArenaSolidBox[] = parsed.solids;
export const CORN_SPAWN_A = parsed.spawnA;
export const CORN_SPAWN_B = parsed.spawnB;

export function isCornMazeWalkable(col: number, row: number): boolean {
  const line = MAZE_ROWS[row];
  if (!line) {
    return false;
  }
  const tile = line[col];
  return tile === "." || tile === "A" || tile === "B";
}

export const CORN_MAZE_GRID = {
  rows: MAZE_ROWS.length,
  cols: MAZE_ROWS[0]!.length,
  cell: CELL,
  half: HALF,
} as const;
