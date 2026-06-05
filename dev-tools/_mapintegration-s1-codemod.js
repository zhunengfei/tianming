// 地图编辑器接入 · 刀1：建立唯一规范写回路径 applyMapPatch，并把现存三个地图写口的重复尾部funnel进它。
// 行为不变（saveMapBindings/clearSelectedMapBindings 保持 normalize:false；normalizeMapBindings 保持归一化）。
const fs = require('fs');
const path = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + t + ' matched x' + n + ' (need 1)');
  s = s.replace(a, b);
  edits.push(t);
}

// 1) 在 syncMapMirror 之后插入 applyMapPatch
once(
"  function syncMapMirror(field, value) {\n" +
"    if (field === 'map' && isObject(state.scenario.mapData)) state.scenario.mapData = clone(value);\n" +
"    if (field === 'mapData' && isObject(state.scenario.map)) state.scenario.map = clone(value);\n" +
"  }\n",
"  function syncMapMirror(field, value) {\n" +
"    if (field === 'map' && isObject(state.scenario.mapData)) state.scenario.mapData = clone(value);\n" +
"    if (field === 'mapData' && isObject(state.scenario.map)) state.scenario.map = clone(value);\n" +
"  }\n" +
"\n" +
"  // 地图唯一规范写回路径。国师改地图 / 御案迷你几何 / 跳转地图编辑器返回 / 现存绑定保存，全部经此一口写入，\n" +
"  // 由它统一收尾：地块归一化 → map↔mapData 镜像 → 历史 → 重渲染 → 状态。三条未来线只需调它，不各写各的。\n" +
"  // mutate(map) 在工作地图对象上原地修改，可返回任意细节（透传回调用方的 detail）。\n" +
"  // opts: { field, normalize, label, detail, status, statusLevel, ensureScaffold, skipRender, silent }\n" +
"  function applyMapPatch(mutate, opts) {\n" +
"    opts = opts || {};\n" +
"    if (opts.ensureScaffold) ensureProductionMapScaffold();\n" +
"    var field = opts.field || (isObject(state.scenario.map) ? 'map' : (isObject(state.scenario.mapData) ? 'mapData' : 'map'));\n" +
"    var map = state.scenario[field];\n" +
"    if (!isObject(map)) {\n" +
"      if (!opts.silent) setStatus('当前没有可写入的地图对象：' + field, 'warn');\n" +
"      return null;\n" +
"    }\n" +
"    if (!Array.isArray(map.regions)) map.regions = [];\n" +
"    var mutateResult = typeof mutate === 'function' ? mutate(map) : null;\n" +
"    if (opts.normalize !== false) {\n" +
"      map.regions.forEach(function(region) { normalizeRegionBinding(map, region); });\n" +
"    }\n" +
"    syncMapMirror(field, map);\n" +
"    if (opts.label) recordHistory(opts.label, opts.detail != null ? opts.detail : (field + ' · ' + map.regions.length + ' 地块'));\n" +
"    if (opts.skipRender !== true) renderAll();\n" +
"    if (opts.status) setStatus(opts.status, opts.statusLevel || 'good');\n" +
"    return { field: field, map: map, detail: mutateResult };\n" +
"  }\n",
'insert-applyMapPatch');

// 2) saveMapBindings 尾部 → applyMapPatch（normalize:false 保持原行为；默认 detail 复刻原 recordHistory）
once(
"    syncMapMirror(field, map);\n" +
"    recordHistory('保存地图绑定', field + ' · ' + map.regions.length + ' 地块');\n" +
"    renderAll();\n" +
"    setStatus('地图地块归属与行政绑定已保存：' + field, 'good');\n" +
"    return clone(state.scenario[field]);\n",
"    return applyMapPatch(function() {}, { field: field, normalize: false, label: '保存地图绑定', status: '地图地块归属与行政绑定已保存：' + field }) ? clone(state.scenario[field]) : null;\n",
'retrofit-saveMapBindings');

// 3) normalizeMapBindings 尾部（含归一化循环）→ applyMapPatch（默认 normalize:true 接管归一化）
once(
"    (map.regions || []).forEach(function(region) { normalizeRegionBinding(map, region); });\n" +
"    syncMapMirror(field, map);\n" +
"    recordHistory('智能匹配地图绑定', field);\n" +
"    renderAll();\n" +
"    setStatus('已按 ownerKey/name 智能补齐地图绑定：' + field, 'good');\n" +
"    return clone(state.scenario[field]);\n",
"    return applyMapPatch(function() {}, { field: field, label: '智能匹配地图绑定', detail: field, status: '已按 ownerKey/name 智能补齐地图绑定：' + field }) ? clone(state.scenario[field]) : null;\n",
'retrofit-normalizeMapBindings');

// 4) clearSelectedMapBindings 尾部 → applyMapPatch（normalize:false，否则归一化会把 adminBinding 重填回 region.name 抵消清除）
once(
"    syncMapMirror(field, map);\n" +
"    recordHistory('清除地图映射', field + ' · ' + cleared + ' 地块');\n" +
"    renderAll();\n" +
"    setStatus('已清除勾选地块映射：' + cleared + ' 个', 'good');\n" +
"    return clone(state.scenario[field]);\n",
"    return applyMapPatch(function() {}, { field: field, normalize: false, label: '清除地图映射', detail: field + ' · ' + cleared + ' 地块', status: '已清除勾选地块映射：' + cleared + ' 个' }) ? clone(state.scenario[field]) : null;\n",
'retrofit-clearSelectedMapBindings');

// 5) 导出 applyMapPatch 供刀3/4/5 与 e2e 调用
once(
"    saveMapBindings: saveMapBindings,\n",
"    applyMapPatch: applyMapPatch,\n    saveMapBindings: saveMapBindings,\n",
'export-applyMapPatch');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
console.log('delta:', s.length - orig.length, 'chars');
