# School (school-01)

Two-story school built around hallways, with hideable classrooms, a cafeteria, a gym atrium, and working stairwells to the second floor.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 52m × 52m |
| Floor 1 height | 3.6m |
| Total height | 7.2m (double-height gym) |
| Floor 1 feet Y | 1.0 |
| Floor 2 feet Y | 3.7 |

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A (cafeteria) | `(0, 1, -16)` | North (+Z) |
| B (gym) | `(0, 1, 16)` | South (-Z) |

## Layout zones

```
Floor 2
  [Classrooms] — upstairs hall ring — [Classrooms]
         ↑ stair landings at x = ±16

Floor 1
  [Gym court + hoops + bleachers]     north (+Z)
        ↑ north hallway spur
  ═════ Main hallway (E-W) ═════
  [Lockers]              [Lockers]
  [Classrooms]           [Classrooms]
        ↓ south hallway spur
  [Cafeteria + serving line + tables] south (-Z)
```

## Gameplay intent

- **Hallways are the main routes** between gym, cafeteria, classrooms, and stairs.
- **Classrooms** on both floors are enclosed rooms with doors off the hall — good hiding spots.
- **Twin stairwells** at x = ±16 climb to second-floor landings that open onto the upstairs hall.
- **Gym** uses a hardwood floor, court lines, baskets, and side bleachers.
- **Cafeteria** has a serving counter and bench tables.

## Code / data files

- Layout: `core/src/arena/school-layout.ts`
- Round JSON: `data/rounds/school-01.json`
- Decor: `client/web/src/game/arena.ts` (`addSchoolDecor`)
