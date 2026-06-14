// N2-ii codemod — 国师 diff 分组头字段名可点→revealField（国师→折子跳转）。
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

// 1) diff 分组头字段名→可点跳
once(
  "<b>' + esc(_COLL_CN[field] || field) + '</b> <span",
  "<b class=\"tm-aa-diff-jump\" data-reveal-field=\"' + esc(field) + '\" title=\"在折子里定位此字段\">' + esc(_COLL_CN[field] || field) + ' \\u2197</b> <span",
  'diffjump');

// 2) nav 处理器加 revealField 分支
once(
  "    document.addEventListener('click', function(ev) {\n" +
  "      var a = ev.target && ev.target.closest ? ev.target.closest('.je-entity-ref') : null;",
  "    document.addEventListener('click', function(ev) {\n" +
  "      var jmp = ev.target && ev.target.closest ? ev.target.closest('.tm-aa-diff-jump[data-reveal-field]') : null;\n" +
  "      if (jmp) {\n" +
  "        ev.preventDefault();\n" +
  "        var jf = jmp.getAttribute('data-reveal-field');\n" +
  "        var app0 = global.TM_SCENARIO_EDITOR_RESET_APP;\n" +
  "        if (app0 && typeof app0.revealField === 'function') { app0.revealField(jf); setStatus('已在折子定位「' + jf + '」'); }\n" +
  "        return;\n" +
  "      }\n" +
  "      var a = ev.target && ev.target.closest ? ev.target.closest('.je-entity-ref') : null;",
  'navbranch');

// 3) CSS
once(
  "      '.tm-aa-ctx-pin:hover,.tm-aa-ctx-pin.on{opacity:1}',",
  "      '.tm-aa-ctx-pin:hover,.tm-aa-ctx-pin.on{opacity:1}',\n" +
  "      '.tm-aa-diff-jump{cursor:pointer;border-bottom:1px dashed rgba(126,184,167,.5)}',\n" +
  "      '.tm-aa-diff-jump:hover{color:#a7e0cf}',",
  'css');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
