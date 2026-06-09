import { Game } from "./game/game.js";
import { NetClient } from "./net/client.js";
import type { ServerMessage } from "./net/client.js";

const lobby = document.getElementById("lobby")!;
const hud = document.getElementById("hud")!;
const crosshair = document.getElementById("crosshair")!;
const flash = document.getElementById("flash")!;
const statusEl = document.getElementById("status")!;
const nameInput = document.getElementById("name-input") as HTMLInputElement;
const roomInput = document.getElementById("room-input") as HTMLInputElement;
const messageEl = document.getElementById("message")!;
const roundNameEl = document.getElementById("round-name")!;

const mount = document.getElementById("app")!;
const net = new NetClient();
let game: Game | null = null;

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function displayName(): string {
  return nameInput.value.trim() || "Player";
}

function hudApi() {
  return {
    setMessage: (text: string) => { messageEl.textContent = text; },
    setRoundName: (text: string) => { roundNameEl.textContent = text; },
    flash: () => {
      flash.classList.remove("hidden");
      flash.classList.add("active");
      setTimeout(() => flash.classList.remove("active"), 150);
    },
    showCrosshair: () => {
      crosshair.classList.remove("hidden");
    },
    hideCrosshair: () => {
      crosshair.classList.add("hidden");
    },
  };
}

net.onStatus = setStatus;
net.onMessage = (msg: ServerMessage) => {
  switch (msg.type) {
    case "room_created":
      setStatus(`Room created! Code: ${String(msg.roomCode)} — waiting for opponent…`);
      break;
    case "room_joined":
      setStatus(`Joined room ${String(msg.roomCode)}`);
      break;
    case "match_started":
      lobby.classList.add("hidden");
      hud.classList.remove("hidden");
      if (!game) {
        game = new Game(net, hudApi(), mount);
      }
      setStatus(`Match vs ${String(msg.opponentName)}`);
      break;
    case "round_started": {
      const round = msg.round as { name?: string };
      const spawn = msg.yourSpawn as { position: number[]; rotation: number[] };
      const opponentSpawn = msg.opponentSpawn as { position: number[]; rotation: number[] };
      game?.startRound(spawn, opponentSpawn, String(round?.name ?? "Round"));
      lobby.classList.add("hidden");
      hud.classList.remove("hidden");
      break;
    }
    case "opponent_state":
      game?.updateOpponent(
        msg.position as number[],
        msg.rotation as number[],
      );
      break;
    case "photo_exposure":
      hudApi().flash();
      hudApi().setMessage("You heard a shutter nearby!");
      break;
    case "photo_result":
      if (msg.valid) {
        hudApi().setMessage("Valid capture!");
      } else {
        hudApi().setMessage("Miss");
      }
      break;
    case "match_ended":
      game?.endMatch();
      hudApi().setMessage(`Match over! Winner: ${String(msg.winnerSlot)}`);
      break;
    case "error":
      setStatus(`${String(msg.code)}: ${String(msg.message)}`);
      break;
  }
};

document.getElementById("create-btn")!.addEventListener("click", () => {
  net.createRoom(displayName());
});

document.getElementById("join-btn")!.addEventListener("click", () => {
  const code = roomInput.value.trim().toUpperCase();
  if (!code) {
    setStatus("Enter a room code");
    return;
  }
  net.joinRoom(code, displayName());
});

let last = performance.now();
function frame(now: number): void {
  const delta = Math.min((now - last) / 1000, 0.05);
  last = now;
  game?.tick(delta);
  requestAnimationFrame(frame);
}

net.connect();
requestAnimationFrame(frame);
