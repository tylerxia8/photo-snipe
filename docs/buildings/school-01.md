# School (school-01)

Two-story school built around a wide central hallway, with hideable classrooms, a cafeteria, a gym atrium, and climbable stair alcoves to the second floor.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 48m × 48m |
| Floor 1 height | 3.6m |
| Total height | 7.2m (double-height gym) |
| Floor 1 feet Y | 1.0 |
| Floor 2 feet Y | 3.6 |

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A (cafeteria) | `(0, 1, -14)` | North (+Z) |
| B (gym) | `(0, 1, 14)` | South (-Z) |

## Layout zones

```
Floor 2
  [Classrooms] — upstairs hall — [Classrooms]
         ↑ stair alcoves at x = ±10

Floor 1
  [Gym court + hoops + bleachers]     north (+Z)
        ↑ wide door off main hall
  ═════ Main hallway (E-W) ═════
  [Lockers]              [Lockers]
  [Classrooms]           [Classrooms]
        ↓ wide door off main hall
  [Cafeteria + serving line + tables] south (-Z)
```

## Gameplay intent

- **Wide central hall** connects gym, cafeteria, classrooms, and stairs without narrow spurs.
- **Every room has four walls** with a single wide doorway into the hall.
- **Floor 2 is hidden from floor 1** by an opaque first-floor ceiling — only the gym atrium and stair shafts stay open.
- **Stair alcoves** at x = ±10 use thin tread colliders plus step-up movement; they land directly on the second-floor hall at z = 0.
- **Gym** uses hardwood floor tint, court lines, baskets, and side bleachers.
- **Cafeteria** has a serving counter and bench tables.

## Code / data files

- Layout: `core/src/arena/school-layout.ts`
- Round JSON: `data/rounds/school-01.json`
- Decor: `client/web/src/game/arena.ts` (`addSchoolDecor`)
