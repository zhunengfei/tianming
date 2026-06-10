extends PanelContainer

class_name EdictPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal edict_requested(edict_id: String, target_region_id: String)

var edicts_box: VBoxContainer
var detail_box: VBoxContainer
var regions_box: VBoxContainer
var detail_label: Label
var history_label: Label
var history_box: VBoxContainer
var history_empty_state: PanelContainer
var issue_button: Button
var selected_edict_id: String = ""
var selected_region_id: String = ""
var current_history: Array = []
var selected_requires_target: bool = false

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
	left.custom_minimum_size.x = 310
	left.add_theme_constant_override("separation", 8)
	var left_panel: PanelContainer = TianmingUiScript.create_content_panel(left, Vector4(10, 10, 10, 10))
	left_panel.custom_minimum_size.x = 330
	left_panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	root.add_child(left_panel)

	left.add_child(TianmingUiScript.create_panel_header("诏令", _make_label("拟旨、择地与施政影响", 13, Color(0.72, 0.64, 0.50))))
	edicts_box = VBoxContainer.new()
	edicts_box.add_theme_constant_override("separation", 6)
	left.add_child(edicts_box)
	left.add_child(TianmingUiScript.create_section_title("近期诏令"))
	history_empty_state = TianmingUiScript.create_empty_state("近期诏令：无", "muted")
	left.add_child(history_empty_state)
	history_label = _make_label("", 12, Color(0.62, 0.58, 0.50))
	history_label.visible = false
	left.add_child(history_label)
	history_box = VBoxContainer.new()
	history_box.add_theme_constant_override("separation", 8)
	history_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.add_child(history_box)

	var right: VBoxContainer = VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 8)
	root.add_child(TianmingUiScript.create_content_panel(right, Vector4(10, 10, 10, 10)))

	detail_label = _make_label("选择诏令与目标地块。", 14, Color(0.86, 0.78, 0.64))
	detail_label.visible = false
	right.add_child(detail_label)
	right.add_child(TianmingUiScript.create_section_title("诏令详情"))
	detail_box = VBoxContainer.new()
	detail_box.add_theme_constant_override("separation", 6)
	right.add_child(detail_box)
	right.add_child(TianmingUiScript.create_section_title("目标地块"))

	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	right.add_child(scroll)
	regions_box = VBoxContainer.new()
	regions_box.add_theme_constant_override("separation", 5)
	scroll.add_child(regions_box)

	issue_button = TianmingUiScript.create_command_button("", 34, true)
	issue_button.text = "颁行诏令"
	issue_button.custom_minimum_size.y = 34
	issue_button.pressed.connect(_on_issue_pressed)
	right.add_child(issue_button)
	set_data([], [], [], 0)

func set_data(edicts: Array, regions: Array, issued_history: Array, action_points: int) -> void:
	if edicts_box == null:
		return
	current_history = issued_history.duplicate(true)
	if (selected_edict_id.is_empty() or _edict_by_id(edicts, selected_edict_id).is_empty()) and not edicts.is_empty():
		selected_edict_id = str(_dict(edicts[0]).get("id", ""))
	elif edicts.is_empty():
		selected_edict_id = ""
	if selected_region_id.is_empty() or _region_by_id(regions, selected_region_id).is_empty():
		selected_region_id = _first_region_id(regions)
	_clear_box(edicts_box)
	for raw in edicts:
		var edict: Dictionary = _dict(raw)
		var edict_id: String = str(edict.get("id", ""))
		var button: Button = TianmingUiScript.create_list_row_button("edict", 58)
		button.set_meta("tianming_edict_row_id", edict_id)
		button.text = "%s  [%s / %d点]\n%s" % [
			str(edict.get("name", "")),
			str(edict.get("category", "")),
			max(1, int(_num(edict.get("cost", 1)))),
			str(edict.get("desc", ""))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		TianmingUiScript.set_list_row_button_selected(button, edict_id == selected_edict_id)
		button.pressed.connect(func() -> void:
			selected_edict_id = edict_id
			set_data(edicts, regions, issued_history, action_points)
		)
		edicts_box.add_child(button)
	_update_regions(edicts, regions, action_points)
	history_label.text = _history_text(issued_history)
	_refresh_history_surface()

func visible_text() -> String:
	return "诏令\n%s\n%s" % [
		"" if detail_label == null else detail_label.text,
		"" if history_label == null else history_label.text
	]

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
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	history_box.add_child(TianmingUiScript.create_content_panel(box, Vector4(8, 7, 8, 7)))

	box.add_child(TianmingUiScript.create_log_strip("诏令", _history_record_heading(record), "gold"))
	if record.has("cost"):
		box.add_child(TianmingUiScript.create_log_strip("消耗", "耗行动点 %d" % int(_num(record.get("cost", 0))), "neutral"))
	var applied_text: String = _effect_text(_dict(record.get("applied", {})))
	if not applied_text.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("朝廷", applied_text, "jade"))
	var region_text: String = _effect_text(_dict(record.get("region_applied", {})))
	if not region_text.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("地方", region_text, "neutral"))

func _update_regions(edicts: Array, regions: Array, action_points: int) -> void:
	_clear_box(regions_box)
	_clear_box(detail_box)
	var edict: Dictionary = _edict_by_id(edicts, selected_edict_id)
	var requires_target: bool = bool(edict.get("requires_target", false))
	selected_requires_target = requires_target
	var cost: int = max(1, int(_num(edict.get("cost", 1))))
	var target_text: String = "需要目标地块" if requires_target else "不需要目标地块"
	detail_label.text = "%s\n%s" % [
		str(edict.get("name", "未选择诏令")),
		target_text
	]
	detail_box.add_child(TianmingUiScript.create_log_strip("诏令", "%s · %s" % [
		str(edict.get("name", "未选择诏令")),
		str(edict.get("category", ""))
	], "gold"))
	detail_box.add_child(TianmingUiScript.create_log_strip("目标", target_text, "jade" if requires_target else "muted"))
	detail_box.add_child(TianmingUiScript.create_log_strip("消耗", "耗行动点 %d" % cost, "neutral"))
	issue_button.disabled = action_points < cost or (requires_target and selected_region_id.is_empty())

	if not requires_target:
		regions_box.add_child(TianmingUiScript.create_empty_state("此诏令直接作用于朝廷，不选择地块。", "muted"))
		return

	var shown_regions: int = 0
	for raw in regions:
		var region: Dictionary = _dict(raw)
		var region_id: String = str(region.get("id", ""))
		if region_id.is_empty():
			continue
		shown_regions += 1
		var button: Button = TianmingUiScript.create_list_row_button("edict_target_region", 52)
		button.set_meta("tianming_edict_target_region_id", region_id)
		button.text = "%s  民心%d 不稳%d 税压%d 兵压%d" % [
			str(region.get("name", "")),
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
			set_data(edicts, regions, current_history, action_points)
		)
		regions_box.add_child(button)
	if shown_regions == 0:
		regions_box.add_child(TianmingUiScript.create_empty_state("暂无可选目标地块。", "muted"))

func _on_issue_pressed() -> void:
	var target_id: String = selected_region_id if selected_requires_target else ""
	emit_signal("edict_requested", selected_edict_id, target_id)

func _edict_by_id(edicts: Array, edict_id: String) -> Dictionary:
	for raw in edicts:
		var edict: Dictionary = _dict(raw)
		if str(edict.get("id", "")) == edict_id:
			return edict
	return {}

func _first_region_id(regions: Array) -> String:
	for raw in regions:
		var region: Dictionary = _dict(raw)
		var id: String = str(region.get("id", ""))
		if not id.is_empty():
			return id
	return ""

func _region_by_id(regions: Array, region_id: String) -> Dictionary:
	for raw in regions:
		var region: Dictionary = _dict(raw)
		if str(region.get("id", "")) == region_id:
			return region
	return {}

func _history_text(history: Array) -> String:
	if history.is_empty():
		return "近期诏令：无"
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
		var region_text: String = _effect_text(_dict(record.get("region_applied", {})))
		if not region_text.is_empty():
			parts.append("地方 %s" % region_text)
		names.append(" / ".join(parts))
	return "近期诏令：%s" % "；".join(names)

func _history_record_heading(record: Dictionary) -> String:
	var target: String = str(record.get("target_region", ""))
	return "T%d %s%s" % [
		int(_num(record.get("turn", 0))),
		str(record.get("name", "")),
		" / %s" % target if not target.is_empty() else ""
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
		"minxin", "public_morale", "mood":
			return "民心"
		"unrest":
			return "不稳"
		"tax_pressure":
			return "税压"
		"army_pressure":
			return "兵压"
		"huangquan", "imperial_authority":
			return "皇权"
		"huangwei", "imperial_prestige":
			return "皇威"
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

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}
