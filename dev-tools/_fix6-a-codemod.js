// 深查修·刀A — 3个小独立修：bug4(modules空守卫) + bug5(aiReferences/history截断) + bug6(关系模板空壳)。
const fs = require('fs');
const path = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// bug5: 常量 AI_REFERENCES_PERSIST_MAX（DRAFT_PERSIST_MAX 后）
once(
  "  var DRAFT_PERSIST_MAX = 2000000;",
  "  var DRAFT_PERSIST_MAX = 2000000;\n" +
  "  var AI_REFERENCES_PERSIST_MAX = 200;  // 修：原 12 太小，存项目/草稿时把用户的 AI 参考资料截没了",
  'aiRefConst');

// bug4: ensureModulesPopulated 守卫助手（applyImportedScenario 前插）
once(
  "  function applyImportedScenario(parsed, label) {",
  "  // 修崩溃：数据包加载失败时 state.modules 可能为空，导入/载入直接 state.modules[0].id 解引用会崩。\n" +
  "  // loadScenario 有此兜底，唯导入/载入两路绕过——统一补守卫。\n" +
  "  function ensureModulesPopulated() {\n" +
  "    if (!state.modules.length) state.modules = [{ id: 'scenarioOpening', title: '剧本总览', topLevelKeys: Object.keys(state.scenario || {}), topLevelCount: Object.keys(state.scenario || {}).length }];\n" +
  "  }\n\n" +
  "  function applyImportedScenario(parsed, label) {",
  'ensureModulesFn');

// bug4: applyImportedScenario 解引用前守卫
once(
  "    absorbOrphanScenarioKeys();\n" +
  "    state.selectedModuleId = state.modules[0].id;",
  "    absorbOrphanScenarioKeys();\n" +
  "    ensureModulesPopulated();\n" +
  "    state.selectedModuleId = state.modules[0].id;",
  'applyImportGuard');

// bug4: loadProjectSnapshot 解引用前守卫
once(
  "    state.validationRan = false;\n" +
  "    state.selectedModuleId = state.modules[0].id;",
  "    state.validationRan = false;\n" +
  "    ensureModulesPopulated();\n" +
  "    state.selectedModuleId = state.modules[0].id;",
  'loadSnapGuard');

// bug5: buildProjectSnapshot aiReferences 12→常量、history 40→80
once(
  "aiReferences: clone(state.aiReferences || []).slice(0, 12), aiFixPlan:",
  "aiReferences: clone(state.aiReferences || []).slice(0, AI_REFERENCES_PERSIST_MAX), aiFixPlan:",
  'snapAiRef');
once(
  "history: clone(state.history || []).slice(0, 40) };",
  "history: clone(state.history || []).slice(0, 80) };",
  'snapHistory');

// bug5: writeStoredDraft aiReferences 12→常量
once(
  "      aiReferences: clone(state.aiReferences || []).slice(0, 12),",
  "      aiReferences: clone(state.aiReferences || []).slice(0, AI_REFERENCES_PERSIST_MAX),",
  'draftAiRef');

// bug6: buildEntityTemplate 补 factionRelations / relations 关系模板（默认空壳前）
once(
  "    return { id: uniqueId(field || 'item'), name: '新条目', desc: '由新版剧本编辑器创建，可继续补字段。' };",
  "    if (field === 'factionRelations') return { id: uniqueId('frel'), from: '', to: '', type: 'neutral', value: 0, desc: '待补势力关系' };\n" +
  "    if (field === 'relations') return { id: uniqueId('rel'), from: '', to: '', type: '', value: 0, desc: '待补人物关系' };\n" +
  "    return { id: uniqueId(field || 'item'), name: '新条目', desc: '由新版剧本编辑器创建，可继续补字段。' };",
  'relationTemplate');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
