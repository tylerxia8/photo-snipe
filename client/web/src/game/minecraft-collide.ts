import * as THREE from "three";

/** Minecraft player width is 0.6 blocks (±0.3 from center). */
export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
const ON_TOP_EPS = 0.05;
const SKIN = 0.001;
const MAX_MOVE_STEP = 0.125;
const SOLVE_PASSES = 4;

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

function hasVerticalOverlap(player: THREE.Box3, solid: THREE.Box3): boolean {
  return player.max.y > solid.min.y + SKIN && player.min.y < solid.max.y - SKIN;
}

export function clampFeetToBounds(feet: FeetPosition, bounds: ArenaBounds): FeetPosition {
  return {
    x: THREE.MathUtils.clamp(feet.x, bounds.minX, bounds.maxX),
    y: THREE.MathUtils.clamp(feet.y, bounds.minY, bounds.maxY),
    z: THREE.MathUtils.clamp(feet.z, bounds.minZ, bounds.maxZ),
  };
}

function clipAxisX(feet: FeetPosition, dx: number, solid: THREE.Box3, skipTop: boolean): number {
  if (skipTop && isStandingOnTop(feet, solid)) {
    return feet.x;
  }

  const player = feetToPlayerBox(feet);
  if (!player.intersectsBox(solid) || !hasVerticalOverlap(player, solid)) {
    return feet.x;
  }

  if (dx > 0) {
    return Math.min(feet.x, solid.min.x - PLAYER_HALF_WIDTH - SKIN);
  }
  if (dx < 0) {
    return Math.max(feet.x, solid.max.x + PLAYER_HALF_WIDTH + SKIN);
  }

  const overlapLeft = player.max.x - solid.min.x;
  const overlapRight = solid.max.x - player.min.x;
  if (overlapLeft < overlapRight) {
    return feet.x - overlapLeft - SKIN;
  }
  return feet.x + overlapRight + SKIN;
}

function clipAxisZ(feet: FeetPosition, dz: number, solid: THREE.Box3, skipTop: boolean): number {
  if (skipTop && isStandingOnTop(feet, solid)) {
    return feet.z;
  }

  const player = feetToPlayerBox(feet);
  if (!player.intersectsBox(solid) || !hasVerticalOverlap(player, solid)) {
    return feet.z;
  }

  if (dz > 0) {
    return Math.min(feet.z, solid.min.z - PLAYER_HALF_WIDTH - SKIN);
  }
  if (dz < 0) {
    return Math.max(feet.z, solid.max.z + PLAYER_HALF_WIDTH + SKIN);
  }

  const overlapBack = player.max.z - solid.min.z;
  const overlapFront = solid.max.z - player.min.z;
  if (overlapBack < overlapFront) {
    return feet.z - overlapBack - SKIN;
  }
  return feet.z + overlapFront + SKIN;
}

function collideHorizontal(
  feet: FeetPosition,
  dx: number,
  dz: number,
  blocks: THREE.Box3[],
  walls: THREE.Box3[],
): FeetPosition {
  let x = feet.x + dx;
  let z = feet.z + dz;

  for (let pass = 0; pass < SOLVE_PASSES; pass++) {
    let moved = false;

    for (const solid of walls) {
      const nextX = clipAxisX({ ...feet, x, z }, dx, solid, false);
      if (nextX !== x) {
        x = nextX;
        moved = true;
      }
    }

    for (const solid of blocks) {
      const nextX = clipAxisX({ ...feet, x, z }, dx, solid, true);
      if (nextX !== x) {
        x = nextX;
        moved = true;
      }
    }

    for (const solid of walls) {
      const nextZ = clipAxisZ({ ...feet, x, z }, dz, solid, false);
      if (nextZ !== z) {
        z = nextZ;
        moved = true;
      }
    }

    for (const solid of blocks) {
      const nextZ = clipAxisZ({ ...feet, x, z }, dz, solid, true);
      if (nextZ !== z) {
        z = nextZ;
        moved = true;
      }
    }

    if (!moved) {
      break;
    }
  }

  return { ...feet, x, z };
}

function collideAxisY(
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

  for (const solid of blocks) {
    if (!isFeetCenterOverSolid(feet, solid)) {
      continue;
    }

    if (dy < 0) {
      const top = solid.max.y;
      if (feet.y + ON_TOP_EPS < top) {
        continue;
      }
      const nextMinY = y;
      if (nextMinY > top + ON_TOP_EPS) {
        continue;
      }

      y = top;
      onGround = true;
    } else {
      const bottom = solid.min.y;
      if (bottom <= feet.y + ON_TOP_EPS) {
        continue;
      }

      const nextMaxY = y + PLAYER_HEIGHT;
      if (nextMaxY < bottom - ON_TOP_EPS) {
        continue;
      }

      y = bottom - PLAYER_HEIGHT;
      hitCeiling = true;
    }
  }

  return { y, onGround, hitCeiling };
}

function moveFeetStep(
  feet: FeetPosition,
  delta: MoveDelta,
  colliders: MoveColliders,
): MoveResult {
  let horizontal = collideHorizontal(
    feet,
    delta.x,
    delta.z,
    colliders.blocks,
    colliders.walls,
  );

  const yResult = collideAxisY(horizontal, delta.y, colliders.blocks);

  horizontal = {
    ...horizontal,
    y: yResult.y,
  };

  if (delta.y !== 0) {
    horizontal = collideHorizontal(horizontal, 0, 0, colliders.blocks, colliders.walls);
  }

  return {
    ...clampFeetToBounds(horizontal, colliders.bounds),
    onGround: yResult.onGround,
    hitCeiling: yResult.hitCeiling,
  };
}

/** Minecraft-style movement: horizontal slide first, then vertical, with sub-steps. */
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
