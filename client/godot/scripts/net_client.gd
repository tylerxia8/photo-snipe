extends Node
class_name NetClient

signal connected(client_id: String)
signal message_received(payload: Dictionary)
signal connection_error(message: String)

var server_url: String = "ws://localhost:8787"
var client_id: String = ""

var _socket: WebSocketPeer = WebSocketPeer.new()
var _connected: bool = false

func _ready() -> void:
	_load_config()

func _load_config() -> void:
	var path := "res://config/network.cfg"
	if FileAccess.file_exists(path):
		var file := FileAccess.open(path, FileAccess.READ)
		while file.get_position() < file.get_length():
			var line := file.get_line().strip_edges()
			if line.begins_with("server_url="):
				server_url = line.substr("server_url=".length())

func connect_to_server() -> void:
	var err := _socket.connect_to_url(server_url)
	if err != OK:
		connection_error.emit("Failed to connect: %s" % err)

func _process(_delta: float) -> void:
	_socket.poll()
	var state := _socket.get_ready_state()

	if state == WebSocketPeer.STATE_OPEN:
		if not _connected:
			_connected = true
		while _socket.get_available_packet_count() > 0:
			var packet := _socket.get_packet().get_string_from_utf8()
			var parsed = JSON.parse_string(packet)
			if typeof(parsed) == TYPE_DICTIONARY:
				_handle_message(parsed)
	elif state == WebSocketPeer.STATE_CLOSED:
		if _connected:
			_connected = false
			connection_error.emit("Disconnected from server")

func _handle_message(payload: Dictionary) -> void:
	if payload.get("type") == "connected":
		client_id = str(payload.get("client_id", ""))
		connected.emit(client_id)
	message_received.emit(payload)

func send_message(payload: Dictionary) -> void:
	if _socket.get_ready_state() != WebSocketPeer.STATE_OPEN:
		return
	_socket.send_text(JSON.stringify(payload))

func create_room(display_name: String) -> void:
	send_message({
		"type": "create_room",
		"displayName": display_name,
	})

func join_room(room_code: String, display_name: String) -> void:
	send_message({
		"type": "join_room",
		"roomCode": room_code,
		"displayName": display_name,
	})

func send_player_state(position: Vector3, rotation: Vector3, aiming: bool, sequence: int) -> void:
	send_message({
		"type": "player_state",
		"position": [position.x, position.y, position.z],
		"rotation": [rotation.x, rotation.y, rotation.z],
		"aiming": aiming,
		"sequence": sequence,
	})

func send_photo_attempt(
	camera_position: Vector3,
	camera_rotation: Vector3,
	fov_deg: float,
	aiming: bool
) -> void:
	send_message({
		"type": "photo_attempt",
		"cameraPosition": [camera_position.x, camera_position.y, camera_position.z],
		"cameraRotation": [camera_rotation.x, camera_rotation.y, camera_rotation.z],
		"fovDeg": fov_deg,
		"aiming": aiming,
	})
