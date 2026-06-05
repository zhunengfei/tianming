// 可视化编辑器 A：把「人物列传」升为人物章主视图，字段墙(renderModuleFolio)收进折叠「⚙ 高级」。
// 同时让深度编辑台在有主视图时不自动展开；saveFolioField 同刷主视图与面板两处。
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

// E1：modulePrimaryView（人物章→列传；未来其他章接这里）
once(
`  function renderDetailApp() {`,
`  // 模块主视图：有则升为该章主画布，字段墙降为「高级」折叠。未来 factionsSociety→关系图谱 / adminMap→地图 等都接这里。
  function modulePrimaryView(moduleId) {
    if (moduleId === 'peopleLineages') return renderCharacterFolio();
    return null;
  }

  function renderDetailApp() {`,
'modulePrimaryView');

// E2：计算 primaryView
once(
`    detail.innerHTML = [`,
`    var primaryView = modulePrimaryView(state.selectedModuleId);
    detail.innerHTML = [`,
'compute-primary');

// E3：主视图替换字段墙；字段墙进折叠「高级」
once(
`      renderModuleFolio(visibleFields),
`,
`      primaryView
        ? ('<section id="renwu-folio-primary" class="primary-view">' + primaryView + '</section>' +
           '<details class="adv-fields" style="margin-top:14px"><summary style="cursor:pointer;color:#9c8b6b;font-size:12px;padding:6px 2px;list-style:none">⚙ 高级 · 本章字段表单（逐字段编辑）</summary>' + renderModuleFolio(visibleFields) + '</details>')
        : renderModuleFolio(visibleFields),
`,
'primary-replaces-folio');

// E4：有主视图时深度编辑台不自动展开
once(
`'<details class="deep-bench"' + ((!(state.selectedField in state.scenario) || isObject(value) || Array.isArray(value)) ? ' open' : '')`,
`'<details class="deep-bench"' + ((!primaryView && (!(state.selectedField in state.scenario) || isObject(value) || Array.isArray(value))) ? ' open' : '')`,
'deepbench-collapse');

// E5：saveFolioField 同刷主视图 + 面板两处
once(
`    var panel = document.querySelector('[data-panel="renwu-folio"]');
    if (panel) panel.innerHTML = renderCharacterFolio();
    else renderAll();`,
`    var html = renderCharacterFolio();
    var hosts = [document.getElementById('renwu-folio-primary'), document.querySelector('[data-panel="renwu-folio"]')];
    var any = false;
    hosts.forEach(function(h) { if (h) { h.innerHTML = html; any = true; } });
    if (!any) renderAll();`,
'savefolio-dualhost');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
console.log('delta:', s.length - orig.length, 'chars');
