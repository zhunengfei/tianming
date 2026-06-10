extends PanelContainer

class_name AppointmentPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal appointment_requested(character_id: String, office_id: String)

var offices_box: VBoxContainer
var detail_box: VBoxContainer
var candidates_box: VBoxContainer
var detail_label: Label
var history_label: Label
var history_box: VBoxContainer
var history_empty_state: PanelContainer
var current_history: Array = []
var selected_office_id: String = ""

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
	left.custom_minimum_size.x = 260
	left.add_theme_constant_override("separation", 8)
	var left_panel: PanelContainer = TianmingUiScript.create_content_panel(left, Vector4(10, 10, 10, 10))
	left_panel.custom_minimum_size.x = 280
	left_panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	root.add_child(left_panel)

	left.add_child(TianmingUiScript.create_panel_header("官职", _make_label("任命候选与官职变更", 13, Color(0.72, 0.64, 0.50))))
	offices_box = VBoxContainer.new()
	offices_box.add_theme_constant_override("separation", 6)
	left.add_child(offices_box)
	left.add_child(TianmingUiScript.create_section_title("任免记录"))
	history_empty_state = TianmingUiScript.create_empty_state("任免记录：无", "muted")
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

	detail_label = _make_label("选择官职后任命候选人。", 14, Color(0.86, 0.78, 0.64))
	detail_label.visible = false
	right.add_child(detail_label)
	right.add_child(TianmingUiScript.create_section_title("官职详情"))
	detail_box = VBoxContainer.new()
	detail_box.add_theme_constant_override("separation", 6)
	right.add_child(detail_box)
	right.add_child(TianmingUiScript.create_section_title("任命候选"))
	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	right.add_child(scroll)
	candidates_box = VBoxContainer.new()
	candidates_box.add_theme_constant_override("separation", 5)
	scroll.add_child(candidates_box)
	set_data([], [], {}, [], 0)

func set_data(offices: Array, characters: Array, assignments: Dictionary, appointment_history: Array, action_points: int) -> void:
	if offices_box == null:
		return
	current_history = appointment_history.duplicate(true)
	_clear_box(offices_box)
	if (selected_office_id.is_empty() or _office_by_id(offices, selected_office_id).is_empty()) and offices.size() > 0:
		selected_office_id = str(_dict(offices[0]).get("id", ""))
	elif offices.is_empty():
		selected_office_id = ""
	for raw in offices:
		var office: Dictionary = _dict(raw)
		var button: Button = TianmingUiScript.create_list_row_button("appointment_office", 52)
		var office_id: String = str(office.get("id", ""))
		button.text = "%s\n现任：%s" % [
			str(office.get("name", "")),
			_holder_name(str(assignments.get(office_id, "")), characters)
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		TianmingUiScript.set_list_row_button_selected(button, office_id == selected_office_id)
		button.pressed.connect(func() -> void:
			selected_office_id = office_id
			set_data(offices, characters, assignments, appointment_history, action_points)
		)
		offices_box.add_child(button)
	_update_candidates(offices, characters, assignments, action_points)
	history_label.text = _history_text(appointment_history)
	_refresh_history_surface()

func visible_text() -> String:
	return "官员任免\n%s\n%s" % [
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

	box.add_child(TianmingUiScript.create_log_strip("任免", _history_record_heading(record), "gold"))
	var old_holder: String = str(record.get("old_holder", "")).strip_edges()
	if not old_holder.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("前任", old_holder, "neutral"))
	if record.has("loyalty_delta"):
		box.add_child(TianmingUiScript.create_log_strip("忠诚", _signed_num(_num(record.get("loyalty_delta", 0))), "jade"))
	var old_title: String = str(record.get("old_title", "")).strip_edges()
	if not old_title.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("原任", old_title, "neutral"))

func _update_candidates(offices: Array, characters: Array, assignments: Dictionary, action_points: int) -> void:
	_clear_box(candidates_box)
	_clear_box(detail_box)
	var office: Dictionary = _office_by_id(offices, selected_office_id)
	if office.is_empty():
		detail_label.text = "选择官职后任命候选人。"
		detail_box.add_child(TianmingUiScript.create_empty_state("选择官职后任命候选人。", "muted"))
		return
	detail_label.text = "%s · %s · 任命消耗 1 行动点" % [
		str(office.get("name", "")),
		str(office.get("domain", ""))
	]
	detail_box.add_child(TianmingUiScript.create_log_strip("官职", "%s · %s" % [
		str(office.get("name", "")),
		str(office.get("domain", ""))
	], "gold"))
	detail_box.add_child(TianmingUiScript.create_log_strip("现任", _holder_name(str(assignments.get(selected_office_id, "")), characters), "jade"))
	detail_box.add_child(TianmingUiScript.create_log_strip("消耗", "任命消耗 1 行动点", "neutral"))
	var shown_candidates: int = 0
	for raw in _sorted_candidates(characters, str(office.get("domain", ""))):
		var character: Dictionary = _dict(raw)
		var character_id: String = str(character.get("id", ""))
		if character_id.is_empty() or character_id == str(assignments.get(selected_office_id, "")):
			continue
		shown_candidates += 1
		var button: Button = TianmingUiScript.create_command_button("", 48)
		var candidate_text: String = "%s  忠%d 政%d 军%d 智%d\n%s" % [
			str(character.get("name", "")),
			int(_num(character.get("loyalty", 0))),
			int(_num(character.get("administration", 0))),
			int(_num(character.get("military", 0))),
			int(_num(character.get("intelligence", 0))),
			str(character.get("official_title", character.get("title", "")))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_apply_candidate_button_content(button, character, candidate_text)
		button.disabled = action_points <= 0
		button.pressed.connect(func() -> void:
			emit_signal("appointment_requested", character_id, selected_office_id)
		)
		candidates_box.add_child(button)
	if shown_candidates == 0:
		candidates_box.add_child(TianmingUiScript.create_empty_state("暂无任命候选。", "muted"))

func _sorted_candidates(characters: Array, domain: String) -> Array:
	var rows: Array = characters.duplicate(true)
	rows.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return _candidate_score(a, domain) > _candidate_score(b, domain)
	)
	return rows

func _candidate_score(character: Dictionary, domain: String) -> float:
	var score: float = _num(character.get("loyalty", 0)) * 0.25 + _num(character.get("intelligence", 0)) * 0.2
	if domain in ["军务", "辽东", "西北"]:
		score += _num(character.get("military", 0)) * 0.45 + _num(character.get("valor", 0)) * 0.10
	else:
		score += _num(character.get("administration", 0)) * 0.45 + _num(character.get("management", 0)) * 0.10
	return score

func _apply_candidate_button_content(button: Button, character: Dictionary, candidate_text: String) -> void:
	var texture: Texture2D = _load_portrait_texture(str(character.get("portrait_path", "")))
	if texture == null:
		button.text = candidate_text
		return
	button.text = ""
	button.custom_minimum_size.y = 92
	button.tooltip_text = "%s\n%s" % [
		str(character.get("name", "")),
		str(character.get("official_title", character.get("title", "")))
	]
	var row: HBoxContainer = HBoxContainer.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override("separation", 8)
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 8
	row.offset_top = 6
	row.offset_right = -8
	row.offset_bottom = -6
	button.add_child(row)

	var portrait_rect: TextureRect = TextureRect.new()
	portrait_rect.texture = texture
	row.add_child(TianmingUiScript.create_portrait_frame(portrait_rect, Vector2(54, 72)))

	var text_label: Label = _make_label(candidate_text, 13, Color(0.88, 0.84, 0.74))
	text_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	text_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(text_label)

func _load_portrait_texture(path: String) -> Texture2D:
	if path.is_empty() or not FileAccess.file_exists(path):
		return null
	var image: Image = Image.new()
	var err: Error = image.load(path)
	if err != OK:
		push_warning("Failed to load appointment candidate portrait %s error=%d" % [path, err])
		return null
	return ImageTexture.create_from_image(image)

func _office_by_id(offices: Array, office_id: String) -> Dictionary:
	for raw in offices:
		var office: Dictionary = _dict(raw)
		if str(office.get("id", "")) == office_id:
			return office
	return {}

func _holder_name(character_id: String, characters: Array) -> String:
	if character_id.is_empty():
		return "空缺"
	for raw in characters:
		var character: Dictionary = _dict(raw)
		if str(character.get("id", "")) == character_id:
			return str(character.get("name", ""))
	return "空缺"

func _history_text(history: Array) -> String:
	if history.is_empty():
		return "任免记录：无"
	var names: PackedStringArray = PackedStringArray()
	for raw in history:
		var record: Dictionary = _dict(raw)
		var parts: PackedStringArray = PackedStringArray()
		parts.append(_history_record_heading(record))
		var old_holder: String = str(record.get("old_holder", "")).strip_edges()
		if not old_holder.is_empty():
			parts.append("前任 %s" % old_holder)
		if record.has("loyalty_delta"):
			parts.append("忠诚 %s" % _signed_num(_num(record.get("loyalty_delta", 0))))
		var old_title: String = str(record.get("old_title", "")).strip_edges()
		if not old_title.is_empty():
			parts.append("原任 %s" % old_title)
		names.append(" / ".join(parts))
	return "任免记录：%s" % "、".join(names)

func _history_record_heading(record: Dictionary) -> String:
	return "T%d %s任%s" % [
		int(_num(record.get("turn", 0))),
		str(record.get("character", "")),
		str(record.get("office", ""))
	]

func _signed_num(value: float) -> String:
	if value > 0.0:
		return "+%d" % roundi(value)
	if value < 0.0:
		return "-%d" % roundi(absf(value))
	return "0"

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
