export type ServerMessage = Record<string, unknown> & { type: string };

function wsUrl(): string {
  if (import.meta.env.DEV) {
    return "ws://localhost:8787";
  }
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}`;
}

export class NetClient {
  private ws: WebSocket | null = null;
  onMessage: ((msg: ServerMessage) => void) | null = null;
  onStatus: ((text: string) => void) | null = null;
  clientId = "";

  connect(): void {
    this.ws = new WebSocket(wsUrl());
    this.onStatus?.("Connecting…");

    this.ws.onopen = () => {
      this.onStatus?.("Connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as ServerMessage;
        if (msg.type === "connected") {
          this.clientId = String(msg.clientId ?? "");
        }
        this.onMessage?.(msg);
      } catch {
        /* ignore */
      }
    };

    this.ws.onclose = () => {
      this.onStatus?.("Disconnected");
    };

    this.ws.onerror = () => {
      this.onStatus?.("Connection error");
    };
  }

  send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  createRoom(displayName: string, skinId: string, roundId: string): void {
    this.send({ type: "create_room", displayName, skinId, roundId });
  }

  joinRoom(roomCode: string, displayName: string, skinId: string): void {
    this.send({ type: "join_room", roomCode, displayName, skinId });
  }

  sendPlayerState(
    position: [number, number, number],
    rotation: [number, number, number],
    aiming: boolean,
    sequence: number,
  ): void {
    this.send({
      type: "player_state",
      position,
      rotation,
      aiming,
      sequence,
    });
  }

  sendPhotoAttempt(
    cameraPosition: [number, number, number],
    cameraRotation: [number, number, number],
    fovDeg: number,
    aiming: boolean,
    aspectRatio: number,
  ): void {
    this.send({
      type: "photo_attempt",
      cameraPosition,
      cameraRotation,
      fovDeg,
      aiming,
      aspectRatio,
    });
  }

  requestRematch(): void {
    this.send({ type: "rematch_request" });
  }

  returnToMenu(): void {
    this.send({ type: "return_to_menu" });
  }

  setPresence(displayName: string): void {
    this.send({ type: "set_presence", displayName });
  }

  getPresence(names: string[]): void {
    this.send({ type: "get_presence", names });
  }

  sendFriendInvite(targetName: string): void {
    this.send({ type: "send_friend_invite", targetName });
  }
}
