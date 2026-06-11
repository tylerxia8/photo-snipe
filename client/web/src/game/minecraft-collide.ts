import * as THREE from "three";

/** Minecraft player width is 0.6 blocks (±0.3 from center). */
export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
const ON_TOP_EPS = 0.05;
const MAX_MOVE_STEP = 0.125;

export interface FeetPosition {
  x: number;
  y: number;
  z: number;
}

export interface MoveDelta {
  x: number;
  y: number;
  z: number;
}

export interface MoveResult extends FeetPosition {
  onGround: boolean;
  hitCeiling: boolean;
}

export interface ArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface MoveColliders {
  blocks: THREE.Box3[];
  walls: THREE.Box3[];
  bounds: ArenaBounds;
}

export function feetToPlayerBox(feet: FeetPosition): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(feet.x - PLAYER_HALF_WIDTH, feet.y, feet.z - PLAYER_HALF_WIDTH),
    new THREE.Vector3(feet.x + PLAYER_HALF_WIDTH, feet.y + PLAYER_HEIGHT, feet.z + PLAYER_HALF_WIDTH),
  );
}

function isFeetCenterOverSolid(feet: FeetPosition, solid: THREE.Box3): boolean {
  return (
    feet.x >= solid.min.x &&
    feet.x <= solid.max.x &&
    feet.z >= solid.min.z &&
    feet.z <= solid.max.z
  );
}

function isStandingOnTop(feet: FeetPosition, solid: THREE.Box3): boolean {
  return (
    feet.y >= solid.max.y - ON_TOP_EPS &&
    isFeetCenterOverSolid(feet, solid)
  );
}

export function clampFeetToBounds(feet: FeetPosition, bounds: ArenaBounds): FeetPosition {
  return {
    x: THREE.MathUtils.clamp(feet.x, bounds.minX, bounds.maxX),
    y: THREE.MathUtils.clamp(feet.y, bounds.minY, bounds.maxY),
    z: THREE.MathUtils.clamp(feet.z, bounds.minZ, bounds.maxZ),
  };
}

export function collideAxisY(
  feet: FeetPosition,
  dy: number,
  blocks: THREE.Box3[],
): { y: number; onGround: boolean; hitCeiling: boolean } {
  if (dy === 0) {
    return { y: feet.y, onGround: false, hitCeiling: false };
  }

  let y = feet.y + dy;
  let onGround = false;
  let hitCeiling = false;
  let player = feetToPlayerBox({ ...feet, y });

  for (const solid of blocks) {
    if (!player.intersectsBox(solid)) {
      continue;
    }

    if (dy < 0) {
      // Only land on a horizontal top face — never snap up the side of tall geometry.
      if (feet.y + ON_TOP_EPS < solid.max.y) {
        continue;
      }
      if (!isFeetCenterOverSolid(feet, solid)) {
        continue;
      }

      const pushUp = solid.max.y - player.min.y;
      if (pushUp <= 0) {
        continue;
      }

      y += pushUp;
      onGround = true;
      player = feetToPlayerBox({ ...feet, y });
    } else {
      // Only hit the underside of geometry above the player (ceiling, crate bottoms).
      if (solid.min.y <= feet.y + ON_TOP_EPS) {
        continue;
      }

      const pushDown = player.max.y - solid.min.y;
      if (pushDown <= 0) {
        continue;
      }

      y -= pushDown;
      hitCeiling = true;
      player = feetToPlayerBox({ ...feet, y });
    }
  }

  return { y, onGround, hitCeiling };
}

function collideAxisX(
  feet: FeetPosition,
  dx: number,
  blocks: THREE.Box3[],
  walls: THREE.Box3[],
): number {
  if (dx === 0) {
    return feet.x;
  }

  let x = feet.x + dx;
  let player = feetToPlayerBox({ ...feet, x });

  for (const solid of walls) {
    if (!player.intersectsBox(solid)) {
      continue;
    }

    const overlapLeft = player.max.x - solid.min.x;
    const overlapRight = solid.max.x - player.min.x;
    if (overlapLeft < overlapRight) {
      x -= overlapLeft;
    } else {
      x += overlapRight;
    }
    player = feetToPlayerBox({ ...feet, x });
  }

  for (const solid of blocks) {
    if (!player.intersectsBox(solid)) {
      continue;
    }
    if (isStandingOnTop({ ...feet, x }, solid)) {
      continue;
    }

    const overlapLeft = player.max.x - solid.min.x;
    const overlapRight = solid.max.x - player.min.x;
    if (overlapLeft < overlapRight) {
      x -= overlapLeft;
    } else {
      x += overlapRight;
    }
    player = feetToPlayerBox({ ...feet, x });
  }

  return x;
}

function collideAxisZ(
  feet: FeetPosition,
  dz: number,
  blocks: THREE.Box3[],
  walls: THREE.Box3[],
): number {
  if (dz === 0) {
    return feet.z;
  }

  let z = feet.z + dz;
  let player = feetToPlayerBox({ ...feet, z });

  for (const solid of walls) {
    if (!player.intersectsBox(solid)) {
      continue;
    }

    const overlapBack = player.max.z - solid.min.z;
    const overlapFront = solid.max.z - player.min.z;
    if (overlapBack < overlapFront) {
      z -= overlapBack;
    } else {
      z += overlapFront;
    }
    player = feetToPlayerBox({ ...feet, z });
  }

  for (const solid of blocks) {
    if (!player.intersectsBox(solid)) {
      continue;
    }
    if (isStandingOnTop({ ...feet, z }, solid)) {
      continue;
    }

    const overlapBack = player.max.z - solid.min.z;
    const overlapFront = solid.max.z - player.min.z;
    if (overlapBack < overlapFront) {
      z -= overlapBack;
    } else {
      z += overlapFront;
    }
    player = feetToPlayerBox({ ...feet, z });
  }

  return z;
}

function moveFeetStep(
  feet: FeetPosition,
  delta: MoveDelta,
  colliders: MoveColliders,
): MoveResult {
  const yResult = collideAxisY(feet, delta.y, colliders.blocks);
  const next: FeetPosition = {
    x: feet.x,
    y: yResult.y,
    z: feet.z,
  };

  next.x = collideAxisX(next, delta.x, colliders.blocks, colliders.walls);
  next.z = collideAxisZ(next, delta.z, colliders.blocks, colliders.walls);

  return {
    ...clampFeetToBounds(next, colliders.bounds),
    onGround: yResult.onGround,
    hitCeiling: yResult.hitCeiling,
  };
}

/** Minecraft-style movement with sub-steps, wall/block split, and hard arena bounds. */
export function moveFeet(
  feet: FeetPosition,
  delta: MoveDelta,
  colliders: MoveColliders,
): MoveResult {
  const magnitude = Math.hypot(delta.x, delta.y, delta.z);
  const steps = Math.max(1, Math.ceil(magnitude / MAX_MOVE_STEP));

  let current: FeetPosition = clampFeetToBounds(feet, colliders.bounds);
  let onGround = false;
  let hitCeiling = false;

  for (let i = 0; i < steps; i++) {
    const step: MoveDelta = {
      x: delta.x / steps,
      y: delta.y / steps,
      z: delta.z / steps,
    };
    const result = moveFeetStep(current, step, colliders);
    current = result;
    onGround = onGround || result.onGround;
    hitCeiling = hitCeiling || result.hitCeiling;
  }

  return {
    ...clampFeetToBounds(current, colliders.bounds),
    onGround,
    hitCeiling,
  };
}
