// 深查修·刀D — S2重命名传播：重命名 character/faction 后把别处按旧别名的引用同步改新（ENTITY_REF_FIELDS 单一真源）。
const fs = require('fs');
const path = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// 1) buildRenameMap + propagateRename 助手（collectMissingReferences 前插）
const RENAME =
  "  // 修引用断裂：重命名 character/faction 的 name/id 等别名后，按位置映射(name→name、id→id)同步改别处引用。\n" +
  "  function buildRenameMap(oldE, newE) {\n" +
  "    var map = {};\n" +
  "    ['id', 'sid', 'name', 'title', 'key', 'ownerKey'].forEach(function (k) {\n" +
  "      var ov = oldE && oldE[k], nv = newE && newE[k];\n" +
  "      if (ov != null && ov !== '' && nv != null && nv !== '' && String(ov) !== String(nv)) map[String(ov)] = String(nv);\n" +
  "    });\n" +
  "    return map;\n" +
  "  }\n" +
  "  function propagateRename(parentField, oldEntity, newEntity) {\n" +
  "    var kind = parentField === 'characters' ? 'character' : (parentField === 'factions' ? 'faction' : null);\n" +
  "    if (!kind) return 0;\n" +
  "    var map = buildRenameMap(oldEntity, newEntity);\n" +
  "    if (!Object.keys(map).length) return 0;\n" +
  "    var sc = state.scenario || {};\n" +
  "    var changed = 0;\n" +
  "    ENTITY_REF_FIELDS.forEach(function (rf) {\n" +
  "      if (rf.kind !== kind) return;\n" +
  "      var list = sc[rf.field];\n" +
  "      if (!Array.isArray(list)) return;\n" +
  "      list.forEach(function (row) {\n" +
  "        if (!row) return;\n" +
  "        if (rf.shape === 'list') {\n" +
  "          var arr = splitList(row[rf.key]); var hit = false;\n" +
  "          var mapped = arr.map(function (ref) { if (map[String(ref)]) { hit = true; return map[String(ref)]; } return ref; });\n" +
  "          if (hit) { row[rf.key] = mapped; changed++; }\n" +
  "        } else if (map[String(row[rf.key])]) { row[rf.key] = map[String(row[rf.key])]; changed++; }\n" +
  "      });\n" +
  "    });\n" +
  "    return changed;\n" +
  "  }\n\n" +
  "  function collectMissingReferences() {";
once("  function collectMissingReferences() {", RENAME, 'renameFns');

// 2) saveSelectedEntity 接传播
once(
  "    value[state.selectedEntityIndex] = next;\n" +
  "    recordHistory('实体保存', field + '[' + state.selectedEntityIndex + ']');\n" +
  "    renderAll();\n" +
  "    setStatus('已保存实体：' + labelOf(next, state.selectedEntityIndex), 'good');",
  "    var prevEntity = value[state.selectedEntityIndex];\n" +
  "    value[state.selectedEntityIndex] = next;\n" +
  "    var renamed = propagateRename(field, prevEntity, next);\n" +
  "    recordHistory('实体保存', field + '[' + state.selectedEntityIndex + ']' + (renamed ? ('·同步' + renamed + '处引用') : ''));\n" +
  "    renderAll();\n" +
  "    setStatus('已保存实体：' + labelOf(next, state.selectedEntityIndex) + (renamed ? ('（已同步 ' + renamed + ' 处引用）') : ''), 'good');",
  'saveSelectedHook');

// 3) saveSpecialistEntity 接传播
once(
  "    var parentField = state.selectedField;\n" +
  "    container.querySelectorAll('[data-specialist-field]').forEach(function(input) {\n" +
  "      setEntityProp(entity, input.dataset.specialistField, input.value, parentField);\n" +
  "    });\n" +
  "    recordHistory('专业表单保存', state.selectedField + '[' + state.selectedEntityIndex + ']');\n" +
  "    renderAll();\n" +
  "    setStatus('已保存专业表单：' + labelOf(entity, state.selectedEntityIndex), 'good');",
  "    var parentField = state.selectedField;\n" +
  "    var prevSnapshot = clone(entity);\n" +
  "    container.querySelectorAll('[data-specialist-field]').forEach(function(input) {\n" +
  "      setEntityProp(entity, input.dataset.specialistField, input.value, parentField);\n" +
  "    });\n" +
  "    var renamed = propagateRename(parentField, prevSnapshot, entity);\n" +
  "    recordHistory('专业表单保存', state.selectedField + '[' + state.selectedEntityIndex + ']' + (renamed ? ('·同步' + renamed + '处引用') : ''));\n" +
  "    renderAll();\n" +
  "    setStatus('已保存专业表单：' + labelOf(entity, state.selectedEntityIndex) + (renamed ? ('（已同步 ' + renamed + ' 处引用）') : ''), 'good');",
  'saveSpecialistHook');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
