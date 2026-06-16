import { listArenaOptions } from "@photo-snipe/core";
import {
  awardLadderPoints,
  estimateRankPointsFromHistory,
  getLadderSnapshot,
  getOperatorRank,
  type OperatorRank,
} from "@photo-snipe/core";

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
  rankPoints: number;
  consecutiveLosses: number;
  seasonMonth: string;
  seasonWins: number;
  perArena: Record<string, ArenaStats>;
}

export type RankDefinition = OperatorRank;

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
    rankPoints: 0,
    consecutiveLosses: 0,
    seasonMonth: currentSeasonMonth(),
    seasonWins: 0,
    perArena: {},
  };
}

function resolveRankPoints(parsed: Partial<ProgressionState>): number {
  if (typeof parsed.rankPoints === "number" && parsed.rankPoints >= 0) {
    return parsed.rankPoints;
  }

  return estimateRankPointsFromHistory({
    onlineWins: typeof parsed.onlineWins === "number" ? parsed.onlineWins : 0,
    practiceWins: typeof parsed.practiceWins === "number" ? parsed.practiceWins : 0,
    totalLosses: typeof parsed.totalLosses === "number" ? parsed.totalLosses : 0,
  });
}

function currentSeasonMonth(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatSeasonLabel(seasonMonth: string): string {
  const [year, month] = seasonMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString(undefined, { month: "short", year: "numeric" });
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
      rankPoints: resolveRankPoints(parsed),
      consecutiveLosses:
        typeof parsed.consecutiveLosses === "number" ? parsed.consecutiveLosses : 0,
      seasonMonth:
        typeof parsed.seasonMonth === "string" ? parsed.seasonMonth : currentSeasonMonth(),
      seasonWins: typeof parsed.seasonWins === "number" ? parsed.seasonWins : 0,
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

export function getRank(rankPoints = cachedState.rankPoints): RankDefinition {
  return getOperatorRank(rankPoints);
}

export function getNextRank(rankPoints = cachedState.rankPoints): RankDefinition | null {
  return getLadderSnapshot(rankPoints).next;
}

export function getRankProgress(rankPoints = cachedState.rankPoints): {
  current: RankDefinition;
  next: RankDefinition | null;
  progress: number;
  rankPoints: number;
  rankPointsToNext: number;
  winsNeededEstimate: string | null;
} {
  const snapshot = getLadderSnapshot(rankPoints);
  return {
    current: snapshot.current,
    next: snapshot.next,
    progress: snapshot.progress,
    rankPoints: snapshot.rankPoints,
    rankPointsToNext: snapshot.rankPointsToNext,
    winsNeededEstimate: snapshot.winsNeededEstimate,
  };
}

export function getOperatorRecord(): {
  totalMatches: number;
  winRate: number;
  onlineWins: number;
  practiceWins: number;
  totalLosses: number;
} {
  const totalMatches = cachedState.totalWins + cachedState.totalLosses;
  return {
    totalMatches,
    winRate: totalMatches > 0 ? cachedState.totalWins / totalMatches : 0,
    onlineWins: cachedState.onlineWins,
    practiceWins: cachedState.practiceWins,
    totalLosses: cachedState.totalLosses,
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
  const month = currentSeasonMonth();
  if (cachedState.seasonMonth !== month) {
    cachedState.seasonMonth = month;
    cachedState.seasonWins = 0;
  }

  if (options.didWin) {
    cachedState.totalWins += 1;
    cachedState.seasonWins += 1;
    cachedState.consecutiveLosses = 0;
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
    cachedState.consecutiveLosses += 1;
    stats.losses += 1;
    stats.currentStreak = 0;
  }

  cachedState.rankPoints += awardLadderPoints({
    mode: options.mode,
    didWin: options.didWin,
  });

  cachedState.perArena[options.roundId] = stats;
  persist();
}

export function getSeasonProgress(now = new Date()): {
  month: string;
  label: string;
  wins: number;
} {
  const month = currentSeasonMonth(now);
  const wins =
    cachedState.seasonMonth === month ? cachedState.seasonWins : 0;
  return {
    month,
    label: formatSeasonLabel(month),
    wins,
  };
}

export function getArenaLeaderboardRows(): Array<{
  id: string;
  name: string;
  wins: number;
  losses: number;
  currentStreak: number;
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
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      unlocked: isArenaUnlocked(arena.id),
      unlockWins: getArenaUnlockRequirement(arena.id),
    };
  });
}
