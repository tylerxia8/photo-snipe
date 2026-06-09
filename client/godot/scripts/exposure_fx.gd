extends Node
class_name ExposureFX

@export var flash_overlay: ColorRect
@export var shutter_audio: AudioStreamPlayer3D

func play_local_capture() -> void:
	_flash_screen()
	if shutter_audio:
		shutter_audio.play()

func play_opponent_exposure(world_position: Vector3, payload: Dictionary) -> void:
	if shutter_audio and payload.get("sound", true):
		shutter_audio.global_position = world_position
		shutter_audio.play()

	if payload.get("flash", true):
		_spawn_flash_light(world_position, float(payload.get("flashDurationSec", 0.15)))

func _flash_screen() -> void:
	if flash_overlay == null:
		return
	flash_overlay.visible = true
	flash_overlay.modulate.a = 0.8
	var tween := create_tween()
	tween.tween_property(flash_overlay, "modulate:a", 0.0, 0.15)
	tween.tween_callback(func(): flash_overlay.visible = false)

func _spawn_flash_light(world_position: Vector3, duration: float) -> void:
	var light := OmniLight3D.new()
	light.position = world_position + Vector3(0, 1.6, 0)
	light.light_energy = 4.0
	light.omni_range = 40.0
	get_tree().current_scene.add_child(light)

	var tween := create_tween()
	tween.tween_property(light, "light_energy", 0.0, duration)
	tween.tween_callback(light.queue_free)
