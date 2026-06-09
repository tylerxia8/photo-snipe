extends Node3D

var player_slot: String = ""

var _building_loader := BuildingLoader.new()
var _active_building: Node3D = null

@onready var building_root: Node3D = $BuildingRoot
@onready var player: FPSController = $Player
@onready var opponent: Node3D = $Opponent
@onready var exposure_fx: ExposureFX = $ExposureFX
@onready var hud_label: Label = $UI/HUD
@onready var round_name_label: Label = $UI/RoundName

func _ready() -> void:
	NetClient.message_received.connect(_on_message)
	_load_default_building()

func _on_message(payload: Dictionary) -> void:
	match str(payload.get("type")):
		"round_started":
			_handle_round_started(payload)
		"opponent_state":
			_handle_opponent_state(payload)
		"photo_exposure":
			_handle_photo_exposure(payload)
		"photo_result":
			_handle_photo_result(payload)
		"match_ended":
			_handle_match_end(payload)

func _handle_round_started(payload: Dictionary) -> void:
	var round_data: Dictionary = payload.get("round", {})
	_load_building(round_data)

	var spawn: Dictionary = payload.get("yourSpawn", {})
	var pos_arr: Array = spawn.get("position", [0, 1, 0])
	var rot_arr: Array = spawn.get("rotation", [0, 0, 0])
	if player:
		player.apply_spawn(
			Vector3(float(pos_arr[0]), float(pos_arr[1]), float(pos_arr[2])),
			Vector3(float(rot_arr[0]), float(rot_arr[1]), float(rot_arr[2]))
		)
	if hud_label:
		hud_label.text = "Left Shift to snap a photo"
	if round_name_label:
		round_name_label.text = str(round_data.get("name", "Round"))

func _load_default_building() -> void:
	_load_building({"id": "warehouse-interior-01"})

func _load_building(round_data: Dictionary) -> void:
	if _active_building:
		_active_building.queue_free()
		_active_building = null

	var building := _building_loader.load_round_building(round_data)
	if building == null:
		if hud_label:
			hud_label.text = "Failed to load building"
		return

	building_root.add_child(building)
	_active_building = building

func _handle_opponent_state(payload: Dictionary) -> void:
	if opponent == null:
		return
	var pos_arr: Array = payload.get("position", [0, 0, 0])
	var rot_arr: Array = payload.get("rotation", [0, 0, 0])
	opponent.global_position = Vector3(float(pos_arr[0]), float(pos_arr[1]), float(pos_arr[2]))
	opponent.rotation_degrees = Vector3(float(rot_arr[0]), float(rot_arr[1]), float(rot_arr[2]))

func _handle_photo_exposure(payload: Dictionary) -> void:
	if exposure_fx == null:
		return
	var pos_arr: Array = payload.get("position", [0, 0, 0])
	var pos := Vector3(float(pos_arr[0]), float(pos_arr[1]), float(pos_arr[2]))
	exposure_fx.play_opponent_exposure(pos, payload)

func _handle_photo_result(payload: Dictionary) -> void:
	if exposure_fx:
		exposure_fx.play_local_capture()
	if hud_label:
		if payload.get("valid", false):
			hud_label.text = "Valid capture!"
		else:
			hud_label.text = "Miss"

func _handle_match_end(payload: Dictionary) -> void:
	if hud_label:
		hud_label.text = "Match over! Winner: %s" % str(payload.get("winnerSlot"))
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
