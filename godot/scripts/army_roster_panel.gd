extends PanelContainer

class_name ArmyRosterPanel

const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal army_commander_requested(army_id: String, character_id: String)
signal army_action_requested(army_id: String, action_id: String)
signal army_redeploy_requested(army_id: String, target_region_id: String)

var list_box: VBoxContainer
var detail_label: Label
var detail_box: VBoxContainer
var candidates_box: VBoxContainer
var actions_box: VBoxContainer
var target_regions_box: VBoxContainer
var history_label: Label
var history_box: VBoxContainer
var history_empty_state: PanelContainer
var assign_button: Button
var selected_army_id: String = ""
var selected_candidate_id: String = ""
var selected_target_region_id: String = ""
var current_armies: Array = []
var current_characters: Array = []
var current_history: Array = []
var current_action_rows: Array = []
var current_army_action_history: Array = []
var current_regions: Array = []
var current_redeployment_history: Array = []
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
	left.custom_minimum_size.x = 380
	left.size_flags_vertical = Control.SIZE_EXPAND_FILL
	left.add_theme_constant_override("separation", 8)
	var left_panel: PanelContainer = TianmingUiScript.create_content_panel(left, Vector4(10, 10, 10, 10))
	left_panel.custom_minimum_size.x = 400
	left_panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	root.add_child(left_panel)

	left.add_child(TianmingUiScript.create_panel_header("军队", _make_label("军势、统帅与调防", 13, Color(0.72, 0.64, 0.50))))

	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area()
	left.add_child(scroll)

	list_box = VBoxContainer.new()
	list_box.add_theme_constant_override("separation", 5)
	scroll.add_child(list_box)

	var right: VBoxContainer = VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 8)
	root.add_child(TianmingUiScript.create_content_panel(right, Vector4(10, 10, 10, 10)))

	detail_label = _make_label("选择军队查看详情。", 14, Color(0.86, 0.78, 0.64))
	detail_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail_label.visible = false
	right.add_child(detail_label)

	right.add_child(TianmingUiScript.create_section_title("军队详情"))
	detail_box = VBoxContainer.new()
	detail_box.add_theme_constant_override("separation", 6)
	right.add_child(detail_box)

	right.add_child(TianmingUiScript.create_section_title("候选统帅"))
	var candidate_scroll: ScrollContainer = TianmingUiScript.create_scroll_area(null, Vector2(0, 180))
	right.add_child(candidate_scroll)
	candidates_box = VBoxContainer.new()
	candidates_box.add_theme_constant_override("separation", 5)
	candidate_scroll.add_child(candidates_box)

	assign_button = TianmingUiScript.create_command_button("", 34, true)
	assign_button.text = "任命统帅"
	assign_button.custom_minimum_size.y = 34
	assign_button.pressed.connect(_on_assign_pressed)
	right.add_child(assign_button)

	right.add_child(TianmingUiScript.create_section_title("军务处置"))
	var action_scroll: ScrollContainer = TianmingUiScript.create_scroll_area(null, Vector2(0, 150))
	right.add_child(action_scroll)
	actions_box = VBoxContainer.new()
	actions_box.add_theme_constant_override("separation", 5)
	action_scroll.add_child(actions_box)

	right.add_child(TianmingUiScript.create_section_title("调防目标"))
	var region_scroll: ScrollContainer = TianmingUiScript.create_scroll_area(null, Vector2(0, 150))
	right.add_child(region_scroll)
	target_regions_box = VBoxContainer.new()
	target_regions_box.add_theme_constant_override("separation", 5)
	region_scroll.add_child(target_regions_box)

	right.add_child(TianmingUiScript.create_section_title("军队记录"))
	history_empty_state = TianmingUiScript.create_empty_state("军队记录：无", "muted")
	right.add_child(history_empty_state)
	history_label = _make_label("", 12, Color(0.62, 0.58, 0.50))
	history_label.visible = false
	right.add_child(history_label)
	history_box = VBoxContainer.new()
	history_box.add_theme_constant_override("separation", 8)
	history_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_child(history_box)
	set_data([])

func set_data(armies: Array, characters: Array = [], command_history: Array = [], action_points: int = 0, action_rows: Array = [], army_action_history: Array = [], regions: Array = [], redeployment_history: Array = []) -> void:
	if list_box == null:
		return
	current_armies = armies.duplicate(true)
	current_characters = characters.duplicate(true)
	current_history = command_history.duplicate(true)
	current_action_rows = action_rows.duplicate(true)
	current_army_action_history = army_action_history.duplicate(true)
	current_regions = regions.duplicate(true)
	current_redeployment_history = redeployment_history.duplicate(true)
	current_action_points = action_points
	if selected_army_id.is_empty() or _army_by_id(current_armies, selected_army_id).is_empty():
		selected_army_id = _first_army_id(current_armies)
	if selected_candidate_id.is_empty() or _character_by_id(current_characters, selected_candidate_id).is_empty():
		selected_candidate_id = _first_candidate_id(_commander_candidates(current_characters))
	if selected_target_region_id.is_empty() or _region_by_id(current_regions, selected_target_region_id).is_empty():
		selected_target_region_id = _first_region_id(current_regions)
	_clear_box(list_box)
	for raw in current_armies:
		var army: Dictionary = _dict(raw)
		var army_id: String = str(army.get("id", ""))
		if army_id.is_empty():
			continue
		var button: Button = TianmingUiScript.create_list_row_button("army", 58)
		button.set_meta("tianming_army_row_id", army_id)
		button.text = "%s\n%s  兵员%s  士气%d  统制%d" % [
			str(army.get("name", "")),
			str(army.get("commander", "未定")),
			str(army.get("soldiers_text", _big(_num(army.get("soldiers", 0))))),
			int(_num(army.get("morale", 0))),
			int(_num(army.get("control", army.get("control_level", 0))))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		TianmingUiScript.set_list_row_button_selected(button, army_id == selected_army_id)
		button.pressed.connect(func() -> void:
			selected_army_id = army_id
			set_data(current_armies, current_characters, current_history, current_action_points, current_action_rows, current_army_action_history, current_regions, current_redeployment_history)
		)
		list_box.add_child(button)
	_update_candidates()
	_update_actions()
	_update_target_regions()
	_update_detail()
	if history_label != null:
		history_label.text = "%s\n%s\n%s" % [_history_text(current_history), _army_action_history_text(current_army_action_history), _redeployment_history_text(current_redeployment_history)]
		_refresh_history_surface()
	if assign_button != null:
		assign_button.disabled = selected_army_id.is_empty() or selected_candidate_id.is_empty() or current_action_points <= 0

func visible_text() -> String:
	return "军队\n%s\n%s\n%s\n%s\n%s\n%s" % [
		_army_list_text(current_armies),
		_candidate_list_text(_commander_candidates(current_characters)),
		_action_list_text(current_action_rows),
		_region_list_text(current_regions),
		"" if detail_label == null else detail_label.text,
		"" if history_label == null else history_label.text
	]

func _refresh_history_surface() -> void:
	if history_label == null:
		return
	_clear_box(history_box)
	var is_empty: bool = current_history.is_empty() and current_army_action_history.is_empty() and current_redeployment_history.is_empty()
	history_label.visible = false
	if history_box != null:
		history_box.visible = not is_empty
	if history_empty_state != null:
		history_empty_state.visible = is_empty
	if is_empty:
		return
	for raw in current_history:
		_add_commander_history_row(_dict(raw))
	for raw in current_army_action_history:
		_add_army_action_history_row(_dict(raw))
	for raw in current_redeployment_history:
		_add_redeployment_history_row(_dict(raw))

func _add_commander_history_row(record: Dictionary) -> void:
	var box: VBoxContainer = _add_history_card()
	box.add_child(TianmingUiScript.create_log_strip("统帅", _commander_history_heading(record), "gold"))
	box.add_child(TianmingUiScript.create_log_strip("变更", _commander_change_text(record), "jade"))

func _add_army_action_history_row(record: Dictionary) -> void:
	var box: VBoxContainer = _add_history_card()
	box.add_child(TianmingUiScript.create_log_strip("军务", _army_action_history_heading(record), "gold"))
	var detail: String = _army_action_history_detail(record)
	if not detail.is_empty():
		box.add_child(TianmingUiScript.create_log_strip("目标", detail, "neutral"))

func _add_redeployment_history_row(record: Dictionary) -> void:
	var box: VBoxContainer = _add_history_card()
	box.add_child(TianmingUiScript.create_log_strip("调防", _redeployment_history_heading(record), "gold"))
	box.add_child(TianmingUiScript.create_log_strip("路线", _redeployment_route_text(record), "neutral"))

func _add_history_card() -> VBoxContainer:
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	history_box.add_child(TianmingUiScript.create_content_panel(box, Vector4(8, 7, 8, 7)))
	return box

func select_army(army_id: String) -> void:
	if _army_by_id(current_armies, army_id).is_empty():
		return
	selected_army_id = army_id
	set_data(current_armies, current_characters, current_history, current_action_points, current_action_rows, current_army_action_history, current_regions, current_redeployment_history)

func select_commander_candidate(character_id: String) -> void:
	if _character_by_id(current_characters, character_id).is_empty():
		return
	selected_candidate_id = character_id
	set_data(current_armies, current_characters, current_history, current_action_points, current_action_rows, current_army_action_history, current_regions, current_redeployment_history)

func select_target_region(region_id: String) -> void:
	if _region_by_id(current_regions, region_id).is_empty():
		return
	selected_target_region_id = region_id
	set_data(current_armies, current_characters, current_history, current_action_points, current_action_rows, current_army_action_history, current_regions, current_redeployment_history)

func _update_detail() -> void:
	if detail_label == null:
		return
	_clear_box(detail_box)
	var army: Dictionary = _army_by_id(current_armies, selected_army_id)
	if army.is_empty():
		detail_label.text = "暂无军队数据。"
		if detail_box != null:
			detail_box.add_child(TianmingUiScript.create_empty_state("暂无军队数据。", "muted"))
		return
	var soldiers_text: String = str(army.get("soldiers_text", _big(_num(army.get("soldiers", 0)))))
	var commander_text: String = _commander_text(army)
	var garrison_text: String = _fallback_text(army.get("garrison", army.get("location", "")), "未定")
	var army_type_text: String = _fallback_text(army.get("army_type", ""), "未详")
	var quality_text: String = _fallback_text(army.get("quality", ""), "未详")
	var composition_text: String = _fallback_text(army.get("composition_text", ""), "未详")
	var salary_text: String = _fallback_text(army.get("salary_text", ""), "未详")
	var equipment_text: String = _fallback_text(army.get("equipment_text", ""), "未详")
	var activity_text: String = _fallback_text(army.get("activity", ""), "待命")
	var description_text: String = _fallback_text(army.get("description", ""), "暂无军情说明")
	detail_label.text = "%s\n兵员：%s\n统帅：%s\n驻地：%s\n类型：%s / %s\n士气：%d  训练：%d  忠诚：%d  统制：%d\n欠饷：%d 月  哗变风险：%d\n活动：%s\n兵种：%s\n军饷：%s\n装备：%s\n%s" % [
		str(army.get("name", "")),
		soldiers_text,
		commander_text,
		garrison_text,
		army_type_text,
		quality_text,
		int(_num(army.get("morale", 0))),
		int(_num(army.get("training", 0))),
		int(_num(army.get("loyalty", 0))),
		int(_num(army.get("control", army.get("control_level", 0)))),
		int(_num(army.get("pay_arrears_months", 0))),
		int(_num(army.get("mutiny_risk", 0))),
		activity_text,
		composition_text,
		salary_text,
		equipment_text,
		description_text
	]
	if detail_box == null:
		return
	detail_box.add_child(TianmingUiScript.create_log_strip("军队", "%s · %s / %s" % [
		str(army.get("name", "")),
		army_type_text,
		quality_text
	], "gold"))
	detail_box.add_child(TianmingUiScript.create_log_strip("统帅", commander_text, "jade" if commander_text != "未定" else "muted"))
	detail_box.add_child(TianmingUiScript.create_log_strip("兵员", "%s · 驻地 %s" % [
		soldiers_text,
		garrison_text
	], "neutral"))
	detail_box.add_child(TianmingUiScript.create_log_strip("战备", "士气%d · 训练%d · 忠诚%d · 统制%d" % [
		int(_num(army.get("morale", 0))),
		int(_num(army.get("training", 0))),
		int(_num(army.get("loyalty", 0))),
		int(_num(army.get("control", army.get("control_level", 0))))
	], "jade"))
	detail_box.add_child(TianmingUiScript.create_log_strip("军纪", "欠饷%d月 · 哗变风险%d" % [
		int(_num(army.get("pay_arrears_months", 0))),
		int(_num(army.get("mutiny_risk", 0)))
	], "gold" if int(_num(army.get("pay_arrears_months", 0))) > 0 or int(_num(army.get("mutiny_risk", 0))) > 0 else "neutral"))
	detail_box.add_child(TianmingUiScript.create_log_strip("编制", "%s · %s" % [
		composition_text,
		salary_text
	], "neutral"))
	detail_box.add_child(TianmingUiScript.create_log_strip("装备", equipment_text, "neutral"))
	detail_box.add_child(TianmingUiScript.create_log_strip("活动", "%s · %s" % [
		activity_text,
		description_text
	], "muted"))

func _update_candidates() -> void:
	_clear_box(candidates_box)
	var shown_candidates: int = 0
	for raw in _commander_candidates(current_characters):
		var character: Dictionary = _dict(raw)
		var character_id: String = str(character.get("id", ""))
		if character_id.is_empty():
			continue
		shown_candidates += 1
		var button: Button = TianmingUiScript.create_list_row_button("army_commander_candidate", 58)
		button.set_meta("tianming_army_commander_candidate_id", character_id)
		button.text = "%s  武%d  勇%d  忠%d\n%s" % [
			str(character.get("name", "")),
			int(_num(character.get("military", 0))),
			int(_num(character.get("valor", 0))),
			int(_num(character.get("loyalty", 0))),
			str(character.get("official_title", character.get("title", "")))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		TianmingUiScript.set_list_row_button_selected(button, character_id == selected_candidate_id)
		button.pressed.connect(func() -> void:
			selected_candidate_id = character_id
			set_data(current_armies, current_characters, current_history, current_action_points, current_action_rows, current_army_action_history, current_regions, current_redeployment_history)
		)
		candidates_box.add_child(button)
	if shown_candidates == 0:
		candidates_box.add_child(TianmingUiScript.create_empty_state("暂无候选统帅。", "muted"))

func _update_actions() -> void:
	_clear_box(actions_box)
	var shown_actions: int = 0
	for raw in current_action_rows:
		var action: Dictionary = _dict(raw)
		var action_id: String = str(action.get("id", ""))
		if action_id.is_empty():
			continue
		shown_actions += 1
		var button: Button = TianmingUiScript.create_command_button("", 48)
		button.text = "%s  / %s  行动点%d\n%s" % [
			str(action.get("name", action_id)),
			str(action.get("category", "")),
			int(_num(action.get("cost", 1))),
			str(action.get("desc", ""))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.disabled = selected_army_id.is_empty() or current_action_points < int(_num(action.get("cost", 1)))
		button.pressed.connect(func() -> void:
			emit_signal("army_action_requested", selected_army_id, action_id)
		)
		actions_box.add_child(button)
	if shown_actions == 0:
		actions_box.add_child(TianmingUiScript.create_empty_state("暂无军务处置。", "muted"))

func _update_target_regions() -> void:
	_clear_box(target_regions_box)
	var shown_regions: int = 0
	for raw in current_regions:
		var region: Dictionary = _dict(raw)
		var region_id: String = str(region.get("id", ""))
		if region_id.is_empty():
			continue
		shown_regions += 1
		var button: Button = TianmingUiScript.create_list_row_button("army_target_region", 58)
		button.set_meta("tianming_army_target_region_id", region_id)
		button.text = "调防至 %s\n兵力 %s / 兵压 %d / 控制 %s" % [
			str(region.get("name", region_id)),
			_big(_num(region.get("troops", 0))),
			int(_num(region.get("army_pressure", 0))),
			str(region.get("controller", region.get("controller_id", "")))
		]
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		TianmingUiScript.set_list_row_button_selected(button, region_id == selected_target_region_id)
		button.disabled = selected_army_id.is_empty() or current_action_points <= 0
		button.pressed.connect(func() -> void:
			selected_target_region_id = region_id
			_refresh_target_region_selected_rows()
			emit_signal("army_redeploy_requested", selected_army_id, region_id)
		)
		target_regions_box.add_child(button)
	if shown_regions == 0:
		target_regions_box.add_child(TianmingUiScript.create_empty_state("暂无调防目标。", "muted"))

func _refresh_target_region_selected_rows() -> void:
	if target_regions_box == null:
		return
	for child in target_regions_box.get_children():
		if child is Button \
			and bool(child.get_meta("tianming_list_row_button", false)) \
			and str(child.get_meta("tianming_list_row_button_kind", "")) == "army_target_region":
			TianmingUiScript.set_list_row_button_selected(child as Button, str(child.get_meta("tianming_army_target_region_id", "")) == selected_target_region_id)

func _on_assign_pressed() -> void:
	emit_signal("army_commander_requested", selected_army_id, selected_candidate_id)

func _army_list_text(armies: Array) -> String:
	var lines: PackedStringArray = PackedStringArray()
	for raw in armies:
		var army: Dictionary = _dict(raw)
		lines.append("%s %s %s %s" % [
			str(army.get("name", "")),
			str(army.get("commander", "")),
			str(army.get("soldiers_text", "")),
			str(army.get("equipment_text", ""))
		])
	return "\n".join(lines)

func _commander_text(army: Dictionary) -> String:
	var commander: String = str(army.get("commander", ""))
	var title: String = str(army.get("commander_title", ""))
	if commander.is_empty():
		commander = "未定"
	if title.is_empty() or title == commander:
		return commander
	return "%s（%s）" % [commander, title]

func _commander_candidates(characters: Array) -> Array:
	var rows: Array = []
	for raw in characters:
		var character: Dictionary = _dict(raw)
		if str(character.get("id", "")).is_empty():
			continue
		if not _is_ming_character(character):
			continue
		if _num(character.get("military", 0)) <= 0.0 and _num(character.get("valor", 0)) <= 0.0:
			continue
		rows.append(character)
	rows.sort_custom(Callable(self, "_candidate_before"))
	return rows

func _candidate_before(left_value: Variant, right_value: Variant) -> bool:
	var left: Dictionary = _dict(left_value)
	var right: Dictionary = _dict(right_value)
	return _candidate_score(left) > _candidate_score(right)

func _candidate_score(character: Dictionary) -> float:
	return _num(character.get("military", 0)) * 1.3 + _num(character.get("valor", 0)) + _num(character.get("loyalty", 0)) * 0.25

func _is_ming_character(character: Dictionary) -> bool:
	var faction: String = str(character.get("faction", "")).to_lower()
	return faction.contains("明") or faction.contains("ming")

func _candidate_list_text(candidates: Array) -> String:
	var lines: PackedStringArray = PackedStringArray()
	for raw in candidates:
		var character: Dictionary = _dict(raw)
		lines.append("%s %s" % [
			str(character.get("name", "")),
			str(character.get("official_title", character.get("title", "")))
		])
	return "\n".join(lines)

func _action_list_text(actions: Array) -> String:
	var lines: PackedStringArray = PackedStringArray()
	for raw in actions:
		var action: Dictionary = _dict(raw)
		lines.append("%s %s %s" % [
			str(action.get("name", "")),
			str(action.get("category", "")),
			str(action.get("desc", ""))
		])
	return "\n".join(lines)

func _region_list_text(regions: Array) -> String:
	var lines: PackedStringArray = PackedStringArray()
	for raw in regions:
		var region: Dictionary = _dict(raw)
		lines.append("%s %s %s" % [
			str(region.get("name", "")),
			str(region.get("controller", region.get("controller_id", ""))),
			_big(_num(region.get("troops", 0)))
		])
	return "\n".join(lines)

func _history_text(history: Array) -> String:
	if history.is_empty():
		return "近期统帅更易：无"
	var lines: PackedStringArray = PackedStringArray()
	for raw in history:
		var record: Dictionary = _dict(raw)
		lines.append("%s / %s" % [
			_commander_history_heading(record),
			_commander_change_text(record)
		])
	return "近期统帅更易：%s" % "；".join(lines)

func _commander_history_heading(record: Dictionary) -> String:
	return "T%d %s" % [
		int(_num(record.get("turn", 0))),
		str(record.get("army", ""))
	]

func _commander_change_text(record: Dictionary) -> String:
	return "%s → %s" % [
		str(record.get("old_commander", "未定")),
		str(record.get("commander", ""))
	]

func _army_action_history_text(history: Array) -> String:
	if history.is_empty():
		return "近期军务处置：无"
	var lines: PackedStringArray = PackedStringArray()
	for raw in history:
		var record: Dictionary = _dict(raw)
		var detail: String = _army_action_history_detail(record)
		if detail.is_empty():
			lines.append(_army_action_history_heading(record))
			continue
		lines.append("%s / %s" % [
			_army_action_history_heading(record),
			detail
		])
	return "近期军务处置：%s" % "；".join(lines)

func _army_action_history_heading(record: Dictionary) -> String:
	return "T%d %s / %s" % [
		int(_num(record.get("turn", 0))),
		str(record.get("army", "")),
		str(record.get("name", ""))
	]

func _army_action_history_detail(record: Dictionary) -> String:
	var detail: String = str(record.get("target_region", ""))
	var control: Dictionary = _dict(record.get("region_control", {}))
	if not control.is_empty() and bool(control.get("ok", false)):
		var transfer_text: String = "%s → %s" % [
			str(control.get("before_controller", control.get("before_controller_id", ""))),
			str(control.get("after_controller", control.get("after_controller_id", "")))
		]
		detail = "%s / %s" % [detail, transfer_text] if not detail.is_empty() else transfer_text
	return detail

func _redeployment_history_text(history: Array) -> String:
	if history.is_empty():
		return "近期军队调防：无"
	var lines: PackedStringArray = PackedStringArray()
	for raw in history:
		var record: Dictionary = _dict(raw)
		lines.append("%s：%s" % [
			_redeployment_history_heading(record),
			_redeployment_route_text(record)
		])
	return "近期军队调防：%s" % "；".join(lines)

func _redeployment_history_heading(record: Dictionary) -> String:
	return "T%d %s / %s" % [
		int(_num(record.get("turn", 0))),
		str(record.get("army", "")),
		str(record.get("name", ""))
	]

func _redeployment_route_text(record: Dictionary) -> String:
	return "%s → %s" % [
		str(record.get("source_region", "")),
		str(record.get("target_region", ""))
	]

func _first_candidate_id(candidates: Array) -> String:
	for raw in candidates:
		var character: Dictionary = _dict(raw)
		var id: String = str(character.get("id", ""))
		if not id.is_empty():
			return id
	return ""

func _first_army_id(armies: Array) -> String:
	for raw in armies:
		var army: Dictionary = _dict(raw)
		var id: String = str(army.get("id", ""))
		if not id.is_empty():
			return id
	return ""

func _first_region_id(regions: Array) -> String:
	for raw in regions:
		var region: Dictionary = _dict(raw)
		var id: String = str(region.get("id", ""))
		if not id.is_empty():
			return id
	return ""

func _army_by_id(armies: Array, army_id: String) -> Dictionary:
	for raw in armies:
		var army: Dictionary = _dict(raw)
		if str(army.get("id", "")) == army_id:
			return army
	return {}

func _character_by_id(characters: Array, character_id: String) -> Dictionary:
	for raw in characters:
		var character: Dictionary = _dict(raw)
		if str(character.get("id", "")) == character_id:
			return character
	return {}

func _region_by_id(regions: Array, region_id: String) -> Dictionary:
	for raw in regions:
		var region: Dictionary = _dict(raw)
		if str(region.get("id", "")) == region_id or str(region.get("name", "")) == region_id:
			return region
	return {}

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

func _big(value: float) -> String:
	if absf(value) >= 10000.0:
		return "%.1f万" % (value / 10000.0)
	return "%d" % roundi(value)

func _fallback_text(value: Variant, fallback: String) -> String:
	var text: String = str(value)
	if text.strip_edges().is_empty():
		return fallback
	return text

func _num(value: Variant) -> float:
	if typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT:
		return float(value)
	return str(value).to_float()

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}
