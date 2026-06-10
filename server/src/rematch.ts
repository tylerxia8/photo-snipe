import type { PlayerSlot } from "@photo-snipe/core";
import type { LobbyPlayer } from "./lobby.js";

export interface RematchSession {
  roomCode: string;
  players: Record<PlayerSlot, LobbyPlayer>;
  votes: Partial<Record<PlayerSlot, boolean>>;
}

export class RematchManager {
  private sessions = new Map<string, RematchSession>();

  register(roomCode: string, players: Record<PlayerSlot, LobbyPlayer>): void {
    this.sessions.set(roomCode.toUpperCase(), {
      roomCode: roomCode.toUpperCase(),
      players,
      votes: {},
    });
  }

  get(roomCode: string): RematchSession | undefined {
    return this.sessions.get(roomCode.toUpperCase());
  }

  clear(roomCode: string): void {
    this.sessions.delete(roomCode.toUpperCase());
  }

  setVote(roomCode: string, slot: PlayerSlot, ready: boolean): RematchSession | null {
    const session = this.get(roomCode);
    if (!session) {
      return null;
    }
    if (ready) {
      session.votes[slot] = true;
    } else {
      delete session.votes[slot];
    }
    return session;
  }

  bothReady(session: RematchSession): boolean {
    return session.votes.A === true && session.votes.B === true;
  }
}
