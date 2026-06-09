import type { Vector3 } from "../types.js";

export interface AxisAlignedBox {
  min: Vector3;
  max: Vector3;
}

function box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): AxisAlignedBox {
  return {
    min: { x: cx - sx / 2, y: cy - sy / 2, z: cz - sz / 2 },
    max: { x: cx + sx / 2, y: cy + sy / 2, z: cz + sz / 2 },
  };
}

/** Occluder geometry for warehouse-interior-01 — mirrors client/web warehouse layout. */
export function getWarehouseInteriorOccluders(): AxisAlignedBox[] {
  const WALL_HEIGHT = 5;
  const WALL_THICKNESS = 0.4;
  const boxes: AxisAlignedBox[] = [];

  boxes.push(box(0, WALL_HEIGHT + 0.05, 0, 48, 0.1, 48));
  boxes.push(box(0, WALL_HEIGHT * 0.5, -24, 48, WALL_HEIGHT, WALL_THICKNESS));
  boxes.push(box(0, WALL_HEIGHT * 0.5, 24, 48, WALL_HEIGHT, WALL_THICKNESS));
  boxes.push(box(24, WALL_HEIGHT * 0.5, 0, WALL_THICKNESS, WALL_HEIGHT, 48));
  boxes.push(box(-24, WALL_HEIGHT * 0.5, 0, WALL_THICKNESS, WALL_HEIGHT, 48));

  for (const [x, z] of [
    [-12, -14], [12, -14], [-12, 0], [12, 0], [-12, 14], [12, 14],
  ] as const) {
    boxes.push(box(x, 2.5, z, 16, 5, WALL_THICKNESS));
  }

  for (const z of [-18, -8, 8, 18]) {
    boxes.push(box(16, 1.25, z, 4, 2.5, 6));
    boxes.push(box(-16, 1.25, z, 4, 2.5, 6));
  }

  for (const [x, z] of [[8, -6], [-8, 6], [8, 6], [-8, -6]] as const) {
    boxes.push(box(x, 3, z, 0.8, 6, 0.8));
  }

  boxes.push(box(0, 1, 0, 7, 2, 5));
  boxes.push(box(0, 2.6, 0, 5, 2, 3.5));

  const crates: Array<[number, number, number, number, number, number]> = [
    [6, 0.75, -20, 2, 1.5, 2], [-5, 0.75, -18, 1.5, 1.2, 1.5],
    [10, 0.75, -6, 2, 1.5, 2], [-10, 0.75, -4, 1.5, 1.2, 1.5],
    [5, 0.75, 8, 2, 1.5, 2], [-6, 0.75, 12, 1.5, 1.2, 1.5],
    [8, 0.75, 20, 2, 1.5, 2], [-7, 0.75, 18, 1.5, 1.2, 1.5],
    [3, 0.75, -2, 2, 1.5, 2], [-4, 0.75, 3, 1.5, 1.2, 1.5],
  ];
  for (const [x, y, z, sx, sy, sz] of crates) {
    boxes.push(box(x, y, z, sx, sy, sz));
  }

  return boxes;
}

export function getOccludersForBuilding(buildingId: string): AxisAlignedBox[] {
  if (buildingId === "warehouse-main" || buildingId === "warehouse-interior-01") {
    return getWarehouseInteriorOccluders();
  }
  return getWarehouseInteriorOccluders();
}

export function getWallCollidersForBuilding(buildingId: string): AxisAlignedBox[] {
  const WALL_HEIGHT = 5;
  const WALL_THICKNESS = 0.4;
  const boxes: AxisAlignedBox[] = [];

  boxes.push(box(0, WALL_HEIGHT * 0.5, -24, 48, WALL_HEIGHT, WALL_THICKNESS));
  boxes.push(box(0, WALL_HEIGHT * 0.5, 24, 48, WALL_HEIGHT, WALL_THICKNESS));
  boxes.push(box(24, WALL_HEIGHT * 0.5, 0, WALL_THICKNESS, WALL_HEIGHT, 48));
  boxes.push(box(-24, WALL_HEIGHT * 0.5, 0, WALL_THICKNESS, WALL_HEIGHT, 48));

  for (const [x, z] of [
    [-12, -14], [12, -14], [-12, 0], [12, 0], [-12, 14], [12, 14],
  ] as const) {
    boxes.push(box(x, 2.5, z, 16, 5, WALL_THICKNESS));
  }

  void buildingId;
  return boxes;
}
