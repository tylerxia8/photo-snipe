import type { RoundDefinition } from "@photo-snipe/core";
import { isValidRoundId, sanitizeRoundId } from "@photo-snipe/core";

const roundModules: Record<string, () => Promise<unknown>> = {
  "warehouse-interior-01": () =>
    import("../../../../data/rounds/warehouse-interior-01.json"),
  "freight-depot-01": () => import("../../../../data/rounds/freight-depot-01.json"),
  "rooftop-01": () => import("../../../../data/rounds/rooftop-01.json"),
  "duct-network-01": () => import("../../../../data/rounds/duct-network-01.json"),
  "corn-maze-01": () => import("../../../../data/rounds/corn-maze-01.json"),
  "city-streets-01": () => import("../../../../data/rounds/city-streets-01.json"),
  "parking-garage-01": () => import("../../../../data/rounds/parking-garage-01.json"),
};

export async function loadRoundDefinition(roundId: string): Promise<RoundDefinition> {
  const id = sanitizeRoundId(roundId);
  const loader = roundModules[id];
  if (!loader) {
    throw new Error(`Unknown round: ${roundId}`);
  }
  const module = (await loader()) as { default: RoundDefinition };
  const round = module.default;
  if (!isValidRoundId(round.id)) {
    throw new Error(`Invalid round definition: ${round.id}`);
  }
  return round;
}
