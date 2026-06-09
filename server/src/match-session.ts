import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import {
  createMatchState,
  DEFAULT_BODY_HALF_HEIGHT,
  DEFAULT_BODY_OFFSET,
  DEFAULT_BODY_RADIUS,
  endRound,
  fromArray,
  nextRoundId,
  startRound,
  validatePhoto,
  type EulerDegrees,
  type MatchConfig,
  type MatchState,
  type PhotoAttempt,
  type PlayerPose,
  type PlayerSlot,
  type RoundDefinition,
} from "@photo-snipe/core";
import { loadRound } from "./data-loader.js";
import type { LobbyPlayer } from "./lobby.js";

interface LivePlayerState {
  position: [number, number, number];
  rotation: [number, number, number];
  aiming: boolean;
  lastPhotoAttemptMs?: number;
}

function send(socket: WebSocket, payload: Record<string, unknown>): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(
  players: LobbyPlayer[],
  payload: Record<string, unknown>,
): void {
  for (const player of players) {
    send(player.socket, payload);
  }
}

function opponentSlot(slot: PlayerSlot): PlayerSlot {
  return slot === "A" ? "B" : "A";
}

export class MatchSession {
  readonly matchId = randomUUID();
  readonly matchConfig: MatchConfig;
  private state: MatchState;
  private players: Record<PlayerSlot, LobbyPlayer>;
  private liveState: Record<PlayerSlot, LivePlayerState>;
  private roundTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(matchConfig: MatchConfig, playerA: LobbyPlayer, playerB: LobbyPlayer) {
    this.matchConfig = matchConfig;
    this.state = createMatchState(matchConfig);
    this.players = { A: playerA, B: playerB };
    this.liveState = {
      A: { position: [0, 0, 0], rotation: [0, 0, 0], aiming: false },
      B: { position: [0, 0, 0], rotation: [0, 0, 0], aiming: false },
    };
  }

  start(): void {
    void this.beginNextRound();
  }

  private async beginNextRound(): Promise<void> {
    const roundId = nextRoundId(this.state);
    if (!roundId) {
      return;
    }

    const round = await loadRound(roundId);
    this.state = startRound(this.state, round);

    const roundEndsAtMs = Date.now() + round.rules.roundTimeLimitSec * 1000;

    for (const slot of ["A", "B"] as const) {
      const spawn = round.spawns[slot === "A" ? "playerA" : "playerB"];
      this.liveState[slot] = {
        position: [...spawn.position],
        rotation: [...spawn.rotation],
        aiming: false,
      };

      send(this.players[slot].socket, {
        type: "round_started",
        roundIndex: this.state.roundIndex,
        round,
        yourSpawn: spawn,
        roundEndsAtMs,
      });
    }

    this.clearRoundTimer();
    this.roundTimer = setTimeout(() => {
      this.finishRound("timeout_draw", null);
    }, round.rules.roundTimeLimitSec * 1000);

    this.startSync();
  }

  private startSync(): void {
    this.clearSyncTimer();
    this.syncTimer = setInterval(() => {
      if (this.state.phase !== "round_active") {
        return;
      }
      for (const slot of ["A", "B"] as const) {
        const opponent = opponentSlot(slot);
        const opp = this.liveState[opponent];
        send(this.players[slot].socket, {
          type: "opponent_state",
          position: opp.position,
          rotation: opp.rotation,
          aiming: opp.aiming,
          serverTimeMs: Date.now(),
        });
      }
    }, 50);
  }

  updatePlayerState(
    slot: PlayerSlot,
    position: [number, number, number],
    rotation: [number, number, number],
    aiming: boolean,
  ): void {
    if (this.state.phase !== "round_active") {
      return;
    }
    this.liveState[slot] = {
      ...this.liveState[slot],
      position,
      rotation,
      aiming,
    };
  }

  handlePhotoAttempt(
    slot: PlayerSlot,
    cameraPosition: [number, number, number],
    cameraRotation: [number, number, number],
    fovDeg: number,
    aiming: boolean,
  ): void {
    if (this.state.phase !== "round_active" || !this.state.currentRound) {
      return;
    }

    const rules = this.state.currentRound.rules;
    const timestampMs = Date.now();
    const opponent = opponentSlot(slot);
    const oppState = this.liveState[opponent];

    send(this.players[opponent].socket, {
      type: "photo_exposure",
      shooterSlot: slot,
      position: cameraPosition,
      timestampMs,
      flash: rules.exposure.flash,
      sound: rules.exposure.sound,
      soundAudibleRadius: rules.exposure.soundAudibleRadius,
      flashVisibleRadius: rules.exposure.flashVisibleRadius,
      flashDurationSec: rules.exposure.flashDurationSec,
    });

    const attempt: PhotoAttempt = {
      playerId: slot,
      timestampMs,
      cameraPosition: fromArray(cameraPosition),
      cameraRotation: eulerFromArray(cameraRotation),
      fovDeg,
      aiming,
    };

    const opponentPose: PlayerPose = {
      position: fromArray(oppState.position),
      rotation: eulerFromArray(oppState.rotation),
      aiming: oppState.aiming,
      bodyOffset: DEFAULT_BODY_OFFSET,
      bodyRadius: DEFAULT_BODY_RADIUS,
      bodyHalfHeight: DEFAULT_BODY_HALF_HEIGHT,
    };

    const result = validatePhoto(
      attempt,
      opponentPose,
      rules,
      { lastAttemptMs: this.liveState[slot].lastPhotoAttemptMs, skipOcclusion: true },
    );

    this.liveState[slot].lastPhotoAttemptMs = timestampMs;

    send(this.players[slot].socket, {
      type: "photo_result",
      valid: result.valid,
      reason: result.reason ?? null,
    });

    if (result.valid) {
      this.finishRound("valid_capture", slot);
    }
  }

  private finishRound(
    reason: "valid_capture" | "timeout_draw" | "forfeit",
    winner: PlayerSlot | null,
  ): void {
    if (this.state.phase !== "round_active") {
      return;
    }

    this.clearRoundTimer();
    this.clearSyncTimer();

    this.state = endRound(this.state, reason, winner);

    broadcast([this.players.A, this.players.B], {
      type: "round_ended",
      reason,
      winnerSlot: winner,
      scores: this.state.scores,
    });

    if (this.state.phase === "match_end" && this.state.winner) {
      broadcast([this.players.A, this.players.B], {
        type: "match_ended",
        winnerSlot: this.state.winner,
        scores: this.state.scores,
      });
      return;
    }

    setTimeout(() => {
      void this.beginNextRound();
    }, 3000);
  }

  handleDisconnect(slot: PlayerSlot): void {
    if (this.state.phase === "round_active") {
      this.finishRound("forfeit", opponentSlot(slot));
    }
  }

  private clearRoundTimer(): void {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
  }

  private clearSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}

function eulerFromArray([x, y, z]: [number, number, number]): EulerDegrees {
  return { x, y, z };
}
