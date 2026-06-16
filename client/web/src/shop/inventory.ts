import type { PlayerSkinId } from "@photo-snipe/core";
import {
  computeMatchCredits,
  type MatchCreditBreakdown,
  type MatchPerformanceSnapshot,
} from "@photo-snipe/core";

const STORAGE_KEY = "photo-snipe-shop";

export interface ShopState {
  credits: number;
  ownedSkins: PlayerSkinId[];
  ownedArenaPasses: string[];
}

const listeners = new Set<() => void>();

function defaultState(): ShopState {
  return {
    credits: 0,
    ownedSkins: ["teal"],
    ownedArenaPasses: [],
  };
}

function normalizeSkinList(value: unknown): PlayerSkinId[] {
  if (!Array.isArray(value)) {
    return ["teal"];
  }
  const skins = value.filter(
    (entry): entry is PlayerSkinId => typeof entry === "string",
  );
  return skins.includes("teal") ? skins : ["teal", ...skins];
}

function loadState(): ShopState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw) as Partial<ShopState>;
    return {
      credits: typeof parsed.credits === "number" ? Math.max(0, parsed.credits) : 0,
      ownedSkins: normalizeSkinList(parsed.ownedSkins),
      ownedArenaPasses: Array.isArray(parsed.ownedArenaPasses)
        ? parsed.ownedArenaPasses.filter((entry): entry is string => typeof entry === "string")
        : [],
    };
  } catch {
    return defaultState();
  }
}

let cachedState = loadState();

function persist(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedState));
  for (const listener of listeners) {
    listener();
  }
}

export function getShopState(): ShopState {
  return structuredClone(cachedState);
}

export function getCredits(): number {
  return cachedState.credits;
}

export function subscribeShop(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addCredits(amount: number): void {
  if (amount <= 0) {
    return;
  }
  cachedState.credits += amount;
  persist();
}

export function isSkinOwned(skinId: PlayerSkinId): boolean {
  return cachedState.ownedSkins.includes(skinId);
}

export function isArenaPassOwned(arenaId: string): boolean {
  return cachedState.ownedArenaPasses.includes(arenaId);
}

export function getOwnedSkins(): PlayerSkinId[] {
  return [...cachedState.ownedSkins];
}

export function purchaseSkin(
  skinId: PlayerSkinId,
  price: number,
): { ok: true } | { ok: false; reason: string } {
  if (isSkinOwned(skinId)) {
    return { ok: false, reason: "You already own that skin." };
  }
  if (cachedState.credits < price) {
    return { ok: false, reason: "Not enough credits." };
  }

  cachedState.credits -= price;
  cachedState.ownedSkins.push(skinId);
  persist();
  return { ok: true };
}

export function purchaseArenaPass(
  arenaId: string,
  price: number,
): { ok: true } | { ok: false; reason: string } {
  if (isArenaPassOwned(arenaId)) {
    return { ok: false, reason: "Arena pass already owned." };
  }
  if (cachedState.credits < price) {
    return { ok: false, reason: "Not enough credits." };
  }

  cachedState.credits -= price;
  cachedState.ownedArenaPasses.push(arenaId);
  persist();
  return { ok: true };
}

export function awardMatchCredits(options: {
  mode: "practice" | "online";
  didWin: boolean;
  arenaWinStreak: number;
  consecutiveLossesBeforeMatch: number;
  performance: MatchPerformanceSnapshot;
}): MatchCreditBreakdown {
  const breakdown = computeMatchCredits(options);
  if (breakdown.total > 0) {
    addCredits(breakdown.total);
  }
  return breakdown;
}
