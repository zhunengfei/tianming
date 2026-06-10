extends PanelContainer

class_name DiplomacyPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal diplomacy_requested(action_id: String, target_faction_id: String)
signal diplomacy_commitment_renew_requested(commitment_id: String, target_faction_id: String)
signal diplomacy_commitment_break_requested(commitment_id: String, target_faction_id: String)

var actions_box: VBoxContainer
var factions_box: VBoxContainer
var commitments_box: VBoxContainer
var detail_box: VBoxContainer
var detail_label: Label
var history_label: Label
var history_box: VBoxContainer
var history_empty_state: PanelContainer
var issue_button: Button
var selected_action_id: String = ""
var selected_faction_id: String = ""
var current_history: Array = []
var current_commitments: Array = []

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
	left.custom_minimum_size.x = 320
	left.add_theme_constant_override("separation", 8)
	var left_panel: PanelContainer = TianmingUiScript.create_content_panel(left, Vector4(10, 10, 10, 10))
	left_panel.custom_minimum_size.x = 340
	left_panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	root.add_child(left_panel)

	left.add_child(TianmingUiScript.create_panel_header("外交", _make_label("鸿胪外务与势力承诺", 13, Color(0.72, 0.64, 0.50))))
	actions_box = VBoxContainer.new()
	actions_box.add_theme_constant_override("separation", 6)
	left.add_child(actions_box)
	left.add_child(TianmingUiScript.create_section_title("近期外交"))
	history_empty_state = TianmingUiScript.create_empty_state("近期外交：无", "muted")
	left.add_child(history_empty_state)
	history_label = _make_label("", 12, Color(0.62, 0.58, 0.50))
	history_label.visible = false
	left.add_child(history_label)
	history_box = VBoxContainer.new()
	history_box.add_theme_constant_override("separation", 8)
	history_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_child(history_box)
	commitments_box = VBoxContainer.new()
	commitments_box.add_theme_constant_override("separation", 5)
	left.add_child(commitments_box)

	var right: VBoxContainer = VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 8)
	root.add_child(TianmingUiScript.create_content_panel(right, Vector4(10, 10, 10, 10)))

	detail_label = _make_label("选择外交方式与目标势力。", 14, Color(0.86, 0.78, 0.64))
	detail_label.visible = false
	right.add_child(detail_label)
	right.add_child(TianmingUiScript.create_section_title("外交详情"))
	detail_box = VBoxContainer.new()
	detail_box.add_theme_constant_override("separation", 6)
	right.add_child(detail_box)
	right.add_child(TianmingUiScript.create_section_title("目标势力"))

	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	right.add_child(scroll)
	factions_box = VBoxContainer.new()
	factions_box.add_theme_constant_override("separation", 5)
	scroll.add_child(factions_box)

	issue_button = TianmingUiScript.create_command_button("", 34, true)
	issue_button.text = "遣使交涉"
	issue_button.custom_minimum_size.y = 34
	issue_button.pressed.connect(_on_issue_pressed)
	right.add_child(issue_button)
	set_data([], [], [], 0, [])

func set_data(actions: Array, factions: Array, history: Array, action_points: int, commitments: Array = []) -> void:
	if actions_box == null:
		return
	current_history = history.duplicate(true)
	current_commitments = commitments.duplicate(true)
	if (selected_action_id.is_empty() or _action_by_id(actions, selected_action_id).is_empty()) and not actions.is_empty():
		selected_action_id = str(_dict(actions[0]).get("id", ""))
	elif actions.is_empty():
		selected_action_id = ""
	if selected_faction_id.is_empty() or _faction_by_id(factions, selected_faction_id).is_empty():
		selected_faction_id = _first_faction_id(factions)
	_clear_box(actions_box)
	for raw in actions:
		var action: Dictionary = _dict(raw)
		var action_id: String = str(action.get("id", ""))
		var button: Button = TianmingUiScript.create_list_row_button("diplomacy_action", 58)
		button.set_meta("tianming_diplomacy_action_id", action_id)
		button.text = "%s  [%s / %d点]\n%s" % [
			str(action.get("name", "")),
			str(action.get("category", "")),
			max(1, int(_num(action.get("cost", 1)))),
			str(action.get("desc", ""))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		TianmingUiScript.set_list_row_button_selected(button, action_id == selected_action_id)
		button.pressed.connect(func() -> void:
			selected_action_id = action_id
			set_data(actions, factions, history, action_points, current_commitments)
		)
		actions_box.add_child(button)
	_update_factions(actions, factions, action_points)
	history_label.text = _history_text(history)
	_refresh_history_surface()
	_update_commitments(commitments, action_points)

func visible_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	lines.append("鸿胪外务")
	lines.append("" if detail_label == null else detail_label.text)
	lines.append("" if history_label == null else history_label.text)
	lines.append(_commitments_text(current_commitments))
	return "\n".join(lines)

func _refresh_history_surface() -> void:
	if history_label == null:
		return
	_clear_box(history_box)
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
	if history_box == null:
		return
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	history_box.add_child(TianmingUiScript.create_content_panel(box, Vector4(8, 7, 8, 7)))

	box.add_child(TianmingUiScript.create_log_strip("外交", _history_record_heading(record), "gold"))
	if record.has("cost"):
		box.add_child(TianmingUiScript.create_log_strip("消耗", "耗行动点 %d" % int(_num(record.get("cost", 0))), "neutral"))
	var applied_text: String = _effect_text(_dict(record.get("applied", {})))
	if not applied_text.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("朝廷", applied_text, "jade"))
	var faction_text: String = _effect_text(_dict(record.get("faction_applied", {})))
	if not faction_text.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("势力", faction_text, "neutral"))
	if record.has("remaining_months"):
		box.add_child(TianmingUiScript.create_log_strip("余期", "尚余 %d 月" % int(_num(record.get("remaining_months", 0))), "muted"))

func _update_factions(actions: Array, factions: Array, action_points: int) -> void:
	_clear_box(factions_box)
	_clear_box(detail_box)
	var action: Dictionary = _action_by_id(actions, selected_action_id)
	var cost: int = max(1, int(_num(action.get("cost", 1))))
	var target_text: String = "选择一个目标势力"
	detail_label.text = "%s\n%s" % [
		str(action.get("name", "未选择外交方式")),
		target_text
	]
	detail_box.add_child(TianmingUiScript.create_log_strip("外交", "%s · %s" % [
		str(action.get("name", "未选择外交方式")),
		str(action.get("category", ""))
	], "gold"))
	detail_box.add_child(TianmingUiScript.create_log_strip("目标", target_text, "jade"))
	detail_box.add_child(TianmingUiScript.create_log_strip("消耗", "耗行动点 %d" % cost, "neutral"))
	issue_button.disabled = action_points < cost or selected_faction_id.is_empty()

	var shown_factions: int = 0
	for raw in factions:
		var faction: Dictionary = _dict(raw)
		var faction_id: String = str(faction.get("id", ""))
		if faction_id.is_empty() or str(faction.get("name", "")).contains("明"):
			continue
		shown_factions += 1
		var relation: int = int(_num(faction.get("relation_to_player", 0)))
		var hostility: int = int(_num(faction.get("hostility", 0)))
		var button: Button = TianmingUiScript.create_list_row_button("diplomacy_target_faction", 58)
		button.set_meta("tianming_diplomacy_target_faction_id", faction_id)
		button.text = "%s  %s\n关系%d 敌意%d  %s" % [
			str(faction.get("name", "")),
			str(faction.get("attitude", "")),
			relation,
			hostility,
			str(faction.get("capital", ""))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		TianmingUiScript.set_list_row_button_selected(button, faction_id == selected_faction_id)
		button.pressed.connect(func() -> void:
			selected_faction_id = faction_id
			set_data(actions, factions, current_history, action_points, current_commitments)
		)
		factions_box.add_child(button)
	if shown_factions == 0:
		factions_box.add_child(TianmingUiScript.create_empty_state("暂无可交涉势力。", "muted"))

func _on_issue_pressed() -> void:
	emit_signal("diplomacy_requested", selected_action_id, selected_faction_id)

func _update_commitments(commitments: Array, action_points: int) -> void:
	_clear_box(commitments_box)
	commitments_box.add_child(TianmingUiScript.create_section_title("外交承诺"))
	if commitments.is_empty():
		commitments_box.add_child(TianmingUiScript.create_empty_state("暂无进行中的承诺", "muted"))
		return
	for raw in commitments:
		var commitment: Dictionary = _dict(raw)
		var commitment_id: String = str(commitment.get("id", ""))
		var target_id: String = str(commitment.get("target_faction_id", ""))
		var stack: VBoxContainer = VBoxContainer.new()
		stack.add_theme_constant_override("separation", 4)
		stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		commitments_box.add_child(stack)

		stack.add_child(TianmingUiScript.create_log_strip("承诺", _commitment_title(commitment), "gold"))
		stack.add_child(TianmingUiScript.create_log_strip("期限", _commitment_duration(commitment), "neutral"))

		var row: HBoxContainer = HBoxContainer.new()
		row.add_theme_constant_override("separation", 6)
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		stack.add_child(row)

		var spacer: Control = Control.new()
		spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(spacer)

		var renew_button: Button = TianmingUiScript.create_command_button("", 28)
		renew_button.text = "续"
		renew_button.tooltip_text = "花费行动点续约此外交承诺"
		renew_button.disabled = action_points <= 0
		renew_button.custom_minimum_size = Vector2(42, 28)
		renew_button.pressed.connect(func() -> void:
			emit_signal("diplomacy_commitment_renew_requested", commitment_id, target_id)
		)
		row.add_child(renew_button)

		var break_button: Button = TianmingUiScript.create_command_button("", 28)
		break_button.text = "毁"
		break_button.tooltip_text = "毁约会降低目标势力信任并提高敌意"
		break_button.custom_minimum_size = Vector2(42, 28)
		break_button.pressed.connect(func() -> void:
			emit_signal("diplomacy_commitment_break_requested", commitment_id, target_id)
		)
		row.add_child(break_button)

func _commitments_text(commitments: Array) -> String:
	if commitments.is_empty():
		return "外交承诺：无"
	var lines: PackedStringArray = PackedStringArray()
	for raw in commitments:
		var commitment: Dictionary = _dict(raw)
		lines.append("%s · %s" % [
			_commitment_title(commitment),
			_commitment_duration(commitment)
		])
	return "外交承诺：%s" % "；".join(lines)

func _commitment_title(commitment: Dictionary) -> String:
	var name_text: String = _fallback_text(commitment.get("name", commitment.get("id", "")), "未命名承诺")
	var target_text: String = _fallback_text(commitment.get("target_faction", commitment.get("target_faction_id", "")), "未指定目标")
	return "%s · %s" % [name_text, target_text]

func _commitment_duration(commitment: Dictionary) -> String:
	return "尚余 %d 月" % int(_num(commitment.get("remaining_months", 0)))

func _action_by_id(actions: Array, action_id: String) -> Dictionary:
	for raw in actions:
		var action: Dictionary = _dict(raw)
		if str(action.get("id", "")) == action_id:
			return action
	return {}

func _first_faction_id(factions: Array) -> String:
	for raw in factions:
		var faction: Dictionary = _dict(raw)
		var id: String = str(faction.get("id", ""))
		if not id.is_empty() and not str(faction.get("name", "")).contains("明"):
			return id
	return ""

func _faction_by_id(factions: Array, faction_id: String) -> Dictionary:
	for raw in factions:
		var faction: Dictionary = _dict(raw)
		if str(faction.get("id", "")) == faction_id:
			return faction
	return {}

func _history_text(history: Array) -> String:
	if history.is_empty():
		return "近期外交：无"
	var names: PackedStringArray = PackedStringArray()
	for raw in history:
		var record: Dictionary = _dict(raw)
		var parts: PackedStringArray = PackedStringArray()
		parts.append(_history_record_heading(record))
		if record.has("cost"):
			parts.append("耗行动点 %d" % int(_num(record.get("cost", 0))))
		var applied_text: String = _effect_text(_dict(record.get("applied", {})))
		if not applied_text.is_empty():
			parts.append("朝廷 %s" % applied_text)
		var faction_text: String = _effect_text(_dict(record.get("faction_applied", {})))
		if not faction_text.is_empty():
			parts.append("势力 %s" % faction_text)
		if record.has("remaining_months"):
			parts.append("余期 %d月" % int(_num(record.get("remaining_months", 0))))
		names.append(" / ".join(parts))
	return "近期外交：%s" % "；".join(names)

func _history_record_heading(record: Dictionary) -> String:
	return "T%d %s / %s" % [
		int(_num(record.get("turn", 0))),
		str(record.get("name", "")),
		str(record.get("target_faction", ""))
	]

func _effect_text(values: Dictionary) -> String:
	if values.is_empty():
		return ""
	var parts: PackedStringArray = PackedStringArray()
	for key in values.keys():
		parts.append("%s %s" % [_effect_label(str(key)), _signed_big(_num(values.get(key, 0)))])
	return "，".join(parts)

func _effect_label(key: String) -> String:
	match key:
		"treasury_money", "帑廪":
			return "国库银"
		"inner_treasury_money":
			return "内帑"
		"treasury_grain":
			return "国库粮"
		"huangquan", "imperial_authority":
			return "皇权"
		"huangwei", "imperial_prestige":
			return "皇威"
		"relation_to_player":
			return "对明关系"
		"hostility":
			return "敌意"
		"border_tension":
			return "边境紧张"
		"trade_access":
			return "互市"
		"military_strength":
			return "军力"
		"cohesion":
			return "凝聚"
		"ming_support":
			return "明援"
		"tribute_pressure":
			return "朝贡压力"
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

func _clear_box(box: BoxContainer) -> void:
	if box == null:
		return
	for child in box.get_children():
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

func _fallback_text(value: Variant, fallback: String) -> String:
	var text: String = str(value).strip_edges()
	return fallback if text.is_empty() else text

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}
