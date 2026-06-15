import {
  DEFAULT_ROUND_ID,
  getArenaLayout,
  isValidRoundId,
  listArenaOptions,
  sanitizeRoundId,
} from "@photo-snipe/core";
import { getArenaUnlockRequirement, isArenaUnlocked as isArenaUnlockedByStats } from "../progression/stats.js";

const STORAGE_KEY = "photo-snipe-arena";

function loadRoundId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ROUND_ID;
    }
    const parsed = JSON.parse(raw) as { roundId?: unknown };
    return isValidRoundId(parsed.roundId) ? parsed.roundId : DEFAULT_ROUND_ID;
  } catch {
    return DEFAULT_ROUND_ID;
  }
}

let cachedRoundId = loadRoundId();

export function getRoundId(): string {
  return cachedRoundId;
}

export function setRoundId(roundId: string): void {
  if (!isValidRoundId(roundId)) {
    return;
  }
  cachedRoundId = roundId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ roundId }));
}

export function getRoundName(roundId = getRoundId()): string {
  return getArenaLayout(roundId).name;
}

export function getArenaChoices(): Array<{ id: string; name: string }> {
  return listArenaOptions();
}

export function isArenaUnlocked(roundId: string): boolean {
  return isArenaUnlockedByStats(roundId);
}

export { getArenaUnlockRequirement };

export { sanitizeRoundId };
