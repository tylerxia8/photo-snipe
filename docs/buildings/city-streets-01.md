# Urban Streets (city-streets-01)

Open-air downtown duel — boulevard, cross street, skyscrapers, a park, and street-level life.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 64m × 64m |
| Curb height | 1.2m |
| Floor Y | 0 |

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A (north) | `(0, 1, -29)` | South (+Z) |
| B (south) | `(0, 1, 29)` | North (-Z) |

## Layout zones

```
[North curb]  ← Player A spawn
  NW park (trees, benches, fountain)
  NE financial towers
  ═══ Main boulevard (10m) ═══
  Central intersection + crosswalks
  Cross street + yellow taxi
  Hot dog carts + parked cars on curbs
  SW / SE mid-rise blocks + skyscrapers
[South curb]  ← Player B spawn
```

## Gameplay intent

- **Readable city grid** with asphalt roads, sidewalks, and green park space.
- **Skyscrapers** block long angles; alleys and side streets enable flanks.
- **Street cover** — parked cars, vendor carts, shelters, and newsstands.
- **Open sky** with light urban haze for medium-range duels on a larger map.

## Data & code

- Round definition: `data/rounds/city-streets-01.json`
- Authoritative solids: `core/src/arena/city-streets-layout.ts`
- Web visuals: `client/web/src/game/arena.ts` (theme + decor)
