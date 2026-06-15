export interface MatchTransport {
  sendPlayerState(
    position: [number, number, number],
    rotation: [number, number, number],
    aiming: boolean,
    sequence: number,
  ): void;
  sendPhotoAttempt(
    cameraPosition: [number, number, number],
    cameraRotation: [number, number, number],
    fovDeg: number,
    aiming: boolean,
    aspectRatio: number,
  ): void;
}

export class TransportRouter implements MatchTransport {
  current: MatchTransport | null = null;

  sendPlayerState(
    position: [number, number, number],
    rotation: [number, number, number],
    aiming: boolean,
    sequence: number,
  ): void {
    this.current?.sendPlayerState(position, rotation, aiming, sequence);
  }

  sendPhotoAttempt(
    cameraPosition: [number, number, number],
    cameraRotation: [number, number, number],
    fovDeg: number,
    aiming: boolean,
    aspectRatio: number,
  ): void {
    this.current?.sendPhotoAttempt(
      cameraPosition,
      cameraRotation,
      fovDeg,
      aiming,
      aspectRatio,
    );
  }
}
