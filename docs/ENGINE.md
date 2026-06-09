# Engine Decision: Godot 4

PhotoSnipe's MVP client will be built in **Godot 4**.

## Summary

| Choice | Godot 4 |
|---|---|
| Client | `client/godot/` |
| Server | Node.js + TypeScript (`server/`, `core/`) |
| Networking | WebSocket to dedicated server (not Godot's built-in host) |

## Why Godot 4 over Unity

### 1. Scope fit

PhotoSnipe is a small 1v1 indie game: walk around one building, aim a camera, validate a shot. Godot 4's 3D stack is more than enough. We do not need Unity's AAA FPS ecosystem to ship the MVP.

### 2. Our architecture already picks the server

Match rules and photo validation live in a **Node.js authoritative server**. We are not relying on the engine's netcode stack to decide winners. That removes Unity's main competitive advantage (Netcode for GameObjects, mature multiplayer tooling) from the decision.

### 3. Faster iteration for a solo/small team

Godot projects are lightweight. Scene editing, play-in-editor, and iteration on a single interior building are fast. GDScript keeps gameplay scripting approachable without heavy boilerplate.

### 4. Licensing and cost

Godot is open source (MIT). No runtime fees or licensing tiers to track as the project grows.

### 5. Browser path still exists

Godot 4 exports to web (WASM). It has limitations (larger builds, some features missing), but it is a viable Phase 2 path without rewriting the client in JavaScript. Unity WebGL is also limited and tends to produce heavier builds.

## When Unity would have been the better pick

Choose Unity instead if any of these were true:

- You already have strong Unity experience and none in Godot
- You need Asset Store building kits immediately to avoid blocking on art
- You are targeting console release with mature first-party tooling from day one
- You plan to lean heavily on Unity-specific netcode rather than a custom server

None of those apply to our current plan, so Godot 4 is the better default.

## Godot-specific implementation notes

| Concern | Godot approach |
|---|---|
| FPS movement | `CharacterBody3D` + mouse-look; **3.0 m/s** slow walk (see `data/config/game-defaults.json`) |
| Building | Single `.glb` or Godot scene per round |
| Opponent representation | Simplified avatar with a named **face hit volume** (Area3D or bone attachment) |
| Photo aim mode | Narrow FOV on `Camera3D`; crosshair overlay |
| Networking | `WebSocketPeer` to Node server; no client-side win logic |
| Round loading | Server sends `roundId`; client loads scene from `data/rounds/` config |

## Project location

```
client/godot/     # Godot 4 project (project.godot, scenes, scripts)
```

The Godot client reads the same round JSON as the server. Building scenes live under `data/buildings/` and are imported or referenced by the Godot project.
