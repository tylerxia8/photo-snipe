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
  /** Low hood-height volume for photo occlusion — full collision box is used for movement. */
  photoOccludeProfile?: "car";
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
  photoOccludeProfile?: "car",
): ArenaSolidBox {
  return {
    ...solidBox(cx, cy, cz, sx, sy, sz, "prop", occludesPhotos, false),
    photoOccludeProfile,
  };
}

const CAR_PHOTO_BODY_H = 1.1;

function aabb(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
): AxisAlignedBox {
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

/** Photo rays use a low open-topped car volume so peeking over cover still registers. */
export function boxToPhotoOccluderAABBs(box: ArenaSolidBox): AxisAlignedBox[] {
  if (box.photoOccludeProfile !== "car") {
    return [boxToAabb(box)];
  }

  const groundY = box.cy - box.sy / 2;
  return [
    aabb(
      box.cx - box.sx / 2,
      box.cx + box.sx / 2,
      groundY,
      groundY + CAR_PHOTO_BODY_H,
      box.cz - box.sz / 2,
      box.cz + box.sz / 2,
    ),
  ];
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
