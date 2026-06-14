import * as THREE from "three";

export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
const ON_TOP_EPS = 0.05;
const SKIN = 0.001;
const MAX_STEP = 0.125;
const SOLVE_PASSES = 8;

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

/** Feet are on or slightly above a prop's top face — not inside its sides. */
function supportedOnTop(feet: FeetPos, solid: THREE.Box3): boolean {
  if (!feetOverFootprint(feet, solid)) {
    return false;
  }
  return feet.y >= solid.max.y - ON_TOP_EPS;
}

function supportTopY(
  feet: FeetPos,
  surfaces: THREE.Box3[],
  maxFeetY = feet.y + ON_TOP_EPS,
): number | null {
  let bestTop = -Infinity;
  for (const surface of surfaces) {
    if (!feetOverFootprint(feet, surface)) {
      continue;
    }
    const top = surface.max.y;
    if (top > maxFeetY + ON_TOP_EPS) {
      continue;
    }
    if (top > bestTop) {
      bestTop = top;
    }
  }
  return bestTop > -Infinity ? bestTop : null;
}

function isGroundedAt(
  feet: FeetPos,
  surfaces: THREE.Box3[],
  verticalOnGround: boolean,
  deltaY: number,
): boolean {
  if (verticalOnGround) {
    return true;
  }
  const top = supportTopY(feet, surfaces);
  if (top === null) {
    return false;
  }
  return deltaY <= 0 && Math.abs(feet.y - top) <= ON_TOP_EPS;
}

function snapFeetToSupport(feet: FeetPos, surfaces: THREE.Box3[]): FeetPos {
  const top = supportTopY(feet, surfaces, feet.y + ON_TOP_EPS);
  if (top === null || feet.y >= top - ON_TOP_EPS) {
    return feet;
  }
  return { ...feet, y: top };
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

function isInsideBounds(x: number, z: number, bounds: WorldColliders["bounds"]): boolean {
  return (
    x >= bounds.minX &&
    x <= bounds.maxX &&
    z >= bounds.minZ &&
    z <= bounds.maxZ
  );
}

/** Push out of one solid by the smallest axis-aligned nudge. */
function resolveSolidOverlap(
  feet: FeetPos,
  solid: THREE.Box3,
  bounds: WorldColliders["bounds"],
): FeetPos {
  const player = playerAabb(feet);
  if (!player.intersectsBox(solid) || !verticalOverlap(player, solid)) {
    return feet;
  }
  if (supportedOnTop(feet, solid)) {
    return feet;
  }

  const depth = penetrationDepth(player, solid);
  const pushWest = player.max.x - solid.min.x + SKIN;
  const pushEast = solid.max.x - player.min.x + SKIN;
  const pushNorth = player.max.z - solid.min.z + SKIN;
  const pushSouth = solid.max.z - player.min.z + SKIN;

  if (depth.x <= depth.z) {
    const west = { ...feet, x: feet.x - pushWest };
    const east = { ...feet, x: feet.x + pushEast };
    const westOk = isInsideBounds(west.x, west.z, bounds);
    const eastOk = isInsideBounds(east.x, east.z, bounds);

    if (westOk && eastOk) {
      return pushWest <= pushEast ? west : east;
    }
    if (westOk) {
      return west;
    }
    if (eastOk) {
      return east;
    }
    return pushWest <= pushEast ? west : east;
  }

  const north = { ...feet, z: feet.z - pushNorth };
  const south = { ...feet, z: feet.z + pushSouth };
  const northOk = isInsideBounds(north.x, north.z, bounds);
  const southOk = isInsideBounds(south.x, south.z, bounds);

  if (northOk && southOk) {
    return pushNorth <= pushSouth ? north : south;
  }
  if (northOk) {
    return north;
  }
  if (southOk) {
    return south;
  }
  return pushNorth <= pushSouth ? north : south;
}

function resolveAllOverlaps(
  feet: FeetPos,
  walls: THREE.Box3[],
  props: THREE.Box3[],
  bounds: WorldColliders["bounds"],
): FeetPos {
  let resolved = { ...feet };

  for (let pass = 0; pass < SOLVE_PASSES; pass++) {
    let changed = false;

    for (const solid of walls) {
      const next = resolveSolidOverlap(resolved, solid, bounds);
      if (next.x !== resolved.x || next.z !== resolved.z) {
        resolved = next;
        changed = true;
      }
    }

    for (const solid of props) {
      if (standingOnProp(resolved, solid) || supportedOnTop(resolved, solid)) {
        continue;
      }
      const next = resolveSolidOverlap(resolved, solid, bounds);
      if (next.x !== resolved.x || next.z !== resolved.z) {
        resolved = next;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return resolved;
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
      if (skipWhenStandingOn && (standingOnProp({ ...feet, x }, solid) || supportedOnTop({ ...feet, x }, solid))) {
        continue;
      }

      const player = playerAabb({ ...feet, x });
      if (!player.intersectsBox(solid) || !verticalOverlap(player, solid)) {
        continue;
      }

      const depth = penetrationDepth(player, solid);
      if (depth.x > depth.z) {
        continue;
      }

      let nextX = x;
      if (dx > 0) {
        nextX = Math.min(x, solid.min.x - PLAYER_HALF_WIDTH - SKIN);
      } else if (dx < 0) {
        nextX = Math.max(x, solid.max.x + PLAYER_HALF_WIDTH + SKIN);
      } else {
        continue;
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
      if (skipWhenStandingOn && (standingOnProp({ ...feet, z }, solid) || supportedOnTop({ ...feet, z }, solid))) {
        continue;
      }

      const player = playerAabb({ ...feet, z });
      if (!player.intersectsBox(solid) || !verticalOverlap(player, solid)) {
        continue;
      }

      const depth = penetrationDepth(player, solid);
      if (depth.z > depth.x) {
        continue;
      }

      let nextZ = z;
      if (dz > 0) {
        nextZ = Math.min(z, solid.min.z - PLAYER_HALF_WIDTH - SKIN);
      } else if (dz < 0) {
        nextZ = Math.max(z, solid.max.z + PLAYER_HALF_WIDTH + SKIN);
      } else {
        continue;
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
  bounds: WorldColliders["bounds"],
): FeetPos {
  let x = clipAxisX(feet, dx, walls, false);
  x = clipAxisX({ ...feet, x }, dx, props, true);

  let z = clipAxisZ({ ...feet, x }, dz, walls, false);
  z = clipAxisZ({ ...feet, x, z }, dz, props, true);

  return resolveAllOverlaps({ ...feet, x, z }, walls, props, bounds);
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
  const horizontal = clipHorizontal(
    feet,
    delta.x,
    delta.z,
    world.walls,
    world.props,
    world.bounds,
  );
  const vertical = clipVertical(horizontal, delta.y, world.surfaces, world.ceiling);

  let settled = snapFeetToSupport({ ...horizontal, y: vertical.y }, world.surfaces);
  if (delta.y !== 0) {
    settled = clipHorizontal(settled, 0, 0, world.walls, world.props, world.bounds);
    settled = snapFeetToSupport(settled, world.surfaces);
  }

  const clamped = clampFeet(settled, world.bounds);

  return {
    ...clamped,
    onGround: isGroundedAt(clamped, world.surfaces, vertical.onGround, delta.y),
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
