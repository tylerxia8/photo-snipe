extends CharacterBody3D
class_name FPSController

const WALK_SPEED := 3.0
const AIM_SPEED_MULTIPLIER := 0.6
const MOUSE_SENSITIVITY := 0.002
const STATE_SEND_INTERVAL := 0.05
const JUMP_VELOCITY := 4.5

@export var camera: Camera3D
var aiming: bool = false
var _yaw: float = 0.0
var _pitch: float = 0.0
var _state_timer: float = 0.0
var _sequence: int = 0

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	if camera == null:
		camera = $Camera3D

func apply_spawn(position: Vector3, rotation_deg: Vector3) -> void:
	global_position = position
	_yaw = deg_to_rad(rotation_deg.y)
	_pitch = deg_to_rad(rotation_deg.x)
	rotation.y = _yaw
	camera.rotation.x = _pitch

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var motion := event as InputEventMouseMotion
		_yaw -= motion.relative.x * MOUSE_SENSITIVITY
		_pitch -= motion.relative.y * MOUSE_SENSITIVITY
		_pitch = clampf(_pitch, deg_to_rad(-89.0), deg_to_rad(89.0))
		rotation.y = _yaw
		camera.rotation.x = _pitch

	if event.is_action_pressed("aim"):
		aiming = true
	if event.is_action_released("aim"):
		aiming = false

func _physics_process(delta: float) -> void:
	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var direction := (transform.basis * Vector3(input_dir.x, 0.0, input_dir.y)).normalized()

	var speed := WALK_SPEED
	if aiming:
		speed *= AIM_SPEED_MULTIPLIER

	if direction != Vector3.ZERO:
		velocity.x = direction.x * speed
		velocity.z = direction.z * speed
	else:
		velocity.x = move_toward(velocity.x, 0.0, speed)
		velocity.z = move_toward(velocity.z, 0.0, speed)

	if is_on_floor() and Input.is_action_just_pressed("jump"):
		velocity.y = JUMP_VELOCITY

	velocity.y -= 9.8 * delta
	move_and_slide()

	_send_state(delta)

func _send_state(delta: float) -> void:
	_state_timer += delta
	if _state_timer < STATE_SEND_INTERVAL:
		return
	_state_timer = 0.0
	_sequence += 1

	var rot_deg := Vector3(
		rad_to_deg(_pitch),
		rad_to_deg(_yaw),
		0.0
	)
	NetClient.send_player_state(global_position, rot_deg, aiming, _sequence)

func get_camera_rotation_deg() -> Vector3:
	return Vector3(
		rad_to_deg(_pitch),
		rad_to_deg(_yaw),
		0.0
	)
