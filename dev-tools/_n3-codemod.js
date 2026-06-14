// N3 codemod — @提及作用域上下文（editor-authoring-agent-ui.js）。
const fs = require('fs');
const path = 'editor-authoring-agent-ui.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(anchor, repl, tag) {
  const n = s.split(anchor).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + tag + ' x' + n);
  s = s.replace(anchor, repl); edits.push(tag);
}

// 1) 模板：ctx 后加 mentions 行 + atpop 弹层
once("      '<div id=\"tm-aa-ctx\" hidden></div>',",
  "      '<div id=\"tm-aa-ctx\" hidden></div>',\n" +
  "      '<div id=\"tm-aa-mentions\" hidden></div>',\n" +
  "      '<div id=\"tm-aa-atpop\" hidden></div>',", 'tpl');

// 2) els
once("      ctx: panel.querySelector('#tm-aa-ctx'),",
  "      ctx: panel.querySelector('#tm-aa-ctx'),\n" +
  "      mentions: panel.querySelector('#tm-aa-mentions'),\n" +
  "      atpop: panel.querySelector('#tm-aa-atpop'),", 'els');

// 3) _editorContext 追加 mentions
once(
  "  function _editorContext() {\n" +
  "    if (ui._ctx && ui._ctx.pinned) return ui._ctx.value || '';\n" +
  "    return _liveEditorContext();\n" +
  "  }",
  "  function _editorContext() {\n" +
  "    var base = (ui._ctx && ui._ctx.pinned) ? (ui._ctx.value || '') : _liveEditorContext();\n" +
  "    if (ui._mentions && ui._mentions.length) base += (base ? '\\uFF1B' : '') + '\\u3010\\u7528\\u6237\\u5708\\u5b9a\\u3011' + ui._mentions.join('\\u3001');\n" +
  "    return base;\n" +
  "  }\n" +
  "  // N3 · @\\u63d0\\u53ca\\u4f5c\\u7528\\u57df\\u4e0a\\u4e0b\\u6587\\uFF1A@\\u5b9e\\u4f53/@\\u5b57\\u6bb5\\u8bfb\\u5f53\\u524d\\u5267\\u672c\\u5019\\u9009\\uFF0C\\u9009\\u4e2d\\u63d2\\u5165\\u540d\\u5b57+\\u8bb0 chip\\uFF0C\\u663e\\u5f0f\\u5708\\u5b9a AI \\u64cd\\u4f5c\\u8303\\u56f4\\u3002\n" +
  "  function _mentionCandidates(q) {\n" +
  "    var out = [];\n" +
  "    try {\n" +
  "      var sc = (ui.adapter && ui.adapter.getScenario) ? ui.adapter.getScenario() : null;\n" +
  "      if (sc) {\n" +
  "        ['characters', 'factions', 'events', 'rigidHistoryEvents', 'families', 'parties', 'items'].forEach(function (coll) {\n" +
  "          var arr = sc[coll];\n" +
  "          if (Array.isArray(arr)) arr.forEach(function (e) { var nm = e && (e.name || e.id || e.title); if (nm) out.push({ kind: '\\u5b9e\\u4f53', label: String(nm) }); });\n" +
  "        });\n" +
  "        Object.keys(sc).forEach(function (k) { out.push({ kind: '\\u5b57\\u6bb5', label: k }); });\n" +
  "      }\n" +
  "    } catch (e) {}\n" +
  "    var seen = {}, uniq = [];\n" +
  "    out.forEach(function (c) { if (!seen[c.label]) { seen[c.label] = 1; uniq.push(c); } });\n" +
  "    if (q) { var lq = q.toLowerCase(); uniq = uniq.filter(function (c) { return c.label.toLowerCase().indexOf(lq) >= 0; }); }\n" +
  "    return uniq.slice(0, 24);\n" +
  "  }\n" +
  "  function _renderMentionChips() {\n" +
  "    if (!ui.els || !ui.els.mentions) return;\n" +
  "    var m = ui._mentions || [];\n" +
  "    if (!m.length) { ui.els.mentions.hidden = true; ui.els.mentions.innerHTML = ''; return; }\n" +
  "    ui.els.mentions.hidden = false;\n" +
  "    ui.els.mentions.innerHTML = m.map(function (nm) { return '<span class=\"tm-aa-mchip\">@' + esc(nm) + '<button type=\"button\" class=\"tm-aa-mx\" data-m=\"' + esc(nm) + '\" title=\"\\u79fb\\u9664\">\\u00d7</button></span>'; }).join('');\n" +
  "  }\n" +
  "  function _addMention(nm) { if (!nm) return; if (!ui._mentions) ui._mentions = []; if (ui._mentions.indexOf(nm) < 0) ui._mentions.push(nm); _renderMentionChips(); if (ui._ctx) ui._ctx._sig = null; _refreshCtxChip(); }\n" +
  "  function _hideAtPop() { if (ui.els && ui.els.atpop) { ui.els.atpop.hidden = true; ui.els.atpop.innerHTML = ''; } ui._atActive = false; }\n" +
  "  function _atQueryAtCursor() {\n" +
  "    var ta = ui.els && ui.els.req; if (!ta) return null;\n" +
  "    var pos = ta.selectionStart, before = ta.value.slice(0, pos);\n" +
  "    var mm = before.match(/@([^\\s@\\u3000]*)$/);\n" +
  "    return mm ? { q: mm[1], start: pos - mm[0].length, end: pos } : null;\n" +
  "  }\n" +
  "  function _showAtPop() {\n" +
  "    var at = _atQueryAtCursor();\n" +
  "    if (!at) { _hideAtPop(); return; }\n" +
  "    var cands = _mentionCandidates(at.q);\n" +
  "    if (!cands.length) { _hideAtPop(); return; }\n" +
  "    ui._atActive = true; ui._atRange = at;\n" +
  "    ui.els.atpop.hidden = false;\n" +
  "    ui.els.atpop.innerHTML = cands.map(function (c) { return '<button type=\"button\" class=\"tm-aa-atitem\" data-label=\"' + esc(c.label) + '\"><span class=\"tm-aa-atkind\">' + esc(c.kind) + '</span>' + esc(c.label) + '</button>'; }).join('');\n" +
  "  }\n" +
  "  function _selectMention(label) {\n" +
  "    var ta = ui.els && ui.els.req; var at = ui._atRange; if (!ta || !at) { _hideAtPop(); return; }\n" +
  "    var v = ta.value; ta.value = v.slice(0, at.start) + '@' + label + ' ' + v.slice(at.end);\n" +
  "    var np = at.start + label.length + 2; try { ta.focus(); ta.setSelectionRange(np, np); } catch (e) {}\n" +
  "    _addMention(label); _hideAtPop();\n" +
  "    try { ta.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}\n" +
  "  }\n" +
  "  function _ensureAtMention() {\n" +
  "    if (ui._atWired) return; ui._atWired = true; ui._mentions = ui._mentions || [];\n" +
  "    var ta = ui.els && ui.els.req; if (!ta) return;\n" +
  "    ta.addEventListener('input', _showAtPop);\n" +
  "    ta.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && ui._atActive) { ev.stopPropagation(); _hideAtPop(); } });\n" +
  "    if (ui.els.atpop) ui.els.atpop.addEventListener('mousedown', function (ev) { var b = ev.target && ev.target.closest ? ev.target.closest('.tm-aa-atitem') : null; if (b) { ev.preventDefault(); _selectMention(b.getAttribute('data-label')); } });\n" +
  "    if (ui.els.mentions) ui.els.mentions.addEventListener('click', function (ev) { var x = ev.target && ev.target.closest ? ev.target.closest('.tm-aa-mx') : null; if (x) { var nm = x.getAttribute('data-m'); ui._mentions = (ui._mentions || []).filter(function (k) { return k !== nm; }); _renderMentionChips(); if (ui._ctx) ui._ctx._sig = null; _refreshCtxChip(); } });\n" +
  "    document.addEventListener('click', function (ev) { if (ui._atActive && ui.els.atpop && !ui.els.atpop.contains(ev.target) && ev.target !== ta) _hideAtPop(); });\n" +
  "  }",
  'fns');

// 4) init 调用
once("    _ensureCtxChip();   // N1 焦点上下文 chip",
  "    _ensureCtxChip();   // N1 焦点上下文 chip\n    _ensureAtMention();   // N3 @提及作用域上下文", 'init');

// 5) CSS
once("      '.tm-aa-ctx-pin:hover,.tm-aa-ctx-pin.on{opacity:1}',",
  "      '.tm-aa-ctx-pin:hover,.tm-aa-ctx-pin.on{opacity:1}',\n" +
  "      '#tm-aa-mentions{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:2px}',\n" +
  "      '#tm-aa-mentions[hidden]{display:none}',\n" +
  "      '.tm-aa-mchip{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#cfe6dd;background:rgba(126,184,167,.14);border:1px solid rgba(126,184,167,.4);border-radius:10px;padding:1px 4px 1px 7px}',\n" +
  "      '.tm-aa-mx{background:none;border:none;color:#cfe6dd;cursor:pointer;font-size:13px;line-height:1;padding:0 2px;opacity:.7}.tm-aa-mx:hover{opacity:1}',\n" +
  "      '#tm-aa-atpop{position:absolute;left:12px;right:12px;bottom:calc(100% + 4px);z-index:9;max-height:210px;overflow:auto;background:#13151f;border:1px solid #3a3f55;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.5);padding:4px}',\n" +
  "      '#tm-aa-atpop[hidden]{display:none}',\n" +
  "      '.tm-aa-atitem{display:flex;align-items:center;gap:7px;width:100%;text-align:left;background:none;border:none;color:#e8e8f0;cursor:pointer;font-size:12px;padding:5px 8px;border-radius:6px;font-family:inherit}',\n" +
  "      '.tm-aa-atitem:hover{background:rgba(122,92,255,.18)}',\n" +
  "      '.tm-aa-atkind{flex:0 0 auto;font-size:10px;color:#9aa0bd;background:rgba(255,255,255,.06);border-radius:4px;padding:1px 5px}',", 'css');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
