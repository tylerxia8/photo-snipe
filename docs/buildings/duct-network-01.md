# Air Duct Network (duct-network-01)

A cramped HVAC crawl space made of narrow metal duct runs and tight corners.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 44m × 44m |
| Duct height | 3.2m |
| Passage width | ~2.6m |
| Floor Y | 0 |

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A (north-west run) | `(-14, 1, -17)` | South (+Z) |
| B (south-west run) | `(-10, 1, 17)` | North (-Z) |

## Layout

Serpentine duct path through the facility:

```
A spawn ──► south ──► east ──► south ──► west ──► south ──► B spawn
```

Non-walkable space is filled with solid duct mass so players stay inside the passages.

## Gameplay intent

- **Tight quarters** — limited room to dodge or flank
- **Corner peeks** — 90° turns create ambush moments
- **Low ceiling** — claustrophobic sight lines
- **Fan block** — central blower unit breaks line of sight mid-map

## Data & code

- Round definition: `data/rounds/duct-network-01.json`
- Authoritative solids: `core/src/arena/duct-layout.ts`
- Web visuals: `client/web/src/game/arena.ts` (duct theme + hazard stripes)
