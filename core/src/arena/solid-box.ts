import type { Vector3 } from "../types.js";

export interface AxisAlignedBox {
  min: Vector3;
  max: Vector3;
}

export type ArenaBoxCategory = "floor" | "ceiling" | "wall" | "prop";

export interface ArenaSolidBox {
  cx: number;
  cy: number;
  cz: number;
  sx: number;
  sy: number;
  sz: number;
  category: ArenaBoxCategory;
  occludesPhotos: boolean;
  /** When false, the web client builds collision only and decor supplies visuals. */
  decorMesh?: boolean;
}

export interface ArenaLayoutConfig {
  id: string;
  name: string;
  halfExtent: number;
  wallHeight: number;
  wallThickness: number;
  defaultFeetY: number;
  /** Thin interior wall segments for gameplay collision (optional). */
  interiorWalls?: Array<{ x: number; z: number; halfZ: number }>;
}

export function solidBox(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  category: ArenaBoxCategory,
  occludesPhotos: boolean,
  decorMesh = true,
): ArenaSolidBox {
  return { cx, cy, cz, sx, sy, sz, category, occludesPhotos, decorMesh };
}

/** Collision volume without a placeholder mesh — used when decor draws the prop. */
export function colliderBox(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  occludesPhotos: boolean,
): ArenaSolidBox {
  return solidBox(cx, cy, cz, sx, sy, sz, "prop", occludesPhotos, false);
}

export function boxToAabb(box: ArenaSolidBox): AxisAlignedBox {
  return {
    min: {
      x: box.cx - box.sx / 2,
      y: box.cy - box.sy / 2,
      z: box.cz - box.sz / 2,
    },
    max: {
      x: box.cx + box.sx / 2,
      y: box.cy + box.sy / 2,
      z: box.cz + box.sz / 2,
    },
  };
}
