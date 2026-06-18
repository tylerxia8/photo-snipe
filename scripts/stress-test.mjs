#!/usr/bin/env node
/**
 * PhotoSnipe concurrent match stress test.
 *
 * Creates N simultaneous 1v1 rooms (2N WebSocket connections), verifies
 * match_started for every pair, and sends player_state at 20 Hz for a short window.
 *
 * Usage:
 *   node scripts/stress-test.mjs [--url ws://localhost:8787] [--rooms 50] [--duration 10]
 */

import WebSocket from "ws";

const args = process.argv.slice(2);

function readArg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) {
    return fallback;
  }
  return args[idx + 1];
}

const baseUrl = readArg("--url", "ws://localhost:8787");
const roomTarget = Number(readArg("--rooms", "50"));
const durationSec = Number(readArg("--duration", "10"));
const tickHz = 20;

function httpHealthUrl(wsUrl) {
  const url = new URL(wsUrl.replace(/^ws/i, "http"));
  return `${url.origin}/health`;
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error("connection timeout"));
    }, 10_000);

    ws.once("open", () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForMessage(ws, predicate, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off("message", onMessage);
      reject(new Error("message timeout"));
    }, timeoutMs);

    function onMessage(raw) {
      try {
        const msg = JSON.parse(raw.toString());
        if (predicate(msg)) {
          clearTimeout(timer);
          ws.off("message", onMessage);
          resolve(msg);
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.on("message", onMessage);
  });
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

async function createRoomPair(index) {
  const hostWs = await connect(baseUrl);
  await waitForMessage(hostWs, (m) => m.type === "connected");
  send(hostWs, {
    type: "create_room",
    displayName: `Host-${index}`,
    roundId: "warehouse-interior-01",
    skinId: "default",
  });
  const created = await waitForMessage(hostWs, (m) => m.type === "room_created");

  const hostMatchStarted = waitForMessage(hostWs, (m) => m.type === "match_started");

  const guestWs = await connect(baseUrl);
  await waitForMessage(guestWs, (m) => m.type === "connected");
  send(guestWs, {
    type: "join_room",
    roomCode: created.roomCode,
    displayName: `Guest-${index}`,
    skinId: "default",
  });
  await waitForMessage(guestWs, (m) => m.type === "room_joined");
  await waitForMessage(guestWs, (m) => m.type === "match_started");
  await hostMatchStarted;

  return { host: hostWs, guest: guestWs, roomCode: created.roomCode };
}

function startPlayerStateLoop(ws, slot) {
  const offset = slot === "A" ? -10 : 10;
  let tick = 0;
  const interval = setInterval(() => {
    tick++;
    send(ws, {
      type: "player_state",
      position: [offset, 0, tick * 0.05],
      rotation: [0, 0, 0],
      aiming: tick % 40 === 0,
    });
  }, 1000 / tickHz);
  return interval;
}

async function main() {
  console.log(`PhotoSnipe stress test`);
  console.log(`  URL:      ${baseUrl}`);
  console.log(`  Rooms:    ${roomTarget} (${roomTarget * 2} connections)`);
  console.log(`  Duration: ${durationSec}s @ ${tickHz} Hz state sync\n`);

  const healthBefore = await fetch(httpHealthUrl(baseUrl)).then((r) => r.json());
  console.log("Health before:", healthBefore);

  const startedAt = Date.now();
  const pairs = [];
  const errors = [];

  for (let i = 0; i < roomTarget; i++) {
    try {
      const pair = await createRoomPair(i);
      pairs.push(pair);
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`  ${i + 1}/${roomTarget} rooms ready\r`);
      }
    } catch (err) {
      errors.push({ room: i, error: err.message });
      break;
    }
  }

  console.log(`\nRooms established: ${pairs.length}/${roomTarget}`);
  if (errors.length) {
    console.log("Setup errors:", errors);
  }

  const healthPeak = await fetch(httpHealthUrl(baseUrl)).then((r) => r.json());
  console.log("Health at peak:", healthPeak);

  const intervals = [];
  for (const pair of pairs) {
    intervals.push(startPlayerStateLoop(pair.host, "A"));
    intervals.push(startPlayerStateLoop(pair.guest, "B"));
  }

  await new Promise((r) => setTimeout(r, durationSec * 1000));

  for (const id of intervals) {
    clearInterval(id);
  }

  let openCount = 0;
  for (const pair of pairs) {
    if (pair.host.readyState === WebSocket.OPEN) openCount++;
    if (pair.guest.readyState === WebSocket.OPEN) openCount++;
    pair.host.close();
    pair.guest.close();
  }

  await new Promise((r) => setTimeout(r, 500));
  const healthAfter = await fetch(httpHealthUrl(baseUrl)).then((r) => r.json());
  const elapsedMs = Date.now() - startedAt;

  const result = {
    targetRooms: roomTarget,
    establishedRooms: pairs.length,
    expectedConnections: pairs.length * 2,
    openConnectionsAfterLoad: openCount,
    setupErrors: errors,
    durationSec,
    elapsedMs,
    healthBefore,
    healthPeak,
    healthAfter,
    passed:
      pairs.length === roomTarget &&
      errors.length === 0 &&
      openCount === pairs.length * 2,
  };

  console.log("\nResult:", JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
