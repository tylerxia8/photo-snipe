import * as THREE from "three";

const WALL_HEIGHT = 6;
const WALL_THICKNESS = 0.4;
const DEFAULT_FEET_Y = 1;
const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.8;
const ARENA_HALF = 24;

export { PLAYER_RADIUS, WALL_HEIGHT, PLAYER_HEIGHT };

export interface StandSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  feetY: number;
}

export interface WarehouseBuild {
  wallColliders: THREE.Box3[];
  propColliders: THREE.Box3[];
  standColliders: THREE.Box3[];
  ceilingCollider: THREE.Box3;
  standSurfaces: StandSurface[];
  defaultFeetY: number;
  worldBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

function flatMat(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

function flatTexMat(texture: THREE.Texture, color = 0xffffff): THREE.MeshLambertMaterial {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: texture, color });
}

function createGridTexture(light: string, dark: string, cells = 8): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const step = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? light : dark;
      ctx.fillRect(x * step, y * step, step, step);
    }
  }
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= cells; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

function addBox(
  parent: THREE.Object3D,
  pos: THREE.Vector3,
  size: THREE.Vector3,
  material: THREE.Material,
  colliders: THREE.Box3[],
): THREE.Box3 {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.copy(pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);

  const box = new THREE.Box3().setFromCenterAndSize(pos, size);
  colliders.push(box);
  return box;
}

function addLightStrip(
  parent: THREE.Object3D,
  pos: THREE.Vector3,
  size: THREE.Vector3,
): void {
  const housing = addBox(parent, pos, size, flatMat(0x3a4048), []);
  void housing;
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(size.x * 0.82, size.y * 0.35, size.z * 0.82),
    new THREE.MeshLambertMaterial({ color: 0xdff6ff, emissive: 0x88ccff, emissiveIntensity: 0.55 }),
  );
  glow.position.copy(pos);
  glow.position.y += size.y * 0.08;
  parent.add(glow);
}

const CROSS_WALL_X = 21;
const CROSS_WALL_HALF_Z = 3;

function makeInteriorWallCollider(cx: number, cz: number): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(cx - WALL_THICKNESS * 0.5, 0, cz - CROSS_WALL_HALF_Z),
    new THREE.Vector3(cx + WALL_THICKNESS * 0.5, WALL_HEIGHT, cz + CROSS_WALL_HALF_Z),
  );
}

function boxToSurface(box: THREE.Box3): StandSurface {
  return {
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z,
    feetY: box.max.y,
  };
}

export function buildWarehouse(scene: THREE.Scene): WarehouseBuild {
  const group = new THREE.Group();
  group.name = "warehouse";
  scene.add(group);

  const allBoxes: THREE.Box3[] = [];
  const wallBoxes: THREE.Box3[] = [];

  const floorTex = createGridTexture("#6b7280", "#5b6170");
  floorTex.repeat.set(12, 12);
  const floorMat = flatTexMat(floorTex);

  const wallMat = flatMat(0x8b95a8);
  const wallTrim = flatMat(0x5f6775);
  const ceilingMat = flatMat(0x454b57);
  const crateColors = [0xe67e22, 0x3498db, 0x2ecc71, 0x9b59b6, 0xf1c40f];
  const shelfMat = flatMat(0x546e7a);
  const pillarMat = flatMat(0x78909c);
  const stripeMat = flatMat(0xf39c12);

  const floorBox = addBox(
    group,
    new THREE.Vector3(0, -0.1, 0),
    new THREE.Vector3(48, 0.2, 48),
    floorMat,
    allBoxes,
  );
  const ceilingBox = addBox(
    group,
    new THREE.Vector3(0, WALL_HEIGHT + 0.05, 0),
    new THREE.Vector3(48, 0.1, 48),
    ceilingMat,
    allBoxes,
  );

  const addWall = (pos: THREE.Vector3, size: THREE.Vector3) => {
    const box = addBox(group, pos, size, wallMat, allBoxes);
    wallBoxes.push(box);
    const trimH = 0.15;
    addBox(
      group,
      new THREE.Vector3(pos.x, pos.y - size.y * 0.5 + trimH * 0.5, pos.z),
      new THREE.Vector3(size.x, trimH, size.z + 0.02),
      wallTrim,
      [],
    );
  };

  addWall(new THREE.Vector3(0, WALL_HEIGHT * 0.5, -24), new THREE.Vector3(48, WALL_HEIGHT, WALL_THICKNESS));
  addWall(new THREE.Vector3(0, WALL_HEIGHT * 0.5, 24), new THREE.Vector3(48, WALL_HEIGHT, WALL_THICKNESS));
  addWall(new THREE.Vector3(24, WALL_HEIGHT * 0.5, 0), new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, 48));
  addWall(new THREE.Vector3(-24, WALL_HEIGHT * 0.5, 0), new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, 48));

  for (const [x, z] of [
    [-21, -14], [21, -14], [-21, 0], [21, 0], [-21, 14], [21, 14],
  ] as const) {
    addWall(new THREE.Vector3(x, WALL_HEIGHT * 0.5, z), new THREE.Vector3(6, WALL_HEIGHT, WALL_THICKNESS));
  }

  for (let i = 0; i < 5; i++) {
    const x = -18 + i * 9;
    addLightStrip(group, new THREE.Vector3(x, WALL_HEIGHT + 0.02, 0), new THREE.Vector3(6, 0.12, 1.2));
  }

  for (const z of [-18, -8, 8, 18]) {
    addBox(group, new THREE.Vector3(16, 1.25, z), new THREE.Vector3(4, 2.5, 6), shelfMat, allBoxes);
    addBox(group, new THREE.Vector3(-16, 1.25, z), new THREE.Vector3(4, 2.5, 6), shelfMat, allBoxes);
    addBox(group, new THREE.Vector3(16, 2.55, z), new THREE.Vector3(4.1, 0.12, 6.1), stripeMat, allBoxes);
    addBox(group, new THREE.Vector3(-16, 2.55, z), new THREE.Vector3(4.1, 0.12, 6.1), stripeMat, allBoxes);
  }

  for (const [x, z] of [[8, -6], [-8, 6], [8, 6], [-8, -6]] as const) {
    addBox(group, new THREE.Vector3(x, 3, z), new THREE.Vector3(0.8, 6, 0.8), pillarMat, allBoxes);
    addBox(group, new THREE.Vector3(x, 5.8, z), new THREE.Vector3(1.2, 0.15, 1.2), stripeMat, allBoxes);
  }

  addBox(group, new THREE.Vector3(0, 1, 0), new THREE.Vector3(7, 2, 5), flatMat(crateColors[0]), allBoxes);
  addBox(group, new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(5, 2, 3.5), flatMat(crateColors[1]), allBoxes);

  const crates: Array<[number, number, number, number, number, number]> = [
    [6, 0.75, -20, 2, 1.5, 2], [-5, 0.75, -18, 1.5, 1.2, 1.5],
    [10, 0.75, -6, 2, 1.5, 2], [-10, 0.75, -4, 1.5, 1.2, 1.5],
    [5, 0.75, 8, 2, 1.5, 2], [-6, 0.75, 12, 1.5, 1.2, 1.5],
    [8, 0.75, 20, 2, 1.5, 2], [-7, 0.75, 18, 1.5, 1.2, 1.5],
    [3, 0.75, -2, 2, 1.5, 2], [-4, 0.75, 3, 1.5, 1.2, 1.5],
  ];
  crates.forEach(([x, y, z, sx, sy, sz], i) => {
    addBox(group, new THREE.Vector3(x, y, z), new THREE.Vector3(sx, sy, sz), flatMat(crateColors[i % crateColors.length]), allBoxes);
  });

  const spawnPad = (x: number, z: number, color: number) => {
    addBox(group, new THREE.Vector3(x, 0.02, z), new THREE.Vector3(3.2, 0.04, 3.2), flatMat(color), []);
    addBox(group, new THREE.Vector3(x, 0.06, z), new THREE.Vector3(2.4, 0.02, 2.4), flatMat(0xffffff), []);
  };
  spawnPad(0, -18, 0x3498db);
  spawnPad(0, 18, 0xe74c3c);

  const floorCollider = new THREE.Box3(
    new THREE.Vector3(-ARENA_HALF, 0, -ARENA_HALF),
    new THREE.Vector3(ARENA_HALF, DEFAULT_FEET_Y, ARENA_HALF),
  );

  const standSurfaces = [
    boxToSurface(floorCollider),
    ...allBoxes
      .filter((box) => box !== floorBox && box !== ceilingBox && box.max.y > 0.2)
      .map(boxToSurface),
  ];

  const interiorWallColliders: THREE.Box3[] = [];
  for (const z of [-14, 0, 14] as const) {
    interiorWallColliders.push(makeInteriorWallCollider(-CROSS_WALL_X, z));
    interiorWallColliders.push(makeInteriorWallCollider(CROSS_WALL_X, z));
  }

  const propColliders = allBoxes.filter(
    (box) => box !== floorBox && box !== ceilingBox && !wallBoxes.includes(box),
  );

  const standColliders = [floorCollider, ...propColliders];

  const inner = ARENA_HALF - WALL_THICKNESS * 0.5 - PLAYER_RADIUS - 0.01;

  return {
    wallColliders: interiorWallColliders,
    propColliders,
    standColliders,
    ceilingCollider: ceilingBox,
    standSurfaces,
    defaultFeetY: DEFAULT_FEET_Y,
    worldBounds: {
      minX: -inner,
      maxX: inner,
      minY: 0,
      maxY: WALL_HEIGHT - PLAYER_HEIGHT,
      minZ: -inner,
      maxZ: inner,
    },
  };
}

export function isFeetCenterOverSurface(
  x: number,
  z: number,
  surface: StandSurface,
): boolean {
  return (
    x >= surface.minX &&
    x <= surface.maxX &&
    z >= surface.minZ &&
    z <= surface.maxZ
  );
}

export function isPointOverSurface(
  x: number,
  z: number,
  surface: StandSurface,
  radius = PLAYER_RADIUS,
): boolean {
  return (
    x >= surface.minX + radius &&
    x <= surface.maxX - radius &&
    z >= surface.minZ + radius &&
    z <= surface.maxZ - radius
  );
}

export function supportsFeetAt(
  x: number,
  z: number,
  surfaces: StandSurface[],
  defaultFeetY: number,
  feetY: number,
  epsilon = 0.05,
): boolean {
  if (Math.abs(feetY - defaultFeetY) <= epsilon) {
    return isFeetCenterOverSurface(x, z, {
      minX: -ARENA_HALF,
      maxX: ARENA_HALF,
      minZ: -ARENA_HALF,
      maxZ: ARENA_HALF,
      feetY: defaultFeetY,
    });
  }

  for (const surface of surfaces) {
    if (
      Math.abs(surface.feetY - feetY) <= epsilon &&
      isFeetCenterOverSurface(x, z, surface)
    ) {
      return true;
    }
  }

  return false;
}

export function getHighestSurfaceBelow(
  x: number,
  z: number,
  surfaces: StandSurface[],
  defaultFeetY: number,
  maxFeetY: number,
  epsilon = 0.05,
): number {
  let best = defaultFeetY;
  for (const surface of surfaces) {
    if (
      isFeetCenterOverSurface(x, z, surface) &&
      surface.feetY <= maxFeetY + epsilon &&
      surface.feetY > best
    ) {
      best = surface.feetY;
    }
  }
  return best;
}
