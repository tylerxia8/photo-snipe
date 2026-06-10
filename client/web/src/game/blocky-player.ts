import * as THREE from "three";

/** Krunker / Pixel Gun-style blocky humanoid. Origin at feet. */
export function createBlockyPlayer(primaryColor: number, accentColor: number): THREE.Group {
  const group = new THREE.Group();
  const skin = flatMat(0xffcc99);
  const primary = flatMat(primaryColor);
  const accent = flatMat(accentColor);
  const dark = flatMat(0x2a2a2a);

  const head = box(0.55, 0.55, 0.55, skin);
  head.position.y = 1.55;
  group.add(head);

  const torso = box(0.72, 0.78, 0.38, primary);
  torso.position.y = 0.98;
  group.add(torso);

  const belt = box(0.74, 0.12, 0.4, accent);
  belt.position.y = 0.62;
  group.add(belt);

  for (const side of [-1, 1]) {
    const leg = box(0.26, 0.62, 0.28, dark);
    leg.position.set(0.17 * side, 0.31, 0);
    group.add(leg);

    const boot = box(0.28, 0.14, 0.32, accent);
    boot.position.set(0.17 * side, 0.07, 0.02);
    group.add(boot);

    const arm = box(0.22, 0.58, 0.22, primary);
    arm.position.set(0.48 * side, 1.02, 0);
    group.add(arm);

    const hand = box(0.18, 0.18, 0.18, skin);
    hand.position.set(0.48 * side, 0.68, 0);
    group.add(hand);
  }

  const visor = box(0.56, 0.18, 0.08, accent);
  visor.position.set(0, 1.58, 0.24);
  group.add(visor);

  return group;
}

function flatMat(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

function box(x: number, y: number, z: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
