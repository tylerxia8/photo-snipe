# PhotoSnipe Server Deployment

Deploy the authoritative WebSocket game server for online 1v1 matches.

## Requirements

- Node.js 22+ (local) or Docker
- Public HTTPS/WSS endpoint for Godot clients
- `data/` directory bundled with the server (round + match JSON)

## Quick deploy with Railway (recommended)

[Railway](https://railway.app) supports WebSockets and Docker out of the box.

### Option A — Deploy from GitHub (no CLI login)

Best if `railway login` fails in automated shells.

1. Open **[railway.com/new](https://railway.com/new)** → **Deploy from GitHub repo**
2. Install the [Railway GitHub App](https://github.com/apps/railway-app/installations/new) if prompted
3. Select **`tylerxia8/photo-snipe`**
4. Click **Deploy Now** — Railway reads `railway.toml` + root `Dockerfile`
5. In the service → **Settings** → **Networking** → **Generate Domain**
6. Copy the public URL (e.g. `photo-snipe-production.up.railway.app`)

### Option B — CLI deploy (run in your own terminal)

```powershell
cd photo-snipe
.\scripts\deploy-railway.ps1
```

Or manually:

```bash
railway login
railway init
railway up --detach
railway domain
```

Copy the generated hostname (e.g. `photo-snipe-production.up.railway.app`).

### 4. Point Godot clients at the server

Edit `client/godot/config/network.cfg`:

```
server_url=wss://photo-snipe-production.up.railway.app
```

Railway terminates TLS at the edge — use `wss://` (no port suffix needed).

### 5. Verify

```bash
curl https://your-railway-domain.up.railway.app/health
# {"ok":true,"service":"photo-snipe","uptimeSec":...}
```

---

## Alternative: Render

1. Push the repo to GitHub
2. [Render Dashboard](https://dashboard.render.com) → **New Blueprint**
3. Connect `tylerxia8/photo-snipe` — Render reads `render.yaml`
4. After deploy, copy the service URL and set `server_url=wss://your-service.onrender.com`

---

## Docker (self-hosted)

```bash
docker build -t photo-snipe-server .
docker run -p 8787:8787 -e PORT=8787 -e HOST=0.0.0.0 photo-snipe-server
```

Put nginx or Caddy in front for TLS:

```
wss://photosnipe.yourdomain.com  →  ws://localhost:8787
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8787` | HTTP + WebSocket listen port |
| `HOST` | `0.0.0.0` | Bind address (required for containers) |
| `NODE_ENV` | — | Set to `production` in deploy |

---

## Health check

```
GET /health
→ 200 {
  "ok": true,
  "service": "photo-snipe",
  "uptimeSec": 123,
  "connections": 42,
  "rooms": 8,
  "waitingRooms": 2,
  "activeMatches": 6
}
```

Used by Railway, Render, and Docker `HEALTHCHECK`. Connection and room counts support load testing — see [STRESS_TEST.md](STRESS_TEST.md).

---

## Web client

The production Docker image bundles the built web client from `client/web/`. After deploy, open the public URL in a browser — no Godot install required. Two browser tabs (or devices) can play a full online match through the same endpoint.

The legacy Godot client still connects via `client/godot/config/network.cfg` if you prefer the desktop build.

---

## Stress testing

Run concurrent match load against a running server:

```bash
npm run build
npm run start:server
# In another terminal:
npm run stress-test -- --rooms 50 --duration 10
```

See [STRESS_TEST.md](STRESS_TEST.md) for methodology and recorded results.

---

## CI deploy (optional)

Add `RAILWAY_TOKEN` to GitHub repo secrets, then push to `main`. See `.github/workflows/deploy-server.yml`.

---

## Local production test

```bash
npm run build
npm run start:server
curl http://localhost:8787/health
```

Godot `network.cfg`:

```
server_url=ws://localhost:8787
```
