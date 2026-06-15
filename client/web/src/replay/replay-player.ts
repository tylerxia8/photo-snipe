import type { MatchReplay } from "@photo-snipe/core";
import { interpolateReplayFrame } from "@photo-snipe/core";
import type { Game } from "../game/game.js";

const HOLD_AFTER_SNAP_MS = 900;

export interface ReplayPlaybackHud {
  flash: () => void;
  setMessage: (text: string) => void;
}

export interface ReplayOverlay {
  show: (winnerName: string) => void;
  hide: () => void;
}

export function playMatchReplay(
  replay: MatchReplay,
  game: Game,
  overlay: ReplayOverlay,
  hud: ReplayPlaybackHud,
): Promise<void> {
  return new Promise((resolve) => {
    overlay.show(replay.winnerName);
    hud.setMessage(`Kill cam — ${replay.winnerName}`);
    game.enterReplay(replay);

    const totalDurationMs = replay.snapAtMs + HOLD_AFTER_SNAP_MS;
    let startTime: number | null = null;
    let flashed = false;

    function frame(now: number): void {
      if (startTime === null) {
        startTime = now;
      }

      const elapsed = now - startTime;
      const frameState = interpolateReplayFrame(replay.frames, Math.min(elapsed, replay.snapAtMs));
      game.applyReplayFrame(frameState);
      game.renderReplay();

      if (!flashed && elapsed >= replay.snapAtMs) {
        flashed = true;
        hud.flash();
      }

      if (elapsed >= totalDurationMs) {
        game.exitReplay();
        overlay.hide();
        resolve();
        return;
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
}

export function parseMatchReplay(value: unknown): MatchReplay | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const replay = value as Partial<MatchReplay>;
  if (
    typeof replay.roundId !== "string" ||
    typeof replay.winnerName !== "string" ||
    typeof replay.snapAtMs !== "number" ||
    !Array.isArray(replay.frames) ||
    replay.frames.length === 0
  ) {
    return null;
  }

  return replay as MatchReplay;
}
