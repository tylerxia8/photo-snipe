# PhotoSnipe AI Reflection

This document supports the Final demo **AI reflection** segment. It describes how AI coding assistants were used during development, what was kept vs changed, and what required manual verification.

---

## Where AI helped

### Project scaffolding and structure

AI tools accelerated the initial monorepo layout: npm workspaces for `core`, `server`, and `client/web`, TypeScript configs, and the WebSocket message handler skeleton in `server/src/index.ts`. The shared `core/` package pattern — keeping validation logic engine-neutral — was drafted with AI and then kept as the project's central architectural decision.

### Arena and collision authoring

Seven distinct arenas required many axis-aligned solid boxes for client collision and server occlusion. AI assisted with generating layout coordinates and box definitions in `core/src/arena/*.ts`, which I then playtested for stuck spots, unreachable areas, and unfair sight lines. Corn Maze and Duct Network in particular went through several AI-generated iterations before the paths felt fair for 1v1.

### Protocol and boilerplate

WebSocket message types (`create_room`, `join_room`, `player_state`, `photo_attempt`, rematch flow, friend invites) were drafted with AI help. The repetitive handler switch/case and client dispatch code benefited from generation, freeing time for game-feel tuning.

### Unit tests

Test cases for photo validation, ladder math, and arena registry were co-written with AI. Tests caught regressions when validation rules changed (e.g. body-in-frame vs face-only iterations during design).

### UI and styling

The web lobby (Play / Settings / Social / Shop tabs, rank display, shop cards) used AI for CSS layout and component structure. Visual polish — font choices, color accents per rank tier — was directed manually.

---

## What I verified manually

| Area | Why manual verification mattered |
|---|---|
| **Online multiplayer** | AI cannot confirm two remote browsers connect through Railway WSS, spawn correctly, and stay in sync. Tested with two browser windows on the production deployment. |
| **Photo validation feel** | Unit tests pass for geometry, but "does this feel fair in gameplay?" required live matches — tuning FOV, exposure radius, and movement speed. |
| **Arena playability** | AI-generated box layouts sometimes blocked spawns or created degenerate peek angles. Each arena was walked through in practice and online modes. |
| **Progression pacing** | Rank point awards were tuned so Legend rank takes weeks, not one session — required playing multiple matches and checking the ladder UI. |
| **Bot difficulty** | Practice bots needed hand-tuning of reaction time and aim error; AI-generated defaults were too strong or too passive. |

---

## What AI got wrong (and how I fixed it)

1. **README and architecture docs drifted** — AI-assisted docs kept saying "scaffold phase" and "Godot MVP" long after the web client, shop, and ladder shipped. Documentation had to be refreshed to match reality (this round of feedback).

2. **Client-authoritative wins** — Early drafts let the client declare capture success. I rejected this pattern and enforced server-side `validatePhoto()` before any round could end.

3. **Over-engineered matchmaking** — AI suggested skill-based matchmaking and accounts. Scope was cut to room codes + localStorage progression, which matches the course timeline and still delivers playable 1v1.

4. **Demo bias toward practice mode** — Practice mode is client-only and easy to demo solo, so early demo recordings showed bot play instead of the shipped two-human multiplayer. The demo script now explicitly requires two browser clients.

---

## Lessons learned

1. **AI is best at breadth, not proof** — It can produce seven arenas, a shop UI, and a protocol handler quickly, but it cannot substitute for "two humans played online and it worked."

2. **Keep authoritative logic out of generated client code** — Shared TypeScript in `core/` with server-side validation was the highest-leverage architectural choice; AI-generated client code defaults to trusting the client.

3. **Documentation is part of the deliverable** — The game outran the docs. Refreshing README, walkthrough, and demo script is as important as feature code for Final submission.

4. **Direct AI outputs toward tests** — Validation unit tests gave confidence to iterate on AI-generated arena geometry without breaking win conditions.

---

## Tools used

- **Cursor / Claude** — primary coding assistant for TypeScript, Three.js, and documentation drafts
- **Manual playtesting** — two-browser multiplayer on localhost and Railway production
- **Vitest** — 64 automated unit tests for core rules

---

## Summary (30-second demo version)

> AI helped scaffold the monorepo, generate arena layouts, and write protocol boilerplate and tests — which let me ship seven maps, a shop, and a ranked ladder in the Final timeline. I manually verified online multiplayer on the deployed server, tuned photo validation for fair gameplay, and cut scope where AI over-engineered (accounts, matchmaking). The main lesson: treat AI output as a fast first draft, keep win logic server-authoritative, and always demo what you actually shipped — two-player browser multiplayer, not solo bots.
