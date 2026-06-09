import {
  add,
  bodyWorldCenter,
  cameraBasis,
  distance,
  dot,
  normalize,
  rotateY,
  sub,
  vec3,
} from "../math/vector.js";
import type { AxisAlignedBox } from "../arena/warehouse-interior.js";
import { hasLineOfSight } from "./occlusion.js";
import type {
  PhotoAttempt,
  PhotoValidationResult,
  PlayerPose,
  RoundRules,
  Vector3,
} from "../types.js";

function isPointInCameraFrustum(
  cameraPosition: PhotoAttempt["cameraPosition"],
  cameraRotation: PhotoAttempt["cameraRotation"],
  fovDeg: number,
  point: Vector3,
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

  const halfVFov = (fovDeg * Math.PI) / 180 / 2;
  const halfHFov = Math.atan(Math.tan(halfVFov) * aspectRatio);

  const localX = dot(dir, right);
  const localY = dot(dir, up);

  const yaw = Math.atan2(localX, forwardDot);
  const pitch = Math.asin(Math.max(-1, Math.min(1, localY)));

  return Math.abs(yaw) <= halfHFov && Math.abs(pitch) <= halfVFov;
}

function bodySamplePoints(pose: PlayerPose): Vector3[] {
  const center = bodyWorldCenter(pose);
  const points: Vector3[] = [center];

  const localSamples = [
    vec3(0, pose.bodyHalfHeight, 0),
    vec3(0, -pose.bodyHalfHeight, 0),
    vec3(pose.bodyRadius, 0, 0),
    vec3(-pose.bodyRadius, 0, 0),
    vec3(0, 0, pose.bodyRadius),
    vec3(0, 0, -pose.bodyRadius),
    vec3(0, pose.bodyHalfHeight * 0.5, 0),
    vec3(0, -pose.bodyHalfHeight * 0.5, 0),
  ];

  for (const local of localSamples) {
    const rotated = rotateY(local, pose.rotation.y);
    points.push(add(center, rotated));
  }

  return points;
}

/** True when any unobstructed body part is inside the camera frustum. */
function isBodyVisible(
  attempt: PhotoAttempt,
  opponent: PlayerPose,
  aspectRatio: number,
  occluders?: AxisAlignedBox[],
): boolean {
  const samples = bodySamplePoints(opponent);
  for (const point of samples) {
    if (
      !isPointInCameraFrustum(
        attempt.cameraPosition,
        attempt.cameraRotation,
        attempt.fovDeg,
        point,
        aspectRatio,
      )
    ) {
      continue;
    }
    if (occluders && !hasLineOfSight(attempt.cameraPosition, point, occluders)) {
      continue;
    }
    return true;
  }
  return false;
}

function isBodyInFrame(
  attempt: PhotoAttempt,
  opponent: PlayerPose,
  aspectRatio: number,
): boolean {
  return isBodyVisible(attempt, opponent, aspectRatio);
}

export interface ValidatePhotoOptions {
  lastAttemptMs?: number;
  skipOcclusion?: boolean;
  aspectRatio?: number;
  occluders?: AxisAlignedBox[];
}

export function validatePhoto(
  attempt: PhotoAttempt,
  opponent: PlayerPose,
  rules: RoundRules,
  options: ValidatePhotoOptions = { skipOcclusion: true },
): PhotoValidationResult {
  const aspectRatio = options.aspectRatio ?? 16 / 9;
  if (rules.requireAimMode && !attempt.aiming) {
    return { valid: false, reason: "not_aiming" };
  }

  if (
    options.lastAttemptMs !== undefined &&
    attempt.timestampMs - options.lastAttemptMs < rules.photoCooldownSec * 1000
  ) {
    return { valid: false, reason: "cooldown" };
  }

  const bodyCenter = bodyWorldCenter(opponent);
  const dist = distance(attempt.cameraPosition, bodyCenter);

  if (dist < rules.minPhotoDistance) {
    return { valid: false, reason: "too_close" };
  }

  if (dist > rules.maxPhotoDistance) {
    return { valid: false, reason: "too_far" };
  }

  const requireBody =
    rules.requireBodyInFrame ?? rules.requireFaceInFrame ?? true;

  if (requireBody && !isBodyInFrame(attempt, opponent, aspectRatio)) {
    return { valid: false, reason: "body_out_of_frame" };
  }

  if (!options.skipOcclusion && options.occluders && options.occluders.length > 0) {
    if (!isBodyVisible(attempt, opponent, aspectRatio, options.occluders)) {
      return { valid: false, reason: "body_occluded" };
    }
  }

  return { valid: true };
}

export const DEFAULT_BODY_OFFSET = vec3(0, 0.9, 0);
export const DEFAULT_BODY_RADIUS = 0.4;
export const DEFAULT_BODY_HALF_HEIGHT = 0.5;

/** @deprecated Use DEFAULT_BODY_OFFSET */
export const DEFAULT_FACE_OFFSET = DEFAULT_BODY_OFFSET;
/** @deprecated Use DEFAULT_BODY_RADIUS */
export const DEFAULT_FACE_RADIUS = DEFAULT_BODY_RADIUS;
