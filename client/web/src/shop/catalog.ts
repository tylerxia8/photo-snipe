import { listArenaOptions } from "@photo-snipe/core";
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
  {
    id: "skin-midnight",
    type: "skin",
    name: "Midnight",
    description: "Deep navy kit for night raids.",
    price: 350,
    skinId: "midnight",
  },
  {
    id: "skin-sandstorm",
    type: "skin",
    name: "Sandstorm",
    description: "Desert tan loadout for open maps.",
    price: 400,
    skinId: "sandstorm",
  },
  {
    id: "skin-cobalt",
    type: "skin",
    name: "Cobalt",
    description: "Electric blue urban operator gear.",
    price: 450,
    skinId: "cobalt",
  },
  {
    id: "skin-slate",
    type: "skin",
    name: "Slate",
    description: "Low-profile gray tactical uniform.",
    price: 500,
    skinId: "slate",
  },
  {
    id: "skin-neon",
    type: "skin",
    name: "Neon Strike",
    description: "High-vis green for bold operators.",
    price: 550,
    skinId: "neon",
  },
  {
    id: "skin-obsidian",
    type: "skin",
    name: "Obsidian",
    description: "All-black elite stealth suit.",
    price: 600,
    skinId: "obsidian",
  },
];

const ARENA_PASS_DEFS: Record<
  string,
  { slug: string; name: string; description: string; price: number }
> = {
  "warehouse-interior-01": {
    slug: "warehouse",
    name: "Warehouse Pass",
    description: "Host on Warehouse Interior from day one.",
    price: 0,
  },
  "freight-depot-01": {
    slug: "freight-depot",
    name: "Freight Depot Pass",
    description: "Unlock hosting on Freight Depot early.",
    price: 150,
  },
  "rooftop-01": {
    slug: "rooftop",
    name: "Rooftop Pass",
    description: "Unlock hosting on City Rooftop early.",
    price: 250,
  },
  "duct-network-01": {
    slug: "duct-network",
    name: "Duct Network Pass",
    description: "Unlock hosting on Air Duct Network early.",
    price: 400,
  },
  "corn-maze-01": {
    slug: "corn-maze",
    name: "Corn Maze Pass",
    description: "Unlock hosting on Corn Maze early.",
    price: 500,
  },
  "city-streets-01": {
    slug: "city-streets",
    name: "Urban Streets Pass",
    description: "Unlock hosting on Urban Streets early.",
    price: 650,
  },
  "parking-garage-01": {
    slug: "parking-garage",
    name: "Parking Garage Pass",
    description: "Unlock hosting on Parking Garage early.",
    price: 750,
  },
};

export const SHOP_ARENA_PASSES: ShopItem[] = listArenaOptions().map((arena) => {
  const def = ARENA_PASS_DEFS[arena.id];
  if (!def) {
    throw new Error(`Missing arena pass definition for ${arena.id}`);
  }

  return {
    id: `pass-${def.slug}`,
    type: "arena_pass",
    name: def.name,
    description: def.description,
    price: def.price,
    arenaId: arena.id,
  };
});

export const SHOP_ITEMS: ShopItem[] = [...SHOP_SKINS, ...SHOP_ARENA_PASSES];
