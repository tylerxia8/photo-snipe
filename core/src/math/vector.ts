import type { EulerDegrees, Vector3 } from "../types.js";

export function vec3(x: number, y: number, z: number): Vector3 {
  return { x, y, z };
}

export function add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function length(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function distance(a: Vector3, b: Vector3): number {
  return length(sub(a, b));
}

export function normalize(v: Vector3): Vector3 {
  const len = length(v);
  if (len === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return scale(v, 1 / len);
}

export function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function fromArray([x, y, z]: [number, number, number]): Vector3 {
  return { x, y, z };
}

/** Y-forward rotation used by Godot FPS (Y axis is up). */
export function rotateY(v: Vector3, degreesY: number): Vector3 {
  const rad = (degreesY * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos + v.z * sin,
    y: v.y,
    z: -v.x * sin + v.z * cos,
  };
}

export function bodyWorldCenter(pose: {
  position: Vector3;
  rotation: EulerDegrees;
  bodyOffset: Vector3;
}): Vector3 {
  const offset = rotateY(pose.bodyOffset, pose.rotation.y);
  return add(pose.position, offset);
}

/** @deprecated Use bodyWorldCenter */
export function faceWorldCenter(pose: {
  position: Vector3;
  rotation: EulerDegrees;
  faceOffset: Vector3;
}): Vector3 {
  return bodyWorldCenter({
    position: pose.position,
    rotation: pose.rotation,
    bodyOffset: pose.faceOffset,
  });
}

export function cameraBasis(rotation: EulerDegrees): {
  forward: Vector3;
  right: Vector3;
  up: Vector3;
} {
  const yaw = (rotation.y * Math.PI) / 180;
  const pitch = (rotation.x * Math.PI) / 180;

  const forward = normalize({
    x: Math.sin(yaw) * Math.cos(pitch),
    y: -Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch),
  });

  const worldUp = vec3(0, 1, 0);
  const right = normalize({
    x: forward.z,
    y: 0,
    z: -forward.x,
  });

  const up = normalize({
    x: right.y * forward.z - right.z * forward.y,
    y: right.z * forward.x - right.x * forward.z,
    z: right.x * forward.y - right.y * forward.x,
  });

  // Re-orthogonalize up against world up for stability
  void worldUp;
  return { forward, right, up };
}
