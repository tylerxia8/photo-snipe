import * as THREE from "three";
import {
  getArenaDefinition,
  CITY_STREETS_BUILDINGS,
  CITY_STREETS_HALF,
  CITY_STREETS_PARK,
  CITY_STREETS_PARK_BENCHES,
  CITY_STREETS_PARK_FOUNTAIN,
  CITY_STREETS_PARKED_CARS,
  CITY_STREETS_FENCE_SEGMENTS,
  CITY_STREETS_PARK_TREES,
  CITY_STREETS_ROAD_HALF,
  CITY_STREETS_SPAWN_A,
  CITY_STREETS_SPAWN_B,
  CITY_STREETS_TAXI,
  CITY_STREETS_VENDORS,
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
    floorLight: "#56585c",
    floorDark: "#484a4e",
    wallColor: 0x737882,
    wallTrim: 0x52565e,
    ceilingColor: 0x5a5e66,
    propColors: [0x856137, 0x474d56, 0x8c9094, 0x6b5a42, 0x5c6068],
    accentColor: 0xc17817,
  },
  "freight-depot-01": {
    skyColor: 0x6a7a8a,
    fogColor: 0x8a949e,
    floorLight: "#6e7378",
    floorDark: "#585d62",
    wallColor: 0x7a828a,
    wallTrim: 0x4a5058,
    ceilingColor: 0x3d434a,
    propColors: [0x8b6914, 0x6b7280, 0x4a5568, 0x9ca3af, 0x78716c],
    accentColor: 0xf1c40f,
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
  "corn-maze-01": {
    skyColor: 0x87aecf,
    fogColor: 0xc8b48a,
    floorLight: "#8b6914",
    floorDark: "#6b4f12",
    wallColor: 0x7a8f3a,
    wallTrim: 0x5f7028,
    ceilingColor: 0x87ceeb,
    propColors: [0x6f8f2e, 0x7ea834, 0x5c7a24, 0x8fae3a, 0x4d6a1c],
    accentColor: 0xe67e22,
    openAir: true,
  },
  "city-streets-01": {
    skyColor: 0x7da8d8,
    fogColor: 0xa8b8c8,
    floorLight: "#3d4249",
    floorDark: "#2b3036",
    wallColor: 0x5c6370,
    wallTrim: 0x3f4650,
    ceilingColor: 0xb8c4d0,
    propColors: [0xc0392b, 0x2980b9, 0x2c3e50, 0x7f8c8d, 0x34495e],
    accentColor: 0xf1c40f,
    openAir: true,
  },
};

function flatMat(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

function groundOverlayMat(color: number): THREE.MeshLambertMaterial {
  const mat = flatMat(color);
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1;
  mat.polygonOffsetUnits = -4;
  return mat;
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

function addColliderBox(colliders: THREE.Box3[], pos: THREE.Vector3, size: THREE.Vector3): THREE.Box3 {
  const box = new THREE.Box3().setFromCenterAndSize(pos, size);
  colliders.push(box);
  return box;
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
  roundId: string,
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
  if (roundId === "city-streets-01") {
    if (solid.sy >= 14) {
      return flatMat(0x7f8fa6);
    }
    if (solid.sy >= 10) {
      return flatMat(0x6b7280);
    }
    if (solid.sy >= 2.5) {
      return flatMat(0x4a7c59);
    }
    if (solid.sy >= 1.4 && solid.sx >= 1.2 && solid.sz >= 1) {
      return flatMat(theme.propColors[propIndex % theme.propColors.length]!);
    }
  }
  return flatMat(theme.propColors[propIndex % theme.propColors.length]!);
}

function addIndustrialDecor(
  group: THREE.Group,
  layout: ArenaLayoutConfig,
  theme: ArenaTheme,
  spawnA: { x: number; z: number },
  spawnB: { x: number; z: number },
): void {
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
    cap.position.set(x, wallHeight - 0.2, z);
    group.add(cap);
  }

  const spawnPad = (x: number, z: number, color: number) => {
    addBox(group, new THREE.Vector3(x, 0.02, z), new THREE.Vector3(3.2, 0.04, 3.2), flatMat(color), []);
    addBox(group, new THREE.Vector3(x, 0.06, z), new THREE.Vector3(2.4, 0.02, 2.4), flatMat(0xffffff), []);
  };
  spawnPad(spawnA.x, spawnA.z, 0x3498db);
  spawnPad(spawnB.x, spawnB.z, 0xe74c3c);
}

function addFreightDepotDecor(group: THREE.Group, layout: ArenaLayoutConfig, theme: ArenaTheme): void {
  addIndustrialDecor(group, layout, theme, { x: 0, z: -18 }, { x: 0, z: 18 });

  const hazardMat = flatMat(0xf1c40f);
  const hazardDark = flatMat(0x2c2c2c);
  for (const z of [-18, 18] as const) {
    for (let i = 0; i < 6; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.05, 0.45),
        i % 2 === 0 ? hazardMat : hazardDark,
      );
      stripe.position.set(-2.4 + i * 0.9, 0.05, z + (z < 0 ? 1.8 : -1.8));
      group.add(stripe);
    }

    const dockFrame = new THREE.Mesh(
      new THREE.BoxGeometry(8, 4.2, 0.2),
      flatMat(0x505862),
    );
    dockFrame.position.set(0, 2.1, z + (z < 0 ? 5.8 : -5.8));
    group.add(dockFrame);

    const dockDoor = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 3.8, 0.08),
      flatMat(0x3a4048),
    );
    dockDoor.position.set(0, 2, z + (z < 0 ? 5.7 : -5.7));
    group.add(dockDoor);
  }

  for (const x of [-22, 22] as const) {
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.5, 10),
      flatMat(0x111111),
    );
    bumper.position.set(x, 0.25, 0);
    group.add(bumper);
    const bumperStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.12, 2),
      hazardMat,
    );
    bumperStripe.position.set(x, 0.55, 0);
    group.add(bumperStripe);
  }
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

function addCityStreetsDecor(group: THREE.Group, theme: ArenaTheme): void {
  const asphaltMat = groundOverlayMat(0x2f343a);
  const sidewalkMat = groundOverlayMat(0x9aa0a8);
  const grassMat = groundOverlayMat(0x4f8f46);
  const laneMat = groundOverlayMat(theme.accentColor);
  const whiteMat = groundOverlayMat(0xf5f5f5);
  const roadHalf = CITY_STREETS_ROAD_HALF;
  const roadWidth = roadHalf * 2;
  const armLength = CITY_STREETS_HALF - roadHalf;
  const armCenter = roadHalf + armLength * 0.5;
  const sidewalkOffset = roadHalf + 1.75;
  const sidewalkWidth = 2.8;

  const GROUND = {
    asphalt: 0.03,
    sidewalk: 0.06,
    grass: 0.045,
    marking: 0.08,
  };

  const groundSlab = (
    cx: number,
    cz: number,
    sx: number,
    sz: number,
    mat: THREE.MeshLambertMaterial,
    y: number,
    renderOrder = 0,
  ) => {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.04, sz), mat);
    slab.position.set(cx, y, cz);
    slab.receiveShadow = true;
    slab.renderOrder = renderOrder;
    group.add(slab);
  };

  groundSlab(0, 0, roadWidth, roadWidth, asphaltMat, GROUND.asphalt, 1);
  groundSlab(0, armCenter, roadWidth, armLength, asphaltMat, GROUND.asphalt, 1);
  groundSlab(0, -armCenter, roadWidth, armLength, asphaltMat, GROUND.asphalt, 1);
  groundSlab(armCenter, 0, armLength, roadWidth, asphaltMat, GROUND.asphalt, 1);
  groundSlab(-armCenter, 0, armLength, roadWidth, asphaltMat, GROUND.asphalt, 1);
  groundSlab(armCenter, armCenter, armLength, armLength, asphaltMat, GROUND.asphalt, 1);
  groundSlab(-armCenter, armCenter, armLength, armLength, asphaltMat, GROUND.asphalt, 1);
  groundSlab(armCenter, -armCenter, armLength, armLength, asphaltMat, GROUND.asphalt, 1);
  groundSlab(-armCenter, -armCenter, armLength, armLength, asphaltMat, GROUND.asphalt, 1);

  const park = CITY_STREETS_PARK;
  groundSlab(park.cx, park.cz, park.sx - 1, park.sz - 1, grassMat, GROUND.grass, 2);

  const addSidewalkRun = (cx: number, cz: number, sx: number, sz: number) => {
    groundSlab(cx, cz, sx, sz, sidewalkMat, GROUND.sidewalk, 3);
  };

  addSidewalkRun(-sidewalkOffset, armCenter, sidewalkWidth, armLength);
  addSidewalkRun(-sidewalkOffset, -armCenter, sidewalkWidth, armLength);
  addSidewalkRun(sidewalkOffset, armCenter, sidewalkWidth, armLength);
  addSidewalkRun(sidewalkOffset, -armCenter, sidewalkWidth, armLength);
  addSidewalkRun(armCenter, sidewalkOffset, armLength, sidewalkWidth);
  addSidewalkRun(-armCenter, sidewalkOffset, armLength, sidewalkWidth);
  addSidewalkRun(armCenter, -sidewalkOffset, armLength, sidewalkWidth);
  addSidewalkRun(-armCenter, -sidewalkOffset, armLength, sidewalkWidth);

  for (const z of [-24, -12, 12, 24] as const) {
    groundSlab(0, z, 0.35, 8, laneMat, GROUND.marking, 4);
  }
  for (const x of [-24, -12, 12, 24] as const) {
    groundSlab(x, 0, 8, 0.35, laneMat, GROUND.marking, 4);
  }

  for (const z of [-1.4, 0, 1.4] as const) {
    groundSlab(0, z, roadWidth + 0.2, 0.9, whiteMat, GROUND.marking, 4);
  }
  for (const x of [-1.4, 0, 1.4] as const) {
    groundSlab(x, 0, 0.9, roadWidth + 0.2, whiteMat, GROUND.marking, 4);
  }

  const addCar = (
    x: number,
    z: number,
    footX: number,
    footZ: number,
    bodyColor: number,
    cabinColor = 0x1f2937,
  ) => {
    const car = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(footX, 0.72, footZ),
      flatMat(bodyColor),
    );
    body.position.y = 0.55;
    car.add(body);
    const cabinX = Math.min(footX, footX > footZ ? 2.3 : 1.55);
    const cabinZ = Math.min(footZ, footX > footZ ? 1.55 : 2.3);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(cabinX, 0.55, cabinZ),
      flatMat(cabinColor),
    );
    cabin.position.set(0, 0.98, footZ >= footX ? -0.35 : 0);
    car.add(cabin);
    const halfX = footX * 0.4;
    const halfZ = footZ * 0.35;
    for (const [ox, oz] of [
      [-halfX, -halfZ],
      [halfX, -halfZ],
      [-halfX, halfZ],
      [halfX, halfZ],
    ] as const) {
      const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), flatMat(0x111111));
      wheel.position.set(ox, 0.25, oz);
      car.add(wheel);
    }
    car.position.set(x, 0, z);
    group.add(car);
  };

  const carColors = [0xbdc3c7, 0x2c3e50, 0x922b21, 0x1f618d, 0x566573];
  CITY_STREETS_PARKED_CARS.forEach(([cx, cz, footX, footZ], index) => {
    addCar(cx, cz, footX, footZ, carColors[index % carColors.length]!);
  });

  addCar(
    CITY_STREETS_TAXI.cx,
    CITY_STREETS_TAXI.cz,
    CITY_STREETS_TAXI.footX,
    CITY_STREETS_TAXI.footZ,
    0xf1c40f,
    0x2c3e50,
  );
  const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.9), flatMat(0x2c3e50));
  taxiSign.position.set(CITY_STREETS_TAXI.cx, 1.35, CITY_STREETS_TAXI.cz);
  group.add(taxiSign);

  const addHotDogCart = (x: number, z: number) => {
    const cart = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.8), flatMat(0x7f8c8d));
    base.position.y = 0.55;
    cart.add(base);
    const umbrella = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 1.8), flatMat(0xe74c3c));
    umbrella.position.y = 1.55;
    cart.add(umbrella);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.35), flatMat(0xffffff));
    stripe.position.set(0, 1.62, 0);
    cart.add(stripe);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.08), flatMat(theme.accentColor));
    sign.position.set(0, 1.05, 0.46);
    cart.add(sign);
    cart.position.set(x, 0, z);
    group.add(cart);
  };

  for (const [x, , z] of CITY_STREETS_VENDORS.slice(0, 4)) {
    addHotDogCart(x, z);
  }

  const addNewsstand = (x: number, z: number) => {
    const stand = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.4), flatMat(0x7f8c8d));
    base.position.y = 0.55;
    stand.add(base);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.6), flatMat(0x566573));
    roof.position.y = 1.15;
    stand.add(roof);
    stand.position.set(x, 0, z);
    group.add(stand);
  };

  const addBusShelter = (x: number, z: number) => {
    const shelter = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.7, 0.12), flatMat(0x95a5a6));
    back.position.set(0, 1.35, -0.74);
    shelter.add(back);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.6), flatMat(0x566573));
    roof.position.set(0, 2.7, 0);
    shelter.add(roof);
    for (const sx of [-1.2, 1.2] as const) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.7, 0.12), flatMat(0x566573));
      post.position.set(sx, 1.35, 0.74);
      shelter.add(post);
    }
    shelter.position.set(x, 0, z);
    group.add(shelter);
  };

  addNewsstand(CITY_STREETS_VENDORS[4]![0], CITY_STREETS_VENDORS[4]![2]);
  addNewsstand(CITY_STREETS_VENDORS[5]![0], CITY_STREETS_VENDORS[5]![2]);
  addBusShelter(CITY_STREETS_VENDORS[6]![0], CITY_STREETS_VENDORS[6]![2]);
  addBusShelter(CITY_STREETS_VENDORS[7]![0], CITY_STREETS_VENDORS[7]![2]);
  addNewsstand(CITY_STREETS_VENDORS[8]![0], CITY_STREETS_VENDORS[8]![2]);
  addNewsstand(CITY_STREETS_VENDORS[9]![0], CITY_STREETS_VENDORS[9]![2]);

  const addTree = (x: number, z: number) => {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.4, 0.45), flatMat(0x6b4423));
    trunk.position.set(x, 0.7, z);
    group.add(trunk);
    const foliage = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), flatMat(0x3d8b37));
    foliage.position.set(x, 2.35, z);
    group.add(foliage);
  };

  for (const [x, z] of CITY_STREETS_PARK_TREES) {
    addTree(x, z);
  }

  const fenceMat = flatMat(0x5c6370);
  for (const [cx, cz, sx, sz] of CITY_STREETS_FENCE_SEGMENTS) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.08, sz), fenceMat);
    rail.position.set(cx, 1.05, cz);
    group.add(rail);
    const postStep = Math.min(sx, sz) > 2 ? 2.4 : 2;
    const posts =
      sx > sz
        ? Math.max(2, Math.floor(sx / postStep))
        : Math.max(2, Math.floor(sz / postStep));
    for (let i = 0; i < posts; i++) {
      const t = posts === 1 ? 0.5 : i / (posts - 1);
      const px = sx > sz ? cx - sx * 0.5 + sx * t : cx;
      const pz = sx > sz ? cz : cz - sz * 0.5 + sz * t;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.12), fenceMat);
      post.position.set(px, 0.55, pz);
      group.add(post);
    }
  }

  const fountain = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.55, 2.8), flatMat(0x95a5a6));
  fountain.position.set(CITY_STREETS_PARK_FOUNTAIN.x, 0.35, CITY_STREETS_PARK_FOUNTAIN.z);
  group.add(fountain);
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.08, 1.8),
    new THREE.MeshLambertMaterial({ color: 0x5dade2, emissive: 0x3498db, emissiveIntensity: 0.25 }),
  );
  water.position.set(CITY_STREETS_PARK_FOUNTAIN.x, 0.62, CITY_STREETS_PARK_FOUNTAIN.z);
  group.add(water);

  for (const bench of CITY_STREETS_PARK_BENCHES) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 1.2), flatMat(0x6b4f3a));
    seat.position.set(bench.x, 0.55, bench.z);
    group.add(seat);
  }

  const windowMat = flatMat(0xbfd7ea);
  const neonMat = new THREE.MeshLambertMaterial({
    color: theme.accentColor,
    emissive: theme.accentColor,
    emissiveIntensity: 0.35,
  });

  for (const [cx, cz, sx, sy, sz] of CITY_STREETS_BUILDINGS) {
    const faceTowardCenterX = cx > 0 ? -1 : 1;
    const faceTowardCenterZ = cz > 0 ? -1 : 1;
    const useXFace = Math.abs(cx) >= Math.abs(cz);
    const rows = Math.max(3, Math.floor(sy / 2.4));
    for (let row = 0; row < rows; row++) {
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(useXFace ? 0.08 : sx * 0.65, 0.55, useXFace ? sz * 0.65 : 0.08),
        row % 3 === 0 ? windowMat : flatMat(0x596673),
      );
      pane.position.set(
        useXFace ? cx + faceTowardCenterX * (sx * 0.5 + 0.06) : cx,
        1.2 + row * 2.1,
        useXFace ? cz : cz + faceTowardCenterZ * (sz * 0.5 + 0.06),
      );
      group.add(pane);
    }
    if (sy >= 16) {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.35, 0.35, sz * 0.35), neonMat);
      crown.position.set(cx, sy - 0.4, cz);
      group.add(crown);
    }
  }

  const spawnPad = (x: number, z: number, color: number) => {
    addBox(group, new THREE.Vector3(x, 0.02, z), new THREE.Vector3(3.4, 0.04, 3.4), flatMat(color), []);
    addBox(group, new THREE.Vector3(x, 0.06, z), new THREE.Vector3(2.4, 0.02, 2.4), flatMat(0xffffff), []);
  };
  spawnPad(CITY_STREETS_SPAWN_A.x, CITY_STREETS_SPAWN_A.z, 0x3498db);
  spawnPad(CITY_STREETS_SPAWN_B.x, CITY_STREETS_SPAWN_B.z, 0xe74c3c);
}

function addCornMazeDecor(group: THREE.Group, theme: ArenaTheme): void {
  const spawnMarker = (x: number, z: number, color: number) => {
    const pumpkin = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.55, 0.7),
      flatMat(color),
    );
    pumpkin.position.set(x, 0.35, z);
    group.add(pumpkin);
    const stem = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.2, 0.18),
      flatMat(0x3d6b2a),
    );
    stem.position.set(x, 0.72, z);
    group.add(stem);
  };
  spawnMarker(-16.8, -16.8, 0xf39c12);
  spawnMarker(8.4, 16.8, 0xd35400);

  const scarecrow = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), flatMat(0x8b5a2b));
  post.position.y = 1.1;
  scarecrow.add(post);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), flatMat(theme.accentColor));
  head.position.y = 2.35;
  scarecrow.add(head);
  const hat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), flatMat(0x2c2c2c));
  hat.position.y = 2.65;
  scarecrow.add(hat);
  scarecrow.position.set(-8.4, 0, 11.2);
  group.add(scarecrow);

  const tasselMat = flatMat(0xd4c04a);
  for (const [x, z] of [[-5.6, -8.4], [2.8, 0], [11.2, 8.4]] as const) {
    const tassel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), tasselMat);
    tassel.position.set(x, 2.82, z);
    group.add(tassel);
  }
}

function addDuctDecor(group: THREE.Group, theme: ArenaTheme): void {
  const stripeMat = flatMat(theme.accentColor);
  for (const x of [-12, 12] as const) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 36), stripeMat);
    stripe.position.set(x, 0.08, 0);
    group.add(stripe);
  }
  for (const z of [-12, 0, 12] as const) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(22, 0.08, 0.12), stripeMat);
    stripe.position.set(0, 0.08, z);
    group.add(stripe);
  }

  for (const [x, z] of [
    [-12, -14],
    [12, 14],
    [0, 0],
  ] as const) {
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

  const floorTex = createGridTexture(
    theme.floorLight,
    theme.floorDark,
    roundId === "city-streets-01" ? 16 : layout.halfExtent >= 24 ? 12 : 9,
  );
  floorTex.repeat.set(layout.halfExtent / 2, layout.halfExtent / 2);
  const floorMat =
    roundId === "city-streets-01"
      ? flatMat(0x3a4048)
      : flatTexMat(floorTex);
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
    if (solid.category === "prop") {
      propIndex += 1;
    }

    const box =
      solid.decorMesh === false
        ? addColliderBox(allBoxes, pos, size)
        : addBox(
            group,
            pos,
            size,
            materialForSolid(solid, theme, floorMat, wallMat, ceilingMat, propIndex, roundId),
            allBoxes,
          );
    if (solid.category === "floor") {
      floorBox = box;
    } else if (solid.category === "ceiling") {
      ceilingBox = box;
    } else if (solid.category === "wall") {
      wallBoxes.push(box);
      if (roundId === "warehouse-interior-01" || roundId === "freight-depot-01") {
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
    addIndustrialDecor(group, layout, theme, { x: 2, z: -23.4 }, { x: 2, z: 23.4 });
  } else if (roundId === "freight-depot-01") {
    addFreightDepotDecor(group, layout, theme);
  } else if (roundId === "rooftop-01") {
    addRooftopDecor(group, theme);
  } else if (roundId === "duct-network-01") {
    addDuctDecor(group, theme);
  } else if (roundId === "corn-maze-01") {
    addCornMazeDecor(group, theme);
  } else if (roundId === "city-streets-01") {
    addCityStreetsDecor(group, theme);
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
  const fogNear = roundId === "duct-network-01" ? 8 : roundId === "corn-maze-01" ? 30 : roundId === "city-streets-01" ? 42 : 45;
  const fogFar = roundId === "duct-network-01" ? 55 : roundId === "corn-maze-01" ? 80 : roundId === "city-streets-01" ? 118 : 95;

  return {
    group,
    wallColliders: [...wallBoxes, ...interiorWallColliders],
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
