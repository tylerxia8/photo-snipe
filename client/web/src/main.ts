import { Game } from "./game/game.js";
import { NetClient } from "./net/client.js";
import type { ServerMessage } from "./net/client.js";
import { getControlsHint } from "./settings/keybinds.js";
import { initKeybindSettings } from "./settings/keybind-settings.js";
import { getSkinId } from "./settings/appearance.js";
import { initAppearanceSettings, updateOperatorPreview } from "./settings/appearance-settings.js";

const lobby = document.getElementById("lobby")!;
const hud = document.getElementById("hud")!;
const crosshair = document.getElementById("crosshair")!;
const cooldownRingProgress = crosshair.querySelector(
  ".cooldown-ring-progress",
) as SVGCircleElement;
const COOLDOWN_RING_CIRC = 125.66;
let readyPulseTimer: ReturnType<typeof setTimeout> | null = null;
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
const playPanel = document.getElementById("play-panel")!;
const settingsPanel = document.getElementById("settings-panel")!;
const controlsHint = document.getElementById("controls-hint")!;
const navPlay = document.querySelector('[data-nav="play"]')!;
const navSettings = document.querySelector('[data-nav="settings"]')!;

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
    setPhotoCooldown: (remainingFraction: number) => {
      if (readyPulseTimer) {
        clearTimeout(readyPulseTimer);
        readyPulseTimer = null;
      }

      if (remainingFraction <= 0) {
        crosshair.classList.remove("cooldown-active");
        cooldownRingProgress.style.strokeDashoffset = String(COOLDOWN_RING_CIRC);
        return;
      }

      crosshair.classList.remove("ready-pulse");
      crosshair.classList.add("cooldown-active");
      cooldownRingProgress.style.strokeDashoffset = String(
        COOLDOWN_RING_CIRC * (1 - remainingFraction),
      );
    },
    setPhotoReady: () => {
      crosshair.classList.remove("cooldown-active");
      cooldownRingProgress.style.strokeDashoffset = String(COOLDOWN_RING_CIRC);
      crosshair.classList.remove("ready-pulse");
      void crosshair.offsetWidth;
      crosshair.classList.add("ready-pulse");
      if (readyPulseTimer) clearTimeout(readyPulseTimer);
      readyPulseTimer = setTimeout(() => {
        crosshair.classList.remove("ready-pulse");
        readyPulseTimer = null;
      }, 450);
    },
    showCrosshair: () => {
      crosshair.classList.remove("hidden");
    },
    hideCrosshair: () => {
      crosshair.classList.add("hidden");
      crosshair.classList.remove("cooldown-active", "ready-pulse");
      cooldownRingProgress.style.strokeDashoffset = String(COOLDOWN_RING_CIRC);
      if (readyPulseTimer) {
        clearTimeout(readyPulseTimer);
        readyPulseTimer = null;
      }
    },
  };
}

function updateControlsHint(): void {
  controlsHint.textContent = getControlsHint();
}

function setLobbyTab(tab: "play" | "settings"): void {
  playPanel.classList.toggle("hidden", tab !== "play");
  settingsPanel.classList.toggle("hidden", tab !== "settings");
  navPlay.classList.toggle("active", tab === "play");
  navSettings.classList.toggle("active", tab === "settings");
}

function showLobby(): void {
  lobby.classList.remove("hidden");
  hud.classList.add("hidden");
  postMatch.classList.add("hidden");
  resetRematchUi();
  setLobbyTab("play");
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
  const forfeit = msg.reason === "forfeit";

  postMatchTitle.textContent = didWin ? "Victory" : "Defeat";
  if (forfeit && didWin) {
    postMatchSubtitle.textContent = "Opponent left — you win!";
  } else if (forfeit) {
    postMatchSubtitle.textContent = "You left the match.";
  } else {
    postMatchSubtitle.textContent = didWin
      ? "You win!"
      : `${winnerName} wins!`;
  }

  resetRematchUi();
  postMatch.classList.remove("hidden");
  hudApi().setMessage("");
}

function handleOpponentLeft(msg: ServerMessage): void {
  const name = String(msg.opponentName ?? "Opponent");
  const phase = String(msg.phase ?? "match");

  if (phase === "rematch") {
    rematchHint.textContent = `${name} left the game.`;
    rematchBtn.disabled = true;
    rematchBtn.textContent = "REMATCH";
    return;
  }

  if (phase === "match") {
    const message = `${name} left the match…`;
    hudApi().setMessage(message);
    setStatus(message);
    return;
  }

  if (phase === "lobby") {
    setStatus(`${name} left the room`);
  }
}

function updateRematchStatus(msg: ServerMessage): void {
  const youReady = Boolean(msg.youReady);
  const opponentReady = Boolean(msg.opponentReady);
  const opponentConnected = msg.opponentConnected !== false;

  if (!opponentConnected) {
    rematchHint.textContent = "Opponent left the game.";
    rematchBtn.textContent = "REMATCH";
    rematchBtn.disabled = true;
    return;
  }

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
      game.setOpponentSkin(msg.opponentSkinId);
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
      hudApi().setMessage("You heard a shutter nearby!");
      break;
    case "photo_result":
      if (msg.valid) {
        hudApi().setMessage("Valid capture!");
      } else if (msg.reason === "cooldown") {
        hudApi().setMessage("Camera cooling down…");
      } else {
        hudApi().setMessage("Miss");
      }
      break;
    case "round_ended":
      if (msg.reason === "forfeit") {
        hudApi().setMessage("Opponent left the match…");
      }
      break;
    case "match_ended":
      game?.endMatch();
      showPostMatch(msg);
      break;
    case "opponent_left":
      handleOpponentLeft(msg);
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
  net.createRoom(displayName(), getSkinId());
});

document.getElementById("join-btn")!.addEventListener("click", () => {
  const code = roomInput.value.trim().toUpperCase();
  if (!code) {
    setStatus("Enter a room code");
    return;
  }
  net.joinRoom(code, displayName(), getSkinId());
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
initKeybindSettings(updateControlsHint);
initAppearanceSettings();
updateOperatorPreview();
updateControlsHint();

navPlay.addEventListener("click", () => setLobbyTab("play"));
navSettings.addEventListener("click", () => setLobbyTab("settings"));

requestAnimationFrame(frame);
