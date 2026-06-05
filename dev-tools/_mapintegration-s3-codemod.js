// 地图接入 · 刀3：御案侧跳转往返 handoff。launchMapEditor(写交接键+开编辑器) / ingestMapReturn(读回写库) /
// ensureMapReturnListener(storage+focus 监听)。复用 applyMapPatch(刀1) + MapEditorBridge(刀2)。
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

// 1) handoff 键（接在 RUNTIME_RETURN_STORAGE_KEY 后）
once(
"  var RUNTIME_RETURN_STORAGE_KEY = 'tm.scenarioEditorReset.runtimeReturn.v1';\n",
"  var RUNTIME_RETURN_STORAGE_KEY = 'tm.scenarioEditorReset.runtimeReturn.v1';\n" +
"  var MAP_HANDOFF_KEY = 'tm.scenarioEditorReset.mapHandoff.v1';\n" +
"  var MAP_RETURN_KEY = 'tm.scenarioEditorReset.mapReturn.v1';\n",
'keys');

// 2) 三函数（接在 returnToFormalRuntime 后）
once(
"  function returnToFormalRuntime() {\n" +
"    var payload = saveRuntimeReturnPayload();\n" +
"    if (global.location) global.location.href = '../index.html?tmScenarioEditorReturn=' + encodeURIComponent(payload.id);\n" +
"    return payload;\n" +
"  }\n",
"  function returnToFormalRuntime() {\n" +
"    var payload = saveRuntimeReturnPayload();\n" +
"    if (global.location) global.location.href = '../index.html?tmScenarioEditorReturn=' + encodeURIComponent(payload.id);\n" +
"    return payload;\n" +
"  }\n" +
"\n" +
"  // ── 地图编辑器跳转往返（刀3·①）·复用 MapEditorBridge(刀2) + applyMapPatch(刀1) ──\n" +
"  function launchMapEditor() {\n" +
"    var Bridge = global.MapEditorBridge || {};\n" +
"    var toME = Bridge.convertScenarioToMapEditor || global.convertScenarioToMapEditor;\n" +
"    if (typeof toME !== 'function') {\n" +
"      setStatus('地图编辑器桥未加载（map-editor-to-game.js 缺失），无法跳转。', 'error');\n" +
"      return null;\n" +
"    }\n" +
"    var native;\n" +
"    try { native = toME(state.scenario); }\n" +
"    catch (err) { setStatus('转换地图给编辑器失败：' + (err && err.message || err), 'error'); return null; }\n" +
"    var payload = {\n" +
"      id: (state.scenario && state.scenario.id) || uniqueId('scenario'),\n" +
"      createdAt: new Date().toISOString(),\n" +
"      source: 'scenario-editor-reset-preview',\n" +
"      native: native\n" +
"    };\n" +
"    try { localStorage.setItem(MAP_HANDOFF_KEY, JSON.stringify(payload)); }\n" +
"    catch (err) { setStatus('写入地图交接失败（可能过大）：' + (err && err.message || err), 'error'); return null; }\n" +
"    ensureMapReturnListener();\n" +
"    var divCount = (native.divisions || []).length;\n" +
"    var url = '../map-editor.html?tmFromJuben=1';\n" +
"    var opened = global.open ? global.open(url, '_blank') : null;\n" +
"    if (!opened && global.location) global.location.href = url;\n" +
"    setStatus('已把 ' + divCount + ' 个地块交接给地图编辑器，正在打开。画完点「返回剧本」即可写回。', 'good');\n" +
"    return payload;\n" +
"  }\n" +
"\n" +
"  var _mapReturnListenerArmed = false;\n" +
"  function ensureMapReturnListener() {\n" +
"    if (_mapReturnListenerArmed || !global.addEventListener) return;\n" +
"    _mapReturnListenerArmed = true;\n" +
"    global.addEventListener('storage', function(e) {\n" +
"      if (e && e.key === MAP_RETURN_KEY && e.newValue) ingestMapReturn();\n" +
"    });\n" +
"    global.addEventListener('focus', function() {\n" +
"      try { if (localStorage.getItem(MAP_RETURN_KEY)) ingestMapReturn(); } catch (err) {}\n" +
"    });\n" +
"  }\n" +
"\n" +
"  function ingestMapReturn() {\n" +
"    var raw;\n" +
"    try { raw = localStorage.getItem(MAP_RETURN_KEY); } catch (err) { return null; }\n" +
"    if (!raw) return null;\n" +
"    var payload;\n" +
"    try { payload = JSON.parse(raw); } catch (err) { try { localStorage.removeItem(MAP_RETURN_KEY); } catch (e) {} return null; }\n" +
"    var native = payload && payload.native;\n" +
"    if (!native || !native.divisions) { try { localStorage.removeItem(MAP_RETURN_KEY); } catch (e) {} return null; }\n" +
"    var Bridge = global.MapEditorBridge || {};\n" +
"    var toGame = Bridge.convertMapEditorToGame || global.convertMapEditorToGame;\n" +
"    var toAdmin = Bridge.convertMapEditorToAdminHierarchy || global.convertMapEditorToAdminHierarchy;\n" +
"    if (typeof toGame !== 'function') { setStatus('地图编辑器桥未加载，无法读回地图。', 'error'); return null; }\n" +
"    var gm, ah;\n" +
"    try {\n" +
"      gm = toGame(native);\n" +
"      ah = typeof toAdmin === 'function' ? toAdmin(native) : null;\n" +
"    } catch (err) { setStatus('读回地图失败：' + (err && err.message || err), 'error'); return null; }\n" +
"    if (!isObject(state.scenario.map)) state.scenario.map = { regions: [], oceans: [] };\n" +
"    if (ah) state.scenario.adminHierarchy = ah;\n" +
"    var applied = applyMapPatch(function(map) {\n" +
"      map.regions = (Array.isArray(gm.regions) ? gm.regions : []).map(function(r) {\n" +
"        if (r && r.owner && !r.ownerKey) r.ownerKey = r.owner;\n" +
"        return r;\n" +
"      });\n" +
"      if (gm.width) map.width = gm.width;\n" +
"      if (gm.height) map.height = gm.height;\n" +
"      if (gm.name) map.name = gm.name;\n" +
"      if (gm._v2) map._v2 = gm._v2;\n" +
"    }, { field: 'map', label: '地图编辑器返回', detail: (gm.regions || []).length + ' 地块', status: '已从地图编辑器载入地图：' + (gm.regions || []).length + ' 地块 · ' + (ah ? Object.keys(ah).length + ' 势力行政' : '无行政层') });\n" +
"    try { localStorage.removeItem(MAP_RETURN_KEY); } catch (err) {}\n" +
"    return applied;\n" +
"  }\n",
'functions');

// 3) 工具栏按钮（接在「清除勾选映射」之后）
once(
"<button class=\"ai-button\" data-editor-command=\"clear-selected-map-bindings\">清除勾选映射</button>",
"<button class=\"ai-button\" data-editor-command=\"clear-selected-map-bindings\">清除勾选映射</button><button class=\"ai-button ai-button--combo\" data-editor-command=\"launch-map-editor\">去地图编辑器 ⟲</button>",
'toolbar-button');

// 4) 命令分发（接在 normalize-map-bindings 后）
once(
"    if (command === 'normalize-map-bindings') normalizeMapBindings();\n",
"    if (command === 'normalize-map-bindings') normalizeMapBindings();\n" +
"    if (command === 'launch-map-editor') launchMapEditor();\n",
'dispatch');

// 5) ready 钩子·武装监听（不在 ready 自动 ingest·避免把陈旧 return 套到错的剧本上·靠 focus/storage 接）
once(
"    document.body.dataset.scenarioEditorResetApp = 'ready';\n",
"    document.body.dataset.scenarioEditorResetApp = 'ready';\n" +
"    ensureMapReturnListener();\n",
'ready-hook');

// 6) 导出供 e2e/外部调用（接在 applyMapPatch 导出后）
once(
"    applyMapPatch: applyMapPatch,\n",
"    applyMapPatch: applyMapPatch,\n" +
"    launchMapEditor: launchMapEditor,\n" +
"    ingestMapReturn: ingestMapReturn,\n",
'export');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
console.log('delta:', s.length - orig.length, 'chars');
