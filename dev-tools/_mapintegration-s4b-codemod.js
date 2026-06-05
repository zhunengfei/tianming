// 地图接入 · 刀4b：轻调形 —— 拖现有顶点改省界。装一次的 document mousedown/move/up 监听，
// SVG 坐标用 getScreenCTM().inverse() 换算；落点 commit 经 applyMapPatch，同步回写 polygon/path/coords/points。
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

// ── E1：4b 模块变量 + 函数，插在 regionSvgPath 前 ──
once(
`  // 从 path / coords(flat) / polygon([[x,y]]) 任一几何派生 SVG path`,
`  // ── 轻调形·拖现有顶点改省界（刀4b·④）·落点经 applyMapPatch 同步回写 polygon/path/coords ──
  var _vertexDragArmed = false;
  var _vertexDrag = null;
  var _vertexDragEndAt = 0;

  // 顶点取值·与 regionSvgPath 显示同源（优先解析 path，保证手柄落在显示形状的角上）
  function regionVertices(region) {
    if (!region) return [];
    var d = region.path || region.d;
    if (typeof d === 'string' && d) {
      var nums = (d.match(/-?\\d+(\\.\\d+)?/g) || []).map(Number);
      var pts = []; for (var i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
      if (pts.length >= 3) return pts;
    }
    if (Array.isArray(region.polygon) && region.polygon.length >= 3 && Array.isArray(region.polygon[0])) return region.polygon.map(function(p) { return [p[0], p[1]]; });
    if (Array.isArray(region.coords) && region.coords.length >= 6) { var o = []; for (var j = 0; j + 1 < region.coords.length; j += 2) o.push([region.coords[j], region.coords[j + 1]]); return o; }
    if (Array.isArray(region.points) && region.points.length >= 3 && Array.isArray(region.points[0])) return region.points.map(function(p) { return [p[0], p[1]]; });
    return [];
  }

  function buildSvgPath(points) {
    if (!points || points.length < 2) return '';
    return 'M' + points.map(function(p) { return p[0] + ' ' + p[1]; }).join(' L') + ' Z';
  }

  function svgPointFromEvent(svg, e) {
    try {
      var pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var ctm = svg.getScreenCTM();
      if (!ctm) return null;
      return pt.matrixTransform(ctm.inverse());
    } catch (err) { return null; }
  }

  function liveUpdateVertexPreview() {
    if (!_vertexDrag) return;
    var svg = _vertexDrag.svg, pts = _vertexDrag.points, vi = _vertexDrag.vertexIdx;
    var handle = svg.querySelector('[data-map-vertex="' + vi + '"]');
    if (handle) { handle.setAttribute('cx', pts[vi][0]); handle.setAttribute('cy', pts[vi][1]); }
    var path = svg.querySelector('[data-map-region-index="' + _vertexDrag.regionIndex + '"][data-editor-command="select-map-region"]');
    if (path) path.setAttribute('d', buildSvgPath(pts));
  }

  function commitVertexDrag(regionIndex, points) {
    var field = state.selectedField;
    return applyMapPatch(function(m) {
      var region = m.regions[regionIndex];
      if (!region) return;
      var path = buildSvgPath(points);
      region.polygon = points.map(function(p) { return [p[0], p[1]]; });
      region.path = path;
      if (region.d != null) region.d = path;
      if (Array.isArray(region.coords)) { var flat = []; points.forEach(function(p) { flat.push(p[0], p[1]); }); region.coords = flat; }
      if (Array.isArray(region.points)) region.points = points.map(function(p) { return [p[0], p[1]]; });
      region.centroid = null;
    }, { field: field, normalize: false, label: '轻调地块形状', detail: '地块 #' + (regionIndex + 1) + ' · ' + points.length + ' 顶点', status: '已调整地块形状：' + points.length + ' 顶点' });
  }

  function ensureVertexDragListeners() {
    if (_vertexDragArmed || !document.addEventListener) return;
    _vertexDragArmed = true;
    document.addEventListener('mousedown', function(e) {
      var handle = e.target && e.target.closest && e.target.closest('[data-map-vertex]');
      if (!handle) return;
      var svg = handle.closest('svg.map-mini-svg');
      if (!svg) return;
      var field = state.selectedField;
      var map = state.scenario[field];
      var regions = isObject(map) && Array.isArray(map.regions) ? map.regions : [];
      var idx = state.mapSelectedRegionIndex;
      if (!(idx >= 0 && idx < regions.length)) return;
      e.preventDefault();
      _vertexDrag = { svg: svg, regionIndex: idx, vertexIdx: Number(handle.dataset.mapVertex), points: regionVertices(regions[idx]), moved: false };
    });
    document.addEventListener('mousemove', function(e) {
      if (!_vertexDrag) return;
      var loc = svgPointFromEvent(_vertexDrag.svg, e);
      if (!loc) return;
      _vertexDrag.points[_vertexDrag.vertexIdx] = [Math.round(loc.x), Math.round(loc.y)];
      _vertexDrag.moved = true;
      liveUpdateVertexPreview();
    });
    document.addEventListener('mouseup', function() {
      if (!_vertexDrag) return;
      var drag = _vertexDrag;
      _vertexDrag = null;
      if (drag.moved) { commitVertexDrag(drag.regionIndex, drag.points); _vertexDragEndAt = Date.now(); }
    });
  }

  // 从 path / coords(flat) / polygon([[x,y]]) 任一几何派生 SVG path`,
'helpers-4b');

// ── E2：selectMapRegion 加「刚拖完吞掉误触选择」守卫 ──
once(
`  function selectMapRegion(index) {
    var field = state.selectedField;`,
`  function selectMapRegion(index) {
    if (_vertexDragEndAt && (Date.now() - _vertexDragEndAt) < 250) return;
    var field = state.selectedField;`,
'select-guard');

// ── E3：renderMapBindingWorkbench 开头武装拖拽监听 ──
once(
`  function renderMapBindingWorkbench(field, value) {
    var map = isObject(value) ? value : {};`,
`  function renderMapBindingWorkbench(field, value) {
    ensureVertexDragListeners();
    var map = isObject(value) ? value : {};`,
'arm-listeners');

// ── E4：selectedStrip 之后构造 vertexHandles ──
once(
`      : '<div class="map-selected-strip" style="margin-top:8px;font-size:12px;opacity:.6">点地图上的地块即可选中、改归属并即时上色。</div>';`,
`      : '<div class="map-selected-strip" style="margin-top:8px;font-size:12px;opacity:.6">点地图上的地块即可选中、改归属并即时上色；选中后可拖金色顶点轻调省界。</div>';
    var vertexHandles = '';
    if (selRegion) {
      var hr = Math.max(7, Math.round(width / 110));
      vertexHandles = regionVertices(selRegion).slice(0, 400).map(function(pt, i) {
        return '<circle data-map-vertex="' + i + '" cx="' + pt[0] + '" cy="' + pt[1] + '" r="' + hr + '" fill="#f4d77a" stroke="#1a1206" stroke-width="1.5" style="cursor:grab"></circle>';
      }).join('');
    }`,
'vertexHandles');

// ── E5：把 vertexHandles 塞进 SVG（顶点画在地块之上） ──
once(
` + visualRegions + '</svg><div class="map-legend">'`,
` + visualRegions + vertexHandles + '</svg><div class="map-legend">'`,
'svg-insert');

// ── E6：导出 ──
once(
`    selectMapRegion: selectMapRegion,
    applySelectedRegionOwner: applySelectedRegionOwner,
`,
`    selectMapRegion: selectMapRegion,
    applySelectedRegionOwner: applySelectedRegionOwner,
    regionVertices: regionVertices,
    commitVertexDrag: commitVertexDrag,
`,
'export');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
console.log('delta:', s.length - orig.length, 'chars');
