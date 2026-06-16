# Parking Garage (parking-garage-01)

Simple indoor duel arena — one open concrete floor with pillars, parked cars, and jersey barriers.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 40m × 40m |
| Ceiling height | 4.5m |
| Floor 1 feet Y | 1.0 |

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A | `(0, 1, -16)` | North (+Z) |
| B | `(0, 1, 16)` | South (-Z) |

## Layout zones

```
[North wall]  ← Player B spawn
  Parked cars (NE/NW) + pillars in two rows
  ─── center lane with jersey barriers ───
  Parked cars (SE/SW) + pillars
[South wall]  ← Player A spawn
```

## Gameplay intent

- **Flat single floor** — no stairs or floor transitions.
- **Pillar grid** breaks sight lines without maze complexity.
- **Four parked cars** and **two barriers** give simple mid-map cover.

## Code / data files

- Layout: `core/src/arena/parking-garage-layout.ts`
- Round JSON: `data/rounds/parking-garage-01.json`
- Decor: `client/web/src/game/arena.ts` (`addParkingGarageDecor`)
