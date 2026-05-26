// phase8-formal-records.js·history records surface (史/记/注/编年)
// split from phase8-formal-bridge.js·2026-05-26·Wave 1
// paradigm·head alias 块 / body 0 改动 / 跨闭包 helper 通过 bridge._xxx 引

(function(){
  'use strict';

  var bridge = window.TMPhase8FormalBridge;
  if (!bridge) {
    console.error('[phase8-formal-records] TMPhase8FormalBridge not init·bridge.js 必须先 load');
    return;
  }

  var state = bridge._state || window.TM_PHASE8_FORMAL;

  // ── alias 块·从主 bridge 引入 helper (body 0 改动 paradigm) ────────
  var esc = bridge._esc;
  var attr = bridge._attr;
  var getTurnText = bridge._getTurnText;
  var firstArray = bridge._firstArray;
  var actionBtn = bridge._actionBtn;
  var actionChip = bridge._actionChip;
  var renderActionStats = bridge._renderActionStats;
  var collectRecentEvents = bridge._collectRecentEvents;

  // ── records-private helpers (body 0 改动 from bridge.js) ─────────

  function fullRecordText(s, fallback, cls){
    var text = String(s == null ? '' : s).replace(/\r\n/g, '\n').trim();
    if (!text) text = String(fallback || '');
    return '<span class="records-fulltext-v5 ' + attr(cls || '') + '">' + esc(text) + '</span>';
  }

  function formalGroupBy(rows, fn){
    return rows.reduce(function(out, row){
      var key = fn(row) || '未分组';
      (out[key] || (out[key] = [])).push(row);
      return out;
    }, {});
  }

  function formalRecordRows(){
    return collectRecentEvents(80).map(function(e, i){
      var turn = Number(e.turn || ((window.GM && GM.turn) || 1));
      var text = e.detail || e.text || e.body || e.summary || '';
      return {
        id: e.id || ('rec-' + i),
        kind: 'event',
        turn: turn,
        date: e.date || e.time || getTurnText(turn),
        type: e.type || e.category || '近事',
        title: e.title || e.name || '未题',
        text: text,
        tags: e.tags || [e.type || '近事'],
        source: e.source || e.type || '近事',
        seal: '事'
      };
    });
  }

  function formalRecordText(x){
    if (!x) return '';
    if (typeof x === 'string') return x;
    return x.fullText || x.rawText || x.sourceText || x.zhengwen || x.content || x.text || x.detail || x.body || x.summary || x.desc || x.description || x.narrative || x.result || '';
  }

  function formalRecordDate(x, turn){
    x = x || {};
    return x.time || x.date || x.raisedDate || x.resolvedDate || x.year || getTurnText(turn || x.turn || ((window.GM && GM.turn) || 1));
  }

  function formalLooseText(x){
    return String(x || '').replace(/\s|　/g, '');
  }

  function formalRowNeedle(row){
    return [row.title, row.type, row.source, row.actor, row.date, row.text, (row.tags || []).join(' '), row.status].filter(Boolean).join(' ');
  }

  function formalFilterRows(rows){
    var q = String(state.recordSearch || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(function(row){ return formalRowNeedle(row).toLowerCase().indexOf(q) >= 0; });
  }

  function formalRecordSort(rows){
    return rows.sort(function(a, b){
      var dt = Number(b.turn || 0) - Number(a.turn || 0);
      if (dt) return dt;
      return Number(b.seq || 0) - Number(a.seq || 0);
    });
  }

  function formalShijiType(sj){
    var txt = [sj.shizhengji, sj.shilu, sj.szjTitle, sj.turnSummary, sj.szjSummary].join(' ');
    if (/战|兵|军|边|攻城|受陷|大捷|出师/.test(txt)) return '战事';
    if (/崩|薨|卒|病死|自尽|遇害/.test(txt)) return '人物';
    if (/旱|洪|疫|灾|异|地震|雪|蝗/.test(txt)) return '灾异';
    if (/党|弹劾|阉党|东林|朋党/.test(txt)) return '党争';
    if (/赋|税|银|钱|粮|财政|国库/.test(txt)) return '财政';
    return '时政';
  }

  function formalShijiTags(sj){
    var tags = [formalShijiType(sj)];
    var txt = [sj.shizhengji, sj.shilu, sj.szjTitle, sj.turnSummary, sj.szjSummary].join(' ');
    if (/战|兵|军|边/.test(txt)) tags.push('军务');
    if (/官|任|罢|升|贬|人物/.test(txt) || (Array.isArray(sj.personnel) && sj.personnel.length)) tags.push('人事');
    if (/灾|疫|旱|洪|蝗|异/.test(txt)) tags.push('灾异');
    if (/党|弹劾/.test(txt)) tags.push('党争');
    return tags.filter(function(t, i, arr){ return t && arr.indexOf(t) === i; });
  }

  function formalShijiRows(){
    var gm = window.GM || {};
    var rows = [];
    if (Array.isArray(gm.shijiHistory)) {
      gm.shijiHistory.forEach(function(sj, i){
        sj = sj || {};
        var turn = Number(sj.turn || (i + 1));
        var parts = [
          sj.turnSummary || sj.szjSummary || '',
          sj.shizhengji || '',
          sj.shilu || '',
          sj.shizhengji2 || '',
          sj.qijuHistory || '',
          sj.yupiHuiting || ''
        ].filter(Boolean);
        rows.push({
          id: 'shiji-' + i,
          kind: 'shiji',
          rawIndex: i,
          raw: sj,
          turn: turn,
          seq: i,
          date: formalRecordDate(sj, turn),
          type: formalShijiType(sj),
          title: sj.szjTitle || sj.turnSummary || ('第 ' + turn + ' 回合史记'),
          text: parts.join('\n\n') || formalRecordText(sj),
          tags: formalShijiTags(sj),
          source: '史记',
          seal: '史'
        });
      });
    }
    return formalRecordSort(rows);
  }

  function formalQijuNormalize(r){
    r = r || {};
    var fullDirect = r.fullText || r.rawText || r.sourceText || '';
    if (fullDirect) return { text: fullDirect, cat: r.category || r.type || '叙事' };
    if (typeof window._qijuNormalize === 'function') {
      try {
        var old = window._qijuNormalize(r);
        if (old && old.text) return old;
      } catch(_) {}
    }
    var text = '';
    var cat = r.category || '';
    if (r.edicts) {
      var parts = [];
      if (r.edicts.political) parts.push('政：' + r.edicts.political);
      if (r.edicts.military) parts.push('军：' + r.edicts.military);
      if (r.edicts.diplomatic) parts.push('外：' + r.edicts.diplomatic);
      if (r.edicts.economic) parts.push('经：' + r.edicts.economic);
      if (r.edicts.other) parts.push('其余：' + r.edicts.other);
      if (parts.length) { text += parts.join('\n'); cat = cat || '诏令'; }
      if (r.xinglu) { text += (text ? '\n' : '') + '【行止】' + r.xinglu; cat = cat || '行止'; }
    }
    if (!text && r.zhengwen) { text = r.zhengwen; cat = cat || '叙事'; }
    if (!text) text = formalRecordText(r);
    if (!cat) {
      if (/【鸿雁|【驿递|书信/.test(text)) cat = '鸿雁';
      else if (/【朝议|【常朝|廷议|经筵/.test(text)) cat = '朝议';
      else if (/【奏疏|批复|朱批/.test(text)) cat = '奏疏';
      else if (/【诏令|【敕令|诏曰/.test(text)) cat = '诏令';
      else if (/【行止|起居/.test(text)) cat = '行止';
      else if (/【任命|【启程|【赴任|人物|召见/.test(text)) cat = '人事';
      else cat = '叙事';
    }
    return { text: text || '暂无内容', cat: cat || '叙事' };
  }

  function formalQijuRows(){
    var gm = window.GM || {};
    return formalRecordSort((Array.isArray(gm.qijuHistory) ? gm.qijuHistory : []).map(function(r, i){
      var n = formalQijuNormalize(r);
      var turn = Number(r.turn || 0);
      return {
        id: 'qiju-' + i,
        kind: 'qiju',
        rawIndex: i,
        raw: r,
        turn: turn,
        seq: i,
        date: formalRecordDate(r, turn),
        type: n.cat,
        title: n.cat + ' · 第 ' + (turn || '?') + ' 回合',
        text: n.text,
        annotation: r._annotation || '',
        tags: [n.cat].concat(r.tags || []),
        source: '起居注',
        seal: '注'
      };
    }));
  }

  function formalJishiSource(r){
    if (typeof window._jishiSource === 'function') {
      try { return window._jishiSource(r); } catch(_) {}
    }
    var mode = r && r.mode || '';
    var ps = r && r.playerSaid || '';
    if (mode === 'changchao') return { key:'changchao', label:'常朝', icon:'朝' };
    if (mode === 'yuqian') return { key:'yuqian', label:'御前会议', icon:'御' };
    if (mode === 'tinyi' || mode === 'tingyi') return { key:'tingyi', label:'廷议', icon:'廷' };
    if (mode === 'keyi') return { key:'keyi', label:'科议', icon:'科' };
    if (mode === 'jingyan') return { key:'jingyan', label:'经筵', icon:'经' };
    if (mode === 'private') return { key:'private', label:'问对·私下', icon:'私' };
    if (mode === 'formal') return { key:'formal', label:'问对·正式', icon:'殿' };
    if (/抗疏/.test(ps)) return { key:'kangshu', label:'抗疏', icon:'抗' };
    if (/奏疏/.test(ps)) return { key:'memo', label:'奏疏', icon:'奏' };
    if (/鸿雁|书函|来函|书信/.test(ps)) return { key:'letter', label:'鸿雁', icon:'雁' };
    if (/密报|东厂|侦询/.test(ps)) return { key:'mibao', label:'密报', icon:'密' };
    if (/求见/.test(ps)) return { key:'audience', label:'求见', icon:'见' };
    return { key:'record', label:'杂录', icon:'录' };
  }

  function formalJishiRows(){
    var gm = window.GM || {};
    return formalRecordSort((Array.isArray(gm.jishiRecords) ? gm.jishiRecords : []).map(function(r, i){
      r = r || {};
      var src = formalJishiSource(r);
      var turn = Number(r.turn || 0);
      var parts = [];
      if (r.topic) parts.push('议题：' + r.topic);
      if (r.playerSaid) parts.push('上：' + r.playerSaid);
      if (r.npcSaid) parts.push((r.char || '对方') + '：' + r.npcSaid);
      if (r.outcome || r.finalRuling || r.decree || r.approval) parts.push('结论：' + (r.outcome || r.finalRuling || r.decree || r.approval));
      return {
        id: 'jishi-' + i,
        kind: 'jishi',
        rawIndex: i,
        raw: r,
        turn: turn,
        seq: i,
        date: formalRecordDate(r, turn),
        type: src.label,
        title: (r.char || r.from || '纪事') + (r.topic ? ' · ' + r.topic : ''),
        text: parts.join('\n') || formalRecordText(r),
        actor: r.char || r.from || '',
        mood: r.mood || '',
        starred: !!r._starred,
        tags: [src.label].concat(r._starred ? ['要事'] : []),
        source: src.label,
        seal: src.icon || '录'
      };
    }));
  }

  function formalBiannianActiveRows(){
    var gm = window.GM || {};
    var rows = [];
    try {
      if (window.ChronicleTracker && typeof window.ChronicleTracker.getVisible === 'function') {
        rows = rows.concat((window.ChronicleTracker.getVisible() || []).map(function(t, i){
          t = t || {};
          return {
            id: t.id || ('bn-track-' + i),
            kind: 'biannian-active',
            turn: Number(t.startTurn || t.turn || 0),
            date: formalRecordDate(t, t.startTurn || t.turn),
            type: t.type || '长期事势',
            title: t.title || t.name || '长期事势',
            text: t.narrative || t.content || t.desc || '',
            actor: t.actor || t.owner || '',
            status: t.currentStage || t.stage || t.status || '推进中',
            progress: Math.max(0, Math.min(100, Number(t.progress || t.progressPercent || 0) || 0)),
            tags: [t.type || '长期事势'],
            source: '编年',
            seal: '势'
          };
        }));
      }
    } catch(_) {}
    (Array.isArray(gm.biannianItems) ? gm.biannianItems : []).forEach(function(item, i){
      item = item || {};
      var start = Number(item.startTurn || item.turn || gm.turn || 1);
      var duration = Number(item.duration || item.expectedTurns || 1) || 1;
      var elapsed = Math.max(0, Number(gm.turn || start) - start);
      if (item._resolved || item.completed || elapsed >= duration) return;
      rows.push({
        id: item.id || ('bn-active-' + i),
        kind: 'biannian-active',
        turn: start,
        date: formalRecordDate(item, start),
        type: item.type || item.category || '长期事项',
        title: item.title || item.name || '长期事项',
        text: item.content || item.desc || item.description || '',
        actor: item.actor || item.owner || item.assignee || '',
        status: item.stage || item.status || '进行中',
        progress: Math.max(0, Math.min(100, Number(item.progress || item.progressPercent || Math.round(elapsed / duration * 100)) || 0)),
        tags: [item.type || item.category || '长期事项'],
        source: '编年',
        seal: '势'
      });
    });
    return formalRecordSort(rows);
  }

  function formalBiannianRows(){
    var gm = window.GM || {};
    var rows = [];
    (Array.isArray(gm._chronicle) ? gm._chronicle : []).forEach(function(c, i){
      c = c || {};
      var turn = Number(c.turn || 0);
      rows.push({
        id: c.id || ('bn-chronicle-' + i),
        kind: 'biannian',
        raw: c,
        turn: turn,
        seq: i,
        date: formalRecordDate(c, turn),
        type: c.category || c.type || '史册',
        title: c.title || c.name || '编年条目',
        text: c.content || c.text || c.desc || '',
        tags: [c.category || c.type || '史册'],
        source: '永久编年',
        seal: '年'
      });
    });
    return formalRecordSort(rows);
  }

  // ── render functions (body 0 改动 from bridge.js) ────────────────

  function renderRecordCard(row, archiveKind){
    var id = row.id || row.title || '';
    var active = String(id) === String(state.recordId || '');
    var tags = (row.tags || []).filter(Boolean).slice(0, 6);
    var hot = /灾|败|危|急|乱|崩|战|叛|死|降/.test([row.type, row.title, row.text].join(''));
    var meta = [row.date, row.type, row.actor, row.status, row.source].filter(Boolean).join(' · ');
    var actions = actionBtn('展阅', 'select-record-desk', { id:id }, 'tm-mini-btn green');
    if (row.kind === 'shiji') actions += actionBtn('打开原卷', 'record-open-shiji-desk', { id:id }, 'tm-mini-btn');
    if (row.kind === 'qiju') actions += actionBtn('御批', 'record-annotate-desk', { id:id }, 'tm-mini-btn');
    if (row.kind === 'jishi') actions += actionBtn(row.starred ? '取消星标' : '标为要事', 'record-star-desk', { id:id }, 'tm-mini-btn');
    actions += actionBtn(archiveKind === 'jishi' ? '编入纪事' : archiveKind === 'biannian' ? '转为编年' : '收入实录', 'record-archive-desk', { record:archiveKind || 'shilu' }, 'tm-mini-btn');
    return '<article class="records-entry-v5 ' + (active ? 'active ' : '') + (hot ? 'hot' : '') + '" data-record-search-text="' + attr(formalRowNeedle(row)) + '">' +
      '<header><span class="records-seal-v5">' + esc(row.seal || '史') + '</span><span class="records-entry-main-v5"><b>' + fullRecordText(row.title || '未题', '未题', 'records-title-full-v5') + '</b><em>' + fullRecordText(meta || '未署年月', '未署年月', 'records-meta-full-v5') + '</em></span></header>' +
      '<div class="records-entry-body-v5">' + fullRecordText(row.text || '暂无详情。', '暂无详情。', 'records-body-full-v5') + '</div>' +
      (row.annotation ? '<div class="records-annot-v5"><b>御批</b><p>' + fullRecordText(row.annotation, '暂无御批。', 'records-annotation-full-v5') + '</p></div>' : '') +
      (tags.length ? '<div class="tm-chip-row">' + tags.map(function(t){ return actionChip(t, /要事|灾|危|急|战|乱/.test(String(t)) ? 'hot' : ''); }).join('') + '</div>' : '') +
      '<div class="records-card-actions">' + actions + '</div></article>';
  }

  function renderRecordGroup(title, rows, archiveKind, note){
    if (!rows.length) return '';
    return '<section class="records-section-v5" data-record-group><h3 class="records-section-title-v5"><span>' + esc(title) + '</span><small>' + esc(note || (rows.length + ' 条')) + '</small></h3>' + rows.map(function(r){ return renderRecordCard(r, archiveKind); }).join('') + '</section>';
  }

  function renderRecordFilterButtons(options, key, current){
    return '<div class="records-filter-v5">' + options.map(function(t){
      return '<button type="button" class="' + (current === t ? 'active' : '') + '" data-desk-action="record-filter-desk" data-key="' + attr(key) + '" data-value="' + attr(t) + '">' + esc(t) + '</button>';
    }).join('') + '</div>';
  }

  function renderRecordExportButton(tab){
    var fn = tab === 'qiju' ? '_qijuExport' : tab === 'jishi' ? '_jishiExport' : tab === 'biannian' ? '_bnExport' : '_sjlExport';
    return '<button type="button" class="tm-mini-btn" onclick="if(window.' + fn + ')window.' + fn + '()">导出本卷</button>';
  }

  function renderFormalRecordShiji(){
    var events = formalShijiRows();
    var type = state.recordTypeFilter || '全部';
    var types = ['全部','时政','战事','党争','灾异','人物','财政'];
    var rows = formalFilterRows(events).filter(function(r){ return type === '全部' || String(r.type).indexOf(type) >= 0 || (r.tags || []).indexOf(type) >= 0; });
    var groups = formalGroupBy(rows, function(r){ return getTurnText(r.turn); });
    var body = Object.keys(groups).sort(function(a,b){ return Number((groups[b][0] || {}).turn || 0) - Number((groups[a][0] || {}).turn || 0); }).map(function(g){
      return renderRecordGroup(g, groups[g], 'shilu');
    }).join('');
    return renderActionStats([['史记回合', firstArray((window.GM || {}).shijiHistory).length], ['当前显示', rows.length], ['战事', events.filter(function(x){ return /战|军|兵|边/.test((x.type || '') + (x.tags || []).join('')); }).length], ['人事', events.filter(function(x){ return /人|官|任|升|罢/.test((x.type || '') + (x.tags || []).join('')); }).length], ['数据源', 'GM.shijiHistory']]) + renderRecordFilterButtons(types, 'recordTypeFilter', type) + (body || '<div class="records-empty-v5">无匹配史记。史记只收录过回合后的回合推演结果。</div>');
  }

  function renderFormalRecordQiju(){
    var events = formalQijuRows();
    var cats = ['全部','诏令','奏疏','朝议','鸿雁','人事','行止','叙事'];
    var cat = state.qijuCat || '全部';
    var sort = state.qijuSort || '近前';
    var annotOnly = state.qijuAnnotOnly === '只看御批';
    var rows = formalFilterRows(events).filter(function(r){ return cat === '全部' || r.type === cat || (r.tags || []).indexOf(cat) >= 0; });
    if (annotOnly) rows = rows.filter(function(r){ return !!r.annotation; });
    if (sort === '从旧到新') rows = rows.slice().reverse();
    if (sort === '御批优先') rows = rows.slice().sort(function(a, b){ return (b.annotation ? 1 : 0) - (a.annotation ? 1 : 0) || Number(b.turn || 0) - Number(a.turn || 0); });
    var groups = formalGroupBy(rows, function(r){ return '第 ' + (r.turn || '?') + ' 回合' + (r.date ? ' · ' + r.date : ''); });
    var body = Object.keys(groups).map(function(g){
      return renderRecordGroup(g, groups[g], 'shilu', '按日列注');
    }).join('');
    return renderActionStats([['起居注', events.length], ['当前显示', rows.length], ['诏令', events.filter(function(x){ return x.type === '诏令'; }).length], ['奏疏', events.filter(function(x){ return x.type === '奏疏'; }).length], ['御批', events.filter(function(x){ return x.annotation; }).length]]) + renderRecordFilterButtons(cats, 'qijuCat', cat) + renderRecordFilterButtons(['近前','从旧到新','御批优先'], 'qijuSort', sort) + renderRecordFilterButtons(['全部条目','只看御批'], 'qijuAnnotOnly', annotOnly ? '只看御批' : '全部条目') + (body || '<div class="records-empty-v5">无匹配起居注。调整筛选或搜索后再试。</div>');
  }

  function renderFormalRecordJishi(){
    var events = formalJishiRows();
    var sources = ['全部','常朝','御前会议','廷议','科议','经筵','问对·正式','问对·私下','奏疏','抗疏','鸿雁','求见','密报','杂录'];
    var source = state.jishiSource || '全部';
    var view = state.jishiView || '按时间';
    var rows = formalFilterRows(events).filter(function(r){ return source === '全部' || formalLooseText(r.source) === formalLooseText(source) || formalLooseText(r.type) === formalLooseText(source); });
    var groups = formalGroupBy(rows, function(r){
      if (view === '按人物') return r.actor || '未署人物';
      if (view === '按事类') return r.source || r.type || '杂录';
      return '第 ' + (r.turn || '?') + ' 回合' + (r.date ? ' · ' + r.date : '');
    });
    var body = Object.keys(groups).map(function(g){
      return renderRecordGroup(g, groups[g], 'jishi');
    }).join('');
    var uniqueChars = {};
    events.forEach(function(r){ if (r.actor) uniqueChars[r.actor] = 1; });
    return renderActionStats([['纪事', events.length], ['当前显示', rows.length], ['涉及人物', Object.keys(uniqueChars).length], ['星标要事', events.filter(function(x){ return x.starred; }).length], ['来源类', Object.keys(formalGroupBy(events, function(r){ return r.source; })).length]]) + renderRecordFilterButtons(['按时间','按人物','按事类'], 'jishiView', view) + renderRecordFilterButtons(sources, 'jishiSource', source) + (body || '<div class="records-empty-v5">无匹配纪事。调整来源或搜索后再试。</div>');
  }

  function renderBiannianActiveCard(row){
    var progress = Math.max(0, Math.min(100, Number(row.progress || 0) || 0));
    return '<article class="bn-affair-v5" data-record-search-text="' + attr(formalRowNeedle(row)) + '"><header><span class="records-seal-v5">' + esc(row.seal || '势') + '</span><span><b>' + fullRecordText(row.title || '长期事势', '长期事势', 'records-bn-title-full-v5') + '</b><em>' + fullRecordText([row.actor || '有司', row.status || '推进中', row.date].filter(Boolean).join(' · '), '推进中', 'records-bn-meta-full-v5') + '</em></span></header><p>' + fullRecordText(row.text || '此事仍在推进，后续回合会继续影响朝野局势。', '此事仍在推进，后续回合会继续影响朝野局势。', 'records-bn-body-full-v5') + '</p><div class="bn-progress-v5"><i style="width:' + progress + '%"></i></div><div class="tm-chip-row">' + actionChip('进度 ' + progress + '%', progress >= 70 ? 'green' : '') + (row.type ? actionChip(row.type) : '') + '</div></article>';
  }

  function renderFormalRecordBiannian(){
    var activeRows = formalFilterRows(formalBiannianActiveRows());
    var events = formalBiannianRows();
    var filter = state.biannianFilter || '全部';
    var filters = ['全部','进行中','已毕','长期事项','史册','朝代事件'];
    var rows = formalFilterRows(events).filter(function(r){ return filter === '全部' || String((r.tags || []).join(' ') + r.type + r.status + r.source).indexOf(filter) >= 0; });
    var activeHtml = activeRows.length ? activeRows.map(renderBiannianActiveCard).join('') : '<article class="bn-affair-v5"><header><span class="records-seal-v5">势</span><span><b>暂无进行中事势</b><em>工程、军务、财赋改革、外交、暗线会在此处延续</em></span></header><p>当诏令、奏疏、朝议或 AI 推演形成跨回合事项后，会进入编年长期追踪。</p><div class="bn-progress-v5"><i style="width:0%"></i></div></article>';
    var groups = formalGroupBy(rows, function(r){ return r.date || getTurnText(r.turn); });
    var chronicle = Object.keys(groups).map(function(g){
      return renderRecordGroup(g, groups[g], 'biannian');
    }).join('');
    return renderActionStats([['长期事势', activeRows.length], ['编年条目', events.length], ['当前显示', rows.length], ['进行中', events.filter(function(x){ return (x.tags || []).indexOf('进行中') >= 0; }).length], ['永久史册', events.filter(function(x){ return x.source === '永久编年'; }).length]]) + renderRecordFilterButtons(filters, 'biannianFilter', filter) + '<section class="records-section-v5" data-record-group><h3 class="records-section-title-v5"><span>长期事势</span><small>' + esc(activeRows.length) + ' 件</small></h3><div class="bn-active-grid-v5">' + activeHtml + '</div></section>' + (chronicle || '<div class="records-empty-v5">暂无编年条目。</div>');
  }

  function renderFormalRecordsPanel(){
    var tab = state.recordTab || 'shiji';
    if (tab === 'shilu') tab = 'qiju';
    state.recordTab = tab;
    var gm = window.GM || {};
    var rowsByTab = { shiji:formalShijiRows(), qiju:formalQijuRows(), jishi:formalJishiRows(), biannian:formalBiannianRows() };
    var tabs = [['shiji','史记','回合本纪'],['qiju','起居注','逐日实录'],['jishi','纪事','本末对话'],['biannian','编年','长期事势']];
    var currentRows = rowsByTab[tab] || rowsByTab.shiji;
    var selected = currentRows.find(function(x){ return String(x.id || x.title) === String(state.recordId || ''); }) || currentRows[0] || {};
    if (selected.id) state.recordId = selected.id;
    var counts = {
      shiji: rowsByTab.shiji.length,
      qiju: rowsByTab.qiju.length,
      jishi: rowsByTab.jishi.length,
      biannian: rowsByTab.biannian.length + formalBiannianActiveRows().length
    };
    var spine = tabs.map(function(t){
      var active = tab === t[0];
      return '<button type="button" class="records-tab-v5 ' + (active ? 'active' : '') + '" data-desk-action="record-tab-desk" data-tab="' + attr(t[0]) + '"><b>' + esc(t[1]) + '</b><span>' + esc(t[2]) + '</span><em>' + esc(counts[t[0]] || 0) + '</em></button>';
    }).join('');
    var title = (tabs.find(function(t){ return t[0] === tab; }) || tabs[0]);
    var renderer = { shiji:renderFormalRecordShiji, qiju:renderFormalRecordQiju, jishi:renderFormalRecordJishi, biannian:renderFormalRecordBiannian }[tab] || renderFormalRecordShiji;
    var selectedMeta = [selected.date, selected.type, selected.actor, selected.status, selected.source].filter(Boolean).join(' · ');
    var detailActions = actionBtn('收入实录', 'record-archive-desk', { record:'shilu' }, 'tm-mini-btn green') + actionBtn('编入纪事', 'record-archive-desk', { record:'jishi' }, 'tm-mini-btn') + actionBtn('转为编年', 'record-archive-desk', { record:'biannian' }, 'tm-mini-btn');
    if (selected.kind === 'shiji') detailActions = actionBtn('打开原卷', 'record-open-shiji-desk', { id:selected.id || '' }, 'tm-mini-btn green') + actionBtn('摘录入起居注', 'record-archive-desk', { record:'shilu' }, 'tm-mini-btn') + actionBtn('转为编年线索', 'record-archive-desk', { record:'biannian' }, 'tm-mini-btn');
    if (selected.kind === 'qiju') detailActions += actionBtn('御批', 'record-annotate-desk', { id:selected.id || '' }, 'tm-mini-btn');
    if (selected.kind === 'jishi') detailActions += actionBtn(selected.starred ? '取消星标' : '标为要事', 'record-star-desk', { id:selected.id || '' }, 'tm-mini-btn');
    return '<section class="records-cabinet-v5">' +
      '<aside class="records-spine-v5"><div class="tm-panel-v4-title"><span class="seal">史</span><span><b>史官实录</b><span>史记 / 起居注 / 纪事 / 编年</span></span></div>' + spine + '<div class="records-spine-note-v5"><b>承接旧四页</b><p>史记只读回合推演结果；近事和邸报仍归事件栏。起居注、纪事、编年分别沿用旧数据源。</p></div>' + actionBtn('关联人物', 'module-desk', { kind:'renwu' }, 'tm-mini-btn') + '</aside>' +
      '<main class="records-paper-v5"><header class="records-paper-head-v5"><span><h2>' + esc(title[1]) + '</h2><p>' + esc(title[2]) + '。本面板按旧四页真实职责收录，不把近事/邸报混入史记。</p></span><span class="tm-chip-row">' + actionChip('第 ' + esc(gm.turn || 1) + ' 回', 'green') + actionChip('可搜索') + '</span></header>' +
      '<div class="records-toolbar-v5"><input class="tm-input" data-desk-record-search value="' + attr(state.recordSearch || '') + '" placeholder="搜索日期、人物、事类、正文"><span class="tm-chip-row">' + renderRecordExportButton(tab) + actionBtn('关联人物', 'module-desk', { kind:'renwu' }, 'tm-mini-btn') + '</span></div>' +
      '<div class="records-scroll-v5">' + renderer() + '<div class="records-search-empty-v5" style="display:none">未找到匹配条目。</div></div>' +
      '</main>' +
      '<aside class="records-detail-v5"><div class="tm-panel-v4-title"><span class="seal">' + esc(selected.seal || '卷') + '</span><span><b>展卷</b><span>' + fullRecordText(selectedMeta || '未选择条目', '未选择条目', 'records-detail-meta-full-v5') + '</span></span></div><h3>' + fullRecordText(selected.title || '暂无档案', '暂无档案', 'records-detail-title-full-v5') + '</h3><div class="records-detail-text-v5 wd-selectable">' + fullRecordText(selected.text || '暂无内容。', '暂无内容。', 'records-detail-body-full-v5') + '</div><textarea class="tm-textarea records-detail-source-v5" data-desk-record-body>' + esc(selected.text || '') + '</textarea>' + (selected.annotation ? '<div class="records-annot-v5"><b>御批</b><p>' + fullRecordText(selected.annotation, '暂无御批。', 'records-detail-annotation-full-v5') + '</p></div>' : '') + '<div class="records-detail-actions-v5">' + detailActions + '</div></aside>' +
      '</section>';
  }

  // ── public API attach (供 bridge / 其他 module 用) ────────────────
  bridge.records = bridge.records || {};
  bridge.records.renderFormalRecordsPanel = renderFormalRecordsPanel;
  bridge.records.renderFormalRecordShiji = renderFormalRecordShiji;
  bridge.records.renderFormalRecordQiju = renderFormalRecordQiju;
  bridge.records.renderFormalRecordJishi = renderFormalRecordJishi;
  bridge.records.renderFormalRecordBiannian = renderFormalRecordBiannian;
})();
