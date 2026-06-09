import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MatchConfig, RoundDefinition } from "@photo-snipe/core";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export async function loadRound(roundId: string): Promise<RoundDefinition> {
  const filePath = path.join(repoRoot, "data", "rounds", `${roundId}.json`);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as RoundDefinition;
}

export async function loadMatchConfig(
  matchId = "duel-standard",
): Promise<MatchConfig> {
  const filePath = path.join(repoRoot, "data", "matches", `${matchId}.json`);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as MatchConfig;
}
