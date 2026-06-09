import { describe, expect, it } from "vitest";
import {
  createMatchState,
  endRound,
  isMatchOver,
  nextRoundId,
  startRound,
} from "./state-machine.js";
import type { MatchConfig, RoundDefinition } from "../types.js";

const matchConfig: MatchConfig = {
  id: "duel-standard",
  name: "Standard Duel",
  roundPool: ["warehouse-interior-01", "office-01"],
  roundsToWin: 1,
};

const round: RoundDefinition = {
  id: "warehouse-interior-01",
  name: "Warehouse",
  building: { id: "warehouse-main", scene: "data/buildings/warehouse-main.glb" },
  spawns: {
    playerA: { position: [0, 0, -24], rotation: [0, 0, 0] },
    playerB: { position: [0, 0, 24], rotation: [0, 180, 0] },
  },
  rules: {
    roundTimeLimitSec: 300,
    photoCooldownSec: 2,
    maxPhotoDistance: 60,
    minPhotoDistance: 3,
    requireAimMode: false,
    requireBodyInFrame: true,
    exposure: {
      flash: true,
      sound: true,
      soundAudibleRadius: 25,
      flashVisibleRadius: 40,
      flashDurationSec: 0.15,
    },
  },
};

describe("match state machine", () => {
  it("ends the match on the first valid capture", () => {
    let state = createMatchState(matchConfig);
    state = startRound(state, round);
    expect(state.phase).toBe("round_active");

    state = endRound(state, "valid_capture", "A");
    expect(state.scores.A).toBe(1);
    expect(state.phase).toBe("match_end");
    expect(state.winner).toBe("A");
    expect(isMatchOver(state)).toBe(true);
  });

  it("does not award score on timeout draw", () => {
    let state = createMatchState(matchConfig);
    state = startRound(state, round);
    state = endRound(state, "timeout_draw", null);
    expect(state.scores).toEqual({ A: 0, B: 0 });
    expect(nextRoundId(state)).toBe("office-01");
  });
});
