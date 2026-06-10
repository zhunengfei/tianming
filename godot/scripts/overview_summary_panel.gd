extends VBoxContainer

class_name OverviewSummaryPanel

const ScenarioLoaderScript := preload("res://scripts/scenario_loader.gd")
const TianmingUiScript := preload("res://scripts/tianming_ui.gd")

signal advance_month_requested

var runtime_date_label: Label
var runtime_treasury_label: Label
var runtime_neitang_label: Label
var runtime_authority_label: Label
var runtime_population_label: Label
var runtime_report_label: Label
var live_summary_value_labels: Dictionary = {}
var overview_summary_row_count: int = 0
var summary_metric_labels: Dictionary = {}
var summary_metric_order: Array = []
var body_box: VBoxContainer

func _ready() -> void:
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_theme_constant_override("separation", 6)

func set_summary(summary: Dictionary) -> void:
	_clear_children()
	live_summary_value_labels.clear()
	summary_metric_labels.clear()
	summary_metric_order.clear()
	overview_summary_row_count = 0
	add_child(TianmingUiScript.create_panel_header("概览", _make_header_subtitle("运行态总览与国计民情")))
	body_box = VBoxContainer.new()
	body_box.add_theme_constant_override("separation", 6)
	body_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var scroll: ScrollContainer = TianmingUiScript.create_scroll_area(body_box)
	add_child(scroll)
	_add_runtime_bar()
	_add_separator()
	_add_content_child(TianmingUiScript.create_section_title("剧本规模"))
	_add_row("人物", "%d 人" % int(_num(summary.get("characters", 0))))
	_add_row("势力", "%d 个" % int(_num(summary.get("factions", 0))))
	_add_row("党派 / 阶层", "%d / %d" % [int(_num(summary.get("parties", 0))), int(_num(summary.get("classes", 0)))])
	_add_row("变量", "%d 项" % int(_num(summary.get("variables", 0))))
	_add_row("事件", "%d 件" % int(_num(summary.get("events", 0))))
	_add_row("地图地块", "%d 块" % int(_num(summary.get("map_regions", 0))))
	_add_separator()
	_add_content_child(TianmingUiScript.create_section_title("府库民生"))
	_add_row("国库银", ScenarioLoaderScript.fmt_big(_num(summary.get("guoku_money", 0)), "两"))
	_add_row("国库粮", ScenarioLoaderScript.fmt_big(_num(summary.get("guoku_grain", 0)), "石"))
	_add_row("国库月收支", "%s / %s" % [
		ScenarioLoaderScript.fmt_big(_num(summary.get("guoku_income_money", 0)) - _num(summary.get("guoku_expense_money", 0)), "两"),
		ScenarioLoaderScript.fmt_big(_num(summary.get("guoku_income_grain", 0)) - _num(summary.get("guoku_expense_grain", 0)), "石")
	])
	_add_row("内帑银", ScenarioLoaderScript.fmt_big(_num(summary.get("neitang_money", 0)), "两"))
	_add_row("在籍人口", ScenarioLoaderScript.fmt_big(_num(summary.get("population_registered", 0)), "口"))
	_add_row("隐匿人口", ScenarioLoaderScript.fmt_big(_num(summary.get("population_hidden", 0)), "口"))
	_add_separator()
	_add_content_child(TianmingUiScript.create_section_title("皇权民意"))
	_add_row("皇权", "%d" % roundi(_num(summary.get("huangquan", 0))))
	_add_row("皇威", "%d" % roundi(_num(summary.get("huangwei", 0))))
	_add_row("民心", "%d" % roundi(_num(summary.get("minxin", 0))))
	_add_separator()

func set_runtime_snapshot(snapshot: Dictionary) -> void:
	if runtime_date_label != null:
		runtime_date_label.text = str(snapshot.get("date_text", ""))
	if runtime_treasury_label != null:
		runtime_treasury_label.text = str(snapshot.get("treasury_text", ""))
	if runtime_neitang_label != null:
		runtime_neitang_label.text = str(snapshot.get("neitang_text", ""))
	if runtime_authority_label != null:
		runtime_authority_label.text = str(snapshot.get("authority_text", ""))
	if runtime_population_label != null:
		runtime_population_label.text = str(snapshot.get("population_text", ""))
	if runtime_report_label != null:
		runtime_report_label.text = str(snapshot.get("report_text", ""))
	var metrics: Dictionary = _dict(snapshot.get("metrics", {}))
	for raw_key in live_summary_value_labels.keys():
		var metric_key: String = str(raw_key)
		var label: Label = live_summary_value_labels.get(metric_key, null) as Label
		if label != null and metrics.has(metric_key):
			label.text = str(metrics.get(metric_key, ""))

func visible_text() -> String:
	var lines: PackedStringArray = PackedStringArray()
	lines.append("概览")
	for label in [runtime_date_label, runtime_treasury_label, runtime_neitang_label, runtime_authority_label, runtime_population_label, runtime_report_label]:
		if label != null and not str(label.text).is_empty():
			lines.append(str(label.text))
	for raw_key in summary_metric_order:
		var key: String = str(raw_key)
		var label_text: String = str(summary_metric_labels.get(key, key))
		var value_label: Label = live_summary_value_labels.get(key, null) as Label
		if value_label != null:
			lines.append("%s：%s" % [label_text, value_label.text])
	return "\n".join(lines)

func _add_runtime_bar() -> void:
	var stack: VBoxContainer = VBoxContainer.new()
	stack.add_theme_constant_override("separation", 6)
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_add_content_child(TianmingUiScript.create_content_panel(stack, Vector4(12, 8, 12, 8)))
	var bar: HBoxContainer = HBoxContainer.new()
	bar.add_theme_constant_override("separation", 10)
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.add_child(bar)
	runtime_date_label = _add_runtime_chip(bar, 180, "gold")
	runtime_treasury_label = _add_runtime_chip(bar, 190, "jade")
	runtime_neitang_label = _add_runtime_chip(bar, 120, "gold")
	runtime_authority_label = _add_runtime_chip(bar, 160, "red")
	runtime_population_label = _add_runtime_chip(bar, 210, "neutral")
	var spacer: Control = Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.add_child(spacer)
	var next_button: Button = TianmingUiScript.create_command_button("下一月", 30, true)
	next_button.custom_minimum_size.x = 88
	next_button.pressed.connect(func() -> void:
		emit_signal("advance_month_requested")
	)
	bar.add_child(next_button)
	var report_chip: PanelContainer = TianmingUiScript.create_status_chip("", "muted")
	report_chip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.add_child(report_chip)
	runtime_report_label = report_chip.find_child("StatusChipLabel", true, false) as Label
	if runtime_report_label != null:
		runtime_report_label.autowrap_mode = TextServer.AUTOWRAP_OFF
		runtime_report_label.clip_text = true
		runtime_report_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS

func _add_separator() -> void:
	_add_content_child(TianmingUiScript.create_separator())

func _add_row(label_text: String, value_text: String) -> void:
	var metric_row_number: int = overview_summary_row_count + 1
	var row: PanelContainer = TianmingUiScript.create_metric_row(label_text, value_text, _metric_tone_for_row(metric_row_number))
	var value: Label = row.find_child("MetricRowValue", true, false) as Label
	_add_content_child(row)
	overview_summary_row_count += 1
	var metric_key: String = _summary_metric_key_for_row(overview_summary_row_count)
	if not metric_key.is_empty() and value != null:
		live_summary_value_labels[metric_key] = value
		summary_metric_labels[metric_key] = label_text
		summary_metric_order.append(metric_key)

func _metric_tone_for_row(row_number: int) -> String:
	if row_number <= 6:
		return "jade"
	if row_number >= 7 and row_number <= 10:
		return "gold"
	if row_number >= 13:
		return "red"
	return "neutral"

func _summary_metric_key_for_row(row_number: int) -> String:
	match row_number:
		1:
			return "characters_count"
		2:
			return "factions_count"
		3:
			return "party_class_count"
		4:
			return "variables_count"
		5:
			return "events_count"
		6:
			return "map_regions_count"
		7:
			return "guoku_money"
		8:
			return "guoku_grain"
		10:
			return "neitang_money"
		11:
			return "population_registered"
		12:
			return "population_hidden"
		13:
			return "huangquan"
		14:
			return "huangwei"
		15:
			return "minxin"
	return ""

func _add_runtime_chip(parent: HBoxContainer, width: float, tone: String) -> Label:
	var chip: PanelContainer = TianmingUiScript.create_status_chip("", tone)
	chip.custom_minimum_size.x = width
	parent.add_child(chip)
	var label: Label = chip.find_child("StatusChipLabel", true, false) as Label
	if label != null:
		label.autowrap_mode = TextServer.AUTOWRAP_OFF
		label.clip_text = true
		label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	return label

func _make_runtime_label(width: float) -> Label:
	var label: Label = Label.new()
	label.custom_minimum_size.x = width
	label.clip_text = true
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	label.add_theme_font_size_override("font_size", 13)
	return label

func _make_header_subtitle(text: String) -> Label:
	var label: Label = Label.new()
	label.text = text
	return label

func _clear_children() -> void:
	for child in get_children():
		child.queue_free()
	body_box = null

func _add_content_child(child: Control) -> void:
	if body_box != null:
		body_box.add_child(child)
	else:
		add_child(child)

func _dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}

func _num(value: Variant) -> float:
	if typeof(value) == TYPE_INT or typeof(value) == TYPE_FLOAT:
		return float(value)
	return str(value).to_float()
