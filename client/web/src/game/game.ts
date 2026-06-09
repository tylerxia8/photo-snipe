import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import type { NetClient } from "../net/client.js";
import {
  buildWarehouse,
  getSupportedFeetY,
  resolveCollision,
  type StandSurface,
} from "./warehouse.js";

const WALK_SPEED = 3;
const JUMP_VELOCITY = 8;
const GRAVITY = 18;
const EYE_OFFSET = 0.6;
const BODY_VISUAL_OFFSET = 0.9;

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200);
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  readonly opponent = new THREE.Group();

  private controls: PointerLockControls | null = null;
  private colliders: THREE.Box3[] = [];
  private standSurfaces: StandSurface[] = [];
  private defaultFeetY = 1;
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
    this.scene.background = new THREE.Color(0x1a1c22);
    this.scene.fog = new THREE.Fog(0x1a1c22, 35, 75);

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xb8c4d4, 0x3a3a40, 0.85);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.35);
    sun.position.set(10, 20, 8);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8899bb, 0.35);
    fill.position.set(-8, 12, -10);
    this.scene.add(fill);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xe74c3c }),
    );
    body.position.y = BODY_VISUAL_OFFSET;
    this.opponent.add(body);
    this.scene.add(this.opponent);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getObject());

    const warehouse = buildWarehouse(this.scene);
    this.colliders = warehouse.colliders;
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
    this.groundEyeY = y + EYE_OFFSET;
    this.verticalVelocity = 0;
    this.onFloor = true;
    this.jumpQueued = false;
    this.clearInputState();

    const obj = this.controls!.getObject();
    obj.position.set(x, this.groundEyeY, z);
    obj.rotation.y = this.yaw;
    this.camera.position.copy(obj.position);
    this.camera.rotation.x = this.pitch;

    this.updateOpponent(opponentSpawn.position, opponentSpawn.rotation);
  }

  endMatch(): void {
    this.active = false;
    this.clearInputState();
    this.hud.hideCrosshair();
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

  private getSupportedEyeY(x: number, z: number): number {
    const feetY = getSupportedFeetY(x, z, this.standSurfaces, this.defaultFeetY);
    return feetY + EYE_OFFSET;
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
      obj.position.copy(resolveCollision(obj.position, this.colliders));
    }

    if (this.jumpQueued && this.onFloor) {
      this.verticalVelocity = JUMP_VELOCITY;
      this.onFloor = false;
      this.jumpQueued = false;
    }

    if (!this.onFloor) {
      this.verticalVelocity -= GRAVITY * delta;
      obj.position.y += this.verticalVelocity * delta;

      const supportedEyeY = this.getSupportedEyeY(obj.position.x, obj.position.z);
      if (obj.position.y <= supportedEyeY && this.verticalVelocity <= 0) {
        obj.position.y = supportedEyeY;
        this.groundEyeY = supportedEyeY;
        this.verticalVelocity = 0;
        this.onFloor = true;
      }
    } else {
      const supportedEyeY = this.getSupportedEyeY(obj.position.x, obj.position.z);
      if (obj.position.y > supportedEyeY + 0.05) {
        this.onFloor = false;
      } else {
        obj.position.y = supportedEyeY;
        this.groundEyeY = supportedEyeY;
      }
    }

    this.yaw = obj.rotation.y;
    this.pitch = this.camera.rotation.x;
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
