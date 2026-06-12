export type { AxisAlignedBox, ArenaLayoutConfig, ArenaSolidBox } from "./solid-box.js";
export {
  getArenaDefinition,
  getArenaLayout,
  getArenaSolids,
  getOccludersForBuilding,
  getOccludersForRound,
  listArenaRoundIds,
} from "./registry.js";
export { WAREHOUSE_INTERIOR_SOLID_BOXES, WAREHOUSE_LAYOUT } from "./warehouse-layout.js";
export { ROOFTOP_LAYOUT, ROOFTOP_SOLID_BOXES } from "./rooftop-layout.js";
export { DUCT_NETWORK_LAYOUT, DUCT_NETWORK_SOLID_BOXES } from "./duct-layout.js";

import { boxToAabb } from "./solid-box.js";
import { getArenaSolids, getOccludersForRound } from "./registry.js";
import type { AxisAlignedBox } from "./solid-box.js";

/** @deprecated Use getOccludersForRound instead. */
export function getWarehouseInteriorOccluders(): AxisAlignedBox[] {
  return getOccludersForRound("warehouse-interior-01");
}

/** @deprecated Use getArenaSolids + boxToAabb instead. */
export function getWallCollidersForBuilding(buildingId: string): AxisAlignedBox[] {
  void buildingId;
  return getArenaSolids("warehouse-interior-01")
    .filter((box) => box.category === "wall")
    .map(boxToAabb);
}
