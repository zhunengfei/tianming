extends PanelContainer

class_name RelationshipPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

var count_label: Label
var character_box: VBoxContainer
var faction_box: VBoxContainer
var character_relations: Array = []
var faction_relations: Array = []

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
	root.add_child(TianmingUiScript.create_panel_header("关系谱系", count_label))

	var columns: HBoxContainer = HBoxContainer.new()
	columns.add_theme_constant_override("separation", 12)
	columns.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	columns.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(columns)

	character_box = _add_relation_column(columns, "人物关系")
	faction_box = _add_relation_column(columns, "势力关系")
	set_data({})

func set_data(rows: Dictionary) -> void:
	character_relations = _array(rows.get("characters", [])).duplicate(true)
	faction_relations = _array(rows.get("factions", [])).duplicate(true)
	if count_label == null:
		return
	count_label.text = "人物关系 %d 条  势力关系 %d 条" % [character_relations.size(), faction_relations.size()]
	_refresh_column(character_box, character_relations, "暂无人物关系")
	_refresh_column(faction_box, faction_relations, "暂无势力关系")

func visible_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	lines.append("人物关系")
	for raw in character_relations:
		lines.append(_relation_text(_dict(raw)))
	lines.append("势力关系")
	for raw in faction_relations:
		lines.append(_relation_text(_dict(raw)))
	return "\n".join(lines)

func _add_relation_column(parent: HBoxContainer, title_text: String) -> VBoxContainer:
	var column: VBoxContainer = VBoxContainer.new()
	column.add_theme_constant_override("separation", 7)
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.size_flags_vertical = Control.SIZE_EXPAND_FILL
	parent.add_child(TianmingUiScript.create_content_panel(column, Vector4(10, 10, 10, 10)))

	column.add_child(TianmingUiScript.create_section_title(title_text))
	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	column.add_child(scroll)

	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(box)
	return box

func _refresh_column(box: VBoxContainer, rows: Array, empty_text: String) -> void:
	if box == null:
		return
	_clear_box(box)
	if rows.is_empty():
		box.add_child(TianmingUiScript.create_empty_state(empty_text, "muted"))
		return
	for raw in rows:
		var relation: Dictionary = _dict(raw)
		box.add_child(_make_relation_surface(relation))

func _make_relation_surface(relation: Dictionary) -> PanelContainer:
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	box.add_child(TianmingUiScript.create_log_strip("关系", _relation_heading(relation), "gold"))
	var desc: String = str(relation.get("desc", "")).strip_edges()
	if not desc.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("说明", desc, "neutral"))
	return TianmingUiScript.create_content_panel(box, Vector4(8, 7, 8, 7))

func _relation_text(relation: Dictionary) -> String:
	var head: String = _relation_heading(relation)
	var desc: String = str(relation.get("desc", "")).strip_edges()
	if desc.is_empty():
		return head
	return "%s\n%s" % [head, desc]

func _relation_heading(relation: Dictionary) -> String:
	var from_name: String = str(relation.get("from", ""))
	var to_name: String = str(relation.get("to", ""))
	var relation_type: String = str(relation.get("type", ""))
	var value_text: String = str(relation.get("value", ""))
	var head: String = "%s -> %s" % [from_name, to_name]
	if not relation_type.is_empty():
		head += "  %s" % relation_type
	if not value_text.is_empty():
		head += "  %s" % value_text
	return head

func _clear_box(box: VBoxContainer) -> void:
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

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}

func _array(value: Variant) -> Array:
	return value if typeof(value) == TYPE_ARRAY else []
