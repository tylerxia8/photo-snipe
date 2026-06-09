import {
  add,
  cameraBasis,
  distance,
  dot,
  faceWorldCenter,
  normalize,
  sub,
  vec3,
} from "../math/vector.js";
import type {
  PhotoAttempt,
  PhotoValidationResult,
  PlayerPose,
  RoundRules,
  Vector3,
} from "../types.js";

const FACE_SAMPLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function isPointInCameraFrustum(
  cameraPosition: PhotoAttempt["cameraPosition"],
  cameraRotation: PhotoAttempt["cameraRotation"],
  fovDeg: number,
  point: { x: number; y: number; z: number },
  aspectRatio = 16 / 9,
): boolean {
  const { forward, right, up } = cameraBasis(cameraRotation);
  const toPoint = sub(point, cameraPosition);
  const dist = Math.sqrt(dot(toPoint, toPoint));
  if (dist <= 0.001) {
    return true;
  }

  const dir = normalize(toPoint);
  const forwardDot = dot(dir, forward);
  if (forwardDot <= 0) {
    return false;
  }

  const halfVFov = ((fovDeg / aspectRatio) * Math.PI) / 180 / 2;
  const halfHFov = (fovDeg * Math.PI) / 180 / 2;

  const localX = dot(dir, right);
  const localY = dot(dir, up);

  const yaw = Math.atan2(localX, forwardDot);
  const pitch = Math.asin(Math.max(-1, Math.min(1, localY)));

  return Math.abs(yaw) <= halfHFov && Math.abs(pitch) <= halfVFov;
}

function faceSamplePoints(pose: PlayerPose): Vector3[] {
  const center = faceWorldCenter(pose);
  const points: Vector3[] = [center];

  for (const angleDeg of FACE_SAMPLE_ANGLES) {
    const rad = (angleDeg * Math.PI) / 180;
    points.push(
      add(
        center,
        vec3(
          Math.cos(rad) * pose.faceRadius,
          0,
          Math.sin(rad) * pose.faceRadius,
        ),
      ),
    );
  }

  points.push(add(center, vec3(0, pose.faceRadius, 0)));
  points.push(add(center, vec3(0, -pose.faceRadius * 0.5, 0)));
  return points;
}

function isFaceInFrame(
  attempt: PhotoAttempt,
  opponent: PlayerPose,
): boolean {
  const samples = faceSamplePoints(opponent);
  return samples.every((point) =>
    isPointInCameraFrustum(
      attempt.cameraPosition,
      attempt.cameraRotation,
      attempt.fovDeg,
      point,
    ),
  );
}

export interface ValidatePhotoOptions {
  lastAttemptMs?: number;
  skipOcclusion?: boolean;
}

export function validatePhoto(
  attempt: PhotoAttempt,
  opponent: PlayerPose,
  rules: RoundRules,
  options: ValidatePhotoOptions = { skipOcclusion: true },
): PhotoValidationResult {
  if (rules.requireAimMode && !attempt.aiming) {
    return { valid: false, reason: "not_aiming" };
  }

  if (
    options.lastAttemptMs !== undefined &&
    attempt.timestampMs - options.lastAttemptMs < rules.photoCooldownSec * 1000
  ) {
    return { valid: false, reason: "cooldown" };
  }

  const faceCenter = faceWorldCenter(opponent);
  const dist = distance(attempt.cameraPosition, faceCenter);

  if (dist < rules.minPhotoDistance) {
    return { valid: false, reason: "too_close" };
  }

  if (dist > rules.maxPhotoDistance) {
    return { valid: false, reason: "too_far" };
  }

  if (rules.requireFaceInFrame && !isFaceInFrame(attempt, opponent)) {
    return { valid: false, reason: "face_out_of_frame" };
  }

  // Occlusion requires building geometry on the server (post-MVP).
  if (!options.skipOcclusion) {
    return { valid: false, reason: "face_occluded" };
  }

  return { valid: true };
}

export const DEFAULT_FACE_OFFSET = vec3(0, 1.6, 0);
export const DEFAULT_FACE_RADIUS = 0.15;
