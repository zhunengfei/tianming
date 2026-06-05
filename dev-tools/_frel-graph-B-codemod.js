// 可视化编辑器 B：势力外交关系图谱（游戏不渲染的内容→可视+就地编辑）。势力章主视图。
// 点连线改关系(类型/倾向/说明/删除)+recolor；点势力再点另一势力建新关系。复用 buildFactionRelationGraph/relationTypeOptions。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n + ' (need 1)'); s = s.replace(a, b); edits.push(t); }
function exactly(a, b, t, k) { const n = s.split(a).length - 1; if (n !== k) throw new Error('ANCHOR ' + t + ' x' + n + ' (need ' + k + ')'); s = s.split(a).join(b); edits.push(t + 'x' + k); }

// E0：主视图 host id 通名化 renwu-folio-primary → module-primary-view（人物 A 刀里用的，B 也要用同一个 host）
exactly(`renwu-folio-primary`, `module-primary-view`, 'rename-host', 2);

// E1：modulePrimaryView 增 factionsSociety 分支
once(
`    if (moduleId === 'peopleLineages') return renderCharacterFolio();
    return null;`,
`    if (moduleId === 'peopleLineages') return renderCharacterFolio();
    if (moduleId === 'factionsSociety') return renderFactionRelationFolio();
    return null;`,
'primary-faction');

// E2：势力关系图谱渲染 + 就地编辑（插在 renderCharacterFolio 前）
once(
`  function renderCharacterFolio() {`,
String.raw`  // ── 可视化编辑 B · 势力外交关系图谱（不可见内容可视化·就地编辑）──
  function reRenderModulePrimary() {
    var host = document.getElementById('module-primary-view');
    if (host) host.innerHTML = modulePrimaryView(state.selectedModuleId) || '';
    else renderAll();
  }
  function saveFactionRelationField(index, field, raw) {
    var rows = state.scenario.factionRelations;
    if (!Array.isArray(rows) || !rows[index]) return;
    setEntityProp(rows[index], field, raw, 'factionRelations');
    recordHistory('外交关系编辑', (rows[index].from || '?') + '↔' + (rows[index].to || '?') + ' · ' + field);
    reRenderModulePrimary();
  }
  function selectFrelEdge(index) { state._frelSelEdge = index; state._frelSelNode = null; reRenderModulePrimary(); }
  function clearFrelSel() { state._frelSelEdge = -1; state._frelSelNode = null; reRenderModulePrimary(); }
  function deleteFrelEdge(index) {
    var rows = state.scenario.factionRelations;
    if (!Array.isArray(rows) || !rows[index]) return;
    var r = rows[index];
    rows.splice(index, 1);
    recordHistory('删除外交关系', (r.from || '?') + '↔' + (r.to || '?'));
    state._frelSelEdge = -1; state._frelSelNode = null;
    reRenderModulePrimary();
  }
  function addFactionRelation(from, to) {
    if (!from || !to || from === to) return;
    if (!Array.isArray(state.scenario.factionRelations)) state.scenario.factionRelations = [];
    var rows = state.scenario.factionRelations;
    var exist = -1;
    for (var i = 0; i < rows.length; i++) { if (rows[i] && rows[i].from === from && rows[i].to === to) { exist = i; break; } }
    if (exist < 0) {
      rows.push({ id: uniqueId('frel'), from: from, to: to, type: 'neutral', value: 0, desc: '' });
      exist = rows.length - 1;
      recordHistory('新增外交关系', from + '→' + to);
    }
    state._frelSelEdge = exist; state._frelSelNode = null;
    reRenderModulePrimary();
  }
  function tapFrelNode(name) {
    if (!name) return;
    if (!state._frelSelNode) { state._frelSelNode = name; state._frelSelEdge = -1; reRenderModulePrimary(); return; }
    if (state._frelSelNode === name) { state._frelSelNode = null; reRenderModulePrimary(); return; }
    addFactionRelation(state._frelSelNode, name);
  }
  function renderFactionRelationFolio() {
    var rows = Array.isArray(state.scenario.factionRelations) ? state.scenario.factionRelations : [];
    var graph = buildFactionRelationGraph(rows);
    var TONE = { ally: '#2d5848', neutral: '#9c8b6b', hostile: '#a83228' };
    var css = '<style>' +
      '.frel-wrap{padding:2px;font-family:"KaiTi","STKaiti","Noto Serif SC",serif}' +
      '.frel-head{font:600 13px/1.6 inherit;color:#7d5e22;margin:2px 2px 8px}' +
      '.frel-stage{background:linear-gradient(160deg,#fffdf3,#f6efda);border:1px solid #dcc99c;border-radius:12px;padding:6px;box-shadow:0 2px 10px rgba(58,40,22,.1)}' +
      '.frel-svg{width:100%;height:auto;display:block;max-height:58vh}' +
      '.frel-svg text{pointer-events:none}' +
      '.frel-edit{margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:12px;color:#574733;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.35);border-radius:8px;padding:8px 12px}' +
      '.frel-edit.frel-hint{color:#9c8b6b;background:transparent;border-color:transparent}' +
      '.frel-edit b{color:#7a2018}' +
      '.frel-sel,.frel-in{border:1px solid #dcc99c;border-radius:6px;background:rgba(255,252,242,.85);font:inherit;color:#241d15;padding:2px 5px}' +
      '.frel-legend{margin-top:6px;font-size:11px;color:#9c8b6b;display:flex;gap:14px}' +
      '.frel-legend i{display:inline-block;width:16px;height:3px;border-radius:2px;vertical-align:middle;margin-right:4px}' +
    '</style>';
    if (!graph.nodes.length) return css + '<div class="frel-wrap"><div class="frel-head">本剧本暂无势力。先去补势力库，关系图谱才能显示。</div></div>';
    var selEdge = (typeof state._frelSelEdge === 'number') ? state._frelSelEdge : -1;
    var selNode = state._frelSelNode || '';
    var edgeHtml = graph.edges.map(function(edge) {
      var from = graph.byId[edge.from], to = graph.byId[edge.to];
      if (!from || !to) return '';
      var col = TONE[edge.tone] || '#9c8b6b';
      var w = 1.4 + Math.min(4, Math.abs(edge.value) / 26);
      var sel = edge.index === selEdge;
      return '<g data-editor-command="frel-select-edge" data-frel-index="' + edge.index + '" style="cursor:pointer">' +
        '<line x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '" stroke="' + col + '" stroke-width="' + (sel ? (w + 2).toFixed(1) : w.toFixed(1)) + '" stroke-opacity="' + (sel ? '1' : '.72') + '"' + (sel ? ' stroke-dasharray="5 3"' : '') + '></line>' +
        '<line x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '" stroke="transparent" stroke-width="13"></line>' +
        '<title>' + escapeHtml(edge.from + ' → ' + edge.to + ' · ' + edge.type + ' · ' + edge.value) + '</title></g>';
    }).join('');
    var nodeHtml = graph.nodes.map(function(node) {
      var sel = node.id === selNode;
      var r = node.degree > 4 ? 17 : 14;
      var tone = relationTone(node.score);
      var col = tone === 'ally' ? '#2d5848' : tone === 'hostile' ? '#a83228' : '#7d5e22';
      return '<g data-editor-command="frel-tap-node" data-frel-node="' + escapeHtml(node.id) + '" transform="translate(' + node.x + ' ' + node.y + ')" style="cursor:pointer">' +
        '<circle r="' + r + '" fill="' + (sel ? '#fff3e0' : '#fffdf3') + '" stroke="' + (sel ? '#a83228' : col) + '" stroke-width="' + (sel ? 3 : 1.8) + '"></circle>' +
        '<text text-anchor="middle" dy="4" font-size="10" fill="#241d15">' + escapeHtml(compactRelationLabel(node.label)) + '</text>' +
        '<title>' + escapeHtml(node.label + ' · ' + node.degree + ' 条关系') + '</title></g>';
    }).join('');
    var svg = '<svg class="frel-svg" viewBox="0 0 420 280" preserveAspectRatio="xMidYMid meet" role="img" aria-label="势力外交关系图谱">' + edgeHtml + nodeHtml + '</svg>';
    var strip;
    if (selEdge >= 0 && rows[selEdge]) {
      var r0 = rows[selEdge];
      strip = '<div class="frel-edit">' +
        '<b>' + escapeHtml(r0.from || '?') + ' ↔ ' + escapeHtml(r0.to || '?') + '</b>' +
        '<label>类型 <select class="frel-sel" data-frel-edit="' + selEdge + '" data-frel-field="type">' + relationTypeOptions(r0.type || 'neutral') + '</select></label>' +
        '<label>倾向 <input class="frel-in" type="number" min="-100" max="100" style="width:5em" data-frel-edit="' + selEdge + '" data-frel-field="value" value="' + escapeHtml(r0.value != null ? r0.value : 0) + '"></label>' +
        '<label>说明 <input class="frel-in" style="width:12em" data-frel-edit="' + selEdge + '" data-frel-field="desc" value="' + escapeHtml(r0.desc || '') + '" placeholder="一句话"></label>' +
        '<button class="ai-button" data-editor-command="frel-delete-edge" data-frel-index="' + selEdge + '">删除此关系</button>' +
        '<button class="mini-ai" data-editor-command="frel-clear-sel">完成</button>' +
      '</div>';
    } else if (selNode) {
      strip = '<div class="frel-edit"><b>已选「' + escapeHtml(selNode) + '」</b><span>— 再点另一个势力，即在两者间建立关系</span><button class="mini-ai" data-editor-command="frel-clear-sel">取消</button></div>';
    } else {
      strip = '<div class="frel-edit frel-hint">点一条连线改关系（类型 / 倾向 / 说明 / 删除）；点一个势力、再点另一个，建立新关系。</div>';
    }
    var legend = '<div class="frel-legend"><span><i style="background:#2d5848"></i>同盟/友好</span><span><i style="background:#9c8b6b"></i>中立/贸易</span><span><i style="background:#a83228"></i>敌对/战争</span><span>线越粗，倾向越强</span></div>';
    var head = '<div class="frel-head">势力外交图谱 · ' + graph.nodes.length + ' 势力 · ' + graph.edges.length + ' 关系 · 盟 ' + graph.summary.ally + ' / 中 ' + graph.summary.neutral + ' / 敌 ' + graph.summary.hostile + '</div>';
    return css + '<div class="frel-wrap">' + head + '<div class="frel-stage">' + svg + '</div>' + strip + legend + '</div>';
  }

  function renderCharacterFolio() {`,
'frel-functions');

// E3：命令分发（接在 clear-map-selection 后）
once(
`    if (command === 'clear-map-selection') clearMapSelection();
`,
`    if (command === 'clear-map-selection') clearMapSelection();
    if (command === 'frel-select-edge') selectFrelEdge(Number(target && target.dataset && target.dataset.frelIndex));
    if (command === 'frel-tap-node') tapFrelNode(target && target.dataset && target.dataset.frelNode);
    if (command === 'frel-delete-edge') deleteFrelEdge(Number(target && target.dataset && target.dataset.frelIndex));
    if (command === 'frel-clear-sel') clearFrelSel();
`,
'dispatch');

// E4：就地编辑 change 监听（接在 folio change 监听后）
once(
`    document.addEventListener('change', function(event) {
      var fel = event.target && event.target.closest && event.target.closest('[data-folio-char]');
      if (!fel) return;
      saveFolioField(Number(fel.dataset.folioChar), fel.dataset.folioField, fel.value);
    });`,
`    document.addEventListener('change', function(event) {
      var fel = event.target && event.target.closest && event.target.closest('[data-folio-char]');
      if (!fel) return;
      saveFolioField(Number(fel.dataset.folioChar), fel.dataset.folioField, fel.value);
    });
    document.addEventListener('change', function(event) {
      var rel = event.target && event.target.closest && event.target.closest('[data-frel-edit]');
      if (!rel) return;
      saveFactionRelationField(Number(rel.dataset.frelEdit), rel.dataset.frelField, rel.value);
    });`,
'change-listener');

// E5：导出供 e2e
once(
`    renderCharacterFolio: renderCharacterFolio,
    saveFolioField: saveFolioField,
`,
`    renderCharacterFolio: renderCharacterFolio,
    saveFolioField: saveFolioField,
    renderFactionRelationFolio: renderFactionRelationFolio,
    selectFrelEdge: selectFrelEdge,
    tapFrelNode: tapFrelNode,
    saveFactionRelationField: saveFactionRelationField,
`,
'export');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
console.log('delta:', s.length - orig.length, 'chars');
