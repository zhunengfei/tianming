extends PanelContainer

class_name GameplayHubPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal advance_month_requested
signal tab_requested(tab_name: String)
signal save_requested
signal load_requested

var date_label: Label
var resource_label: Label
var authority_label: Label
var status_row: HBoxContainer
var agenda_box: VBoxContainer
var report_label: Label
var history_label: Label
var quick_load_button: Button

func _ready() -> void:
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 16)
	add_child(margin)

	var root: VBoxContainer = VBoxContainer.new()
	root.add_theme_constant_override("separation", 12)
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_child(root)

	date_label = _make_label("", 15, Color(0.90, 0.84, 0.70))
	root.add_child(TianmingUiScript.create_panel_header("御览总纲", date_label))

	status_row = HBoxContainer.new()
	status_row.add_theme_constant_override("separation", 8)
	status_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.add_child(status_row)
	resource_label = _add_status_chip(status_row, "jade")
	authority_label = _add_status_chip(status_row, "red")

	var split: HBoxContainer = HBoxContainer.new()
	split.add_theme_constant_override("separation", 14)
	split.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	split.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(split)

	var agenda_scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	split.add_child(TianmingUiScript.create_content_panel(agenda_scroll, Vector4(12, 10, 12, 10)))

	agenda_box = VBoxContainer.new()
	agenda_box.add_theme_constant_override("separation", 7)
	agenda_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	agenda_box.size_flags_vertical = Control.SIZE_EXPAND_FILL
	agenda_scroll.add_child(agenda_box)

	var command_scroll: ScrollContainer = TianmingUiScript.create_scroll_area(null, Vector2(245, 0))
	split.add_child(TianmingUiScript.create_content_panel(command_scroll, Vector4(12, 10, 12, 10)))

	var command_box: VBoxContainer = VBoxContainer.new()
	command_box.add_theme_constant_override("separation", 8)
	command_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	command_scroll.add_child(command_box)
	command_box.add_child(TianmingUiScript.create_section_title("政务入口"))

	var court_section: VBoxContainer = _add_command_section(command_box, "朝廷政务")
	_add_tab_button(court_section, "本月行动", "court_action_panel")
	_add_tab_button(court_section, "御前会议", "court_meeting_panel")
	_add_tab_button(court_section, "诏令", "edict_panel")
	_add_tab_button(court_section, "任免", "appointment_panel")
	_add_tab_button(court_section, "问对", "audience_panel")

	var world_section: VBoxContainer = _add_command_section(command_box, "天下军政")
	_add_tab_button(world_section, "军令", "military_order_panel")
	_add_tab_button(world_section, "军队", "army_roster_panel")
	_add_tab_button(world_section, "外交", "diplomacy_panel")
	_add_tab_button(world_section, "事件", "event_queue_panel")
	_add_tab_button(world_section, "天下图", "world_map_panel")
	_add_tab_button(world_section, "地块", "region_governance_panel")

	var people_section: VBoxContainer = _add_command_section(command_box, "人物势力")
	_add_tab_button(people_section, "人物", "character_browser_panel")
	_add_tab_button(people_section, "势力", "faction_browser_panel")
	_add_tab_button(people_section, "关系", "relationship_panel")
	_add_tab_button(people_section, "变量", "statecraft_panel")

	var archive_section: VBoxContainer = _add_command_section(command_box, "档案系统")
	_add_tab_button(archive_section, "奏疏来文", "communication_panel")
	_add_tab_button(archive_section, "史官实录", "chronicle_panel")
	_add_tab_button(archive_section, "月报", "monthly_report_panel")
	_add_tab_button(archive_section, "存档", "save_slot_panel")
	_add_tab_button(archive_section, "系统", "system_panel")

	var save_row: HBoxContainer = HBoxContainer.new()
	save_row.add_theme_constant_override("separation", 8)
	archive_section.add_child(save_row)

	var save_button: Button = TianmingUiScript.create_command_button("暂存")
	save_button.pressed.connect(func() -> void:
		emit_signal("save_requested")
	)
	save_row.add_child(save_button)

	quick_load_button = TianmingUiScript.create_command_button("读取")
	quick_load_button.disabled = true
	quick_load_button.pressed.connect(func() -> void:
		emit_signal("load_requested")
	)
	save_row.add_child(quick_load_button)

	var time_section: VBoxContainer = _add_command_section(command_box, "时序处置")
	var next_button: Button = TianmingUiScript.create_command_button("下一月", 34, true)
	next_button.pressed.connect(func() -> void:
		emit_signal("advance_month_requested")
	)
	time_section.add_child(next_button)

	report_label = _add_log_strip(root, "月报", "gold")
	history_label = _add_log_strip(root, "近期", "muted")
	set_snapshot({})

func set_snapshot(snapshot: Dictionary) -> void:
	if date_label == null:
		return
	if snapshot.is_empty():
		date_label.text = "未载入"
		resource_label.text = ""
		authority_label.text = ""
		if status_row != null:
			status_row.visible = false
		_set_agenda([])
		report_label.text = ""
		history_label.text = ""
		_set_quick_load_enabled(false)
		return
	if status_row != null:
		status_row.visible = true

	date_label.text = "%s  ·  行动点 %d" % [
		str(snapshot.get("date", "")),
		int(_num(snapshot.get("action_points", 0)))
	]
	resource_label.text = "%s  ·  %s  ·  %s" % [
		str(snapshot.get("treasury", "")),
		str(snapshot.get("neitang", "")),
		str(snapshot.get("population", ""))
	]
	authority_label.text = str(snapshot.get("authority", ""))

	var agenda: Array = []
	var pending_events: int = int(_num(snapshot.get("pending_events_count", 0)))
	var pending_recommendations: int = int(_num(snapshot.get("pending_recommendations_count", 0)))
	var pending_communications: int = int(_num(snapshot.get("pending_communications_count", 0)))
	if pending_events > 0:
		agenda.append("待议事件 %d 件" % pending_events)
	if pending_recommendations > 0:
		agenda.append("议事建议 %d 条" % pending_recommendations)
	if pending_communications > 0:
		agenda.append("奏疏来文 %d 件" % pending_communications)
	agenda.append("本月可用行动点 %d" % int(_num(snapshot.get("action_points", 0))))
	for raw in _array(snapshot.get("urgent_alerts", [])):
		agenda.append(str(raw))
	if bool(snapshot.get("has_quick_save", false)):
		agenda.append("已有暂存可读取")
	_set_quick_load_enabled(bool(snapshot.get("has_quick_save", false)))
	_set_agenda(agenda)

	report_label.text = "月报：%s" % str(snapshot.get("last_report", ""))
	history_label.text = "近期：%s" % str(snapshot.get("history", "无"))

func visible_text() -> String:
	return "御览总纲\n%s\n%s\n%s\n%s\n%s\n%s" % [
		"" if date_label == null else date_label.text,
		"" if resource_label == null else resource_label.text,
		"" if authority_label == null else authority_label.text,
		_node_text(agenda_box),
		"" if report_label == null else report_label.text,
		"" if history_label == null else history_label.text
	]

func _set_agenda(items: Array) -> void:
	for child in agenda_box.get_children():
		child.queue_free()
	agenda_box.add_child(TianmingUiScript.create_section_title("本回合待办"))
	if items.is_empty():
		agenda_box.add_child(TianmingUiScript.create_notice_row("暂无紧急奏报。", "success"))
		return
	for raw in items:
		var text: String = str(raw)
		agenda_box.add_child(TianmingUiScript.create_notice_row(text, _notice_tone_for_text(text)))

func _set_quick_load_enabled(enabled: bool) -> void:
	if quick_load_button != null:
		quick_load_button.disabled = not enabled

func _node_text(node: Node) -> String:
	if node == null:
		return ""
	var lines: PackedStringArray = PackedStringArray()
	if node is Label:
		lines.append((node as Label).text)
	for child in node.get_children():
		var text: String = _node_text(child)
		if not text.is_empty():
			lines.append(text)
	return "\n".join(lines)

func _add_tab_button(parent: VBoxContainer, button_text: String, panel_key: String) -> void:
	var button: Button = TianmingUiScript.create_command_button(button_text)
	button.pressed.connect(func() -> void:
		emit_signal("tab_requested", panel_key)
	)
	parent.add_child(button)

func _add_command_section(parent: VBoxContainer, title_text: String) -> VBoxContainer:
	var section: PanelContainer = TianmingUiScript.create_command_section(title_text)
	parent.add_child(section)
	return section.find_child("CommandSectionBody", true, false) as VBoxContainer

func _add_status_chip(parent: Control, tone: String) -> Label:
	var chip: PanelContainer = TianmingUiScript.create_status_chip("", tone)
	parent.add_child(chip)
	return chip.find_child("StatusChipLabel", true, false) as Label

func _add_log_strip(parent: Control, title_text: String, tone: String) -> Label:
	var strip: PanelContainer = TianmingUiScript.create_log_strip(title_text, "", tone)
	parent.add_child(strip)
	return strip.find_child("LogStripValue", true, false) as Label

func _notice_tone_for_text(text: String) -> String:
	if text.contains("告急") or text.contains("紧急") or text.contains("起义") or text.contains("军饷") or text.contains("流民") or text.contains("叛") or text.contains("警"):
		return "danger"
	if text.contains("待议") or text.contains("建议") or text.contains("奏疏") or text.contains("来文"):
		return "important"
	if text.contains("暂存") or text.contains("行动点"):
		return "success"
	return "neutral"

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

func _array(value: Variant) -> Array:
	return value if typeof(value) == TYPE_ARRAY else []
