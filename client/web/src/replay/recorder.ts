import {
  buildWinReplay,
  recordSample,
  type MatchReplay,
  type PlayerSlot,
  type StateSample,
} from "@photo-snipe/core";

export class ReplayRecorder {
  private samples: Record<PlayerSlot, StateSample[]> = {
    A: [],
    B: [],
  };

  reset(): void {
    this.samples.A = [];
    this.samples.B = [];
  }

  record(
    slot: PlayerSlot,
    position: [number, number, number],
    rotation: [number, number, number],
    timestampMs: number,
  ): void {
    recordSample(this.samples[slot], {
      timestampMs,
      position,
      rotation,
    });
  }

  buildWinReplay(options: {
    roundId: string;
    winnerSlot: PlayerSlot;
    winnerName: string;
    winnerSkinId: string;
    loserSkinId: string;
    winCameraPosition: [number, number, number];
    winCameraRotation: [number, number, number];
    fovDeg: number;
    aspectRatio: number;
    winTimestampMs: number;
  }): MatchReplay | null {
    const loserSlot = options.winnerSlot === "A" ? "B" : "A";
    return buildWinReplay({
      roundId: options.roundId,
      winnerName: options.winnerName,
      winnerSkinId: options.winnerSkinId,
      loserSkinId: options.loserSkinId,
      winnerSamples: this.samples[options.winnerSlot],
      loserSamples: this.samples[loserSlot],
      winCameraPosition: options.winCameraPosition,
      winCameraRotation: options.winCameraRotation,
      fovDeg: options.fovDeg,
      aspectRatio: options.aspectRatio,
      winTimestampMs: options.winTimestampMs,
    });
  }
}
