import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { loadMatchConfig } from "./data-loader.js";
import { LobbyManager, type LobbyPlayer } from "./lobby.js";
import { MatchSession } from "./match-session.js";
import { RematchManager } from "./rematch.js";
import { serveWebClient, webClientAvailable } from "./static.js";
import {
  PresenceRegistry,
  type PresenceStatus,
} from "./social-presence.js";
import type { PlayerSlot } from "@photo-snipe/core";
import { getArenaLayout, sanitizeRoundId, sanitizeSkinId } from "@photo-snipe/core";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "0.0.0.0";

interface ClientContext {
  clientId: string;
  roomCode?: string;
  slot?: PlayerSlot;
  match?: MatchSession;
}

const lobby = new LobbyManager();
const rematch = new RematchManager();
const presence = new PresenceRegistry();
const clients = new WeakMap<WebSocket, ClientContext>();
let activeMatchCount = 0;

function opponentSlot(slot: PlayerSlot): PlayerSlot {
  return slot === "A" ? "B" : "A";
}

function sendRematchStatus(roomCode: string): void {
  const session = rematch.get(roomCode);
  if (!session) {
    return;
  }
  for (const playerSlot of ["A", "B"] as const) {
    const player = session.players[playerSlot];
    const opponent = opponentSlot(playerSlot);
    const opponentPlayer = session.players[opponent];
    send(player.socket, {
      type: "rematch_status",
      youReady: session.votes[playerSlot] === true,
      opponentReady: session.votes[opponent] === true,
      opponentConnected:
        opponentPlayer?.socket.readyState === opponentPlayer.socket.OPEN,
    });
  }
}

function notifyOpponentLeft(
  roomCode: string,
  leftSlot: PlayerSlot,
  match?: MatchSession,
): void {
  const remainingSlot = opponentSlot(leftSlot);
  const rematchSession = rematch.get(roomCode);
  if (rematchSession) {
    const remaining = rematchSession.players[remainingSlot];
    const leaver = rematchSession.players[leftSlot];
    if (remaining) {
      send(remaining.socket, {
        type: "opponent_left",
        phase: "rematch",
        opponentName: leaver?.displayName ?? "Opponent",
      });
    }
    return;
  }

  if (match && match.getPhase() !== "match_end") {
    const players = match.getPlayers();
    const remaining = players[remainingSlot];
    const leaver = players[leftSlot];
    if (remaining) {
      send(remaining.socket, {
        type: "opponent_left",
        phase: "match",
        opponentName: leaver?.displayName ?? "Opponent",
      });
    }
  }
}

async function startMatch(
  playerA: LobbyPlayer,
  playerB: LobbyPlayer,
  roomCode: string,
  selectedRoundId: string,
): Promise<MatchSession> {
  const baseConfig = await loadMatchConfig();
  const roundId = sanitizeRoundId(selectedRoundId);
  const matchConfig = {
    ...baseConfig,
    roundPool: [roundId],
  };
  activeMatchCount++;
  const match = new MatchSession(matchConfig, playerA, playerB, () => {
    activeMatchCount = Math.max(0, activeMatchCount - 1);
    registerRematch(match, roomCode);
    clearMatchContext(match);
  });
  const ctxA = clients.get(playerA.socket);
  const ctxB = clients.get(playerB.socket);
  if (ctxA) {
    ctxA.match = match;
    ctxA.roomCode = roomCode;
  }
  if (ctxB) {
    ctxB.match = match;
    ctxB.roomCode = roomCode;
  }

  const roundName = getArenaLayout(roundId).name;

  send(playerA.socket, {
    type: "match_started",
    matchId: match.matchId,
    playerSlot: "A",
    opponentName: playerB.displayName,
    opponentSkinId: playerB.skinId,
    selectedRoundId: roundId,
    selectedRoundName: roundName,
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
    opponentSkinId: playerA.skinId,
    selectedRoundId: roundId,
    selectedRoundName: roundName,
    matchConfig: {
      roundsToWin: matchConfig.roundsToWin,
      roundPool: matchConfig.roundPool,
    },
  });

  match.start();
  const ctxAForPresence = clients.get(playerA.socket);
  const ctxBForPresence = clients.get(playerB.socket);
  if (ctxAForPresence) {
    updateConnectedPresence(ctxAForPresence, playerA.socket);
  }
  if (ctxBForPresence) {
    updateConnectedPresence(ctxBForPresence, playerB.socket);
  }
  return match;
}

function registerRematch(match: MatchSession, roomCode: string): void {
  rematch.register(roomCode, match.getPlayers());
}

function clearMatchContext(match: MatchSession): void {
  const players = match.getPlayers();
  for (const player of [players.A, players.B]) {
    const ctx = clients.get(player.socket);
    if (ctx) {
      ctx.match = undefined;
    }
  }
}

function send(socket: WebSocket, payload: Record<string, unknown>): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function resolvePresenceStatus(
  ctx: ClientContext,
  room?: ReturnType<LobbyManager["getRoom"]>,
): PresenceStatus {
  if (ctx.match) {
    return "in_match";
  }
  if (ctx.roomCode && ctx.slot === "A" && room && room.players.A && !room.players.B) {
    return "hosting";
  }
  if (ctx.roomCode) {
    return "in_match";
  }
  return "menu";
}

function syncClientPresence(
  socket: WebSocket,
  ctx: ClientContext,
  displayName: string,
): void {
  const room = ctx.roomCode ? lobby.getRoom(ctx.roomCode) : undefined;
  const status = resolvePresenceStatus(ctx, room);
  presence.register(ctx.clientId, socket, displayName, status, ctx.roomCode);
}

function updateConnectedPresence(ctx: ClientContext, socket: WebSocket): void {
  const existing = presence.get(ctx.clientId);
  if (!existing) {
    return;
  }
  const room = ctx.roomCode ? lobby.getRoom(ctx.roomCode) : undefined;
  presence.updateStatus(
    ctx.clientId,
    resolvePresenceStatus(ctx, room),
    ctx.roomCode,
  );
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
        connections: wss.clients.size,
        rooms: lobby.getRoomCount(),
        waitingRooms: lobby.getWaitingRoomCount(),
        activeMatches: activeMatchCount,
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

    if (ctx.roomCode && ctx.slot) {
      notifyOpponentLeft(ctx.roomCode, ctx.slot, ctx.match);
    }

    if (ctx.match && ctx.slot) {
      ctx.match.handleDisconnect(ctx.slot);
    }

    if (ctx.roomCode && ctx.slot) {
      rematch.setVote(ctx.roomCode, ctx.slot, false);
      sendRematchStatus(ctx.roomCode);
    }

    lobby.removePlayer(ctx.clientId);
    presence.remove(ctx.clientId);
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
      const skinId = sanitizeSkinId(message.skinId);
      const selectedRoundId = sanitizeRoundId(message.roundId);
      const room = lobby.createRoom(
        socket,
        ctx.clientId,
        displayName,
        skinId,
        selectedRoundId,
      );
      ctx.roomCode = room.code;
      ctx.slot = "A";
      syncClientPresence(socket, ctx, displayName);
      send(socket, {
        type: "room_created",
        roomCode: room.code,
        playerSlot: "A",
        selectedRoundId: room.selectedRoundId,
        selectedRoundName: getArenaLayout(room.selectedRoundId).name,
      });
      break;
    }

    case "join_room": {
      const roomCode =
        typeof message.roomCode === "string" ? message.roomCode : "";
      const displayName =
        typeof message.displayName === "string" ? message.displayName : "Player";
      const skinId = sanitizeSkinId(message.skinId);
      const joined = lobby.joinRoom(roomCode, socket, ctx.clientId, displayName, skinId);

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
      syncClientPresence(socket, ctx, displayName);

      send(socket, {
        type: "room_joined",
        roomCode: joined.room.code,
        playerSlot: joined.slot,
        selectedRoundId: joined.room.selectedRoundId,
        selectedRoundName: getArenaLayout(joined.room.selectedRoundId).name,
      });

      const playerA = joined.room.players.A;
      const playerB = joined.room.players.B;
      if (!playerA || !playerB) {
        return;
      }

      await startMatch(playerA, playerB, joined.room.code, joined.room.selectedRoundId);
      break;
    }

    case "rematch_request": {
      if (!ctx.roomCode || !ctx.slot) {
        send(socket, {
          type: "error",
          code: "not_in_room",
          message: "Finish a match before requesting a rematch",
        });
        return;
      }

      const session = rematch.setVote(ctx.roomCode, ctx.slot, true);
      if (!session) {
        send(socket, {
          type: "error",
          code: "rematch_unavailable",
          message: "Rematch is not available for this room",
        });
        return;
      }

      sendRematchStatus(ctx.roomCode);

      if (rematch.bothReady(session)) {
        rematch.clear(ctx.roomCode);
        const room = lobby.getRoom(ctx.roomCode);
        const selectedRoundId = room?.selectedRoundId ?? sanitizeRoundId(undefined);
        await startMatch(session.players.A, session.players.B, ctx.roomCode, selectedRoundId);
      }
      break;
    }

    case "return_to_menu": {
      if (ctx.roomCode && ctx.slot) {
        rematch.setVote(ctx.roomCode, ctx.slot, false);
        sendRematchStatus(ctx.roomCode);
      }
      ctx.match = undefined;
      ctx.roomCode = undefined;
      ctx.slot = undefined;
      const existing = presence.get(ctx.clientId);
      if (existing) {
        presence.updateStatus(ctx.clientId, "menu");
      }
      send(socket, { type: "returned_to_menu" });
      break;
    }

    case "set_presence": {
      const displayName =
        typeof message.displayName === "string" ? message.displayName : "Player";
      syncClientPresence(socket, ctx, displayName);
      send(socket, {
        type: "presence_registered",
        displayName: displayName.trim() || "Player",
      });
      break;
    }

    case "get_presence": {
      const names = Array.isArray(message.names)
        ? message.names.filter((name): name is string => typeof name === "string")
        : [];
      send(socket, {
        type: "presence_snapshot",
        entries: presence.getPresenceForNames(names),
      });
      break;
    }

    case "send_friend_invite": {
      const targetName =
        typeof message.targetName === "string" ? message.targetName : "";
      if (!targetName.trim()) {
        send(socket, {
          type: "error",
          code: "invalid_target",
          message: "Enter a friend name to invite",
        });
        break;
      }
      if (!ctx.roomCode || ctx.slot !== "A") {
        send(socket, {
          type: "error",
          code: "not_hosting",
          message: "Host a room before inviting friends",
        });
        break;
      }

      const room = lobby.getRoom(ctx.roomCode);
      if (!room || room.players.B) {
        send(socket, {
          type: "error",
          code: "room_not_joinable",
          message: "Your room is no longer waiting for an opponent",
        });
        break;
      }

      const host = presence.get(ctx.clientId);
      const target = presence.findByName(targetName);
      if (!target) {
        send(socket, {
          type: "error",
          code: "friend_offline",
          message: `${targetName.trim()} is not online`,
        });
        break;
      }

      send(target.socket, {
        type: "friend_invite",
        fromName: host?.displayName ?? "Friend",
        roomCode: ctx.roomCode,
        arenaName: getArenaLayout(room.selectedRoundId).name,
      });
      send(socket, {
        type: "friend_invite_sent",
        targetName: target.displayName,
      });
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
