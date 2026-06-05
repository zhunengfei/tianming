// 官制(officeTree官职树org chart + government) + 规则(variables roster + 科技/机制 config tabs)。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

const BLOCK = String.raw`  // ───────── 官制章：官职树（org chart，就地编辑各官职现任/员额/缺员）─────────
  var OFT_CSS = '<style>' +
    '.oft-node{border-left:2px solid rgba(168,131,58,.4);margin:6px 0 6px 4px;padding-left:10px}' +
    '.oft-h{display:flex;align-items:baseline;gap:8px;margin:2px 0}' +
    '.oft-h b{font-size:14px;color:#7a2018}.oft-h span{font-size:11px;color:#9c8b6b}' +
    '.oft-poshead,.oft-pos{display:grid;grid-template-columns:minmax(120px,1.6fr) .8fr 1fr .6fr .6fr;gap:5px;align-items:center}' +
    '.oft-poshead{font-size:10px;color:#9c8b6b;margin:3px 0 1px;padding:0 2px}' +
    '.oft-pos{margin:2px 0}' +
    '.oft-pos .rwf2-ctl{font-size:11px;padding:1px 4px}' +
    '.oft-vac{color:#a83228}' +
    '.oft-subs{margin-top:2px}' +
  '</style>';
  function officeNodeHtml(node, nodePath) {
    var posRows = (node.positions || []).map(function (pos, j) {
      var base = nodePath.concat(['positions', j]).join('.');
      function ctl(field, val, ph, num) { return '<input ' + (num ? 'type="number" ' : '') + 'class="rwf2-ctl' + (num ? ' rwf2-num' : '') + '" data-office-path="' + base + '" data-office-field="' + field + '" value="' + escapeHtml(val == null ? '' : val) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + (field === 'vacancyCount' && Number(val) > 0 ? ' style="color:#a83228"' : '') + '>'; }
      return '<div class="oft-pos">' + ctl('name', pos.name, '官职') + ctl('rank', pos.rank, '品级') + ctl('holder', pos.holder, '现任(空缺则留白)') + ctl('establishedCount', pos.establishedCount, '员额', true) + ctl('vacancyCount', pos.vacancyCount, '缺员', true) + '</div>';
    }).join('');
    var subs = (node.subs || []).map(function (sub, k) { return officeNodeHtml(sub, nodePath.concat(['subs', k])); }).join('');
    return '<div class="oft-node"><div class="oft-h"><b>' + escapeHtml(node.name || '') + '</b><span>' + escapeHtml(node.desc || '') + '</span></div>' +
      (posRows ? '<div class="oft-poshead"><span>官职</span><span>品级</span><span>现任</span><span>员额</span><span>缺员</span></div>' + posRows : '') +
      (subs ? '<div class="oft-subs">' + subs + '</div>' : '') + '</div>';
  }
  function saveOfficeField(pathStr, field, raw) {
    var parts = String(pathStr).split('.').map(function (p) { return /^\d+$/.test(p) ? Number(p) : p; });
    var obj = state.scenario.officeTree;
    for (var i = 0; i < parts.length; i++) { obj = obj && obj[parts[i]]; }
    if (!obj || typeof obj !== 'object') return;
    var old = obj[field];
    obj[field] = (typeof old === 'number' || field === 'establishedCount' || field === 'vacancyCount' || field === 'salary') ? (isFinite(parseFloat(raw)) ? parseFloat(raw) : 0) : raw;
    recordHistory('官制', (obj.name || field) + ' · ' + field);
    var host = document.getElementById('module-primary-view'); if (host) host.innerHTML = modulePrimaryView(state.selectedModuleId) || '';
  }
  var GOV_LABELS = { name: '政体名', description: '说明', selectionSystem: '选才制度', promotionSystem: '升迁制度', historicalReference: '史实参照' };
  function renderOfficeFolio() {
    var tree = state.scenario.officeTree;
    var govSec = configSection('government', '政体 · 选才升迁', GOV_LABELS, {});
    if (!Array.isArray(tree) || !tree.length) return genFolioCss() + OFT_CSS + '<div class="rwf2-wrap"><div class="rwf2-head">官制 · 政体</div>' + govSec + '<div class="rwf2-head">本剧本暂无官职树。</div></div>';
    var count = 0, vac = 0; (function walk(ns) { (ns || []).forEach(function (n) { (n.positions || []).forEach(function (p) { count += (Number(p.establishedCount) || 0); vac += (Number(p.vacancyCount) || 0); }); walk(n.subs); }); })(tree);
    var body = tree.map(function (n, i) { return officeNodeHtml(n, [i]); }).join('');
    return genFolioCss() + OFT_CSS + '<div class="rwf2-wrap"><div class="rwf2-head">官制 · 官职树 · ' + tree.length + ' 衙门 · 员额 ' + count + ' · 缺员 ' + vac + ' · 各官职现任/员额/缺员可就地改</div>' +
      govSec + '<div class="rwf2-detail">' + body + '</div></div>';
  }

  // ───────── 规则章：变量 roster + 科技/机制 config ─────────
  var VAR_LABELS = { name: '变量名', value: '当前值', min: '最小', max: '最大', cat: '分类', desc: '说明', inversed: '反向(越高越坏)', color: '颜色', icon: '图标', visible: '玩家可见', sid: '剧本ID', id: 'ID' };
  var VAR_GROUPS = [['概况', ['name', 'cat', 'value', 'min', 'max', 'inversed', 'visible']], ['说明', ['desc']], ['显示', ['color', 'icon']]];
  function genVarCard(v, i, sel) {
    var col = v.color || (v.inversed ? '#a83228' : '#2d5848');
    return '<button class="rwf2-rc' + (i === sel ? ' active' : '') + '" style="--fc:' + escapeHtml(col) + '" data-editor-command="gen-folio-select" data-gen-kind="variables" data-gen-i="' + i + '">' +
      '<span class="rc-top"><b>' + escapeHtml(v.name || '无名') + '</b><span class="rc-zi">' + escapeHtml(v.cat || '') + '</span></span>' +
      '<span class="rc-ab">值 ' + escapeHtml(v.value == null ? '—' : v.value) + ' / ' + escapeHtml(v.max == null ? '?' : v.max) + (v.inversed ? ' · 反向' : '') + '</span></button>';
  }
  function renderRulesFolio() {
    var sc = state.scenario;
    var tab = ['vars', 'tech', 'mech'].indexOf(state._rulesTab) >= 0 ? state._rulesTab : 'vars';
    var tb = '<div class="facf-tabs">' +
      '<button class="facf-tab' + (tab === 'vars' ? ' on' : '') + '" data-editor-command="rules-tab" data-rules-tab="vars">变量</button>' +
      '<button class="facf-tab' + (tab === 'tech' ? ' on' : '') + '" data-editor-command="rules-tab" data-rules-tab="tech">科技 · 民政</button>' +
      '<button class="facf-tab' + (tab === 'mech' ? ' on' : '') + '" data-editor-command="rules-tab" data-rules-tab="mech">机制 · 规则</button>' +
    '</div>';
    if (tab === 'tech') return genFolioCss() + GEN_TABS_CSS + '<div class="rwf2-wrap">' + tb + '<div class="rwf2-head">科技树 / 民政树 · 逐字段编辑</div>' + configSection('techTree', '科技树', { military: '军事', civil: '民政' }, {}) + configSection('civicTree', '民政树', { city: '城建', policy: '政策', resource: '资源', corruption: '吏治' }, {}) + '</div>';
    if (tab === 'mech') return genFolioCss() + GEN_TABS_CSS + '<div class="rwf2-wrap">' + tb + '<div class="rwf2-head">机制配置 / 规则 · 逐字段编辑</div>' + configSection('mechanicsConfig', '机制配置', { enabled: '启用', specialMechanics: '特殊机制' }, {}) + configSection('rules', '规则', { base: '基础', combat: '战斗', economy: '经济', diplomacy: '外交' }, {}) + '</div>';
    var vars = Array.isArray(sc.variables) ? sc.variables : [];
    if (!vars.length) return genFolioCss() + GEN_TABS_CSS + '<div class="rwf2-wrap">' + tb + '<div class="rwf2-head">本剧本暂无变量。</div></div>';
    var sel = genSelIndex('variables', vars.length);
    var roster = vars.map(function (v, i) { return genVarCard(v, i, sel); }).join('');
    var v0 = vars[sel];
    var head = '<div class="rwf2-dh"><span class="facf-swatch" style="background:' + escapeHtml(v0.color || '#a8833a') + '"></span><span class="rwf2-dh-t"><b>' + escapeHtml(v0.name || '无名') + '</b><span>' + escapeHtml((v0.cat || '') + ' · 值 ' + (v0.value == null ? '—' : v0.value)) + '</span></span></div>';
    return genFolioCss() + GEN_TABS_CSS + '<div class="rwf2-wrap">' + tb + '<div class="rwf2-head">剧本变量 · ' + vars.length + ' 个 · 左点变量，右侧逐字段编辑</div><div class="rwf2-cols"><aside class="rwf2-roster">' + roster + '</aside><section class="rwf2-detail">' + head + genDetail('variables', v0, sel, VAR_GROUPS, VAR_LABELS, {}) + '</section></div></div>';
  }

  function renderCharacterFolio() {`;

once(`  function renderCharacterFolio() {`, BLOCK, 'office-rules-block');

once(`    if (moduleId === 'militaryFrontier') return renderMilitaryFolio();`,
     `    if (moduleId === 'militaryFrontier') return renderMilitaryFolio();
    if (moduleId === 'courtInstitutions') return renderOfficeFolio();
    if (moduleId === 'rulesAi') return renderRulesFolio();`,
     'primaryview-office-rules');

once(`    if (command === 'mil-tab') { state._milTab = target && target.dataset && target.dataset.milTab; reRenderModulePrimary(); }`,
     `    if (command === 'mil-tab') { state._milTab = target && target.dataset && target.dataset.milTab; reRenderModulePrimary(); }
    if (command === 'rules-tab') { state._rulesTab = target && target.dataset && target.dataset.rulesTab; reRenderModulePrimary(); }`,
     'dispatch-rulestab');

// change 监听：官职树字段
once(`      var gel = event.target && event.target.closest && event.target.closest('[data-gen-field]');
      if (gel) { saveGenField(gel.dataset.genKind, Number(gel.dataset.genI), gel.dataset.genField, gel.type === 'checkbox' ? gel.checked : gel.value); }
    });`,
     `      var gel = event.target && event.target.closest && event.target.closest('[data-gen-field]');
      if (gel) { saveGenField(gel.dataset.genKind, Number(gel.dataset.genI), gel.dataset.genField, gel.type === 'checkbox' ? gel.checked : gel.value); return; }
      var oel = event.target && event.target.closest && event.target.closest('[data-office-field]');
      if (oel) { saveOfficeField(oel.dataset.officePath, oel.dataset.officeField, oel.value); }
    });`,
     'change-office');

once(`    renderMilitaryFolio: renderMilitaryFolio,
    saveGenField: saveGenField,`,
     `    renderMilitaryFolio: renderMilitaryFolio,
    renderOfficeFolio: renderOfficeFolio,
    renderRulesFolio: renderRulesFolio,
    saveOfficeField: saveOfficeField,
    saveGenField: saveGenField,`,
     'export-office-rules');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
