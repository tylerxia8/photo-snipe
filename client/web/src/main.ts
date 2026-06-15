import { Game } from "./game/game.js";
import { TransportRouter } from "./game/match-transport.js";
import { NetClient } from "./net/client.js";
import type { ServerMessage } from "./net/client.js";
import { PracticeMatch } from "./practice/practice-match.js";
import { initShopSettings, type ShopSettingsHandle } from "./shop/shop-settings.js";
import { awardMatchCredits, subscribeShop } from "./shop/inventory.js";
import { initProgressionUi } from "./progression/progression-ui.js";
import {
  getProgressionState,
  getRank,
  recordMatchResult,
} from "./progression/stats.js";
import { getControlsHint } from "./settings/keybinds.js";
import { initKeybindSettings } from "./settings/keybind-settings.js";
import { getSkinId } from "./settings/appearance.js";
import { initAppearanceSettings, updateOperatorPreview } from "./settings/appearance-settings.js";
import {
  getArenaChoices,
  getRoundId,
  getRoundName,
  isArenaUnlocked,
  setRoundId,
} from "./settings/arena-settings.js";
import { initSocialSettings, type SocialSettingsHandle } from "./social/social-settings.js";
import { getFriends } from "./social/friends.js";
import { applyPresenceSnapshot, type FriendPresence } from "./social/presence.js";
import { parseMatchReplay, playMatchReplay } from "./replay/replay-player.js";

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
const socialPanel = document.getElementById("social-panel")!;
const shopPanel = document.getElementById("shop-panel")!;
const controlsHint = document.getElementById("controls-hint")!;
const navPlay = document.querySelector('[data-nav="play"]')!;
const navSettings = document.querySelector('[data-nav="settings"]')!;
const navSocial = document.querySelector('[data-nav="social"]')!;
const navShop = document.querySelector('[data-nav="shop"]')!;
const arenaSelect = document.getElementById("arena-select") as HTMLSelectElement;
const arenaPreviewName = document.getElementById("arena-preview-name")!;
const friendInviteBanner = document.getElementById("friend-invite-banner")!;
const friendInviteFrom = document.getElementById("friend-invite-from")!;
const friendInviteDetail = document.getElementById("friend-invite-detail")!;
const friendInviteJoin = document.getElementById("friend-invite-join") as HTMLButtonElement;
const friendInviteDismiss = document.getElementById("friend-invite-dismiss") as HTMLButtonElement;
const replayOverlay = document.getElementById("replay-overlay")!;
const replayWinnerEl = document.getElementById("replay-winner")!;

const mount = document.getElementById("app")!;
const net = new NetClient();
const transportRouter = new TransportRouter();
transportRouter.current = net;
let game: Game | null = null;
let practiceMatch: PracticeMatch | null = null;
let inPractice = false;
let currentMatchRoundId = getRoundId();
let waitingForOpponent = false;
let presencePollTimer: ReturnType<typeof setInterval> | null = null;
let presenceDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingFriendInvite: { roomCode: string } | null = null;
let replayPlaying = false;

const replayOverlayApi = {
  show: (winnerName: string) => {
    replayWinnerEl.textContent = winnerName;
    replayOverlay.classList.remove("hidden");
  },
  hide: () => {
    replayOverlay.classList.add("hidden");
  },
};

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

type LobbyTab = "play" | "settings" | "social" | "shop";

function syncPresence(): void {
  net.setPresence(displayName());
}

function refreshSocialPresence(): void {
  const names = getFriends().map((friend) => friend.name);
  if (names.length > 0) {
    net.getPresence(names);
  }
}

function startPresencePolling(): void {
  stopPresencePolling();
  refreshSocialPresence();
  presencePollTimer = setInterval(refreshSocialPresence, 10_000);
}

function stopPresencePolling(): void {
  if (presencePollTimer) {
    clearInterval(presencePollTimer);
    presencePollTimer = null;
  }
}

function canSendInvite(): boolean {
  return waitingForOpponent && roomInput.value.trim().length === 4;
}

function hideFriendInvite(): void {
  friendInviteBanner.classList.add("hidden");
  pendingFriendInvite = null;
}

function showFriendInvite(fromName: string, roomCode: string, arenaName: string): void {
  const code = roomCode.trim().toUpperCase();
  if (code.length !== 4) {
    return;
  }

  pendingFriendInvite = { roomCode: code };
  friendInviteFrom.textContent = `${fromName} invited you`;
  friendInviteDetail.textContent = `${arenaName} · room ${code}`;
  friendInviteBanner.classList.remove("hidden");

  if (!lobby.classList.contains("hidden")) {
    setStatus(`${fromName} invited you to a match.`);
  }
}

function setLobbyTab(tab: LobbyTab): void {
  playPanel.classList.toggle("hidden", tab !== "play");
  settingsPanel.classList.toggle("hidden", tab !== "settings");
  socialPanel.classList.toggle("hidden", tab !== "social");
  shopPanel.classList.toggle("hidden", tab !== "shop");
  navPlay.classList.toggle("active", tab === "play");
  navSettings.classList.toggle("active", tab === "settings");
  navSocial.classList.toggle("active", tab === "social");
  navShop.classList.toggle("active", tab === "shop");
  if (tab === "settings") {
    settingsPanel.scrollTop = 0;
  }
  if (tab === "social") {
    socialPanel.scrollTop = 0;
    socialSettings.refreshInviteCode();
    socialSettings.refreshFriends();
    startPresencePolling();
  } else {
    stopPresencePolling();
  }
  if (tab === "shop") {
    shopPanel.scrollTop = 0;
    shopSettings.refresh();
  }
}

function updateArenaPreview(roundId = getRoundId()): void {
  arenaPreviewName.textContent = getRoundName(roundId);
}

function setArenaSelectEnabled(enabled: boolean): void {
  arenaSelect.disabled = !enabled;
}

function populateArenaSelect(): void {
  arenaSelect.replaceChildren();
  for (const arena of getArenaChoices()) {
    const option = document.createElement("option");
    option.value = arena.id;
    const unlocked = isArenaUnlocked(arena.id);
    option.textContent = unlocked ? arena.name : `${arena.name} (locked)`;
    option.disabled = !unlocked;
    arenaSelect.append(option);
  }

  if (!isArenaUnlocked(getRoundId())) {
    const firstUnlocked = getArenaChoices().find((arena) => isArenaUnlocked(arena.id));
    if (firstUnlocked) {
      setRoundId(firstUnlocked.id);
    }
  }

  arenaSelect.value = getRoundId();
  updateArenaPreview();
}

function initArenaSelect(): void {
  populateArenaSelect();
  arenaSelect.addEventListener("change", () => {
    if (!isArenaUnlocked(arenaSelect.value)) {
      arenaSelect.value = getRoundId();
      setStatus("Win more matches to unlock that arena.");
      return;
    }
    setRoundId(arenaSelect.value);
    updateArenaPreview();
  });
}

function refreshArenaSelect(): void {
  const selected = getRoundId();
  populateArenaSelect();
  if (isArenaUnlocked(selected)) {
    setRoundId(selected);
    arenaSelect.value = selected;
    updateArenaPreview(selected);
  }
}

function showLobby(): void {
  lobby.classList.remove("hidden");
  hud.classList.add("hidden");
  postMatch.classList.add("hidden");
  resetRematchUi();
  setLobbyTab("play");
  waitingForOpponent = false;
  inPractice = false;
  practiceMatch?.stop();
  practiceMatch = null;
  transportRouter.current = net;
  setArenaSelectEnabled(true);
  refreshArenaSelect();
  socialSettings.refreshFriends();
  replayOverlayApi.hide();
  if (pendingFriendInvite) {
    friendInviteBanner.classList.remove("hidden");
  }
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

let progressionUi: { refresh: () => void };
let shopSettings: ShopSettingsHandle;

function showPostMatch(msg: ServerMessage): void {
  const didWin = Boolean(msg.didWin);
  const winnerName = String(msg.winnerName ?? "Unknown");
  const forfeit = msg.reason === "forfeit";
  const mode = String(msg.mode ?? (inPractice ? "practice" : "online"));
  const roundId = String(msg.roundId ?? currentMatchRoundId);
  const winsBefore = getProgressionState().totalWins;
  const rankBefore = getRank(winsBefore);

  recordMatchResult({
    mode: mode === "practice" ? "practice" : "online",
    didWin,
    roundId,
  });
  const creditsEarned = awardMatchCredits({
    mode: mode === "practice" ? "practice" : "online",
    didWin,
  });
  progressionUi.refresh();
  shopSettings.refresh();
  refreshArenaSelect();

  const rankAfter = getRank(getProgressionState().totalWins);

  postMatchTitle.textContent = didWin ? "Victory" : "Defeat";
  if (forfeit && didWin) {
    postMatchSubtitle.textContent = "Opponent left — you win!";
  } else if (forfeit) {
    postMatchSubtitle.textContent = "You left the match.";
  } else if (didWin && rankAfter.id !== rankBefore.id) {
    postMatchSubtitle.textContent = `Promoted to ${rankAfter.name}! +${creditsEarned} CR`;
  } else if (didWin) {
    postMatchSubtitle.textContent =
      mode === "practice"
        ? `Training bot down. Rank: ${rankAfter.name}. +${creditsEarned} CR`
        : `You win! +${creditsEarned} CR`;
  } else {
    postMatchSubtitle.textContent =
      mode === "practice"
        ? `${winnerName} wins. +${creditsEarned} CR earned.`
        : `${winnerName} wins! +${creditsEarned} CR earned.`;
  }

  resetRematchUi();
  rematchBtn.textContent = mode === "practice" ? "PLAY AGAIN" : "REMATCH";
  postMatch.classList.remove("hidden");
  hudApi().setMessage("");
}

async function handleMatchEnded(msg: ServerMessage): Promise<void> {
  game?.endMatch();

  const replay = parseMatchReplay(msg.replay);
  const reason = String(msg.reason ?? "");
  if (replay && reason === "valid_capture" && game) {
    replayPlaying = true;
    hud.classList.remove("hidden");
    lobby.classList.add("hidden");
    await playMatchReplay(replay, game, replayOverlayApi, hudApi());
    replayPlaying = false;
  }

  showPostMatch(msg);
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

const socialSettings: SocialSettingsHandle = initSocialSettings({
  getRoomCode: () => roomInput.value,
  canSendInvite: () => canSendInvite(),
  onGoToPlay: () => setLobbyTab("play"),
  onInviteFriend: (name) => net.sendFriendInvite(name),
  refreshPresence: refreshSocialPresence,
});

function ensureGame(): Game {
  if (!game) {
    game = new Game(transportRouter, hudApi(), mount);
  }
  return game;
}

async function startPractice(): Promise<void> {
  if (waitingForOpponent || inPractice) {
    return;
  }

  const roundId = getRoundId();
  if (!isArenaUnlocked(roundId)) {
    setStatus("Win more matches to unlock that arena.");
    return;
  }

  inPractice = true;
  practiceMatch = new PracticeMatch(processServerMessage, ensureGame());
  transportRouter.current = practiceMatch;
  hidePostMatch();

  try {
    await practiceMatch.start(roundId);
  } catch {
    inPractice = false;
    practiceMatch = null;
    transportRouter.current = net;
    setStatus("Could not start practice match.");
  }
}

function processServerMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case "connected":
      syncPresence();
      refreshSocialPresence();
      break;
    case "presence_snapshot":
      applyPresenceSnapshot((msg.entries as FriendPresence[] | undefined) ?? []);
      break;
    case "friend_invite":
      showFriendInvite(
        String(msg.fromName ?? "Friend"),
        String(msg.roomCode ?? ""),
        String(msg.arenaName ?? "Unknown arena"),
      );
      break;
    case "friend_invite_sent":
      socialSettings.setStatus(`Invite sent to ${String(msg.targetName)}.`);
      break;
    case "room_created": {
      const arenaName = String(msg.selectedRoundName ?? getRoundName());
      const code = String(msg.roomCode ?? "").toUpperCase();
      waitingForOpponent = true;
      setArenaSelectEnabled(false);
      if (code) {
        roomInput.value = code;
      }
      socialSettings.refreshInviteCode();
      socialSettings.refreshFriends();
      setStatus(`Room created on ${arenaName}! Code: ${code} — waiting for opponent…`);
      break;
    }
    case "room_joined": {
      const arenaName = String(msg.selectedRoundName ?? "the selected arena");
      const code = String(msg.roomCode ?? "").toUpperCase();
      if (code) {
        roomInput.value = code;
      }
      socialSettings.refreshInviteCode();
      setStatus(`Joined room ${code} — arena: ${arenaName}`);
      break;
    }
    case "match_started":
      hidePostMatch();
      lobby.classList.add("hidden");
      hud.classList.remove("hidden");
      currentMatchRoundId = String(msg.selectedRoundId ?? getRoundId());
      ensureGame().setOpponentSkin(msg.opponentSkinId);
      setStatus(
        msg.mode === "practice"
          ? "Practice vs Training Bot"
          : `Match vs ${String(msg.opponentName)}`,
      );
      break;
    case "round_started": {
      const round = msg.round as { id?: string; name?: string };
      const spawn = msg.yourSpawn as { position: number[]; rotation: number[] };
      const opponentSpawn = msg.opponentSpawn as { position: number[]; rotation: number[] };
      game?.startRound(
        String(round?.id ?? "warehouse-interior-01"),
        spawn,
        opponentSpawn,
        String(round?.name ?? "Round"),
      );
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
      void handleMatchEnded(msg);
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
    case "error": {
      const code = String(msg.code);
      const message = String(msg.message);
      setStatus(`${code}: ${message}`);
      if (
        code === "not_hosting" ||
        code === "friend_offline" ||
        code === "room_not_joinable" ||
        code === "invalid_target"
      ) {
        socialSettings.setStatus(message);
      }
      break;
    }
  }
}

net.onStatus = setStatus;
net.onMessage = processServerMessage;

document.getElementById("create-btn")!.addEventListener("click", () => {
  if (waitingForOpponent || inPractice) {
    return;
  }
  net.createRoom(displayName(), getSkinId(), getRoundId());
});

document.getElementById("join-btn")!.addEventListener("click", () => {
  const code = roomInput.value.trim().toUpperCase();
  if (!code) {
    setStatus("Enter a room code");
    return;
  }
  net.joinRoom(code, displayName(), getSkinId());
});

document.getElementById("practice-btn")!.addEventListener("click", () => {
  void startPractice();
});

rematchBtn.addEventListener("click", () => {
  if (inPractice && practiceMatch) {
    hidePostMatch();
    void practiceMatch.restart();
    return;
  }
  net.requestRematch();
});

menuBtn.addEventListener("click", () => {
  if (inPractice) {
    practiceMatch?.stop();
    inPractice = false;
    practiceMatch = null;
    transportRouter.current = net;
    game?.endMatch();
    showLobby();
    return;
  }
  net.returnToMenu();
  showLobby();
});

friendInviteJoin.addEventListener("click", () => {
  if (!pendingFriendInvite) {
    return;
  }
  roomInput.value = pendingFriendInvite.roomCode;
  hideFriendInvite();
  setLobbyTab("play");
  net.joinRoom(pendingFriendInvite.roomCode, displayName(), getSkinId());
});

friendInviteDismiss.addEventListener("click", hideFriendInvite);

nameInput.addEventListener("input", () => {
  if (presenceDebounceTimer) {
    clearTimeout(presenceDebounceTimer);
  }
  presenceDebounceTimer = setTimeout(() => {
    syncPresence();
    refreshSocialPresence();
  }, 400);
});

let last = performance.now();
function frame(now: number): void {
  const delta = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!replayPlaying) {
    practiceMatch?.tick(delta);
    game?.tick(delta);
  }
  requestAnimationFrame(frame);
}

net.connect();
initArenaSelect();
initKeybindSettings(updateControlsHint);
initAppearanceSettings();
updateOperatorPreview();
updateControlsHint();
const progressionUiInstance = initProgressionUi();
progressionUi = progressionUiInstance;
shopSettings = initShopSettings();
subscribeShop(() => refreshArenaSelect());

navPlay.addEventListener("click", () => setLobbyTab("play"));
navSettings.addEventListener("click", () => setLobbyTab("settings"));
navSocial.addEventListener("click", () => setLobbyTab("social"));
navShop.addEventListener("click", () => setLobbyTab("shop"));

requestAnimationFrame(frame);
