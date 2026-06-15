import {
  DEFAULT_BODY_HALF_HEIGHT,
  DEFAULT_BODY_OFFSET,
  DEFAULT_BODY_RADIUS,
  fromArray,
  validatePhoto,
  type PhotoAttempt,
  type PlayerPose,
  type RoundRules,
} from "@photo-snipe/core";
import {
  getHighestSurfaceBelow,
  supportsFeetAt,
  type StandSurface,
} from "../game/arena.js";
import { movePlayer, type FeetPos, type WorldColliders } from "../game/player-movement.js";

const WALK_SPEED = 2.6;
const JUMP_VELOCITY = 7;
const GRAVITY = 18;
const EYE_OFFSET = 0.6;
const STAND_SKIN = 0.02;
const FOV_DEG = 75;
const ASPECT_RATIO = 16 / 9;

export interface LiveState {
  position: [number, number, number];
  rotation: [number, number, number];
  aiming: boolean;
  lastPhotoAttemptMs?: number;
}

export interface BotPhysicsWorld {
  colliders: WorldColliders;
  standSurfaces: StandSurface[];
  defaultFeetY: number;
  arenaHalfExtent: number;
}

function poseFromState(state: LiveState): PlayerPose {
  return {
    position: fromArray(state.position),
    rotation: { x: 0, y: state.rotation[1], z: 0 },
    aiming: state.aiming,
    bodyOffset: DEFAULT_BODY_OFFSET,
    bodyRadius: DEFAULT_BODY_RADIUS,
    bodyHalfHeight: DEFAULT_BODY_HALF_HEIGHT,
  };
}

export class PracticeBot {
  private feet: FeetPos = { x: 0, y: 1, z: 0 };
  private yawDeg = 180;
  private verticalVelocity = 0;
  private onFloor = true;
  private standingFeetY = 1;
  private strafeUntilMs = 0;
  private strafeDirection = 1;
  private lastPhotoAttemptMs = 0;

  init(spawn: { position: number[]; rotation: number[] }): void {
    this.feet = {
      x: spawn.position[0],
      y: spawn.position[1],
      z: spawn.position[2],
    };
    this.yawDeg = spawn.rotation[1];
    this.standingFeetY = spawn.position[1] + STAND_SKIN;
    this.verticalVelocity = 0;
    this.onFloor = true;
    this.strafeUntilMs = 0;
    this.lastPhotoAttemptMs = 0;
  }

  getState(): LiveState {
    return {
      position: [this.feet.x, this.feet.y, this.feet.z],
      rotation: [0, this.yawDeg, 0],
      aiming: false,
      lastPhotoAttemptMs: this.lastPhotoAttemptMs,
    };
  }

  onHumanExposure(nowMs: number): void {
    this.strafeUntilMs = nowMs + 1200 + Math.random() * 800;
    this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
  }

  tick(
    delta: number,
    human: LiveState,
    world: BotPhysicsWorld,
  ): void {
    const nowMs = performance.now();
    const dxHuman = human.position[0] - this.feet.x;
    const dzHuman = human.position[2] - this.feet.z;
    const dist = Math.hypot(dxHuman, dzHuman);

    if (dist > 0.05) {
      this.yawDeg = (Math.atan2(dxHuman, dzHuman) * 180) / Math.PI;
    }

    const yawRad = (this.yawDeg * Math.PI) / 180;
    const forwardX = Math.sin(yawRad);
    const forwardZ = Math.cos(yawRad);
    const rightX = Math.cos(yawRad);
    const rightZ = -Math.sin(yawRad);

    let moveX = 0;
    let moveZ = 0;
    const speed = WALK_SPEED * delta;

    if (nowMs < this.strafeUntilMs) {
      moveX += rightX * this.strafeDirection * speed;
      moveZ += rightZ * this.strafeDirection * speed;
    } else if (dist > 8) {
      moveX += forwardX * speed;
      moveZ += forwardZ * speed;
    } else if (dist > 3.5) {
      moveX += forwardX * speed * 0.55;
      moveZ += forwardZ * speed * 0.55;
      moveX += rightX * this.strafeDirection * speed * 0.35;
      moveZ += rightZ * this.strafeDirection * speed * 0.35;
    } else if (dist < 2.2) {
      moveX -= forwardX * speed * 0.75;
      moveZ -= forwardZ * speed * 0.75;
    } else {
      moveX += rightX * this.strafeDirection * speed * 0.45;
      moveZ += rightZ * this.strafeDirection * speed * 0.45;
    }

    let dy = 0;
    if (!this.onFloor) {
      this.verticalVelocity -= GRAVITY * delta;
      dy = this.verticalVelocity * delta;
    }

    const moved = movePlayer(
      this.feet,
      { x: moveX, y: dy, z: moveZ },
      world.colliders,
    );
    this.feet = moved;

    if (moved.hitCeiling) {
      this.verticalVelocity = 0;
    }

    if (moved.onGround) {
      this.onFloor = true;
      this.verticalVelocity = 0;
      this.standingFeetY = this.feet.y;
    } else if (this.onFloor) {
      const supported = supportsFeetAt(
        this.feet.x,
        this.feet.z,
        world.standSurfaces,
        world.defaultFeetY,
        this.standingFeetY,
        world.arenaHalfExtent,
      );
      if (supported) {
        this.standingFeetY = getHighestSurfaceBelow(
          this.feet.x,
          this.feet.z,
          world.standSurfaces,
          world.defaultFeetY,
          this.standingFeetY + 0.1,
        );
        this.feet.y = this.standingFeetY;
      } else {
        this.onFloor = false;
        this.verticalVelocity = -1;
      }
    }
  }

  tryShoot(
    human: LiveState,
    rules: RoundRules,
    occluders: ReturnType<typeof import("@photo-snipe/core").getOccludersForRound>,
  ): PhotoAttempt | null {
    const nowMs = performance.now();
    if (nowMs - this.lastPhotoAttemptMs < rules.photoCooldownSec * 1000) {
      return null;
    }

    const cameraPosition = fromArray([
      this.feet.x,
      this.feet.y + EYE_OFFSET,
      this.feet.z,
    ]);
    const cameraRotation = { x: 0, y: this.yawDeg, z: 0 };
    const attempt: PhotoAttempt = {
      playerId: "B",
      timestampMs: nowMs,
      cameraPosition,
      cameraRotation,
      fovDeg: FOV_DEG,
      aiming: false,
    };

    const result = validatePhoto(attempt, poseFromState(human), rules, {
      lastAttemptMs: this.lastPhotoAttemptMs,
      skipOcclusion: false,
      aspectRatio: ASPECT_RATIO,
      occluders,
    });

    if (!result.valid) {
      return null;
    }

    this.lastPhotoAttemptMs = nowMs;
    return attempt;
  }
}
