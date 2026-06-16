import { listArenaOptions } from "@photo-snipe/core";

const STORAGE_KEY = "photo-snipe-progression";

export interface ArenaStats {
  wins: number;
  losses: number;
  bestStreak: number;
  currentStreak: number;
}

export interface ProgressionState {
  totalWins: number;
  totalLosses: number;
  practiceWins: number;
  onlineWins: number;
  perArena: Record<string, ArenaStats>;
}

export interface RankDefinition {
  id: string;
  name: string;
  minWins: number;
}

export const RANKS: RankDefinition[] = [
  { id: "rookie", name: "Rookie", minWins: 0 },
  { id: "spotter", name: "Spotter", minWins: 1 },
  { id: "marksman", name: "Marksman", minWins: 3 },
  { id: "sniper", name: "Sniper", minWins: 6 },
  { id: "ace", name: "Ace", minWins: 10 },
];

const ARENA_UNLOCK_WINS: Record<string, number> = {
  "warehouse-interior-01": 0,
  "freight-depot-01": 1,
  "rooftop-01": 2,
  "duct-network-01": 4,
  "corn-maze-01": 6,
  "city-streets-01": 8,
  "parking-garage-01": 10,
};

const listeners = new Set<() => void>();

function emptyArenaStats(): ArenaStats {
  return { wins: 0, losses: 0, bestStreak: 0, currentStreak: 0 };
}

function defaultState(): ProgressionState {
  return {
    totalWins: 0,
    totalLosses: 0,
    practiceWins: 0,
    onlineWins: 0,
    perArena: {},
  };
}

function loadState(): ProgressionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw) as Partial<ProgressionState>;
    return {
      totalWins: typeof parsed.totalWins === "number" ? parsed.totalWins : 0,
      totalLosses: typeof parsed.totalLosses === "number" ? parsed.totalLosses : 0,
      practiceWins: typeof parsed.practiceWins === "number" ? parsed.practiceWins : 0,
      onlineWins: typeof parsed.onlineWins === "number" ? parsed.onlineWins : 0,
      perArena:
        parsed.perArena && typeof parsed.perArena === "object"
          ? (parsed.perArena as Record<string, ArenaStats>)
          : {},
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

export function getProgressionState(): ProgressionState {
  return structuredClone(cachedState);
}

export function subscribeProgression(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRank(totalWins = cachedState.totalWins): RankDefinition {
  let rank = RANKS[0];
  for (const candidate of RANKS) {
    if (totalWins >= candidate.minWins) {
      rank = candidate;
    }
  }
  return rank;
}

export function getNextRank(totalWins = cachedState.totalWins): RankDefinition | null {
  for (const candidate of RANKS) {
    if (totalWins < candidate.minWins) {
      return candidate;
    }
  }
  return null;
}

export function getRankProgress(totalWins = cachedState.totalWins): {
  current: RankDefinition;
  next: RankDefinition | null;
  progress: number;
} {
  const current = getRank(totalWins);
  const next = getNextRank(totalWins);
  if (!next) {
    return { current, next: null, progress: 1 };
  }

  const span = next.minWins - current.minWins;
  const gained = totalWins - current.minWins;
  return {
    current,
    next,
    progress: span <= 0 ? 1 : Math.min(1, gained / span),
  };
}

export function getArenaUnlockRequirement(roundId: string): number {
  return ARENA_UNLOCK_WINS[roundId] ?? 0;
}

export function isArenaUnlocked(roundId: string, totalWins = cachedState.totalWins): boolean {
  return totalWins >= getArenaUnlockRequirement(roundId);
}

export function getArenaStats(roundId: string): ArenaStats {
  return cachedState.perArena[roundId] ?? emptyArenaStats();
}

export function recordMatchResult(options: {
  mode: "practice" | "online";
  didWin: boolean;
  roundId: string;
}): void {
  const stats = cachedState.perArena[options.roundId] ?? emptyArenaStats();

  if (options.didWin) {
    cachedState.totalWins += 1;
    stats.wins += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    if (options.mode === "practice") {
      cachedState.practiceWins += 1;
    } else {
      cachedState.onlineWins += 1;
    }
  } else {
    cachedState.totalLosses += 1;
    stats.losses += 1;
    stats.currentStreak = 0;
  }

  cachedState.perArena[options.roundId] = stats;
  persist();
}

export function getArenaLeaderboardRows(): Array<{
  id: string;
  name: string;
  wins: number;
  losses: number;
  bestStreak: number;
  unlocked: boolean;
  unlockWins: number;
}> {
  return listArenaOptions().map((arena) => {
    const stats = getArenaStats(arena.id);
    return {
      id: arena.id,
      name: arena.name,
      wins: stats.wins,
      losses: stats.losses,
      bestStreak: stats.bestStreak,
      unlocked: isArenaUnlocked(arena.id),
      unlockWins: getArenaUnlockRequirement(arena.id),
    };
  });
}
