const STORAGE_KEY = "photo-snipe-friends";

export interface FriendEntry {
  id: string;
  name: string;
  addedAt: number;
}

const listeners = new Set<() => void>();

function loadFriends(): FriendEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as { friends?: unknown };
    if (!Array.isArray(parsed.friends)) {
      return [];
    }
    return parsed.friends
      .filter(
        (entry): entry is FriendEntry =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as FriendEntry).id === "string" &&
          typeof (entry as FriendEntry).name === "string",
      )
      .map((entry) => ({
        id: entry.id,
        name: entry.name.trim(),
        addedAt: typeof entry.addedAt === "number" ? entry.addedAt : Date.now(),
      }))
      .filter((entry) => entry.name.length > 0);
  } catch {
    return [];
  }
}

let cachedFriends = loadFriends();

function persist(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ friends: cachedFriends }));
  for (const listener of listeners) {
    listener();
  }
}

export function getFriends(): FriendEntry[] {
  return [...cachedFriends].sort((a, b) => a.name.localeCompare(b.name));
}

export function addFriend(name: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, reason: "Enter a username." };
  }
  if (trimmed.length > 24) {
    return { ok: false, reason: "Username must be 24 characters or fewer." };
  }

  const normalized = trimmed.toLowerCase();
  if (cachedFriends.some((friend) => friend.name.toLowerCase() === normalized)) {
    return { ok: false, reason: "That operator is already on your list." };
  }

  cachedFriends.push({
    id: crypto.randomUUID(),
    name: trimmed,
    addedAt: Date.now(),
  });
  persist();
  return { ok: true };
}

export function removeFriend(id: string): void {
  cachedFriends = cachedFriends.filter((friend) => friend.id !== id);
  persist();
}

export function subscribeFriends(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
