import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import type { MatchTransport } from "./match-transport.js";
import {
  buildArena,
  getHighestSurfaceBelow,
  supportsFeetAt,
  type StandSurface,
} from "./arena.js";
import { movePlayer, type FeetPos, type WorldColliders } from "./player-movement.js";
import { createBlockyPlayer, type MinecraftPlayerRig } from "./blocky-player.js";
import { getSkin, sanitizeSkinId, type MatchReplay, type ReplayFrame } from "@photo-snipe/core";
import { getControlsHint, getKeybinds, mouseButtonToCode, onKeybindsChange } from "../settings/keybinds.js";
import { applyThirdPersonWinnerReplayCamera } from "../replay/replay-camera.js";

const WALK_SPEED = 3;
const JUMP_VELOCITY = 8;
const GRAVITY = 18;
const EYE_OFFSET = 0.6;
const STAND_SKIN = 0.02;
const PHOTO_COOLDOWN_MS = 2000;

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200);
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  readonly opponent = new THREE.Group();
  readonly replayWinner = new THREE.Group();

  private controls: PointerLockControls | null = null;
  private worldColliders: WorldColliders | null = null;
  private standSurfaces: StandSurface[] = [];
  private defaultFeetY = 1;
  private standingFeetY = 1;
  private keys = new Set<string>();
  private mouseButtons = new Set<string>();
  private sequence = 0;
  private stateTimer = 0;
  private active = false;
  private yaw = 0;
  private pitch = 0;
  private verticalVelocity = 0;
  private onFloor = true;
  private jumpQueued = false;
  private groundEyeY = 1.6;
  private lastPhotoAttemptMs = 0;
  private photoCooldownReady = true;
  private opponentRig: MinecraftPlayerRig;
  private replayWinnerRig: MinecraftPlayerRig;
  private opponentPrevPos = new THREE.Vector3();
  private opponentTargetPos = new THREE.Vector3();
  private opponentTargetYaw = 0;
  private opponentWalkPhase = 0;
  private opponentLastGroundY = 1;
  private arenaGroup: THREE.Group | null = null;
  private arenaHalfExtent = 24;
  private currentRoundId = "warehouse-interior-01";
  private replayMode = false;

  constructor(
    private transport: MatchTransport,
    private hud: {
      setMessage: (text: string) => void;
      setRoundName: (text: string) => void;
      flash: () => void;
      setPhotoCooldown: (remainingFraction: number) => void;
      setPhotoReady: () => void;
      showCrosshair: () => void;
      hideCrosshair: () => void;
    },
    mount: HTMLElement,
  ) {
    this.scene.background = new THREE.Color(0x7eb8da);
    this.scene.fog = new THREE.Fog(0x9ec9e0, 45, 95);

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.05);
    sun.position.set(12, 24, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb3d9ff, 0.35);
    fill.position.set(-10, 14, -12);
    this.scene.add(fill);

    const defaultSkin = getSkin("teal");
    this.opponentRig = createBlockyPlayer(defaultSkin.shirtColor, defaultSkin.pantsColor);
    this.opponent.add(this.opponentRig.root);
    this.scene.add(this.opponent);

    this.replayWinnerRig = createBlockyPlayer(defaultSkin.shirtColor, defaultSkin.pantsColor);
    this.replayWinner.add(this.replayWinnerRig.root);
    this.replayWinner.visible = false;
    this.scene.add(this.replayWinner);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getObject());

    this.loadArena("warehouse-interior-01");

    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
    window.addEventListener("mousedown", (e) => this.onMouseDown(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    window.addEventListener("blur", () => this.clearInputState());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clearInputState();
    });
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement !== this.renderer.domElement) {
        this.clearInputState();
      }
    });
    document.addEventListener("click", () => {
      if (this.active && !this.controls?.isLocked) {
        this.requestLock();
      }
    });
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    onKeybindsChange(() => this.clearInputState());
  }

  isActive(): boolean {
    return this.active;
  }

  getHumanLiveState(): {
    position: [number, number, number];
    rotation: [number, number, number];
    aiming: boolean;
  } {
    const obj = this.controls?.getObject();
    if (!obj || !this.active) {
      return {
        position: [0, this.defaultFeetY, 0],
        rotation: [0, 0, 0],
        aiming: false,
      };
    }

    return {
      position: [obj.position.x, obj.position.y - EYE_OFFSET, obj.position.z],
      rotation: this.getCameraRotationDeg(),
      aiming: false,
    };
  }

  getPhysicsWorld(): {
    colliders: WorldColliders;
    standSurfaces: StandSurface[];
    defaultFeetY: number;
    arenaHalfExtent: number;
  } | null {
    if (!this.worldColliders) {
      return null;
    }

    return {
      colliders: this.worldColliders,
      standSurfaces: this.standSurfaces,
      defaultFeetY: this.defaultFeetY,
      arenaHalfExtent: this.arenaHalfExtent,
    };
  }

  setOpponentSkin(skinId: unknown): void {
    const skin = getSkin(sanitizeSkinId(skinId));
    this.opponentRig.setColors(skin.shirtColor, skin.pantsColor);
  }

  loadArena(roundId: string): void {
    if (this.arenaGroup) {
      this.scene.remove(this.arenaGroup);
      this.arenaGroup.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of materials) {
            material.dispose();
          }
        }
      });
      this.arenaGroup = null;
    }

    const arena = buildArena(this.scene, roundId);
    this.arenaGroup = arena.group;
    this.currentRoundId = roundId;
    this.arenaHalfExtent = Math.max(
      Math.abs(arena.worldBounds.minX),
      Math.abs(arena.worldBounds.maxX),
    );
    this.worldColliders = {
      walls: arena.wallColliders,
      props: arena.propColliders,
      surfaces: arena.standColliders,
      ceiling: arena.ceilingCollider,
      bounds: arena.worldBounds,
    };
    this.standSurfaces = arena.standSurfaces;
    this.defaultFeetY = arena.defaultFeetY;
    this.scene.background = new THREE.Color(arena.skyColor);
    this.scene.fog = new THREE.Fog(arena.fogColor, arena.fogNear, arena.fogFar);
  }

  startRound(
    roundId: string,
    spawn: { position: number[]; rotation: number[] },
    opponentSpawn: { position: number[]; rotation: number[] },
    roundName: string,
  ): void {
    if (roundId !== this.currentRoundId) {
      this.loadArena(roundId);
    }
    this.active = true;
    this.replayWinner.visible = false;
    this.hud.setRoundName(roundName);
    this.hud.setMessage(getControlsHint());

    const [x, y, z] = spawn.position;
    const [, rotY] = spawn.rotation;
    this.yaw = THREE.MathUtils.degToRad(rotY);
    this.pitch = 0;
    this.defaultFeetY = y;
    this.standingFeetY = y + STAND_SKIN;
    this.groundEyeY = this.standingFeetY + EYE_OFFSET;
    this.verticalVelocity = 0;
    this.onFloor = true;
    this.jumpQueued = false;
    this.lastPhotoAttemptMs = 0;
    this.photoCooldownReady = true;
    this.hud.setPhotoCooldown(0);
    this.clearInputState();

    const obj = this.controls!.getObject();
    obj.position.set(x, this.groundEyeY, z);
    obj.rotation.set(0, this.yaw, 0, "YXZ");

    this.updateOpponent(opponentSpawn.position, opponentSpawn.rotation);
    this.opponentTargetPos.set(
      opponentSpawn.position[0],
      opponentSpawn.position[1],
      opponentSpawn.position[2],
    );
    this.opponentTargetYaw = THREE.MathUtils.degToRad(opponentSpawn.rotation[1]);
    this.opponent.position.copy(this.opponentTargetPos);
    this.opponent.rotation.y = this.opponentTargetYaw;
    this.opponentPrevPos.copy(this.opponentTargetPos);
    this.opponentLastGroundY = opponentSpawn.position[1];
    this.opponentWalkPhase = 0;
    this.opponentRig.setPose({ walkPhase: 0, airborne: false });
  }

  endMatch(): void {
    this.active = false;
    this.replayMode = false;
    this.clearInputState();
    this.hud.hideCrosshair();

    const obj = this.controls?.getObject();
    if (obj) {
      obj.rotation.set(0, obj.rotation.y, 0, "YXZ");
    }

    document.exitPointerLock();
  }

  isReplayMode(): boolean {
    return this.replayMode;
  }

  enterReplay(replay: MatchReplay): void {
    this.replayMode = true;
    this.active = false;
    this.clearInputState();
    this.hud.hideCrosshair();
    document.exitPointerLock();

    if (replay.roundId !== this.currentRoundId) {
      this.loadArena(replay.roundId);
    }

    const winnerSkin = getSkin(sanitizeSkinId(replay.winnerSkinId));
    this.replayWinnerRig.setColors(winnerSkin.shirtColor, winnerSkin.pantsColor);
    this.setOpponentSkin(replay.loserSkinId);
    this.replayWinner.visible = true;
    this.opponent.visible = true;
    this.camera.fov = replay.fovDeg;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  applyReplayFrame(frame: ReplayFrame): void {
    const winFeet = frame.win ?? [
      frame.cam[0],
      frame.cam[1] - EYE_OFFSET,
      frame.cam[2],
    ];
    const winRot = frame.winRot ?? frame.camRot;

    this.replayWinner.position.set(winFeet[0], winFeet[1], winFeet[2]);
    this.replayWinner.rotation.y = THREE.MathUtils.degToRad(winRot[1]);
    this.replayWinnerRig.setPose({ walkPhase: 0, airborne: false });

    this.opponent.position.set(frame.opp[0], frame.opp[1], frame.opp[2]);
    this.opponent.rotation.y = THREE.MathUtils.degToRad(frame.oppRot[1]);
    this.opponentRig.setPose({ walkPhase: 0, airborne: false });

    applyThirdPersonWinnerReplayCamera(
      this.camera,
      winFeet,
      winRot,
      frame.opp,
    );
  }

  renderReplay(): void {
    this.renderer.render(this.scene, this.camera);
  }

  exitReplay(): void {
    this.replayMode = false;
    this.replayWinner.visible = false;
  }

  updateOpponent(position: number[], rotation: number[]): void {
    this.opponentTargetPos.set(position[0], position[1], position[2]);
    this.opponentTargetYaw = THREE.MathUtils.degToRad(rotation[1]);
  }

  private updateOpponentAnimation(delta: number): void {
    const pos = this.opponent.position;
    const blend = 1 - Math.exp(-14 * delta);
    pos.lerp(this.opponentTargetPos, blend);
    this.opponent.rotation.y = THREE.MathUtils.lerp(
      this.opponent.rotation.y,
      this.opponentTargetYaw,
      blend,
    );

    const horizontalMove = Math.hypot(
      pos.x - this.opponentPrevPos.x,
      pos.z - this.opponentPrevPos.z,
    );
    const verticalMove = pos.y - this.opponentPrevPos.y;
    const rising = verticalMove > 0.015;
    const falling = verticalMove < -0.015;

    if (!rising && Math.abs(verticalMove) < 0.03) {
      this.opponentLastGroundY = pos.y;
    }

    const airborne =
      rising || (pos.y > this.opponentLastGroundY + 0.08 && !falling);

    if (horizontalMove > 0.001 && !airborne) {
      this.opponentWalkPhase += horizontalMove * 9.5;
    } else if (!airborne) {
      this.opponentWalkPhase *= Math.pow(0.2, delta);
    }

    this.opponentRig.setPose({
      walkPhase: this.opponentWalkPhase,
      airborne,
    });

    this.opponentPrevPos.copy(pos);
  }

  tick(delta: number): void {
    if (this.replayMode || !this.active) {
      return;
    }

    this.updateMovement(delta);
    this.updateOpponentAnimation(delta);
    this.updatePhotoCooldown();
    if (this.controls?.isLocked) {
      this.hud.showCrosshair();
    }

    this.stateTimer += delta;
    if (this.stateTimer >= 0.05 && this.active) {
      this.stateTimer = 0;
      this.sequence += 1;
      const obj = this.controls!.getObject();
      this.transport.sendPlayerState(
        [obj.position.x, obj.position.y - EYE_OFFSET, obj.position.z],
        this.getCameraRotationDeg(),
        false,
        this.sequence,
      );
    }

    this.renderer.render(this.scene, this.camera);
  }

  private getCameraRotationDeg(): [number, number, number] {
    const forward = new THREE.Vector3();
    this.controls!.getDirection(forward);
    const pitch = THREE.MathUtils.radToDeg(
      -Math.asin(Math.max(-1, Math.min(1, forward.y))),
    );
    const yaw = THREE.MathUtils.radToDeg(Math.atan2(forward.x, forward.z));
    return [pitch, yaw, 0];
  }

  private getCurrentFeetY(eyeY: number): number {
    return eyeY - EYE_OFFSET;
  }

  private eyeYFromFeet(feetY: number): number {
    return feetY + EYE_OFFSET;
  }

  private updateMovement(delta: number): void {
    if (!this.controls?.isLocked || !this.worldColliders) return;

    const speed = WALK_SPEED * delta;
    const obj = this.controls.getObject();
    const forward = new THREE.Vector3();
    this.controls.getDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let dx = 0;
    let dz = 0;
    const binds = getKeybinds();
    const pressed = (code: string) => this.keys.has(code) || this.mouseButtons.has(code);
    if (pressed(binds.moveForward)) {
      dx += forward.x * speed;
      dz += forward.z * speed;
    }
    if (pressed(binds.moveBack)) {
      dx -= forward.x * speed;
      dz -= forward.z * speed;
    }
    if (pressed(binds.moveLeft)) {
      dx -= right.x * speed;
      dz -= right.z * speed;
    }
    if (pressed(binds.moveRight)) {
      dx += right.x * speed;
      dz += right.z * speed;
    }

    let feet: FeetPos = {
      x: obj.position.x,
      y: this.onFloor ? this.standingFeetY : this.getCurrentFeetY(obj.position.y),
      z: obj.position.z,
    };

    if (this.jumpQueued && this.onFloor) {
      this.verticalVelocity = JUMP_VELOCITY;
      this.onFloor = false;
      this.jumpQueued = false;
    }

    let dy = 0;
    if (!this.onFloor) {
      this.verticalVelocity -= GRAVITY * delta;
      dy = this.verticalVelocity * delta;
    }

    const moved = movePlayer(feet, { x: dx, y: dy, z: dz }, this.worldColliders);
    feet = moved;

    if (moved.hitCeiling) {
      this.verticalVelocity = 0;
    }

    if (moved.onGround) {
      this.onFloor = true;
      this.verticalVelocity = 0;
      this.standingFeetY = feet.y;
    } else if (this.onFloor) {
      const supported = supportsFeetAt(
        feet.x,
        feet.z,
        this.standSurfaces,
        this.defaultFeetY,
        this.standingFeetY,
        this.arenaHalfExtent,
      );
      if (supported) {
        this.standingFeetY = getHighestSurfaceBelow(
          feet.x,
          feet.z,
          this.standSurfaces,
          this.defaultFeetY,
          this.standingFeetY + 0.1,
        );
        feet.y = this.standingFeetY;
      } else {
        this.onFloor = false;
        this.verticalVelocity = -1;
      }
    }

    obj.position.set(feet.x, this.eyeYFromFeet(feet.y), feet.z);
    this.groundEyeY = obj.position.y;

    this.yaw = obj.rotation.y;
    this.pitch = obj.rotation.x;
    this.camera.position.copy(obj.position);
  }

  private getPhotoCooldownRemaining(): number {
    return Math.max(0, PHOTO_COOLDOWN_MS - (performance.now() - this.lastPhotoAttemptMs));
  }

  private updatePhotoCooldown(): void {
    if (!this.active) return;

    const remaining = this.getPhotoCooldownRemaining();
    if (remaining > 0) {
      this.photoCooldownReady = false;
      this.hud.setPhotoCooldown(remaining / PHOTO_COOLDOWN_MS);
      return;
    }

    this.hud.setPhotoCooldown(0);
    if (!this.photoCooldownReady) {
      this.photoCooldownReady = true;
      this.hud.setPhotoReady();
    }
  }

  private snapPhoto(): void {
    if (!this.active || !this.controls?.isLocked) return;

    if (this.getPhotoCooldownRemaining() > 0) {
      return;
    }

    this.lastPhotoAttemptMs = performance.now();
    this.photoCooldownReady = false;
    this.hud.setPhotoCooldown(1);

    this.transport.sendPhotoAttempt(
      [this.camera.position.x, this.camera.position.y, this.camera.position.z],
      this.getCameraRotationDeg(),
      this.camera.fov,
      false,
      this.camera.aspect,
    );
    this.hud.flash();
  }

  private clearInputState(): void {
    this.keys.clear();
    this.mouseButtons.clear();
    this.jumpQueued = false;
  }

  private handleBindingPress(code: string): void {
    const binds = getKeybinds();
    if (code === binds.jump) {
      if (this.onFloor) {
        this.jumpQueued = true;
      }
      return;
    }
    if (code === binds.snap) {
      this.snapPhoto();
    }
  }

  private isMovementBinding(code: string): boolean {
    const binds = getKeybinds();
    return (
      code === binds.moveForward ||
      code === binds.moveBack ||
      code === binds.moveLeft ||
      code === binds.moveRight
    );
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) {
      return;
    }
    this.handleBindingPress(e.code);
    if (this.isMovementBinding(e.code)) {
      this.keys.add(e.code);
    }
    const binds = getKeybinds();
    if (
      e.code === binds.jump ||
      e.code === binds.snap ||
      this.isMovementBinding(e.code)
    ) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private onMouseDown(e: MouseEvent): void {
    const code = mouseButtonToCode(e.button);
    if (!code) {
      return;
    }
    this.handleBindingPress(code);
    if (this.isMovementBinding(code)) {
      this.mouseButtons.add(code);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const code = mouseButtonToCode(e.button);
    if (!code) {
      return;
    }
    this.mouseButtons.delete(code);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  requestLock(): void {
    this.controls?.lock();
  }

  isLocked(): boolean {
    return this.controls?.isLocked ?? false;
  }
}
