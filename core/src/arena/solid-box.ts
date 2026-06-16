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
  /** Low center block + side panels so peeking over/around a car can still snap. */
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

const CAR_PHOTO_SIDE_W = 0.3;
const CAR_PHOTO_BODY_H = 1.15;
const CAR_PHOTO_SIDE_H = 1.75;

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

/** Photo rays use open-topped car volumes so peeking over center cover still registers. */
export function boxToPhotoOccluderAABBs(box: ArenaSolidBox): AxisAlignedBox[] {
  if (box.photoOccludeProfile !== "car") {
    return [boxToAabb(box)];
  }

  const groundY = box.cy - box.sy / 2;
  const longIsX = box.sx >= box.sz;
  const longHalf = (longIsX ? box.sx : box.sz) / 2;
  const shortHalf = (longIsX ? box.sz : box.sx) / 2;
  const centerShortHalf = Math.max(0.2, shortHalf - CAR_PHOTO_SIDE_W);

  if (longIsX) {
    return [
      aabb(
        box.cx - longHalf,
        box.cx + longHalf,
        groundY,
        groundY + CAR_PHOTO_BODY_H,
        box.cz - centerShortHalf,
        box.cz + centerShortHalf,
      ),
      aabb(
        box.cx - longHalf,
        box.cx + longHalf,
        groundY,
        groundY + CAR_PHOTO_SIDE_H,
        box.cz - shortHalf,
        box.cz - shortHalf + CAR_PHOTO_SIDE_W,
      ),
      aabb(
        box.cx - longHalf,
        box.cx + longHalf,
        groundY,
        groundY + CAR_PHOTO_SIDE_H,
        box.cz + shortHalf - CAR_PHOTO_SIDE_W,
        box.cz + shortHalf,
      ),
    ];
  }

  return [
    aabb(
      box.cx - centerShortHalf,
      box.cx + centerShortHalf,
      groundY,
      groundY + CAR_PHOTO_BODY_H,
      box.cz - longHalf,
      box.cz + longHalf,
    ),
    aabb(
      box.cx - shortHalf,
      box.cx - shortHalf + CAR_PHOTO_SIDE_W,
      groundY,
      groundY + CAR_PHOTO_SIDE_H,
      box.cz - longHalf,
      box.cz + longHalf,
    ),
    aabb(
      box.cx + shortHalf - CAR_PHOTO_SIDE_W,
      box.cx + shortHalf,
      groundY,
      groundY + CAR_PHOTO_SIDE_H,
      box.cz - longHalf,
      box.cz + longHalf,
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
