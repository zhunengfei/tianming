// 地图接入 · 刀4：御案迷你几何 —— 点选地块 / 改归属 / 即时上色，全经 applyMapPatch。
// 把现有只读 SVG 归属预览长成可交互：path 加 data-editor-command=select-map-region；选中高亮+快编条。
// 附带 regionSvgPath：从 path/coords/polygon 任一几何画形（修复刀3 ingest 后 regions 只有 coords 导致预览空白）。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + t + ' matched x' + n + ' (need 1)');
  s = s.replace(a, b);
  edits.push(t);
}

// ── E0+E4：helper + 三函数，插在 renderMapBindingWorkbench 前 ──
once(
`  function renderMapBindingWorkbench(field, value) {`,
`  // 从 path / coords(flat) / polygon([[x,y]]) 任一几何派生 SVG path（刀4·兼容 map编辑器往返后的 coords）
  function regionSvgPath(region) {
    if (!region) return '';
    if (region.path) return region.path;
    if (region.d) return region.d;
    var pts = null;
    if (Array.isArray(region.polygon) && region.polygon.length >= 3 && Array.isArray(region.polygon[0])) pts = region.polygon;
    else if (Array.isArray(region.coords) && region.coords.length >= 6) { pts = []; for (var i = 0; i + 1 < region.coords.length; i += 2) pts.push([region.coords[i], region.coords[i + 1]]); }
    else if (Array.isArray(region.points) && region.points.length >= 3 && Array.isArray(region.points[0])) pts = region.points;
    if (!pts || pts.length < 3) return '';
    return 'M' + pts.map(function(p) { return p[0] + ' ' + p[1]; }).join(' L') + ' Z';
  }

  function selectMapRegion(index) {
    var field = state.selectedField;
    var map = state.scenario[field];
    var regions = isObject(map) && Array.isArray(map.regions) ? map.regions : [];
    if (!(index >= 0 && index < regions.length)) { state.mapSelectedRegionIndex = null; renderAll(); return; }
    state.mapSelectedRegionIndex = index;
    renderAll();
    setStatus('已选中地块：' + (regions[index].name || regions[index].id || ('#' + (index + 1))), 'good');
  }

  function clearMapSelection() {
    state.mapSelectedRegionIndex = null;
    renderAll();
  }

  function applySelectedRegionOwner() {
    var field = state.selectedField;
    var map = state.scenario[field];
    var regions = isObject(map) && Array.isArray(map.regions) ? map.regions : [];
    var index = state.mapSelectedRegionIndex;
    if (!(index >= 0 && index < regions.length)) { setStatus('未选中地块，请先在地图上点一个地块。', 'warn'); return null; }
    var ownerSel = document.querySelector('[data-map-sel-owner]');
    var currentSel = document.querySelector('[data-map-sel-current]');
    var adminInput = document.querySelector('[data-map-sel-admin]');
    var owner = ownerSel ? ownerSel.value : '';
    var current = currentSel ? currentSel.value : owner;
    var admin = adminInput ? adminInput.value : '';
    var name = regions[index].name || regions[index].id || ('#' + (index + 1));
    return applyMapPatch(function(m) {
      var region = m.regions[index];
      if (!region) return;
      region.ownerKey = owner;
      region.currentOwnerKey = current || owner;
      region.controllerKey = current || owner || region.controllerKey || '';
      if (admin) region.adminBinding = admin;
    }, { field: field, label: '改地块归属', detail: name, status: '已改「' + name + '」归属并上色：' + (owner || '（无主）') });
  }

  function renderMapBindingWorkbench(field, value) {`,
'helpers+functions');

// ── E1：visualRegions 加 selIdx + 可点选 + 高亮 + regionSvgPath ──
once(
`    var visualRegions = regions.concat(oceans).slice(0, 80).map(function(region, index) {
      var d = region && (region.path || region.d) || '';
      if (!d) return '';
      var color = oceans.indexOf(region) >= 0 ? '#244760' : mapFactionColor(map, region.ownerKey || region.currentOwnerKey || region.controllerKey, index);
      return '<path data-map-preview-index="' + index + '" d="' + escapeHtml(d) + '" fill="' + escapeHtml(color) + '" opacity="' + (oceans.indexOf(region) >= 0 ? '.38' : '.72') + '"><title>' + escapeHtml(region.name || region.id || '') + '</title></path>';
    }).join('');`,
`    var selIdx = (typeof state.mapSelectedRegionIndex === 'number' && state.mapSelectedRegionIndex >= 0 && state.mapSelectedRegionIndex < regions.length) ? state.mapSelectedRegionIndex : -1;
    var visualRegions = regions.concat(oceans).slice(0, 80).map(function(region, index) {
      var d = regionSvgPath(region);
      if (!d) return '';
      var isOcean = oceans.indexOf(region) >= 0;
      var color = isOcean ? '#244760' : mapFactionColor(map, region.ownerKey || region.currentOwnerKey || region.controllerKey, index);
      var selected = !isOcean && index === selIdx;
      var op = isOcean ? '.38' : (selected ? '1' : '.72');
      var pick = isOcean ? '' : ' data-editor-command="select-map-region" data-map-region-index="' + index + '" style="cursor:pointer"';
      var stroke = selected ? ' stroke="#f4d77a" stroke-width="3" stroke-linejoin="round"' : '';
      return '<path data-map-preview-index="' + index + '"' + pick + ' d="' + escapeHtml(d) + '" fill="' + escapeHtml(color) + '" opacity="' + op + '"' + stroke + '><title>' + escapeHtml(region.name || region.id || '') + '</title></path>';
    }).join('');`,
'visualRegions-interactive');

// ── E2：unbound 之后加 selRegion + selectedStrip ──
once(
`    var unbound = regions.filter(function(region) { return !region.ownerKey || !region.currentOwnerKey || !region.adminBinding; }).length;`,
`    var unbound = regions.filter(function(region) { return !region.ownerKey || !region.currentOwnerKey || !region.adminBinding; }).length;
    var selRegion = selIdx >= 0 ? regions[selIdx] : null;
    var selectedStrip = selRegion
      ? '<div class="map-selected-strip" style="margin-top:8px;padding:8px 10px;background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.4);border-radius:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px">' +
          '<strong>选中 · ' + escapeHtml(selRegion.name || selRegion.id || ('地块 #' + (selIdx + 1))) + '</strong>' +
          '<label>归属 <select data-map-sel-owner>' + mapFactionOptions(map, selRegion.ownerKey || selRegion.currentOwnerKey || '') + '</select></label>' +
          '<label>现控 <select data-map-sel-current>' + mapFactionOptions(map, selRegion.currentOwnerKey || selRegion.ownerKey || '') + '</select></label>' +
          '<label>行政 <input data-map-sel-admin value="' + escapeHtml(selRegion.adminBinding || '') + '" placeholder="行政绑定" style="width:96px"></label>' +
          '<button class="ai-button" data-editor-command="apply-selected-region-owner">应用归属并上色</button>' +
          '<button class="mini-ai" data-editor-command="clear-map-selection">取消选择</button>' +
        '</div>'
      : '<div class="map-selected-strip" style="margin-top:8px;font-size:12px;opacity:.6">点地图上的地块即可选中、改归属并即时上色。</div>';`,
'selectedStrip');

// ── E3：预览区 section 末尾挂 selectedStrip ──
once(
`'<section class="map-preview-panel"><svg class="map-mini-svg" viewBox="0 0 ' + escapeHtml(width) + ' ' + escapeHtml(height) + '" aria-label="地图归属预览">' + visualRegions + '</svg><div class="map-legend">' + legend + '</div></section>',`,
`'<section class="map-preview-panel"><svg class="map-mini-svg" viewBox="0 0 ' + escapeHtml(width) + ' ' + escapeHtml(height) + '" aria-label="地图归属预览">' + visualRegions + '</svg><div class="map-legend">' + legend + '</div>' + selectedStrip + '</section>',`,
'preview-strip');

// ── E5：命令分发 ──
once(
`    if (command === 'launch-map-editor') launchMapEditor();
`,
`    if (command === 'launch-map-editor') launchMapEditor();
    if (command === 'select-map-region') selectMapRegion(Number(target && target.dataset && target.dataset.mapRegionIndex));
    if (command === 'apply-selected-region-owner') applySelectedRegionOwner();
    if (command === 'clear-map-selection') clearMapSelection();
`,
'dispatch');

// ── E6：导出供 e2e ──
once(
`    launchMapEditor: launchMapEditor,
    ingestMapReturn: ingestMapReturn,
`,
`    launchMapEditor: launchMapEditor,
    ingestMapReturn: ingestMapReturn,
    selectMapRegion: selectMapRegion,
    applySelectedRegionOwner: applySelectedRegionOwner,
`,
'export');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
console.log('delta:', s.length - orig.length, 'chars');
