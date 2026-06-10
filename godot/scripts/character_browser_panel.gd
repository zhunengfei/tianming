extends MarginContainer

class_name CharacterBrowserPanel

const CharacterDetailPanelScript := preload("res://scripts/character_detail_panel.gd")
const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal character_action_requested(character_id: String, action_id: String)

var character_list_box: VBoxContainer
var character_detail_panel: Control
var selected_character_button: Button
var selected_character_id: String = ""
var character_row_buttons: Dictionary = {}
var current_characters: Array = []
var current_actions: Array = []
var current_history: Array = []
var current_action_points: int = 0
var portrait_texture_cache: Dictionary = {}

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
	left.custom_minimum_size.x = 520
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left.size_flags_vertical = Control.SIZE_EXPAND_FILL
	left.add_theme_constant_override("separation", 8)
	layout.add_child(TianmingUiScript.create_content_panel(left, Vector4(10, 10, 10, 10)))

	left.add_child(TianmingUiScript.create_panel_header("人物", _make_cell("官员名录与人物处置", 260, true, true)))

	left.add_child(TianmingUiScript.create_section_title("人物名录"))
	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	left.add_child(scroll)

	character_list_box = VBoxContainer.new()
	character_list_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	character_list_box.add_theme_constant_override("separation", 3)
	scroll.add_child(character_list_box)

	character_detail_panel = CharacterDetailPanelScript.new()
	character_detail_panel.connect("character_action_requested", Callable(self, "_on_detail_action_requested"))
	layout.add_child(character_detail_panel)
	set_data(current_characters, current_actions, current_history, current_action_points)

func set_data(characters: Array, actions: Array = [], history: Array = [], action_points: int = 0) -> void:
	current_characters = characters.duplicate(true)
	current_actions = actions.duplicate(true)
	current_history = history.duplicate(true)
	current_action_points = action_points
	if character_list_box == null:
		return
	if selected_character_id.is_empty() or _character_by_id(current_characters, selected_character_id).is_empty():
		selected_character_id = _first_character_id(current_characters)
	_refresh_rows()
	_update_detail()

func select_character(character_id: String) -> void:
	if _character_by_id(current_characters, character_id).is_empty():
		return
	selected_character_id = character_id
	_update_selected_button()
	_update_detail()

func visible_text() -> String:
	var selected: Dictionary = _character_by_id(current_characters, selected_character_id)
	return "人物\n%s\n%s\n%s" % [
		_character_list_text(),
		_character_detail_text(selected),
		"" if character_detail_panel == null else str(character_detail_panel.call("visible_text"))
	]

func _refresh_rows() -> void:
	_clear_box(character_list_box)
	character_row_buttons.clear()
	character_list_box.add_child(TianmingUiScript.create_log_strip("名录", "点击人物查看档案与处置", "muted"))
	var shown_rows: int = 0
	for raw in current_characters:
		var character: Dictionary = _dict(raw)
		var character_id: String = str(character.get("id", ""))
		if character_id.is_empty():
			continue
		shown_rows += 1
		var button: Button = _make_character_button(character)
		character_row_buttons[character_id] = button
		character_list_box.add_child(button)
		button.pressed.connect(func() -> void:
			select_character(character_id)
		)
	if shown_rows == 0:
		character_list_box.add_child(TianmingUiScript.create_empty_state("暂无人物记录。", "muted"))
	_update_selected_button()

func _make_character_button(character: Dictionary) -> Button:
	var button: Button = TianmingUiScript.create_list_row_button("character", 104)
	button.set_meta("tianming_browser_list_row", true)
	button.set_meta("tianming_browser_list_row_kind", "character")
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.custom_minimum_size.y = 104
	button.tooltip_text = "%s · %s" % [str(character.get("name", "")), str(character.get("title", ""))]
	var row: Control = Control.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.offset_left = 8
	row.offset_top = 7
	row.offset_right = -8
	row.offset_bottom = -7
	button.add_child(row)

	var texture: Texture2D = _load_portrait_texture(str(character.get("portrait_path", "")))
	var info_left_offset: float = 0.0
	if texture != null:
		var portrait_rect: TextureRect = TextureRect.new()
		portrait_rect.texture = texture
		var frame: PanelContainer = TianmingUiScript.create_portrait_frame(portrait_rect, Vector2(54, 72))
		frame.set_anchors_preset(Control.PRESET_TOP_LEFT)
		frame.offset_left = 0
		frame.offset_top = 0
		row.add_child(frame)
		info_left_offset = 76.0

	var info_box: VBoxContainer = VBoxContainer.new()
	info_box.set_anchors_preset(Control.PRESET_FULL_RECT)
	info_box.offset_left = info_left_offset
	info_box.offset_top = 0
	info_box.offset_right = 0
	info_box.offset_bottom = 0
	info_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	info_box.add_theme_constant_override("separation", 4)
	row.add_child(info_box)
	info_box.add_child(TianmingUiScript.create_log_strip("人物", _character_row_identity(character), "gold"))
	info_box.add_child(TianmingUiScript.create_log_strip("资质", _character_row_metrics(character), "neutral"))
	_set_mouse_filter_ignore(row)
	return button

func _update_selected_button() -> void:
	selected_character_button = null
	for raw_id in character_row_buttons.keys():
		var character_id: String = str(raw_id)
		var button: Button = character_row_buttons.get(character_id, null) as Button
		if button == null:
			continue
		var selected: bool = character_id == selected_character_id
		TianmingUiScript.set_list_row_button_selected(button, selected)
		if selected:
			selected_character_button = button

func _update_detail() -> void:
	if character_detail_panel == null:
		return
	var character: Dictionary = _character_by_id(current_characters, selected_character_id)
	character_detail_panel.call("set_character", character)
	character_detail_panel.call("set_character_actions", current_actions, current_history, current_action_points)

func _on_detail_action_requested(character_id: String, action_id: String) -> void:
	emit_signal("character_action_requested", character_id, action_id)

func _character_detail_text(character: Dictionary) -> String:
	if character.is_empty():
		return "未选择人物"
	return "%s\n%s\n%s %s %s\n忠%d 智%d 政%d 武%d" % [
		str(character.get("name", "")),
		str(character.get("official_title", character.get("title", ""))),
		str(character.get("faction", "")),
		str(character.get("party", "")),
		str(character.get("location", "")),
		int(_num(character.get("loyalty", 0))),
		int(_num(character.get("intelligence", 0))),
		int(_num(character.get("administration", 0))),
		int(_num(character.get("valor", 0)))
	]

func _character_list_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	for raw in current_characters:
		var character: Dictionary = _dict(raw)
		lines.append("%s %s %s" % [
			str(character.get("name", "")),
			str(character.get("official_title", character.get("title", ""))),
			str(character.get("party", ""))
		])
	return "\n".join(lines)

func _make_cell(text: String, width: float, expand: bool, bold: bool) -> Label:
	var label: Label = Label.new()
	label.text = text
	label.custom_minimum_size.x = width
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL if expand else Control.SIZE_SHRINK_BEGIN
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	label.add_theme_font_size_override("font_size", 13)
	if bold:
		label.add_theme_color_override("font_color", Color(0.86, 0.70, 0.42))
	else:
		label.add_theme_color_override("font_color", Color(0.82, 0.78, 0.68))
	return label

func _character_row_identity(character: Dictionary) -> String:
	return _join_nonempty([
		character.get("name", ""),
		character.get("official_title", character.get("title", ""))
	], "未命名人物")

func _character_row_metrics(character: Dictionary) -> String:
	return "忠%d · 智%d · 政%d · 武%d" % [
		int(_num(character.get("loyalty", 0))),
		int(_num(character.get("intelligence", 0))),
		int(_num(character.get("administration", 0))),
		int(_num(character.get("valor", 0)))
	]

func _load_portrait_texture(path: String) -> Texture2D:
	if path.is_empty():
		return null
	if portrait_texture_cache.has(path):
		return portrait_texture_cache[path] as Texture2D
	var image: Image = Image.new()
	var err: Error = image.load(path)
	if err != OK:
		push_warning("Failed to load character browser list portrait %s error=%d" % [path, err])
		return null
	var texture: Texture2D = ImageTexture.create_from_image(image)
	portrait_texture_cache[path] = texture
	return texture

func _join_nonempty(values: Array, fallback: String) -> String:
	var parts: PackedStringArray = PackedStringArray()
	for raw in values:
		var text: String = str(raw).strip_edges()
		if not text.is_empty():
			parts.append(text)
	if parts.is_empty():
		return fallback
	return " · ".join(parts)

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

func _first_character_id(characters: Array) -> String:
	for raw in characters:
		var character: Dictionary = _dict(raw)
		var character_id: String = str(character.get("id", ""))
		if not character_id.is_empty():
			return character_id
	return ""

func _character_by_id(characters: Array, character_id: String) -> Dictionary:
	for raw in characters:
		var character: Dictionary = _dict(raw)
		if str(character.get("id", "")) == character_id:
			return character
	return {}

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}

func _num(value: Variant) -> float:
	if typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT:
		return float(value)
	return str(value).to_float()
