export type OperatorTier = "enlisted" | "professional" | "elite";

export interface OperatorRank {
  id: string;
  name: string;
  tier: OperatorTier;
  minRankPoints: number;
  accent: string;
}

export interface LadderMatchResult {
  mode: "practice" | "online";
  didWin: boolean;
}

export interface LadderSnapshot {
  rankPoints: number;
  current: OperatorRank;
  next: OperatorRank | null;
  progress: number;
  rankPointsToNext: number;
  winsNeededEstimate: string | null;
}

export const OPERATOR_RANKS: OperatorRank[] = [
  { id: "recruit", name: "Recruit", tier: "enlisted", minRankPoints: 0, accent: "#9aa8ba" },
  { id: "cadet", name: "Cadet", tier: "enlisted", minRankPoints: 120, accent: "#7ea8c8" },
  { id: "spotter", name: "Spotter", tier: "enlisted", minRankPoints: 360, accent: "#6dffd2" },
  { id: "shooter", name: "Shooter", tier: "enlisted", minRankPoints: 720, accent: "#58d4ff" },
  { id: "marksman", name: "Marksman", tier: "professional", minRankPoints: 1200, accent: "#2196f3" },
  { id: "tracker", name: "Tracker", tier: "professional", minRankPoints: 1800, accent: "#4f8cff" },
  { id: "sniper", name: "Sniper", tier: "professional", minRankPoints: 2550, accent: "#7b61ff" },
  { id: "operative", name: "Operative", tier: "professional", minRankPoints: 3450, accent: "#a855f7" },
  { id: "specialist", name: "Specialist", tier: "elite", minRankPoints: 4500, accent: "#e879f9" },
  { id: "ace", name: "Ace", tier: "elite", minRankPoints: 5700, accent: "#f472b6" },
  { id: "phantom", name: "Phantom", tier: "elite", minRankPoints: 7050, accent: "#fb7185" },
  { id: "legend", name: "Legend", tier: "elite", minRankPoints: 12000, accent: "#fbbf24" },
];

/** Tuned so elite ranks need weeks of play, not a single marathon session. */
export const LADDER_POINT_AWARDS = {
  onlineWin: 18,
  practiceWin: 4,
  onlineLoss: 3,
  practiceLoss: 1,
} as const;

export function awardLadderPoints(result: LadderMatchResult): number {
  if (result.didWin) {
    return result.mode === "online"
      ? LADDER_POINT_AWARDS.onlineWin
      : LADDER_POINT_AWARDS.practiceWin;
  }
  return result.mode === "online"
    ? LADDER_POINT_AWARDS.onlineLoss
    : LADDER_POINT_AWARDS.practiceLoss;
}

export function estimateRankPointsFromHistory(options: {
  onlineWins: number;
  practiceWins: number;
  totalLosses: number;
}): number {
  const fromWins =
    options.onlineWins * LADDER_POINT_AWARDS.onlineWin +
    options.practiceWins * LADDER_POINT_AWARDS.practiceWin;
  const fromLosses = Math.min(options.totalLosses, options.onlineWins + options.practiceWins + 5) *
    LADDER_POINT_AWARDS.onlineLoss;
  return fromWins + fromLosses;
}

export function getOperatorRank(rankPoints: number): OperatorRank {
  let rank = OPERATOR_RANKS[0];
  for (const candidate of OPERATOR_RANKS) {
    if (rankPoints >= candidate.minRankPoints) {
      rank = candidate;
    }
  }
  return rank;
}

export function getNextOperatorRank(rankPoints: number): OperatorRank | null {
  for (const candidate of OPERATOR_RANKS) {
    if (rankPoints < candidate.minRankPoints) {
      return candidate;
    }
  }
  return null;
}

export function getLadderSnapshot(rankPoints: number): LadderSnapshot {
  const current = getOperatorRank(rankPoints);
  const next = getNextOperatorRank(rankPoints);
  if (!next) {
    return {
      rankPoints,
      current,
      next: null,
      progress: 1,
      rankPointsToNext: 0,
      winsNeededEstimate: null,
    };
  }

  const span = next.minRankPoints - current.minRankPoints;
  const gained = rankPoints - current.minRankPoints;
  const rankPointsToNext = next.minRankPoints - rankPoints;
  const onlineWinsNeeded = Math.ceil(rankPointsToNext / LADDER_POINT_AWARDS.onlineWin);

  return {
    rankPoints,
    current,
    next,
    progress: span <= 0 ? 1 : Math.min(1, gained / span),
    rankPointsToNext,
    winsNeededEstimate:
      rankPointsToNext <= 0
        ? null
        : `~${onlineWinsNeeded} online win${onlineWinsNeeded === 1 ? "" : "s"}`,
  };
}

export function formatOperatorTier(tier: OperatorTier): string {
  switch (tier) {
    case "enlisted":
      return "Enlisted";
    case "professional":
      return "Professional";
    case "elite":
      return "Elite";
  }
}

export function getOperatorLadderRows(rankPoints: number): Array<{
  rank: OperatorRank;
  status: "completed" | "current" | "upcoming";
  requirementLabel: string;
}> {
  const current = getOperatorRank(rankPoints);
  const currentIndex = OPERATOR_RANKS.findIndex((rank) => rank.id === current.id);

  return OPERATOR_RANKS.map((rank, index) => {
    let status: "completed" | "current" | "upcoming" = "upcoming";
    if (index < currentIndex) {
      status = "completed";
    } else if (index === currentIndex) {
      status = "current";
    }

    return {
      rank,
      status,
      requirementLabel: rank.minRankPoints === 0 ? "Start" : `${rank.minRankPoints} RP`,
    };
  });
}
