extends Node
class_name BuildingLoader

const ROUND_SCENE_MAP := {
	"warehouse-interior-01": "res://buildings/warehouse_interior.tscn",
}

func load_round_building(round_data: Dictionary) -> Node3D:
	var round_id: String = str(round_data.get("id", ""))
	var scene_path: String = ROUND_SCENE_MAP.get(round_id, "")

	if scene_path.is_empty():
		var building: Dictionary = round_data.get("building", {})
		var data_path: String = str(building.get("scene", ""))
		scene_path = _map_data_path(data_path)

	if not ResourceLoader.exists(scene_path):
		push_error("Building scene not found for round '%s': %s" % [round_id, scene_path])
		return null

	var packed: PackedScene = load(scene_path)
	if packed == null:
		push_error("Failed to load building scene: %s" % scene_path)
		return null

	return packed.instantiate() as Node3D

func _map_data_path(data_path: String) -> String:
	if data_path.ends_with("warehouse-main.glb"):
		return "res://buildings/warehouse_interior.tscn"
	if data_path.begins_with("res://"):
		return data_path
	return ""
