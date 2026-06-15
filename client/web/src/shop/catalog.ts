import type { PlayerSkinId } from "@photo-snipe/core";

export type ShopItemType = "skin" | "arena_pass";

export interface ShopItem {
  id: string;
  type: ShopItemType;
  name: string;
  description: string;
  price: number;
  skinId?: PlayerSkinId;
  arenaId?: string;
}

export const SHOP_SKINS: ShopItem[] = [
  {
    id: "skin-teal",
    type: "skin",
    name: "Teal Ops",
    description: "Standard issue operator kit.",
    price: 0,
    skinId: "teal",
  },
  {
    id: "skin-crimson",
    type: "skin",
    name: "Crimson",
    description: "High-contrast red loadout.",
    price: 75,
    skinId: "crimson",
  },
  {
    id: "skin-forest",
    type: "skin",
    name: "Forest",
    description: "Muted greens for urban stalking.",
    price: 125,
    skinId: "forest",
  },
  {
    id: "skin-violet",
    type: "skin",
    name: "Violet",
    description: "Neon purple street style.",
    price: 175,
    skinId: "violet",
  },
  {
    id: "skin-sunset",
    type: "skin",
    name: "Sunset",
    description: "Warm orange combat gear.",
    price: 225,
    skinId: "sunset",
  },
  {
    id: "skin-ghost",
    type: "skin",
    name: "Ghost",
    description: "Pale stealth operator suit.",
    price: 300,
    skinId: "ghost",
  },
];

export const SHOP_ARENA_PASSES: ShopItem[] = [
  {
    id: "pass-freight-depot",
    type: "arena_pass",
    name: "Freight Depot Pass",
    description: "Unlock hosting on Freight Depot early.",
    price: 150,
    arenaId: "freight-depot-01",
  },
  {
    id: "pass-rooftop",
    type: "arena_pass",
    name: "Rooftop Pass",
    description: "Unlock hosting on City Rooftop early.",
    price: 250,
    arenaId: "rooftop-01",
  },
  {
    id: "pass-duct-network",
    type: "arena_pass",
    name: "Duct Network Pass",
    description: "Unlock hosting on Air Duct Network early.",
    price: 400,
    arenaId: "duct-network-01",
  },
  {
    id: "pass-corn-maze",
    type: "arena_pass",
    name: "Corn Maze Pass",
    description: "Unlock hosting on Corn Maze early.",
    price: 500,
    arenaId: "corn-maze-01",
  },
];

export const SHOP_ITEMS: ShopItem[] = [...SHOP_SKINS, ...SHOP_ARENA_PASSES];
