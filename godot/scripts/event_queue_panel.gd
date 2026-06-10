extends PanelContainer

class_name EventQueuePanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal event_resolve_requested(event_id: String, choice_index: int)

var events_box: VBoxContainer
var title_label: Label
var meta_label: Label
var body_label: Label
var effect_label: Label
var detail_box: VBoxContainer
var choices_box: VBoxContainer
var history_label: Label
var history_box: VBoxContainer
var history_empty_state: PanelContainer
var selected_event_id: String = ""
var current_event_queue: Array = []
var current_resolved_events: Array = []

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
	left.custom_minimum_size.x = 360
	left.add_theme_constant_override("separation", 8)
	var left_panel: PanelContainer = TianmingUiScript.create_content_panel(left, Vector4(10, 10, 10, 10))
	left_panel.custom_minimum_size.x = 380
	left_panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	root.add_child(left_panel)
	left.add_child(TianmingUiScript.create_panel_header("待议事件", _make_text_label("事件队列与处置选项", 13, Color(0.72, 0.64, 0.50))))
	var event_scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	left.add_child(event_scroll)
	events_box = VBoxContainer.new()
	events_box.add_theme_constant_override("separation", 4)
	event_scroll.add_child(events_box)

	var right: VBoxContainer = VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 9)
	root.add_child(TianmingUiScript.create_content_panel(right, Vector4(10, 10, 10, 10)))

	title_label = _make_label(21, Color(0.88, 0.72, 0.42))
	title_label.visible = false
	right.add_child(title_label)
	meta_label = _make_label(13, Color(0.72, 0.62, 0.44))
	meta_label.visible = false
	right.add_child(meta_label)
	body_label = _make_label(14, Color(0.90, 0.86, 0.75))
	body_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body_label.visible = false
	right.add_child(body_label)
	effect_label = _make_label(13, Color(0.82, 0.76, 0.64))
	effect_label.visible = false
	right.add_child(effect_label)
	right.add_child(TianmingUiScript.create_section_title("事件详情"))
	detail_box = VBoxContainer.new()
	detail_box.add_theme_constant_override("separation", 6)
	right.add_child(detail_box)
	right.add_child(TianmingUiScript.create_section_title("处置选项"))
	choices_box = VBoxContainer.new()
	choices_box.add_theme_constant_override("separation", 6)
	right.add_child(choices_box)
	right.add_child(TianmingUiScript.create_section_title("处置记录"))
	history_empty_state = TianmingUiScript.create_empty_state("已处理：无", "muted")
	right.add_child(history_empty_state)
	history_label = _make_label(12, Color(0.62, 0.58, 0.50))
	history_label.visible = false
	right.add_child(history_label)
	history_box = VBoxContainer.new()
	history_box.add_theme_constant_override("separation", 8)
	history_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_child(history_box)
	set_events([], [])

func set_events(event_queue: Array, resolved_events: Array) -> void:
	current_event_queue = event_queue.duplicate(true)
	current_resolved_events = resolved_events.duplicate(true)
	if title_label == null:
		return
	if current_event_queue.is_empty():
		selected_event_id = ""
	elif selected_event_id.is_empty() or _event_by_id(selected_event_id).is_empty():
		selected_event_id = str(_dict(current_event_queue[0]).get("id", ""))
	_refresh_event_list()
	_refresh_detail()

func select_event(event_id: String) -> void:
	if event_id.is_empty() or _event_by_id(event_id).is_empty():
		return
	selected_event_id = event_id
	if title_label == null:
		return
	_refresh_event_list()
	_refresh_detail()

func visible_text() -> String:
	var event: Dictionary = _selected_event()
	return "事件\n%s\n%s\n%s\n%s\n%s" % [
		str(event.get("name", "")),
		_event_meta_text(event),
		str(event.get("narrative", event.get("description", ""))),
		_event_effect_text(event),
		_history_text()
	]

func _refresh_event_list() -> void:
	if events_box == null:
		return
	_clear_box(events_box)
	if current_event_queue.is_empty():
		events_box.add_child(TianmingUiScript.create_empty_state("暂无待议事件。", "muted"))
		return
	for raw in current_event_queue:
		var event: Dictionary = _dict(raw)
		var event_id: String = str(event.get("id", ""))
		if event_id.is_empty():
			continue
		var button: Button = TianmingUiScript.create_list_row_button("event_queue_event", 58)
		button.set_meta("tianming_event_queue_event_id", event_id)
		button.text = "%s\n%s · %s · 第%d回合" % [
			str(event.get("name", "未命名事件")),
			str(event.get("source", "")),
			str(event.get("type", "")),
			int(_num(event.get("queued_turn", 0)))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		TianmingUiScript.set_list_row_button_selected(button, event_id == selected_event_id)
		button.pressed.connect(func() -> void:
			select_event(event_id)
		)
		events_box.add_child(button)

func _refresh_detail() -> void:
	if choices_box == null:
		return
	_clear_box(choices_box)
	_clear_box(detail_box)
	var event: Dictionary = _selected_event()
	if event.is_empty():
		title_label.text = "事件"
		meta_label.text = "暂无待议事件"
		body_label.text = "推进月份后，到期的天象、政务、军务、灾异等事件会进入这里。"
		effect_label.text = ""
		if detail_box != null:
			detail_box.add_child(TianmingUiScript.create_empty_state("暂无待议事件。", "muted"))
			detail_box.add_child(TianmingUiScript.create_log_strip("提示", body_label.text, "muted"))
		choices_box.add_child(TianmingUiScript.create_empty_state("暂无处置选项。", "muted"))
		history_label.text = _history_text()
		_refresh_history_surface()
		return

	var event_id: String = str(event.get("id", ""))
	title_label.text = str(event.get("name", "未命名事件"))
	meta_label.text = _event_meta_text(event)
	body_label.text = str(event.get("narrative", event.get("description", "")))
	effect_label.text = _event_effect_text(event)
	if detail_box != null:
		detail_box.add_child(TianmingUiScript.create_log_strip("事件", title_label.text, "gold"))
		detail_box.add_child(TianmingUiScript.create_log_strip("来源", meta_label.text, "neutral"))
		detail_box.add_child(TianmingUiScript.create_log_strip("影响", effect_label.text, "jade" if not effect_label.text.is_empty() else "muted"))
		detail_box.add_child(TianmingUiScript.create_log_strip("正文", body_label.text, "muted"))

	var choices: Array = _array(event.get("choices", []))
	if choices.is_empty():
		_add_choice_button("处理事件", event_id, -1)
	else:
		for i in range(choices.size()):
			var choice: Dictionary = _dict(choices[i])
			var text: String = str(choice.get("text", "选项%d" % (i + 1)))
			var effect_text: String = str(choice.get("effect", ""))
			_add_choice_button("%s  %s" % [text, effect_text], event_id, i)
	history_label.text = _history_text()
	_refresh_history_surface()

func _refresh_history_surface() -> void:
	if history_label == null:
		return
	_clear_box(history_box)
	var is_empty: bool = current_resolved_events.is_empty()
	history_label.visible = false
	if history_box != null:
		history_box.visible = not is_empty
	if history_empty_state != null:
		history_empty_state.visible = is_empty
	if is_empty:
		return
	for raw in current_resolved_events:
		_add_history_row(_dict(raw))

func _add_history_row(event: Dictionary) -> void:
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	history_box.add_child(TianmingUiScript.create_content_panel(box, Vector4(8, 7, 8, 7)))

	box.add_child(TianmingUiScript.create_log_strip("事件", _resolved_event_heading(event), "gold"))
	var choice_text: String = str(event.get("choice_text", "")).strip_edges()
	if not choice_text.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("选择", choice_text, "jade"))
	var effect_text: String = _applied_effects_text(_dict(event.get("applied_effects", {})))
	if not effect_text.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("影响", effect_text, "neutral"))

func _add_choice_button(text: String, event_id: String, choice_index: int) -> void:
	var button: Button = TianmingUiScript.create_command_button(text, 34, true)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.pressed.connect(func() -> void:
		emit_signal("event_resolve_requested", event_id, choice_index)
	)
	choices_box.add_child(button)

func _selected_event() -> Dictionary:
	return _event_by_id(selected_event_id)

func _event_meta_text(event: Dictionary) -> String:
	if event.is_empty():
		return ""
	return "%s · %s · 第%d回合入队" % [
		str(event.get("source", "")),
		str(event.get("type", "")),
		int(_num(event.get("queued_turn", 0)))
	]

func _event_effect_text(event: Dictionary) -> String:
	if event.is_empty():
		return ""
	var text: String = str(event.get("effect", "")).strip_edges()
	return text if not text.is_empty() else "暂无直接影响"

func _event_by_id(event_id: String) -> Dictionary:
	for raw in current_event_queue:
		var event: Dictionary = _dict(raw)
		if str(event.get("id", "")) == event_id:
			return event
	return {}

func _clear_box(box: BoxContainer) -> void:
	if box == null:
		return
	for child in box.get_children():
		box.remove_child(child)
		child.queue_free()

func _history_text() -> String:
	if current_resolved_events.is_empty():
		return "已处理：无"
	var lines: PackedStringArray = PackedStringArray()
	lines.append("已处理：")
	for raw in current_resolved_events:
		var event: Dictionary = _dict(raw)
		lines.append(_resolved_event_text(event))
	return "\n".join(lines)

func _resolved_event_text(event: Dictionary) -> String:
	var parts: PackedStringArray = PackedStringArray()
	parts.append(_resolved_event_heading(event))
	var choice_text: String = str(event.get("choice_text", "")).strip_edges()
	if not choice_text.is_empty():
		parts.append("选择：%s" % choice_text)
	var effect_text: String = _applied_effects_text(_dict(event.get("applied_effects", {})))
	if not effect_text.is_empty():
		parts.append("影响：%s" % effect_text)
	return "\n".join(parts)

func _resolved_event_heading(event: Dictionary) -> String:
	return "第%d回合 · %s" % [
		int(_num(event.get("resolved_turn", event.get("queued_turn", 0)))),
		str(event.get("name", event.get("id", "已处理事件")))
	]

func _applied_effects_text(applied_effects: Dictionary) -> String:
	var parts: PackedStringArray = PackedStringArray()
	for key in applied_effects.keys():
		var value: Variant = applied_effects.get(key)
		if typeof(value) == TYPE_DICTIONARY:
			_append_effect_dict(parts, _dict(value))
		elif typeof(value) == TYPE_ARRAY:
			_append_effect_array(parts, _array(value))
		else:
			parts.append("%s %s" % [str(key), str(value)])
	return "，".join(parts)

func _append_effect_dict(parts: PackedStringArray, values: Dictionary) -> void:
	for key in values.keys():
		parts.append("%s %s" % [str(key), _signed_num(_num(values.get(key, 0)))])

func _append_effect_array(parts: PackedStringArray, values: Array) -> void:
	for raw in values:
		var row: Dictionary = _dict(raw)
		if row.is_empty():
			continue
		var subject: String = str(row.get("name", row.get("id", row.get("region", row.get("faction", "")))))
		var deltas: PackedStringArray = PackedStringArray()
		for key in row.keys():
			if ["id", "name", "region", "faction"].has(str(key)):
				continue
			deltas.append("%s %s" % [str(key), _signed_num(_num(row.get(key, 0)))])
		if deltas.is_empty():
			parts.append(subject)
		else:
			parts.append("%s（%s）" % [subject, "，".join(deltas)])

func _signed_num(value: float) -> String:
	if value > 0.0:
		return "+%s" % _format_num(value)
	if value < 0.0:
		return "-%s" % _format_num(absf(value))
	return "0"

func _format_num(value: float) -> String:
	if is_equal_approx(value, roundf(value)):
		return "%d" % roundi(value)
	return "%.1f" % value

func _make_text_label(text: String, font_size: int, color: Color) -> Label:
	var label: Label = _make_label(font_size, color)
	label.text = text
	return label

func _make_label(font_size: int, color: Color) -> Label:
	var label: Label = Label.new()
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

func _array(value: Variant) -> Array:
	return value if typeof(value) == TYPE_ARRAY else []
