extends MarginContainer

class_name FactionBrowserPanel

const FactionDetailPanelScript := preload("res://scripts/faction_detail_panel.gd")
const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal faction_action_requested(faction_id: String, action_id: String)

var faction_list_box: VBoxContainer
var faction_detail_panel: Control
var selected_faction_button: Button
var selected_faction_id: String = ""
var faction_row_buttons: Dictionary = {}
var current_factions: Array = []
var current_actions: Array = []
var current_history: Array = []
var current_action_points: int = 0

func _ready() -> void:
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_theme_constant_override("margin_left", 8)
	add_theme_constant_override("margin_top", 8)
	add_theme_constant_override("margin_right", 8)
	add_theme_constant_override("margin_bottom", 8)

	var layout: HBoxContainer = HBoxContainer.new()
	layout.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	layout.size_flags_vertical = Control.SIZE_EXPAND_FILL
	layout.add_theme_constant_override("separation", 12)
	add_child(layout)

	var left: VBoxContainer = VBoxContainer.new()
	left.custom_minimum_size.x = 500
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_vertical = Control.SIZE_EXPAND_FILL
	left.add_theme_constant_override("separation", 8)
	layout.add_child(TianmingUiScript.create_content_panel(left, Vector4(10, 10, 10, 10)))

	left.add_child(TianmingUiScript.create_panel_header("势力", _make_cell("诸方势力与应对", 260, true, true)))

	left.add_child(TianmingUiScript.create_section_title("势力名录"))
	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	left.add_child(scroll)

	faction_list_box = VBoxContainer.new()
	faction_list_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	faction_list_box.add_theme_constant_override("separation", 3)
	scroll.add_child(faction_list_box)

	faction_detail_panel = FactionDetailPanelScript.new()
	faction_detail_panel.connect("faction_action_requested", Callable(self, "_on_detail_action_requested"))
	layout.add_child(faction_detail_panel)
	set_data(current_factions, current_actions, current_history, current_action_points)

func set_data(factions: Array, actions: Array = [], history: Array = [], action_points: int = 0) -> void:
	current_factions = factions.duplicate(true)
	current_actions = actions.duplicate(true)
	current_history = history.duplicate(true)
	current_action_points = action_points
	if faction_list_box == null:
		return
	if selected_faction_id.is_empty() or _faction_by_id(current_factions, selected_faction_id).is_empty():
		selected_faction_id = _first_faction_id(current_factions)
	_refresh_rows()
	_update_detail()

func select_faction(faction_id: String) -> void:
	if _faction_by_id(current_factions, faction_id).is_empty():
		return
	selected_faction_id = faction_id
	_update_selected_button()
	_update_detail()

func visible_text() -> String:
	var selected: Dictionary = _faction_by_id(current_factions, selected_faction_id)
	return "势力\n%s\n%s\n%s" % [
		_faction_list_text(),
		_faction_detail_text(selected),
		"" if faction_detail_panel == null else str(faction_detail_panel.call("visible_text"))
	]

func _refresh_rows() -> void:
	_clear_box(faction_list_box)
	faction_row_buttons.clear()
	faction_list_box.add_child(TianmingUiScript.create_log_strip("名录", "点击势力查看档案与应对", "muted"))
	var shown_rows: int = 0
	for raw in current_factions:
		var faction: Dictionary = _dict(raw)
		var faction_id: String = str(faction.get("id", ""))
		if faction_id.is_empty():
			continue
		shown_rows += 1
		var button: Button = _make_faction_button(faction)
		faction_row_buttons[faction_id] = button
		faction_list_box.add_child(button)
		button.pressed.connect(func() -> void:
			select_faction(faction_id)
		)
	if shown_rows == 0:
		faction_list_box.add_child(TianmingUiScript.create_empty_state("暂无势力记录。", "muted"))
	_update_selected_button()

func _make_faction_button(faction: Dictionary) -> Button:
	var button: Button = TianmingUiScript.create_list_row_button("faction", 76)
	button.set_meta("tianming_browser_list_row", true)
	button.set_meta("tianming_browser_list_row_kind", "faction")
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.custom_minimum_size.y = 76
	button.tooltip_text = "%s · %s" % [str(faction.get("name", "")), str(faction.get("capital", ""))]
	var row: VBoxContainer = VBoxContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 4)
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 8
	row.offset_top = 6
	row.offset_right = -8
	row.offset_bottom = -6
	button.add_child(row)
	row.add_child(TianmingUiScript.create_log_strip("势力", _faction_row_identity(faction), "gold"))
	row.add_child(TianmingUiScript.create_log_strip("态势", _faction_row_metrics(faction), "neutral"))
	_set_mouse_filter_ignore(row)
	return button

func _update_selected_button() -> void:
	selected_faction_button = null
	for raw_id in faction_row_buttons.keys():
		var faction_id: String = str(raw_id)
		var button: Button = faction_row_buttons.get(faction_id, null) as Button
		if button == null:
			continue
		var selected: bool = faction_id == selected_faction_id
		TianmingUiScript.set_list_row_button_selected(button, selected)
		if selected:
			selected_faction_button = button

func _update_detail() -> void:
	if faction_detail_panel == null:
		return
	var faction: Dictionary = _faction_by_id(current_factions, selected_faction_id)
	faction_detail_panel.call("set_faction", faction)
	faction_detail_panel.call("set_faction_actions", current_actions, current_history, current_action_points)

func _on_detail_action_requested(faction_id: String, action_id: String) -> void:
	emit_signal("faction_action_requested", faction_id, action_id)

func _faction_detail_text(faction: Dictionary) -> String:
	if faction.is_empty():
		return "未选择势力"
	return "%s\n%s · %s\n都城 %s · 首领 %s\n国力%d 财力%d 军力%s" % [
		str(faction.get("name", "")),
		str(faction.get("type", "")),
		str(faction.get("attitude", "")),
		str(faction.get("capital", "")),
		str(faction.get("leader", "")),
		int(_num(faction.get("strength", 0))),
		int(_num(faction.get("economy", 0))),
		str(faction.get("army", ""))
	]

func _faction_list_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	for raw in current_factions:
		var faction: Dictionary = _dict(raw)
		lines.append("%s %s %s" % [
			str(faction.get("name", "")),
			str(faction.get("leader", "")),
			str(faction.get("attitude", ""))
		])
	return "\n".join(lines)

func _make_cell(text: String, width: float, expand: bool, bold: bool) -> Label:
	var label: Label = Label.new()
	label.text = text
	label.custom_minimum_size.x = width
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL if expand else Control.SIZE_SHRINK_BEGIN
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	label.add_theme_font_size_override("font_size", 13)
	label.add_theme_color_override("font_color", Color(0.86, 0.70, 0.42) if bold else Color(0.82, 0.78, 0.68))
	return label

func _faction_row_identity(faction: Dictionary) -> String:
	return _join_nonempty([
		faction.get("name", ""),
		faction.get("leader", "")
	], "未命名势力")

func _faction_row_metrics(faction: Dictionary) -> String:
	return "%s · 势%d · 军%s · 财%d" % [
		_fallback_text(faction.get("attitude", ""), "未定"),
		int(_num(faction.get("strength", 0))),
		_faction_army_text(faction),
		int(_num(faction.get("economy", 0)))
	]

func _faction_army_text(faction: Dictionary) -> String:
	var army_text: String = str(faction.get("army", "")).strip_edges()
	if not army_text.is_empty():
		return army_text
	return _fmt_big(_num(faction.get("military_strength", 0)))

func _join_nonempty(values: Array, fallback: String) -> String:
	var parts: PackedStringArray = PackedStringArray()
	for raw in values:
		var text: String = str(raw).strip_edges()
		if not text.is_empty():
			parts.append(text)
	if parts.is_empty():
		return fallback
	return " · ".join(parts)

func _fallback_text(value: Variant, fallback: String) -> String:
	var text: String = str(value).strip_edges()
	return fallback if text.is_empty() else text

func _fmt_big(value: float, suffix: String = "") -> String:
	var abs_value: float = absf(value)
	if abs_value >= 100000000.0:
		return "%.1f亿%s" % [value / 100000000.0, suffix]
	if abs_value >= 10000.0:
		return "%.1f万%s" % [value / 10000.0, suffix]
	return "%d%s" % [roundi(value), suffix]

func _set_mouse_filter_ignore(root: Control) -> void:
	if root == null:
		return
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in root.get_children():
		if child is Control:
			_set_mouse_filter_ignore(child as Control)

func _clear_box(box: BoxContainer) -> void:
	if box == null:
		return
	for child in box.get_children():
		child.queue_free()

func _first_faction_id(factions: Array) -> String:
	for raw in factions:
		var faction: Dictionary = _dict(raw)
		var faction_id: String = str(faction.get("id", ""))
		if not faction_id.is_empty():
			return faction_id
	return ""

func _faction_by_id(factions: Array, faction_id: String) -> Dictionary:
	for raw in factions:
		var faction: Dictionary = _dict(raw)
		if str(faction.get("id", "")) == faction_id:
			return faction
	return {}

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}

func _num(value: Variant) -> float:
	if typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT:
		return float(value)
	return str(value).to_float()
