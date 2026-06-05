// 深查修·刀B — S1扫描器治本：ENTITY_REF_FIELDS单一真源 + 三扫描函数补 factionRelations/relations 盲区。
const fs = require('fs');
const path = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// 1) ENTITY_REF_FIELDS 单一真源（collectMissingReferences 前插）
once(
  "  function collectMissingReferences() {",
  "  // 权威引用字段表：哪些集合的哪些字段引用实体(character/faction)。断裂扫描/删除清理/重命名传播三处共用——单一真源，杜绝盲区。\n" +
  "  var ENTITY_REF_FIELDS = [\n" +
  "    { field: 'characters', key: 'faction', kind: 'faction', shape: 'scalar' },\n" +
  "    { field: 'factions', key: 'leader', kind: 'character', shape: 'scalar' },\n" +
  "    { field: 'families', key: 'founder', kind: 'character', shape: 'scalar' },\n" +
  "    { field: 'families', key: 'members', kind: 'character', shape: 'list' },\n" +
  "    { field: 'parties', key: 'leader', kind: 'character', shape: 'scalar' },\n" +
  "    { field: 'classes', key: 'leader', kind: 'character', shape: 'scalar' },\n" +
  "    { field: 'events', key: 'linkedChars', kind: 'character', shape: 'list' },\n" +
  "    { field: 'events', key: 'linkedFactions', kind: 'faction', shape: 'list' },\n" +
  "    { field: 'rigidHistoryEvents', key: 'linkedChars', kind: 'character', shape: 'list' },\n" +
  "    { field: 'rigidHistoryEvents', key: 'linkedFactions', kind: 'faction', shape: 'list' },\n" +
  "    { field: 'timeline', key: 'linkedChars', kind: 'character', shape: 'list' },\n" +
  "    { field: 'timeline', key: 'linkedFactions', kind: 'faction', shape: 'list' },\n" +
  "    { field: 'items', key: 'owner', kind: 'character', shape: 'scalar' },\n" +
  "    { field: 'factionRelations', key: 'from', kind: 'faction', shape: 'relation' },\n" +
  "    { field: 'factionRelations', key: 'to', kind: 'faction', shape: 'relation' },\n" +
  "    { field: 'relations', key: 'from', kind: 'character', shape: 'relation' },\n" +
  "    { field: 'relations', key: 'to', kind: 'character', shape: 'relation' }\n" +
  "  ];\n\n" +
  "  function collectMissingReferences() {",
  'refFieldsTable');

// 2) collectMissingReferences 的硬编码 scan 块 → 从 ENTITY_REF_FIELDS 派生（补 factionRelations/relations）
once(
  "    scan('characters', { faction: 'faction' });\n" +
  "    scan('factions', { leader: 'character' });\n" +
  "    scan('families', { founder: 'character', members: 'character' });\n" +
  "    scan('parties', { leader: 'character' });\n" +
  "    scan('classes', { leader: 'character' });\n" +
  "    scan('events', { linkedChars: 'character', linkedFactions: 'faction' });\n" +
  "    scan('rigidHistoryEvents', { linkedChars: 'character', linkedFactions: 'faction' });\n" +
  "    scan('timeline', { linkedChars: 'character', linkedFactions: 'faction' });\n" +
  "    scan('items', { owner: 'character' });",
  "    var _refByField = {};\n" +
  "    ENTITY_REF_FIELDS.forEach(function (rf) { (_refByField[rf.field] = _refByField[rf.field] || {})[rf.key] = rf.kind; });\n" +
  "    Object.keys(_refByField).forEach(function (f) { scan(f, _refByField[f]); });",
  'scanDerive');

// 3) validateScenario 补 factionRelations/relations from/to 校验
once(
  "    validateRefs(sc.rigidHistoryEvents, '硬历史事件', 'linkedChars', charNames, '人物');\n" +
  "    validateRefs(sc.rigidHistoryEvents, '硬历史事件', 'linkedFactions', factionNames, '势力');",
  "    validateRefs(sc.rigidHistoryEvents, '硬历史事件', 'linkedChars', charNames, '人物');\n" +
  "    validateRefs(sc.rigidHistoryEvents, '硬历史事件', 'linkedFactions', factionNames, '势力');\n" +
  "    validateRefs(sc.factionRelations, '势力关系', 'from', factionNames, '势力');\n" +
  "    validateRefs(sc.factionRelations, '势力关系', 'to', factionNames, '势力');\n" +
  "    validateRefs(sc.relations, '人物关系', 'from', charNames, '人物');\n" +
  "    validateRefs(sc.relations, '人物关系', 'to', charNames, '人物');",
  'validateRefs');

// 4) buildReferenceReport 的 incoming 扫描补 factionRelations/relations/parties/classes/items + from/to
once(
  "    ['characters', 'factions', 'families', 'events', 'rigidHistoryEvents', 'timeline'].forEach(function(sourceField) {\n" +
  "      var list = state.scenario[sourceField];\n" +
  "      if (!Array.isArray(list)) return;\n" +
  "      list.forEach(function(row, idx) {\n" +
  "        ['faction', 'leader', 'founder', 'owner', 'linkedChars', 'linkedFactions', 'members'].forEach(function(key) {",
  "    ['characters', 'factions', 'families', 'events', 'rigidHistoryEvents', 'timeline', 'factionRelations', 'relations', 'parties', 'classes', 'items'].forEach(function(sourceField) {\n" +
  "      var list = state.scenario[sourceField];\n" +
  "      if (!Array.isArray(list)) return;\n" +
  "      list.forEach(function(row, idx) {\n" +
  "        ['faction', 'leader', 'founder', 'owner', 'linkedChars', 'linkedFactions', 'members', 'from', 'to'].forEach(function(key) {",
  'refReportIncoming');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
