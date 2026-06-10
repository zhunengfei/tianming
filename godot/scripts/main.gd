extends Control

const RuntimeBootstrapScript := preload("res://scripts/runtime_bootstrap.gd")
const RuntimeTabHostScript := preload("res://scripts/runtime_tab_host.gd")
const RuntimePanelPresenterScript := preload("res://scripts/runtime_panel_presenter.gd")
const RuntimeCommandControllerScript := preload("res://scripts/runtime_command_controller.gd")
const OverviewSummaryPanelScript := preload("res://scripts/overview_summary_panel.gd")
const TianmingThemeScript := preload("res://scripts/tianming_theme.gd")

@onready var status_label: Label = %StatusLabel
@onready var vbox: VBoxContainer = $Panel/Margin/VBox

var world_map_panel: Control
var game_state: RefCounted
var character_browser_panel: Control
var faction_browser_panel: Control
var monthly_report_panel: Control
var chronicle_panel: Control
var communication_panel: Control
var audience_panel: Control
var region_governance_panel: Control
var statecraft_panel: Control
var event_queue_panel: Control
var court_action_panel: Control
var appointment_panel: Control
var edict_panel: Control
var military_order_panel: Control
var army_roster_panel: Control
var diplomacy_panel: Control
var court_meeting_panel: Control
var gameplay_hub_panel: Control
var relationship_panel: Control
var save_slot_panel: Control
var system_panel: Control
var primary_tabs: TabContainer
var overview_summary_panel: Control
var save_manager: RefCounted
var settings_manager: RefCounted
var runtime_shell: RefCounted
var runtime_bootstrap: RefCounted
var runtime_tab_host: RefCounted
var runtime_panel_presenter: RefCounted
var runtime_command_controller: RefCounted
var quick_save_slot_id: String = "quick"
var selected_scenario_path: String = ""

func _ready() -> void:
	theme = TianmingThemeScript.build()
	var startup_options: Dictionary = {}
	if not selected_scenario_path.is_empty():
		startup_options["scenario_path"] = selected_scenario_path
	_bootstrap_runtime(startup_options)

func _bootstrap_runtime(startup_options: Dictionary = {}) -> Dictionary:
	runtime_bootstrap = RuntimeBootstrapScript.new()
	var startup_result: Dictionary = runtime_bootstrap.call("start", startup_options)
	if not bool(startup_result.get("ok", false)):
		status_label.text = "Godot runtime ready\n%s" % str(startup_result.get("error", "runtime bootstrap failed"))
		push_warning(status_label.text)
		return startup_result

	game_state = startup_result.get("game_state") as RefCounted
	save_manager = startup_result.get("save_manager") as RefCounted
	settings_manager = startup_result.get("settings_manager") as RefCounted
	runtime_shell = startup_result.get("runtime_shell") as RefCounted
	game_state.connect("state_changed", Callable(self, "_refresh_active_runtime_panels"))

	var summary: Dictionary = _safe_dict(startup_result.get("summary", {}))
	status_label.text = str(startup_result.get("status_text", "Godot runtime ready"))
	for raw_log in _safe_array(startup_result.get("log_messages", [])):
		print(str(raw_log))

	_add_overview_summary(summary)
	_add_data_tabs()
	_refresh_active_runtime_panels()
	return startup_result

func _restart_runtime_for_scenario(scenario_path: String) -> Dictionary:
	_clear_runtime_ui()
	selected_scenario_path = scenario_path
	return _bootstrap_runtime({"scenario_path": scenario_path})

func _clear_runtime_ui() -> void:
	for child in vbox.get_children():
		vbox.remove_child(child)
		child.queue_free()
	world_map_panel = null
	character_browser_panel = null
	faction_browser_panel = null
	monthly_report_panel = null
	chronicle_panel = null
	communication_panel = null
	audience_panel = null
	region_governance_panel = null
	statecraft_panel = null
	event_queue_panel = null
	court_action_panel = null
	appointment_panel = null
	edict_panel = null
	military_order_panel = null
	army_roster_panel = null
	diplomacy_panel = null
	court_meeting_panel = null
	gameplay_hub_panel = null
	relationship_panel = null
	save_slot_panel = null
	system_panel = null
	primary_tabs = null
	overview_summary_panel = null
	runtime_tab_host = null
	runtime_panel_presenter = null

func _add_overview_summary(summary: Dictionary) -> void:
	overview_summary_panel = OverviewSummaryPanelScript.new()
	overview_summary_panel.name = "概览"
	overview_summary_panel.connect("advance_month_requested", Callable(self, "_on_advance_month_pressed"))
	vbox.add_child(overview_summary_panel)
	overview_summary_panel.call("set_summary", summary)

func _runtime_panel_payloads(panel_keys: Array = []) -> Dictionary:
	if game_state == null or not game_state.has_method("runtime_panel_payloads"):
		return {}
	return _safe_dict(game_state.call("runtime_panel_payloads", _has_quick_save(), panel_keys))

func _run_player_command(command_type: String, args: Dictionary, failure_label: String) -> Dictionary:
	var result: Dictionary = _command_controller().call("run_player_command", game_state, command_type, args, failure_label)
	_process_command_result(result)
	return result

func _run_shell_command(command_type: String, args: Dictionary, failure_label: String) -> Dictionary:
	var result: Dictionary = _command_controller().call("run_shell_command", runtime_shell, game_state, command_type, args, failure_label)
	_process_command_result(result)
	return result

func _command_controller() -> RefCounted:
	if runtime_command_controller == null:
		runtime_command_controller = RuntimeCommandControllerScript.new()
	return runtime_command_controller

func _process_command_result(result: Dictionary) -> void:
	var warning_message: String = str(result.get("warning_message", ""))
	if not warning_message.is_empty():
		push_warning(warning_message)
	for raw_log in _safe_array(result.get("log_messages", [])):
		print(str(raw_log))
	if bool(result.get("should_refresh", false)):
		var refresh_keys: Array = _safe_array(result.get("refresh_panel_keys", []))
		if refresh_keys.is_empty():
			_refresh_active_runtime_panels()
		else:
			_refresh_runtime_bar(refresh_keys)

func _refresh_runtime_bar(panel_keys: Array = []) -> void:
	if game_state == null:
		return
	if runtime_panel_presenter == null:
		runtime_panel_presenter = RuntimePanelPresenterScript.new()
	var refresh_keys: Array = panel_keys
	if refresh_keys.is_empty():
		refresh_keys = _all_refresh_panel_keys()
	var result: Dictionary = runtime_panel_presenter.call("refresh", _runtime_panels(), _runtime_panel_payloads(refresh_keys), _shell_panel_payloads(), refresh_keys)
	if not bool(result.get("ok", false)):
		push_warning("runtime panel refresh failed: %s" % str(result.get("error", "")))

func _refresh_active_runtime_panels() -> void:
	_refresh_runtime_bar(_active_refresh_panel_keys())

func _active_refresh_panel_keys() -> Array:
	var keys: Array = ["overview_summary_panel"]
	_append_background_refresh_panel_keys(keys)
	if primary_tabs == null:
		return keys
	var index: int = primary_tabs.current_tab
	if index < 0 or index >= primary_tabs.get_child_count():
		return keys
	var active_panel: Node = primary_tabs.get_child(index)
	var runtime_panels: Dictionary = _runtime_panels()
	for panel_key in runtime_panels.keys():
		if runtime_panels.get(panel_key) == active_panel and not panel_key in keys:
			keys.append(panel_key)
	return keys

func _append_background_refresh_panel_keys(keys: Array) -> void:
	var runtime_panels: Dictionary = _runtime_panels()
	for panel_key in ["character_browser_panel", "monthly_report_panel"]:
		if runtime_panels.get(panel_key) != null and not panel_key in keys:
			keys.append(panel_key)

func _all_refresh_panel_keys() -> Array:
	return _runtime_panels().keys()

func _runtime_panels() -> Dictionary:
	return {
		"overview_summary_panel": overview_summary_panel,
		"world_map_panel": world_map_panel,
		"faction_browser_panel": faction_browser_panel,
		"character_browser_panel": character_browser_panel,
		"monthly_report_panel": monthly_report_panel,
		"chronicle_panel": chronicle_panel,
		"communication_panel": communication_panel,
		"audience_panel": audience_panel,
		"region_governance_panel": region_governance_panel,
		"statecraft_panel": statecraft_panel,
		"event_queue_panel": event_queue_panel,
		"court_action_panel": court_action_panel,
		"appointment_panel": appointment_panel,
		"edict_panel": edict_panel,
		"military_order_panel": military_order_panel,
		"army_roster_panel": army_roster_panel,
		"diplomacy_panel": diplomacy_panel,
		"court_meeting_panel": court_meeting_panel,
		"gameplay_hub_panel": gameplay_hub_panel,
		"relationship_panel": relationship_panel,
		"save_slot_panel": save_slot_panel,
		"system_panel": system_panel
	}

func _on_advance_month_pressed() -> void:
	_run_player_command("advance_month", {}, "advance month")

func _on_quick_save_requested() -> void:
	var result: Dictionary = _run_shell_command("quick_save", {"slot_id": quick_save_slot_id}, "quick save")
	if not result.get("ok", false):
		return
	if system_panel != null:
		system_panel.call("set_status", str(result.get("status_message", "")))
	_refresh_active_runtime_panels()

func _on_quick_load_requested() -> void:
	var result: Dictionary = continue_from_quick_save()
	if not result.get("ok", false):
		push_warning("quick load failed: %s" % str(result.get("error", "")))
		return
	if system_panel != null:
		system_panel.call("set_status", str(result.get("status_message", "")))

func continue_from_quick_save() -> Dictionary:
	if game_state == null or runtime_shell == null:
		return {
			"ok": false,
			"error": "game state or runtime shell is not ready"
		}
	var result: Dictionary = _load_slot_runtime(quick_save_slot_id, "quick_load", "quick load")
	if not result.get("ok", false):
		return result
	_refresh_active_runtime_panels()
	return {
		"ok": true,
		"metadata": _safe_dict(result.get("metadata", {})),
		"status_message": str(result.get("status_message", ""))
	}

func _on_save_slot_requested(slot_id: String) -> void:
	var result: Dictionary = _run_shell_command("save_slot", {"slot_id": slot_id}, "save slot")
	if not result.get("ok", false):
		if save_slot_panel != null:
			save_slot_panel.call("set_status", "保存失败：%s" % str(result.get("error", "")))
		return
	if save_slot_panel != null:
		save_slot_panel.call("set_status", str(result.get("status_message", "")))
		_refresh_active_runtime_panels()

func _on_load_slot_requested(slot_id: String) -> void:
	var result: Dictionary = _load_slot_runtime(slot_id, "load_slot", "load slot")
	if not result.get("ok", false):
		if save_slot_panel != null:
			save_slot_panel.call("set_status", "读取失败：%s" % str(result.get("error", "")))
		return
	if save_slot_panel != null:
		save_slot_panel.call("set_status", str(result.get("status_message", "")))
	_refresh_active_runtime_panels()

func _load_slot_runtime(slot_id: String, shell_command: String, failure_label: String) -> Dictionary:
	var metadata: Dictionary = _slot_metadata(slot_id)
	var scenario_path: String = str(metadata.get("scenario_path", ""))
	var current_path: String = str(game_state.get("scenario_path")) if game_state != null else ""
	if not scenario_path.is_empty() and scenario_path != current_path and bool(metadata.get("compatible", true)):
		var restart_result: Dictionary = _restart_runtime_for_scenario(scenario_path)
		if not bool(restart_result.get("ok", false)):
			return restart_result
	return _run_shell_command(shell_command, {"slot_id": slot_id}, failure_label)

func _slot_metadata(slot_id: String) -> Dictionary:
	if save_manager == null or not save_manager.has_method("slot_metadata"):
		return {}
	return _safe_dict(save_manager.call("slot_metadata", slot_id))

func _on_delete_slot_requested(slot_id: String) -> void:
	var result: Dictionary = _run_shell_command("delete_slot", {"slot_id": slot_id}, "delete slot")
	if not result.get("ok", false):
		if save_slot_panel != null:
			save_slot_panel.call("set_status", "删除失败：%s" % str(result.get("error", "")))
		return
	if save_slot_panel != null:
		save_slot_panel.call("set_status", str(result.get("status_message", "")))
	_refresh_active_runtime_panels()

func _on_system_settings_apply(values: Dictionary) -> void:
	var result: Dictionary = _run_shell_command("apply_settings", {"values": values}, "system settings")
	if not result.get("ok", false):
		if system_panel != null:
			system_panel.call("set_status", "设置失败：%s" % str(result.get("error", "")))
		return
	if system_panel != null:
		system_panel.call("set_status", str(result.get("status_message", "")))
	_refresh_active_runtime_panels()

func request_return_to_title() -> Dictionary:
	var parent_node: Node = get_parent()
	if parent_node != null and parent_node.has_method("return_to_title"):
		parent_node.call("return_to_title")
		return {"ok": true}
	return {
		"ok": false,
		"error": "no title screen parent is available"
	}

func _on_return_title_requested() -> void:
	var result: Dictionary = request_return_to_title()
	if not result.get("ok", false):
		push_warning("return title failed: %s" % str(result.get("error", "")))
		if system_panel != null:
			system_panel.call("set_status", "返回标题失败：%s" % str(result.get("error", "")))

func _save_slot_rows() -> Array:
	if runtime_shell == null or not runtime_shell.has_method("save_slot_rows"):
		return []
	return _safe_array(runtime_shell.call("save_slot_rows"))

func _settings_snapshot() -> Dictionary:
	if runtime_shell == null or not runtime_shell.has_method("settings_snapshot"):
		return {}
	return _safe_dict(runtime_shell.call("settings_snapshot"))

func _has_quick_save() -> bool:
	if runtime_shell == null or not runtime_shell.has_method("has_quick_save"):
		return false
	return bool(runtime_shell.call("has_quick_save", quick_save_slot_id))

func _shell_panel_payloads() -> Dictionary:
	if runtime_shell == null or not runtime_shell.has_method("shell_panel_payloads"):
		return {}
	return _safe_dict(runtime_shell.call("shell_panel_payloads", quick_save_slot_id))

func _add_data_tabs() -> void:
	runtime_tab_host = RuntimeTabHostScript.new()
	var initial_panel_keys: Array = ["gameplay_hub_panel", "world_map_panel"]
	var tab_result: Dictionary = runtime_tab_host.call("build_tabs", self, vbox, _runtime_panel_payloads(initial_panel_keys), _shell_panel_payloads(), initial_panel_keys)
	if not bool(tab_result.get("ok", false)):
		push_warning("runtime tab host failed: %s" % str(tab_result.get("error", "")))
		return
	primary_tabs = tab_result.get("tabs") as TabContainer
	if primary_tabs != null:
		primary_tabs.tab_changed.connect(_on_primary_tab_changed)
	var panels: Dictionary = _safe_dict(tab_result.get("panels", {}))
	gameplay_hub_panel = panels.get("gameplay_hub_panel") as Control
	save_slot_panel = panels.get("save_slot_panel") as Control
	system_panel = panels.get("system_panel") as Control
	court_action_panel = panels.get("court_action_panel") as Control
	court_meeting_panel = panels.get("court_meeting_panel") as Control
	edict_panel = panels.get("edict_panel") as Control
	military_order_panel = panels.get("military_order_panel") as Control
	army_roster_panel = panels.get("army_roster_panel") as Control
	diplomacy_panel = panels.get("diplomacy_panel") as Control
	appointment_panel = panels.get("appointment_panel") as Control
	audience_panel = panels.get("audience_panel") as Control
	relationship_panel = panels.get("relationship_panel") as Control
	faction_browser_panel = panels.get("faction_browser_panel") as Control
	monthly_report_panel = panels.get("monthly_report_panel") as Control
	chronicle_panel = panels.get("chronicle_panel") as Control
	communication_panel = panels.get("communication_panel") as Control
	event_queue_panel = panels.get("event_queue_panel") as Control
	world_map_panel = panels.get("world_map_panel") as Control
	region_governance_panel = panels.get("region_governance_panel") as Control
	character_browser_panel = panels.get("character_browser_panel") as Control
	statecraft_panel = panels.get("statecraft_panel") as Control

func _select_tab_by_name(tab_name: String) -> void:
	if select_runtime_panel(tab_name):
		return
	if primary_tabs == null:
		return
	for i in range(primary_tabs.get_child_count()):
		if primary_tabs.get_child(i).name == tab_name:
			var panel_key: String = _panel_key_for_node(primary_tabs.get_child(i))
			if not panel_key.is_empty():
				select_runtime_panel(panel_key)
			else:
				primary_tabs.current_tab = i
			return

func select_runtime_panel(panel_key: String) -> bool:
	if primary_tabs == null:
		return false
	var panel: Node = _runtime_panels().get(panel_key) as Node
	if panel == null or panel.get_parent() != primary_tabs:
		return false
	primary_tabs.current_tab = panel.get_index()
	_refresh_runtime_bar(["overview_summary_panel", panel_key])
	return true

func _panel_key_for_node(panel: Node) -> String:
	for panel_key in _runtime_panels().keys():
		if _runtime_panels().get(panel_key) == panel:
			return str(panel_key)
	return ""

func _on_primary_tab_changed(_tab: int) -> void:
	_refresh_active_runtime_panels()

func _on_court_action_requested(action_id: String) -> void:
	_run_player_command("court_action", {"action_id": action_id}, "court action")

func _on_court_meeting_requested(topic_id: String, participant_ids: Array) -> void:
	_run_player_command("court_meeting", {
		"topic_id": topic_id,
		"participant_ids": participant_ids
	}, "court meeting")

func _on_court_recommendation_requested(recommendation_id: String) -> void:
	_run_player_command("court_recommendation", {"recommendation_id": recommendation_id}, "court recommendation")

func _on_edict_requested(edict_id: String, target_region_id: String) -> void:
	_run_player_command("edict", {
		"edict_id": edict_id,
		"target_region_id": target_region_id
	}, "edict")

func _on_military_order_requested(order_id: String, target_region_id: String) -> void:
	_run_player_command("military_order", {
		"order_id": order_id,
		"target_region_id": target_region_id
	}, "military order")

func _on_army_commander_requested(army_id: String, character_id: String) -> void:
	_run_player_command("army_commander", {
		"army_id": army_id,
		"character_id": character_id
	}, "army commander assignment")

func _on_army_action_requested(army_id: String, action_id: String) -> void:
	_run_player_command("army_action", {
		"army_id": army_id,
		"action_id": action_id
	}, "army action")

func _on_army_redeploy_requested(army_id: String, target_region_id: String) -> void:
	_run_player_command("army_redeploy", {
		"army_id": army_id,
		"target_region_id": target_region_id
	}, "army redeployment")

func _on_diplomacy_requested(action_id: String, target_faction_id: String) -> void:
	_run_player_command("diplomacy", {
		"action_id": action_id,
		"target_faction_id": target_faction_id
	}, "diplomacy")

func _on_diplomacy_commitment_renew_requested(commitment_id: String, target_faction_id: String) -> void:
	_run_player_command("diplomacy_commitment_renew", {
		"commitment_id": commitment_id,
		"target_faction_id": target_faction_id
	}, "renew diplomacy commitment")

func _on_diplomacy_commitment_break_requested(commitment_id: String, target_faction_id: String) -> void:
	_run_player_command("diplomacy_commitment_break", {
		"commitment_id": commitment_id,
		"target_faction_id": target_faction_id
	}, "break diplomacy commitment")

func _on_appointment_requested(character_id: String, office_id: String) -> void:
	_run_player_command("appointment", {
		"character_id": character_id,
		"office_id": office_id
	}, "appointment")

func _on_audience_requested(character_id: String, topic_id: String) -> void:
	_run_player_command("audience", {
		"character_id": character_id,
		"topic_id": topic_id
	}, "audience")

func _on_region_governance_requested(region_id: String, action_id: String) -> void:
	_run_player_command("region_governance", {
		"region_id": region_id,
		"action_id": action_id
	}, "region governance")

func _on_statecraft_action_requested(variable_name: String, action_id: String) -> void:
	var result: Dictionary = _run_player_command("statecraft", {
		"variable_name": variable_name,
		"action_id": action_id
	}, "statecraft action")
	if not result.get("ok", false):
		return
	if statecraft_panel != null:
		statecraft_panel.call("select_variable", variable_name)

func _on_communication_process_requested(communication_id: String, action: String) -> void:
	_run_player_command("communication", {
		"communication_id": communication_id,
		"action": action
	}, "process communication")

func _on_event_resolve_requested(event_id: String, choice_index: int) -> void:
	_run_player_command("event", {
		"event_id": event_id,
		"choice_index": choice_index
	}, "resolve event")

func _on_faction_action_requested(faction_id: String, action_id: String) -> void:
	var result: Dictionary = _run_player_command("faction", {
		"faction_id": faction_id,
		"action_id": action_id
	}, "faction action")
	if not result.get("ok", false):
		return
	if faction_browser_panel != null:
		faction_browser_panel.call("select_faction", faction_id)

func issue_selected_region_edict(edict_id: String) -> Dictionary:
	return _issue_selected_region_command("edict", edict_id)

func issue_selected_region_military_order(order_id: String) -> Dictionary:
	return _issue_selected_region_command("military_order", order_id)

func _issue_selected_region_command(command_type: String, command_id: String) -> Dictionary:
	if game_state == null:
		return {
			"ok": false,
			"error": "game state is not ready"
		}
	var region_id: String = _current_map_region_id()
	if region_id.is_empty():
		return {
			"ok": false,
			"error": "no selected region"
		}

	var result: Dictionary = _run_player_command("map_region", {
		"command_type": command_type,
		"command_id": command_id,
		"target_region_id": region_id
	}, "map region command")

	if not bool(result.get("ok", false)):
		var message: String = str(result.get("status", result.get("error", "command failed")))
		if world_map_panel != null and world_map_panel.has_method("set_quick_status"):
			world_map_panel.call("set_quick_status", message)
		return result

	if world_map_panel != null and world_map_panel.has_method("set_quick_status"):
		world_map_panel.call("set_quick_status", str(result.get("status", "已执行：%s" % command_id)))
	return result

func _current_map_region_id() -> String:
	if world_map_panel == null or not world_map_panel.has_method("selected_region_runtime_id"):
		return ""
	return str(world_map_panel.call("selected_region_runtime_id"))

func _on_character_action_requested(character_id: String, action_id: String) -> void:
	_run_player_command("character", {
		"character_id": character_id,
		"action_id": action_id
	}, "character action")

func _safe_array(value: Variant) -> Array:
	return value if typeof(value) == TYPE_ARRAY else []

func _safe_dict(value: Variant) -> Dictionary:
	return value if typeof(value) == TYPE_DICTIONARY else {}

