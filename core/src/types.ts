export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface EulerDegrees {
  x: number;
  y: number;
  z: number;
}

export type PlayerSlot = "A" | "B";

export type PhotoInvalidReason =
  | "face_out_of_frame"
  | "too_far"
  | "too_close"
  | "face_occluded"
  | "cooldown"
  | "not_aiming";

export interface PhotoValidationResult {
  valid: boolean;
  reason?: PhotoInvalidReason;
}

export interface PhotoAttempt {
  playerId: string;
  timestampMs: number;
  cameraPosition: Vector3;
  cameraRotation: EulerDegrees;
  fovDeg: number;
  aiming: boolean;
}

export interface PlayerPose {
  position: Vector3;
  rotation: EulerDegrees;
  aiming: boolean;
  faceOffset: Vector3;
  faceRadius: number;
}

export interface RoundExposureRules {
  flash: boolean;
  sound: boolean;
  soundAudibleRadius: number;
  flashVisibleRadius: number;
  flashDurationSec: number;
}

export interface RoundRules {
  roundTimeLimitSec: number;
  photoCooldownSec: number;
  maxPhotoDistance: number;
  minPhotoDistance: number;
  requireAimMode: boolean;
  requireFaceInFrame: boolean;
  exposure: RoundExposureRules;
}

export interface SpawnConfig {
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface RoundDefinition {
  id: string;
  name: string;
  building: {
    id: string;
    scene: string;
  };
  spawns: {
    playerA: SpawnConfig;
    playerB: SpawnConfig;
  };
  rules: RoundRules;
}

export interface MatchConfig {
  id: string;
  name: string;
  roundPool: string[];
  roundsToWin: number;
  overtimeEnabled?: boolean;
}

export type MatchPhase = "lobby" | "round_active" | "round_end" | "match_end";

export interface RoundScore {
  A: number;
  B: number;
}
