import { randomBytes } from "node:crypto";
import type { WebSocket } from "ws";
import type { PlayerSlot } from "@photo-snipe/core";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface LobbyPlayer {
  clientId: string;
  socket: WebSocket;
  displayName: string;
  slot: PlayerSlot;
}

export interface Room {
  code: string;
  players: Partial<Record<PlayerSlot, LobbyPlayer>>;
  createdAtMs: number;
}

export function generateRoomCode(length = 4): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS[bytes[i] % ROOM_CODE_CHARS.length];
  }
  return code;
}

export class LobbyManager {
  private rooms = new Map<string, Room>();

  createRoom(socket: WebSocket, clientId: string, displayName: string): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }

    const room: Room = {
      code,
      players: {
        A: { clientId, socket, displayName, slot: "A" },
      },
      createdAtMs: Date.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(
    code: string,
    socket: WebSocket,
    clientId: string,
    displayName: string,
  ): { room: Room; slot: PlayerSlot } | null {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      return null;
    }
    if (room.players.B) {
      return null;
    }

    room.players.B = { clientId, socket, displayName, slot: "B" };
    return { room, slot: "B" };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  removePlayer(clientId: string): void {
    for (const [code, room] of this.rooms) {
      for (const slot of ["A", "B"] as const) {
        if (room.players[slot]?.clientId === clientId) {
          delete room.players[slot];
          if (!room.players.A && !room.players.B) {
            this.rooms.delete(code);
          }
          return;
        }
      }
    }
  }
}
