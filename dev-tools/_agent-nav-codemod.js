const fs = require('fs');
// ── 编辑器：扩 MODULE_PRIMARY_TOUCH_KEYS + moduleHomeForField + applyImportedScenario 跳对应章 ──
const f1 = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(f1, 'utf8');
function once(a, b, t) { if (s.split(a).length - 1 !== 1) throw new Error('ANCHOR ' + t + ' x' + (s.split(a).length - 1)); s = s.replace(a, b); }

// 1) 扩 MODULE_PRIMARY_TOUCH_KEYS 到全9章 + 加 moduleHomeForField 反查
once(
`  var MODULE_PRIMARY_TOUCH_KEYS = { peopleLineages: ['characters', 'families', 'relations'], factionsSociety: ['factionRelations', 'factions'] };`,
`  var MODULE_PRIMARY_TOUCH_KEYS = {
    scenarioOpening: ['name', 'intro', 'summary', 'gameSettings', 'playerInfo'],
    peopleLineages: ['characters', 'families', 'relations'],
    factionsSociety: ['factionRelations', 'factions', 'parties', 'classes', 'items'],
    courtInstitutions: ['officeTree', 'government', 'officeConfig'],
    adminMap: ['adminHierarchy', 'map'],
    economyPopulation: ['fiscalConfig', 'corruption', 'economyConfig'],
    militaryFrontier: ['military'],
    eventsChronicle: ['events', 'timeline', 'rigidHistoryEvents', 'objectives'],
    rulesAi: ['variables', 'techTree', 'civicTree', 'mechanicsConfig', 'rules']
  };
  function moduleHomeForField(field) {
    for (var mid in MODULE_PRIMARY_TOUCH_KEYS) { if (MODULE_PRIMARY_TOUCH_KEYS[mid].indexOf(field) >= 0) return mid; }
    return inferModuleForField(field);
  }`,
'touch-keys');

// 2) applyImportedScenario：opts.preserveFocus → 跳到改动字段对应章 + markAgentTouched
once(
`  function applyImportedScenario(parsed, label) {
    state.scenario = parsed;
    state.original = clone(parsed);
    state.modules = clone((DATA.blueprint && DATA.blueprint.modules) || state.modules);
    absorbOrphanScenarioKeys();
    ensureModulesPopulated();
    state.selectedModuleId = state.modules[0].id;
    state.selectedField = (state.modules[0].topLevelKeys || Object.keys(parsed))[0];
    state.selectedEntityIndex = 0;
    state.validationRan = false;
    state.currentProjectId = null;
    state.dirty = true;
    recordHistory('导入剧本', label);
    renderAll();
  }`,
`  function applyImportedScenario(parsed, label, opts) {
    opts = opts || {};
    var prevMod = state.selectedModuleId, prevField = state.selectedField;
    var oldSc = state.scenario || {};
    var changed = [];
    if (opts.preserveFocus) {
      try { var allK = {}; Object.keys(parsed || {}).concat(Object.keys(oldSc)).forEach(function (k) { allK[k] = 1; }); Object.keys(allK).forEach(function (k) { if (JSON.stringify(parsed[k]) !== JSON.stringify(oldSc[k])) changed.push(k); }); } catch (e) {}
    }
    state.scenario = parsed;
    state.original = clone(parsed);
    state.modules = clone((DATA.blueprint && DATA.blueprint.modules) || state.modules);
    absorbOrphanScenarioKeys();
    ensureModulesPopulated();
    if (opts.preserveFocus) {
      var jumpField = changed.filter(function (k) { return k !== '_version' && k !== 'sid' && k !== 'id'; })[0];
      var targetMod = jumpField ? moduleHomeForField(jumpField) : prevMod;
      state.selectedModuleId = (targetMod && findModule(targetMod) && findModule(targetMod).id === targetMod) ? targetMod : (prevMod || state.modules[0].id);
      state.selectedField = jumpField || prevField || (findModule(state.selectedModuleId).topLevelKeys || Object.keys(parsed))[0];
    } else {
      state.selectedModuleId = state.modules[0].id;
      state.selectedField = (state.modules[0].topLevelKeys || Object.keys(parsed))[0];
    }
    state.selectedEntityIndex = 0;
    state.validationRan = false;
    state.currentProjectId = null;
    state.dirty = true;
    recordHistory('导入剧本', label);
    renderAll();
    if (opts.preserveFocus && changed.length) { try { markAgentTouched(changed); } catch (e) {} }
  }`,
'apply-imported');

fs.writeFileSync(f1, s, 'utf8');

// ── agent 适配器：commit 传 preserveFocus ──
const f2 = 'editor-authoring-agent.js';
let g = fs.readFileSync(f2, 'utf8');
const ga = `      commit: function(draft) {
        app().applyImportedScenario(draft, 'AI 助手生成');
        return { ok: true };
      }`;
const gb = `      commit: function(draft) {
        app().applyImportedScenario(draft, 'AI 助手生成', { preserveFocus: true });
        return { ok: true };
      }`;
if (g.split(ga).length - 1 !== 1) throw new Error('agent commit anchor x' + (g.split(ga).length - 1));
g = g.replace(ga, gb);
fs.writeFileSync(f2, g, 'utf8');

console.log('OK: touch-keys + apply-imported(preserveFocus跳章) + agent commit');
