import type { WebSocket } from "ws";

export type PresenceStatus = "menu" | "hosting" | "in_match";

export interface OnlineClient {
  clientId: string;
  displayName: string;
  socket: WebSocket;
  status: PresenceStatus;
  roomCode?: string;
}

export interface PresenceEntry {
  name: string;
  status: PresenceStatus;
  roomCode?: string;
}

export function normalizeDisplayName(name: string): string {
  return name.trim().toLowerCase();
}

export class PresenceRegistry {
  private byClientId = new Map<string, OnlineClient>();
  private byNormalizedName = new Map<string, string>();

  register(
    clientId: string,
    socket: WebSocket,
    displayName: string,
    status: PresenceStatus = "menu",
    roomCode?: string,
  ): OnlineClient {
    const trimmed = displayName.trim() || "Player";
    const normalized = normalizeDisplayName(trimmed);

    this.remove(clientId);

    const existingClientId = this.byNormalizedName.get(normalized);
    if (existingClientId && existingClientId !== clientId) {
      this.remove(existingClientId);
    }

    const entry: OnlineClient = {
      clientId,
      displayName: trimmed,
      socket,
      status,
      roomCode,
    };

    this.byClientId.set(clientId, entry);
    this.byNormalizedName.set(normalized, clientId);
    return entry;
  }

  updateStatus(
    clientId: string,
    status: PresenceStatus,
    roomCode?: string,
  ): OnlineClient | undefined {
    const entry = this.byClientId.get(clientId);
    if (!entry) {
      return undefined;
    }

    entry.status = status;
    if (roomCode) {
      entry.roomCode = roomCode;
    } else if (status === "menu") {
      entry.roomCode = undefined;
    }
    return entry;
  }

  get(clientId: string): OnlineClient | undefined {
    return this.byClientId.get(clientId);
  }

  findByName(name: string): OnlineClient | undefined {
    const clientId = this.byNormalizedName.get(normalizeDisplayName(name));
    if (!clientId) {
      return undefined;
    }
    return this.byClientId.get(clientId);
  }

  getPresenceForNames(names: string[]): PresenceEntry[] {
    const results: PresenceEntry[] = [];
    const seen = new Set<string>();

    for (const name of names) {
      const normalized = normalizeDisplayName(name);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);

      const online = this.findByName(name);
      if (!online) {
        continue;
      }

      results.push({
        name: online.displayName,
        status: online.status,
        roomCode: online.roomCode,
      });
    }

    return results;
  }

  remove(clientId: string): void {
    const entry = this.byClientId.get(clientId);
    if (!entry) {
      return;
    }

    this.byClientId.delete(clientId);
    const normalized = normalizeDisplayName(entry.displayName);
    if (this.byNormalizedName.get(normalized) === clientId) {
      this.byNormalizedName.delete(normalized);
    }
  }
}
