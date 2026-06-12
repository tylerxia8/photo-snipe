import { describe, expect, it } from "vitest";
import {
  getArenaLayout,
  getOccludersForRound,
  listArenaRoundIds,
} from "./registry.js";

describe("arena registry", () => {
  it("lists known arenas", () => {
    expect(listArenaRoundIds()).toEqual(["warehouse-interior-01", "rooftop-01"]);
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

  it("provides photo occluders per arena", () => {
    const warehouse = getOccludersForRound("warehouse-interior-01");
    const rooftop = getOccludersForRound("rooftop-01");
    expect(warehouse.length).toBeGreaterThan(10);
    expect(rooftop.length).toBeGreaterThan(5);
    expect(rooftop.length).toBeLessThan(warehouse.length);
  });
});
