extends PanelContainer

class_name FactionDetailPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal faction_action_requested(faction_id: String, action_id: String)

var title_label: Label
var type_label: Label
var stats_label: Label
var stats_box: VBoxContainer
var relation_box: VBoxContainer
var territory_label: Label
var relations_label: Label
var strategy_label: Label
var actions_box: VBoxContainer
var action_history_label: Label
var action_history_box: VBoxContainer
var action_history_empty_state: PanelContainer
var current_faction: Dictionary = {}
var current_actions: Array = []
var current_history: Array = []
var current_action_points: int = 0

func _ready() -> void:
	TianmingUiScript.style_content_panel(self)
	custom_minimum_size.x = 360
	size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 12)
	add_child(margin)

	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	margin.add_child(scroll)

	var root: VBoxContainer = VBoxContainer.new()
	root.add_theme_constant_override("separation", 8)
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.add_child(root)

	type_label = _make_label(14, Color(0.74, 0.62, 0.42))
	root.add_child(TianmingUiScript.create_panel_header("势力详情", type_label))

	root.add_child(TianmingUiScript.create_section_title("势力档案"))
	title_label = _make_label(22, Color(0.88, 0.72, 0.42))
	root.add_child(title_label)

	root.add_child(TianmingUiScript.create_separator())

	root.add_child(TianmingUiScript.create_section_title("势力态势"))
	stats_label = _make_label(13, Color(0.90, 0.86, 0.75))
	stats_box = VBoxContainer.new()
	stats_box.add_theme_constant_override("separation", 5)
	root.add_child(stats_box)

	root.add_child(TianmingUiScript.create_section_title("疆域关系"))
	relation_box = VBoxContainer.new()
	relation_box.add_theme_constant_override("separation", 5)
	root.add_child(relation_box)

	territory_label = _make_label(13, Color(0.82, 0.78, 0.68))
	territory_label.visible = false
	root.add_child(territory_label)

	relations_label = _make_label(13, Color(0.84, 0.80, 0.70))
	relations_label.visible = false
	root.add_child(relations_label)

	strategy_label = _make_label(13, Color(0.76, 0.70, 0.58))
	strategy_label.visible = false
	root.add_child(strategy_label)

	root.add_child(TianmingUiScript.create_section_title("势力应对"))
	actions_box = VBoxContainer.new()
	actions_box.add_theme_constant_override("separation", 6)
	root.add_child(actions_box)

	root.add_child(TianmingUiScript.create_section_title("应对记录"))
	action_history_label = _make_label(12, Color(0.68, 0.62, 0.50))
	action_history_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	action_history_label.visible = false
	root.add_child(action_history_label)
	action_history_box = VBoxContainer.new()
	action_history_box.add_theme_constant_override("separation", 8)
	action_history_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.add_child(action_history_box)
	action_history_empty_state = TianmingUiScript.create_empty_state("势力应对记录：无", "muted")
	root.add_child(action_history_empty_state)

	set_faction({})
	set_faction_actions([], [], 0)

func set_faction(faction: Dictionary) -> void:
	current_faction = faction.duplicate(true)
	if title_label == null:
		return
	if current_faction.is_empty():
		title_label.text = "选择势力"
		type_label.text = ""
		stats_label.text = ""
		_refresh_stat_rows()
		territory_label.text = ""
		relations_label.text = ""
		strategy_label.text = ""
		_refresh_relation_rows()
		_refresh_actions()
		return

	title_label.text = str(current_faction.get("name", "未命名势力"))
	type_label.text = "%s · %s\n都城 %s · 首领 %s" % [
		str(current_faction.get("type", "")),
		str(current_faction.get("attitude", "")),
		str(current_faction.get("capital", "无")),
		str(current_faction.get("leader", ""))
	]
	stats_label.text = "国力 %d · 财力 %d · 军力 %s\n凝聚 %d · 军心 %d · 民意 %d\n科技 %d · 文化 %d" % [
		int(_num(current_faction.get("strength", 0))),
		int(_num(current_faction.get("economy", 0))),
		_fmt_big(_num(current_faction.get("military_strength", 0))),
		int(_num(current_faction.get("cohesion", 0))),
		int(_num(current_faction.get("military_cohesion", current_faction.get("cohesion", 0)))),
		int(_num(current_faction.get("public_opinion", 0))),
		int(_num(current_faction.get("tech_level", 0))),
		int(_num(current_faction.get("culture_level", 0)))
	]
	_refresh_stat_rows()
	territory_label.text = "疆域：%s\n资源：%s" % [
		str(current_faction.get("territory", "")),
		str(current_faction.get("resources_text", ""))
	]
	relations_label.text = "关系：\n%s" % str(current_faction.get("relations_text", "无"))
	strategy_label.text = "目标：%s\n%s" % [
		str(current_faction.get("goal", "")),
		str(current_faction.get("description", current_faction.get("desc", "")))
	]
	_refresh_relation_rows()
	_refresh_actions()

func _refresh_relation_rows() -> void:
	if relation_box == null:
		return
	_clear_box(relation_box)
	if current_faction.is_empty():
		relation_box.add_child(TianmingUiScript.create_empty_state("请选择势力。", "muted"))
		return
	relation_box.add_child(TianmingUiScript.create_log_strip("疆域", _fallback_text(current_faction.get("territory", ""), "未记载"), "gold"))
	relation_box.add_child(TianmingUiScript.create_log_strip("资源", _fallback_text(current_faction.get("resources_text", ""), "无"), "neutral"))
	relation_box.add_child(TianmingUiScript.create_log_strip("关系", _fallback_text(current_faction.get("relations_text", ""), "无"), "jade"))
	relation_box.add_child(TianmingUiScript.create_log_strip("目标", _fallback_text(current_faction.get("goal", ""), "未定"), "gold"))
	relation_box.add_child(TianmingUiScript.create_log_strip("方略", _fallback_text(current_faction.get("description", current_faction.get("desc", "")), "暂无战略说明"), "muted"))

func _refresh_stat_rows() -> void:
	if stats_box == null:
		return
	_clear_box(stats_box)
	if current_faction.is_empty():
		return
	stats_box.add_child(TianmingUiScript.create_metric_row("国力 / 财力", "%d / %d" % [
		int(_num(current_faction.get("strength", 0))),
		int(_num(current_faction.get("economy", 0)))
	], "gold"))
	stats_box.add_child(TianmingUiScript.create_metric_row("军力", _fmt_big(_num(current_faction.get("military_strength", 0))), "red"))
	stats_box.add_child(TianmingUiScript.create_metric_row("凝聚 / 军心 / 民意", "%d / %d / %d" % [
		int(_num(current_faction.get("cohesion", 0))),
		int(_num(current_faction.get("military_cohesion", current_faction.get("cohesion", 0)))),
		int(_num(current_faction.get("public_opinion", 0)))
	], "neutral"))
	stats_box.add_child(TianmingUiScript.create_metric_row("科技 / 文化", "%d / %d" % [
		int(_num(current_faction.get("tech_level", 0))),
		int(_num(current_faction.get("culture_level", 0)))
	], "muted"))

func set_faction_actions(actions: Array, history: Array, action_points: int) -> void:
	current_actions = actions.duplicate(true)
	current_history = history.duplicate(true)
	current_action_points = action_points
	if actions_box == null:
		return
	_refresh_actions()

func visible_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	lines.append("势力应对")
	lines.append(str(current_faction.get("name", "")))
	if type_label != null:
		lines.append(type_label.text)
	if stats_label != null:
		lines.append(stats_label.text)
	if territory_label != null:
		lines.append(territory_label.text)
	if relations_label != null:
		lines.append(relations_label.text)
	if strategy_label != null:
		lines.append(strategy_label.text)
	lines.append(_history_text())
	return "\n".join(lines)

func _refresh_actions() -> void:
	if actions_box == null:
		return
	_clear_box(actions_box)
	var faction_id: String = str(current_faction.get("id", ""))
	if current_faction.is_empty() or faction_id.is_empty():
		actions_box.add_child(TianmingUiScript.create_empty_state("请选择势力后应对。", "muted"))
		action_history_label.text = "请选择势力后应对。"
		_refresh_action_history_surface()
		return
	var shown_actions: int = 0
	for raw in current_actions:
		var action: Dictionary = _dict(raw)
		var action_id: String = str(action.get("id", ""))
		if action_id.is_empty():
			continue
		var button: Button = TianmingUiScript.create_command_button("", 48, true)
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
			emit_signal("faction_action_requested", faction_id, action_id)
		)
		actions_box.add_child(button)
		shown_actions += 1
	if shown_actions == 0:
		actions_box.add_child(TianmingUiScript.create_empty_state("暂无势力应对。", "muted"))
	action_history_label.text = _history_text()
	_refresh_action_history_surface()

func _refresh_action_history_surface() -> void:
	if action_history_label == null:
		return
	if current_faction.is_empty() or str(current_faction.get("id", "")).is_empty():
		action_history_label.visible = true
		if action_history_box != null:
			_clear_box(action_history_box)
			action_history_box.visible = false
		if action_history_empty_state != null:
			action_history_empty_state.visible = false
		return

	action_history_label.visible = false
	var records: Array = _scoped_history_records()
	if action_history_box != null:
		_clear_box(action_history_box)
		action_history_box.visible = not records.is_empty()
		for raw in records:
			_add_action_history_row(_dict(raw))
	if action_history_empty_state != null:
		action_history_empty_state.visible = records.is_empty()

func _history_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	for raw in _scoped_history_records():
		var record: Dictionary = _dict(raw)
		lines.append("%s：%s" % [
			_history_record_heading(record),
			str(record.get("outcome", record.get("description", "")))
		])
	if lines.is_empty():
		return "势力应对记录：无"
	return "势力应对记录：\n%s" % "\n".join(lines)

func _scoped_history_records() -> Array:
	var records: Array = []
	var faction_id: String = str(current_faction.get("id", ""))
	for raw in current_history:
		var record: Dictionary = _dict(raw)
		if not faction_id.is_empty() and str(record.get("target_faction_id", "")) != faction_id:
			continue
		records.append(record)
	return records

func _add_action_history_row(record: Dictionary) -> void:
	if action_history_box == null:
		return
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	action_history_box.add_child(TianmingUiScript.create_content_panel(box, Vector4(8, 7, 8, 7)))
	box.add_child(TianmingUiScript.create_log_strip("应对", _history_record_heading(record), "gold"))
	var outcome: String = _fallback_text(record.get("outcome", record.get("description", "")), "")
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

func _make_heading(text: String) -> Label:
	var label: Label = _make_label(15, Color(0.88, 0.72, 0.42))
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

func _fmt_big(value: float, suffix: String = "") -> String:
	var abs_value: float = absf(value)
	if abs_value >= 100000000.0:
		return "%.1f亿%s" % [value / 100000000.0, suffix]
	if abs_value >= 10000.0:
		return "%.1f万%s" % [value / 10000.0, suffix]
	return "%d%s" % [roundi(value), suffix]

func _fallback_text(value: Variant, fallback: String) -> String:
	var text: String = str(value).strip_edges()
	return fallback if text.is_empty() else text

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}
