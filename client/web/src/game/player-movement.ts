import * as THREE from "three";

export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
const ON_TOP_EPS = 0.05;
const SKIN = 0.001;
const MAX_STEP = 0.125;
const SOLVE_PASSES = 4;

export interface FeetPos {
  x: number;
  y: number;
  z: number;
}

export interface MoveDelta {
  x: number;
  y: number;
  z: number;
}

export interface MoveResult extends FeetPos {
  onGround: boolean;
  hitCeiling: boolean;
}

export interface WorldColliders {
  walls: THREE.Box3[];
  /** Props that block horizontal movement (excludes floor slab). */
  props: THREE.Box3[];
  /** Surfaces used for landing and ceiling hits (includes floor). */
  surfaces: THREE.Box3[];
  ceiling: THREE.Box3;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export function playerAabb(feet: FeetPos): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(feet.x - PLAYER_HALF_WIDTH, feet.y, feet.z - PLAYER_HALF_WIDTH),
    new THREE.Vector3(feet.x + PLAYER_HALF_WIDTH, feet.y + PLAYER_HEIGHT, feet.z + PLAYER_HALF_WIDTH),
  );
}

function feetOverFootprint(feet: FeetPos, box: THREE.Box3): boolean {
  return (
    feet.x >= box.min.x &&
    feet.x <= box.max.x &&
    feet.z >= box.min.z &&
    feet.z <= box.max.z
  );
}

function standingOnProp(feet: FeetPos, prop: THREE.Box3): boolean {
  return (
    Math.abs(feet.y - prop.max.y) <= ON_TOP_EPS &&
    feetOverFootprint(feet, prop)
  );
}

function verticalOverlap(player: THREE.Box3, solid: THREE.Box3): boolean {
  return player.max.y > solid.min.y + SKIN && player.min.y < solid.max.y - SKIN;
}

export function clampFeet(feet: FeetPos, bounds: WorldColliders["bounds"]): FeetPos {
  return {
    x: THREE.MathUtils.clamp(feet.x, bounds.minX, bounds.maxX),
    y: THREE.MathUtils.clamp(feet.y, bounds.minY, bounds.maxY),
    z: THREE.MathUtils.clamp(feet.z, bounds.minZ, bounds.maxZ),
  };
}

function penetrationDepth(player: THREE.Box3, solid: THREE.Box3): { x: number; z: number } {
  return {
    x: Math.min(player.max.x - solid.min.x, solid.max.x - player.min.x),
    z: Math.min(player.max.z - solid.min.z, solid.max.z - player.min.z),
  };
}

function clipAxisX(
  feet: FeetPos,
  dx: number,
  solids: THREE.Box3[],
  skipWhenStandingOn: boolean,
): number {
  let x = feet.x + dx;

  for (let pass = 0; pass < SOLVE_PASSES; pass++) {
    let changed = false;

    for (const solid of solids) {
      if (skipWhenStandingOn && standingOnProp({ ...feet, x }, solid)) {
        continue;
      }

      const player = playerAabb({ ...feet, x });
      if (!player.intersectsBox(solid) || !verticalOverlap(player, solid)) {
        continue;
      }

      const depth = penetrationDepth(player, solid);
      const resolveX = depth.x <= depth.z;
      if (!resolveX) {
        continue;
      }

      let nextX = x;
      if (dx > 0) {
        nextX = Math.min(x, solid.min.x - PLAYER_HALF_WIDTH - SKIN);
      } else if (dx < 0) {
        nextX = Math.max(x, solid.max.x + PLAYER_HALF_WIDTH + SKIN);
      } else {
        const pushLeft = player.max.x - solid.min.x;
        const pushRight = solid.max.x - player.min.x;
        nextX =
          pushLeft < pushRight
            ? solid.min.x - PLAYER_HALF_WIDTH - SKIN
            : solid.max.x + PLAYER_HALF_WIDTH + SKIN;
      }

      if (nextX !== x) {
        x = nextX;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return x;
}

function clipAxisZ(
  feet: FeetPos,
  dz: number,
  solids: THREE.Box3[],
  skipWhenStandingOn: boolean,
): number {
  let z = feet.z + dz;

  for (let pass = 0; pass < SOLVE_PASSES; pass++) {
    let changed = false;

    for (const solid of solids) {
      if (skipWhenStandingOn && standingOnProp({ ...feet, z }, solid)) {
        continue;
      }

      const player = playerAabb({ ...feet, z });
      if (!player.intersectsBox(solid) || !verticalOverlap(player, solid)) {
        continue;
      }

      const depth = penetrationDepth(player, solid);
      const resolveZ = depth.z <= depth.x;
      if (!resolveZ) {
        continue;
      }

      let nextZ = z;
      if (dz > 0) {
        nextZ = Math.min(z, solid.min.z - PLAYER_HALF_WIDTH - SKIN);
      } else if (dz < 0) {
        nextZ = Math.max(z, solid.max.z + PLAYER_HALF_WIDTH + SKIN);
      } else {
        const pushBack = player.max.z - solid.min.z;
        const pushFront = solid.max.z - player.min.z;
        nextZ =
          pushBack < pushFront
            ? solid.min.z - PLAYER_HALF_WIDTH - SKIN
            : solid.max.z + PLAYER_HALF_WIDTH + SKIN;
      }

      if (nextZ !== z) {
        z = nextZ;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return z;
}

function clipHorizontal(
  feet: FeetPos,
  dx: number,
  dz: number,
  walls: THREE.Box3[],
  props: THREE.Box3[],
): FeetPos {
  let x = clipAxisX(feet, dx, walls, false);
  x = clipAxisX({ ...feet, x }, dx, props, true);

  let z = clipAxisZ({ ...feet, x }, dz, walls, false);
  z = clipAxisZ({ ...feet, x, z }, dz, props, true);

  if (dx === 0) {
    x = clipAxisX({ ...feet, x, z }, 0, walls, false);
    x = clipAxisX({ ...feet, x, z }, 0, props, true);
  }
  if (dz === 0) {
    z = clipAxisZ({ ...feet, x, z }, 0, walls, false);
    z = clipAxisZ({ ...feet, x, z }, 0, props, true);
  }

  return { ...feet, x, z };
}

function clipVertical(
  feet: FeetPos,
  dy: number,
  surfaces: THREE.Box3[],
  ceiling: THREE.Box3,
): { y: number; onGround: boolean; hitCeiling: boolean } {
  if (dy === 0) {
    return { y: feet.y, onGround: false, hitCeiling: false };
  }

  let y = feet.y + dy;
  let onGround = false;
  let hitCeiling = false;

  if (dy < 0) {
    let bestTop = -Infinity;
    for (const surface of surfaces) {
      if (!feetOverFootprint(feet, surface)) {
        continue;
      }
      const top = surface.max.y;
      if (y > top + ON_TOP_EPS) {
        continue;
      }
      if (top > bestTop) {
        bestTop = top;
      }
    }
    if (bestTop > -Infinity) {
      y = bestTop;
      onGround = true;
    }
  } else {
    const headY = y + PLAYER_HEIGHT;
    if (headY > ceiling.min.y - SKIN) {
      y = ceiling.min.y - PLAYER_HEIGHT;
      hitCeiling = true;
    }

    for (const surface of surfaces) {
      if (surface.min.y <= feet.y + ON_TOP_EPS) {
        continue;
      }
      if (!feetOverFootprint(feet, surface)) {
        continue;
      }
      if (y + PLAYER_HEIGHT > surface.min.y - SKIN) {
        y = surface.min.y - PLAYER_HEIGHT;
        hitCeiling = true;
      }
    }
  }

  return { y, onGround, hitCeiling };
}

function moveStep(feet: FeetPos, delta: MoveDelta, world: WorldColliders): MoveResult {
  const horizontal = clipHorizontal(feet, delta.x, delta.z, world.walls, world.props);
  const vertical = clipVertical(horizontal, delta.y, world.surfaces, world.ceiling);

  let settled = { ...horizontal, y: vertical.y };
  if (delta.y !== 0) {
    settled = clipHorizontal(settled, 0, 0, world.walls, world.props);
  }

  const clamped = clampFeet(settled, world.bounds);

  return {
    ...clamped,
    onGround: vertical.onGround,
    hitCeiling: vertical.hitCeiling,
  };
}

/** Move the player using feet-space AABB collision against walls, props, and ceiling. */
export function movePlayer(feet: FeetPos, delta: MoveDelta, world: WorldColliders): MoveResult {
  const length = Math.hypot(delta.x, delta.y, delta.z);
  const steps = Math.max(1, Math.ceil(length / MAX_STEP));

  let current = clampFeet(feet, world.bounds);
  let onGround = false;
  let hitCeiling = false;

  for (let i = 0; i < steps; i++) {
    const step: MoveDelta = {
      x: delta.x / steps,
      y: delta.y / steps,
      z: delta.z / steps,
    };
    const result = moveStep(current, step, world);
    current = result;
    onGround = onGround || result.onGround;
    hitCeiling = hitCeiling || result.hitCeiling;
  }

  return {
    ...clampFeet(current, world.bounds),
    onGround,
    hitCeiling,
  };
}
