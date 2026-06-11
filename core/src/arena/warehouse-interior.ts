import {
  getWarehousePhotoOccluders,
  getWarehouseWallColliders,
} from "./warehouse-layout.js";
import type { AxisAlignedBox } from "./warehouse-layout.js";

export type { AxisAlignedBox };

/** Occluder geometry for warehouse-interior-01 — mirrors client warehouse layout. */
export function getWarehouseInteriorOccluders(): AxisAlignedBox[] {
  return getWarehousePhotoOccluders();
}

export function getOccludersForBuilding(buildingId: string): AxisAlignedBox[] {
  void buildingId;
  return getWarehouseInteriorOccluders();
}

export function getWallCollidersForBuilding(buildingId: string): AxisAlignedBox[] {
  void buildingId;
  return getWarehouseWallColliders();
}
