extends Node

const NORMAL_FOV := 75.0
const AIM_FOV := 40.0

@export var player: CharacterBody3D
@export var camera: Camera3D

func _ready() -> void:
	if player == null and get_parent():
		player = get_parent() as CharacterBody3D
	if camera == null and player:
		camera = player.get_node_or_null("Camera3D") as Camera3D

func _unhandled_input(event: InputEvent) -> void:
	if not event.is_action_pressed("capture"):
		return
	if camera == null or player == null:
		return

	var fps := player as FPSController
	var aiming := fps.aiming if fps else false
	if not aiming:
		return

	NetClient.send_photo_attempt(
		camera.global_position,
		fps.get_camera_rotation_deg() if fps else Vector3.ZERO,
		camera.fov,
		aiming
	)

func _process(_delta: float) -> void:
	if camera == null or player == null:
		return
	var fps := player as FPSController
	var aiming := fps.aiming if fps else false
	camera.fov = lerp(camera.fov, AIM_FOV if aiming else NORMAL_FOV, 0.15)
