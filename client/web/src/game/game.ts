import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import type { NetClient } from "../net/client.js";
import { buildWarehouse, resolveCollision } from "./warehouse.js";

const WALK_SPEED = 3;
const JUMP_VELOCITY = 5;
const GRAVITY = 9.8;
const EYE_OFFSET = 0.6;
const GROUND_FEET_Y = 1;

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200);
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  readonly opponent = new THREE.Group();

  private controls: PointerLockControls | null = null;
  private colliders: THREE.Box3[] = [];
  private keys = new Set<string>();
  private sequence = 0;
  private stateTimer = 0;
  private active = false;
  private yaw = 0;
  private pitch = 0;
  private verticalVelocity = 0;
  private onFloor = true;
  private jumpQueued = false;
  private onLockChange: ((locked: boolean) => void) | null = null;

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
    body.position.y = 0.9;
    this.opponent.add(body);
    this.scene.add(this.opponent);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getObject());

    this.colliders = buildWarehouse(this.scene);

    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
    window.addEventListener("blur", () => this.clearInputState());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clearInputState();
    });
    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === this.renderer.domElement;
      if (!locked) this.clearInputState();
      this.onLockChange?.(locked);
    });
    window.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  setLockChangeHandler(handler: (locked: boolean) => void): void {
    this.onLockChange = handler;
  }

  startRound(spawn: { position: number[]; rotation: number[] }, roundName: string): void {
    this.active = true;
    this.hud.setRoundName(roundName);
    this.hud.setMessage("Click to play · WASD move · Space jump · Left Shift to snap a photo");

    const [x, y, z] = spawn.position;
    const [, rotY] = spawn.rotation;
    this.yaw = THREE.MathUtils.degToRad(rotY);
    this.pitch = 0;
    this.verticalVelocity = 0;
    this.onFloor = true;
    this.jumpQueued = false;
    this.clearInputState();

    this.setEyePosition(x, y + EYE_OFFSET, z);
    this.controls!.getObject().rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    this.requestLock();
  }

  endMatch(): void {
    this.active = false;
    this.clearInputState();
    this.hud.hideCrosshair();
    document.exitPointerLock();
  }

  updateOpponent(position: number[], rotation: number[]): void {
    this.opponent.position.set(position[0], position[1], position[2]);
    this.opponent.rotation.set(
      THREE.MathUtils.degToRad(rotation[0]),
      THREE.MathUtils.degToRad(rotation[1]),
      THREE.MathUtils.degToRad(rotation[2]),
    );
  }

  tick(delta: number): void {
    if (!this.active) return;

    this.updateMovement(delta);
    if (this.controls?.isLocked) {
      this.hud.showCrosshair();
    }

    this.stateTimer += delta;
    if (this.stateTimer >= 0.05 && this.controls?.isLocked) {
      this.stateTimer = 0;
      this.sequence += 1;
      const feet = this.getFeetPosition();
      this.net.sendPlayerState(
        [feet.x, feet.y, feet.z],
        [
          THREE.MathUtils.radToDeg(this.pitch),
          THREE.MathUtils.radToDeg(this.yaw),
          0,
        ],
        false,
        this.sequence,
      );
    }

    this.renderer.render(this.scene, this.camera);
  }

  private setEyePosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.controls!.getObject().position.copy(this.camera.position);
  }

  private getFeetPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.camera.position.x,
      this.camera.position.y - EYE_OFFSET,
      this.camera.position.z,
    );
  }

  private updateMovement(delta: number): void {
    if (!this.controls?.isLocked) return;

    const speed = WALK_SPEED * delta;
    const forward = new THREE.Vector3();
    this.controls.getDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const feet = this.getFeetPosition();

    const move = new THREE.Vector3();
    if (this.keys.has("KeyW")) move.add(forward);
    if (this.keys.has("KeyS")) move.sub(forward);
    if (this.keys.has("KeyA")) move.sub(right);
    if (this.keys.has("KeyD")) move.add(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      feet.add(move);
    }

    if (this.jumpQueued && this.onFloor) {
      this.verticalVelocity = JUMP_VELOCITY;
      this.onFloor = false;
      this.jumpQueued = false;
    }

    this.verticalVelocity -= GRAVITY * delta;
    feet.y += this.verticalVelocity * delta;

    if (feet.y <= GROUND_FEET_Y) {
      feet.y = GROUND_FEET_Y;
      this.verticalVelocity = 0;
      this.onFloor = true;
    }

    const resolved = resolveCollision(feet, this.colliders);
    feet.copy(resolved);

    this.setEyePosition(feet.x, feet.y + EYE_OFFSET, feet.z);
    this.controls.getObject().rotation.y = this.yaw;
    this.pitch = this.camera.rotation.x;
  }

  private snapPhoto(): void {
    if (!this.active || !this.controls?.isLocked) return;
    this.net.sendPhotoAttempt(
      [this.camera.position.x, this.camera.position.y, this.camera.position.z],
      [
        THREE.MathUtils.radToDeg(this.pitch),
        THREE.MathUtils.radToDeg(this.yaw),
        0,
      ],
      this.camera.fov,
      false,
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
