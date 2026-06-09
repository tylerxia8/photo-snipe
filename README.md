# PhotoSnipe

A **1v1 competitive first-person game** where two players start at **opposite ends of the same building** and race to **photograph each other's face first**. Each round takes place in a different building with new routes and sight lines.

## Status

Scaffold phase — core rules, server, and Godot client are in place. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Core concept

- **Perspective:** First-person
- **Players:** 2 per match, same building, opposite-end spawns
- **Goal:** Take a valid photo with **any part of the opponent's body in frame** before they photograph you
- **Risk:** Every shot triggers a **flash and shutter sound**, revealing your position
- **Rounds:** **5 minutes** each; different building per round
- **Movement:** Slow tactical walk (tunable after first playtest)
- **Match:** Best-of-N across buildings; **online 1v1** from day one

## Tech stack

| Layer | Choice |
|---|---|
| Client | Godot 4 ([why?](docs/ENGINE.md)) |
| Server | Node.js + TypeScript (authoritative photo validation) |
| Protocol | [WebSocket JSON](docs/NETWORKING.md) |
| Data | JSON round definitions + GLB building scenes |

## Quick start

```bash
npm install
npm test              # core unit tests (8 passing)
npm run dev:server    # WebSocket server on :8787
```

**Deploy online:** see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (Railway / Render / Docker).

**Play in browser:** visit your deployed server URL (e.g. `https://photo-snipe-server-production-2274.up.railway.app`).

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tylerxia8/photo-snipe)

Open `client/godot/` in Godot 4 for the desktop client, **or play in your browser** at the deployed server URL.

1. Player A: **Create Room** → share the 4-letter code
2. Player B: **Join Room** with that code
3. Match starts; hunt your opponent in the test building

## Repository layout

```
docs/              Architecture, networking protocol, schemas
data/rounds/       Round definitions (building + spawns + rules)
data/matches/      Match config (round pools, rounds to win)
data/buildings/    3D scene assets
core/              Shared match rules (TypeScript)
server/            WebSocket game server (Node.js)
client/godot/      Godot 4 FPS client
```
