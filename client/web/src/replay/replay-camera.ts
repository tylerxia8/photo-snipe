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
  const right = new THREE.Vector3().crossVectors(
    forward,
    new THREE.Vector3(0, 1, 0),
  );
  if (right.lengthSq() < 0.0001) {
    right.set(1, 0, 0);
  } else {
    right.normalize();
  }

  const shoulder = feet
    .clone()
    .add(new THREE.Vector3(0, 1.5, 0))
    .add(forward.clone().multiplyScalar(-3.6))
    .add(right.clone().multiplyScalar(1.05));

  camera.position.copy(shoulder);

  const aimPoint = shoulder
    .clone()
    .add(forward.clone().multiplyScalar(14));
  const opponentTarget = new THREE.Vector3(
    opponentFeet[0],
    opponentFeet[1] + 1.05,
    opponentFeet[2],
  );
  aimPoint.lerp(opponentTarget, 0.7);
  camera.lookAt(aimPoint);
}

export function applyReplayCamera(
  camera: THREE.PerspectiveCamera,
  frame: {
    cam: [number, number, number];
    camRot: [number, number, number];
    win: [number, number, number];
    winRot: [number, number, number];
    opp: [number, number, number];
  },
  options: {
    elapsedMs: number;
    snapAtMs: number;
    snapBlendMs?: number;
  },
): void {
  const snapBlendMs = options.snapBlendMs ?? 350;
  const blendStartMs = Math.max(0, options.snapAtMs - snapBlendMs);

  if (options.elapsedMs >= blendStartMs) {
    const alpha =
      options.snapAtMs <= blendStartMs
        ? 1
        : THREE.MathUtils.clamp(
            (options.elapsedMs - blendStartMs) / (options.snapAtMs - blendStartMs),
            0,
            1,
          );

    if (alpha >= 1 || options.elapsedMs >= options.snapAtMs) {
      applyFirstPersonReplayCamera(camera, frame.cam, frame.camRot);
      return;
    }

    const thirdPerson = new THREE.PerspectiveCamera();
    applyThirdPersonWinnerReplayCamera(
      thirdPerson,
      frame.win,
      frame.winRot,
      frame.opp,
    );
    const firstPerson = new THREE.PerspectiveCamera();
    applyFirstPersonReplayCamera(firstPerson, frame.cam, frame.camRot);

    camera.position.lerpVectors(thirdPerson.position, firstPerson.position, alpha);

    const lookTarget = new THREE.Vector3();
    const thirdLook = thirdPerson.position.clone().add(
      forwardFromCameraRotationDeg(frame.winRot[0], frame.winRot[1]).multiplyScalar(10),
    );
    const firstLook = firstPerson.position.clone().add(
      forwardFromCameraRotationDeg(frame.camRot[0], frame.camRot[1]),
    );
    lookTarget.lerpVectors(thirdLook, firstLook, alpha);
    camera.lookAt(lookTarget);
    return;
  }

  applyThirdPersonWinnerReplayCamera(camera, frame.win, frame.winRot, frame.opp);
}
