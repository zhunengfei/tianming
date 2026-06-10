extends Control

class_name TitleScreen

const MainScene := preload("res://scenes/main.tscn")
const SaveManagerScript := preload("res://scripts/save_manager.gd")
const SettingsManagerScript := preload("res://scripts/settings_manager.gd")
const ScenarioLoaderScript := preload("res://scripts/scenario_loader.gd")
const TianmingThemeScript := preload("res://scripts/tianming_theme.gd")
const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

var save_manager: RefCounted
var settings_manager: RefCounted
var current_main: Node
var title_panel: PanelContainer
var continue_button: Button
var status_label: Label
var load_slots_box: VBoxContainer
var load_slots_scroll: ScrollContainer
var settings_box: VBoxContainer
var settings_scroll: ScrollContainer
var scenario_box: VBoxContainer
var scenario_scroll: ScrollContainer
var scenario_rows: Array = []
var selected_scenario_path: String = ""

func _ready() -> void:
	theme = TianmingThemeScript.build()
	save_manager = SaveManagerScript.new()
	settings_manager = SettingsManagerScript.new()
	settings_manager.call("load_settings")
	_build_ui()
	refresh_continue_state()

func start_new_game() -> Dictionary:
	_clear_current_main()
	current_main = MainScene.instantiate()
	if not selected_scenario_path.is_empty():
		current_main.set("selected_scenario_path", selected_scenario_path)
	add_child(current_main)
	current_main.set_anchors_preset(Control.PRESET_FULL_RECT)
	title_panel.visible = false
	return {"ok": true}

func continue_game() -> Dictionary:
	return load_game_slot("quick")

func load_game_slot(slot_id: String) -> Dictionary:
	_clear_current_main()
	var metadata: Dictionary = _dict(save_manager.call("slot_metadata", slot_id)) if save_manager != null else {}
	if not bool(metadata.get("exists", false)):
		var missing_result: Dictionary = {
			"ok": false,
			"error": "save slot is empty: %s" % slot_id
		}
		_set_status("存档为空：%s" % slot_id)
		return missing_result
	if not bool(metadata.get("compatible", true)):
		var version_result: Dictionary = {
			"ok": false,
			"error": str(metadata.get("version_warning", "存档版本不兼容"))
		}
		_set_status(str(version_result.get("error", "")))
		return version_result
	current_main = MainScene.instantiate()
	var scenario_path: String = str(metadata.get("scenario_path", ""))
	if not scenario_path.is_empty():
		current_main.set("selected_scenario_path", scenario_path)
	add_child(current_main)
	current_main.set_anchors_preset(Control.PRESET_FULL_RECT)
	title_panel.visible = false
	var state: RefCounted = current_main.get("game_state") as RefCounted
	if state == null:
		return {
			"ok": false,
			"error": "main scene did not initialize game state"
		}
	var result: Dictionary = save_manager.call("restore_slot", state, slot_id)
	if not result.get("ok", false):
		title_panel.visible = true
		_clear_current_main()
		_set_status("读取失败：%s" % str(result.get("error", "")))
		return result
	if current_main.has_method("_refresh_runtime_bar"):
		current_main.call("_refresh_runtime_bar")
	print("[TianmingGodot] title loaded slot %s" % slot_id)
	return result

func return_to_title() -> void:
	_clear_current_main()
	title_panel.visible = true
	refresh_continue_state()

func has_continue_save() -> bool:
	if save_manager == null:
		return false
	var metadata: Dictionary = save_manager.call("slot_metadata", "quick")
	return bool(metadata.get("exists", false)) and bool(metadata.get("compatible", true))

func refresh_continue_state() -> void:
	var exists: bool = has_continue_save()
	if continue_button != null:
		continue_button.disabled = not exists
	if exists:
		var metadata: Dictionary = save_manager.call("slot_metadata", "quick")
		var scenario_name: String = str(metadata.get("scenario_name", ""))
		if scenario_name.is_empty():
			scenario_name = "未知剧本"
		_set_status("快速存档：%s · %d年%d月 · 第%d回合" % [
			scenario_name,
			int(_num(metadata.get("year", 0))),
			int(_num(metadata.get("month", 0))),
			int(_num(metadata.get("turn", 0)))
		])
	else:
		_set_status("暂无快速存档。")
	if load_slots_box != null and load_slots_box.visible:
		refresh_load_slots()

func open_load_menu() -> void:
	if load_slots_box == null:
		return
	_hide_title_menus()
	if load_slots_scroll != null:
		load_slots_scroll.visible = true
	load_slots_box.visible = true
	refresh_load_slots()

func available_scenarios() -> Array:
	if scenario_rows.is_empty():
		scenario_rows = ScenarioLoaderScript.list_project_scenarios()
	return scenario_rows.duplicate(true)

func select_scenario(path: String) -> Dictionary:
	for raw in available_scenarios():
		var scenario: Dictionary = _dict(raw)
		if str(scenario.get("path", "")) == path:
			selected_scenario_path = path
			_set_status("剧本：%s" % str(scenario.get("name", scenario.get("file_name", ""))))
			refresh_scenario_menu()
			return {
				"ok": true,
				"scenario": scenario
			}
	return {
		"ok": false,
		"error": "scenario not found: %s" % path
	}

func open_scenario_menu() -> void:
	if scenario_box == null:
		return
	_hide_title_menus()
	if scenario_scroll != null:
		scenario_scroll.visible = true
	scenario_box.visible = true
	refresh_scenario_menu()

func refresh_scenario_menu() -> void:
	if scenario_box == null:
		return
	for child in scenario_box.get_children():
		child.queue_free()
	scenario_box.add_child(TianmingUiScript.create_section_title("选择剧本"))
	for raw in available_scenarios():
		_add_scenario_row(_dict(raw))

func refresh_load_slots() -> void:
	if load_slots_box == null or save_manager == null:
		return
	for child in load_slots_box.get_children():
		child.queue_free()
	load_slots_box.add_child(TianmingUiScript.create_section_title("读取存档"))
	for raw in save_manager.call("list_slots"):
		_add_load_slot_row(_dict(raw))

func open_settings_menu() -> void:
	if settings_box == null:
		return
	_hide_title_menus()
	if settings_scroll != null:
		settings_scroll.visible = true
	settings_box.visible = true
	refresh_settings_menu()

func refresh_settings_menu() -> void:
	if settings_box == null or settings_manager == null:
		return
	for child in settings_box.get_children():
		child.queue_free()
	var snapshot: Dictionary = settings_manager.call("settings_snapshot")
	settings_box.add_child(TianmingUiScript.create_section_title("设置"))
	settings_box.add_child(TianmingUiScript.create_log_strip("窗口", "全屏" if bool(snapshot.get("fullscreen", false)) else "窗口", "gold"))
	settings_box.add_child(TianmingUiScript.create_log_strip("界面", "%.2f" % _num(snapshot.get("ui_scale", 1.0)), "neutral"))
	settings_box.add_child(TianmingUiScript.create_log_strip("音量", "%d%%" % roundi(_num(snapshot.get("master_volume", 0.8)) * 100.0), "neutral"))
	_add_settings_button_row([
		{"text": "窗口", "values": {"fullscreen": false}},
		{"text": "全屏", "values": {"fullscreen": true}},
	])
	_add_settings_button_row([
		{"text": "界面 1.00", "values": {"ui_scale": 1.0}},
		{"text": "界面 1.25", "values": {"ui_scale": 1.25}},
	])
	_add_settings_button_row([
		{"text": "音量 40%", "values": {"master_volume": 0.4}},
		{"text": "音量 80%", "values": {"master_volume": 0.8}},
	])

func apply_title_settings(values: Dictionary) -> Dictionary:
	if settings_manager == null:
		return {
			"ok": false,
			"error": "settings manager is not ready"
		}
	var result: Dictionary = settings_manager.call("update_settings", values)
	if not result.get("ok", false):
		_set_status("设置失败：%s" % str(result.get("error", "")))
		return result
	_set_status("设置已保存。")
	refresh_settings_menu()
	return result

func _build_ui() -> void:
	var background: ColorRect = ColorRect.new()
	background.color = Color(0.07, 0.055, 0.04, 1)
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	var root: VBoxContainer = VBoxContainer.new()
	root.add_theme_constant_override("separation", 14)
	title_panel = TianmingUiScript.create_content_panel(root, Vector4(28, 24, 28, 24))
	title_panel.set_anchors_preset(Control.PRESET_CENTER)
	title_panel.custom_minimum_size = Vector2(560, 520)
	title_panel.offset_left = -280
	title_panel.offset_top = -260
	title_panel.offset_right = 280
	title_panel.offset_bottom = 260
	add_child(title_panel)

	var title: Label = _make_label("天命", 36, Color(0.90, 0.76, 0.45), HORIZONTAL_ALIGNMENT_CENTER)
	root.add_child(title)
	var subtitle: Label = _make_label("Godot 重构版", 17, Color(0.78, 0.70, 0.58), HORIZONTAL_ALIGNMENT_CENTER)
	root.add_child(subtitle)

	var status_chip: PanelContainer = TianmingUiScript.create_status_chip("", "muted")
	root.add_child(status_chip)
	status_label = _find_meta_label(status_chip, "tianming_status_chip_label")
	if status_label != null:
		status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

	var buttons: VBoxContainer = VBoxContainer.new()
	buttons.add_theme_constant_override("separation", 10)
	root.add_child(buttons)

	var new_button: Button = _make_button("新局")
	new_button.pressed.connect(func() -> void:
		start_new_game()
	)
	buttons.add_child(new_button)

	var scenario_button: Button = _make_button("选择剧本")
	scenario_button.pressed.connect(func() -> void:
		open_scenario_menu()
	)
	buttons.add_child(scenario_button)

	continue_button = _make_button("继续")
	continue_button.pressed.connect(func() -> void:
		continue_game()
	)
	buttons.add_child(continue_button)

	var load_button: Button = _make_button("读取存档")
	load_button.pressed.connect(func() -> void:
		open_load_menu()
	)
	buttons.add_child(load_button)

	var settings_button: Button = _make_button("设置")
	settings_button.pressed.connect(func() -> void:
		open_settings_menu()
	)
	buttons.add_child(settings_button)

	var quit_button: Button = _make_button("退出")
	quit_button.pressed.connect(func() -> void:
		get_tree().quit(0)
	)
	buttons.add_child(quit_button)

	load_slots_box = VBoxContainer.new()
	load_slots_box.add_theme_constant_override("separation", 7)
	load_slots_box.visible = false
	load_slots_scroll = TianmingUiScript.create_scroll_area(null, Vector2(0, 180))
	load_slots_scroll.visible = false
	load_slots_scroll.add_child(load_slots_box)
	root.add_child(load_slots_scroll)

	scenario_box = VBoxContainer.new()
	scenario_box.add_theme_constant_override("separation", 7)
	scenario_box.visible = false
	scenario_scroll = TianmingUiScript.create_scroll_area(null, Vector2(0, 180))
	scenario_scroll.visible = false
	scenario_scroll.add_child(scenario_box)
	root.add_child(scenario_scroll)

	settings_box = VBoxContainer.new()
	settings_box.add_theme_constant_override("separation", 7)
	settings_box.visible = false
	settings_scroll = TianmingUiScript.create_scroll_area(null, Vector2(0, 180))
	settings_scroll.visible = false
	settings_scroll.add_child(settings_box)
	root.add_child(settings_scroll)

func _add_scenario_row(scenario: Dictionary) -> void:
	var row: HBoxContainer = HBoxContainer.new()
	row.set_meta("tianming_title_menu_row", true)
	row.set_meta("tianming_title_menu_row_kind", "scenario")
	row.add_theme_constant_override("separation", 8)
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scenario_box.add_child(row)

	var info_box: VBoxContainer = VBoxContainer.new()
	info_box.add_theme_constant_override("separation", 5)
	info_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(TianmingUiScript.create_content_panel(info_box, Vector4(8, 7, 8, 7)))
	info_box.add_child(TianmingUiScript.create_log_strip("剧本", _scenario_identity_text(scenario), "gold"))
	info_box.add_child(TianmingUiScript.create_log_strip("规模", _scenario_scale_text(scenario), "neutral"))

	var path: String = str(scenario.get("path", ""))
	var button: Button = TianmingUiScript.create_list_row_button("title_scenario_option", 62)
	button.text = "已选" if path == selected_scenario_path else "选择"
	button.set_meta("tianming_title_menu_row_button", true)
	button.set_meta("tianming_title_menu_row_kind", "scenario")
	button.set_meta("tianming_title_scenario_path", path)
	button.custom_minimum_size = Vector2(72, 62)
	TianmingUiScript.set_list_row_button_selected(button, path == selected_scenario_path)
	button.pressed.connect(func() -> void:
		select_scenario(path)
	)
	row.add_child(button)

func _scenario_desc(scenario: Dictionary) -> String:
	return "%s · %s" % [_scenario_identity_text(scenario), _scenario_scale_text(scenario)]

func _scenario_identity_text(scenario: Dictionary) -> String:
	var title: String = str(scenario.get("name", scenario.get("file_name", "")))
	var dynasty: String = str(scenario.get("dynasty", ""))
	var era: String = str(scenario.get("era", ""))
	var emperor: String = str(scenario.get("emperor", ""))
	var meta: PackedStringArray = PackedStringArray()
	for value in [dynasty, era, emperor]:
		if not str(value).is_empty():
			meta.append(str(value))
	if meta.is_empty():
		return title
	return "%s · %s" % [title, " / ".join(meta)]

func _scenario_scale_text(scenario: Dictionary) -> String:
	return "%d人 / %d势力 / %d地块" % [
		int(_num(scenario.get("characters", 0))),
		int(_num(scenario.get("factions", 0))),
		int(_num(scenario.get("map_regions", 0)))
	]

func _add_load_slot_row(metadata: Dictionary) -> void:
	var slot_id: String = str(metadata.get("slot_id", "quick"))
	var row: HBoxContainer = HBoxContainer.new()
	row.set_meta("tianming_title_menu_row", true)
	row.set_meta("tianming_title_menu_row_kind", "load_slot")
	row.set_meta("tianming_title_load_slot_id", slot_id)
	row.add_theme_constant_override("separation", 8)
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	load_slots_box.add_child(row)

	var info_box: VBoxContainer = VBoxContainer.new()
	info_box.add_theme_constant_override("separation", 5)
	info_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(TianmingUiScript.create_content_panel(info_box, Vector4(8, 7, 8, 7)))
	info_box.add_child(TianmingUiScript.create_log_strip("存档", _slot_desc(metadata), "gold" if bool(metadata.get("exists", false)) else "muted"))

	var status_chip: PanelContainer = TianmingUiScript.create_status_chip(_slot_status_text(metadata), _slot_status_tone(metadata))
	status_chip.set_meta("tianming_title_load_slot_status_chip", true)
	info_box.add_child(status_chip)

	var button: Button = TianmingUiScript.create_command_button("读取", 28)
	button.set_meta("tianming_title_menu_row_button", true)
	button.set_meta("tianming_title_menu_row_kind", "load_slot")
	button.custom_minimum_size = Vector2(72, 62)
	button.disabled = not bool(metadata.get("exists", false)) or not bool(metadata.get("compatible", true))
	button.pressed.connect(func() -> void:
		load_game_slot(slot_id)
	)
	row.add_child(button)

func _add_settings_button_row(buttons: Array) -> void:
	if settings_box == null:
		return
	var row: HBoxContainer = HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	settings_box.add_child(row)
	for raw in buttons:
		var item: Dictionary = _dict(raw)
		_add_settings_button(row, str(item.get("text", "")), _dict(item.get("values", {})))

func _add_settings_button(row: HBoxContainer, text: String, values: Dictionary) -> void:
	if text.is_empty() or values.is_empty():
		return
	var button: Button = TianmingUiScript.create_list_row_button("title_setting_option", 32)
	button.text = text
	_tag_setting_option(button, values)
	TianmingUiScript.set_list_row_button_selected(button, _setting_option_selected(values))
	button.custom_minimum_size = Vector2(92, 32)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var payload: Dictionary = values.duplicate(true)
	button.pressed.connect(func() -> void:
		apply_title_settings(payload)
	)
	row.add_child(button)

func _tag_setting_option(button: Button, values: Dictionary) -> void:
	for key in values.keys():
		button.set_meta("tianming_setting_key", str(key))
		button.set_meta("tianming_setting_value", values[key])
		return

func _setting_option_selected(values: Dictionary) -> bool:
	if settings_manager == null or values.is_empty():
		return false
	var snapshot: Dictionary = settings_manager.call("settings_snapshot")
	for key in values.keys():
		return _values_equal(snapshot.get(str(key), null), values[key])
	return false

func _values_equal(left: Variant, right: Variant) -> bool:
	if typeof(left) == TYPE_BOOL or typeof(right) == TYPE_BOOL:
		return bool(left) == bool(right)
	if typeof(left) == TYPE_INT or typeof(left) == TYPE_FLOAT or typeof(right) == TYPE_INT or typeof(right) == TYPE_FLOAT:
		return is_equal_approx(float(left), float(right))
	return str(left) == str(right)

func _hide_title_menus() -> void:
	if load_slots_box != null:
		load_slots_box.visible = false
	if load_slots_scroll != null:
		load_slots_scroll.visible = false
	if settings_box != null:
		settings_box.visible = false
	if settings_scroll != null:
		settings_scroll.visible = false
	if scenario_box != null:
		scenario_box.visible = false
	if scenario_scroll != null:
		scenario_scroll.visible = false

func _clear_current_main() -> void:
	if current_main == null:
		return
	current_main.queue_free()
	current_main = null

func _set_status(text: String) -> void:
	if status_label != null:
		status_label.text = text

func _make_button(text: String) -> Button:
	var button: Button = TianmingUiScript.create_command_button(text, 38)
	button.custom_minimum_size.y = 38
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return button

func _make_label(text: String, font_size: int, color: Color, alignment: HorizontalAlignment) -> Label:
	var label: Label = Label.new()
	label.text = text
	label.horizontal_alignment = alignment
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label

func _find_meta_label(root: Node, meta_name: String) -> Label:
	if root is Label and bool(root.get_meta(meta_name, false)):
		return root as Label
	for child in root.get_children():
		var found: Label = _find_meta_label(child, meta_name)
		if found != null:
			return found
	return null

func _slot_desc(metadata: Dictionary) -> String:
	var slot_id: String = str(metadata.get("slot_id", "quick"))
	var slot_name: String = "快速存档" if slot_id == "quick" else "槽位 %s" % slot_id.trim_prefix("slot_")
	if not bool(metadata.get("exists", false)):
		return "%s：空" % slot_name
	var scenario_name: String = str(metadata.get("scenario_name", ""))
	if scenario_name.is_empty():
		scenario_name = "未知剧本"
	if not bool(metadata.get("compatible", true)):
		return "%s：%s · %s" % [
			slot_name,
			scenario_name,
			str(metadata.get("version_warning", "存档版本不兼容"))
		]
	return "%s：%s · %d年%d月 · 第%d回合" % [
		slot_name,
		scenario_name,
		int(_num(metadata.get("year", 0))),
		int(_num(metadata.get("month", 0))),
		int(_num(metadata.get("turn", 0)))
	]

func _slot_status_text(metadata: Dictionary) -> String:
	if not bool(metadata.get("exists", false)):
		return "空"
	if not bool(metadata.get("compatible", true)):
		return "不兼容"
	return "可读取"

func _slot_status_tone(metadata: Dictionary) -> String:
	if not bool(metadata.get("exists", false)):
		return "muted"
	if not bool(metadata.get("compatible", true)):
		return "gold"
	return "jade"

func _num(value: Variant) -> float:
	if typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT:
		return float(value)
	return str(value).to_float()

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}
