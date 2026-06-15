export type PresenceStatus = "menu" | "hosting" | "in_match";

export interface FriendPresence {
  name: string;
  status: PresenceStatus;
  roomCode?: string;
}

const listeners = new Set<() => void>();
const presenceByNormalizedName = new Map<string, FriendPresence>();

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function applyPresenceSnapshot(entries: FriendPresence[]): void {
  for (const entry of entries) {
    presenceByNormalizedName.set(normalizeName(entry.name), {
      name: entry.name,
      status: entry.status,
      roomCode: entry.roomCode,
    });
  }
  for (const listener of listeners) {
    listener();
  }
}

export function getFriendPresence(name: string): FriendPresence | undefined {
  return presenceByNormalizedName.get(normalizeName(name));
}

export function presenceLabel(status: PresenceStatus): string {
  switch (status) {
    case "hosting":
      return "Hosting";
    case "in_match":
      return "In match";
    default:
      return "Online";
  }
}

export function subscribePresence(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
