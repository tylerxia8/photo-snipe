# Air Duct Network (duct-network-01)

Twin parallel duct trunks connected by cross passages — not a grid maze.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 44m × 44m |
| Duct height | 3.2m |
| Passage width | ~2.8m |
| Floor Y | 0 |

## Layout

```
        [West trunk]     cross     [East trunk]
Player A ──── N-S ──── at z=±12,0 ──── N-S ──── Player B
   (-12,-18)                              (12,18)
```

- **West trunk:** full north–south run at x = −12  
- **East trunk:** full north–south run at x = +12  
- **Cross ducts:** connect both trunks at z = −12, 0, and +12  
- **Inter-duct barriers:** insulation blocks between trunks except at cross openings  

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A | `(-12, 1, -18)` | South (+Z) along west trunk |
| B | `(12, 1, 18)` | North (−Z) along east trunk |

## Gameplay intent

- Players start on **opposite corners** and can reach each other via any cross duct
- Narrow trunks create ambush angles; center junction fan breaks sight lines
- No gridded fill — only duct walls and large outer insulation panels

## Data & code

- Round definition: `data/rounds/duct-network-01.json`
- Authoritative solids: `core/src/arena/duct-layout.ts`
