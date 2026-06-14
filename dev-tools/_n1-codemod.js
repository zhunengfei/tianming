// N1 codemod — 焦点上下文 chip 可见化（editor-authoring-agent-ui.js）。
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

// 1) 模板：composer 内、status 前插 chip
once("      '<div id=\"tm-aa-status\"></div>',",
  "      '<div id=\"tm-aa-ctx\" hidden></div>',\n      '<div id=\"tm-aa-status\"></div>',", 'tpl');

// 2) els.ctx
once("      status: panel.querySelector('#tm-aa-status'),",
  "      status: panel.querySelector('#tm-aa-status'),\n      ctx: panel.querySelector('#tm-aa-ctx'),", 'els');

// 3) _editorContext 支持固定 + 新增 live/refresh/ensure
const CTX_OLD =
  "  function _editorContext() {\n" +
  "    try { return (ui.adapter && typeof ui.adapter.getContext === 'function') ? (ui.adapter.getContext() || '') : ''; }\n" +
  "    catch (e) { return ''; }\n" +
  "  }";
const CTX_NEW =
  "  function _liveEditorContext() {\n" +
  "    try { return (ui.adapter && typeof ui.adapter.getContext === 'function') ? (ui.adapter.getContext() || '') : ''; }\n" +
  "    catch (e) { return ''; }\n" +
  "  }\n" +
  "  // N1 · 焦点上下文：默认跟随编辑器选中；固定后冻结为固定值（喂 agent 也用固定值）。\n" +
  "  function _editorContext() {\n" +
  "    if (ui._ctx && ui._ctx.pinned) return ui._ctx.value || '';\n" +
  "    return _liveEditorContext();\n" +
  "  }\n" +
  "  function _refreshCtxChip() {\n" +
  "    if (!ui.els || !ui.els.ctx) return;\n" +
  "    if (!ui._ctx) ui._ctx = { pinned: false, value: '', _sig: null };\n" +
  "    var pinned = !!ui._ctx.pinned;\n" +
  "    var shown = pinned ? (ui._ctx.value || '') : _liveEditorContext();\n" +
  "    var sig = (pinned ? 'P:' : 'L:') + shown;\n" +
  "    if (ui._ctx._sig === sig) return;\n" +
  "    ui._ctx._sig = sig;\n" +
  "    var el = ui.els.ctx;\n" +
  "    if (!shown) { el.hidden = true; el.innerHTML = ''; return; }\n" +
  "    el.hidden = false;\n" +
  "    el.innerHTML = '<span class=\"tm-aa-ctx-ico\">\\uD83D\\uDCCD</span><span class=\"tm-aa-ctx-txt\">' + esc(shown) + '</span>' +\n" +
  "      '<button type=\"button\" class=\"tm-aa-ctx-pin' + (pinned ? ' on' : '') + '\" title=\"' + (pinned ? '\\u53d6\\u6d88\\u56fa\\u5b9a\\uff08\\u8ddf\\u968f\\u7f16\\u8f91\\u5668\\u9009\\u4e2d\\uff09' : '\\u56fa\\u5b9a\\u5f53\\u524d\\u4e0a\\u4e0b\\u6587') + '\">' + (pinned ? '\\uD83D\\uDCCC' : '\\uD83D\\uDCCD') + '</button>';\n" +
  "  }\n" +
  "  function _ensureCtxChip() {\n" +
  "    if (ui._ctxWired) return; ui._ctxWired = true;\n" +
  "    if (!ui._ctx) ui._ctx = { pinned: false, value: '', _sig: null };\n" +
  "    if (ui.els && ui.els.ctx) ui.els.ctx.addEventListener('click', function (ev) {\n" +
  "      var b = ev.target && ev.target.closest ? ev.target.closest('.tm-aa-ctx-pin') : null;\n" +
  "      if (!b) return;\n" +
  "      ui._ctx.pinned = !ui._ctx.pinned;\n" +
  "      if (ui._ctx.pinned) ui._ctx.value = _liveEditorContext();\n" +
  "      ui._ctx._sig = null; _refreshCtxChip();\n" +
  "    });\n" +
  "    setInterval(function () {\n" +
  "      try { if (ui.els && ui.els.panel && ui.els.panel.classList.contains('open')) _refreshCtxChip(); } catch (e) {}\n" +
  "    }, 700);\n" +
  "    _refreshCtxChip();\n" +
  "  }";
once(CTX_OLD, CTX_NEW, 'ctxfn');

// 4) init 调用 _ensureCtxChip
once("    _ensureSearch();   // UI·AJ · 过程区内搜索（⌘F）",
  "    _ensureSearch();   // UI·AJ · 过程区内搜索（⌘F）\n    _ensureCtxChip();   // N1 焦点上下文 chip", 'init');

// 5) CSS（injectStyles css 数组）
once("      '#tm-aa-status{font-size:12px;color:#9aa0bd;min-height:16px}',",
  "      '#tm-aa-status{font-size:12px;color:#9aa0bd;min-height:16px}',\n" +
  "      '#tm-aa-ctx{display:flex;align-items:center;gap:6px;font-size:11px;color:#b9bed6;background:rgba(122,92,255,.10);border:1px solid rgba(122,92,255,.32);border-radius:6px;padding:3px 8px;margin-bottom:2px}',\n" +
  "      '#tm-aa-ctx[hidden]{display:none}',\n" +
  "      '.tm-aa-ctx-txt{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',\n" +
  "      '.tm-aa-ctx-ico{flex:0 0 auto;opacity:.85}',\n" +
  "      '.tm-aa-ctx-pin{flex:0 0 auto;background:none;border:none;cursor:pointer;font-size:12px;opacity:.6;padding:0 2px;line-height:1}',\n" +
  "      '.tm-aa-ctx-pin:hover,.tm-aa-ctx-pin.on{opacity:1}',", 'css');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
