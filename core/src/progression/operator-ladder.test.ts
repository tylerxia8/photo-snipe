import { describe, expect, it } from "vitest";
import {
  awardLadderPoints,
  estimateRankPointsFromHistory,
  getLadderSnapshot,
  getOperatorRank,
  LADDER_POINT_AWARDS,
  OPERATOR_RANKS,
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
    expect(getOperatorRank(360).id).toBe("spotter");
    expect(getOperatorRank(2550).id).toBe("sniper");
    expect(getOperatorRank(12000).id).toBe("legend");
  });

  it("requires a long online win streak to reach legend", () => {
    const legend = OPERATOR_RANKS.find((rank) => rank.id === "legend")!;
    const onlineWinsNeeded = Math.ceil(legend.minRankPoints / LADDER_POINT_AWARDS.onlineWin);
    expect(onlineWinsNeeded).toBeGreaterThanOrEqual(600);
  });

  it("reports progress toward the next rank", () => {
    const snapshot = getLadderSnapshot(1300);
    expect(snapshot.current.id).toBe("marksman");
    expect(snapshot.next?.id).toBe("tracker");
    expect(snapshot.rankPointsToNext).toBe(500);
    expect(snapshot.progress).toBeCloseTo(0.1667, 3);
  });

  it("backfills rank points from legacy win history", () => {
    expect(
      estimateRankPointsFromHistory({
        onlineWins: 2,
        practiceWins: 4,
        totalLosses: 3,
      }),
    ).toBe(
      2 * LADDER_POINT_AWARDS.onlineWin +
        4 * LADDER_POINT_AWARDS.practiceWin +
        3 * LADDER_POINT_AWARDS.onlineLoss,
    );
  });
});
