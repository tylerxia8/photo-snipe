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
| A | `(-10, 1, -16)` | North (+Z), into spawn car |
| B | `(10, 1, 16)` | South (-Z), into spawn car |

Each player starts **behind their own parked car** with pillars nearby for peeking. Spawn line of sight to the opponent is blocked by cars, barriers, and pillars — you need to move out of cover to get a shot.

## Layout zones

```
[North wall]  ← Player B behind car at (10, 12.5)
  Pillars + flank cars
  ─── wide jersey barriers + half-height partition walls ───
  Pillars + flank cars
[South wall]  ← Player A behind car at (-10, -12.5)
```

## Gameplay intent

- **Flat single floor** — no stairs or floor transitions.
- **Spawn cars** block opening snap shots; **pillars** and **mid-map cars** support hiding mid-duel.
- **Jersey barriers** split the center lane for staggered pushes.

## Code / data files

- Layout: `core/src/arena/parking-garage-layout.ts`
- Round JSON: `data/rounds/parking-garage-01.json`
- Decor: `client/web/src/game/arena.ts` (`addParkingGarageDecor`)
