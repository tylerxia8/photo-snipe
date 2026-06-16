import { describe, expect, it } from "vitest";
import {
  awardLadderPoints,
  estimateRankPointsFromHistory,
  getLadderSnapshot,
  getOperatorRank,
  LADDER_POINT_AWARDS,
} from "./operator-ladder.js";

describe("operator ladder", () => {
  it("awards more points for online wins than practice wins", () => {
    expect(awardLadderPoints({ mode: "online", didWin: true })).toBe(
      LADDER_POINT_AWARDS.onlineWin,
    );
    expect(awardLadderPoints({ mode: "practice", didWin: true })).toBe(
      LADDER_POINT_AWARDS.practiceWin,
    );
  });

  it("never removes rank points on a loss", () => {
    expect(awardLadderPoints({ mode: "online", didWin: false })).toBeGreaterThan(0);
    expect(awardLadderPoints({ mode: "practice", didWin: false })).toBeGreaterThan(0);
  });

  it("promotes through expanded rank tiers", () => {
    expect(getOperatorRank(0).id).toBe("recruit");
    expect(getOperatorRank(35).id).toBe("spotter");
    expect(getOperatorRank(165).id).toBe("sniper");
    expect(getOperatorRank(440).id).toBe("legend");
  });

  it("reports progress toward the next rank", () => {
    const snapshot = getLadderSnapshot(100);
    expect(snapshot.current.id).toBe("marksman");
    expect(snapshot.next?.id).toBe("tracker");
    expect(snapshot.rankPointsToNext).toBe(25);
    expect(snapshot.progress).toBeCloseTo(0.2857, 3);
  });

  it("backfills rank points from legacy win history", () => {
    expect(
      estimateRankPointsFromHistory({
        onlineWins: 2,
        practiceWins: 4,
        totalLosses: 3,
      }),
    ).toBe(2 * LADDER_POINT_AWARDS.onlineWin + 4 * LADDER_POINT_AWARDS.practiceWin + 3 * LADDER_POINT_AWARDS.onlineLoss);
  });
});
