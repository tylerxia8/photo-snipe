import * as THREE from "three";
import {
  getArenaDefinition,
  type ArenaLayoutConfig,
  type ArenaSolidBox,
} from "@photo-snipe/core";

const PLAYER_RADIUS = 0.3;
const PLAYER_HEIGHT = 1.8;

export { PLAYER_RADIUS, PLAYER_HEIGHT };

export interface StandSurface {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  feetY: number;
}

export interface ArenaBuild {
  group: THREE.Group;
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
  skyColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
}

interface ArenaTheme {
  skyColor: number;
  fogColor: number;
  floorLight: string;
  floorDark: string;
  wallColor: number;
  wallTrim: number;
  ceilingColor: number;
  propColors: number[];
  accentColor: number;
  openAir?: boolean;
}

const THEMES: Record<string, ArenaTheme> = {
  "warehouse-interior-01": {
    skyColor: 0x7eb8da,
    fogColor: 0x9ec9e0,
    floorLight: "#6b7280",
    floorDark: "#5b6170",
    wallColor: 0x8b95a8,
    wallTrim: 0x5f6775,
    ceilingColor: 0x454b57,
    propColors: [0xe67e22, 0x3498db, 0x2ecc71, 0x9b59b6, 0xf1c40f],
    accentColor: 0xf39c12,
  },
  "rooftop-01": {
    skyColor: 0x6eb5ff,
    fogColor: 0x9fd4ff,
    floorLight: "#707888",
    floorDark: "#5a6170",
    wallColor: 0xa8b0bc,
    wallTrim: 0x8a929e,
    ceilingColor: 0x87ceeb,
    propColors: [0x78909c, 0x607d8b, 0x546e7a, 0x455a64, 0x90a4ae],
    accentColor: 0xffc107,
    openAir: true,
  },
  "duct-network-01": {
    skyColor: 0x2a3038,
    fogColor: 0x3d4654,
    floorLight: "#5a6068",
    floorDark: "#454b52",
    wallColor: 0x6d7580,
    wallTrim: 0x4a515a,
    ceilingColor: 0x525963,
    propColors: [0x707780, 0x5c636c, 0x666d75, 0x7a828a, 0x585f67],
    accentColor: 0xffa000,
  },
};

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

function boxToSurface(box: THREE.Box3): StandSurface {
  return {
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z,
    feetY: box.max.y,
  };
}

function makeInteriorWallCollider(
  x: number,
  z: number,
  halfZ: number,
  wallHeight: number,
  wallThickness: number,
): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(x - wallThickness * 0.5, 0, z - halfZ),
    new THREE.Vector3(x + wallThickness * 0.5, wallHeight, z + halfZ),
  );
}

function materialForSolid(
  solid: ArenaSolidBox,
  theme: ArenaTheme,
  floorMat: THREE.Material,
  wallMat: THREE.Material,
  ceilingMat: THREE.Material,
  propIndex: number,
): THREE.Material {
  if (solid.category === "floor") {
    return floorMat;
  }
  if (solid.category === "ceiling") {
    return ceilingMat;
  }
  if (solid.category === "wall") {
    return wallMat;
  }
  return flatMat(theme.propColors[propIndex % theme.propColors.length]!);
}

function addWarehouseDecor(group: THREE.Group, layout: ArenaLayoutConfig, theme: ArenaTheme): void {
  const wallHeight = layout.wallHeight;
  for (let i = 0; i < 5; i++) {
    const x = -18 + i * 9;
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.12, 1.2),
      flatMat(0x3a4048),
    );
    housing.position.set(x, wallHeight + 0.02, 0);
    group.add(housing);
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(4.9, 0.04, 0.98),
      new THREE.MeshLambertMaterial({ color: 0xdff6ff, emissive: 0x88ccff, emissiveIntensity: 0.55 }),
    );
    glow.position.set(x, wallHeight + 0.08, 0);
    group.add(glow);
  }

  for (const z of [-18, -8, 8, 18] as const) {
    for (const x of [16, -16] as const) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(4.1, 0.12, 6.1),
        flatMat(theme.accentColor),
      );
      stripe.position.set(x, 2.55, z);
      group.add(stripe);
    }
  }

  for (const [x, z] of [[8, -6], [-8, 6], [8, 6], [-8, -6]] as const) {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.15, 1.2),
      flatMat(theme.accentColor),
    );
    cap.position.set(x, 5.8, z);
    group.add(cap);
  }

  const spawnPad = (x: number, z: number, color: number) => {
    addBox(group, new THREE.Vector3(x, 0.02, z), new THREE.Vector3(3.2, 0.04, 3.2), flatMat(color), []);
    addBox(group, new THREE.Vector3(x, 0.06, z), new THREE.Vector3(2.4, 0.02, 2.4), flatMat(0xffffff), []);
  };
  spawnPad(0, -18, 0x3498db);
  spawnPad(0, 18, 0xe74c3c);
}

function addRooftopDecor(group: THREE.Group, theme: ArenaTheme): void {
  const helipad = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.03, 4),
    flatMat(theme.accentColor),
  );
  helipad.position.set(0, 0.03, -14);
  group.add(helipad);

  const mark = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.04, 2.2),
    flatMat(0xffffff),
  );
  mark.position.set(0, 0.05, -14);
  group.add(mark);
  const markH = mark.clone();
  markH.rotation.y = Math.PI / 2;
  group.add(markH);
}

function addDuctDecor(group: THREE.Group, theme: ArenaTheme): void {
  const stripeMat = flatMat(theme.accentColor);
  for (const [x, z, sx, sz] of [
    [-14, -10, 0.12, 8],
    [0, -4, 18, 0.12],
    [6, 3, 0.12, 10],
    [-2, 10, 14, 0.12],
    [-10, 15, 0.12, 8],
  ] as const) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.08, sz), stripeMat);
    stripe.position.set(x, 0.08, z);
    group.add(stripe);
  }

  for (const [x, z] of [[-14, -17], [-10, 17]] as const) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12, 0.35),
      new THREE.MeshLambertMaterial({
        color: 0xffcc66,
        emissive: 0xff9900,
        emissiveIntensity: 0.45,
      }),
    );
    lamp.position.set(x, 2.85, z);
    group.add(lamp);
  }
}

export function buildArena(scene: THREE.Scene, roundId: string): ArenaBuild {
  const { layout, solids } = getArenaDefinition(roundId);
  const theme = THEMES[roundId] ?? THEMES["warehouse-interior-01"]!;

  const group = new THREE.Group();
  group.name = layout.id;
  scene.add(group);

  const allBoxes: THREE.Box3[] = [];
  const wallBoxes: THREE.Box3[] = [];
  let floorBox: THREE.Box3 | null = null;
  let ceilingBox: THREE.Box3 | null = null;
  let propIndex = 0;

  const floorTex = createGridTexture(theme.floorLight, theme.floorDark, layout.halfExtent >= 24 ? 12 : 9);
  floorTex.repeat.set(layout.halfExtent / 2, layout.halfExtent / 2);
  const floorMat = flatTexMat(floorTex);
  const wallMat = flatMat(theme.wallColor);
  const ceilingMat = flatMat(theme.ceilingColor);

  for (const solid of solids) {
    if (theme.openAir && solid.category === "ceiling") {
      const pos = new THREE.Vector3(solid.cx, solid.cy, solid.cz);
      const size = new THREE.Vector3(solid.sx, solid.sy, solid.sz);
      ceilingBox = new THREE.Box3().setFromCenterAndSize(pos, size);
      continue;
    }

    const pos = new THREE.Vector3(solid.cx, solid.cy, solid.cz);
    const size = new THREE.Vector3(solid.sx, solid.sy, solid.sz);
    const mat = materialForSolid(solid, theme, floorMat, wallMat, ceilingMat, propIndex);
    if (solid.category === "prop") {
      propIndex += 1;
    }

    const box = addBox(group, pos, size, mat, allBoxes);
    if (solid.category === "floor") {
      floorBox = box;
    } else if (solid.category === "ceiling") {
      ceilingBox = box;
    } else if (solid.category === "wall") {
      wallBoxes.push(box);
      if (roundId === "warehouse-interior-01") {
        addBox(
          group,
          new THREE.Vector3(pos.x, pos.y - size.y * 0.5 + 0.075, pos.z),
          new THREE.Vector3(size.x, 0.15, size.z + 0.02),
          flatMat(theme.wallTrim),
          [],
        );
      }
    }
  }

  if (roundId === "warehouse-interior-01") {
    addWarehouseDecor(group, layout, theme);
  } else if (roundId === "rooftop-01") {
    addRooftopDecor(group, theme);
  } else if (roundId === "duct-network-01") {
    addDuctDecor(group, theme);
  }

  const floorCollider = new THREE.Box3(
    new THREE.Vector3(-layout.halfExtent, 0, -layout.halfExtent),
    new THREE.Vector3(layout.halfExtent, layout.defaultFeetY, layout.halfExtent),
  );

  const propColliders = allBoxes.filter(
    (box) =>
      box !== floorBox &&
      box !== ceilingBox &&
      !wallBoxes.includes(box),
  );

  const standSurfaces = [
    boxToSurface(floorCollider),
    ...propColliders.map(boxToSurface),
  ];

  const interiorWallColliders = (layout.interiorWalls ?? []).map((wall) =>
    makeInteriorWallCollider(wall.x, wall.z, wall.halfZ, layout.wallHeight, layout.wallThickness),
  );

  const standColliders = [floorCollider, ...propColliders];
  const inner = layout.halfExtent - layout.wallThickness * 0.5 - PLAYER_RADIUS - 0.01;
  const maxY = theme.openAir ? 10 : layout.wallHeight - PLAYER_HEIGHT;
  const fogNear = roundId === "duct-network-01" ? 8 : 45;
  const fogFar = roundId === "duct-network-01" ? 55 : 95;

  return {
    group,
    wallColliders: interiorWallColliders,
    propColliders,
    standColliders,
    ceilingCollider: ceilingBox ?? new THREE.Box3(new THREE.Vector3(0, maxY, 0), new THREE.Vector3(0, maxY + 1, 0)),
    standSurfaces,
    defaultFeetY: layout.defaultFeetY,
    worldBounds: {
      minX: -inner,
      maxX: inner,
      minY: 0,
      maxY,
      minZ: -inner,
      maxZ: inner,
    },
    skyColor: theme.skyColor,
    fogColor: theme.fogColor,
    fogNear,
    fogFar,
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

export function supportsFeetAt(
  x: number,
  z: number,
  surfaces: StandSurface[],
  defaultFeetY: number,
  feetY: number,
  halfExtent: number,
  epsilon = 0.05,
): boolean {
  if (Math.abs(feetY - defaultFeetY) <= epsilon) {
    return isFeetCenterOverSurface(x, z, {
      minX: -halfExtent,
      maxX: halfExtent,
      minZ: -halfExtent,
      maxZ: halfExtent,
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
