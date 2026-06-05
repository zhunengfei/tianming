// 可视化编辑器 POC① ·「人物列传」：把 scenario.characters 渲成贴游戏(御案米金)的卡片，就地编辑、改完即见、国师改也实时刷。
// 新增工作台 tab「列传」+ renderCharacterFolio + 就地编辑 change 监听。走现有 detailPanelBlock 机制(同地图刀范式)。
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

// E1：新增「列传」工作台 tab
once(
`    { id: 'history-log', label: '记录', hint: '操作历史' },
`,
`    { id: 'history-log', label: '记录', hint: '操作历史' },
    { id: 'renwu-folio', label: '列传', hint: '人物可视编辑' },
`,
'panel-tab');

// E2：在面板列表挂载列传面板
once(
`      detailPanelBlock('specialist-editor', renderSpecialistEditor(state.selectedField, value)),
`,
`      detailPanelBlock('specialist-editor', renderSpecialistEditor(state.selectedField, value)),
      detailPanelBlock('renwu-folio', renderCharacterFolio()),
`,
'panel-mount');

// E3：列传渲染 + 就地编辑保存（插在 renderDetailApp 前）
once(
`  function renderDetailApp() {`,
String.raw`  // ── 可视化编辑 POC① · 人物列传（贴游戏御案米金卡片，就地编辑）──
  var FOLIO_ABIL = [['intelligence','智'],['valor','勇'],['military','军'],['administration','政'],['management','治'],['charisma','魅'],['diplomacy','交'],['benevolence','仁'],['integrity','廉'],['loyalty','忠']];
  function folioColorFor(name) {
    var pal = ['#a8833a','#a83228','#2d5848','#4a5e8a','#8e6aa8','#7d5e22','#6fa291','#b83a2b'];
    var str = String(name || ''), h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return pal[h % pal.length];
  }
  function folioFactionOptions(selected) {
    var names = (Array.isArray(state.scenario.factions) ? state.scenario.factions : []).map(function(f) { return f && (f.name || f.id); }).filter(Boolean);
    if (selected && names.indexOf(selected) < 0) names.unshift(selected);
    return '<option value="">（无）</option>' + names.map(function(n) { return '<option value="' + escapeHtml(n) + '"' + (n === selected ? ' selected' : '') + '>' + escapeHtml(n) + '</option>'; }).join('');
  }
  function folioGenderOptions(selected) {
    return ['', '男', '女'].map(function(g) { return '<option value="' + escapeHtml(g) + '"' + (g === selected ? ' selected' : '') + '>' + escapeHtml(g || '·') + '</option>'; }).join('');
  }
  function folioCardHtml(c, i) {
    if (!c || typeof c !== 'object') return '';
    var color = folioColorFor(c.faction || c.family || c.name);
    function fin(field, val, ph, w) { return '<input class="rwf-in" data-folio-char="' + i + '" data-folio-field="' + field + '"' + (w ? ' style="width:' + w + '"' : '') + ' value="' + escapeHtml(val == null ? '' : val) + '"' + (ph ? ' placeholder="' + escapeHtml(ph) + '"' : '') + '>'; }
    var chips = '';
    if (c.isPlayer) chips += '<span class="rwf-chip" style="border-color:#a83228;color:#a83228">可玩</span>';
    if (c.isRoyal) chips += '<span class="rwf-chip" style="border-color:#7d5e22;color:#7d5e22">皇族</span>';
    var abil = FOLIO_ABIL.map(function(a) {
      var v = c[a[0]]; v = (typeof v === 'number') ? v : (v == null ? '' : v);
      return '<div class="rwf-ab"><b>' + a[1] + '</b><input type="number" min="0" max="100" data-folio-char="' + i + '" data-folio-field="' + a[0] + '" value="' + escapeHtml(v) + '"></div>';
    }).join('');
    return '<div class="rwf-card" style="--fc:' + color + '">' +
      '<div class="rwf-row">' +
        '<input class="rwf-name" data-folio-char="' + i + '" data-folio-field="name" value="' + escapeHtml(c.name || '') + '">' +
        fin('zi', c.zi, '字', '3.2em') + fin('haoName', c.haoName, '号', '3.6em') + chips +
      '</div>' +
      '<div class="rwf-row">' + fin('officialTitle', c.officialTitle, '官职', '8em') +
        '<select class="rwf-sel" data-folio-char="' + i + '" data-folio-field="faction">' + folioFactionOptions(c.faction || '') + '</select>' +
      '</div>' +
      '<div class="rwf-row">' +
        '<span class="rwf-lbl">年</span><input class="rwf-in" type="number" style="width:3em" data-folio-char="' + i + '" data-folio-field="age" value="' + escapeHtml(c.age == null ? '' : c.age) + '">' +
        '<select class="rwf-sel" data-folio-char="' + i + '" data-folio-field="gender">' + folioGenderOptions(c.gender || '') + '</select>' +
        fin('role', c.role, '定位', '6em') +
      '</div>' +
      '<div class="rwf-abil">' + abil + '</div>' +
    '</div>';
  }
  function renderCharacterFolio() {
    var chars = Array.isArray(state.scenario.characters) ? state.scenario.characters : [];
    var css = '<style>' +
      '.rwf-wrap{padding:2px}' +
      '.rwf-head{font:600 13px/1.6 "KaiTi","STKaiti","Noto Serif SC",serif;color:#7d5e22;margin:2px 2px 10px}' +
      '.rwf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px}' +
      '.rwf-card{position:relative;background:linear-gradient(120deg,#fffdf3,#f6efda 80%);border:1px solid #dcc99c;border-radius:10px;padding:11px 13px 12px 17px;overflow:hidden;box-shadow:0 2px 8px rgba(58,40,22,.12);font-family:"KaiTi","STKaiti","Noto Serif SC",serif;color:#241d15}' +
      '.rwf-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--fc,#a8833a)}' +
      '.rwf-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px}' +
      '.rwf-name{font-size:19px;font-weight:700;color:#7a2018;border:none;background:transparent;border-bottom:1px dashed transparent;width:5.2em;font-family:inherit}' +
      '.rwf-name:hover,.rwf-name:focus{border-bottom-color:#a8833a;outline:none;background:rgba(168,131,58,.08)}' +
      '.rwf-in{border:none;background:transparent;border-bottom:1px dashed transparent;color:#574733;font:inherit;font-size:12px;padding:1px 2px}' +
      '.rwf-in:hover,.rwf-in:focus{border-bottom-color:#a8833a;outline:none;background:rgba(168,131,58,.08)}' +
      '.rwf-lbl{font-size:10px;color:#9c8b6b}' +
      '.rwf-sel{border:1px solid #dcc99c;border-radius:6px;background:rgba(255,252,242,.7);font:inherit;font-size:12px;color:#574733;padding:1px 4px}' +
      '.rwf-chip{font-size:10px;padding:1px 7px;border-radius:9px;border:1px solid #a8833a;color:#7d5e22;background:rgba(255,250,235,.7)}' +
      '.rwf-abil{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin-top:8px;border-top:1px solid rgba(168,131,58,.2);padding-top:7px}' +
      '.rwf-ab{text-align:center}' +
      '.rwf-ab b{display:block;font-size:9px;color:#9c8b6b;font-weight:400}' +
      '.rwf-ab input{width:100%;text-align:center;border:none;background:transparent;color:#2d5848;font:inherit;font-size:13px;font-weight:700;border-radius:4px;-moz-appearance:textfield}' +
      '.rwf-ab input:hover,.rwf-ab input:focus{background:rgba(168,131,58,.12);outline:none}' +
    '</style>';
    if (!chars.length) return css + '<div class="rwf-wrap"><div class="rwf-head">本剧本暂无人物。可去「表单」新增，或让国师生成。</div></div>';
    var cards = chars.slice(0, 80).map(folioCardHtml).join('');
    return css + '<div class="rwf-wrap"><div class="rwf-head">列传 · ' + chars.length + ' 人' + (chars.length > 80 ? '（显示前 80）' : '') + ' · 点任一字段直接改，国师改也实时刷新；改势力即换色</div><div class="rwf-grid">' + cards + '</div></div>';
  }
  function saveFolioField(charIndex, field, raw) {
    var chars = state.scenario.characters;
    if (!Array.isArray(chars) || !chars[charIndex]) return;
    setEntityProp(chars[charIndex], field, raw, 'characters');
    recordHistory('列传编辑', (chars[charIndex].name || ('#' + charIndex)) + ' · ' + field);
    var panel = document.querySelector('[data-panel="renwu-folio"]');
    if (panel) panel.innerHTML = renderCharacterFolio();
    else renderAll();
  }

  function renderDetailApp() {`,
'folio-functions');

// E4：就地编辑 change 监听（接在 input 监听前）
once(
`    document.addEventListener('input', function(event) {
      if (event.target && event.target.id === 'entity-search') {`,
`    document.addEventListener('change', function(event) {
      var fel = event.target && event.target.closest && event.target.closest('[data-folio-char]');
      if (!fel) return;
      saveFolioField(Number(fel.dataset.folioChar), fel.dataset.folioField, fel.value);
    });
    document.addEventListener('input', function(event) {
      if (event.target && event.target.id === 'entity-search') {`,
'change-listener');

// E5：导出供 e2e
once(
`    applyMapPatch: applyMapPatch,
`,
`    applyMapPatch: applyMapPatch,
    renderCharacterFolio: renderCharacterFolio,
    saveFolioField: saveFolioField,
`,
'export');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
console.log('delta:', s.length - orig.length, 'chars');
