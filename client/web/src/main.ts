import { Game } from "./game/game.js";
import { NetClient } from "./net/client.js";
import type { ServerMessage } from "./net/client.js";

const lobby = document.getElementById("lobby")!;
const hud = document.getElementById("hud")!;
const crosshair = document.getElementById("crosshair")!;
const flash = document.getElementById("flash")!;
const statusEl = document.getElementById("status")!;
const headerStatusEl = document.getElementById("header-status")!;
const nameInput = document.getElementById("name-input") as HTMLInputElement;
const roomInput = document.getElementById("room-input") as HTMLInputElement;
const messageEl = document.getElementById("message")!;
const roundNameEl = document.getElementById("round-name")!;
const postMatch = document.getElementById("post-match")!;
const postMatchTitle = document.getElementById("post-match-title")!;
const postMatchSubtitle = document.getElementById("post-match-subtitle")!;
const rematchHint = document.getElementById("rematch-hint")!;
const rematchBtn = document.getElementById("rematch-btn") as HTMLButtonElement;
const menuBtn = document.getElementById("menu-btn") as HTMLButtonElement;

const mount = document.getElementById("app")!;
const net = new NetClient();
let game: Game | null = null;

function setStatus(text: string): void {
  statusEl.textContent = text;
  headerStatusEl.textContent = text;
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

function showLobby(): void {
  lobby.classList.remove("hidden");
  hud.classList.add("hidden");
  postMatch.classList.add("hidden");
  resetRematchUi();
}

function hidePostMatch(): void {
  postMatch.classList.add("hidden");
  resetRematchUi();
}

function resetRematchUi(): void {
  rematchBtn.disabled = false;
  rematchBtn.textContent = "REMATCH";
  rematchHint.textContent = "";
}

function showPostMatch(msg: ServerMessage): void {
  const didWin = Boolean(msg.didWin);
  const winnerName = String(msg.winnerName ?? "Unknown");

  postMatchTitle.textContent = didWin ? "Victory" : "Defeat";
  postMatchSubtitle.textContent = didWin
    ? "You win!"
    : `${winnerName} wins!`;

  resetRematchUi();
  postMatch.classList.remove("hidden");
  hudApi().setMessage("");
}

function updateRematchStatus(msg: ServerMessage): void {
  const youReady = Boolean(msg.youReady);
  const opponentReady = Boolean(msg.opponentReady);

  if (youReady) {
    rematchBtn.textContent = "WAITING…";
    rematchBtn.disabled = true;
  } else {
    rematchBtn.textContent = "REMATCH";
    rematchBtn.disabled = false;
  }

  if (youReady && opponentReady) {
    rematchHint.textContent = "Starting rematch…";
  } else if (youReady) {
    rematchHint.textContent = "Waiting for opponent…";
  } else if (opponentReady) {
    rematchHint.textContent = "Opponent wants a rematch!";
  } else {
    rematchHint.textContent = "";
  }
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
      hidePostMatch();
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
      postMatch.classList.add("hidden");
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
      showPostMatch(msg);
      break;
    case "rematch_status":
      updateRematchStatus(msg);
      break;
    case "returned_to_menu":
      showLobby();
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

rematchBtn.addEventListener("click", () => {
  net.requestRematch();
});

menuBtn.addEventListener("click", () => {
  net.returnToMenu();
  showLobby();
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
