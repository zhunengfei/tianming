extends PanelContainer

class_name SystemPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal quick_save_requested
signal quick_load_requested
signal settings_apply_requested(values: Dictionary)
signal return_title_requested

var status_label: Label
var settings_label: Label
var quick_label: Label
var quick_load_button: Button
var current_settings: Dictionary = {}
var setting_option_buttons: Array = []

func _ready() -> void:
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 14)
	add_child(margin)

	var root: VBoxContainer = VBoxContainer.new()
	root.add_theme_constant_override("separation", 11)
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_child(root)

	status_label = _make_label("系统菜单已就绪。", 13, Color(0.78, 0.70, 0.58))
	root.add_child(TianmingUiScript.create_panel_header("系统", status_label))

	var body_box: VBoxContainer = VBoxContainer.new()
	body_box.add_theme_constant_override("separation", 11)
	body_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var body_scroll: ScrollContainer = TianmingUiScript.create_scroll_area(body_box)
	root.add_child(body_scroll)

	var save_box: VBoxContainer = VBoxContainer.new()
	save_box.add_theme_constant_override("separation", 8)
	body_box.add_child(TianmingUiScript.create_content_panel(save_box, Vector4(10, 8, 10, 8)))
	save_box.add_child(TianmingUiScript.create_section_title("快速存读"))
	quick_label = _add_log_strip(save_box, "快速存档", "muted")
	var save_row: HBoxContainer = HBoxContainer.new()
	save_row.add_theme_constant_override("separation", 8)
	save_box.add_child(save_row)
	var save_button: Button = _make_button("快速保存")
	save_button.pressed.connect(func() -> void:
		emit_signal("quick_save_requested")
	)
	save_row.add_child(save_button)
	quick_load_button = _make_button("快速读取")
	quick_load_button.pressed.connect(func() -> void:
		emit_signal("quick_load_requested")
	)
	save_row.add_child(quick_load_button)

	var settings_box: VBoxContainer = VBoxContainer.new()
	settings_box.add_theme_constant_override("separation", 8)
	body_box.add_child(TianmingUiScript.create_content_panel(settings_box, Vector4(10, 8, 10, 8)))
	settings_box.add_child(TianmingUiScript.create_section_title("设置"))
	settings_label = _add_log_strip(settings_box, "当前设置", "gold")
	_add_settings_button_row(settings_box, [
		{"text": "窗口", "values": {"fullscreen": false}},
		{"text": "全屏", "values": {"fullscreen": true}},
	])
	_add_settings_button_row(settings_box, [
		{"text": "界面 1.00", "values": {"ui_scale": 1.0}},
		{"text": "界面 1.25", "values": {"ui_scale": 1.25}},
	])
	_add_settings_button_row(settings_box, [
		{"text": "音量 40%", "values": {"master_volume": 0.4}},
		{"text": "音量 80%", "values": {"master_volume": 0.8}},
	])

	var return_button: Button = _make_button("返回标题")
	return_button.custom_minimum_size.y = 36
	return_button.pressed.connect(func() -> void:
		emit_signal("return_title_requested")
	)
	body_box.add_child(return_button)

	set_data({}, false)

func set_data(settings: Dictionary, has_quick_save: bool) -> void:
	current_settings = settings.duplicate(true)
	if quick_label != null:
		quick_label.text = "可读取" if has_quick_save else "暂无"
	if quick_load_button != null:
		quick_load_button.disabled = not has_quick_save
	if settings_label != null:
		settings_label.text = "窗口：%s · 界面 %.2f · 音量 %d%%" % [
			"全屏" if bool(settings.get("fullscreen", false)) else "窗口",
			_num(settings.get("ui_scale", 1.0)),
			roundi(_num(settings.get("master_volume", 0.8)) * 100.0)
		]
	_refresh_setting_option_buttons()

func set_status(text: String) -> void:
	if status_label != null:
		status_label.text = text

func visible_text() -> String:
	return "系统\n%s\n%s\n%s" % [
		"" if status_label == null else status_label.text,
		"" if quick_label == null else "快速存档：%s" % quick_label.text,
		"" if settings_label == null else settings_label.text
	]

func _make_button(text: String) -> Button:
	var button: Button = TianmingUiScript.create_command_button(text, 30)
	button.custom_minimum_size = Vector2(92, 30)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return button

func _add_log_strip(parent: VBoxContainer, title_text: String, tone: String) -> Label:
	var strip: PanelContainer = TianmingUiScript.create_log_strip(title_text, "", tone)
	parent.add_child(strip)
	return _find_meta_label(strip, "tianming_log_strip_value")

func _find_meta_label(root: Node, meta_name: String) -> Label:
	if root is Label and bool(root.get_meta(meta_name, false)):
		return root as Label
	for child in root.get_children():
		var found: Label = _find_meta_label(child, meta_name)
		if found != null:
			return found
	return null

func _add_settings_button_row(parent: VBoxContainer, buttons: Array) -> void:
	var row: HBoxContainer = HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	parent.add_child(row)
	for raw in buttons:
		var item: Dictionary = _dict(raw)
		_add_settings_button(row, str(item.get("text", "")), _dict(item.get("values", {})))

func _add_settings_button(row: HBoxContainer, text: String, values: Dictionary) -> void:
	if text.is_empty() or values.is_empty():
		return
	var button: Button = TianmingUiScript.create_list_row_button("system_setting_option", 32)
	button.text = text
	button.custom_minimum_size = Vector2(92, 32)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_tag_setting_option(button, values)
	TianmingUiScript.set_list_row_button_selected(button, _setting_option_selected(values))
	setting_option_buttons.append(button)
	var payload: Dictionary = values.duplicate(true)
	button.pressed.connect(func() -> void:
		emit_signal("settings_apply_requested", payload)
	)
	row.add_child(button)

func _refresh_setting_option_buttons() -> void:
	for raw in setting_option_buttons:
		var button: Button = raw as Button
		if button == null:
			continue
		var values: Dictionary = _dict(button.get_meta("tianming_setting_values", {}))
		TianmingUiScript.set_list_row_button_selected(button, _setting_option_selected(values))

func _tag_setting_option(button: Button, values: Dictionary) -> void:
	button.set_meta("tianming_setting_values", values.duplicate(true))
	for key in values.keys():
		button.set_meta("tianming_setting_key", str(key))
		button.set_meta("tianming_setting_value", values[key])
		return

func _setting_option_selected(values: Dictionary) -> bool:
	for key in values.keys():
		return _values_equal(current_settings.get(str(key), _default_setting_value(str(key))), values[key])
	return false

func _default_setting_value(key: String) -> Variant:
	if key == "fullscreen":
		return false
	if key == "ui_scale":
		return 1.0
	if key == "master_volume":
		return 0.8
	return null

func _values_equal(left: Variant, right: Variant) -> bool:
	if typeof(left) == TYPE_BOOL or typeof(right) == TYPE_BOOL:
		return bool(left) == bool(right)
	if typeof(left) == TYPE_INT or typeof(left) == TYPE_FLOAT or typeof(right) == TYPE_INT or typeof(right) == TYPE_FLOAT:
		return is_equal_approx(float(left), float(right))
	return str(left) == str(right)

func _make_label(text: String, font_size: int, color: Color) -> Label:
	var label: Label = Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label

func _num(value: Variant) -> float:
	if typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT:
		return float(value)
	return str(value).to_float()

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}
