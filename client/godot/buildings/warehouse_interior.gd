extends Node3D
## Warehouse Interior — first playable PhotoSnipe building.
## Layout: 48m x 48m single-floor warehouse with opposite-end spawns,
## central cover, side aisles, and partial walls that block direct LOS.

const FLOOR_Y := 0.0
const WALL_HEIGHT := 5.0
const WALL_THICKNESS := 0.4

var _mat_floor: StandardMaterial3D
var _mat_wall: StandardMaterial3D
var _mat_crate: StandardMaterial3D
var _mat_shelf: StandardMaterial3D
var _mat_metal: StandardMaterial3D

func _ready() -> void:
	_init_materials()
	_build_floor()
	_build_perimeter()
	_build_cross_walls()
	_build_side_bays()
	_build_cover_props()
	_build_spawn_markers()

func _init_materials() -> void:
	_mat_floor = _make_mat(Color(0.32, 0.32, 0.34))
	_mat_wall = _make_mat(Color(0.45, 0.47, 0.52))
	_mat_crate = _make_mat(Color(0.52, 0.38, 0.22))
	_mat_shelf = _make_mat(Color(0.28, 0.30, 0.34))
	_mat_metal = _make_mat(Color(0.55, 0.56, 0.58), 0.4, 0.6)

func _make_mat(color: Color, roughness: float = 0.85, metallic: float = 0.05) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	mat.metallic = metallic
	return mat

func _add_box(
	parent: Node3D,
	pos: Vector3,
	size: Vector3,
	mat: StandardMaterial3D,
	name_suffix: String = "Box"
) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = "Static_%s" % name_suffix
	body.position = pos

	var mesh_inst := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size
	mesh_inst.mesh = box
	mesh_inst.material_override = mat
	body.add_child(mesh_inst)

	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	col.shape = shape
	body.add_child(col)

	parent.add_child(body)
	return body

func _build_floor() -> void:
	var floor_root := Node3D.new()
	floor_root.name = "Floor"
	add_child(floor_root)
	_add_box(floor_root, Vector3(0, FLOOR_Y - 0.1, 0), Vector3(48, 0.2, 48), _mat_floor, "Floor")

func _build_perimeter() -> void:
	var walls := Node3D.new()
	walls.name = "PerimeterWalls"
	add_child(walls)

	# North / south full width
	_add_box(walls, Vector3(0, WALL_HEIGHT * 0.5, -24), Vector3(48, WALL_HEIGHT, WALL_THICKNESS), _mat_wall, "North")
	_add_box(walls, Vector3(0, WALL_HEIGHT * 0.5, 24), Vector3(48, WALL_HEIGHT, WALL_THICKNESS), _mat_wall, "South")
	# East / west
	_add_box(walls, Vector3(24, WALL_HEIGHT * 0.5, 0), Vector3(WALL_THICKNESS, WALL_HEIGHT, 48), _mat_wall, "East")
	_add_box(walls, Vector3(-24, WALL_HEIGHT * 0.5, 0), Vector3(WALL_THICKNESS, WALL_HEIGHT, 48), _mat_wall, "West")

func _build_cross_walls() -> void:
	var interior := Node3D.new()
	interior.name = "InteriorWalls"
	add_child(interior)

	# Outer-wing cross walls — wide center and side aisles stay open (x between -18 and 18)
	for z in [-14, 0, 14]:
		_add_box(interior, Vector3(-21, 2.5, z), Vector3(6, 5, WALL_THICKNESS), _mat_wall, "Cross_%d_W" % z)
		_add_box(interior, Vector3(21, 2.5, z), Vector3(6, 5, WALL_THICKNESS), _mat_wall, "Cross_%d_E" % z)

func _build_side_bays() -> void:
	var bays := Node3D.new()
	bays.name = "SideBays"
	add_child(bays)

	# East storage row
	for z in [-18, -8, 8, 18]:
		_add_box(bays, Vector3(16, 1.25, z), Vector3(4, 2.5, 6), _mat_shelf, "Shelf_E_%d" % z)

	# West storage row
	for z in [-18, -8, 8, 18]:
		_add_box(bays, Vector3(-16, 1.25, z), Vector3(4, 2.5, 6), _mat_shelf, "Shelf_W_%d" % z)

	# Mezzanine pillars breaking sight lines
	for pos in [Vector3(8, 3, -6), Vector3(-8, 3, 6), Vector3(8, 3, 6), Vector3(-8, 3, -6)]:
		_add_box(bays, pos, Vector3(0.8, 6, 0.8), _mat_metal, "Pillar")

func _build_cover_props() -> void:
	var props := Node3D.new()
	props.name = "CoverProps"
	add_child(props)

	# Central fort — blocks direct spawn-to-spawn line of sight
	_add_box(props, Vector3(0, 1.0, 0), Vector3(7, 2, 5), _mat_crate, "CentralFort")
	_add_box(props, Vector3(0, 2.6, 0), Vector3(5, 2, 3.5), _mat_crate, "CentralFort_Top")

	# Crate clusters near each spawn approach
	var crate_positions := [
		Vector3(6, 0.75, -20), Vector3(-5, 0.75, -18),
		Vector3(10, 0.75, -6), Vector3(-10, 0.75, -4),
		Vector3(5, 0.75, 8), Vector3(-6, 0.75, 12),
		Vector3(8, 0.75, 20), Vector3(-7, 0.75, 18),
		Vector3(3, 0.75, -2), Vector3(-4, 0.75, 3),
	]
	for i in crate_positions.size():
		var pos: Vector3 = crate_positions[i]
		var size := Vector3(2.0, 1.5, 2.0) if i % 2 == 0 else Vector3(1.5, 1.2, 1.5)
		_add_box(props, pos, size, _mat_crate, "Crate_%d" % i)

func _build_spawn_markers() -> void:
	# Visual-only markers aligned with data/rounds/warehouse-interior-01.json
	var markers := Node3D.new()
	markers.name = "SpawnMarkers"
	add_child(markers)

	_add_marker(markers, Vector3(0, 0.05, -18), Color(0.2, 0.5, 0.9), "SpawnA")
	_add_marker(markers, Vector3(0, 0.05, 18), Color(0.9, 0.35, 0.2), "SpawnB")

func _add_marker(parent: Node3D, pos: Vector3, color: Color, marker_name: String) -> void:
	var mesh_inst := MeshInstance3D.new()
	mesh_inst.name = marker_name
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.6
	cyl.bottom_radius = 0.6
	cyl.height = 0.08
	mesh_inst.mesh = cyl
	mesh_inst.position = pos
	var mat := _make_mat(color, 0.5, 0.1)
	mesh_inst.material_override = mat
	parent.add_child(mesh_inst)
