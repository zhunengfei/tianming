// 降门槛② 接国师实时刷：国师改动落在当前章主视图相关键时，主画布(#module-primary-view)闪一下让玩家注意到。
// markAgentTouched 已 renderAll(主视图本就重渲)；本刀加「相关才闪」的可视提示。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// E1：主视图相关键映射 + 闪光样式注入（插在 modulePrimaryView 前）
once(
`  // 模块主视图：有则升为该章主画布`,
`  // ② 国师实时刷：哪些顶层键的改动该闪对应章的主画布
  var MODULE_PRIMARY_TOUCH_KEYS = { peopleLineages: ['characters', 'families', 'relations'], factionsSociety: ['factionRelations', 'factions'] };
  function ensureAgentFlashStyle() {
    if (document.getElementById('agent-flash-style')) return;
    var st = document.createElement('style');
    st.id = 'agent-flash-style';
    st.textContent = '@keyframes primaryAgentFlash{0%{box-shadow:0 0 0 0 rgba(201,168,76,0)}12%{box-shadow:0 0 0 3px rgba(201,168,76,.6),0 0 26px rgba(201,168,76,.45)}100%{box-shadow:0 0 0 0 rgba(201,168,76,0)}}.primary-agent-flash{animation:primaryAgentFlash 1.8s ease;border-radius:12px}';
    (document.head || document.documentElement).appendChild(st);
  }
  function flashPrimaryIfTouched() {
    try {
      var pk = MODULE_PRIMARY_TOUCH_KEYS[state.selectedModuleId] || [];
      if (!pk.some(function (k) { return state._agentTouched && state._agentTouched[k]; })) return;
      ensureAgentFlashStyle();
      var host = document.getElementById('module-primary-view');
      if (host) { host.classList.remove('primary-agent-flash'); void host.offsetWidth; host.classList.add('primary-agent-flash'); }
    } catch (e) {}
  }

  // 模块主视图：有则升为该章主画布`,
'flash-helpers');

// E2：markAgentTouched 加主画布闪光
once(
`    fields.forEach(function (f) { if (f) state._agentTouched[f] = 1; });
    renderAll();`,
`    fields.forEach(function (f) { if (f) state._agentTouched[f] = 1; });
    renderAll();
    flashPrimaryIfTouched();`,
'markAgentTouched-flash');

// E3：导出供 e2e
once(
`    markAgentTouched: markAgentTouched,
`,
`    markAgentTouched: markAgentTouched,
    modulePrimaryView: modulePrimaryView,
`,
'export');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
