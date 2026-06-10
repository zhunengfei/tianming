extends PanelContainer

class_name AudiencePanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal audience_requested(character_id: String, topic_id: String)

var points_label: Label
var portrait_rect: TextureRect
var character_summary_label: Label
var character_summary_box: VBoxContainer
var character_select: OptionButton
var topic_select: OptionButton
var topic_label: Label
var topic_box: VBoxContainer
var topic_empty_state: PanelContainer
var history_label: Label
var history_box: VBoxContainer
var history_empty_state: PanelContainer
var last_characters: Array = []
var last_topics: Array = []
var last_history: Array = []
var selected_character_id: String = ""
var selected_topic_id: String = ""

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

	points_label = _make_label("", 13, Color(0.72, 0.64, 0.50))
	root.add_child(TianmingUiScript.create_panel_header("问对", points_label))

	var body_box: VBoxContainer = VBoxContainer.new()
	body_box.add_theme_constant_override("separation", 9)
	body_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var body_scroll: ScrollContainer = TianmingUiScript.create_scroll_area(body_box)
	root.add_child(body_scroll)

	var character_preview: HBoxContainer = HBoxContainer.new()
	character_preview.add_theme_constant_override("separation", 10)
	character_preview.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body_box.add_child(character_preview)

	portrait_rect = TextureRect.new()
	character_preview.add_child(TianmingUiScript.create_portrait_frame(portrait_rect, Vector2(112, 148)))

	var character_details: VBoxContainer = VBoxContainer.new()
	character_details.add_theme_constant_override("separation", 6)
	character_details.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	character_details.size_flags_vertical = Control.SIZE_EXPAND_FILL
	character_preview.add_child(character_details)
	character_details.add_child(TianmingUiScript.create_section_title("问对人物"))
	character_summary_box = VBoxContainer.new()
	character_summary_box.add_theme_constant_override("separation", 6)
	character_details.add_child(character_summary_box)
	character_summary_label = _make_label("", 13, Color(0.84, 0.78, 0.66))
	character_summary_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	character_summary_label.visible = false
	character_details.add_child(character_summary_label)

	var controls: HBoxContainer = HBoxContainer.new()
	controls.add_theme_constant_override("separation", 8)
	body_box.add_child(controls)

	character_select = TianmingUiScript.create_select_control(30)
	character_select.item_selected.connect(func(idx: int) -> void:
		selected_character_id = str(character_select.get_item_metadata(idx))
		_refresh_character_preview()
	)
	controls.add_child(character_select)

	topic_select = TianmingUiScript.create_select_control(30)
	topic_select.item_selected.connect(func(idx: int) -> void:
		selected_topic_id = str(topic_select.get_item_metadata(idx))
		_refresh_topic_label()
	)
	controls.add_child(topic_select)

	var button: Button = TianmingUiScript.create_command_button("召见", 30, true)
	button.custom_minimum_size.x = 84
	button.size_flags_horizontal = Control.SIZE_SHRINK_END
	button.pressed.connect(_request_audience)
	controls.add_child(button)

	body_box.add_child(TianmingUiScript.create_section_title("问对主题"))
	topic_label = _make_label("", 13, Color(0.84, 0.78, 0.66))
	topic_label.visible = false
	body_box.add_child(topic_label)
	topic_box = VBoxContainer.new()
	topic_box.add_theme_constant_override("separation", 6)
	body_box.add_child(topic_box)
	topic_empty_state = TianmingUiScript.create_empty_state("暂无问对主题。", "muted")
	body_box.add_child(topic_empty_state)

	body_box.add_child(TianmingUiScript.create_section_title("近期问对"))
	history_label = _make_label("", 13, Color(0.88, 0.84, 0.74))
	history_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	history_label.visible = false
	body_box.add_child(history_label)
	history_box = VBoxContainer.new()
	history_box.add_theme_constant_override("separation", 8)
	history_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body_box.add_child(history_box)
	history_empty_state = TianmingUiScript.create_empty_state("近期问对：无", "muted")
	body_box.add_child(history_empty_state)
	set_data([], [], [], 0)

func set_data(characters: Array, topics: Array, history: Array, action_points: int) -> void:
	last_characters = characters.duplicate(true)
	last_topics = topics.duplicate(true)
	last_history = history.duplicate(true)
	if selected_character_id.is_empty() or _character_by_id(selected_character_id).is_empty():
		selected_character_id = _first_character_id()
	if selected_topic_id.is_empty() or _topic_by_id(selected_topic_id).is_empty():
		selected_topic_id = _first_topic_id()
	if points_label == null:
		return
	points_label.text = "行动点：%d · 选择人物与问对主题" % action_points
	_fill_characters()
	_fill_topics()
	_refresh_character_preview()
	_refresh_topic_label()
	history_label.text = _history_text()
	_refresh_history_surface()

func visible_text() -> String:
	return "问对\n%s\n%s\n%s" % [
		"" if character_summary_label == null else character_summary_label.text,
		"" if topic_label == null else topic_label.text,
		_history_text()
	]

func _fill_characters() -> void:
	character_select.clear()
	for i in range(last_characters.size()):
		var character: Dictionary = _dict(last_characters[i])
		var character_id: String = str(character.get("id", ""))
		character_select.add_item("%s · %s" % [
			str(character.get("name", "")),
			str(character.get("official_title", character.get("title", "")))
		])
		character_select.set_item_metadata(i, character_id)
		if character_id == selected_character_id:
			character_select.select(i)

func _fill_topics() -> void:
	topic_select.clear()
	for i in range(last_topics.size()):
		var topic: Dictionary = _dict(last_topics[i])
		var topic_id: String = str(topic.get("id", ""))
		topic_select.add_item("%s · %s" % [str(topic.get("name", "")), str(topic.get("domain", ""))])
		topic_select.set_item_metadata(i, topic_id)
		if topic_id == selected_topic_id:
			topic_select.select(i)

func _refresh_topic_label() -> void:
	if topic_label == null:
		return
	_clear_box(topic_box)
	var idx: int = topic_select.selected
	if idx < 0 or idx >= last_topics.size():
		topic_label.text = "暂无问对主题。"
		topic_label.visible = false
		if topic_empty_state != null:
			topic_empty_state.visible = true
		return
	var topic: Dictionary = _dict(last_topics[idx])
	topic_label.text = "%s：%s" % [
		str(topic.get("name", "")),
		str(topic.get("desc", ""))
	]
	topic_label.visible = false
	if topic_box != null:
		topic_box.add_child(TianmingUiScript.create_log_strip("主题", "%s · %s" % [
			str(topic.get("name", "")),
			_fallback_text(topic.get("domain", ""), "未分类")
		], "gold"))
		topic_box.add_child(TianmingUiScript.create_log_strip("要点", _fallback_text(topic.get("desc", ""), "暂无主题说明"), "neutral"))
	if topic_empty_state != null:
		topic_empty_state.visible = false

func _refresh_history_surface() -> void:
	if history_label == null:
		return
	_clear_box(history_box)
	var is_empty: bool = last_history.is_empty()
	history_label.visible = false
	if history_box != null:
		history_box.visible = not is_empty
	if history_empty_state != null:
		history_empty_state.visible = is_empty
	if is_empty:
		return
	for raw in last_history:
		_add_history_row(_dict(raw))

func _add_history_row(record: Dictionary) -> void:
	if history_box == null:
		return
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	history_box.add_child(TianmingUiScript.create_content_panel(box, Vector4(8, 7, 8, 7)))

	box.add_child(TianmingUiScript.create_log_strip("问对", _history_record_heading(record), "gold"))
	if record.has("score"):
		box.add_child(TianmingUiScript.create_log_strip("评分", "%d" % int(_num(record.get("score", 0))), "jade"))
	var attitude: String = str(record.get("attitude", "")).strip_edges()
	if not attitude.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("态度", attitude, "neutral"))
	var response: String = str(record.get("response", "")).strip_edges()
	if not response.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("回应", response, "muted"))
	var suggestion_text: String = _suggestion_text(_dict(record.get("suggestion", {})), str(record.get("created_recommendation_id", "")))
	if not suggestion_text.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("建议", suggestion_text, "neutral"))

func _refresh_character_preview() -> void:
	if portrait_rect == null or character_summary_label == null:
		return
	_clear_box(character_summary_box)
	var character: Dictionary = _character_by_id(selected_character_id)
	if character.is_empty():
		portrait_rect.texture = null
		character_summary_label.text = "请选择问对人物"
		if character_summary_box != null:
			character_summary_box.add_child(TianmingUiScript.create_empty_state("请选择问对人物。", "muted"))
		return
	var title: String = _fallback_text(character.get("official_title", character.get("title", "")), "未授官")
	var faction: String = _fallback_text(character.get("faction", ""), "未明")
	character_summary_label.text = "%s\n%s\n%s" % [
		str(character.get("name", "")),
		title,
		faction
	]
	if character_summary_box != null:
		character_summary_box.add_child(TianmingUiScript.create_log_strip("人物", "%s · %s" % [
			str(character.get("name", "")),
			title
		], "gold"))
		character_summary_box.add_child(TianmingUiScript.create_log_strip("所属", faction, "jade"))
	_load_portrait(str(character.get("portrait_path", "")))

func _load_portrait(path: String) -> void:
	portrait_rect.texture = null
	if path.is_empty() or not FileAccess.file_exists(path):
		return
	var image: Image = Image.new()
	var err: Error = image.load(path)
	if err != OK:
		push_warning("Failed to load audience portrait %s error=%d" % [path, err])
		return
	portrait_rect.texture = ImageTexture.create_from_image(image)

func _request_audience() -> void:
	var character_id: String = str(character_select.get_selected_metadata())
	var topic_id: String = str(topic_select.get_selected_metadata())
	if character_id.is_empty() or topic_id.is_empty():
		return
	selected_character_id = character_id
	selected_topic_id = topic_id
	emit_signal("audience_requested", character_id, topic_id)

func _first_character_id() -> String:
	for raw in last_characters:
		var character: Dictionary = _dict(raw)
		var id: String = str(character.get("id", ""))
		if not id.is_empty():
			return id
	return ""

func _first_topic_id() -> String:
	for raw in last_topics:
		var topic: Dictionary = _dict(raw)
		var id: String = str(topic.get("id", ""))
		if not id.is_empty():
			return id
	return ""

func _character_by_id(character_id: String) -> Dictionary:
	for raw in last_characters:
		var character: Dictionary = _dict(raw)
		if str(character.get("id", "")) == character_id:
			return character
	return {}

func _topic_by_id(topic_id: String) -> Dictionary:
	for raw in last_topics:
		var topic: Dictionary = _dict(raw)
		if str(topic.get("id", "")) == topic_id:
			return topic
	return {}

func _clear_box(box: BoxContainer) -> void:
	if box == null:
		return
	for child in box.get_children():
		box.remove_child(child)
		child.queue_free()

func _history_text() -> String:
	if last_history.is_empty():
		return "近期问对：无"
	var lines: PackedStringArray = PackedStringArray()
	for raw in last_history:
		var record: Dictionary = _dict(raw)
		lines.append("%s：%s" % [
			_history_record_text(record),
			str(record.get("response", ""))
		])
	return "\n".join(lines)

func _history_record_heading(record: Dictionary) -> String:
	return "第%d回合 %s / %s" % [
		int(_num(record.get("turn", 0))),
		str(record.get("character_name", "")),
		str(record.get("topic", ""))
	]

func _history_record_text(record: Dictionary) -> String:
	return "第%d回合 %s问对《%s》" % [
		int(_num(record.get("turn", 0))),
		str(record.get("character_name", "")),
		str(record.get("topic", ""))
	]

func _suggestion_text(suggestion: Dictionary, fallback_id: String) -> String:
	var name_text: String = str(suggestion.get("name", "")).strip_edges()
	if not name_text.is_empty():
		return name_text
	return fallback_id.strip_edges()

func _make_label(text: String, font_size: int, color: Color) -> Label:
	var label: Label = Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label

func _fallback_text(value: Variant, fallback: String) -> String:
	var text: String = str(value).strip_edges()
	return fallback if text.is_empty() else text

func _num(value: Variant) -> float:
	if typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT:
		return float(value)
	return str(value).to_float()

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}
