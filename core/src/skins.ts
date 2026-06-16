export type PlayerSkinId =
  | "teal"
  | "crimson"
  | "forest"
  | "violet"
  | "sunset"
  | "ghost"
  | "midnight"
  | "sandstorm"
  | "cobalt"
  | "slate"
  | "neon"
  | "obsidian";

export interface PlayerSkinDefinition {
  id: PlayerSkinId;
  name: string;
  shirtColor: number;
  pantsColor: number;
}

export const DEFAULT_SKIN_ID: PlayerSkinId = "teal";

export const PLAYER_SKINS: PlayerSkinDefinition[] = [
  { id: "teal", name: "Teal Ops", shirtColor: 0x00aaaa, pantsColor: 0x3b4cc0 },
  { id: "crimson", name: "Crimson", shirtColor: 0xe74c3c, pantsColor: 0x2c3e50 },
  { id: "forest", name: "Forest", shirtColor: 0x27ae60, pantsColor: 0x1e5631 },
  { id: "violet", name: "Violet", shirtColor: 0x9b59b6, pantsColor: 0x4a235a },
  { id: "sunset", name: "Sunset", shirtColor: 0xf39c12, pantsColor: 0xd35400 },
  { id: "ghost", name: "Ghost", shirtColor: 0xecf0f1, pantsColor: 0x95a5a6 },
  { id: "midnight", name: "Midnight", shirtColor: 0x1a3a5c, pantsColor: 0x0d1117 },
  { id: "sandstorm", name: "Sandstorm", shirtColor: 0xc9a66b, pantsColor: 0x6b4f2a },
  { id: "cobalt", name: "Cobalt", shirtColor: 0x2563eb, pantsColor: 0x1e3a8a },
  { id: "slate", name: "Slate", shirtColor: 0x64748b, pantsColor: 0x334155 },
  { id: "neon", name: "Neon Strike", shirtColor: 0x39ff14, pantsColor: 0x145214 },
  { id: "obsidian", name: "Obsidian", shirtColor: 0x1c1c1c, pantsColor: 0x050505 },
];

const SKIN_BY_ID = new Map(PLAYER_SKINS.map((skin) => [skin.id, skin]));

export function isValidSkinId(value: unknown): value is PlayerSkinId {
  return typeof value === "string" && SKIN_BY_ID.has(value as PlayerSkinId);
}

export function getSkin(skinId: PlayerSkinId): PlayerSkinDefinition {
  return SKIN_BY_ID.get(skinId) ?? SKIN_BY_ID.get(DEFAULT_SKIN_ID)!;
}

export function sanitizeSkinId(value: unknown): PlayerSkinId {
  return isValidSkinId(value) ? value : DEFAULT_SKIN_ID;
}
