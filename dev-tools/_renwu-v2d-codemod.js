// 列传 v2d：#1 立绘点击修(sel兜底) #2 特质可增删。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// 当前选中角色兜底 + traits 增删 + 立绘修（替换 pickFolioPortrait 整体）
once(
`  function pickFolioPortrait() {
    var sel = state._folioSel, chars = state.scenario.characters;
    if (!Array.isArray(chars) || !chars[sel]) return;
    var cur = chars[sel].portrait || '';
    var v = global.prompt ? global.prompt('立绘路径（相对 web 根，如 assets/portraits/tianqi7/' + (chars[sel].name || '') + '.png）：', cur) : null;
    if (v == null) return;
    saveCharFolioField(sel, 'portrait', String(v).trim());
  }`,
`  function _folioCurChar() {
    var sel = (typeof state._folioSel === 'number' && state._folioSel >= 0) ? state._folioSel : 0;
    var chars = state.scenario.characters;
    return (Array.isArray(chars) && chars[sel]) ? { c: chars[sel], i: sel } : null;
  }
  function pickFolioPortrait() {
    var h = _folioCurChar(); if (!h) return;
    var v = global.prompt ? global.prompt('立绘路径（相对 web 根，如 assets/portraits/tianqi7/' + (h.c.name || '') + '.png）：', h.c.portrait || '') : null;
    if (v == null) return;
    saveCharFolioField(h.i, 'portrait', String(v).trim());
  }
  function traitAddOptions(existing) {
    var ex = {}; (existing || []).forEach(function (t) { ex[t] = 1; });
    var opts = [];
    Object.keys(TRAIT_LABELS).forEach(function (id) { if (!ex[id]) opts.push([id, TRAIT_LABELS[id]]); });
    var defs = state.scenario.traitDefinitions;
    if (Array.isArray(defs)) defs.forEach(function (d) { if (d && d.id && !ex[d.id] && !TRAIT_LABELS[d.id]) opts.push([d.id, d.name || d.id]); });
    return opts.map(function (o) { return '<option value="' + escapeHtml(o[0]) + '">' + escapeHtml(o[1]) + '</option>'; }).join('');
  }
  function addCharTrait(id) {
    var h = _folioCurChar(); if (!h || !id) return;
    if (!Array.isArray(h.c.traits)) h.c.traits = [];
    if (h.c.traits.indexOf(id) < 0) { h.c.traits.push(id); recordHistory('列传编辑', (h.c.name || '') + ' · 加特质 ' + traitCnLabel(id)); reRenderModulePrimary(); }
  }
  function delCharTrait(id) {
    var h = _folioCurChar(); if (!h || !id || !Array.isArray(h.c.traits)) return;
    h.c.traits = h.c.traits.filter(function (t) { return t !== id; });
    recordHistory('列传编辑', (h.c.name || '') + ' · 删特质 ' + traitCnLabel(id));
    reRenderModulePrimary();
  }`,
'folio-cur+traits-ops');

// #2 traits 渲染改为可增删
once(
`    if (key === 'traits') {
      var ids = Array.isArray(v) ? v : (v ? [v] : []);
      var chips = ids.map(function (t) { return '<span class="rwf2-trait" title="' + escapeHtml(t) + '">' + escapeHtml(traitCnLabel(t)) + '</span>'; }).join('');
      return '<span class="rwf2-traits">' + (chips || '<i class="rwf2-na">（无·在高级表单加）</i>') + '</span>';
    }`,
`    if (key === 'traits') {
      var ids = Array.isArray(v) ? v : (v ? [v] : []);
      var chips = ids.map(function (t) { return '<span class="rwf2-trait" title="' + escapeHtml(t) + '">' + escapeHtml(traitCnLabel(t)) + '<a class="rwf2-tx" data-editor-command="folio-trait-del" data-trait-id="' + escapeHtml(t) + '" title="移除">×</a></span>'; }).join('');
      return '<span class="rwf2-traits">' + chips + '<select class="rwf2-tadd" data-folio-trait-add><option value="">＋加特质</option>' + traitAddOptions(ids) + '</select></span>';
    }`,
'traits-editable');

// 分发 folio-trait-del
once(
`    if (command === 'folio-pick-portrait') pickFolioPortrait();`,
`    if (command === 'folio-pick-portrait') pickFolioPortrait();
    if (command === 'folio-trait-del') delCharTrait(target && target.dataset && target.dataset.traitId);`,
'dispatch-trait-del');

// 加特质 select 的 change 监听（接在 folio change 监听里）
once(
`    document.addEventListener('change', function(event) {
      var fel = event.target && event.target.closest && event.target.closest('[data-folio-char]');
      if (!fel) return;
      saveCharFolioField(Number(fel.dataset.folioChar), fel.dataset.folioField, fel.type === 'checkbox' ? fel.checked : fel.value);
    });`,
`    document.addEventListener('change', function(event) {
      var fel = event.target && event.target.closest && event.target.closest('[data-folio-char]');
      if (fel) { saveCharFolioField(Number(fel.dataset.folioChar), fel.dataset.folioField, fel.type === 'checkbox' ? fel.checked : fel.value); return; }
      var tadd = event.target && event.target.closest && event.target.closest('[data-folio-trait-add]');
      if (tadd && tadd.value) { addCharTrait(tadd.value); }
    });`,
'trait-add-listener');

// CSS：chip 移除 × + 加特质 select
once(
`      '.rwf2-trait{font-size:11px;padding:1px 8px;border-radius:9px;border:1px solid #c9a84c;background:rgba(255,250,235,.8);color:#7d5e22}' +`,
`      '.rwf2-trait{font-size:11px;padding:1px 6px 1px 8px;border-radius:9px;border:1px solid #c9a84c;background:rgba(255,250,235,.8);color:#7d5e22;display:inline-flex;align-items:center;gap:3px}' +
      '.rwf2-tx{cursor:pointer;color:#a83228;font-weight:700;text-decoration:none;font-size:12px;line-height:1}' +
      '.rwf2-tadd{font-size:11px;border:1px dashed #c9a84c;border-radius:9px;background:rgba(255,252,242,.7);color:#7d5e22;padding:1px 4px;cursor:pointer}' +`,
'css-trait-edit');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
