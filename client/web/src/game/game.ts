import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import type { NetClient } from "../net/client.js";
import { buildWarehouse, resolveCollision } from "./warehouse.js";

const WALK_SPEED = 3;
const AIM_MULT = 0.6;
const NORMAL_FOV = 75;
const AIM_FOV = 40;
const JUMP_VELOCITY = 5;
const GRAVITY = 9.8;
const GROUND_Y = 1;

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(NORMAL_FOV, 1, 0.1, 200);
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  readonly opponent = new THREE.Group();

  private controls: PointerLockControls | null = null;
  private colliders: THREE.Box3[] = [];
  private keys = new Set<string>();
  private aiming = false;
  private sequence = 0;
  private stateTimer = 0;
  private roundEndsAtMs = 0;
  private active = false;
  private yaw = 0;
  private pitch = 0;
  private verticalVelocity = 0;
  private onFloor = true;

  constructor(
    private net: NetClient,
    private hud: {
      setTimer: (text: string) => void;
      setMessage: (text: string) => void;
      setRoundName: (text: string) => void;
      flash: () => void;
      showCrosshair: (aiming: boolean) => void;
    },
    mount: HTMLElement,
  ) {
    this.scene.background = new THREE.Color(0x0a0a0c);
    this.scene.fog = new THREE.Fog(0x0a0a0c, 20, 90);

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight(0x8899aa, 0x222222, 0.6);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.1);
    sun.position.set(10, 20, 8);
    this.scene.add(sun);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xe74c3c }),
    );
    body.position.y = 0.9;
    this.opponent.add(body);
    this.scene.add(this.opponent);

    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    this.scene.add(this.controls.getObject());

    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
    this.renderer.domElement.addEventListener("mousedown", (e) => this.onMouseDown(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    window.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  startRound(spawn: { position: number[]; rotation: number[] }, roundName: string, roundEndsAtMs: number): void {
    this.colliders = buildWarehouse(this.scene);
    this.active = true;
    this.roundEndsAtMs = roundEndsAtMs;
    this.hud.setRoundName(roundName);
    this.hud.setMessage("Find your opponent — right-click aim, left-click shoot, space jump");

    const [x, y, z] = spawn.position;
    const [, rotY] = spawn.rotation;
    this.yaw = THREE.MathUtils.degToRad(rotY);
    this.pitch = 0;
    this.verticalVelocity = 0;
    this.onFloor = true;
    this.camera.position.set(x, y + 0.6, z);
    this.controls!.getObject().position.copy(this.camera.position);
    this.controls!.getObject().rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    this.controls!.lock();
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
    this.updateCameraFov();
    this.hud.showCrosshair(this.aiming);

    if (this.roundEndsAtMs > 0) {
      const remaining = Math.max(0, this.roundEndsAtMs - Date.now());
      const sec = Math.floor(remaining / 1000);
      const min = Math.floor(sec / 60);
      this.hud.setTimer(`${String(min).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`);
    }

    this.stateTimer += delta;
    if (this.stateTimer >= 0.05) {
      this.stateTimer = 0;
      this.sequence += 1;
      const obj = this.controls!.getObject();
      this.net.sendPlayerState(
        [obj.position.x, obj.position.y, obj.position.z],
        [
          THREE.MathUtils.radToDeg(this.pitch),
          THREE.MathUtils.radToDeg(this.yaw),
          0,
        ],
        this.aiming,
        this.sequence,
      );
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateMovement(delta: number): void {
    if (!this.controls?.isLocked) return;

    const speed = (this.aiming ? WALK_SPEED * AIM_MULT : WALK_SPEED) * delta;
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
    }

    if (this.onFloor && this.keys.has("Space")) {
      this.verticalVelocity = JUMP_VELOCITY;
      this.onFloor = false;
    }

    this.verticalVelocity -= GRAVITY * delta;
    obj.position.y += this.verticalVelocity * delta;

    if (obj.position.y <= GROUND_Y) {
      obj.position.y = GROUND_Y;
      this.verticalVelocity = 0;
      this.onFloor = true;
    }

    obj.position.copy(resolveCollision(obj.position, this.colliders));
    obj.position.y = Math.max(obj.position.y, GROUND_Y);

    this.yaw = obj.rotation.y;
    this.pitch = this.camera.rotation.x;
    this.camera.position.copy(obj.position);
    this.camera.position.y += 0.6;
  }

  private updateCameraFov(): void {
    const target = this.aiming ? AIM_FOV : NORMAL_FOV;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, target, 0.15);
    this.camera.updateProjectionMatrix();
  }

  private shootPhoto(): void {
    if (!this.aiming || !this.active) return;
    this.net.sendPhotoAttempt(
      [this.camera.position.x, this.camera.position.y, this.camera.position.z],
      [
        THREE.MathUtils.radToDeg(this.pitch),
        THREE.MathUtils.radToDeg(this.yaw),
        0,
      ],
      this.camera.fov,
      this.aiming,
    );
    this.hud.flash();
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);
    if (e.code === "Space" && this.onFloor) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 2) this.aiming = true;
    if (e.button === 0) this.shootPhoto();
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 2) this.aiming = false;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  requestLock(): void {
    this.controls?.lock();
  }
}
