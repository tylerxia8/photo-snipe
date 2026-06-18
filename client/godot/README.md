# PhotoSnipe Godot Client

Legacy Godot 4 desktop client for online 1v1 matches. **The primary shipped client is the browser build** in `client/web/`, served automatically from the production server URL. Use this Godot project only if you want a native desktop build — it currently ships the warehouse arena only.

## Requirements

- [Godot 4.3+](https://godotengine.org/download)
- Node.js game server running (see repo root)

## Quick start

```bash
# From repo root — start server
npm run dev:server

# Open client/godot in Godot Editor and press F5 (main scene)
# Or run two editor instances for local online testing
```

1. **Player A:** Create Room — note the 4-letter code
2. **Player B:** Join Room with that code
3. Match starts automatically; both spawn at opposite ends of the test building

## Controls

| Input | Action |
|---|---|
| WASD | Move (3.0 m/s tactical walk) |
| Mouse | Look |
| Right click (hold) | Aim camera |
| Space | Take photo (while aiming) |

## Configuration

Edit `config/network.cfg` to point at your deployed server:

```
server_url=wss://your-host.example.com
```

## Buildings

| Building | Scene | Doc |
|---|---|---|
| Warehouse Interior | `buildings/warehouse_interior.tscn` | [layout doc](../../docs/buildings/warehouse-interior-01.md) |

The warehouse loads automatically when a round starts. Preview it by opening `buildings/warehouse_interior.tscn` in the editor and pressing F6.

## Scenes

| Scene | Purpose |
|---|---|
| `scenes/main.tscn` | Lobby — create/join room |
| `scenes/game.tscn` | Match — FPS gameplay |
