import {
  DEFAULT_SKIN_ID,
  isValidSkinId,
  type PlayerSkinId,
} from "@photo-snipe/core";
import { isSkinOwned } from "../shop/inventory.js";

const STORAGE_KEY = "photo-snipe-appearance";

const listeners = new Set<() => void>();

function loadSkinId(): PlayerSkinId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SKIN_ID;
    }
    const parsed = JSON.parse(raw) as { skinId?: unknown };
    const skinId = isValidSkinId(parsed.skinId) ? parsed.skinId : DEFAULT_SKIN_ID;
    return isSkinOwned(skinId) ? skinId : DEFAULT_SKIN_ID;
  } catch {
    return DEFAULT_SKIN_ID;
  }
}

let cachedSkinId = loadSkinId();

export function getSkinId(): PlayerSkinId {
  return cachedSkinId;
}

export function setSkinId(skinId: PlayerSkinId): void {
  if (!isValidSkinId(skinId)) {
    return;
  }
  cachedSkinId = skinId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ skinId }));
  for (const listener of listeners) {
    listener();
  }
}

export function onSkinChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
