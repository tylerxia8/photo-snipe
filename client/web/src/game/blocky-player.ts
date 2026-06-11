import * as THREE from "three";

export interface MinecraftPlayerRig {
  root: THREE.Group;
  setPose: (options: { walkPhase: number; airborne: boolean }) => void;
}

/** Minecraft-style Steve proportions. Origin at feet, total height ~1.8. */
export function createBlockyPlayer(shirtColor: number, pantsColor: number): MinecraftPlayerRig {
  const root = new THREE.Group();
  root.scale.setScalar(0.9);

  const skin = flatMat(0xc6946a);
  const hair = flatMat(0x3b2a1a);
  const shirt = flatMat(shirtColor);
  const pants = flatMat(pantsColor);

  const body = box(0.5, 0.75, 0.25, shirt);
  body.position.y = 1.125;
  root.add(body);

  const head = box(0.5, 0.5, 0.5, skin);
  head.position.y = 1.75;
  root.add(head);

  const hairCap = box(0.52, 0.18, 0.52, hair);
  hairCap.position.y = 1.96;
  root.add(hairCap);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.125, 0.75, 0);
  const leftLeg = box(0.25, 0.75, 0.25, pants);
  leftLeg.position.y = -0.375;
  leftLegPivot.add(leftLeg);
  root.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.125, 0.75, 0);
  const rightLeg = box(0.25, 0.75, 0.25, pants);
  rightLeg.position.y = -0.375;
  rightLegPivot.add(rightLeg);
  root.add(rightLegPivot);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.375, 1.375, 0);
  const leftArm = box(0.25, 0.75, 0.25, shirt);
  leftArm.position.y = -0.375;
  leftArmPivot.add(leftArm);
  root.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.375, 1.375, 0);
  const rightArm = box(0.25, 0.75, 0.25, shirt);
  rightArm.position.y = -0.375;
  rightArmPivot.add(rightArm);
  root.add(rightArmPivot);

  const limbSwing = 0.95;

  function setPose({ walkPhase, airborne }: { walkPhase: number; airborne: boolean }): void {
    if (airborne) {
      leftLegPivot.rotation.x = -0.45;
      rightLegPivot.rotation.x = 0.35;
      leftArmPivot.rotation.x = -2.75;
      rightArmPivot.rotation.x = -2.55;
      leftArmPivot.rotation.z = -0.08;
      rightArmPivot.rotation.z = 0.08;
      return;
    }

    const swing = Math.sin(walkPhase) * limbSwing;
    leftLegPivot.rotation.x = swing;
    rightLegPivot.rotation.x = -swing;
    leftArmPivot.rotation.x = -swing;
    rightArmPivot.rotation.x = swing;
    leftArmPivot.rotation.z = 0;
    rightArmPivot.rotation.z = 0;
  }

  setPose({ walkPhase: 0, airborne: false });

  return { root, setPose };
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
