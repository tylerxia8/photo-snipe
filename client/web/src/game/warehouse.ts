import * as THREE from "three";

const WALL_HEIGHT = 5;
const WALL_THICKNESS = 0.4;

function mat(color: number, roughness = 0.85): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function addBox(
  parent: THREE.Object3D,
  pos: THREE.Vector3,
  size: THREE.Vector3,
  material: THREE.Material,
  colliders: THREE.Box3[],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.copy(pos);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);

  colliders.push(new THREE.Box3().setFromCenterAndSize(pos, size));
  return mesh;
}

function addMarker(
  parent: THREE.Object3D,
  pos: THREE.Vector3,
  color: number,
): void {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.08, 24),
    mat(color, 0.5),
  );
  mesh.position.set(pos.x, 0.04, pos.z);
  parent.add(mesh);
}

export function buildWarehouse(scene: THREE.Scene): THREE.Box3[] {
  const group = new THREE.Group();
  group.name = "warehouse";
  scene.add(group);

  const colliders: THREE.Box3[] = [];
  const floorMat = mat(0x525456);
  const wallMat = mat(0x737882);
  const ceilingMat = mat(0x3a3d42);
  const crateMat = mat(0x856137);
  const shelfMat = mat(0x474d56);
  const metalMat = mat(0x8c9094, 0.4);

  addBox(group, new THREE.Vector3(0, -0.1, 0), new THREE.Vector3(48, 0.2, 48), floorMat, colliders);
  addBox(group, new THREE.Vector3(0, WALL_HEIGHT + 0.05, 0), new THREE.Vector3(48, 0.1, 48), ceilingMat, colliders);

  addBox(group, new THREE.Vector3(0, WALL_HEIGHT * 0.5, -24), new THREE.Vector3(48, WALL_HEIGHT, WALL_THICKNESS), wallMat, colliders);
  addBox(group, new THREE.Vector3(0, WALL_HEIGHT * 0.5, 24), new THREE.Vector3(48, WALL_HEIGHT, WALL_THICKNESS), wallMat, colliders);
  addBox(group, new THREE.Vector3(24, WALL_HEIGHT * 0.5, 0), new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, 48), wallMat, colliders);
  addBox(group, new THREE.Vector3(-24, WALL_HEIGHT * 0.5, 0), new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, 48), wallMat, colliders);

  for (const [x, z] of [
    [-12, -14], [12, -14], [-12, 0], [12, 0], [-12, 14], [12, 14],
  ] as const) {
    addBox(group, new THREE.Vector3(x, 2.5, z), new THREE.Vector3(16, 5, WALL_THICKNESS), wallMat, colliders);
  }

  for (const z of [-18, -8, 8, 18]) {
    addBox(group, new THREE.Vector3(16, 1.25, z), new THREE.Vector3(4, 2.5, 6), shelfMat, colliders);
    addBox(group, new THREE.Vector3(-16, 1.25, z), new THREE.Vector3(4, 2.5, 6), shelfMat, colliders);
  }

  for (const [x, z] of [[8, -6], [-8, 6], [8, 6], [-8, -6]] as const) {
    addBox(group, new THREE.Vector3(x, 3, z), new THREE.Vector3(0.8, 6, 0.8), metalMat, colliders);
  }

  addBox(group, new THREE.Vector3(0, 1, 0), new THREE.Vector3(7, 2, 5), crateMat, colliders);
  addBox(group, new THREE.Vector3(0, 2.6, 0), new THREE.Vector3(5, 2, 3.5), crateMat, colliders);

  const crates: Array<[number, number, number, number, number, number]> = [
    [6, 0.75, -20, 2, 1.5, 2], [-5, 0.75, -18, 1.5, 1.2, 1.5],
    [10, 0.75, -6, 2, 1.5, 2], [-10, 0.75, -4, 1.5, 1.2, 1.5],
    [5, 0.75, 8, 2, 1.5, 2], [-6, 0.75, 12, 1.5, 1.2, 1.5],
    [8, 0.75, 20, 2, 1.5, 2], [-7, 0.75, 18, 1.5, 1.2, 1.5],
    [3, 0.75, -2, 2, 1.5, 2], [-4, 0.75, 3, 1.5, 1.2, 1.5],
  ];
  for (const [x, y, z, sx, sy, sz] of crates) {
    addBox(group, new THREE.Vector3(x, y, z), new THREE.Vector3(sx, sy, sz), crateMat, colliders);
  }

  addMarker(group, new THREE.Vector3(2, 0, -24), 0x3399ee);
  addMarker(group, new THREE.Vector3(2, 0, 24), 0xe85c3c);

  return colliders;
}

export function resolveCollision(
  pos: THREE.Vector3,
  colliders: THREE.Box3[],
  radius = 0.35,
  height = 1.8,
): THREE.Vector3 {
  const next = pos.clone();
  const playerBox = new THREE.Box3(
    new THREE.Vector3(next.x - radius, next.y - height * 0.5, next.z - radius),
    new THREE.Vector3(next.x + radius, next.y + height * 0.5, next.z + radius),
  );

  for (const wall of colliders) {
    if (playerBox.intersectsBox(wall)) {
      const dx = Math.min(wall.max.x - playerBox.min.x, playerBox.max.x - wall.min.x);
      const dz = Math.min(wall.max.z - playerBox.min.z, playerBox.max.z - wall.min.z);
      if (dx < dz) {
        next.x += dx === wall.max.x - playerBox.min.x ? dx : -dx;
      } else {
        next.z += dz === wall.max.z - playerBox.min.z ? dz : -dz;
      }
      playerBox.setFromCenterAndSize(next, new THREE.Vector3(radius * 2, height, radius * 2));
    }
  }

  next.y = pos.y;
  return next;
}
