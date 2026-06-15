import { CITY_STREETS_LAYOUT, CITY_STREETS_SOLID_BOXES } from "./city-streets-layout.js";
import { CORN_MAZE_LAYOUT, CORN_MAZE_SOLID_BOXES } from "./corn-maze-layout.js";
import {
  FREIGHT_DEPOT_LAYOUT,
  FREIGHT_DEPOT_SOLID_BOXES,
} from "./freight-depot-layout.js";
import { DUCT_NETWORK_LAYOUT, DUCT_NETWORK_SOLID_BOXES } from "./duct-layout.js";
import { ROOFTOP_LAYOUT, ROOFTOP_SOLID_BOXES } from "./rooftop-layout.js";
import {
  boxToAabb,
  type ArenaLayoutConfig,
  type ArenaSolidBox,
  type AxisAlignedBox,
} from "./solid-box.js";
import { WAREHOUSE_INTERIOR_SOLID_BOXES, WAREHOUSE_LAYOUT } from "./warehouse-layout.js";

export type { AxisAlignedBox, ArenaLayoutConfig, ArenaSolidBox };

export interface ArenaDefinition {
  layout: ArenaLayoutConfig;
  solids: ArenaSolidBox[];
}

const ARENAS: Record<string, ArenaDefinition> = {
  "warehouse-interior-01": {
    layout: WAREHOUSE_LAYOUT,
    solids: WAREHOUSE_INTERIOR_SOLID_BOXES,
  },
  "freight-depot-01": {
    layout: FREIGHT_DEPOT_LAYOUT,
    solids: FREIGHT_DEPOT_SOLID_BOXES,
  },
  "rooftop-01": {
    layout: ROOFTOP_LAYOUT,
    solids: ROOFTOP_SOLID_BOXES,
  },
  "duct-network-01": {
    layout: DUCT_NETWORK_LAYOUT,
    solids: DUCT_NETWORK_SOLID_BOXES,
  },
  "corn-maze-01": {
    layout: CORN_MAZE_LAYOUT,
    solids: CORN_MAZE_SOLID_BOXES,
  },
  "city-streets-01": {
    layout: CITY_STREETS_LAYOUT,
    solids: CITY_STREETS_SOLID_BOXES,
  },
};

const DEFAULT_ARENA_ID = "warehouse-interior-01";

export const DEFAULT_ROUND_ID = DEFAULT_ARENA_ID;

export function isValidRoundId(value: unknown): value is string {
  return typeof value === "string" && value in ARENAS;
}

export function sanitizeRoundId(value: unknown): string {
  return isValidRoundId(value) ? value : DEFAULT_ARENA_ID;
}

export function listArenaOptions(): Array<{ id: string; name: string }> {
  return listArenaRoundIds().map((id) => ({
    id,
    name: getArenaLayout(id).name,
  }));
}

export function getArenaDefinition(roundId: string): ArenaDefinition {
  return ARENAS[roundId] ?? ARENAS[DEFAULT_ARENA_ID]!;
}

export function getArenaLayout(roundId: string): ArenaLayoutConfig {
  return getArenaDefinition(roundId).layout;
}

export function getArenaSolids(roundId: string): ArenaSolidBox[] {
  return getArenaDefinition(roundId).solids;
}

export function getOccludersForRound(roundId: string): AxisAlignedBox[] {
  return getArenaSolids(roundId)
    .filter((box) => box.occludesPhotos)
    .map(boxToAabb);
}

/** @deprecated Use getOccludersForRound with round id instead. */
export function getOccludersForBuilding(buildingId: string): AxisAlignedBox[] {
  void buildingId;
  return getOccludersForRound(DEFAULT_ARENA_ID);
}

export function listArenaRoundIds(): string[] {
  return Object.keys(ARENAS);
}
