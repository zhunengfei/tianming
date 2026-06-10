extends PanelContainer

class_name RegionGovernancePanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal region_governance_requested(region_id: String, action_id: String)

var regions_box: VBoxContainer
var detail_box: VBoxContainer
var actions_box: VBoxContainer
var detail_label: Label
var history_label: Label
var history_box: VBoxContainer
var history_empty_state: PanelContainer
var selected_region_id: String = ""
var current_regions: Array = []
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

	left.add_child(TianmingUiScript.create_panel_header("地块", _make_label("地方治理与主官军务", 13, Color(0.72, 0.64, 0.50))))
	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	left.add_child(scroll)
	regions_box = VBoxContainer.new()
	regions_box.add_theme_constant_override("separation", 4)
	scroll.add_child(regions_box)

	var right: VBoxContainer = VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 8)
	root.add_child(TianmingUiScript.create_content_panel(right, Vector4(10, 10, 10, 10)))

	detail_label = _make_label("选择地块后执行地方治理。", 14, Color(0.86, 0.78, 0.64))
	detail_label.visible = false
	right.add_child(detail_label)
	right.add_child(TianmingUiScript.create_section_title("地块详情"))
	detail_box = VBoxContainer.new()
	detail_box.add_theme_constant_override("separation", 6)
	right.add_child(detail_box)
	right.add_child(TianmingUiScript.create_section_title("治理动作"))
	actions_box = VBoxContainer.new()
	actions_box.add_theme_constant_override("separation", 6)
	right.add_child(actions_box)
	right.add_child(TianmingUiScript.create_section_title("治理记录"))
	history_empty_state = TianmingUiScript.create_empty_state("地方治理记录：无", "muted")
	right.add_child(history_empty_state)
	history_label = _make_label("地方治理记录：无", 12, Color(0.68, 0.62, 0.50))
	history_label.visible = false
	history_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_child(history_label)
	history_box = VBoxContainer.new()
	history_box.add_theme_constant_override("separation", 8)
	history_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_child(history_box)
	set_data([], [], [], 0)

func set_data(regions: Array, actions: Array, history: Array, action_points: int) -> void:
	current_regions = regions.duplicate(true)
	current_actions = actions.duplicate(true)
	current_history = history.duplicate(true)
	current_action_points = action_points
	if regions_box == null:
		return
	if (selected_region_id.is_empty() or _selected_region().is_empty()) and current_regions.size() > 0:
		selected_region_id = str(_dict(current_regions[0]).get("id", ""))
	elif current_regions.is_empty():
		selected_region_id = ""
	_refresh_regions()
	_refresh_detail()

func visible_text() -> String:
	return "地块治理\n%s\n%s\n%s" % [
		str(_selected_region().get("name", "")),
		detail_label.text if detail_label != null else "",
		_history_text()
	]

func _refresh_regions() -> void:
	_clear_box(regions_box)
	for raw in current_regions:
		var region: Dictionary = _dict(raw)
		var region_id: String = str(region.get("id", ""))
		if region_id.is_empty():
			continue
		var button: Button = TianmingUiScript.create_list_row_button("region_governance_region", 58)
		button.set_meta("tianming_region_governance_region_id", region_id)
		button.text = "%s  %s\n繁荣 %d · 民心 %d · 不稳 %d · 税压 %d · 兵压 %d" % [
			str(region.get("name", "")),
			str(region.get("owner", region.get("owner_id", ""))),
			int(_num(region.get("prosperity", 0))),
			int(_num(region.get("mood", 0))),
			int(_num(region.get("unrest", 0))),
			int(_num(region.get("tax_pressure", 0))),
			int(_num(region.get("army_pressure", 0)))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		TianmingUiScript.set_list_row_button_selected(button, region_id == selected_region_id)
		button.pressed.connect(func() -> void:
			selected_region_id = region_id
			_refresh_regions()
			_refresh_detail()
		)
		regions_box.add_child(button)

func _refresh_detail() -> void:
	_clear_box(actions_box)
	_clear_box(detail_box)
	var region: Dictionary = _selected_region()
	if region.is_empty():
		detail_label.text = "选择地块后执行地方治理。"
		detail_box.add_child(TianmingUiScript.create_empty_state("选择地块后执行地方治理。", "muted"))
		history_label.text = "地方治理记录：无"
		_refresh_history_surface()
		return
	detail_label.text = "%s\n归属 %s / 控制 %s · 地形 %s\n开发 %d · 驻军 %s · 府州 %d处\n主官 %s · 统兵 %s" % [
		str(region.get("name", "")),
		str(region.get("owner", region.get("owner_id", ""))),
		str(region.get("controller", region.get("controller_id", ""))),
		str(region.get("terrain", "")),
		int(_num(region.get("development", 0))),
		_fmt_big(_num(region.get("troops", 0)), ""),
		int(_num(region.get("prefecture_count", 0))),
		_region_personnel(region, "governor"),
		_region_personnel(region, "commander")
	]
	detail_box.add_child(TianmingUiScript.create_log_strip("归属", "%s / %s · %s" % [
		str(region.get("owner", region.get("owner_id", ""))),
		str(region.get("controller", region.get("controller_id", ""))),
		str(region.get("terrain", ""))
	], "gold"))
	detail_box.add_child(TianmingUiScript.create_log_strip("建设", "开发 %d · 驻军 %s · 府州 %d处" % [
		int(_num(region.get("development", 0))),
		_fmt_big(_num(region.get("troops", 0)), ""),
		int(_num(region.get("prefecture_count", 0)))
	], "jade"))
	detail_box.add_child(TianmingUiScript.create_log_strip("人员", "主官 %s · 统兵 %s" % [
		_region_personnel(region, "governor"),
		_region_personnel(region, "commander")
	], "neutral"))
	var shown_actions: int = 0
	for raw in current_actions:
		var action: Dictionary = _dict(raw)
		var action_id: String = str(action.get("id", ""))
		if action_id.is_empty():
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
			emit_signal("region_governance_requested", selected_region_id, action_id)
		)
		actions_box.add_child(button)
	if shown_actions == 0:
		actions_box.add_child(TianmingUiScript.create_empty_state("暂无治理动作。", "muted"))
	history_label.text = _history_text()
	_refresh_history_surface()

func _selected_region() -> Dictionary:
	for raw in current_regions:
		var region: Dictionary = _dict(raw)
		if str(region.get("id", "")) == selected_region_id:
			return region
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
		return "地方治理记录：无"
	return "地方治理记录：\n%s" % "\n".join(lines)

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
		if not selected_region_id.is_empty() and str(record.get("target_region_id", "")) != selected_region_id:
			continue
		rows.append(record)
	return rows

func _add_history_row(record: Dictionary) -> void:
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	history_box.add_child(TianmingUiScript.create_content_panel(box, Vector4(8, 7, 8, 7)))

	box.add_child(TianmingUiScript.create_log_strip("治理", _history_record_heading(record), "gold"))
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

func _fmt_big(value: float, suffix: String = "") -> String:
	var abs_value: float = absf(value)
	if abs_value >= 100000000.0:
		return "%.1f亿%s" % [value / 100000000.0, suffix]
	if abs_value >= 10000.0:
		return "%.1f万%s" % [value / 10000.0, suffix]
	return "%d%s" % [roundi(value), suffix]

func _region_personnel(region: Dictionary, key: String) -> String:
	var value: String = str(region.get(key, ""))
	return value if not value.is_empty() else "未任"

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}
