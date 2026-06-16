import type { MatchPerformanceSnapshot } from "@photo-snipe/core";

let photoAttempts = 0;
let invalidPhotoAttempts = 0;

export function resetMatchPerformance(): void {
  photoAttempts = 0;
  invalidPhotoAttempts = 0;
}

export function recordPhotoAttempt(valid: boolean): void {
  photoAttempts += 1;
  if (!valid) {
    invalidPhotoAttempts += 1;
  }
}

export function getMatchPerformanceSnapshot(): MatchPerformanceSnapshot {
  return {
    photoAttempts,
    invalidPhotoAttempts,
  };
}
