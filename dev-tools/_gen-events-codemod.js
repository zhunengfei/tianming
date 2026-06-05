// 通用实体渲染基建(genFieldBlock/genDetail/saveGenField·module无关·复用势力那套) + 事件章主视图。
const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

const BLOCK = String.raw`  // ───────── 通用实体渲染基建（章节主视图复用：标量/嵌套对象/数组分发 + 就地编辑）─────────
  function genFolioCss() {
    return '<style>' +
      '.rwf2-wrap{font-family:"KaiTi","STKaiti","Noto Serif SC",serif;color:#241d15}' +
      '.rwf2-head{font:600 13px/1.6 inherit;color:#7d5e22;margin:2px 2px 10px}' +
      '.rwf2-cols{display:grid;grid-template-columns:minmax(184px,250px) 1fr;gap:14px;align-items:start}' +
      '.rwf2-roster{max-height:70vh;overflow:auto;padding-right:4px}' +
      '.rwf2-gcat{font-size:11px;color:#7d5e22;border-left:3px solid var(--fc,#a8833a);padding:2px 8px;margin:8px 0 4px;background:rgba(168,131,58,.08)}' +
      '.rwf2-gcat span{color:#9c8b6b;margin-left:6px}' +
      '.rwf2-rc{display:block;width:100%;text-align:left;cursor:pointer;position:relative;background:linear-gradient(120deg,#fffdf3,#f6efda 80%);border:1px solid #e0d2ad;border-radius:8px;padding:7px 10px 7px 13px;margin-bottom:5px;overflow:hidden;font-family:inherit;color:#241d15}' +
      '.rwf2-rc::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--fc,#a8833a);opacity:.7}' +
      '.rwf2-rc:hover{border-color:#a8833a}' +
      '.rwf2-rc.active{border-color:#a83228;box-shadow:-2px 0 0 #a83228,0 2px 8px rgba(120,90,40,.12);background:linear-gradient(120deg,#fffef7,#fbf4e0)}' +
      '.rc-top b{font-size:14px;color:#7a2018}.rc-zi{font-size:10px;color:#9c8b6b;margin-left:5px}.rc-flag{font-size:9px;color:#a83228;border:1px solid #a83228;border-radius:7px;padding:0 4px;margin-left:5px}' +
      '.rc-off{display:block;font-size:11px;color:#574733;margin:2px 0}.rc-ab{display:block;font-size:10px;color:#2d5848}' +
      '.rwf2-detail{background:linear-gradient(160deg,#fffdf3,#f8f1dc);border:1px solid #dcc99c;border-radius:12px;padding:12px 14px;box-shadow:0 2px 10px rgba(58,40,22,.1)}' +
      '.rwf2-dh{border-bottom:1px solid rgba(168,131,58,.3);padding-bottom:8px;margin-bottom:8px;display:flex;gap:10px;align-items:center}' +
      '.rwf2-dh-t b{font-size:19px;color:#7a2018}.rwf2-dh-t span{font-size:12px;color:#574733;margin-left:8px}' +
      '.rwf2-sec{margin-bottom:10px}.rwf2-st{font-size:12px;font-weight:700;color:#a8833a;border-left:3px solid #a8833a;padding-left:7px;margin-bottom:6px}' +
      '.rwf2-grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 10px}.rwf2-f-wide{grid-column:1/-1}' +
      '.rwf2-f{display:flex;flex-direction:column;gap:1px;font-size:12px}.rwf2-fl{font-size:10px;color:#9c8b6b}' +
      '.rwf2-ctl{border:1px solid #e0d2ad;border-radius:5px;background:rgba(255,252,242,.85);font:inherit;font-size:12px;color:#241d15;padding:2px 5px;width:100%;box-sizing:border-box}' +
      '.rwf2-ctl:hover,.rwf2-ctl:focus{border-color:#a8833a;outline:none}.rwf2-area{resize:vertical;min-height:3.4em;line-height:1.5}' +
      '.rwf2-empty{color:#9c8b6b;padding:20px}' +
      '.facf-sub{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:4px 8px;background:rgba(168,131,58,.06);border:1px solid rgba(168,131,58,.2);border-radius:6px;padding:6px 8px}' +
      '.facf-objarr{display:flex;flex-direction:column;gap:3px;background:rgba(168,131,58,.06);border:1px solid rgba(168,131,58,.2);border-radius:6px;padding:6px 8px;max-height:170px;overflow:auto}' +
      '.facf-oa-item{font-size:11px;color:#574733;border-bottom:1px dotted rgba(168,131,58,.3);padding-bottom:2px}.facf-oa-more{font-size:10px;color:#9c8b6b}' +
      '.facf-swatch{width:22px;height:22px;border-radius:5px;border:1px solid #c9a84c;flex:0 0 auto}' +
    '</style>';
  }
  function genCompact(o) { try { return Object.keys(o).map(function (k) { return k + ':' + (o[k] && typeof o[k] === 'object' ? '…' : o[k]); }).join('　').slice(0, 90); } catch (e) { return ''; } }
  function genKilo(n) { n = Number(n) || 0; return n >= 10000 ? (Math.round(n / 1000) / 10 + '万') : (n >= 1000 ? (Math.round(n / 100) / 10 + '千') : n); }
  function genObjArrayView(arr) { return '<div class="facf-objarr">' + arr.slice(0, 14).map(function (it) { return '<div class="facf-oa-item">' + escapeHtml(genCompact(it)) + '</div>'; }).join('') + (arr.length > 14 ? '<div class="facf-oa-more">…共 ' + arr.length + ' 条（在「⚙ 高级」表单编辑）</div>' : '') + '</div>'; }
  function genFieldBlock(kind, i, key, v, labels, sublabels) {
    var label = (labels && labels[key]) || key;
    var attr = ' data-gen-kind="' + escapeHtml(kind) + '" data-gen-i="' + i + '"';
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === 'object') return '<div class="rwf2-f rwf2-f-wide"><span class="rwf2-fl">' + escapeHtml(label) + '（' + v.length + '）</span>' + genObjArrayView(v) + '</div>';
      return '<label class="rwf2-f rwf2-f-wide"><span class="rwf2-fl">' + escapeHtml(label) + '</span><textarea class="rwf2-ctl rwf2-area"' + attr + ' data-gen-field="' + escapeHtml(key) + '" rows="2">' + escapeHtml(v.join(String.fromCharCode(10))) + '</textarea></label>';
    }
    if (v && typeof v === 'object') {
      var subdict = (sublabels && sublabels[key]) || {};
      var subs = Object.keys(v).map(function (sk) {
        var sv = v[sk], slabel = subdict[sk] || sk;
        if (sv && typeof sv === 'object') return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(slabel) + '</span><input class="rwf2-ctl" value="' + escapeHtml(genCompact(sv)) + '" readonly></label>';
        if (typeof sv === 'number') return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(slabel) + '</span><input type="number" class="rwf2-ctl rwf2-num"' + attr + ' data-gen-field="' + escapeHtml(key + '.' + sk) + '" value="' + escapeHtml(sv) + '"></label>';
        return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(slabel) + '</span><input class="rwf2-ctl"' + attr + ' data-gen-field="' + escapeHtml(key + '.' + sk) + '" value="' + escapeHtml(sv == null ? '' : sv) + '"></label>';
      }).join('');
      return '<div class="rwf2-f rwf2-f-wide"><span class="rwf2-fl">' + escapeHtml(label) + '</span><div class="facf-sub">' + subs + '</div></div>';
    }
    if (typeof v === 'boolean') return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(label) + '</span><input type="checkbox"' + attr + ' data-gen-field="' + escapeHtml(key) + '"' + (v ? ' checked' : '') + '></label>';
    if (typeof v === 'number') return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(label) + '</span><input type="number" class="rwf2-ctl rwf2-num"' + attr + ' data-gen-field="' + escapeHtml(key) + '" value="' + escapeHtml(v) + '"></label>';
    var s2 = v == null ? '' : String(v), wide = s2.length > 36;
    if (wide) return '<label class="rwf2-f rwf2-f-wide"><span class="rwf2-fl">' + escapeHtml(label) + '</span><textarea class="rwf2-ctl rwf2-area"' + attr + ' data-gen-field="' + escapeHtml(key) + '" rows="2">' + escapeHtml(s2) + '</textarea></label>';
    return '<label class="rwf2-f"><span class="rwf2-fl">' + escapeHtml(label) + '</span><input class="rwf2-ctl"' + attr + ' data-gen-field="' + escapeHtml(key) + '" value="' + escapeHtml(s2) + '"></label>';
  }
  function genDetail(kind, entity, i, groups, labels, sublabels) {
    if (!entity || typeof entity !== 'object') return '<div class="rwf2-empty">无内容</div>';
    var used = {};
    var secs = (groups || []).map(function (g) {
      var keys = g[1].filter(function (k) { return (k in entity) && !used[k]; });
      keys.forEach(function (k) { used[k] = 1; });
      if (!keys.length) return '';
      return '<div class="rwf2-sec"><div class="rwf2-st">' + escapeHtml(g[0]) + '</div><div class="rwf2-grid2">' + keys.map(function (k) { return genFieldBlock(kind, i, k, entity[k], labels, sublabels); }).join('') + '</div></div>';
    }).join('');
    var extra = Object.keys(entity).filter(function (k) { return !used[k]; });
    if (extra.length) secs += '<div class="rwf2-sec"><div class="rwf2-st">其它</div><div class="rwf2-grid2">' + extra.map(function (k) { return genFieldBlock(kind, i, k, entity[k], labels, sublabels); }).join('') + '</div></div>';
    return secs;
  }
  function genSelIndex(kind, len) { var m = state._genSel || (state._genSel = {}); var v = m[kind]; return (typeof v === 'number' && v >= 0 && v < len) ? v : 0; }
  function genCollection(kind) {
    var sc = state.scenario;
    if (kind === 'events') return sc.events;
    if (kind === 'troops') return sc.military && sc.military.initialTroops;
    if (kind === 'armies') return sc.military && sc.military.armies;
    if (kind === 'variables') return sc.variables;
    if (kind === 'items') return sc.items;
    if (kind === 'parties') return sc.parties;
    if (kind === 'classes') return sc.classes;
    if (kind === 'families') return sc.families;
    return null; // 配置型：直接取 scenario[kind]
  }
  function genConfigObject(kind) { return state.scenario[kind] && typeof state.scenario[kind] === 'object' ? state.scenario[kind] : null; }
  function saveGenField(kind, i, field, raw) {
    var coll = genCollection(kind);
    var target = coll ? coll[i] : genConfigObject(kind);
    if (!target) return;
    var fld = String(field);
    if (fld.indexOf('.') > 0) {
      var parts = fld.split('.'), obj = target[parts[0]];
      if (!obj || typeof obj !== 'object') obj = target[parts[0]] = {};
      var old = obj[parts[1]];
      obj[parts[1]] = (typeof old === 'number') ? (isFinite(parseFloat(raw)) ? parseFloat(raw) : 0) : raw;
    } else {
      var cur = target[fld];
      if (Array.isArray(cur)) target[fld] = String(raw).split(String.fromCharCode(10)).map(function (x) { return x.trim(); }).filter(function (x) { return x; });
      else if (typeof cur === 'number') target[fld] = isFinite(parseFloat(raw)) ? parseFloat(raw) : 0;
      else if (typeof raw === 'boolean') target[fld] = raw;
      else target[fld] = raw;
    }
    recordHistory(kind, ((target && target.name) || ('#' + i)) + ' · ' + fld);
    var host = document.getElementById('module-primary-view'); if (host) host.innerHTML = modulePrimaryView(state.selectedModuleId) || ''; else renderAll();
  }

  // ───────── 事件章 ─────────
  var EVENT_LABELS = { name: '事件名', type: '类型', importance: '重要度', trigger: '触发条件', condition: '前置条件', effect: '结果效果', description: '描述', linkedChars: '关联人物', linkedFactions: '关联势力', category: '分类', triggered: '已触发', turn: '回合', date: '日期', weight: '权重', repeatable: '可重复', oneTime: '一次性', choices: '选项', sid: '剧本ID', id: 'ID' };
  var EVENT_GROUPS = [
    ['概况', ['name', 'type', 'category', 'importance', 'turn', 'date', 'weight', 'repeatable', 'oneTime', 'triggered']],
    ['触发与结果', ['trigger', 'condition', 'effect', 'description', 'choices']],
    ['关联', ['linkedChars', 'linkedFactions']]
  ];
  function eventColor(e) { var t = (e && (e.importance || e.type || '')) + ''; if (/危|战|乱|高|critical|major/.test(t)) return '#a83228'; if (/机|喜|低|minor/.test(t)) return '#2d5848'; return '#a8833a'; }
  function genEventCard(e, i, sel) {
    return '<button class="rwf2-rc' + (i === sel ? ' active' : '') + '" style="--fc:' + eventColor(e) + '" data-editor-command="gen-folio-select" data-gen-kind="events" data-gen-i="' + i + '">' +
      '<span class="rc-top"><b>' + escapeHtml(e.name || '无名事件') + '</b>' + (e.importance ? '<span class="rc-flag">' + escapeHtml(e.importance) + '</span>' : '') + '</span>' +
      '<span class="rc-off">' + escapeHtml((e.type || '') + (e.category ? ' · ' + e.category : '')) + '</span>' +
    '</button>';
  }
  function renderEventsFolio() {
    var evs = Array.isArray(state.scenario.events) ? state.scenario.events : [];
    if (!evs.length) return genFolioCss() + '<div class="rwf2-wrap"><div class="rwf2-head">本剧本暂无事件。可在「⚙ 高级」专业表单新增，或让国师生成。</div></div>';
    var sel = genSelIndex('events', evs.length);
    var groups = {};
    evs.forEach(function (e, i) { var c = (e && (e.category || e.type)) || '（未分类）'; (groups[c] = groups[c] || []).push(i); });
    var roster = Object.keys(groups).map(function (c) {
      return '<div class="rwf2-gcat" style="--fc:' + folioColorFor(c) + '">' + escapeHtml(c) + '<span>' + groups[c].length + '</span></div>' +
        groups[c].map(function (i) { return genEventCard(evs[i], i, sel); }).join('');
    }).join('');
    var e0 = evs[sel];
    var head = '<div class="rwf2-dh"><span class="facf-swatch" style="background:' + eventColor(e0) + '"></span><span class="rwf2-dh-t"><b>' + escapeHtml(e0.name || '无名事件') + '</b><span>' + escapeHtml((e0.type || '') + (e0.importance ? ' · ' + e0.importance : '')) + '</span></span></div>';
    return genFolioCss() + '<div class="rwf2-wrap"><div class="rwf2-head">事件库 · ' + evs.length + ' 条 · 左点事件，右侧逐字段编辑（每字段标了正式游戏里的叫法）</div>' +
      '<div class="rwf2-cols"><aside class="rwf2-roster">' + roster + '</aside><section class="rwf2-detail">' + head + genDetail('events', e0, sel, EVENT_GROUPS, EVENT_LABELS, {}) + '</section></div></div>';
  }

  function renderCharacterFolio() {`;

once(`  function renderCharacterFolio() {`, BLOCK, 'gen+events-block');

once(`    if (moduleId === 'factionsSociety') return renderFactionFolio();`,
     `    if (moduleId === 'factionsSociety') return renderFactionFolio();
    if (moduleId === 'eventsChronicle') return renderEventsFolio();`,
     'primaryview-events');

once(`    if (command === 'fac-folio-tab') { state._facFolioTab = target && target.dataset && target.dataset.facTab; reRenderModulePrimary(); }`,
     `    if (command === 'fac-folio-tab') { state._facFolioTab = target && target.dataset && target.dataset.facTab; reRenderModulePrimary(); }
    if (command === 'gen-folio-select') { var gk = target && target.dataset && target.dataset.genKind; var gi = Number(target && target.dataset && target.dataset.genI); if (gk) { (state._genSel = state._genSel || {})[gk] = gi; reRenderModulePrimary(); } }`,
     'dispatch-gen');

once(`      var ffel = event.target && event.target.closest && event.target.closest('[data-fac-field]');
      if (ffel) { saveFacFolioField(Number(ffel.dataset.facI), ffel.dataset.facField, ffel.type === 'checkbox' ? ffel.checked : ffel.value); }
    });`,
     `      var ffel = event.target && event.target.closest && event.target.closest('[data-fac-field]');
      if (ffel) { saveFacFolioField(Number(ffel.dataset.facI), ffel.dataset.facField, ffel.type === 'checkbox' ? ffel.checked : ffel.value); return; }
      var gel = event.target && event.target.closest && event.target.closest('[data-gen-field]');
      if (gel) { saveGenField(gel.dataset.genKind, Number(gel.dataset.genI), gel.dataset.genField, gel.type === 'checkbox' ? gel.checked : gel.value); }
    });`,
     'change-gen');

once(`    renderFactionFolio: renderFactionFolio,
    saveFacFolioField: saveFacFolioField,`,
     `    renderFactionFolio: renderFactionFolio,
    saveFacFolioField: saveFacFolioField,
    renderEventsFolio: renderEventsFolio,
    saveGenField: saveGenField,`,
     'export-gen');

fs.writeFileSync(file, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
