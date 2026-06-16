# Parking Garage (parking-garage-01)

Simple indoor duel arena — one open concrete floor with pillars and parked cars only.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 40m × 40m |
| Ceiling height | 4.5m |
| Floor 1 feet Y | 1.0 |
| Pillars | 1.8m × 1.8m × 4.5m (full height) |
| Cars | 4.6m × 2.4m × 2.0m |

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A | `(-10, 1, -16)` | North (+Z), into spawn car |
| B | `(10, 1, 16)` | South (-Z), into spawn car |

Each player starts **behind their own parked car** with pillars nearby for peeking. Spawn line of sight to the opponent is blocked by the center pillar row and mid-map cars — you need to move out of cover to get a shot.

## Layout zones

```
[North wall]  ← Player B behind car at (10, 13)
  Side pillars + flank cars at (±14, 0)
  Center pillar cross + mid cars at (0, -12) and (0, 12)
[South wall]  ← Player A behind car at (-10, -13)
```

## Gameplay intent

- **Flat single floor** — no stairs or floor transitions.
- **Cars and pillars only** — no jersey barriers or partition walls; props never share the same footprint.
- **Spawn cars** block opening snap shots; **pillars** and **mid-map cars** support hiding mid-duel.

## Code / data files

- Layout: `core/src/arena/parking-garage-layout.ts`
- Round JSON: `data/rounds/parking-garage-01.json`
- Decor: `client/web/src/game/arena.ts` (`addParkingGarageDecor`)
