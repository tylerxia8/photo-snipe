import type { MatchConfig, PlayerSlot, RoundDefinition, RoundScore } from "../types.js";

export type RoundEndReason = "valid_capture" | "timeout_draw" | "forfeit";

export interface MatchState {
  matchConfig: MatchConfig;
  scores: RoundScore;
  roundIndex: number;
  currentRound: RoundDefinition | null;
  phase: "lobby" | "round_active" | "round_end" | "match_end";
  winner: PlayerSlot | null;
}

export function createMatchState(matchConfig: MatchConfig): MatchState {
  return {
    matchConfig,
    scores: { A: 0, B: 0 },
    roundIndex: 0,
    currentRound: null,
    phase: "lobby",
    winner: null,
  };
}

export function startRound(
  state: MatchState,
  round: RoundDefinition,
): MatchState {
  return {
    ...state,
    currentRound: round,
    phase: "round_active",
  };
}

export function endRound(
  state: MatchState,
  reason: RoundEndReason,
  winner: PlayerSlot | null,
): MatchState {
  const scores = { ...state.scores };

  if (reason === "valid_capture" && winner) {
    scores[winner] += 1;
  }

  const matchWinner =
    scores.A >= state.matchConfig.roundsToWin
      ? "A"
      : scores.B >= state.matchConfig.roundsToWin
        ? "B"
        : null;

  return {
    ...state,
    scores,
    phase: matchWinner ? "match_end" : "round_end",
    winner: matchWinner,
    roundIndex: matchWinner ? state.roundIndex : state.roundIndex + 1,
    currentRound: matchWinner ? state.currentRound : null,
  };
}

export function nextRoundId(state: MatchState): string | null {
  const pool = state.matchConfig.roundPool;
  if (pool.length === 0) {
    return null;
  }
  return pool[state.roundIndex % pool.length];
}

export function isMatchOver(state: MatchState): boolean {
  return state.phase === "match_end" && state.winner !== null;
}
