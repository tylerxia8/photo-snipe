# School (school-01)

Two-story school interior with classrooms, lockers, cafeteria, gym, and twin stairwells.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 52m × 52m |
| Floor 1 height | 3.6m |
| Total height | 7.2m (double-height gym atrium) |
| Floor 1 feet Y | 1.0 |
| Floor 2 feet Y | 3.7 |

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A (cafeteria) | `(-16, 1, -18)` | North (+Z) |
| B (gym) | `(16, 1, 18)` | South (-Z) |

## Layout zones

```
Floor 2
  [Classrooms NW/NE/SW/SE] — hall ring at center with stairs to floor 1

Floor 1
  [Gym / double-height atrium]     north (+Z)
  ═════ Main hallway (E-W) ═════
  [West classrooms]  [East locker hall]
  [Cafeteria]                      south (-Z)
  Twin stairs at x = ±12
```

## Gameplay intent

- **Two routes** between floors via east and west stairwells.
- **Gym atrium** is open to the ceiling — strong vertical sight lines from the balcony edge.
- **Cafeteria tables** and **locker banks** provide mid-map cover on floor 1.
- **Classrooms** on both floors offer flanking lanes off the main hall.
- **Max photo distance** is 58m; map diagonal is ~73m, so players must close distance.

## Code / data files

- Layout: `core/src/arena/school-layout.ts`
- Round JSON: `data/rounds/school-01.json`
- Decor: `client/web/src/game/arena.ts` (`addSchoolDecor`)
