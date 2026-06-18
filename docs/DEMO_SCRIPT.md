# PhotoSnipe Demo Script

Target runtime: **~5 minutes**. This script is designed for the Final submission demo video. It prioritizes **two-human multiplayer** over solo bot practice, and includes the **technical walkthrough** and **AI reflection** segments the rubric requires.

**Production URL:** https://photo-snipe-server-production-2274.up.railway.app

---

## Segment 1 — Hook & multiplayer match (~2 min)

**Goal:** Show the shipped game, not the scaffold. Two real browser clients, not bot practice.

### Setup

- Open the production URL in **two separate browser windows** (or two devices on the same network).
- Window A = host, Window B = guest.

### Script

1. **(10 s)** Brief intro: *"PhotoSnipe is a 1v1 FPS where you win by photographing your opponent first — every shot reveals your position."*
2. **(20 s)** Window A: navigate to **PLAY** → pick an arena (e.g. Rooftop or City Streets) → enter a username → **Create Room**. Show the 4-letter room code.
3. **(15 s)** Window B: enter a different username → **Join Room** with the code. Match starts automatically — both players spawn at opposite ends.
4. **(60 s)** Play one round of actual multiplayer:
   - Move through the arena, use jump for vertical angles.
   - Enter aim mode, take at least one photo (show the flash/exposure risk even on a miss).
   - Land a valid capture or let the round timer expire.
5. **(15 s)** Show post-match UI: rematch vote, ladder rank/credits if visible, optional kill-cam replay on a valid capture.

**Do not** spend time in Solo Practice unless briefly mentioning it as a secondary mode at the end (~10 s max).

---

## Segment 2 — Feature breadth (~45 s)

Quick montage or single-window tour of the lobby tabs:

| Tab | Show |
|---|---|
| **PLAY** | Arena selector with unlock progression |
| **SHOP** | Operator skins and arena host passes |
| **SOCIAL** | Friends list and invite flow (optional: send invite from Window A, accept on Window B) |
| **SETTINGS** | Keybinds, appearance skin |

One sentence on progression: *"Wins earn rank points and credits; credits buy cosmetics and map host passes."*

---

## Segment 3 — Technical walkthrough (~1 min 15 s)

Voiceover or screen recording with code/architecture visible. Hit these points in order:

1. **Monorepo layout** — `core/` (shared rules), `server/` (authoritative WebSocket server), `client/web/` (Three.js browser client).
2. **Server-authoritative validation** — clients send `photo_attempt`; server validates face-in-frame, distance, line-of-sight occlusion against arena solid boxes in `core/src/photo-validation/`.
3. **Arena data model** — seven arenas defined as layout + collision solids in `core/src/arena/`; host picks map via room lobby.
4. **Networking** — WebSocket JSON protocol (`docs/NETWORKING.md`): `create_room` → `join_room` → `match_started` → 20 Hz `player_state` sync → `photo_attempt` / `photo_result`.
5. **Deployment** — Docker image bundles server + built web client; Railway serves HTTPS/WSS from a single endpoint.

See [TECHNICAL_WALKTHROUGH.md](TECHNICAL_WALKTHROUGH.md) for the full narrative.

---

## Segment 4 — AI reflection (~45 s)

Read or paraphrase from [AI_REFLECTION.md](AI_REFLECTION.md). Cover:

- What AI accelerated (scaffolding, arena layouts, protocol boilerplate, test cases).
- What you verified manually (multiplayer on production, photo validation edge cases, game feel).
- One lesson learned (e.g. AI drafts need playtesting; server authority prevents client-side cheating).

---

## Segment 5 — Stress test summary (~15 s)

One slide or terminal screenshot from [STRESS_TEST.md](STRESS_TEST.md):

- *"We stress-tested N concurrent 1v1 matches (2N WebSocket connections) using `scripts/stress-test.mjs`."*
- State the result: all rooms joined, matches started, no connection drops at target load.

---

## Recording checklist

- [ ] Two browser windows/devices — **not** solo bot practice
- [ ] At least one valid or attempted photo with exposure flash visible
- [ ] Technical walkthrough segment (code or architecture diagram)
- [ ] AI reflection segment (even 45–60 seconds)
- [ ] Stress test mentioned with concurrent count
- [ ] Total runtime under ~6 minutes

## What to cut if over time

1. Social/shop montage (keep multiplayer + walkthrough + AI reflection)
2. Kill-cam replay
3. Solo practice mention entirely
