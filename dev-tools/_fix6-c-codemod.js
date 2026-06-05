// 深查修·刀C — S1删除清理：删人物/势力时清理别处悬空引用（用 ENTITY_REF_FIELDS 单一真源）。
const fs = require('fs');
const path = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// 1) cleanupEntityReferences 助手（collectMissingReferences 前插，紧跟 ENTITY_REF_FIELDS）
const CLEANUP =
  "  // 修悬空引用：删 character/faction 后清理别处对它的引用。关系行(factionRelations/relations)from/to 指向被删者→删整行；\n" +
  "  // list 引用(linkedChars/members)→摘掉该别名；scalar 引用(faction/leader/founder/owner)→清空。返回清理处数。\n" +
  "  function cleanupEntityReferences(removed, kind) {\n" +
  "    if (!removed || (kind !== 'character' && kind !== 'faction')) return 0;\n" +
  "    var aliasSet = {};\n" +
  "    refAliases(removed).forEach(function (a) { aliasSet[String(a)] = true; });\n" +
  "    if (!Object.keys(aliasSet).length) return 0;\n" +
  "    var sc = state.scenario || {};\n" +
  "    var cleaned = 0;\n" +
  "    ENTITY_REF_FIELDS.forEach(function (rf) {\n" +
  "      if (rf.kind !== kind) return;\n" +
  "      var list = sc[rf.field];\n" +
  "      if (!Array.isArray(list)) return;\n" +
  "      if (rf.shape === 'relation') {\n" +
  "        for (var i = list.length - 1; i >= 0; i--) {\n" +
  "          var row = list[i];\n" +
  "          if (row && (aliasSet[String(row.from)] || aliasSet[String(row.to)])) { list.splice(i, 1); cleaned++; }\n" +
  "        }\n" +
  "      } else if (rf.shape === 'list') {\n" +
  "        list.forEach(function (row) {\n" +
  "          if (!row) return;\n" +
  "          var arr = splitList(row[rf.key]);\n" +
  "          var kept = arr.filter(function (ref) { return !aliasSet[String(ref)]; });\n" +
  "          if (kept.length !== arr.length) { row[rf.key] = kept; cleaned += (arr.length - kept.length); }\n" +
  "        });\n" +
  "      } else {\n" +
  "        list.forEach(function (row) {\n" +
  "          if (row && aliasSet[String(row[rf.key])]) { row[rf.key] = ''; cleaned++; }\n" +
  "        });\n" +
  "      }\n" +
  "    });\n" +
  "    return cleaned;\n" +
  "  }\n\n" +
  "  function collectMissingReferences() {";
once("  function collectMissingReferences() {", CLEANUP, 'cleanupFn');

// 2) deleteEntity 接清理
once(
  "  function deleteEntity() {\n" +
  "    var value = state.scenario[state.selectedField];\n" +
  "    if (!Array.isArray(value) || !value.length) return;\n" +
  "    var removed = value.splice(state.selectedEntityIndex, 1)[0];\n" +
  "    state.selectedEntityIndex = Math.max(0, Math.min(state.selectedEntityIndex, value.length - 1));\n" +
  "    recordHistory('删除实体', state.selectedField + ': ' + labelOf(removed, 0));\n" +
  "    renderAll();\n" +
  "  }",
  "  function deleteEntity() {\n" +
  "    var value = state.scenario[state.selectedField];\n" +
  "    if (!Array.isArray(value) || !value.length) return;\n" +
  "    var removed = value.splice(state.selectedEntityIndex, 1)[0];\n" +
  "    state.selectedEntityIndex = Math.max(0, Math.min(state.selectedEntityIndex, value.length - 1));\n" +
  "    // 修悬空引用：删人物/势力时同步清理别处对它的引用（否则坏引用静默导出进游戏，修复台还假报干净）。\n" +
  "    var refKind = state.selectedField === 'characters' ? 'character' : (state.selectedField === 'factions' ? 'faction' : null);\n" +
  "    var cleaned = refKind ? cleanupEntityReferences(removed, refKind) : 0;\n" +
  "    recordHistory('删除实体', state.selectedField + ': ' + labelOf(removed, 0) + (cleaned ? ('（已清理 ' + cleaned + ' 处引用）') : ''));\n" +
  "    renderAll();\n" +
  "    if (cleaned) setStatus('已删除并清理 ' + cleaned + ' 处对其的引用', 'good');\n" +
  "  }",
  'deleteEntityHook');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
