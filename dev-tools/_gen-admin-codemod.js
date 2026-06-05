// 行政区划(adminMap)：势力选择器 + 区划树(可点) + 选中区划全字段详情(复用genDetail)。几何见地图编辑器。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

const BLOCK = String.raw`  // ───────── 行政区划章 ─────────
  var ADT_CSS = '<style>' +
    '.adt-node{display:flex;align-items:baseline;gap:6px;width:100%;text-align:left;cursor:pointer;background:linear-gradient(120deg,#fffdf3,#f6efda 80%);border:1px solid #e0d2ad;border-radius:7px;padding:4px 9px;margin:3px 0;font-family:inherit;color:#241d15}' +
    '.adt-node:hover{border-color:#a8833a}.adt-node.active{border-color:#a83228;box-shadow:-2px 0 0 #a83228;background:linear-gradient(120deg,#fffef7,#fbf4e0)}' +
    '.adt-node b{font-size:13px;color:#7a2018}.adt-node span{font-size:10px;color:#9c8b6b}' +
    '.adt-children{margin-left:12px;border-left:1px dashed rgba(168,131,58,.4);padding-left:6px}' +
  '</style>';
  var ADMIN_DIV_LABELS = { name: '名称', level: '层级', regionType: '区域类型', governor: '主官', officialPosition: '设官', description: '描述', terrain: '地形', population: '人口', prosperity: '繁荣度', minxinLocal: '民心', corruptionLocal: '吏治浊度', taxLevel: '税赋', economyBase: '经济基础', strategicValue: '战略价值', specialResources: '特产', specialCulture: '特殊文化', dejureOwner: '法理归属', capitalChildId: '治所', tags: '标签', leadingGentry: '缙绅', academies: '书院', tradeRoutes: '商路', recentDisasters: '近期灾害', religiousSites: '宗教场所', threats: '威胁', populationDetail: '人口明细', byGender: '性别构成', byAge: '年龄构成', byEthnicity: '民族构成', byFaith: '信仰构成', baojia: '保甲', bySettlement: '聚落构成', fiscalDetail: '财政明细', carryingCapacity: '承载力', publicTreasuryInit: '公库初值', children: '下辖区划', id: 'ID' };
  var ADMIN_DIV_SUB = {
    populationDetail: { mouths: '口', fugitives: '流亡', hiddenCount: '隐户', households: '户', ding: '丁' },
    byGender: { male: '男', female: '女' }, baojia: { jia: '甲', bao: '保', li: '里' }
  };
  var ADMIN_DIV_GROUPS = [
    ['概况', ['name', 'level', 'regionType', 'governor', 'officialPosition', 'dejureOwner', 'capitalChildId', 'terrain', 'description']],
    ['民生财计', ['population', 'prosperity', 'minxinLocal', 'corruptionLocal', 'taxLevel', 'economyBase', 'carryingCapacity', 'publicTreasuryInit']],
    ['人口构成', ['populationDetail', 'byGender', 'byAge', 'byEthnicity', 'byFaith', 'baojia', 'bySettlement', 'fiscalDetail']],
    ['特征', ['specialResources', 'specialCulture', 'strategicValue', 'tags', 'leadingGentry', 'academies', 'tradeRoutes', 'religiousSites', 'recentDisasters', 'threats']]
  ];
  function adminWalkFind(divs, id) { for (var i = 0; i < (divs || []).length; i++) { if (divs[i].id === id) return divs[i]; var f = adminWalkFind(divs[i].children, id); if (f) return f; } return null; }
  function adminTreeHtml(divs, curId) {
    return (divs || []).map(function (d) {
      var on = d.id === curId ? ' active' : '';
      return '<div class="adt-wrap"><button class="adt-node' + on + '" data-editor-command="admin-div-select" data-admin-div-id="' + escapeHtml(d.id || '') + '"><b>' + escapeHtml(d.name || '?') + '</b>' + (d.level ? '<span>' + escapeHtml(d.level) + '</span>' : '') + (d.governor ? '<span>· ' + escapeHtml(d.governor) + '</span>' : '') + '</button>' +
        (d.children && d.children.length ? '<div class="adt-children">' + adminTreeHtml(d.children, curId) + '</div>' : '') + '</div>';
    }).join('');
  }
  function renderAdminFolio() {
    var ah = state.scenario.adminHierarchy;
    if (!ah || typeof ah !== 'object') return genFolioCss() + '<div class="rwf2-wrap"><div class="rwf2-head">本剧本暂无行政区划层级。地块几何/归属见「地图绑定工坊」与地图编辑器。</div></div>';
    var fks = Object.keys(ah);
    var fk = (state._adminFaction && ah[state._adminFaction]) ? state._adminFaction : fks[0];
    var divs = (ah[fk] && ah[fk].divisions) || [];
    var curId = state._adminDivId;
    var curDiv = curId ? adminWalkFind(divs, curId) : (divs[0] || null);
    if (curDiv) curId = curDiv.id;
    state._adminCurDiv = curDiv;
    var facSel = '<select class="rwf2-ctl" data-admin-faction style="max-width:260px">' + fks.map(function (k) { return '<option value="' + escapeHtml(k) + '"' + (k === fk ? ' selected' : '') + '>' + escapeHtml(ah[k].factionName || k) + '（' + ((ah[k].divisions || []).length) + '）</option>'; }).join('') + '</select>';
    var tree = divs.length ? adminTreeHtml(divs, curId) : '<div class="rwf2-empty">该势力无区划</div>';
    var detail = curDiv ? genDetail('adminDiv', curDiv, 0, ADMIN_DIV_GROUPS, ADMIN_DIV_LABELS, ADMIN_DIV_SUB) : '<div class="rwf2-empty">选择一个区划</div>';
    return genFolioCss() + ADT_CSS + '<div class="rwf2-wrap"><div class="rwf2-head">行政区划 · ' + escapeHtml(ah[fk].factionName || fk) + ' · ' + divs.length + ' 顶级区划 · 左点区划，右侧逐字段编辑（地块几何/归属见地图编辑器）</div>' +
      '<div style="margin:4px 2px 8px;font-size:12px;color:#574733">势力：' + facSel + '</div>' +
      '<div class="rwf2-cols"><aside class="rwf2-roster">' + tree + '</aside><section class="rwf2-detail">' + detail + '</section></div></div>';
  }

  function renderCharacterFolio() {`;

once(`  function renderCharacterFolio() {`, BLOCK, 'admin-block');

// genCollection 加 adminDiv（选中区划单条）
once(`    if (kind === 'families') return sc.families;
    return null; // 配置型：直接取 scenario[kind]`,
     `    if (kind === 'families') return sc.families;
    if (kind === 'adminDiv') return state._adminCurDiv ? [state._adminCurDiv] : null;
    return null; // 配置型：直接取 scenario[kind]`,
     'gencoll-admindiv');

once(`    if (moduleId === 'rulesAi') return renderRulesFolio();`,
     `    if (moduleId === 'rulesAi') return renderRulesFolio();
    if (moduleId === 'adminMap') return renderAdminFolio();`,
     'primaryview-admin');

// 命令：admin-div-select
once(`    if (command === 'rules-tab') { state._rulesTab = target && target.dataset && target.dataset.rulesTab; reRenderModulePrimary(); }`,
     `    if (command === 'rules-tab') { state._rulesTab = target && target.dataset && target.dataset.rulesTab; reRenderModulePrimary(); }
    if (command === 'admin-div-select') { state._adminDivId = target && target.dataset && target.dataset.adminDivId; reRenderModulePrimary(); }`,
     'dispatch-admin');

// 势力选择器 change
once(`      var oel = event.target && event.target.closest && event.target.closest('[data-office-field]');
      if (oel) { saveOfficeField(oel.dataset.officePath, oel.dataset.officeField, oel.value); }
    });`,
     `      var oel = event.target && event.target.closest && event.target.closest('[data-office-field]');
      if (oel) { saveOfficeField(oel.dataset.officePath, oel.dataset.officeField, oel.value); return; }
      var afe = event.target && event.target.closest && event.target.closest('[data-admin-faction]');
      if (afe) { state._adminFaction = afe.value; state._adminDivId = null; reRenderModulePrimary(); }
    });`,
     'change-adminfac');

once(`    renderOfficeFolio: renderOfficeFolio,
    renderRulesFolio: renderRulesFolio,`,
     `    renderOfficeFolio: renderOfficeFolio,
    renderRulesFolio: renderRulesFolio,
    renderAdminFolio: renderAdminFolio,`,
     'export-admin');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
