import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import {
  createMatchState,
  DEFAULT_BODY_HALF_HEIGHT,
  DEFAULT_BODY_OFFSET,
  DEFAULT_BODY_RADIUS,
  endRound,
  fromArray,
  getOccludersForBuilding,
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

export type MatchEndHandler = (players: Record<PlayerSlot, LobbyPlayer>) => void;

export class MatchSession {
  readonly matchId = randomUUID();
  readonly matchConfig: MatchConfig;
  private state: MatchState;
  private players: Record<PlayerSlot, LobbyPlayer>;
  private liveState: Record<PlayerSlot, LivePlayerState>;
  private syncTimer: NodeJS.Timeout | null = null;
  private interRoundTimer: NodeJS.Timeout | null = null;
  private onMatchEnd?: MatchEndHandler;

  constructor(
    matchConfig: MatchConfig,
    playerA: LobbyPlayer,
    playerB: LobbyPlayer,
    onMatchEnd?: MatchEndHandler,
  ) {
    this.matchConfig = matchConfig;
    this.onMatchEnd = onMatchEnd;
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

    for (const slot of ["A", "B"] as const) {
      const spawn = round.spawns[slot === "A" ? "playerA" : "playerB"];
      const opponentSpawn = round.spawns[slot === "A" ? "playerB" : "playerA"];
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
        opponentSpawn,
      });

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
    aspectRatio = 16 / 9,
  ): void {
    if (this.state.phase !== "round_active" || !this.state.currentRound) {
      return;
    }

    const rules = this.state.currentRound.rules;
    const timestampMs = Date.now();
    const lastAttemptMs = this.liveState[slot].lastPhotoAttemptMs;

    if (
      lastAttemptMs !== undefined &&
      timestampMs - lastAttemptMs < rules.photoCooldownSec * 1000
    ) {
      send(this.players[slot].socket, {
        type: "photo_result",
        valid: false,
        reason: "cooldown",
      });
      return;
    }

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
      rotation: { x: 0, y: oppState.rotation[1], z: 0 },
      aiming: oppState.aiming,
      bodyOffset: DEFAULT_BODY_OFFSET,
      bodyRadius: DEFAULT_BODY_RADIUS,
      bodyHalfHeight: DEFAULT_BODY_HALF_HEIGHT,
    };

    const result = validatePhoto(
      attempt,
      opponentPose,
      rules,
      {
        lastAttemptMs: this.liveState[slot].lastPhotoAttemptMs,
        skipOcclusion: false,
        aspectRatio,
        occluders: getOccludersForBuilding(this.state.currentRound.building.id),
      },
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
    if (this.state.phase !== "round_active" && this.state.phase !== "round_end") {
      return;
    }

    this.clearSyncTimer();
    this.clearInterRoundTimer();

    this.state = endRound(this.state, reason, winner);

    if (this.state.phase === "match_end" && this.state.winner) {
      const winner = this.state.winner;
      for (const slot of ["A", "B"] as const) {
        send(this.players[slot].socket, {
          type: "match_ended",
          winnerSlot: winner,
          winnerName: this.players[winner].displayName,
          didWin: slot === winner,
          scores: this.state.scores,
          reason,
        });
      }
      this.onMatchEnd?.(this.players);
      return;
    }

    broadcast([this.players.A, this.players.B], {
      type: "round_ended",
      reason,
      winnerSlot: winner,
      scores: this.state.scores,
    });

    this.interRoundTimer = setTimeout(() => {
      this.interRoundTimer = null;
      void this.beginNextRound();
    }, 3000);
  }

  getPlayers(): Record<PlayerSlot, LobbyPlayer> {
    return this.players;
  }

  getPhase(): MatchState["phase"] {
    return this.state.phase;
  }

  handleDisconnect(slot: PlayerSlot): void {
    if (this.state.phase === "round_active" || this.state.phase === "round_end") {
      this.finishRound("forfeit", opponentSlot(slot));
    }
  }

  private clearSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private clearInterRoundTimer(): void {
    if (this.interRoundTimer) {
      clearTimeout(this.interRoundTimer);
      this.interRoundTimer = null;
    }
  }
}

function eulerFromArray([x, y, z]: [number, number, number]): EulerDegrees {
  return { x, y, z };
}
