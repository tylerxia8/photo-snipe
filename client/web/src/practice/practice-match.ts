import {
  createMatchState,
  DEFAULT_BODY_HALF_HEIGHT,
  DEFAULT_BODY_OFFSET,
  DEFAULT_BODY_RADIUS,
  endRound,
  fromArray,
  getOccludersForRound,
  nextRoundId,
  startRound,
  validatePhoto,
  type MatchConfig,
  type MatchState,
  type PhotoAttempt,
  type PlayerPose,
  type PlayerSlot,
  type RoundDefinition,
} from "@photo-snipe/core";
import type { MatchTransport } from "../game/match-transport.js";
import type { Game } from "../game/game.js";
import type { ServerMessage } from "../net/client.js";
import { ReplayRecorder } from "../replay/recorder.js";
import { getSkinId } from "../settings/appearance.js";
import { getPracticeBotProfile, type PracticeBotDifficulty } from "@photo-snipe/core";
import { PracticeBot, type LiveState } from "./practice-bot.js";
import { loadRoundDefinition } from "./round-loader.js";

function poseFromState(state: LiveState): PlayerPose {
  return {
    position: fromArray(state.position),
    rotation: { x: 0, y: state.rotation[1], z: 0 },
    aiming: state.aiming,
    bodyOffset: DEFAULT_BODY_OFFSET,
    bodyRadius: DEFAULT_BODY_RADIUS,
    bodyHalfHeight: DEFAULT_BODY_HALF_HEIGHT,
  };
}

export class PracticeMatch implements MatchTransport {
  private state: MatchState | null = null;
  private round: RoundDefinition | null = null;
  private roundId = "warehouse-interior-01";
  private human: LiveState = {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    aiming: false,
  };
  private readonly bot = new PracticeBot();
  private difficulty: PracticeBotDifficulty = "hard";
  private readonly replayRecorder = new ReplayRecorder();
  private lastWinReplay: ReturnType<ReplayRecorder["buildWinReplay"]> = null;
  private active = false;
  private interRoundTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private emit: (msg: ServerMessage) => void,
    private game: Game,
  ) {}

  async start(roundId: string, difficulty: PracticeBotDifficulty): Promise<void> {
    this.roundId = roundId;
    this.difficulty = difficulty;
    this.bot.setDifficulty(difficulty);
    this.round = await loadRoundDefinition(roundId);
    const profile = getPracticeBotProfile(difficulty);
    const matchConfig: MatchConfig = {
      id: "practice-duel",
      name: "Practice Duel",
      roundsToWin: 1,
      roundPool: [roundId],
    };
    this.state = createMatchState(matchConfig);

    this.emit({
      type: "match_started",
      matchId: "practice",
      playerSlot: "A",
      opponentName: profile.opponentName,
      opponentSkinId: "crimson",
      selectedRoundId: roundId,
      selectedRoundName: this.round.name,
      mode: "practice",
      practiceDifficulty: difficulty,
    });

    await this.beginRound();
  }

  async restart(): Promise<void> {
    this.clearInterRoundTimer();
    this.active = false;
    this.bot.setDifficulty(this.difficulty);
    this.state = createMatchState({
      id: "practice-duel",
      name: "Practice Duel",
      roundsToWin: 1,
      roundPool: [this.roundId],
    });
    await this.beginRound();
  }

  stop(): void {
    this.clearInterRoundTimer();
    this.active = false;
    this.state = null;
    this.round = null;
  }

  tick(delta: number): void {
    if (!this.active || !this.round || !this.state) {
      return;
    }

    const world = this.game.getPhysicsWorld();
    if (!world) {
      return;
    }

    this.human = this.game.getHumanLiveState();
    this.replayRecorder.record(
      "A",
      this.human.position,
      this.human.rotation,
      performance.now(),
    );
    this.bot.tick(delta, this.human, world);
    const botState = this.bot.getState();
    this.replayRecorder.record(
      "B",
      botState.position,
      botState.rotation,
      performance.now(),
    );
    this.game.updateOpponent(
      this.bot.getState().position,
      this.bot.getState().rotation,
    );

    const botAttempt = this.bot.tryShoot(
      this.human,
      this.round.rules,
      getOccludersForRound(this.round.id),
    );
    if (botAttempt) {
      this.handleBotPhoto(botAttempt);
    }
  }

  sendPlayerState(
    position: [number, number, number],
    rotation: [number, number, number],
    aiming: boolean,
    _sequence: number,
  ): void {
    this.human = { position, rotation, aiming };
    this.replayRecorder.record("A", position, rotation, performance.now());
  }

  sendPhotoAttempt(
    cameraPosition: [number, number, number],
    cameraRotation: [number, number, number],
    fovDeg: number,
    aiming: boolean,
    aspectRatio: number,
  ): void {
    if (!this.active || !this.round || !this.state) {
      return;
    }

    const rules = this.round.rules;
    const timestampMs = performance.now();
    const lastAttemptMs = this.human.lastPhotoAttemptMs;

    if (
      lastAttemptMs !== undefined &&
      timestampMs - lastAttemptMs < rules.photoCooldownSec * 1000
    ) {
      this.emit({ type: "photo_result", valid: false, reason: "cooldown" });
      return;
    }

    this.emit({
      type: "photo_exposure",
      shooterSlot: "A",
      position: cameraPosition,
      timestampMs,
    });
    this.bot.onHumanExposure(timestampMs);

    const attempt: PhotoAttempt = {
      playerId: "A",
      timestampMs,
      cameraPosition: fromArray(cameraPosition),
      cameraRotation: {
        x: cameraRotation[0],
        y: cameraRotation[1],
        z: cameraRotation[2],
      },
      fovDeg,
      aiming,
    };

    const result = validatePhoto(attempt, poseFromState(this.bot.getState()), rules, {
      lastAttemptMs: this.human.lastPhotoAttemptMs,
      skipOcclusion: false,
      aspectRatio,
      occluders: getOccludersForRound(this.round.id),
    });

    this.human.lastPhotoAttemptMs = timestampMs;

    this.emit({
      type: "photo_result",
      valid: result.valid,
      reason: result.reason ?? null,
    });

    if (result.valid) {
      this.lastWinReplay = this.replayRecorder.buildWinReplay({
        roundId: this.round.id,
        winnerSlot: "A",
        winnerName: "You",
        winnerSkinId: getSkinId(),
        loserSkinId: "crimson",
        winCameraPosition: cameraPosition,
        winCameraRotation: cameraRotation,
        fovDeg,
        aspectRatio,
        winTimestampMs: timestampMs,
      });
      void this.finishRound("valid_capture", "A");
    }
  }

  private handleBotPhoto(attempt: PhotoAttempt): void {
    if (!this.active || !this.round || !this.state) {
      return;
    }

    this.emit({
      type: "photo_exposure",
      shooterSlot: "B",
      position: [attempt.cameraPosition.x, attempt.cameraPosition.y, attempt.cameraPosition.z],
      timestampMs: attempt.timestampMs,
    });

    const result = validatePhoto(attempt, poseFromState(this.human), this.round.rules, {
      lastAttemptMs: undefined,
      skipOcclusion: false,
      aspectRatio: 16 / 9,
      occluders: getOccludersForRound(this.round.id),
    });

    if (result.valid) {
      this.lastWinReplay = this.replayRecorder.buildWinReplay({
        roundId: this.round.id,
        winnerSlot: "B",
        winnerName: getPracticeBotProfile(this.difficulty).opponentName,
        winnerSkinId: "crimson",
        loserSkinId: getSkinId(),
        winCameraPosition: [
          attempt.cameraPosition.x,
          attempt.cameraPosition.y,
          attempt.cameraPosition.z,
        ],
        winCameraRotation: [
          attempt.cameraRotation.x,
          attempt.cameraRotation.y,
          attempt.cameraRotation.z,
        ],
        fovDeg: 75,
        aspectRatio: 16 / 9,
        winTimestampMs: attempt.timestampMs,
      });
      void this.finishRound("valid_capture", "B");
    }
  }

  private async beginRound(): Promise<void> {
    if (!this.state) {
      return;
    }

    const roundId = nextRoundId(this.state);
    if (!roundId) {
      return;
    }

    this.round = await loadRoundDefinition(roundId);
    this.state = startRound(this.state, this.round);
    this.active = true;
    this.replayRecorder.reset();
    this.lastWinReplay = null;

    const spawn = this.round.spawns.playerA;
    const opponentSpawn = this.round.spawns.playerB;
    this.human = {
      position: [...spawn.position],
      rotation: [...spawn.rotation],
      aiming: false,
    };
    this.bot.init(opponentSpawn);

    this.emit({
      type: "round_started",
      roundIndex: this.state.roundIndex,
      round: this.round,
      yourSpawn: spawn,
      opponentSpawn,
      mode: "practice",
    });

    this.game.startRound(
      this.round.id,
      spawn,
      opponentSpawn,
      this.round.name,
    );
  }

  private finishRound(
    reason: "valid_capture" | "timeout_draw" | "forfeit",
    winner: PlayerSlot | null,
  ): void {
    if (!this.state) {
      return;
    }

    this.active = false;
    this.state = endRound(this.state, reason, winner);

    this.emit({
      type: "round_ended",
      reason,
      winnerSlot: winner,
      scores: this.state.scores,
      mode: "practice",
    });

    if (this.state.phase === "match_end" && this.state.winner) {
      const didWin = this.state.winner === "A";
      this.emit({
        type: "match_ended",
        winnerSlot: this.state.winner,
        winnerName: didWin ? "You" : getPracticeBotProfile(this.difficulty).opponentName,
        didWin,
        scores: this.state.scores,
        reason,
        roundId: this.roundId,
        mode: "practice",
        practiceDifficulty: this.difficulty,
        replay: this.lastWinReplay,
      });
      return;
    }

    this.clearInterRoundTimer();
    this.interRoundTimer = setTimeout(() => {
      void this.beginRound();
    }, 3000);
  }

  private clearInterRoundTimer(): void {
    if (this.interRoundTimer) {
      clearTimeout(this.interRoundTimer);
      this.interRoundTimer = null;
    }
  }
}
