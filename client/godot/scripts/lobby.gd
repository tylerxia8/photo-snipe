extends Control

@export var game_scene: PackedScene

@onready var name_input: LineEdit = $Panel/VBox/NameInput
@onready var room_code_input: LineEdit = $Panel/VBox/RoomCodeInput
@onready var status_label: Label = $Panel/VBox/StatusLabel

func _ready() -> void:
	NetClient.connected.connect(_on_connected)
	NetClient.message_received.connect(_on_message)
	NetClient.connection_error.connect(_on_connection_error)
	NetClient.connect_to_server()

func _on_create_pressed() -> void:
	var display_name := _display_name()
	NetClient.create_room(display_name)
	_set_status("Creating room...")

func _on_join_pressed() -> void:
	var code := room_code_input.text.strip_edges().to_upper()
	if code.is_empty():
		_set_status("Enter a room code")
		return
	NetClient.join_room(code, _display_name())
	_set_status("Joining room %s..." % code)

func _display_name() -> String:
	var name := name_input.text.strip_edges()
	return name if not name.is_empty() else "Player"

func _on_connected(client_id: String) -> void:
	_set_status("Connected (%s)" % client_id.left(8))

func _on_connection_error(message: String) -> void:
	_set_status(message)

func _on_message(payload: Dictionary) -> void:
	match str(payload.get("type")):
		"room_created":
			_set_status("Room created! Code: %s" % str(payload.get("roomCode")))
		"room_joined":
			_set_status("Joined room %s" % str(payload.get("roomCode")))
		"match_started":
			player_slot = str(payload.get("playerSlot"))
			_set_status("Match started vs %s" % str(payload.get("opponentName")))
			_start_game(payload)
		"error":
			_set_status("%s: %s" % [str(payload.get("code")), str(payload.get("message"))])

func _start_game(payload: Dictionary) -> void:
	if game_scene == null:
		return
	var game := game_scene.instantiate()
	game.set_meta("match_payload", payload)
	get_tree().root.add_child(game)
	queue_free()

func _set_status(text: String) -> void:
	if status_label:
		status_label.text = text
