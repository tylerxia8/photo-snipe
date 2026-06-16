import { describe, expect, it } from "vitest";
import { PLAYER_SKINS, isValidSkinId } from "./skins.js";

describe("operator skins", () => {
  it("defines unique skin ids", () => {
    const ids = PLAYER_SKINS.map((skin) => skin.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PLAYER_SKINS.length).toBeGreaterThanOrEqual(12);
  });

  it("validates known skin ids", () => {
    expect(isValidSkinId("midnight")).toBe(true);
    expect(isValidSkinId("obsidian")).toBe(true);
    expect(isValidSkinId("unknown")).toBe(false);
  });
});
