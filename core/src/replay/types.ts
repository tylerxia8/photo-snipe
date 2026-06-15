export interface ReplayFrame {
  t: number;
  cam: [number, number, number];
  camRot: [number, number, number];
  win: [number, number, number];
  winRot: [number, number, number];
  opp: [number, number, number];
  oppRot: [number, number, number];
}

export interface MatchReplay {
  roundId: string;
  winnerName: string;
  winnerSkinId: string;
  loserSkinId: string;
  fovDeg: number;
  aspectRatio: number;
  snapAtMs: number;
  frames: ReplayFrame[];
}
