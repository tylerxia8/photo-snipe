# Urban Streets (city-streets-01)

Open-air downtown duel — a grid of avenues, corner towers, and street-level cover.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 40m × 40m |
| Curb height | 1.2m |
| Floor Y | 0 |

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A (north) | `(0, 1, -17)` | South (+Z) |
| B (south) | `(0, 1, 17)` | North (-Z) |

## Layout zones

```
[North curb]  ← Player A spawn
  Corner towers (NE/NW)
  Alley mid-rises + parked cars
  ═══ Main avenue (x = 0) ═══
  Central intersection + bus shelters
  Cross street (z = 0)
  Alley flanks + dumpsters
  Corner towers (SE/SW)
[South curb]  ← Player B spawn
```

## Gameplay intent

- **Street grid** creates lanes, alleys, and a contested center intersection.
- **Corner towers** block long angles and force mid-block flanks.
- **Cars, kiosks, and shelters** provide low cover without a full indoor maze.
- **Open sky** keeps sight lines readable at medium range.

## Data & code

- Round definition: `data/rounds/city-streets-01.json`
- Authoritative solids: `core/src/arena/city-streets-layout.ts`
- Web visuals: `client/web/src/game/arena.ts` (theme + decor)
