# PhotoSnipe

A **1v1 competitive first-person game** where two players start at **opposite ends of the same building** and race to **photograph each other first**. Each round takes place in a different arena with new routes and sight lines.

**Live demo:** [photo-snipe-server-production-2274.up.railway.app](https://photo-snipe-server-production-2274.up.railway.app)

## Status

**Final release** — browser client, online multiplayer, seven arenas, ranked progression, shop economy, social invites, solo bot practice, and kill-cam replay are all shipped. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Features

| Feature | Description |
|---|---|
| **Online 1v1** | Room-code lobby — host creates a room, opponent joins, match starts automatically |
| **Browser client** | Full FPS client served from the production server (no install required) |
| **7 arenas** | Warehouse, Freight Depot, Rooftop, Duct Network, Corn Maze, City Streets, Parking Garage |
| **Ranked ladder** | 12 operator ranks (Recruit → Legend) with rank points from online and practice wins |
| **Credits & shop** | Earn match credits; buy operator skins and arena host passes |
| **Social** | Friends list, online presence, and in-game room invites |
| **Solo practice** | Offline bot matches at easy / medium / hard difficulty |
| **Kill-cam replay** | Post-match replay on valid captures |
| **Rematch flow** | Vote to rematch or return to menu after a match ends |

## Core concept

- **Perspective:** First-person
- **Players:** 2 per match, same building, opposite-end spawns
- **Goal:** Take a valid photo with **any part of the opponent's body in frame** before they photograph you
- **Risk:** Every shot triggers a **flash and shutter sound**, revealing your position
- **Rounds:** **5 minutes** each; different arena per round
- **Movement:** Slow tactical walk with jump for vertical play
- **Match:** Best-of-N across arenas; **online 1v1** from day one

## Tech stack

| Layer | Choice |
|---|---|
| Client (primary) | TypeScript + Three.js web client (`client/web/`) |
| Client (legacy) | Godot 4 desktop client (`client/godot/`) — warehouse only |
| Server | Node.js + TypeScript (authoritative photo validation) |
| Protocol | [WebSocket JSON](docs/NETWORKING.md) |
| Shared rules | TypeScript `core/` package (validation, ladder, arenas, replay) |
| Data | JSON round definitions + procedural arena geometry |

## Quick start

```bash
npm install
npm test              # core unit tests (64 passing)
npm run build         # build core, server, and web client
npm run dev:server    # WebSocket server on :8787
```

Open **http://localhost:8787** in two browser tabs to play locally.

**Deploy online:** see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (Railway / Render / Docker).

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tylerxia8/photo-snipe)

### Play online (two players)

1. Player A: open the deployed URL → **Create Room** → share the 4-letter code
2. Player B: open the same URL → **Join Room** with that code
3. Match starts; hunt your opponent in the host-selected arena

## Documentation

| Doc | Purpose |
|---|---|
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | ~5 min demo outline (multiplayer, technical walkthrough, AI reflection) |
| [docs/TECHNICAL_WALKTHROUGH.md](docs/TECHNICAL_WALKTHROUGH.md) | Architecture, validation flow, and deployment |
| [docs/AI_REFLECTION.md](docs/AI_REFLECTION.md) | How AI tools were used and what was verified manually |
| [docs/STRESS_TEST.md](docs/STRESS_TEST.md) | Concurrent match load test methodology and results |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and module boundaries |
| [docs/NETWORKING.md](docs/NETWORKING.md) | WebSocket message protocol |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Railway / Render / Docker deployment |

## Repository layout

```
core/              Shared match rules (TypeScript) — validation, ladder, arenas
server/            WebSocket game server (Node.js) + static web client hosting
client/web/        Primary browser FPS client (Three.js)
client/godot/      Legacy Godot 4 desktop client (warehouse arena)
data/rounds/       Round definitions (arena + spawns + rules)
data/matches/      Match config (round pools, rounds to win)
docs/              Architecture, demo script, walkthrough, stress test, schemas
scripts/           Deploy and stress-test utilities
```
