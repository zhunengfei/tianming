extends PanelContainer

class_name StatecraftPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal statecraft_action_requested(variable_name: String, action_id: String)

var variables_box: VBoxContainer
var detail_box: VBoxContainer
var actions_box: VBoxContainer
var detail_label: Label
var history_label: Label
var history_box: VBoxContainer
var history_empty_state: PanelContainer
var selected_variable_name: String = ""
var current_variables: Array = []
var current_actions: Array = []
var current_history: Array = []
var current_action_points: int = 0

func _ready() -> void:
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 14)
	add_child(margin)

	var root: HBoxContainer = HBoxContainer.new()
	root.add_theme_constant_override("separation", 12)
	margin.add_child(root)

	var left: VBoxContainer = VBoxContainer.new()
	left.custom_minimum_size.x = 430
	left.add_theme_constant_override("separation", 8)
	var left_panel: PanelContainer = TianmingUiScript.create_content_panel(left, Vector4(10, 10, 10, 10))
	left_panel.custom_minimum_size.x = 450
	left_panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	root.add_child(left_panel)

	left.add_child(TianmingUiScript.create_panel_header("国政态势", _make_label("变量检视与国政整饬", 13, Color(0.72, 0.64, 0.50))))
	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	left.add_child(scroll)
	variables_box = VBoxContainer.new()
	variables_box.add_theme_constant_override("separation", 4)
	scroll.add_child(variables_box)

	var right: VBoxContainer = VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 8)
	root.add_child(TianmingUiScript.create_content_panel(right, Vector4(10, 10, 10, 10)))

	detail_label = _make_label("选择变量后执行国政整饬。", 14, Color(0.86, 0.78, 0.64))
	detail_label.visible = false
	right.add_child(detail_label)
	right.add_child(TianmingUiScript.create_section_title("态势详情"))
	detail_box = VBoxContainer.new()
	detail_box.add_theme_constant_override("separation", 6)
	right.add_child(detail_box)
	right.add_child(TianmingUiScript.create_section_title("整饬动作"))
	actions_box = VBoxContainer.new()
	actions_box.add_theme_constant_override("separation", 6)
	right.add_child(actions_box)
	right.add_child(TianmingUiScript.create_section_title("整饬记录"))
	history_empty_state = TianmingUiScript.create_empty_state("国政态势记录：无", "muted")
	right.add_child(history_empty_state)
	history_label = _make_label("国政态势记录：无", 12, Color(0.68, 0.62, 0.50))
	history_label.visible = false
	history_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_child(history_label)
	history_box = VBoxContainer.new()
	history_box.add_theme_constant_override("separation", 8)
	history_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_child(history_box)
	set_data([], [], [], 0)

func set_data(variable_rows: Array, actions: Array, history: Array, action_points: int) -> void:
	current_variables = variable_rows.duplicate(true)
	current_actions = actions.duplicate(true)
	current_history = history.duplicate(true)
	current_action_points = action_points
	if variables_box == null:
		return
	if (selected_variable_name.is_empty() or _selected_variable().is_empty()) and current_variables.size() > 0:
		selected_variable_name = str(_dict(current_variables[0]).get("name", ""))
	elif current_variables.is_empty():
		selected_variable_name = ""
	_refresh_variables()
	_refresh_detail()

func select_variable(variable_name: String) -> void:
	if variable_name.is_empty():
		return
	selected_variable_name = variable_name
	if variables_box == null:
		return
	_refresh_variables()
	_refresh_detail()

func visible_text() -> String:
	return "国政态势\n%s\n%s\n%s" % [
		selected_variable_name,
		detail_label.text if detail_label != null else "",
		_history_text()
	]

func _refresh_variables() -> void:
	_clear_box(variables_box)
	for raw in current_variables:
		var variable: Dictionary = _dict(raw)
		var variable_name: String = str(variable.get("name", ""))
		if variable_name.is_empty():
			continue
		var button: Button = TianmingUiScript.create_list_row_button("statecraft_variable", 58)
		button.set_meta("tianming_statecraft_variable_name", variable_name)
		button.text = "%s  %s\n%s · %s · %s" % [
			variable_name,
			str(variable.get("value", "")),
			str(variable.get("category", "未分")),
			str(variable.get("status", "平")),
			str(variable.get("desc", ""))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		TianmingUiScript.set_list_row_button_selected(button, variable_name == selected_variable_name)
		button.pressed.connect(func() -> void:
			selected_variable_name = variable_name
			_refresh_variables()
			_refresh_detail()
		)
		variables_box.add_child(button)

func _refresh_detail() -> void:
	_clear_box(actions_box)
	_clear_box(detail_box)
	var variable: Dictionary = _selected_variable()
	if variable.is_empty():
		detail_label.text = "选择变量后执行国政整饬。"
		detail_box.add_child(TianmingUiScript.create_empty_state("选择变量后执行国政整饬。", "muted"))
		history_label.text = "国政态势记录：无"
		_refresh_history_surface()
		return
	detail_label.text = "%s\n当前 %s · 范围 %s-%s · 类别 %s\n%s" % [
		str(variable.get("name", "")),
		str(variable.get("value", "")),
		str(variable.get("min", "")),
		str(variable.get("max", "")),
		str(variable.get("category", "")),
		str(variable.get("desc", ""))
	]
	detail_box.add_child(TianmingUiScript.create_log_strip("当前", "%s · %s · %s · %s" % [
		str(variable.get("name", "")),
		str(variable.get("value", "")),
		str(variable.get("category", "")),
		str(variable.get("status", "平"))
	], "gold"))
	detail_box.add_child(TianmingUiScript.create_log_strip("范围", "%s-%s" % [
		str(variable.get("min", "")),
		str(variable.get("max", ""))
	], "jade"))
	detail_box.add_child(TianmingUiScript.create_log_strip("说明", str(variable.get("desc", "")), "neutral"))
	var shown_actions: int = 0
	for raw in current_actions:
		var action: Dictionary = _dict(raw)
		var action_id: String = str(action.get("id", ""))
		var target_variable: String = str(action.get("target_variable", ""))
		if action_id.is_empty() or target_variable != selected_variable_name:
			continue
		shown_actions += 1
		var button: Button = TianmingUiScript.create_command_button("", 48)
		button.text = "%s · %s · 耗行动点 %d\n%s" % [
			str(action.get("name", action_id)),
			str(action.get("category", "")),
			int(_num(action.get("cost", 1))),
			str(action.get("desc", ""))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.disabled = current_action_points < int(_num(action.get("cost", 1)))
		button.pressed.connect(func() -> void:
			emit_signal("statecraft_action_requested", selected_variable_name, action_id)
		)
		actions_box.add_child(button)
	if shown_actions == 0:
		actions_box.add_child(TianmingUiScript.create_empty_state("此项暂无直接整饬动作。", "muted"))
	history_label.text = _history_text()
	_refresh_history_surface()

func _selected_variable() -> Dictionary:
	for raw in current_variables:
		var variable: Dictionary = _dict(raw)
		if str(variable.get("name", "")) == selected_variable_name:
			return variable
	return {}

func _history_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	for record in _selected_history_records():
		lines.append("第%d回合 %s：%s" % [
			int(_num(record.get("turn", 0))),
			str(record.get("action", "")),
			str(record.get("outcome", record.get("description", "")))
		])
	if lines.is_empty():
		return "国政态势记录：无"
	return "国政态势记录：\n%s" % "\n".join(lines)

func _refresh_history_surface() -> void:
	if history_label == null:
		return
	_clear_box(history_box)
	var rows: Array = _selected_history_records()
	var is_empty: bool = rows.is_empty()
	history_label.visible = false
	if history_box != null:
		history_box.visible = not is_empty
	if history_empty_state != null:
		history_empty_state.visible = is_empty
	if is_empty:
		return
	for raw in rows:
		_add_history_row(_dict(raw))

func _selected_history_records() -> Array:
	var rows: Array = []
	for raw in current_history:
		var record: Dictionary = _dict(raw)
		if not selected_variable_name.is_empty() and str(record.get("target_variable", "")) != selected_variable_name:
			continue
		rows.append(record)
	return rows

func _add_history_row(record: Dictionary) -> void:
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	history_box.add_child(TianmingUiScript.create_content_panel(box, Vector4(8, 7, 8, 7)))

	box.add_child(TianmingUiScript.create_log_strip("整饬", _history_record_heading(record), "gold"))
	var outcome: String = str(record.get("outcome", record.get("description", ""))).strip_edges()
	if not outcome.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("结果", outcome, "neutral"))

func _history_record_heading(record: Dictionary) -> String:
	return "第%d回合 %s" % [
		int(_num(record.get("turn", 0))),
		str(record.get("action", ""))
	]

func _clear_box(box: BoxContainer) -> void:
	if box == null:
		return
	for child in box.get_children():
		box.remove_child(child)
		child.queue_free()

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
