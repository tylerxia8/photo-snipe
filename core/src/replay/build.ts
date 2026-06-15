import type { MatchReplay, ReplayFrame } from "./types.js";

export const REPLAY_EYE_OFFSET = 0.6;
export const REPLAY_LOOKBACK_MS = 3500;
export const REPLAY_FRAME_STEP_MS = 100;

export interface StateSample {
  timestampMs: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

function feetToCamera(position: [number, number, number]): [number, number, number] {
  return [position[0], position[1] + REPLAY_EYE_OFFSET, position[2]];
}

function findClosestSample(
  samples: StateSample[],
  timestampMs: number,
): StateSample | undefined {
  if (samples.length === 0) {
    return undefined;
  }

  let closest = samples[0];
  let closestDelta = Math.abs(samples[0].timestampMs - timestampMs);
  for (const sample of samples) {
    const delta = Math.abs(sample.timestampMs - timestampMs);
    if (delta < closestDelta) {
      closest = sample;
      closestDelta = delta;
    }
  }
  return closest;
}

export function recordSample(
  samples: StateSample[],
  sample: StateSample,
  lookbackMs = REPLAY_LOOKBACK_MS,
): void {
  samples.push(sample);
  const cutoff = sample.timestampMs - lookbackMs;
  while (samples.length > 0 && samples[0].timestampMs < cutoff) {
    samples.shift();
  }
}

export function buildWinReplay(options: {
  roundId: string;
  winnerName: string;
  winnerSkinId: string;
  loserSkinId: string;
  winnerSamples: StateSample[];
  loserSamples: StateSample[];
  winCameraPosition: [number, number, number];
  winCameraRotation: [number, number, number];
  fovDeg: number;
  aspectRatio: number;
  winTimestampMs: number;
}): MatchReplay | null {
  const {
    winnerSamples,
    loserSamples,
    winTimestampMs,
  } = options;

  const relevantWinnerSamples = winnerSamples.filter(
    (sample) => sample.timestampMs <= winTimestampMs,
  );

  if (relevantWinnerSamples.length === 0) {
    return null;
  }

  const startMs = Math.max(
    winTimestampMs - REPLAY_LOOKBACK_MS,
    relevantWinnerSamples[0].timestampMs,
  );

  const keyTimes: number[] = [];
  for (let t = startMs; t < winTimestampMs; t += REPLAY_FRAME_STEP_MS) {
    keyTimes.push(t);
  }
  keyTimes.push(winTimestampMs);

  const frames: ReplayFrame[] = [];
  for (const timestampMs of keyTimes) {
    const winnerSample =
      timestampMs === winTimestampMs
        ? relevantWinnerSamples[relevantWinnerSamples.length - 1]
        : findClosestSample(relevantWinnerSamples, timestampMs);
    if (!winnerSample) {
      continue;
    }

    const loserSample = findClosestSample(loserSamples, timestampMs);
    if (!loserSample) {
      continue;
    }

    const useWinCamera = timestampMs === winTimestampMs;
    frames.push({
      t: timestampMs - startMs,
      cam: useWinCamera
        ? options.winCameraPosition
        : feetToCamera(winnerSample.position),
      camRot: useWinCamera ? options.winCameraRotation : winnerSample.rotation,
      opp: loserSample.position,
      oppRot: loserSample.rotation,
    });
  }

  if (frames.length === 0) {
    return null;
  }

  const snapAtMs = frames[frames.length - 1].t;

  return {
    roundId: options.roundId,
    winnerName: options.winnerName,
    winnerSkinId: options.winnerSkinId,
    loserSkinId: options.loserSkinId,
    fovDeg: options.fovDeg,
    aspectRatio: options.aspectRatio,
    snapAtMs,
    frames,
  };
}

export function interpolateReplayFrame(
  frames: ReplayFrame[],
  timeMs: number,
): ReplayFrame {
  if (frames.length === 0) {
    throw new Error("Replay has no frames");
  }

  if (timeMs <= frames[0].t) {
    return frames[0];
  }

  const last = frames[frames.length - 1];
  if (timeMs >= last.t) {
    return last;
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i];
    const next = frames[i + 1];
    if (timeMs >= current.t && timeMs <= next.t) {
      const span = next.t - current.t;
      const alpha = span <= 0 ? 1 : (timeMs - current.t) / span;
      return {
        t: timeMs,
        cam: [
          current.cam[0] + (next.cam[0] - current.cam[0]) * alpha,
          current.cam[1] + (next.cam[1] - current.cam[1]) * alpha,
          current.cam[2] + (next.cam[2] - current.cam[2]) * alpha,
        ],
        camRot: [
          current.camRot[0] + (next.camRot[0] - current.camRot[0]) * alpha,
          current.camRot[1] + (next.camRot[1] - current.camRot[1]) * alpha,
          current.camRot[2] + (next.camRot[2] - current.camRot[2]) * alpha,
        ],
        opp: [
          current.opp[0] + (next.opp[0] - current.opp[0]) * alpha,
          current.opp[1] + (next.opp[1] - current.opp[1]) * alpha,
          current.opp[2] + (next.opp[2] - current.opp[2]) * alpha,
        ],
        oppRot: [
          current.oppRot[0] + (next.oppRot[0] - current.oppRot[0]) * alpha,
          current.oppRot[1] + (next.oppRot[1] - current.oppRot[1]) * alpha,
          current.oppRot[2] + (next.oppRot[2] - current.oppRot[2]) * alpha,
        ],
      };
    }
  }

  return last;
}
