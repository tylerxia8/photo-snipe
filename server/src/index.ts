import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { loadMatchConfig } from "./data-loader.js";
import { LobbyManager } from "./lobby.js";
import { MatchSession } from "./match-session.js";
import { serveWebClient, webClientAvailable } from "./static.js";
import type { PlayerSlot } from "@photo-snipe/core";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

interface ClientContext {
  clientId: string;
  roomCode?: string;
  slot?: PlayerSlot;
  match?: MatchSession;
}

const lobby = new LobbyManager();
const clients = new WeakMap<WebSocket, ClientContext>();

function send(socket: WebSocket, payload: Record<string, unknown>): void {
  socket.send(JSON.stringify(payload));
}

function parseMessage(raw: Buffer | ArrayBuffer | Buffer[]): Record<string, unknown> | null {
  try {
    const text = raw.toString();
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "photo-snipe",
        uptimeSec: Math.floor(process.uptime()),
      }),
    );
    return;
  }

  if (serveWebClient(req, res)) {
    return;
  }

  if (!webClientAvailable() && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Web client not built. Run: npm run build -w @photo-snipe/web\n");
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found\n");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (socket) => {
  const context: ClientContext = { clientId: randomUUID() };
  clients.set(socket, context);

  send(socket, {
    type: "connected",
    clientId: context.clientId,
    serverTimeMs: Date.now(),
  });

  socket.on("message", (raw) => {
    void handleMessage(socket, raw);
  });

  socket.on("close", () => {
    const ctx = clients.get(socket);
    if (!ctx) {
      return;
    }

    if (ctx.match && ctx.slot) {
      ctx.match.handleDisconnect(ctx.slot);
    }

    lobby.removePlayer(ctx.clientId);
  });
});

async function handleMessage(
  socket: WebSocket,
  raw: Buffer | ArrayBuffer | Buffer[],
): Promise<void> {
  const message = parseMessage(raw);
  const ctx = clients.get(socket);

  if (!message || !ctx || typeof message.type !== "string") {
    send(socket, {
      type: "error",
      code: "invalid_message",
      message: "Message must be JSON with a type field",
    });
    return;
  }

  switch (message.type) {
    case "create_room": {
      const displayName =
        typeof message.displayName === "string" ? message.displayName : "Player";
      const room = lobby.createRoom(socket, ctx.clientId, displayName);
      ctx.roomCode = room.code;
      ctx.slot = "A";
      send(socket, {
        type: "room_created",
        roomCode: room.code,
        playerSlot: "A",
      });
      break;
    }

    case "join_room": {
      const roomCode =
        typeof message.roomCode === "string" ? message.roomCode : "";
      const displayName =
        typeof message.displayName === "string" ? message.displayName : "Player";
      const joined = lobby.joinRoom(roomCode, socket, ctx.clientId, displayName);

      if (!joined) {
        const room = lobby.getRoom(roomCode);
        send(socket, {
          type: "error",
          code: room ? "room_full" : "room_not_found",
          message: room ? "Room is full" : "No room with that code exists",
        });
        return;
      }

      ctx.roomCode = joined.room.code;
      ctx.slot = joined.slot;

      send(socket, {
        type: "room_joined",
        roomCode: joined.room.code,
        playerSlot: joined.slot,
      });

      const playerA = joined.room.players.A;
      const playerB = joined.room.players.B;
      if (!playerA || !playerB) {
        return;
      }

      const matchConfig = await loadMatchConfig();
      const match = new MatchSession(matchConfig, playerA, playerB);
      const ctxA = clients.get(playerA.socket);
      const ctxB = clients.get(playerB.socket);
      if (ctxA) {
        ctxA.match = match;
      }
      if (ctxB) {
        ctxB.match = match;
      }

      send(playerA.socket, {
        type: "match_started",
        matchId: match.matchId,
        playerSlot: "A",
        opponentName: playerB.displayName,
        matchConfig: {
          roundsToWin: matchConfig.roundsToWin,
          roundPool: matchConfig.roundPool,
        },
      });

      send(playerB.socket, {
        type: "match_started",
        matchId: match.matchId,
        playerSlot: "B",
        opponentName: playerA.displayName,
        matchConfig: {
          roundsToWin: matchConfig.roundsToWin,
          roundPool: matchConfig.roundPool,
        },
      });

      match.start();
      break;
    }

    case "player_state": {
      if (!ctx.match || !ctx.slot) {
        send(socket, {
          type: "error",
          code: "not_in_match",
          message: "Join a match before sending player state",
        });
        return;
      }

      const position = message.position;
      const rotation = message.rotation;
      if (
        !Array.isArray(position) ||
        !Array.isArray(rotation) ||
        position.length !== 3 ||
        rotation.length !== 3
      ) {
        return;
      }

      ctx.match.updatePlayerState(
        ctx.slot,
        position as [number, number, number],
        rotation as [number, number, number],
        Boolean(message.aiming),
      );
      break;
    }

    case "photo_attempt": {
      if (!ctx.match || !ctx.slot) {
        send(socket, {
          type: "error",
          code: "not_in_match",
          message: "Join a match before taking a photo",
        });
        return;
      }

      const cameraPosition = message.cameraPosition;
      const cameraRotation = message.cameraRotation;
      const fovDeg = typeof message.fovDeg === "number" ? message.fovDeg : 60;
      const aspectRatio =
        typeof message.aspectRatio === "number" && message.aspectRatio > 0
          ? message.aspectRatio
          : 16 / 9;

      if (
        !Array.isArray(cameraPosition) ||
        !Array.isArray(cameraRotation) ||
        cameraPosition.length !== 3 ||
        cameraRotation.length !== 3
      ) {
        return;
      }

      ctx.match.handlePhotoAttempt(
        ctx.slot,
        cameraPosition as [number, number, number],
        cameraRotation as [number, number, number],
        fovDeg,
        Boolean(message.aiming),
        aspectRatio,
      );
      break;
    }

    default:
      send(socket, {
        type: "error",
        code: "invalid_message",
        message: `Unknown message type: ${message.type}`,
      });
  }
}

httpServer.listen(PORT, HOST, () => {
  console.log(`PhotoSnipe server listening on ${HOST}:${PORT}`);
});
