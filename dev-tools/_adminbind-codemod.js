// adminMap 主视图：地图地块↔行政区划「绑定显形 + 校准」。复用 applyMapPatch 唯一写回口。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const edits = [];
function once(a, b, t) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n);
  s = s.replace(a, function () { return b; });
  edits.push(t);
}

// ── 1. ADT_CSS：加徽章 + 对应带样式 ──
once(
  String.raw`    '.adt-mapbtn:hover{border-color:#a83228;background:linear-gradient(120deg,#fff7e6,#f6e6bd)}' +
  '</style>';`,
  String.raw`    '.adt-mapbtn:hover{border-color:#a83228;background:linear-gradient(120deg,#fff7e6,#f6e6bd)}' +
    '.adt-bind{font-size:9px;color:#2d5848;border:1px solid #9ec2b0;background:rgba(220,240,230,.5);border-radius:7px;padding:0 5px;margin-left:auto;white-space:nowrap}' +
    '.adt-nobind{font-size:9px;color:#a8742a;border:1px solid #e0c08a;background:rgba(250,238,210,.5);border-radius:7px;padding:0 5px;margin-left:auto;white-space:nowrap}' +
    '.adt-band{margin:2px 2px 10px;padding:8px 10px;background:linear-gradient(160deg,#fbf6e8,#f4ead0);border:1px solid #dcc99c;border-radius:10px;font-size:12px;color:#574733}' +
    '.adt-band-empty{color:#9c8b6b}' +
    '.adt-band-sum{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
    '.adt-band-sum b{color:#7a2018;font-size:13px}' +
    '.adt-band-sum>span{font-size:11px;color:#6b5836;background:rgba(168,131,58,.1);border-radius:6px;padding:1px 7px}' +
    '.adt-band-sum>span.ok{color:#2d5848;background:rgba(120,180,150,.16)}' +
    '.adt-band-sum>span.warn{color:#a8742a;background:rgba(224,176,80,.18)}' +
    '.adt-band-sum>span.bad{color:#a83228;background:rgba(200,90,70,.14)}' +
    '.adt-calbtn,.adt-toggle{cursor:pointer;border:1px solid #a8833a;background:linear-gradient(120deg,#fff3d6,#f0dba8);color:#7a2018;border-radius:8px;padding:2px 10px;font:inherit;font-size:11px;font-weight:700}' +
    '.adt-calbtn{margin-left:auto}.adt-calbtn:hover,.adt-toggle:hover{border-color:#a83228}' +
    '.adt-toggle{margin-top:7px;font-weight:400;color:#7d5e22;background:none;border-style:dashed}' +
    '.adt-unbound{margin-top:6px;font-size:11px;color:#a8742a}.adt-unbound i{font-style:normal;border:1px solid #e0c08a;border-radius:7px;padding:0 6px;margin:2px 4px 0 0;display:inline-block;background:rgba(250,238,210,.5)}' +
    '.adt-reglist{margin-top:8px;max-height:300px;overflow:auto;display:grid;grid-template-columns:1fr;gap:3px}' +
    '.adt-regrow{display:flex;align-items:center;gap:6px;font-size:11px;padding:2px 4px;border-radius:6px;background:rgba(255,253,243,.6)}' +
    '.adt-regrow.empty{background:rgba(250,238,210,.4)}.adt-regrow.bad{background:rgba(220,170,160,.25)}' +
    '.adt-regnm{color:#2d5848;flex:0 0 auto;min-width:96px}.adt-arrow{color:#9c8b6b}' +
    '.adt-regsel{flex:1;border:1px solid #e0d2ad;border-radius:5px;background:rgba(255,252,242,.85);font:inherit;font-size:11px;color:#241d15;padding:1px 4px}' +
    '.adt-regwarn{font-style:normal;color:#a83228;font-size:10px}' +
  '</style>';`,
  'adt-css');

// ── 2. adminTreeHtml：加 idx 参数 + 徽章；并在其前插入绑定索引/校准/渲染 helper ──
once(
  String.raw`  function adminTreeHtml(divs, curId) {
    return (divs || []).map(function (d) {
      var on = d.id === curId ? ' active' : '';
      return '<div class="adt-wrap"><button class="adt-node' + on + '" data-editor-command="admin-div-select" data-admin-div-id="' + escapeHtml(d.id || '') + '"><b>' + escapeHtml(d.name || '?') + '</b>' + (d.level ? '<span>' + escapeHtml(d.level) + '</span>' : '') + (d.governor ? '<span>· ' + escapeHtml(d.governor) + '</span>' : '') + '</button>' +
        (d.children && d.children.length ? '<div class="adt-children">' + adminTreeHtml(d.children, curId) + '</div>' : '') + '</div>';
    }).join('');
  }`,
  String.raw`  // ── 地图地块 ↔ 行政区划 对应（显形 + 校准）·2026-06-05 ─────────────
  function adminMapBindIndex() {
    var sc = state.scenario || {};
    var map = isObject(sc.map) ? sc.map : (isObject(sc.mapData) ? sc.mapData : null);
    var regions = (map && Array.isArray(map.regions)) ? map.regions : [];
    var ah = (sc.adminHierarchy && typeof sc.adminHierarchy === 'object') ? sc.adminHierarchy : {};
    var divList = [], divSet = {};
    Object.keys(ah).forEach(function (fk) {
      var node = ah[fk] || {};
      (function dig(ds) {
        (ds || []).forEach(function (d) {
          if (d && d.name) { divList.push({ name: d.name, id: d.id, faction: node.factionName || fk }); divSet[d.name] = true; }
          if (d) dig(d.children);
        });
      })(node.divisions);
    });
    var divToRegions = {}, misBound = [];
    regions.forEach(function (r) {
      var b = (r && r.adminBinding) || '';
      var nm = (r && (r.name || r.id)) || '';
      if (!b) return;
      if (divSet[b]) { (divToRegions[b] = divToRegions[b] || []).push(nm); }
      else misBound.push({ region: nm, binding: b });
    });
    var unboundDivs = divList.filter(function (d) { return !(divToRegions[d.name] && divToRegions[d.name].length); });
    return { map: map, field: isObject(sc.map) ? 'map' : 'mapData', regions: regions, divList: divList, divSet: divSet, divToRegions: divToRegions, unboundDivs: unboundDivs, misBound: misBound };
  }
  function adminBindBadge(d, idx) {
    if (!idx || !idx.map) return '';
    var rs = idx.divToRegions[d.name];
    if (rs && rs.length) {
      var lbl = rs.length > 1 ? (rs[0] + ' +' + (rs.length - 1)) : rs[0];
      return '<span class="adt-bind" title="对应地图地块：' + escapeHtml(rs.join('、')) + '">🗺 ' + escapeHtml(lbl) + '</span>';
    }
    return '<span class="adt-nobind" title="此区划在地图上无对应地块（流动 / 海路 / 散居型势力可不画地块）">⚠ 无地块</span>';
  }
  function adminBindDivOptions(cur, idx) {
    var opts = '<option value="">（未绑定）</option>';
    (idx.divList || []).forEach(function (d) {
      opts += '<option value="' + escapeHtml(d.name) + '"' + (d.name === cur ? ' selected' : '') + '>' + escapeHtml(d.name) + ' · ' + escapeHtml(d.faction) + '</option>';
    });
    return opts;
  }
  function renderAdminBindBand(idx) {
    if (!idx.map || !idx.regions.length) {
      return '<div class="adt-band adt-band-empty">本剧本暂无地图地块（map.regions 为空）。可在地图编辑器画地块后回此校准绑定。</div>';
    }
    var nDiv = idx.divList.length, nReg = idx.regions.length;
    var nBound = nDiv - idx.unboundDivs.length;
    var multi = Object.keys(idx.divToRegions).filter(function (k) { return idx.divToRegions[k].length > 1; });
    var summary = '<div class="adt-band-sum"><b>地图地块对应</b>' +
      '<span>' + nDiv + ' 区划</span><span>' + nReg + ' 地块</span>' +
      '<span class="ok">' + nBound + ' 已绑定</span>' +
      (idx.unboundDivs.length ? '<span class="warn">' + idx.unboundDivs.length + ' 无地块</span>' : '') +
      (idx.misBound.length ? '<span class="bad">' + idx.misBound.length + ' 待校准</span>' : '') +
      (multi.length ? '<span>' + multi.length + ' 细分多块</span>' : '') +
      '<button class="adt-calbtn" data-editor-command="admin-calibrate-bindings" title="按区划名自动匹配，补齐 / 修正每块地图的行政绑定（不改几何）">🧭 一键校准</button></div>';
    var unboundHtml = idx.unboundDivs.length
      ? '<div class="adt-unbound">无地图地块的区划（流动 / 海路 / 散居型可不画）：' +
        idx.unboundDivs.map(function (d) { return '<i title="' + escapeHtml(d.faction) + '">' + escapeHtml(d.name) + '</i>'; }).join('') + '</div>'
      : '';
    var open = !!state._adminBandOpen;
    var rosterHtml = '';
    if (open) {
      rosterHtml = '<div class="adt-reglist">' + idx.regions.map(function (r) {
        var nm = (r.name || r.id) || '';
        var cur = r.adminBinding || '';
        var bad = cur && !idx.divSet[cur];
        return '<div class="adt-regrow' + (bad ? ' bad' : (cur ? '' : ' empty')) + '">' +
          '<span class="adt-regnm" title="地图地块">🗺 ' + escapeHtml(nm) + '</span><span class="adt-arrow">→</span>' +
          '<select class="adt-regsel" data-admin-bind-region="' + escapeHtml(nm) + '">' + adminBindDivOptions(cur, idx) + '</select>' +
          (bad ? '<i class="adt-regwarn" title="当前绑定的区划名不在行政层级中">⚠ 名不符（' + escapeHtml(cur) + '）</i>' : '') +
        '</div>';
      }).join('') + '</div>';
    }
    var toggle = '<button class="adt-toggle" data-editor-command="admin-toggle-band">' + (open ? '收起逐块清单 ▲' : '展开逐块绑定清单（' + nReg + ' 块，可改每块归属区划）▼') + '</button>';
    return '<div class="adt-band">' + summary + unboundHtml + toggle + rosterHtml + '</div>';
  }
  function saveRegionAdminBinding(regionName, divisionName) {
    var idx = adminMapBindIndex();
    var ri = -1;
    for (var i = 0; i < idx.regions.length; i++) { if (((idx.regions[i].name || idx.regions[i].id) || '') === regionName) { ri = i; break; } }
    if (ri < 0) { setStatus('未找到地块：' + regionName, 'warn'); return; }
    applyMapPatch(function (m) { if (m.regions[ri]) m.regions[ri].adminBinding = divisionName || ''; }, {
      field: idx.field, normalize: false, skipRender: true,
      label: '校准地图绑定', detail: regionName + ' → ' + (divisionName || '（清除）'),
      status: '已将地块「' + regionName + '」绑定到「' + (divisionName || '（无）') + '」'
    });
    reRenderModulePrimary();
  }
  function calibrateAdminBindings() {
    var idx = adminMapBindIndex();
    if (!idx.map || !idx.regions.length) { setStatus('本剧本地图无地块，无需校准。', 'warn'); return; }
    function strip(x) {
      return String(x || '').replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '')
        .replace(/(布政使司|都指挥使司|都司|宣慰司|宣抚司|安抚司|长官司|八旗辖区|东蒙古牧地|漠南牧地|牧地|八道|总督区|商馆区|商路|租居地|流动区|永宁山地|余裔山寨|辖区)/g, '').trim();
    }
    function matchDiv(regionName) {
      if (idx.divSet[regionName]) return regionName;
      var core = strip(regionName);
      if (!core) return '';
      var i;
      for (i = 0; i < idx.divList.length; i++) { if (idx.divList[i].name.indexOf(core) === 0) return idx.divList[i].name; }
      for (i = 0; i < idx.divList.length; i++) { if (core.length >= 2 && idx.divList[i].name.indexOf(core) >= 0) return idx.divList[i].name; }
      for (i = 0; i < idx.divList.length; i++) { if (strip(idx.divList[i].name) === core) return idx.divList[i].name; }
      return '';
    }
    var fixed = 0, already = 0, miss = 0;
    applyMapPatch(function (m) {
      m.regions.forEach(function (r) {
        var cur = r.adminBinding || '';
        if (cur && idx.divSet[cur]) { already++; return; }
        var hit = matchDiv((r.name || r.id) || '');
        if (hit) { r.adminBinding = hit; fixed++; } else { miss++; }
      });
    }, { field: idx.field, normalize: false, skipRender: true, label: '一键校准地图绑定', detail: '修正 ' + fixed + ' · 原绑 ' + already });
    reRenderModulePrimary();
    setStatus('校准完成：对齐 ' + fixed + ' 块，原已绑 ' + already + ' 块' + (miss ? '，仍有 ' + miss + ' 块无法自动匹配（可手动选区划）' : '') + '。', miss ? 'warn' : 'good');
  }
  function adminTreeHtml(divs, curId, idx) {
    return (divs || []).map(function (d) {
      var on = d.id === curId ? ' active' : '';
      return '<div class="adt-wrap"><button class="adt-node' + on + '" data-editor-command="admin-div-select" data-admin-div-id="' + escapeHtml(d.id || '') + '"><b>' + escapeHtml(d.name || '?') + '</b>' + (d.level ? '<span>' + escapeHtml(d.level) + '</span>' : '') + (d.governor ? '<span>· ' + escapeHtml(d.governor) + '</span>' : '') + adminBindBadge(d, idx) + '</button>' +
        (d.children && d.children.length ? '<div class="adt-children">' + adminTreeHtml(d.children, curId, idx) + '</div>' : '') + '</div>';
    }).join('');
  }`,
  'helpers+tree');

// ── 3. renderAdminFolio：算 bindIdx + 传给 tree ──
once(
  String.raw`    var tree = divs.length ? adminTreeHtml(divs, curId) : '<div class="rwf2-empty">该势力无区划</div>';`,
  String.raw`    var bindIdx = adminMapBindIndex();
    var tree = divs.length ? adminTreeHtml(divs, curId, bindIdx) : '<div class="rwf2-empty">该势力无区划</div>';`,
  'folio-tree');

// ── 4. renderAdminFolio：势力选择行后插入对应带 ──
once(
  String.raw`改归属 / 调省界，画完点返回写回">🗺 打开地图编辑器</button></div>' +`,
  String.raw`改归属 / 调省界，画完点返回写回">🗺 打开地图编辑器</button></div>' + renderAdminBindBand(bindIdx) +`,
  'folio-band');

// ── 5. 命令：校准 + 折叠 ──
once(
  String.raw`    if (command === 'admin-div-select') { state._adminDivId = target && target.dataset && target.dataset.adminDivId; reRenderModulePrimary(); }`,
  String.raw`    if (command === 'admin-div-select') { state._adminDivId = target && target.dataset && target.dataset.adminDivId; reRenderModulePrimary(); }
    if (command === 'admin-calibrate-bindings') { calibrateAdminBindings(); return; }
    if (command === 'admin-toggle-band') { state._adminBandOpen = !state._adminBandOpen; reRenderModulePrimary(); return; }`,
  'cmd');

// ── 6. change 监听：绑定下拉 ──
once(
  String.raw`      var afe = event.target && event.target.closest && event.target.closest('[data-admin-faction]');
      if (afe) { state._adminFaction = afe.value; state._adminDivId = null; reRenderModulePrimary(); }`,
  String.raw`      var abr = event.target && event.target.closest && event.target.closest('[data-admin-bind-region]');
      if (abr) { saveRegionAdminBinding(abr.dataset.adminBindRegion, abr.value); return; }
      var afe = event.target && event.target.closest && event.target.closest('[data-admin-faction]');
      if (afe) { state._adminFaction = afe.value; state._adminDivId = null; reRenderModulePrimary(); }`,
  'change-bind');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
