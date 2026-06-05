// B-2 节点拖拽：势力关系图谱节点可拖（session 持久 state._frelPos）。复用 svgPointFromEvent(4b)。
// 拖中直接改 SVG(节点 transform + 连边端点)不全渲染；松手一次性 reRenderModulePrimary。拖后守卫吞掉误触 tap。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// E1：拖拽监听 + 变量（插在 renderFactionRelationFolio 前）
once(
`  function renderFactionRelationFolio() {`,
String.raw`  var _frelDragArmed = false, _frelDrag = null, _frelDragEndAt = 0;
  function ensureFrelDragListeners() {
    if (_frelDragArmed || !document.addEventListener) return;
    _frelDragArmed = true;
    document.addEventListener('mousedown', function (e) {
      var g = e.target && e.target.closest && e.target.closest('[data-frel-node]');
      if (!g) return;
      var svg = g.closest('svg.frel-svg');
      if (!svg) return;
      e.preventDefault();
      var name = g.dataset.frelNode, conn = [];
      Array.prototype.forEach.call(svg.querySelectorAll('[data-frel-index]'), function (eg) {
        var f = eg.getAttribute('data-frel-from'), t = eg.getAttribute('data-frel-to');
        if (f === name) conn.push({ eg: eg, end: 'from' });
        else if (t === name) conn.push({ eg: eg, end: 'to' });
      });
      _frelDrag = { svg: svg, name: name, g: g, conn: conn, moved: false };
    });
    document.addEventListener('mousemove', function (e) {
      if (!_frelDrag) return;
      var loc = svgPointFromEvent(_frelDrag.svg, e);
      if (!loc) return;
      var x = Math.round(loc.x), y = Math.round(loc.y);
      if (!state._frelPos) state._frelPos = {};
      state._frelPos[_frelDrag.name] = [x, y];
      _frelDrag.moved = true;
      _frelDrag.g.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
      _frelDrag.conn.forEach(function (c) {
        Array.prototype.forEach.call(c.eg.querySelectorAll('line'), function (ln) {
          if (c.end === 'from') { ln.setAttribute('x1', x); ln.setAttribute('y1', y); }
          else { ln.setAttribute('x2', x); ln.setAttribute('y2', y); }
        });
      });
    });
    document.addEventListener('mouseup', function () {
      if (!_frelDrag) return;
      var moved = _frelDrag.moved;
      _frelDrag = null;
      if (moved) { reRenderModulePrimary(); _frelDragEndAt = Date.now(); }
    });
  }

  function renderFactionRelationFolio() {`,
'drag-listeners');

// E2：tapFrelNode 加拖后守卫
once(
`  function tapFrelNode(name) {
    if (!name) return;`,
`  function tapFrelNode(name) {
    if (!name) return;
    if (_frelDragEndAt && (Date.now() - _frelDragEndAt) < 300) return;`,
'tap-guard');

// E3：渲染时武装拖拽 + 应用持久位置
once(
`    var rows = Array.isArray(state.scenario.factionRelations) ? state.scenario.factionRelations : [];
    var graph = buildFactionRelationGraph(rows);`,
`    var rows = Array.isArray(state.scenario.factionRelations) ? state.scenario.factionRelations : [];
    ensureFrelDragListeners();
    var graph = buildFactionRelationGraph(rows);
    if (state._frelPos) graph.nodes.forEach(function (n) { var p = state._frelPos[n.id]; if (p) { n.x = p[0]; n.y = p[1]; } });`,
'apply-pos');

// E4：边 <g> 带 from/to 名（拖拽时定位连边端点）
once(
`      return '<g data-editor-command="frel-select-edge" data-frel-index="' + edge.index + '" style="cursor:pointer">' +`,
`      return '<g data-editor-command="frel-select-edge" data-frel-index="' + edge.index + '" data-frel-from="' + escapeHtml(edge.from) + '" data-frel-to="' + escapeHtml(edge.to) + '" style="cursor:pointer">' +`,
'edge-fromto');

// E5：节点 cursor 提示可拖
once(
`'<g data-editor-command="frel-tap-node" data-frel-node="' + escapeHtml(node.id) + '" transform="translate(' + node.x + ' ' + node.y + ')" style="cursor:pointer">' +`,
`'<g data-editor-command="frel-tap-node" data-frel-node="' + escapeHtml(node.id) + '" transform="translate(' + node.x + ' ' + node.y + ')" style="cursor:grab">' +`,
'node-cursor');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
