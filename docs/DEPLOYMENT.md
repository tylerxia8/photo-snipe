# PhotoSnipe Server Deployment

Deploy the authoritative WebSocket game server for online 1v1 matches.

## Requirements

- Node.js 22+ (local) or Docker
- Public HTTPS/WSS endpoint for Godot clients
- `data/` directory bundled with the server (round + match JSON)

## Quick deploy with Railway (recommended)

[Railway](https://railway.app) supports WebSockets and Docker out of the box.

### 1. Login and create project

```bash
railway login
cd photo-snipe
railway init          # create new project
```

### 2. Deploy

```bash
railway up
```

Railway builds the root `Dockerfile` and exposes a public URL.

### 3. Generate a public domain

```bash
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
→ 200 {"ok":true,"service":"photo-snipe","uptimeSec":123}
```

Used by Railway, Render, and Docker `HEALTHCHECK`.

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
