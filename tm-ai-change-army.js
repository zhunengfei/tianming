// @ts-check
/// <reference path="types.d.ts" />
/**
 * tm-ai-change-army.js — AI 推演变化·军队处理 (拆自 tm-ai-change-applier.js·2026-05-21·Slice 2)
 *
 * 暴露·TM.AIChange.Army·主要 API + applier 仍需 alias 回去的 helper·
 *   applyAIArmyChange (public·AI 输出 → GM.armies 写回)
 *   applyAIArmyChangeList (批量)
 *   refreshMilitaryViews (PathUtils lazy 调)
 *   armyLooseNamePattern / armyNarrativeAliases / resolveNarrativeCommanderName
 *     (applier 内 region/army narrative fallback 仍需调)
 *   findArmyForAIChange / normalizeArmyKey / clampNum (跨模块通用)
 *
 * 依赖·TM.AIChange.PathUtils (Slice 1)·必须先于本文件加载。
 */
(function(global) {
  'use strict';

  // ── 从 PathUtils 拿到的 helper·原闭包内的本地名 ──
  var _PathUtils = (global.TM && global.TM.AIChange && global.TM.AIChange.PathUtils) || null;
  if (!_PathUtils) console.warn('[ai-change-army] TM.AIChange.PathUtils not loaded·army calls may noop');
  var _applyPathDelta      = _PathUtils && _PathUtils.applyPathDelta;
  var _recordToTurnChanges = _PathUtils && _PathUtils.recordToTurnChanges;
  var _resolvePath         = _PathUtils && _PathUtils.resolvePath;
  var _findDivisionByNameOrId = _PathUtils && _PathUtils.findDivisionByNameOrId;

  // 内联·原 applier.js 闭包工具·拆模块后跨闭包看不见·复制 17 行避免循环依赖
  function _getNarrativeText(aiOutput) {
    var t = '';
    if (!aiOutput) return t;
    if (aiOutput.narrative)    t += String(aiOutput.narrative) + '\n';
    if (aiOutput.shilu_text)   t += String(aiOutput.shilu_text) + '\n';
    if (aiOutput.shizhengji)   t += String(aiOutput.shizhengji) + '\n';
    if (aiOutput.yupiHuiting)  t += String(aiOutput.yupiHuiting) + '\n';
    if (aiOutput.qijuHistory)  t += String(aiOutput.qijuHistory) + '\n';
    if (aiOutput.event && aiOutput.event.desc) t += String(aiOutput.event.desc) + '\n';
    if (Array.isArray(aiOutput.events)) {
      aiOutput.events.forEach(function(e){ if (e && e.desc) t += String(e.desc) + '\n'; });
    }
    if (Array.isArray(aiOutput.npc_actions)) {
      aiOutput.npc_actions.forEach(function(na){ if (na && na.desc) t += String(na.desc) + '\n'; });
    }
    return t;
  }

    function _clampNum(n, min, max) {
    n = Number(n);
    if (!isFinite(n)) n = 0;
    return Math.max(min, Math.min(max, n));
  }

  function _normalizeArmyKey(name) {
    return String(name || '').trim().replace(/[\s,，、。？！；：·・\-—_]/g, '').toLowerCase();
  }

  function _findArmyForAIChange(G, name) {
    if (!G || !Array.isArray(G.armies) || !name) return null;
    var key = _normalizeArmyKey(name);
    if (!key) return null;
    var exact = G.armies.find(function(a) {
      return a && (_normalizeArmyKey(a.name) === key || _normalizeArmyKey(a.id) === key);
    });
    if (exact) return exact;
    return G.armies.find(function(a) {
      var ak = _normalizeArmyKey(a && a.name);
      return ak && key && (ak.indexOf(key) >= 0 || key.indexOf(ak) >= 0) && Math.abs(ak.length - key.length) <= 4;
    }) || null;
  }

  function _playerFactionNameForArmy(G, change) {
    if (change && (change.faction || change.owner || change.factionName)) return change.faction || change.owner || change.factionName;
    var P0 = global.P || {};
    if (P0.playerInfo && P0.playerInfo.factionName) return P0.playerInfo.factionName;
    if (P0.playerFaction) return P0.playerFaction;
    var pc = G && Array.isArray(G.chars) ? G.chars.find(function(c){ return c && c.isPlayer; }) : null;
    if (pc && pc.faction) return pc.faction;
    var pf = G && Array.isArray(G.facs) ? G.facs.find(function(f){ return f && (f.isPlayer || f.player); }) : null;
    return (pf && pf.name) || '';
  }

  function _armyChangeDelta(change) {
    if (!change) return 0;
    var v = (change.delta != null) ? change.delta
          : (change.soldiers_delta != null) ? change.soldiers_delta
          : (change.soldierDelta != null) ? change.soldierDelta
          : (change.strength_delta != null) ? change.strength_delta
          : (change.troops_delta != null) ? change.troops_delta
          : null;
    if (v == null && (change.action === 'create' || change.create === true || change.isNewArmy === true)) {
      v = change.soldiers != null ? change.soldiers : (change.strength != null ? change.strength : change.size);
    }
    v = Math.round(Number(v) || 0);
    return v;
  }

  function _refreshMilitaryViews(G) {
    try { if (typeof global.syncMilitarySources === 'function') global.syncMilitarySources(G); } catch(_) {}
    try { if (global.TM && TM.FactionIndex && typeof TM.FactionIndex.rebuild === 'function') TM.FactionIndex.rebuild(); } catch(_) {}
    try { if (typeof global.renderTopBarVars === 'function') global.renderTopBarVars(); } catch(_) {}
    try { if (typeof global.syncArmiesToMap === 'function') global.syncArmiesToMap(); } catch(_) {}
    try { if (typeof global.renderMap === 'function') global.renderMap(); } catch(_) {}
    try {
      if (global.TMPhase8FormalBridge && typeof global.TMPhase8FormalBridge.refresh === 'function') {
        global.TMPhase8FormalBridge.refresh();
      }
    } catch(_) {}
  }

  function _armyCommanderField(change) {
    if (!change || typeof change !== 'object') return null;
    var keys = ['commander', 'commanderName', 'general', 'leader', 'newCommander', 'newGeneral', 'chiefCommander', '统帅', '主帅', '主将', '将领', '将帅'];
    for (var i = 0; i < keys.length; i += 1) {
      if (Object.prototype.hasOwnProperty.call(change, keys[i]) && change[keys[i]] != null) {
        return String(change[keys[i]] || '').trim();
      }
    }
    return null;
  }

  function _armyTextField(change, keys) {
    if (!change || typeof change !== 'object') return null;
    for (var i = 0; i < keys.length; i += 1) {
      var k = keys[i];
      if (Object.prototype.hasOwnProperty.call(change, k) && change[k] != null) {
        return String(change[k] || '').trim();
      }
    }
    return null;
  }

  function _armyQualityField(change) {
    return _armyTextField(change, ['quality', 'grade', 'eliteLevel', 'troopQuality', 'armyQuality', 'unitQuality', 'qualityLabel', '军质', '品质', '素质', '兵员素质', '部队质量', '军队质量']);
  }

  function _armyEquipmentField(change) {
    var text = _armyTextField(change, ['equipmentCondition', 'equipmentStatus', 'equipmentLevel', 'equipmentSummary', 'equipmentDesc', 'equipmentText', '装备', '装备状况', '装备水平', '军械', '器械']);
    if (text !== null) return text;
    if (change && Object.prototype.hasOwnProperty.call(change, 'equipment') && !Array.isArray(change.equipment) && change.equipment != null) {
      return String(change.equipment || '').trim();
    }
    return null;
  }

  function _armyCurrentCommander(army) {
    if (!army) return '';
    var keys = ['commander', 'commanderName', 'general', 'leader'];
    for (var i = 0; i < keys.length; i += 1) {
      var v = army[keys[i]];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return '';
  }

  function _syncArmyCommanderAliases(army, commander, oldCommander) {
    if (!army) return false;
    commander = String(commander || '').trim();
    var changed = false;
    [
      'commander',
      'commanderName',
      'commanderDisplayName',
      'commander_name',
      'general',
      'generalName',
      'leader',
      'leaderName',
      'commandingOfficer',
      'chiefCommander',
      'chiefGeneral',
      'mainGeneral'
    ].forEach(function(k) {
      if (army[k] !== commander) {
        army[k] = commander;
        changed = true;
      }
    });
    return changed;
  }

  function _syncArmyQualityAliases(army, quality) {
    if (!army) return false;
    quality = String(quality || '').trim();
    var changed = false;
    ['quality', 'grade', 'eliteLevel', 'troopQuality', 'armyQuality', 'unitQuality', 'qualityLabel'].forEach(function(k) {
      if (army[k] !== quality) {
        army[k] = quality;
        changed = true;
      }
    });
    return changed;
  }

  function _syncArmyEquipmentAliases(army, value) {
    if (!army) return false;
    var changed = false;
    if (Array.isArray(value)) {
      army.equipment = value;
      changed = true;
      return changed;
    }
    value = String(value || '').trim();
    ['equipmentCondition', 'equipmentStatus', 'equipmentLevel', 'equipmentSummary', 'equipmentDesc', 'equipmentText'].forEach(function(k) {
      if (army[k] !== value) {
        army[k] = value;
        changed = true;
      }
    });
    return changed;
  }

  function applyAIArmyChange(change, opts) {
    opts = opts || {};
    var G = global.GM;
    if (!G || !change) return { ok:false, reason:'no game or change' };
    if (!Array.isArray(G.armies)) G.armies = [];
    if (!G._turnReport) G._turnReport = [];

    var name = change.armyName || change.name || change.army || change.unitName || change.unit || '';
    name = String(name || '').trim();
    if (!name) return { ok:false, reason:'missing army name' };

    var delta = _armyChangeDelta(change);
    var army = _findArmyForAIChange(G, name);
    var reason = change.reason || change.rationale || opts.reason || 'AI推演';
    var commanderInput = _armyCommanderField(change);
    var qualityInput = _armyQualityField(change);
    var equipmentInput = _armyEquipmentField(change);
    var factionInput = (change.faction != null) ? change.faction
      : (change.owner != null) ? change.owner
      : (change.factionName != null) ? change.factionName
      : null;
    var changed = false;
    var created = false;

    if (!army) {
      if (delta <= 0) return { ok:false, reason:'army not found', name:name };
      var armyType = change.armyType || change.type || change.branch || change.kind || '募兵';
      var factionName = _playerFactionNameForArmy(G, change);
      army = {
        id: change.id || ('army_' + (G.turn || 0) + '_' + Math.random().toString(36).slice(2, 7)),
        name: name,
        faction: '',
        branch: change.branch || armyType,
        type: armyType,
        armyType: armyType,
        soldiers: delta,
        size: delta,
        strength: delta,
        morale: _clampNum((change.morale != null ? change.morale : 60) + (Number(change.morale_delta) || 0), 0, 100),
        supply: _clampNum(change.supply != null ? change.supply : 75, 0, 100),
        training: _clampNum((change.training != null ? change.training : 45) + (Number(change.training_delta) || 0), 0, 100),
        loyalty: _clampNum(change.loyalty != null ? change.loyalty : 60, 0, 100),
        control: _clampNum(change.control != null ? change.control : 60, 0, 100),
        controlLevel: _clampNum(change.controlLevel != null ? change.controlLevel : 60, 0, 100),
        location: change.location || change.garrison || change.region || change.province || change.destination || '',
        garrison: change.garrison || change.location || change.region || change.province || change.destination || '',
        commander: commanderInput || '',
        equipment: Array.isArray(change.equipment) ? change.equipment : [],
        quality: qualityInput || '',
        equipmentCondition: equipmentInput || '',
        composition: Array.isArray(change.composition) ? change.composition : [{ type: armyType, count: delta }],
        state: change.state || 'garrison',
        source: opts.source || change.source || 'ai_military_change',
        reason: reason,
        _aiCreated: true,
        _createdTurn: G.turn || 0
      };
      if (commanderInput) _syncArmyCommanderAliases(army, commanderInput, '');
      if (qualityInput !== null) _syncArmyQualityAliases(army, qualityInput);
      if (equipmentInput !== null) _syncArmyEquipmentAliases(army, equipmentInput);
      G.armies.push(army);
      if (factionName) {
        try {
          if (global.TM && TM.FactionMembership && typeof TM.FactionMembership.assignArmy === 'function') {
            TM.FactionMembership.assignArmy(army, factionName, { reason: reason, silent: true });
          } else {
            army.faction = factionName;
          }
        } catch(_) {
          army.faction = factionName;
        }
      }
      created = true;
      changed = true;
      G._turnReport.push({ type:'military', armyName:name, field:'soldiers', old:0, new:delta, delta:delta, created:true, reason:reason, source:opts.source || '', turn:G.turn||0 });
      if (typeof global.addEB === 'function') global.addEB('军事', '新建' + name + '·' + delta + '兵' + (reason ? '：' + reason : ''));
    } else {
      if (commanderInput !== null) {
        var oldCommander = _armyCurrentCommander(army);
        var aliasesChanged = _syncArmyCommanderAliases(army, commanderInput, oldCommander);
        if (aliasesChanged) {
          if (oldCommander !== commanderInput && typeof opts.recordChange === 'function') {
            opts.recordChange('military', army.name || name, 'commander', oldCommander, commanderInput, reason);
          }
          if (oldCommander !== commanderInput) {
            G._turnReport.push({ type:'military', armyName:army.name || name, field:'commander', old:oldCommander, new:commanderInput, reason:reason, source:opts.source || '', turn:G.turn||0 });
            if (typeof global.addEB === 'function') global.addEB('\u519b\u4e8b', (army.name || name) + '\u6539\u4efb\u4e3b\u5c06: ' + (commanderInput || '\u672a\u7f6e') + (reason ? '; ' + reason : ''));
          }
          changed = true;
        }
      }
      if (qualityInput !== null) {
        var oldQuality = String(army.quality || army.grade || army.eliteLevel || '').trim();
        var qualityChanged = _syncArmyQualityAliases(army, qualityInput);
        if (qualityChanged) {
          if (oldQuality !== qualityInput && typeof opts.recordChange === 'function') {
            opts.recordChange('military', army.name || name, 'quality', oldQuality, qualityInput, reason);
          }
          if (oldQuality !== qualityInput && G._turnReport) {
            G._turnReport.push({ type:'military', armyName:army.name || name, field:'quality', old:oldQuality, new:qualityInput, reason:reason, source:opts.source || '', turn:G.turn||0 });
          }
          changed = true;
        }
      }
      if (equipmentInput !== null || Array.isArray(change.equipment)) {
        var newEquipmentValue = equipmentInput !== null ? equipmentInput : change.equipment;
        var oldEquipment = String(army.equipmentCondition || army.equipmentStatus || army.equipmentLevel || '').trim();
        var equipmentChanged = _syncArmyEquipmentAliases(army, newEquipmentValue);
        var newEquipmentReport = Array.isArray(newEquipmentValue) ? ('装备 ' + newEquipmentValue.length + ' 项') : String(newEquipmentValue || '').trim();
        if (equipmentChanged) {
          if (oldEquipment !== newEquipmentReport && typeof opts.recordChange === 'function') {
            opts.recordChange('military', army.name || name, 'equipmentCondition', oldEquipment, newEquipmentReport, reason);
          }
          if (oldEquipment !== newEquipmentReport && G._turnReport) {
            G._turnReport.push({ type:'military', armyName:army.name || name, field:'equipmentCondition', old:oldEquipment, new:newEquipmentReport, reason:reason, source:opts.source || '', turn:G.turn||0 });
          }
          changed = true;
        }
      }
      if (delta) {
        var oldS = Math.max(0, Math.round(Number(army.soldiers || army.size || army.strength || 0) || 0));
        var newS = Math.max(0, oldS + delta);
        army.soldiers = newS;
        army.size = newS;
        army.strength = newS;
        if (typeof opts.recordChange === 'function') opts.recordChange('military', army.name || name, 'soldiers', oldS, newS, reason);
        G._turnReport.push({ type:'military', armyName:army.name || name, field:'soldiers', old:oldS, new:newS, delta:delta, reason:reason, source:opts.source || '', turn:G.turn||0 });
        if (newS <= 0) {
          army.destroyed = true;
          if (typeof global.addEB === 'function') global.addEB('军事', (army.name || name) + '全军覆没：' + reason);
        }
        changed = true;
      }
      if (factionInput != null && String(factionInput).trim()) {
        var newFaction = String(factionInput).trim();
        var oldFaction = String(army.faction || army.owner || '').trim();
        if (oldFaction !== newFaction) {
          try {
            if (global.TM && TM.FactionMembership && typeof TM.FactionMembership.assignArmy === 'function') {
              TM.FactionMembership.assignArmy(army, newFaction, { reason: reason, silent: true });
            }
          } catch(_) {}
          if (String(army.faction || army.owner || '').trim() === newFaction) {
            if (G._turnReport) G._turnReport.push({ type:'military', armyName:army.name || name, field:'faction', old:oldFaction, new:newFaction, reason:reason, source:opts.source || '', turn:G.turn||0 });
            changed = true;
          }
        }
      }
      if (change.morale_delta || change.morale != null) {
        var oldM = army.morale == null ? 50 : Number(army.morale);
        army.morale = change.morale != null ? _clampNum(change.morale, 0, 100) : _clampNum(oldM + Number(change.morale_delta || 0), 0, 100);
        if (typeof opts.recordChange === 'function') opts.recordChange('military', army.name || name, 'morale', oldM, army.morale, reason);
        changed = true;
      }
      if (change.training_delta || change.training != null) {
        var oldT = army.training == null ? 50 : Number(army.training);
        army.training = change.training != null ? _clampNum(change.training, 0, 100) : _clampNum(oldT + Number(change.training_delta || 0), 0, 100);
        changed = true;
      }
      if (change.supply_delta || change.supply != null) {
        var oldSupply = army.supply == null ? 75 : Number(army.supply);
        army.supply = change.supply != null ? _clampNum(change.supply, 0, 100) : _clampNum(oldSupply + Number(change.supply_delta || 0), 0, 100);
        changed = true;
      }
      if (change.loyalty_delta || change.loyalty != null) {
        var oldLoyalty = army.loyalty == null ? 60 : Number(army.loyalty);
        army.loyalty = change.loyalty != null ? _clampNum(change.loyalty, 0, 100) : _clampNum(oldLoyalty + Number(change.loyalty_delta || 0), 0, 100);
        changed = true;
      }
      if (change.control_delta || change.control != null || change.controlLevel_delta || change.controlLevel != null) {
        var oldControl = army.control == null ? (army.controlLevel == null ? 60 : Number(army.controlLevel)) : Number(army.control);
        var controlDelta = Number(change.control_delta != null ? change.control_delta : change.controlLevel_delta || 0);
        var newControl = (change.control != null || change.controlLevel != null)
          ? _clampNum(change.control != null ? change.control : change.controlLevel, 0, 100)
          : _clampNum(oldControl + controlDelta, 0, 100);
        army.control = newControl;
        army.controlLevel = newControl;
        changed = true;
      }
      if (change.destination && typeof change.destination === 'string') {
        army.destination = change.destination;
        army._remainingDistance = 0;
        if (typeof global.addEB === 'function') global.addEB('行军', (army.name || name) + '接令调往' + change.destination);
        changed = true;
      }
      if ((change.location || change.garrison) && !change.destination) {
        var oldLoc = String(army.location || army.garrison || '').trim();
        var newLoc = String(change.location || change.garrison || '').trim();
        army.location = change.location || change.garrison;
        army.garrison = change.garrison || change.location;
        if (oldLoc !== newLoc && G._turnReport) {
          G._turnReport.push({ type:'military', armyName:army.name || name, field:'location', old:oldLoc, new:newLoc, reason:reason, source:opts.source || '', turn:G.turn||0 });
        }
        changed = true;
      }
    }

    if (changed) _refreshMilitaryViews(G);
    return { ok:true, army:army, created:created, changed:changed };
  }

  function _applyAIArmyChangeList(list, source, opts) {
    var count = 0;
    (list || []).forEach(function(change) {
      var res = applyAIArmyChange(change, Object.assign({}, opts || {}, { source: source }));
      if (res && res.ok && res.changed) count++;
    });
    return count;
  }

  function _escapeRegExp(s) {
    return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function _armyLooseNamePattern(name) {
    var raw = String(name || '').trim();
    if (!raw) return '';
    var parts = raw.split(/[\s,，、。？！；：:·•・\-—–_]+/).filter(Boolean);
    if (parts.length > 1) {
      return parts.map(_escapeRegExp).join('[\\s,，、。？！；：:·•・\\-—–_]*');
    }
    return _escapeRegExp(raw);
  }

  function _armyNarrativeAliases(army) {
    var out = [];
    ['name', 'armyName', 'title', 'id'].forEach(function(k) {
      var v = army && army[k];
      if (v != null && String(v).trim()) out.push(String(v).trim());
    });
    return out.filter(function(v, idx) { return v && out.indexOf(v) === idx; });
  }

  function _cleanCommanderCandidate(raw) {
    var text = String(raw || '').trim();
    text = text.replace(/^[\s"'“”‘’《》【】「」『』：:，,。；;]+|[\s"'“”‘’《》【】「」『』：:，,。；;]+$/g, '');
    text = text.replace(/^(?:为|任|由|以|命|令|擢|拜|简|调|改由|更正为|改任为|改为|更为|调整为|换为|易为|新任|继任)\s*/, '');
    text = text.replace(/\s*(?:为|任|充|领|统领|统带|统辖|节制|督率|督|管带|出任|出掌|接掌|掌管|总理|总督|提督|署理|兼领|兼统|镇守|坐镇|移镇|领军|领兵|掌军|统帅|主将|将领|将帅|总兵|督师|指挥).*$/g, '');
    return text.trim();
  }

  function _resolveNarrativeCommanderName(G, raw) {
    var text = _cleanCommanderCandidate(raw);
    if (!text) return '';
    var chars = Array.isArray(G && G.chars) ? G.chars : [];
    var exact = chars.find(function(c) { return c && c.name && String(c.name).trim() === text; });
    if (exact) return String(exact.name).trim();
    var contained = chars.find(function(c) {
      var name = c && c.name ? String(c.name).trim() : '';
      return name && text.indexOf(name) >= 0;
    });
    if (contained) return String(contained.name).trim();
    var m = text.match(/[\u4e00-\u9fff·]{2,8}/);
    return m ? m[0] : text.slice(0, 20);
  }

  function _applyNarrativeArmyCommanderFallback(G, aiOutput) {
    if (!G || !Array.isArray(G.armies) || !aiOutput) return 0;
    var narrative = _getNarrativeText(aiOutput);
    if (!narrative) return 0;
    var seen = {};
    var count = 0;
    var roleTerms = '统帅|主帅|主将|将领|将帅|总兵|督师|统领|统带|统辖|节制|督率|管带|提督|总督|指挥|掌军|领军|领兵|镇守';
    var leadTerms = '出任|出掌|接掌|掌管|领|统领|统带|统辖|节制|督率|管带|总督|提督|署理|署|兼领|兼统|镇守|坐镇|移镇|掌军|领军|领兵';
    var commandTerms = '命|令|着|诏令|诏|旨令|敕|遣|派|委|委任|任命|授|擢|起用|简|拜|以';
    var handoverTerms = '交由|交与|交付|交|付与|付|委|委任|授|托付|移交|归|令归|改隶|转隶';
    var roleWords = '(?:' + roleTerms + ')';
    var leadVerbs = '(?:' + leadTerms + ')';
    var commandVerbs = '(?:' + commandTerms + ')';
    var handoverVerbs = '(?:' + handoverTerms + ')';
    G.armies.forEach(function(army) {
      _armyNarrativeAliases(army).forEach(function(alias) {
        var namePat = _armyLooseNamePattern(alias);
        if (!namePat) return;
        var patterns = [
          new RegExp(namePat + '[^。；;\\n]{0,32}?' + roleWords + '[^。；;\\n]{0,16}?由[^。；;\\n]{0,16}?改为\\s*([^，,。；;\\n\\s]{2,16})', 'g'),
          new RegExp(namePat + '[^。；;\\n]{0,32}?' + roleWords + '[^。；;\\n]{0,12}?(?:更正为|改任为|改为|更为|调整为|换为|易为|任为|新任|继任|补为|补授)\\s*([^，,。；;\\n\\s]{2,16})', 'g'),
          new RegExp(namePat + '[^。；;\\n]{0,32}?' + roleWords + '\\s*[:：]?\\s*([^，,。；;\\n\\s]{2,16})', 'g'),
          new RegExp(namePat + '[^。；;\\n]{0,32}?(?:改由|由|转由|交由|移交|付与)\\s*([^，,。；;\\n\\s]{2,16})\\s*(?:接掌|' + leadTerms + ')', 'g'),
          new RegExp(namePat + '[^。；;\\n]{0,24}?' + handoverVerbs + '\\s*([^，,。；;\\n\\s]{2,16})\\s*(?:' + roleTerms + ')', 'g'),
          new RegExp(commandVerbs + '\\s*([^，,。；;\\n\\s]{2,16})\\s*(?:为|任|充|领|统领|统带|统辖|节制|督率|督|管带|接掌|' + leadTerms + ')[^。；;\\n]{0,24}?' + namePat + '(?:[^。；;\\n]{0,10}?' + roleWords + ')?', 'g'),
          new RegExp('([^，,。；;\\n\\s]{2,16})\\s*' + leadVerbs + '[^。；;\\n]{0,24}?' + namePat + '(?:[^。；;\\n]{0,10}?' + roleWords + ')?', 'g'),
          new RegExp('([^，,。；;\\n\\s]{2,16})\\s*(?:为|任|充|出任|署|署理|兼)\\s*' + namePat + '[^。；;\\n]{0,10}?' + roleWords, 'g')
        ];
        patterns.forEach(function(pat) {
          var m;
          while ((m = pat.exec(narrative)) !== null) {
            var commander = _resolveNarrativeCommanderName(G, m[1]);
            if (!commander) continue;
            var key = (army.id || army.name || alias) + '|' + commander;
            if (seen[key]) continue;
            seen[key] = true;
            var res = applyAIArmyChange(
              { name: army.name || alias, commander: commander, reason: '叙事统帅补录' },
              { source: 'narrative.army_commander' }
            );
            if (res && res.ok && res.changed) count++;
          }
        });
      });
    });
    return count;
  }

  // ── Export ──
  var TM = global.TM = global.TM || {};
  TM.AIChange = TM.AIChange || {};
  TM.AIChange.Army = {
    applyAIArmyChange: applyAIArmyChange,
    applyAIArmyChangeList: _applyAIArmyChangeList,
    clampNum: _clampNum,
    normalizeArmyKey: _normalizeArmyKey,
    findArmyForAIChange: _findArmyForAIChange,
    refreshMilitaryViews: _refreshMilitaryViews,
    armyLooseNamePattern: _armyLooseNamePattern,
    armyNarrativeAliases: _armyNarrativeAliases,
    resolveNarrativeCommanderName: _resolveNarrativeCommanderName,
    applyNarrativeArmyCommanderFallback: _applyNarrativeArmyCommanderFallback,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TM.AIChange.Army;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
