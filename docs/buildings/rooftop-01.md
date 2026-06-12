# City Rooftop (rooftop-01)

Second playable PhotoSnipe arena — a compact open-air rooftop duel.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 36m × 36m |
| Parapet height | 1.4m |
| Floor Y | 0 |

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A (north) | `(0, 1, -14)` | South (+Z) |
| B (south) | `(0, 1, 14)` | North (-Z) |

## Layout zones

```
[North parapet]  ← Player A spawn
  HVAC clusters (NE/NW corners)
  ─── divider walls at x = ±8 ───
  Central AC unit (main cover)
  Helipad marker (north side)
  Duct runs along east/west
[South parapet]  ← Player B spawn
```

## Gameplay intent

- **Smaller footprint** than the warehouse — faster engagements.
- **Low parapet walls** provide partial cover without full indoor maze complexity.
- **Central AC cluster** blocks direct line of sight between spawns.
- **Divider walls** create two approach lanes.

## Data & code

- Round definition: `data/rounds/rooftop-01.json`
- Authoritative solids: `core/src/arena/rooftop-layout.ts`
- Web visuals: `client/web/src/game/arena.ts` (theme + decor)
