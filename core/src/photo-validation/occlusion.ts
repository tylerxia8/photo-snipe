import { add, dot, length, scale, sub, vec3 } from "../math/vector.js";
import type { Vector3 } from "../types.js";
import type { AxisAlignedBox } from "../arena/warehouse-interior.js";

const EPSILON = 0.02;

/** Slab-method ray/AABB test. Returns entry distance or null if no hit. */
export function rayAabbEntryDistance(
  origin: Vector3,
  direction: Vector3,
  box: AxisAlignedBox,
): number | null {
  let tMin = 0;
  let tMax = Number.POSITIVE_INFINITY;

  const axes = ["x", "y", "z"] as const;
  for (const axis of axes) {
    const o = origin[axis];
    const d = direction[axis];
    const min = box.min[axis];
    const max = box.max[axis];

    if (Math.abs(d) < 1e-8) {
      if (o < min || o > max) return null;
      continue;
    }

    const invD = 1 / d;
    let t1 = (min - o) * invD;
    let t2 = (max - o) * invD;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  if (tMax < 0) return null;
  return tMin >= 0 ? tMin : tMax;
}

const LOW_COVER_MAX_Y = 1.25;

export function isRayBlocked(
  origin: Vector3,
  target: Vector3,
  occluders: AxisAlignedBox[],
): boolean {
  const delta = sub(target, origin);
  const targetDist = length(delta);
  if (targetDist <= EPSILON) return false;

  const direction = scale(delta, 1 / targetDist);
  for (const box of occluders) {
    if (box.max.y <= LOW_COVER_MAX_Y && origin.y > box.max.y + 0.04) {
      continue;
    }
    const hit = rayAabbEntryDistance(origin, direction, box);
    if (hit !== null && hit < targetDist - EPSILON) {
      return true;
    }
  }
  return false;
}

/** Offset sample points slightly toward the camera to avoid self-hits on nearby geometry. */
export function nudgeTowardCamera(origin: Vector3, point: Vector3): Vector3 {
  const delta = sub(point, origin);
  const dist = length(delta);
  if (dist <= EPSILON) return point;
  const nudge = Math.min(0.08, dist * 0.05);
  return add(origin, scale(delta, (dist - nudge) / dist));
}

export function hasLineOfSight(
  origin: Vector3,
  target: Vector3,
  occluders: AxisAlignedBox[],
): boolean {
  return !isRayBlocked(origin, nudgeTowardCamera(origin, target), occluders);
}

export { vec3 };
