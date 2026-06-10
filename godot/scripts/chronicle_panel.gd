extends PanelContainer

class_name ChroniclePanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

var count_label: Label
var entries_box: VBoxContainer
var last_entries: Array = []

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
	root.add_theme_constant_override("separation", 9)
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_child(root)

	count_label = _make_label("", 13, Color(0.72, 0.64, 0.50))
	root.add_child(TianmingUiScript.create_panel_header("史官实录", count_label))

	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	root.add_child(scroll)

	entries_box = VBoxContainer.new()
	entries_box.add_theme_constant_override("separation", 8)
	entries_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(entries_box)
	set_entries([])

func set_entries(entries: Array) -> void:
	last_entries = entries.duplicate(true)
	if count_label == null:
		return
	count_label.text = "共 %d 条实录" % last_entries.size()
	_clear_entries()
	entries_box.add_child(TianmingUiScript.create_section_title("实录条目"))
	if last_entries.is_empty():
		entries_box.add_child(TianmingUiScript.create_empty_state("尚无已结算回合或政务记录。", "muted"))
		return
	for i in range(last_entries.size() - 1, -1, -1):
		_add_entry(_dict(last_entries[i]))

func visible_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	lines.append("史官实录")
	lines.append("" if count_label == null else count_label.text)
	if last_entries.is_empty():
		lines.append("尚无已结算回合或政务记录。")
		return "\n".join(lines)
	for raw in last_entries:
		var entry: Dictionary = _dict(raw)
		lines.append(_entry_text(entry))
	return "\n".join(lines)

func _add_entry(entry: Dictionary) -> void:
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	entries_box.add_child(TianmingUiScript.create_content_panel(box, Vector4(10, 8, 10, 8)))

	box.add_child(TianmingUiScript.create_log_strip("实录", _entry_heading(entry), "gold"))
	box.add_child(TianmingUiScript.create_log_strip("摘要", str(entry.get("summary", "")), "neutral"))
	var details: String = str(entry.get("details", ""))
	if not details.strip_edges().is_empty():
		box.add_child(TianmingUiScript.create_log_strip("详情", details, "muted"))

func _entry_text(entry: Dictionary) -> String:
	var parts: PackedStringArray = PackedStringArray()
	parts.append(_entry_heading(entry))
	parts.append(str(entry.get("summary", "")))
	var details: String = str(entry.get("details", ""))
	if not details.strip_edges().is_empty():
		parts.append(details)
	return "\n".join(parts)

func _entry_heading(entry: Dictionary) -> String:
	var turn_text: String = "第%d回合" % int(_num(entry.get("turn", 0)))
	var date_text: String = "%d年%d月" % [
		int(_num(entry.get("year", 0))),
		int(_num(entry.get("month", 0)))
	]
	return "%s · %s · %s" % [turn_text, date_text, str(entry.get("title", ""))]

func _clear_entries() -> void:
	if entries_box == null:
		return
	for child in entries_box.get_children():
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
