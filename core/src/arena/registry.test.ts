import { describe, expect, it } from "vitest";
import {
  getArenaLayout,
  getOccludersForRound,
  listArenaOptions,
  listArenaRoundIds,
  sanitizeRoundId,
} from "./registry.js";

describe("arena registry", () => {
  it("lists known arenas", () => {
    expect(listArenaRoundIds()).toEqual([
      "warehouse-interior-01",
      "rooftop-01",
      "duct-network-01",
    ]);
  });

  it("returns rooftop layout metadata", () => {
    const layout = getArenaLayout("rooftop-01");
    expect(layout.name).toBe("City Rooftop");
    expect(layout.halfExtent).toBe(18);
  });

  it("falls back to warehouse for unknown round ids", () => {
    const layout = getArenaLayout("unknown-arena");
    expect(layout.id).toBe("warehouse-interior-01");
  });

  it("sanitizes unknown round ids to warehouse", () => {
    expect(sanitizeRoundId("unknown-arena")).toBe("warehouse-interior-01");
    expect(sanitizeRoundId("rooftop-01")).toBe("rooftop-01");
  });

  it("lists arena options with display names", () => {
    expect(listArenaOptions()).toEqual([
      { id: "warehouse-interior-01", name: "Warehouse Interior" },
      { id: "rooftop-01", name: "City Rooftop" },
      { id: "duct-network-01", name: "Air Duct Network" },
    ]);
  });

  it("returns duct layout metadata", () => {
    const layout = getArenaLayout("duct-network-01");
    expect(layout.name).toBe("Air Duct Network");
    expect(layout.wallHeight).toBe(3.2);
  });

  it("provides photo occluders per arena", () => {
    const warehouse = getOccludersForRound("warehouse-interior-01");
    const rooftop = getOccludersForRound("rooftop-01");
    const ducts = getOccludersForRound("duct-network-01");
    expect(warehouse.length).toBeGreaterThan(10);
    expect(rooftop.length).toBeGreaterThan(5);
    expect(ducts.length).toBeGreaterThan(20);
    expect(rooftop.length).toBeLessThan(warehouse.length);
  });
});
