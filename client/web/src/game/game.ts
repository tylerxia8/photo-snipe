import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import type { NetClient } from "../net/client.js";
import {
  buildWarehouse,
  getHighestSurfaceBelow,
  PLAYER_RADIUS,
  resolveCollision,
  supportsFeetAt,
  type StandSurface,
} from "./warehouse.js";
import { createBlockyPlayer } from "./blocky-player.js";

const WALK_SPEED = 3;
const JUMP_VELOCITY = 8;
const GRAVITY = 18;
const EYE_OFFSET = 0.6;
const STAND_SKIN = 0.02;

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200);
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  readonly opponent = new THREE.Group();

  private controls: PointerLockControls | null = null;
  private colliders: THREE.Box3[] = [];
  private propColliders: THREE.Box3[] = [];
  private standSurfaces: StandSurface[] = [];
  private defaultFeetY = 1;
  private standingFeetY = 1;
  private keys = new Set<string>();
  private sequence = 0;
  private stateTimer = 0;
  private active = false;
  private yaw = 0;
  private pitch = 0;
  private verticalVelocity = 0;
  private onFloor = true;
  private jumpQueued = false;
  private groundEyeY = 1.6;

  constructor(
    private net: NetClient,
    private hud: {
      setMessage: (text: string) => void;
      setRoundName: (text: string) => void;
      flash: () => void;
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

    const opponentModel = createBlockyPlayer(0xe74c3c, 0xf39c12);
    this.opponent.add(opponentModel);
    this.scene.add(this.opponent);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getObject());

    const warehouse = buildWarehouse(this.scene);
    this.colliders = warehouse.wallColliders;
    this.propColliders = warehouse.propColliders;
    this.standSurfaces = warehouse.standSurfaces;
    this.defaultFeetY = warehouse.defaultFeetY;

    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
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
  }

  isActive(): boolean {
    return this.active;
  }

  startRound(
    spawn: { position: number[]; rotation: number[] },
    opponentSpawn: { position: number[]; rotation: number[] },
    roundName: string,
  ): void {
    this.active = true;
    this.hud.setRoundName(roundName);
    this.hud.setMessage("WASD move · Space jump · Left Shift to snap a photo");

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
    this.clearInputState();

    const obj = this.controls!.getObject();
    obj.position.set(x, this.groundEyeY, z);
    obj.rotation.set(0, this.yaw, 0, "YXZ");

    this.updateOpponent(opponentSpawn.position, opponentSpawn.rotation);
  }

  endMatch(): void {
    this.active = false;
    this.clearInputState();
    this.hud.hideCrosshair();

    const obj = this.controls?.getObject();
    if (obj) {
      obj.rotation.set(0, obj.rotation.y, 0, "YXZ");
    }

    document.exitPointerLock();
  }

  updateOpponent(position: number[], rotation: number[]): void {
    this.opponent.position.set(position[0], position[1], position[2]);
    this.opponent.rotation.set(0, THREE.MathUtils.degToRad(rotation[1]), 0);
  }

  tick(delta: number): void {
    if (!this.active) return;

    this.updateMovement(delta);
    if (this.controls?.isLocked) {
      this.hud.showCrosshair();
    }

    this.stateTimer += delta;
    if (this.stateTimer >= 0.05 && this.active) {
      this.stateTimer = 0;
      this.sequence += 1;
      const obj = this.controls!.getObject();
      this.net.sendPlayerState(
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

  private findLandingFeetY(x: number, z: number, maxFeetY: number): number {
    return getHighestSurfaceBelow(
      x,
      z,
      this.standSurfaces,
      this.defaultFeetY,
      maxFeetY,
    );
  }

  private updateMovement(delta: number): void {
    if (!this.controls?.isLocked) return;

    const speed = WALK_SPEED * delta;
    const obj = this.controls.getObject();
    const forward = new THREE.Vector3();
    this.controls.getDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    if (this.keys.has("KeyW")) move.add(forward);
    if (this.keys.has("KeyS")) move.sub(forward);
    if (this.keys.has("KeyA")) move.sub(right);
    if (this.keys.has("KeyD")) move.add(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      obj.position.add(move);
      obj.position.copy(
        resolveCollision(
          obj.position,
          [...this.colliders, ...this.propColliders],
          PLAYER_RADIUS,
          1.8,
          this.getCurrentFeetY(obj.position.y),
        ),
      );
    }

    if (this.jumpQueued && this.onFloor) {
      this.verticalVelocity = JUMP_VELOCITY;
      this.onFloor = false;
      this.jumpQueued = false;
    }

    if (!this.onFloor) {
      this.verticalVelocity -= GRAVITY * delta;
      obj.position.y += this.verticalVelocity * delta;

      const currentFeetY = this.getCurrentFeetY(obj.position.y);
      const landingFeetY = this.findLandingFeetY(obj.position.x, obj.position.z, currentFeetY);
      const landingEyeY = this.eyeYFromFeet(landingFeetY + STAND_SKIN);

      if (obj.position.y <= landingEyeY && this.verticalVelocity <= 0) {
        this.standingFeetY = landingFeetY + STAND_SKIN;
        obj.position.y = this.eyeYFromFeet(this.standingFeetY);
        this.groundEyeY = obj.position.y;
        this.verticalVelocity = 0;
        this.onFloor = true;
      }
    } else if (
      supportsFeetAt(
        obj.position.x,
        obj.position.z,
        this.standSurfaces,
        this.defaultFeetY,
        this.standingFeetY,
      )
    ) {
      obj.position.y = this.eyeYFromFeet(this.standingFeetY);
      this.groundEyeY = obj.position.y;
    } else {
      this.onFloor = false;
      this.verticalVelocity = 0;
    }

    this.yaw = obj.rotation.y;
    this.pitch = obj.rotation.x;
    this.camera.position.copy(obj.position);
  }

  private snapPhoto(): void {
    if (!this.active || !this.controls?.isLocked) return;
    this.net.sendPhotoAttempt(
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
    this.jumpQueued = false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === "Space") {
      if (this.onFloor) this.jumpQueued = true;
      e.preventDefault();
      return;
    }
    if (e.code === "ShiftLeft") {
      if (!e.repeat) this.snapPhoto();
      e.preventDefault();
      return;
    }
    this.keys.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
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
