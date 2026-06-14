# Warehouse Interior (warehouse-interior-01)

First playable PhotoSnipe building — a single-floor industrial warehouse.

## Dimensions

| Property | Value |
|---|---|
| Footprint | 48m × 48m |
| Wall height | 5m |
| Floor Y | 0 |

## Spawn points

| Player | Position | Facing |
|---|---|---|
| A (north) | `(2, 1, -24)` | South (+Z) |
| B (south) | `(2, 1, 24)` | North (-Z) |

## Layout zones

```
[North wall]  ← Player A spawn
  Loading bay + crates
  ─── partial cross walls at x=±12 (narrow center aisle) ───
  East/West shelf rows
  Central crate fort (blocks direct LOS)
  East/West shelf rows
[South wall]  ← Player B spawn
```

## Gameplay intent

- **No straight sight line** from spawn to spawn — central fort and cross-walls force flanking.
- **Side aisles** (east at x≈16, west at x≈-16) offer alternate routes.
- **Pillars** at mid-map break long sight lines across the central aisle.
- **Max photo distance** is 60m; full diagonal is ~68m, so players must close distance.

## Godot scene

`client/godot/buildings/warehouse_interior.tscn`

Geometry is built at runtime by `warehouse_interior.gd` for easy iteration. Open the scene in Godot to preview lighting; run the game scene to see collision.

## Tuning

Edit `warehouse_interior.gd` to move cover, walls, or crate positions. Keep spawn markers aligned with `data/rounds/warehouse-interior-01.json`.
