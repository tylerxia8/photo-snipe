import * as THREE from "three";

/** Inverse of Game.getCameraRotationDeg — matches live client aim math. */
export function forwardFromCameraRotationDeg(
  pitchDeg: number,
  yawDeg: number,
): THREE.Vector3 {
  const pitch = THREE.MathUtils.degToRad(pitchDeg);
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const cosPitch = Math.cos(pitch);
  return new THREE.Vector3(
    Math.sin(yaw) * cosPitch,
    -Math.sin(pitch),
    Math.cos(yaw) * cosPitch,
  ).normalize();
}

export function applyFirstPersonReplayCamera(
  camera: THREE.PerspectiveCamera,
  position: [number, number, number],
  rotationDeg: [number, number, number],
): void {
  camera.position.set(position[0], position[1], position[2]);
  const target = camera.position.clone().add(
    forwardFromCameraRotationDeg(rotationDeg[0], rotationDeg[1]),
  );
  camera.lookAt(target);
}

export function applyThirdPersonWinnerReplayCamera(
  camera: THREE.PerspectiveCamera,
  winnerFeet: [number, number, number],
  winnerRotDeg: [number, number, number],
  opponentFeet: [number, number, number],
): void {
  const feet = new THREE.Vector3(winnerFeet[0], winnerFeet[1], winnerFeet[2]);
  const forward = forwardFromCameraRotationDeg(winnerRotDeg[0], winnerRotDeg[1]);
  const flatForward = new THREE.Vector3(forward.x, 0, forward.z);
  if (flatForward.lengthSq() < 0.0001) {
    flatForward.set(0, 0, 1);
  } else {
    flatForward.normalize();
  }
  const flatRight = new THREE.Vector3().crossVectors(
    flatForward,
    new THREE.Vector3(0, 1, 0),
  ).normalize();

  const cameraPos = feet
    .clone()
    .add(flatForward.clone().multiplyScalar(-5))
    .add(new THREE.Vector3(0, 2.4, 0))
    .add(flatRight.clone().multiplyScalar(1.4));

  camera.position.copy(cameraPos);
  camera.lookAt(opponentFeet[0], opponentFeet[1] + 0.95, opponentFeet[2]);
}
