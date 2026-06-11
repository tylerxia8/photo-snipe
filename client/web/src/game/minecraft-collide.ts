import * as THREE from "three";

/** Minecraft player width is 0.6 blocks (±0.3 from center). */
export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
const ON_TOP_EPS = 0.001;

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

export function feetToPlayerBox(feet: FeetPosition): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(feet.x - PLAYER_HALF_WIDTH, feet.y, feet.z - PLAYER_HALF_WIDTH),
    new THREE.Vector3(feet.x + PLAYER_HALF_WIDTH, feet.y + PLAYER_HEIGHT, feet.z + PLAYER_HALF_WIDTH),
  );
}

function isOnTopOf(player: THREE.Box3, solid: THREE.Box3): boolean {
  return player.min.y >= solid.max.y - ON_TOP_EPS;
}

export function collideAxisY(
  feet: FeetPosition,
  dy: number,
  solids: THREE.Box3[],
): { y: number; onGround: boolean; hitCeiling: boolean } {
  if (dy === 0) {
    return { y: feet.y, onGround: false, hitCeiling: false };
  }

  let y = feet.y + dy;
  let onGround = false;
  let hitCeiling = false;
  let player = feetToPlayerBox({ ...feet, y });

  for (const solid of solids) {
    if (!player.intersectsBox(solid)) {
      continue;
    }

    if (dy < 0) {
      const pushUp = solid.max.y - player.min.y;
      if (pushUp > 0) {
        y += pushUp;
        onGround = true;
        player = feetToPlayerBox({ ...feet, y });
      }
    } else {
      const pushDown = player.max.y - solid.min.y;
      if (pushDown > 0) {
        y -= pushDown;
        hitCeiling = true;
        player = feetToPlayerBox({ ...feet, y });
      }
    }
  }

  return { y, onGround, hitCeiling };
}

export function collideAxisX(feet: FeetPosition, dx: number, solids: THREE.Box3[]): number {
  if (dx === 0) {
    return feet.x;
  }

  let x = feet.x + dx;
  let player = feetToPlayerBox({ ...feet, x });

  for (const solid of solids) {
    if (!player.intersectsBox(solid)) {
      continue;
    }
    if (isOnTopOf(player, solid)) {
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

export function collideAxisZ(feet: FeetPosition, dz: number, solids: THREE.Box3[]): number {
  if (dz === 0) {
    return feet.z;
  }

  let z = feet.z + dz;
  let player = feetToPlayerBox({ ...feet, z });

  for (const solid of solids) {
    if (!player.intersectsBox(solid)) {
      continue;
    }
    if (isOnTopOf(player, solid)) {
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

/** Minecraft-style movement: resolve Y, then X, then Z against solid AABBs. */
export function moveFeet(feet: FeetPosition, delta: MoveDelta, solids: THREE.Box3[]): MoveResult {
  const yResult = collideAxisY(feet, delta.y, solids);
  const next: FeetPosition = {
    x: feet.x,
    y: yResult.y,
    z: feet.z,
  };

  next.x = collideAxisX(next, delta.x, solids);
  next.z = collideAxisZ(next, delta.z, solids);

  return {
    ...next,
    onGround: yResult.onGround,
    hitCeiling: yResult.hitCeiling,
  };
}
