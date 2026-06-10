extends PanelContainer

class_name CharacterDetailPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal character_action_requested(character_id: String, action_id: String)

var portrait_rect: TextureRect
var name_label: Label
var title_label: Label
var meta_label: Label
var stats_label: Label
var profile_box: VBoxContainer
var stats_box: VBoxContainer
var traits_box: VBoxContainer
var traits_label: Label
var bio_box: VBoxContainer
var bio_label: Label
var action_box: VBoxContainer
var action_history_label: Label
var action_history_box: VBoxContainer
var action_history_empty_state: PanelContainer
var current_character: Dictionary = {}
var current_actions: Array = []
var current_history: Array = []
var current_action_points: int = 0

func _ready() -> void:
	TianmingUiScript.style_content_panel(self)
	custom_minimum_size.x = 310
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

	title_label = _make_label(14, Color(0.74, 0.62, 0.42), true)
	root.add_child(TianmingUiScript.create_panel_header("人物详情", title_label))

	root.add_child(TianmingUiScript.create_section_title("人物档案"))
	portrait_rect = TextureRect.new()
	root.add_child(TianmingUiScript.create_portrait_frame(portrait_rect, Vector2(132, 176)))

	name_label = _make_label(22, Color(0.88, 0.72, 0.42), true)
	root.add_child(name_label)

	profile_box = VBoxContainer.new()
	profile_box.add_theme_constant_override("separation", 5)
	root.add_child(profile_box)

	meta_label = _make_label(13, Color(0.84, 0.80, 0.70), true)
	meta_label.visible = false
	root.add_child(meta_label)

	root.add_child(TianmingUiScript.create_separator())

	root.add_child(TianmingUiScript.create_section_title("能力资质"))
	stats_label = _make_label(13, Color(0.90, 0.86, 0.75), true)
	stats_box = VBoxContainer.new()
	stats_box.add_theme_constant_override("separation", 5)
	root.add_child(stats_box)

	traits_box = VBoxContainer.new()
	traits_box.add_theme_constant_override("separation", 5)
	root.add_child(traits_box)

	traits_label = _make_label(13, Color(0.74, 0.68, 0.52), true)
	traits_label.visible = false
	root.add_child(traits_label)

	root.add_child(TianmingUiScript.create_section_title("生平志略"))
	bio_box = VBoxContainer.new()
	bio_box.add_theme_constant_override("separation", 5)
	root.add_child(bio_box)

	bio_label = _make_label(13, Color(0.82, 0.78, 0.68), true)
	bio_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	bio_label.visible = false
	root.add_child(bio_label)

	root.add_child(TianmingUiScript.create_separator())

	root.add_child(TianmingUiScript.create_section_title("人物处置"))
	action_box = VBoxContainer.new()
	action_box.add_theme_constant_override("separation", 5)
	root.add_child(action_box)

	root.add_child(TianmingUiScript.create_section_title("处置记录"))
	action_history_label = _make_label(12, Color(0.70, 0.64, 0.52), true)
	action_history_label.visible = false
	root.add_child(action_history_label)
	action_history_box = VBoxContainer.new()
	action_history_box.add_theme_constant_override("separation", 8)
	action_history_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.add_child(action_history_box)
	action_history_empty_state = TianmingUiScript.create_empty_state("人物处置记录：无", "muted")
	root.add_child(action_history_empty_state)

	set_character(current_character)
	set_character_actions(current_actions, current_history, current_action_points)

func set_character(character: Dictionary) -> void:
	current_character = character
	if name_label == null:
		return
	if character.is_empty():
		name_label.text = "选择人物"
		title_label.text = ""
		meta_label.text = ""
		stats_label.text = ""
		_refresh_profile_rows()
		_refresh_stat_rows()
		traits_label.text = ""
		bio_label.text = ""
		_refresh_traits_rows()
		_refresh_bio_rows()
		portrait_rect.texture = null
		_refresh_actions()
		return

	name_label.text = str(character.get("name", "未命名"))
	title_label.text = str(character.get("title", character.get("official_title", "")))
	meta_label.text = "%s · %s岁 · %s\n%s · %s · %s" % [
		str(character.get("gender", "")),
		str(character.get("age", "")),
		str(character.get("faction", "")),
		str(character.get("party", "无党")),
		str(character.get("social_class", "")),
		str(character.get("location", ""))
	]
	_refresh_profile_rows()
	stats_label.text = "忠 %d · 志 %d · 智 %d · 政 %d\n勇 %d · 军 %d · 辩 %d · 望 %d\n仁 %d · 廉 %d" % [
		int(_num(character.get("loyalty", 0))),
		int(_num(character.get("ambition", 0))),
		int(_num(character.get("intelligence", 0))),
		int(_num(character.get("administration", 0))),
		int(_num(character.get("valor", 0))),
		int(_num(character.get("military", 0))),
		int(_num(character.get("diplomacy", 0))),
		int(_num(character.get("charisma", 0))),
		int(_num(character.get("benevolence", 0))),
		int(_num(character.get("integrity", 0)))
	]
	_refresh_stat_rows()
	traits_label.text = "特质：%s" % str(character.get("traits_text", ""))
	bio_label.text = str(character.get("bio", character.get("personality", "")))
	_refresh_traits_rows()
	_refresh_bio_rows()
	_load_portrait(str(character.get("portrait_path", "")))
	_refresh_actions()

func _refresh_profile_rows() -> void:
	if profile_box == null:
		return
	_clear_box(profile_box)
	if current_character.is_empty():
		profile_box.add_child(TianmingUiScript.create_empty_state("请选择人物档案。", "muted"))
		return
	profile_box.add_child(TianmingUiScript.create_log_strip("官职", _fallback_text(current_character.get("title", current_character.get("official_title", "")), "未授官"), "gold"))
	profile_box.add_child(TianmingUiScript.create_log_strip("身份", _join_nonempty([
		current_character.get("gender", ""),
		_age_text()
	], "未记载"), "neutral"))
	profile_box.add_child(TianmingUiScript.create_log_strip("所属", _join_nonempty([
		current_character.get("faction", ""),
		current_character.get("party", "无党"),
		current_character.get("social_class", "")
	], "未记载"), "jade"))
	profile_box.add_child(TianmingUiScript.create_log_strip("所在", _fallback_text(current_character.get("location", ""), "未记载"), "muted"))

func _refresh_stat_rows() -> void:
	if stats_box == null:
		return
	_clear_box(stats_box)
	if current_character.is_empty():
		return
	stats_box.add_child(TianmingUiScript.create_metric_row("忠 / 志 / 智 / 政", "%d / %d / %d / %d" % [
		int(_num(current_character.get("loyalty", 0))),
		int(_num(current_character.get("ambition", 0))),
		int(_num(current_character.get("intelligence", 0))),
		int(_num(current_character.get("administration", 0)))
	], "gold"))
	stats_box.add_child(TianmingUiScript.create_metric_row("勇 / 军 / 辩 / 望", "%d / %d / %d / %d" % [
		int(_num(current_character.get("valor", 0))),
		int(_num(current_character.get("military", 0))),
		int(_num(current_character.get("diplomacy", 0))),
		int(_num(current_character.get("charisma", 0)))
	], "neutral"))
	stats_box.add_child(TianmingUiScript.create_metric_row("仁 / 廉", "%d / %d" % [
		int(_num(current_character.get("benevolence", 0))),
		int(_num(current_character.get("integrity", 0)))
	], "muted"))

func _refresh_traits_rows() -> void:
	if traits_box == null:
		return
	_clear_box(traits_box)
	if current_character.is_empty():
		return
	traits_box.add_child(TianmingUiScript.create_log_strip("特质", _fallback_text(current_character.get("traits_text", ""), "无"), "gold"))

func _refresh_bio_rows() -> void:
	if bio_box == null:
		return
	_clear_box(bio_box)
	if current_character.is_empty():
		return
	bio_box.add_child(TianmingUiScript.create_log_strip("志略", _fallback_text(current_character.get("bio", current_character.get("personality", "")), "暂无志略"), "neutral"))

func set_character_actions(actions: Array, history: Array, action_points: int) -> void:
	current_actions = actions.duplicate(true)
	current_history = history.duplicate(true)
	current_action_points = action_points
	if action_box == null:
		return
	_refresh_actions()

func visible_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	lines.append("人物处置")
	lines.append(str(current_character.get("name", "")))
	if title_label != null:
		lines.append(title_label.text)
	if meta_label != null:
		lines.append(meta_label.text)
	if stats_label != null:
		lines.append(stats_label.text)
	if traits_label != null:
		lines.append(traits_label.text)
	if bio_label != null:
		lines.append(bio_label.text)
	lines.append(_history_text())
	return "\n".join(lines)

func _load_portrait(path: String) -> void:
	portrait_rect.texture = null
	if path.is_empty() or not FileAccess.file_exists(path):
		return
	var image: Image = Image.new()
	var err: Error = image.load(path)
	if err != OK:
		push_warning("Failed to load portrait %s error=%d" % [path, err])
		return
	portrait_rect.texture = ImageTexture.create_from_image(image)

func _refresh_actions() -> void:
	if action_box == null:
		return
	_clear_box(action_box)
	var character_id: String = str(current_character.get("id", ""))
	if current_character.is_empty() or character_id.is_empty():
		action_box.add_child(TianmingUiScript.create_empty_state("请选择人物后处置。", "muted"))
		action_history_label.text = "请选择人物后处置。"
		_refresh_action_history_surface()
		return
	var shown_actions: int = 0
	for raw in current_actions:
		var action: Dictionary = _dict(raw)
		var action_id: String = str(action.get("id", ""))
		if action_id.is_empty():
			continue
		if not _action_matches_character_state(action):
			continue
		var button: Button = TianmingUiScript.create_command_button("", 48, true)
		button.text = "%s · 耗行动点 %d\n%s" % [
			str(action.get("name", action_id)),
			int(_num(action.get("cost", 1))),
			str(action.get("description", ""))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.disabled = current_action_points < int(_num(action.get("cost", 1)))
		button.pressed.connect(func() -> void:
			emit_signal("character_action_requested", character_id, action_id)
		)
		action_box.add_child(button)
		shown_actions += 1
	if shown_actions == 0:
		action_box.add_child(TianmingUiScript.create_empty_state("暂无人物处置。", "muted"))
	action_history_label.text = _history_text()
	_refresh_action_history_surface()

func _refresh_action_history_surface() -> void:
	if action_history_label == null:
		return
	if current_character.is_empty() or str(current_character.get("id", "")).is_empty():
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

func _action_matches_character_state(action: Dictionary) -> bool:
	if _is_current_character_dead():
		return false
	var is_prisoner: bool = _is_current_character_imprisoned()
	var requires_prisoner: bool = bool(action.get("requires_imprisoned", false))
	if requires_prisoner:
		return is_prisoner
	if is_prisoner and not bool(action.get("allow_imprisoned", false)):
		return false
	return true

func _is_current_character_dead() -> bool:
	if bool(current_character.get("dead", false)) or bool(current_character.get("_dead", false)) or bool(current_character.get("deceased", false)):
		return true
	var status_text: String = "%s %s %s" % [
		str(current_character.get("status", "")),
		str(current_character.get("current_status", "")),
		str(current_character.get("official_title", current_character.get("title", "")))
	]
	for marker in ["已故", "病故", "身亡", "死亡", "亡故", "卒", "殁", "薨", "遇害"]:
		if status_text.contains(marker):
			return true
	return false

func _is_current_character_imprisoned() -> bool:
	if _is_current_character_dead():
		return false
	if bool(current_character.get("_imprisoned", current_character.get("imprisoned", false))):
		return true
	var status_text: String = "%s %s %s" % [
		str(current_character.get("status", "")),
		str(current_character.get("current_status", "")),
		str(current_character.get("official_title", current_character.get("title", "")))
	]
	if status_text.contains("出狱") or status_text.contains("释") or status_text.contains("赦"):
		return false
	for marker in ["下狱", "系狱", "入狱", "收押", "关押", "被逮"]:
		if status_text.contains(marker):
			return true
	return false

func _history_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	for raw in _scoped_history_records():
		var record: Dictionary = _dict(raw)
		lines.append("%s：%s" % [
			_history_record_heading(record),
			str(record.get("outcome", record.get("description", "")))
		])
	if lines.is_empty():
		return "人物处置记录：无"
	return "人物处置记录：\n%s" % "\n".join(lines)

func _scoped_history_records() -> Array:
	var records: Array = []
	var character_id: String = str(current_character.get("id", ""))
	for raw in current_history:
		var record: Dictionary = _dict(raw)
		if not character_id.is_empty() and str(record.get("character_id", "")) != character_id:
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
	box.add_child(TianmingUiScript.create_log_strip("处置", _history_record_heading(record), "gold"))
	var outcome: String = _fallback_text(record.get("outcome", record.get("description", "")), "")
	if not outcome.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("结果", outcome, "neutral"))

func _history_record_heading(record: Dictionary) -> String:
	return "第%d回合 %s" % [
		int(_num(record.get("turn", 0))),
		str(record.get("action", ""))
	]

func _make_label(font_size: int, color: Color, should_wrap: bool) -> Label:
	var label: Label = Label.new()
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if should_wrap else TextServer.AUTOWRAP_OFF
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return label

func _make_text_label(text: String, font_size: int, color: Color, should_wrap: bool) -> Label:
	var label: Label = _make_label(font_size, color, should_wrap)
	label.text = text
	return label

func _clear_box(box: BoxContainer) -> void:
	if box == null:
		return
	for child in box.get_children():
		child.queue_free()

func _num(value: Variant) -> float:
	if typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT:
		return float(value)
	return str(value).to_float()

func _fallback_text(value: Variant, fallback: String) -> String:
	var text: String = str(value).strip_edges()
	return fallback if text.is_empty() else text

func _age_text() -> String:
	var text: String = str(current_character.get("age", "")).strip_edges()
	return "" if text.is_empty() else "%s岁" % text

func _join_nonempty(values: Array, fallback: String) -> String:
	var parts: PackedStringArray = PackedStringArray()
	for raw in values:
		var text: String = str(raw).strip_edges()
		if not text.is_empty():
			parts.append(text)
	if parts.is_empty():
		return fallback
	return " · ".join(parts)

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}
