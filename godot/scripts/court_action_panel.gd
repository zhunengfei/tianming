extends PanelContainer

class_name CourtActionPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal action_requested(action_id: String)

var points_label: Label
var actions_box: VBoxContainer
var history_label: Label
var history_box: VBoxContainer
var history_empty_state: PanelContainer
var current_history: Array = []

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
	root.add_theme_constant_override("separation", 10)
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_child(root)

	points_label = _make_label("", 14, Color(0.86, 0.78, 0.64))
	root.add_child(TianmingUiScript.create_panel_header("本月行动", points_label))

	root.add_child(TianmingUiScript.create_section_title("可用行动"))
	var actions_scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	root.add_child(actions_scroll)

	actions_box = VBoxContainer.new()
	actions_box.add_theme_constant_override("separation", 8)
	actions_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	actions_box.size_flags_vertical = Control.SIZE_EXPAND_FILL
	actions_scroll.add_child(actions_box)

	root.add_child(TianmingUiScript.create_section_title("近期行动"))
	history_empty_state = TianmingUiScript.create_empty_state("本局行动：无", "muted")
	root.add_child(history_empty_state)
	history_label = _make_label("", 12, Color(0.62, 0.58, 0.50))
	history_label.visible = false
	root.add_child(history_label)
	history_box = VBoxContainer.new()
	history_box.add_theme_constant_override("separation", 8)
	history_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.add_child(history_box)
	set_actions([], 0, [])

func set_actions(actions: Array, action_points: int, action_history: Array) -> void:
	if points_label == null:
		return
	current_history = action_history.duplicate(true)
	points_label.text = "行动点：%d" % action_points
	_clear_actions()
	if actions.is_empty():
		actions_box.add_child(TianmingUiScript.create_empty_state("暂无可用行动。", "muted"))
	else:
		for raw in actions:
			var action: Dictionary = _dict(raw)
			_add_action_button(action, action_points)
	history_label.text = _history_text(action_history)
	_refresh_history_surface()

func visible_text() -> String:
	return "廷务行动\n%s\n%s" % [
		"" if points_label == null else points_label.text,
		"" if history_label == null else history_label.text
	]

func _add_action_button(action: Dictionary, action_points: int) -> void:
	var button: Button = TianmingUiScript.create_command_button("", 44)
	var cost: int = max(1, int(_num(action.get("cost", 1))))
	button.text = "%s  [%s / %d点]\n%s" % [
		str(action.get("name", "")),
		str(action.get("category", "")),
		cost,
		str(action.get("desc", ""))
	]
	button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.disabled = action_points < cost
	var action_id: String = str(action.get("id", ""))
	button.pressed.connect(func() -> void:
		emit_signal("action_requested", action_id)
	)
	actions_box.add_child(button)

func _clear_actions() -> void:
	if actions_box == null:
		return
	for child in actions_box.get_children():
		child.queue_free()

func _clear_history() -> void:
	if history_box == null:
		return
	for child in history_box.get_children():
		child.queue_free()

func _history_text(action_history: Array) -> String:
	if action_history.is_empty():
		return "本局行动：无"
	var names: PackedStringArray = PackedStringArray()
	for raw in action_history:
		var record: Dictionary = _dict(raw)
		var parts: PackedStringArray = PackedStringArray()
		parts.append(_history_record_heading(record))
		var applied_text: String = _applied_text(_dict(record.get("applied", {})))
		if not applied_text.is_empty():
			parts.append("影响 %s" % applied_text)
		names.append(" / ".join(parts))
	return "近期行动：%s" % "、".join(names)

func _refresh_history_surface() -> void:
	if history_label == null:
		return
	_clear_history()
	var is_empty: bool = current_history.is_empty()
	history_label.visible = false
	if history_box != null:
		history_box.visible = not is_empty
	if history_empty_state != null:
		history_empty_state.visible = is_empty
	if is_empty:
		return
	for raw in current_history:
		_add_history_row(_dict(raw))

func _add_history_row(record: Dictionary) -> void:
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	history_box.add_child(TianmingUiScript.create_content_panel(box, Vector4(8, 7, 8, 7)))

	box.add_child(TianmingUiScript.create_log_strip("行动", _history_record_heading(record), "gold"))
	var applied_text: String = _applied_text(_dict(record.get("applied", {})))
	if not applied_text.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("影响", applied_text, "neutral"))

func _history_record_heading(record: Dictionary) -> String:
	var parts: PackedStringArray = PackedStringArray()
	parts.append("T%d %s" % [int(_num(record.get("turn", 0))), str(record.get("name", ""))])
	if record.has("cost"):
		parts.append("耗行动点 %d" % int(_num(record.get("cost", 0))))
	return " / ".join(parts)

func _applied_text(applied: Dictionary) -> String:
	if applied.is_empty():
		return ""
	var parts: PackedStringArray = PackedStringArray()
	for key in applied.keys():
		parts.append("%s %s" % [_effect_label(str(key)), _signed_big(_num(applied.get(key, 0)))])
	return "，".join(parts)

func _effect_label(key: String) -> String:
	match key:
		"帑廪", "treasury_money":
			return "国库银"
		"inner_treasury_money":
			return "内帑"
		"treasury_grain":
			return "国库粮"
		"imperial_authority":
			return "皇权"
		"imperial_prestige":
			return "皇威"
		"public_morale":
			return "民心"
	return key

func _signed_big(value: float) -> String:
	if value > 0.0:
		return "+%s" % _fmt_big(value)
	if value < 0.0:
		return "-%s" % _fmt_big(absf(value))
	return "0"

func _fmt_big(value: float) -> String:
	if value >= 100000000.0:
		return "%.1f亿" % (value / 100000000.0)
	if value >= 10000.0:
		return "%.1f万" % (value / 10000.0)
	if is_equal_approx(value, roundf(value)):
		return "%d" % roundi(value)
	return "%.1f" % value

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
