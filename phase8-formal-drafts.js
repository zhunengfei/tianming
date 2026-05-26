// phase8-formal-drafts.js·起草面板·desk overlay·CSS·诏书/奏疏/书信/记录/朝政时政预览面板
// split from phase8-formal-bridge.js·2026-05-26·Wave 4
// paradigm·head alias 块·body 0 改动·跨闭包 helper 通过 bridge._xxx + late-bound wrapper

(function(){
  'use strict';

  var bridge = window.TMPhase8FormalBridge;
  if (!bridge) {
    console.error('[phase8-formal-drafts] TMPhase8FormalBridge not init·bridge.js 必须先 load');
    return;
  }

  var state = bridge._state || window.TM_PHASE8_FORMAL;

  // ── alias 块 (cross-closure helpers from bridge._xxx) ──────────────
  var esc = bridge._esc;
  var attr = bridge._attr;
  var asset = bridge._asset;
  var fmtNum = bridge._fmtNum;
  var miniRows = bridge._miniRows;
  var actionButton = bridge._actionButton;
  var moduleShell = bridge._moduleShell;
  var dossierRows = bridge._dossierRows;
  var ownerKey = bridge._ownerKey;
  var ownerName = bridge._ownerName;
  var findFaction = bridge._findFaction;
  var findPerson = bridge._findPerson;
  var personKey = bridge._personKey;
  var personNameKey = bridge._personNameKey;
  var getPeople = bridge._getPeople;
  var getMapData = bridge._getMapData;
  var getParties = bridge._getParties;
  var getClasses = bridge._getClasses;
  var collectRecentEvents = bridge._collectRecentEvents;
  var getTurnText = bridge._getTurnText;
  var firstArray = bridge._firstArray;
  var actionBtn = bridge._actionBtn;
  var actionChip = bridge._actionChip;
  var renderActionStats = bridge._renderActionStats;
  var compactText = bridge._compactText;
  var getMemorials = bridge._getMemorials;
  var getIssues = bridge._getIssues;
  var getLetters = bridge._getLetters;
  var getActiveScenario = bridge._getActiveScenario;
  var getArmies = bridge._getArmies;
  var issueIsResolved = bridge._issueIsResolved;
  var tmfRenwuPortrait = bridge._tmfRenwuPortrait;
  var fullHongyanText = bridge._fullHongyanText;
  var toast = bridge._toast;
  var cssEscape = bridge._cssEscape;
  var clearFormalDraftStore = bridge._clearFormalDraftStore;

  // ── late-bound wrappers (orchestration calls into bridge) ──────────
  function openPanel(slot){ return bridge.openPanel(slot); }
  function openModule(kind, opts){ return bridge.openModule(kind, opts); }
  function openGuoku(){ return bridge.openGuoku(); }
  function openChaoyiMode(mode){ return bridge._openChaoyiMode(mode); }
  function openShizhengPreviewPanel(){ return bridge._openShizhengPreviewPanel(); }
  function closeModule(){ return bridge._closeModule(); }
  function returnFormalHomeSoon(){ return bridge._returnFormalHomeSoon(); }
  function saveFormalDraftsToGM(captureOpen){ return bridge._saveFormalDraftsToGM(captureOpen); }
  function restoreFormalDraftsFromGM(force){ return bridge._restoreFormalDraftsFromGM(force); }
  function handleModuleAction(action, data){ return bridge._handleModuleAction(action, data); }
  function updateRailBadges(){ return bridge._updateRailBadges(); }
  function renderEventFeed(){ return bridge._renderEventFeed(); }

  // ── module body (P3 Wave 4 迁入·1959 行·body 0 改动) ─────────────

  function installDeskPanelExactStyles(){
    var st = document.getElementById('tm-phase8-desk-panel-style');
    if (!st) {
      st = document.createElement('style');
      st.id = 'tm-phase8-desk-panel-style';
      document.head.appendChild(st);
    }
    st.textContent = [
      'body.tm-phase8-formal .tm-desk-overlay{position:fixed;inset:0;z-index:10020;background:rgba(8,6,4,.58);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;color:#eadfbd;font-family:"STKaiti","KaiTi","楷体",serif;}',
      'body.tm-phase8-formal .tm-desk-panel{width:min(1120px,92vw);height:min(780px,86vh);display:flex;flex-direction:column;border:1px solid rgba(201,160,69,.46);background:linear-gradient(180deg,rgba(28,21,15,.98),rgba(9,7,6,.98));box-shadow:0 22px 80px rgba(0,0,0,.72);color:#eadfbd;overflow:hidden;}',
      'body.tm-phase8-formal .tm-desk-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 16px;border-bottom:1px solid rgba(201,160,69,.22);background:rgba(0,0,0,.24);}',
      'body.tm-phase8-formal .tm-desk-head h2{margin:0;color:#f2d98d;font-size:22px;letter-spacing:.20em;font-weight:500;}',
      'body.tm-phase8-formal .tm-desk-head p{margin:4px 0 0;color:rgba(232,220,187,.55);font-size:12px;letter-spacing:.08em;}',
      'body.tm-phase8-formal .tm-desk-close{width:34px;height:34px;border:1px solid rgba(201,160,69,.34);background:rgba(0,0,0,.28);color:#eadfbd;cursor:pointer;}',
      'body.tm-phase8-formal .tm-desk-body{flex:1;min-height:0;display:grid;grid-template-columns:260px minmax(0,1fr) 300px;gap:12px;padding:12px;overflow:hidden;}',
      'body.tm-phase8-formal .tm-desk-pane{min-height:0;border:1px solid rgba(201,160,69,.18);background:linear-gradient(180deg,rgba(255,245,210,.045),rgba(0,0,0,.16));overflow:auto;scrollbar-color:rgba(201,160,69,.48) rgba(0,0,0,.24);}',
      'body.tm-phase8-formal .tm-desk-pane.pad{padding:12px;}',
      'body.tm-phase8-formal .tm-desk-tabs{display:flex;gap:6px;padding:8px;border-bottom:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.18);}',
      'body.tm-phase8-formal .tm-desk-tab{border:1px solid rgba(201,160,69,.20);background:rgba(0,0,0,.20);color:rgba(235,222,188,.72);height:30px;padding:0 10px;cursor:pointer;font-family:inherit;}',
      'body.tm-phase8-formal .tm-desk-tab.active{color:#f7dda0;border-color:rgba(213,103,73,.46);background:linear-gradient(180deg,rgba(106,43,30,.70),rgba(35,20,14,.82));}',
      'body.tm-phase8-formal .tm-desk-list{display:flex;flex-direction:column;gap:7px;padding:10px;}',
      'body.tm-phase8-formal .tm-desk-item{width:100%;text-align:left;border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.18);color:#eadfbd;padding:9px 10px;cursor:pointer;font-family:inherit;}',
      'body.tm-phase8-formal .tm-desk-item b{display:block;color:#f2d98d;font-size:14px;letter-spacing:.08em;}',
      'body.tm-phase8-formal .tm-desk-item span{display:block;margin-top:4px;color:rgba(232,220,187,.55);font-size:11px;line-height:1.45;}',
      'body.tm-phase8-formal .tm-desk-item.hot{border-color:rgba(198,78,55,.38);box-shadow:inset 3px 0 rgba(198,78,55,.36);}',
      'body.tm-phase8-formal .tm-desk-title{margin:0 0 10px;color:#f2d98d;font-size:18px;letter-spacing:.14em;}',
      'body.tm-phase8-formal .tm-desk-subtitle{margin:12px 0 7px;color:#d8bd76;font-size:13px;letter-spacing:.12em;}',
      'body.tm-phase8-formal .tm-desk-field{display:grid;grid-template-columns:76px minmax(0,1fr);gap:8px;align-items:center;margin-bottom:8px;color:rgba(232,220,187,.68);font-size:12px;}',
      'body.tm-phase8-formal .tm-desk-field input,body.tm-phase8-formal .tm-desk-field select,body.tm-phase8-formal .tm-desk-pane textarea,body.tm-phase8-formal .tm-desk-input{width:100%;box-sizing:border-box;border:1px solid rgba(201,160,69,.20);background:rgba(0,0,0,.22);color:#eadfbd;padding:8px;font-family:inherit;}',
      'body.tm-phase8-formal .tm-desk-pane textarea{min-height:170px;line-height:1.7;resize:vertical;}',
      'body.tm-phase8-formal .tm-desk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}',
      'body.tm-phase8-formal .tm-desk-stat{border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.18);padding:8px;}',
      'body.tm-phase8-formal .tm-desk-stat span{display:block;color:rgba(232,220,187,.52);font-size:11px;}',
      'body.tm-phase8-formal .tm-desk-stat b{display:block;color:#f2d98d;font-size:15px;margin-top:3px;}',
      'body.tm-phase8-formal .tm-desk-row{display:grid;grid-template-columns:88px minmax(0,1fr);gap:8px;padding:7px 0;border-bottom:1px solid rgba(201,160,69,.10);font-size:12px;}',
      'body.tm-phase8-formal .tm-desk-row span{color:rgba(232,220,187,.50);}',
      'body.tm-phase8-formal .tm-desk-row b{color:#eadfbd;font-weight:400;}',
      'body.tm-phase8-formal .tm-desk-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;}',
      'body.tm-phase8-formal .tm-desk-btn{min-height:30px;border:1px solid rgba(201,160,69,.24);background:rgba(18,13,10,.78);color:#eadfbd;padding:5px 10px;cursor:pointer;font-family:inherit;letter-spacing:.06em;}',
      'body.tm-phase8-formal .tm-desk-btn.primary{border-color:rgba(213,103,73,.52);background:linear-gradient(180deg,rgba(126,45,32,.86),rgba(58,25,18,.92));color:#ffe1ac;}',
      'body.tm-phase8-formal .tm-desk-card{border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.15);padding:9px 10px;margin-bottom:8px;}',
      'body.tm-phase8-formal .tm-desk-card b{display:block;color:#f2d98d;font-size:13px;}',
      'body.tm-phase8-formal .tm-desk-card p{margin:6px 0 0;color:rgba(232,220,187,.68);font-size:12px;line-height:1.6;}',
      'body.tm-phase8-formal .tm-desk-table{width:100%;border-collapse:collapse;font-size:12px;}',
      'body.tm-phase8-formal .tm-desk-table th,body.tm-phase8-formal .tm-desk-table td{border:1px solid rgba(201,160,69,.13);padding:7px 8px;text-align:left;}',
      'body.tm-phase8-formal .tm-desk-table th{color:#f2d98d;background:rgba(0,0,0,.22);font-weight:400;}',
      'body.tm-phase8-formal .tm-desk-empty{padding:14px;color:rgba(232,220,187,.55);font-size:12px;line-height:1.7;}',
      'body.tm-phase8-formal .tm-desk-panel[data-kind="records"] .tm-desk-body{grid-template-columns:230px minmax(0,1fr) 320px;}',
      '@media (max-width:1200px){body.tm-phase8-formal .tm-desk-body{grid-template-columns:220px minmax(0,1fr)}body.tm-phase8-formal .tm-desk-pane.side{display:none;}}'
    ].join('\n');
  }

  function closeDeskOverlay(){
    var nodes = document.querySelectorAll('.tm-desk-overlay');
    Array.prototype.forEach.call(nodes, function(n){
      captureDeskOverlayState(n);
      n.remove();
    });
  }

  function deskPanelShell(kind, title, sub, left, main, right){
    installDeskPanelExactStyles();
    return '<section class="tm-desk-panel" data-kind="' + attr(kind) + '" role="dialog" aria-label="' + attr(title) + '">' +
      '<header class="tm-desk-head"><div><h2>' + esc(title) + '</h2><p>' + esc(sub || '') + '</p></div><button type="button" class="tm-desk-close" data-close-bridge="1">×</button></header>' +
      '<div class="tm-desk-body"><aside class="tm-desk-pane">' + left + '</aside><main class="tm-desk-pane pad">' + main + '</main><aside class="tm-desk-pane pad side">' + right + '</aside></div>' +
      '</section>';
  }

  function openDeskOverlay(id, html){
    closeModule();
    closeDeskOverlay();
    var ov = document.createElement('div');
    ov.id = id;
    ov.className = 'tm-desk-overlay tm-bridge-overlay show';
    ov.innerHTML = '<div class="tm-bridge-scrim" data-close-bridge="1"></div>' + html;
    ov.addEventListener('click', function(e){
      if (e.target === ov || (e.target && e.target.closest && e.target.closest('[data-close-bridge]'))) {
        closeDeskOverlay();
        return;
      }
      var btn = e.target && e.target.closest ? e.target.closest('[data-desk-action],[data-module-action]') : null;
      if (!btn) return;
      handleDeskAction(btn.dataset.deskAction || btn.dataset.moduleAction, btn.dataset, id);
    });
    ov.addEventListener('input', function(e){
      var search = e.target && e.target.closest ? e.target.closest('[data-desk-letter-search]') : null;
      if (search) {
        state.letterSearch = String(search.value || '');
        applyFormalLetterSearch(ov, state.letterSearch);
        saveFormalDraftsToGM(false);
        return;
      }
      var recordSearch = e.target && e.target.closest ? e.target.closest('[data-desk-record-search]') : null;
      if (recordSearch) {
        state.recordSearch = String(recordSearch.value || '');
        applyFormalRecordSearch(ov, state.recordSearch);
        return;
      }
      var draft = e.target && e.target.closest ? e.target.closest('[data-letter-draft-field]') : null;
      if (draft) {
        updateFormalLetterDraft(draft);
        return;
      }
      var memorialReply = e.target && e.target.closest ? e.target.closest('[data-desk-memorial-reply]') : null;
      if (memorialReply) {
        updateFormalMemorialReply(memorialReply);
        return;
      }
      var edict = e.target && e.target.closest ? e.target.closest('[data-desk-edict-cat],[data-desk-edict-body],[data-desk-player-action],#edict-pol,#edict-mil,#edict-dip,#edict-eco,#edict-oth,#xinglu-pub') : null;
      if (edict) updateFormalEdictDraft(edict);
    });
    ov.addEventListener('change', function(e){
      var draft = e.target && e.target.closest ? e.target.closest('[data-letter-draft-field]') : null;
      if (draft) {
        updateFormalLetterDraft(draft);
        return;
      }
      var memorialReply = e.target && e.target.closest ? e.target.closest('[data-desk-memorial-reply]') : null;
      if (memorialReply) {
        updateFormalMemorialReply(memorialReply);
        return;
      }
      var edict = e.target && e.target.closest ? e.target.closest('[data-desk-edict-cat],[data-desk-edict-body],[data-desk-player-action],#edict-pol,#edict-mil,#edict-dip,#edict-eco,#edict-oth,#xinglu-pub') : null;
      if (edict) updateFormalEdictDraft(edict);
    });
    document.body.appendChild(ov);
    if (id === 'tm-action-letter-overlay') applyFormalLetterSearch(ov, state.letterSearch || '');
    if (id === 'tm-action-records-overlay') applyFormalRecordSearch(ov, state.recordSearch || '');
  }

  function deskGM(){
    if (!window.GM) window.GM = {};
    return window.GM;
  }

  function deskArray(obj, key){
    if (!obj[key] || !Array.isArray(obj[key])) obj[key] = [];
    return obj[key];
  }

  function deskValue(selector, fallback){
    var root = document.querySelector('.tm-desk-overlay');
    var el = root && root.querySelector(selector);
    if (!el) return fallback || '';
    return String(el.value == null ? (fallback || '') : el.value).trim();
  }

  function updateFormalLetterDraft(el){
    if (!el || !el.dataset) return;
    var key = el.dataset.letterDraftField;
    if (!key) return;
    var draft = state.letterDraft || {};
    draft[key] = String(el.value == null ? '' : el.value);
    state.letterDraft = draft;
    saveFormalDraftsToGM(false);
  }

  function updateFormalMemorialReply(el){
    if (!el) return;
    var key = (el.getAttribute && (el.getAttribute('data-memorial-reply-id') || el.getAttribute('id'))) || '';
    if (!key) return;
    state.memorialReplies = state.memorialReplies || {};
    state.memorialReplies[key] = String(el.value == null ? '' : el.value);
    saveFormalDraftsToGM(false);
  }

  function updateFormalEdictDraft(el){
    if (!el) return;
    var value = String(el.value == null ? '' : el.value);
    if (el.id && /^edict-/.test(el.id)) {
      syncFormalEdictDraft(el.id, value);
    }
    var cat = el.getAttribute && el.getAttribute('data-desk-edict-cat');
    if (cat) {
      state.edictDrafts = state.edictDrafts || {};
      state.edictDrafts[cat] = value;
      if (cat === 'finance') state.edictDrafts.economic = value;
      if (cat === 'other') state.edictDrafts.private = value;
    }
    if ((el.id === 'xinglu-pub') || (el.hasAttribute && el.hasAttribute('data-desk-player-action'))) {
      state.playerAction = value;
    }
    if (el.hasAttribute && el.hasAttribute('data-desk-edict-body')) {
      state.edictDraft = value.split(/\n+/).map(function(x){ return x.trim(); }).filter(Boolean);
    }
    saveFormalDraftsToGM(false);
  }

  function captureDeskOverlayState(root){
    if (!root || !root.querySelectorAll) return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-letter-draft-field]'), updateFormalLetterDraft);
    Array.prototype.forEach.call(root.querySelectorAll('[data-desk-memorial-reply]'), updateFormalMemorialReply);
    Array.prototype.forEach.call(root.querySelectorAll('[data-desk-edict-cat],[data-desk-edict-body],[data-desk-player-action],#edict-pol,#edict-mil,#edict-dip,#edict-eco,#edict-oth,#xinglu-pub'), updateFormalEdictDraft);
    saveFormalDraftsToGM(false);
  }

  function applyFormalLetterSearch(root, value){
    root = root || document;
    var q = String(value || '').trim().toLowerCase();
    var any = false;
    Array.prototype.forEach.call(root.querySelectorAll('[data-letter-search-text]'), function(row){
      var hay = String(row.getAttribute('data-letter-search-text') || '').toLowerCase();
      var show = !q || hay.indexOf(q) >= 0;
      row.style.display = show ? '' : 'none';
      if (show) any = true;
    });
    Array.prototype.forEach.call(root.querySelectorAll('.hy-region-group-v5'), function(group){
      var has = false;
      Array.prototype.forEach.call(group.querySelectorAll('[data-letter-search-text]'), function(row){
        if (row.style.display !== 'none') has = true;
      });
      group.style.display = has ? '' : 'none';
    });
    var empty = root.querySelector('.hy-search-empty-v5');
    if (empty) empty.style.display = any ? 'none' : '';
  }

  function applyFormalRecordSearch(root, value){
    root = root || document;
    var q = String(value || '').trim().toLowerCase();
    var any = false;
    Array.prototype.forEach.call(root.querySelectorAll('[data-record-search-text]'), function(row){
      var hay = String(row.getAttribute('data-record-search-text') || '').toLowerCase();
      var show = !q || hay.indexOf(q) >= 0;
      row.style.display = show ? '' : 'none';
      if (show) any = true;
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-record-group]'), function(group){
      var has = false;
      Array.prototype.forEach.call(group.querySelectorAll('[data-record-search-text]'), function(row){
        if (row.style.display !== 'none') has = true;
      });
      group.style.display = has ? '' : 'none';
    });
    var empty = root.querySelector('.records-search-empty-v5');
    if (empty) empty.style.display = any ? 'none' : '';
  }

  function deskDateText(turn){
    try {
      if (typeof window.getTSText === 'function') return window.getTSText(turn || (window.GM && GM.turn) || 1);
    } catch(_) {}
    return getTurnText(turn || (window.GM && GM.turn) || 1);
  }

  function deskId(prefix){
    try {
      if (typeof window.uid === 'function') return window.uid();
    } catch(_) {}
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function deskRefreshLegacy(){
    ['renderMemorials','renderLetterPanel','renderJishi','renderQiju','renderBiannian','renderGameState'].forEach(function(name){
      try { if (typeof window[name] === 'function') window[name](); } catch(_) {}
    });
    try { renderEventFeed(); } catch(_) {}
    try { updateRailBadges(); } catch(_) {}
  }

  function deskRemember(name, text, emotion, importance){
    if (!name || !text) return;
    try {
      if (window.NpcMemorySystem && typeof NpcMemorySystem.remember === 'function') {
        NpcMemorySystem.remember(name, text, emotion || '平', importance || 5, (window.P && P.playerInfo && P.playerInfo.characterName) || '陛下');
      }
    } catch(_) {}
  }

  function deskDecision(category, desc, consequence){
    try {
      if (typeof window.recordPlayerDecision === 'function') {
        window.recordPlayerDecision(category, desc, consequence || '');
      }
    } catch(_) {}
  }

  function deskRecord(type, title, text, tags){
    var gm = deskGM();
    var turn = Number(gm.turn || 1);
    var date = deskDateText(turn);
    var full = String(text || title || '').replace(/\r\n/g, '\n').trim();
    var summary = compactText(full || title || '', 240);
    if (!full && !summary) return;
    deskArray(gm, 'qijuHistory').unshift({
      turn: turn,
      date: date,
      content: '【' + type + '】' + full,
      text: '【' + type + '】' + full,
      fullText: '【' + type + '】' + full,
      rawText: full,
      summary: '【' + type + '】' + summary,
      category: type,
      tags: tags || [type]
    });
    deskArray(gm, '_chronicle').push({
      turn: turn,
      date: date,
      type: type,
      title: title || type,
      text: full,
      content: full,
      fullText: full,
      summary: summary,
      tags: tags || [type]
    });
    if (window.EB && Array.isArray(EB.items)) {
      EB.items.unshift({ turn: turn, date: date, type: type, title: title || type, text: summary, summary: summary, detail: full, content: full, fullText: full });
      if (EB.items.length > 120) EB.items.length = 120;
    } else {
      try { if (typeof window.addEB === 'function') window.addEB(type, summary); } catch(_) {}
    }
  }

  function deskEdictBodyValue(){
    var legacyCats = [
      { id:'edict-pol', key:'policy', label:'政令' },
      { id:'edict-mil', key:'military', label:'军令' },
      { id:'edict-dip', key:'diplomatic', label:'外交' },
      { id:'edict-eco', key:'finance', label:'经济' },
      { id:'edict-oth', key:'other', label:'其他' }
    ];
    var legacyParts = legacyCats.map(function(cat){
      var el = document.getElementById(cat.id);
      var body = el ? String(el.value || '').trim() : '';
      if (!state.edictDrafts) state.edictDrafts = {};
      state.edictDrafts[cat.key] = body;
      if (cat.id === 'edict-eco') state.edictDrafts.economic = body;
      if (cat.id === 'edict-oth') state.edictDrafts.private = body;
      if (!body) return '';
      return '【' + cat.label + '】\n' + body;
    }).filter(Boolean);
    if (legacyParts.length) return legacyParts.join('\n\n');
    var categoryRows = Array.prototype.slice.call(document.querySelectorAll('[data-desk-edict-cat]'));
    if (categoryRows.length) {
      var parts = categoryRows.map(function(el){
        var body = String(el.value || '').trim();
        if (!state.edictDrafts) state.edictDrafts = {};
        state.edictDrafts[el.getAttribute('data-desk-edict-cat') || 'policy'] = body;
        if (!body) return '';
        var label = el.getAttribute('data-label') || '诏令';
        return '【' + label + '】\n' + body;
      }).filter(Boolean);
      if (parts.length) return parts.join('\n\n');
    }
    return deskValue('[data-desk-edict-body]', '').trim();
  }

  function deskSaveEdictDraft(){
    var gm = deskGM();
    var body = deskEdictBodyValue();
    if (!body) { toast('请先写下诏令正文'); return false; }
    state.edictDraft = body.split(/\n+/).map(function(x){ return x.trim(); }).filter(Boolean);
    state.playerAction = deskValue('#xinglu-pub', deskValue('[data-desk-player-action]', state.playerAction || '')).trim();
    deskArray(gm, '_edictSuggestions').push({
      source: '御案草诏',
      from: (window.P && P.playerInfo && P.playerInfo.characterName) || '陛下',
      content: body,
      turn: gm.turn || 1,
      used: false
    });
    deskRecord('草诏', '御案草诏暂存', body, ['诏书','草稿']);
    deskDecision('edict', body, '暂存为诏书建议，待后续颁行或票拟');
    deskRefreshLegacy();
    toast('诏令已存入草诏与建议库');
    saveFormalDraftsToGM(true);
    return true;
  }

  function deskPublishEdict(){
    var gm = deskGM();
    var body = deskEdictBodyValue();
    if (!body) { toast('请先写下诏令正文'); return; }
    state.playerAction = deskValue('#xinglu-pub', deskValue('[data-desk-player-action]', state.playerAction || '')).trim();
    var edictType = 'policy';
    try { if (typeof window.classifyEdict === 'function') edictType = window.classifyEdict(body) || edictType; } catch(_) {}
    var typeText = deskValue('[data-desk-edict-type]', '诏令') || '诏令';
    var receiver = deskValue('[data-desk-edict-receiver]', '内阁、六部、都察院') || '内阁、六部、都察院';
    var title = compactText(body.replace(/\s+/g, ' '), 32) || '御前诏令';
    var forecast = null;
    try { if (typeof window.generateEdictForecast === 'function') forecast = window.generateEdictForecast(edictType); } catch(_) {}
    var entry = {
      id: deskId('edict'),
      content: body,
      title: title,
      category: typeText,
      type: edictType,
      turn: gm.turn || 1,
      date: deskDateText(gm.turn || 1),
      status: 'pending',
      assignee: receiver,
      feedback: '',
      progressPercent: 0,
      source: 'phase8-desk',
      forecast: forecast && forecast.forecast ? forecast.forecast : ''
    };
    deskArray(gm, '_edictTracker').push(entry);
    deskRecord('诏令', title, body, ['诏书', typeText, edictType]);
    deskDecision('edict', body, '已进入诏令追踪，后续过回合推演会读取执行与阻力');
    state.edictDraft = [];
    state.edictDrafts = {};
    state.playerAction = '';
    clearFormalDraftStore(['edictDraft', 'edictDrafts', 'playerAction']);
    deskRefreshLegacy();
    toast('诏令已颁行，过回合会进入执行推演');
    openZhaoPreviewPanel();
  }

  function deskFindRawMemorial(id){
    var gm = deskGM();
    var list = firstArray(gm.memorials, gm.zoushu, gm.memorialQueue, gm.petitions, gm.recentMemorials);
    var sid = String(id || '');
    var parsed = /^mem-(\d+)$/.exec(sid);
    if (parsed && list[Number(parsed[1])]) return { raw: list[Number(parsed[1])], index: Number(parsed[1]), list: list };
    for (var i = 0; i < list.length; i++) {
      var x = list[i];
      if (!x) continue;
      var xid = String(x.id || ('mem-' + i));
      if (xid === sid) return { raw: x, index: i, list: list };
    }
    var issueMatch = /^issue-mem-(\d+)$/.exec(sid);
    if (issueMatch) {
      var issue = getIssues()[Number(issueMatch[1])];
      if (issue) {
        var created = {
          id: deskId('mem'),
          title: issue.title || '御案转奏',
          from: issue.proposer || '通政司',
          dept: issue.category || '御案时政',
          type: issue.category || '议题',
          content: issue.text || issue.narrative || issue.detail || '',
          text: issue.text || issue.narrative || issue.detail || '',
          status: 'pending',
          turn: (gm.turn || 1),
          _fromIssueId: issue.id || ''
        };
        var mems = deskArray(gm, 'memorials');
        mems.push(created);
        return { raw: created, index: mems.length - 1, list: mems };
      }
    }
    return null;
  }

  function deskStageMemorial(id, decision, replyId){
    var gm = deskGM();
    var found = deskFindRawMemorial(id);
    if (!found || !found.raw) { toast('未找到原奏疏记录'); return; }
    var m = found.raw;
    var replyEl = replyId ? document.getElementById(replyId) : null;
    var reply = (replyEl ? String(replyEl.value || '') : deskValue('[data-desk-memorial-reply]', '')) || '着有关衙门速核，限期具册。';
    if ((!replyEl || !String(replyEl.value || '').trim()) && replyId && state.memorialReplies && Object.prototype.hasOwnProperty.call(state.memorialReplies, replyId) && String(state.memorialReplies[replyId] || '').trim()) {
      reply = String(state.memorialReplies[replyId] || '').trim();
    }
    if (decision === 'hold') {
      m.status = 'pending_review';
      m.reply = reply || '再议';
      m._commitApplied = false;
    } else if (typeof window._stageMemorialDecision === 'function') {
      window._stageMemorialDecision(m, decision, reply);
    } else {
      m.status = decision;
      m.reply = reply;
      m._commitApplied = false;
      var approved = deskArray(gm, '_approvedMemorials');
      approved.push({ from: m.from, type: m.type, content: m.content || m.text || '', turn: gm.turn || 1, reply: reply, action: decision });
      if (approved.length > 30) approved.shift();
    }
    deskRecord('朱批', (m.title || m.topic || '奏疏批复'), (m.from || '臣工') + '所奏：' + compactText(m.content || m.text || m.body || '', 100) + '。朱批：' + reply, ['奏疏','朱批']);
    deskDecision('memorial', (m.from || '臣工') + '所奏：' + (m.title || m.topic || compactText(m.content || m.text || '', 30)), '决定：' + decision + '；过回合前奏疏提交器会落实记忆与回传');
    if (decision !== 'hold') deskRemember(m.from, '奏疏已得朱批：' + reply, decision === 'rejected' ? '忧' : '敬', 5);
    deskRefreshLegacy();
    toast(decision === 'approved' ? '已准奏，过回合前生效' : decision === 'rejected' ? '已驳回，过回合前生效' : decision === 'court_debate' ? '已发交廷议' : decision === 'referred' ? '已转交有司' : decision === 'hold' ? '已留中' : '已批示');
    if (replyId && state.memorialReplies) delete state.memorialReplies[replyId];
    saveFormalDraftsToGM(false);
    openYueZouPreviewPanel();
  }

  function deskMemorialToEdict(id){
    var found = deskFindRawMemorial(id);
    if (!found || !found.raw) { toast('未找到原奏疏记录'); return; }
    var m = found.raw;
    var selected = '';
    try { selected = String(window.getSelection ? window.getSelection().toString() : '').trim(); } catch(_) {}
    if (!selected) { toast('请先在奏疏正文中划选要摘入的文字'); return; }
    var gm = deskGM();
    deskArray(gm, '_edictSuggestions').push({
      source: '奏疏',
      from: m.from || '臣工',
      topic: m.title || m.topic || '',
      content: selected,
      turn: gm.turn || 1,
      used: false
    });
    toast('已摘入诏书建议库');
  }

  function deskTargetLetter(name){
    if (!name) return;
    var gm = deskGM();
    gm._pendingLetterTo = name;
    state.letterTarget = name;
    state.letterDraft = state.letterDraft || {};
    state.letterDraft.to = name;
    saveFormalDraftsToGM(false);
    openHongyanPreviewPanel();
  }

  function deskSendLetter(draftOnly){
    var gm = deskGM();
    Array.prototype.forEach.call(document.querySelectorAll('.tm-desk-overlay'), captureDeskOverlayState);
    var letterDraft = state.letterDraft || {};
    var to = deskValue('[data-desk-letter-to]', (letterDraft.to || gm._pendingLetterTo || '')).trim();
    if (!to) { toast('请先选择收信人'); return; }
    var selfName = (window.P && P.playerInfo && P.playerInfo.characterName) || '';
    if (selfName && to === selfName) { toast('不能自寄信函'); return; }
    var body = deskValue('[data-desk-letter-body]', letterDraft.body || '').trim();
    if (!body) { toast('请先写下书信正文'); return; }
    var letterType = deskValue('[data-desk-letter-type]', letterDraft.type || 'personal') || 'personal';
    var urgency = deskValue('[data-desk-letter-urgency]', letterDraft.urgency || 'normal') || 'normal';
    var cipher = deskValue('[data-desk-letter-cipher]', letterDraft.cipher || 'none') || 'none';
    var sendMode = deskValue('[data-desk-letter-sendmode]', letterDraft.sendMode || 'multi_courier') || 'multi_courier';
    var capital = gm._capital || '京城';
    var ch = (typeof window.findCharByName === 'function') ? window.findCharByName(to) : findPerson(to);
    var toLoc = (ch && ch.location) || capital;
    var dpv = 30;
    try { if (typeof window._getDaysPerTurn === 'function') dpv = Math.max(1, Number(window._getDaysPerTurn()) || 30); } catch(_) {}
    var days = 5;
    try { if (typeof window.calcLetterDays === 'function') days = Math.max(1, Number(window.calcLetterDays(capital, toLoc, urgency)) || 5); } catch(_) {}
    if (sendMode === 'secret_agent') days = Math.ceil(days * 1.5);
    var deliveryTurns = Math.max(1, Math.ceil(days / dpv));
    var replyDays = days * 2 + 3;
    var replyTurns = Math.max(deliveryTurns + 1, Math.ceil(replyDays / dpv));
    var nowDay = (typeof window.getCurrentGameDay === 'function') ? window.getCurrentGameDay() : (((gm.turn || 1) - 1) * dpv);
    var typeLabel = letterTypeLabelFormal(letterType);
    var letter = {
      id: deskId(draftOnly ? 'ltr_draft' : 'ltr'),
      from: '玩家',
      to: to,
      fromLocation: capital,
      toLocation: toLoc,
      title: typeLabel + '·' + to,
      subjectLine: typeLabel,
      content: body,
      body: body,
      sentTurn: gm.turn || 1,
      deliveryTurn: draftOnly ? null : (gm.turn || 1) + deliveryTurns,
      replyTurn: draftOnly ? null : (gm.turn || 1) + replyTurns,
      _sentDay: nowDay,
      _deliveryDay: draftOnly ? null : nowDay + days,
      _replyDay: draftOnly ? null : nowDay + replyDays,
      _travelDays: draftOnly ? 0 : days,
      reply: '',
      status: draftOnly ? 'draft' : 'traveling',
      urgency: urgency,
      letterType: letterType,
      _npcInitiated: false,
      _replyExpected: true,
      _cipher: cipher,
      _sendMode: sendMode,
      _source: 'phase8-desk'
    };
    deskArray(gm, 'letters').push(letter);
    if (!draftOnly && (letterType === 'military_order' || letterType === 'secret_decree' || letterType === 'formal_edict')) {
      deskArray(gm, '_edictTracker').push({
        content: body,
        category: letterType === 'military_order' ? '军令' : '政令',
        turn: gm.turn || 1,
        status: 'pending',
        source: 'letter',
        target: to,
        letterId: letter.id
      });
    }
    if (!draftOnly) {
      deskArray(gm, 'letters').forEach(function(l){
        if (l && l._npcInitiated && l.from === to && l._replyExpected && !l._playerReplied) {
          l._playerReplied = true;
          l._repliedTurn = gm.turn || 1;
          l._repliedByDesk = true;
        }
      });
      deskRemember(to, '收到御前鸿雁：' + compactText(body, 50), letterType === 'formal_edict' || letterType === 'military_order' ? '敬' : '平', 5);
      if (Array.isArray(gm.qijuHistory)) {
        gm.qijuHistory.unshift({ turn: gm.turn || 1, date: deskDateText(gm.turn || 1), content: '【鸿雁传书】遣' + letterUrgencyLabelFormal(urgency) + '致' + to + '（' + typeLabel + (cipher !== 'none' ? '·' + letterCipherLabelFormal(cipher) : '') + '）。内容：' + body });
      }
    }
    deskRecord('鸿雁', (draftOnly ? '草函' : '遣使') + '致' + to, body, ['鸿雁', typeLabel, letterUrgencyLabelFormal(urgency)]);
    deskDecision('letter', (draftOnly ? '草拟' : '遣使') + '致' + to + '：' + compactText(body, 80), draftOnly ? '保存为鸿雁草稿' : '进入 GM.letters，由驿递与回信系统结算');
    gm._pendingLetterTo = to;
    state.letterDraft = state.letterDraft || {};
    state.letterDraft.to = to;
    state.letterDraft.type = letterType;
    state.letterDraft.urgency = urgency;
    state.letterDraft.cipher = cipher;
    state.letterDraft.sendMode = sendMode;
    if (!draftOnly) state.letterDraft.body = '';
    saveFormalDraftsToGM(false);
    deskRefreshLegacy();
    toast(draftOnly ? '鸿雁草稿已保存' : '信函已发出，驿递系统会继续结算');
    openHongyanPreviewPanel();
  }

  function deskStoreLetterMemory(){
    var gm = deskGM();
    Array.prototype.forEach.call(document.querySelectorAll('.tm-desk-overlay'), captureDeskOverlayState);
    var letterDraft = state.letterDraft || {};
    var to = deskValue('[data-desk-letter-to]', (letterDraft.to || gm._pendingLetterTo || '')).trim();
    var body = deskValue('[data-desk-letter-body]', letterDraft.body || '').trim();
    if (!to || !body) { toast('请先写明人物与内容'); return; }
    deskRemember(to, '御前留记：' + compactText(body, 80), '平', 4);
    deskRecord('人物记忆', to, body, ['鸿雁','人物记忆']);
    deskRefreshLegacy();
    toast('已写入人物记忆');
  }

  function deskSelectRecord(id){
    state.recordId = id || '';
    openShiluPreviewPanel();
  }

  function deskArchiveRecord(kind){
    var gm = deskGM();
    var body = deskValue('[data-desk-record-body]', '').trim();
    if (!body) { toast('暂无可归档内容'); return; }
    var turn = gm.turn || 1;
    if (kind === 'jishi') {
      deskArray(gm, 'jishiRecords').push({ turn: turn, char: '史官', playerSaid: '收入纪事', npcSaid: body, mode: 'record', source: 'phase8-desk' });
    }
    deskRecord(kind === 'jishi' ? '纪事' : kind === 'biannian' ? '编年' : '实录', '史官归档', body, ['史官实录', kind]);
    deskDecision('event', '史官归档：' + compactText(body, 100), '进入' + (kind === 'jishi' ? '纪事' : kind === 'biannian' ? '编年' : '实录'));
    deskRefreshLegacy();
    toast(kind === 'jishi' ? '已编入纪事' : kind === 'biannian' ? '已转为编年' : '已收入实录');
    openShiluPreviewPanel();
  }

  function deskAnnotateRecord(id){
    var gm = deskGM();
    var m = String(id || '').match(/^qiju-(\d+)$/);
    if (!m || !Array.isArray(gm.qijuHistory) || !gm.qijuHistory[Number(m[1])]) {
      toast('只能给起居注条目添加御批');
      return;
    }
    var item = gm.qijuHistory[Number(m[1])];
    var done = function(text){
      if (text == null) return;
      item._annotation = String(text || '').trim();
      deskRefreshLegacy();
      toast(item._annotation ? '御批已写入起居注' : '御批已清空');
      openShiluPreviewPanel();
    };
    if (typeof window.showPrompt === 'function') {
      window.showPrompt('御批：', item._annotation || '', done);
    } else {
      done(window.prompt('御批：', item._annotation || ''));
    }
  }

  function deskToggleRecordStar(id){
    var gm = deskGM();
    var m = String(id || '').match(/^jishi-(\d+)$/);
    if (!m || !Array.isArray(gm.jishiRecords) || !gm.jishiRecords[Number(m[1])]) {
      toast('只能星标纪事条目');
      return;
    }
    var item = gm.jishiRecords[Number(m[1])];
    item._starred = !item._starred;
    deskRefreshLegacy();
    toast(item._starred ? '已标为要事' : '已取消星标');
    openShiluPreviewPanel();
  }

  function deskOpenShijiResult(id){
    var gm = deskGM();
    var m = String(id || '').match(/^shiji-(\d+)$/);
    var idx = m ? Number(m[1]) : -1;
    var sj = idx >= 0 && Array.isArray(gm.shijiHistory) ? gm.shijiHistory[idx] : null;
    if (!sj) {
      toast('未找到对应史记原卷');
      return;
    }
    if (typeof window.showTurnResult === 'function') {
      window.showTurnResult(sj.html || ('<div style="white-space:pre-wrap;line-height:1.8;">' + esc(sj.shizhengji || sj.turnSummary || '') + '</div>'), idx);
    } else {
      state.recordId = id || '';
      openShiluPreviewPanel();
    }
  }

  function handleDeskAction(action, data){
    if (action === 'close') {
      closeDeskOverlay();
    } else if (action === 'select-issue-desk') {
      state.shizhengIssue = data.id || '';
      openShizhengPreviewPanel();
    } else if (action === 'shizheng-filter-desk') {
      state.shizhengDeskFilter = data.filter || 'pending';
      state.shizhengIssue = '';
      openShizhengPreviewPanel();
    } else if (action === 'add-edict-desk') {
      var issue = getIssues().find(function(x){ return String(x.id) === String(data.id || ''); });
      if (!issue) return;
      state.edictDraft = state.edictDraft || [];
      state.edictDraft.push('就“' + issue.title + '”，着有关衙门会同详议，限期具奏。');
      openZhaoPreviewPanel();
    } else if (action === 'adopt-edict-suggestion-desk') {
      var suggestions = getEdictSuggestionRows();
      var pick = suggestions.find(function(x){ return String(x.id || '') === String(data.id || ''); }) || suggestions[Number(data.index || 0)];
      if (!pick) return;
      state.edictDrafts = state.edictDrafts || {};
      state.edictDrafts.policy = (state.edictDrafts.policy ? state.edictDrafts.policy + '\n\n' : '') + '【' + (pick.source || '御案') + (pick.title ? ' · ' + pick.title : '') + '】\n' + (pick.text || '');
      toast('已纳入政令草诏');
      openZhaoPreviewPanel();
    } else if (action === 'clear-edict-desk') {
      state.edictDraft = [];
      state.edictDrafts = {};
      openZhaoPreviewPanel();
    } else if (action === 'save-edict-desk') {
      deskSaveEdictDraft();
      openZhaoPreviewPanel();
    } else if (action === 'publish-edict-desk') {
      deskPublishEdict();
    } else if (action === 'select-memorial-desk') {
      state.memorialId = data.id || '';
      openYueZouPreviewPanel();
    } else if (action === 'memorial-filter-desk') {
      state.memorialFilter = data.filter || 'all';
      openYueZouPreviewPanel();
    } else if (action === 'memorial-decision-desk') {
      deskStageMemorial(data.id || '', data.decision || 'annotated', data.replyid || '');
    } else if (action === 'memorial-edict-desk') {
      deskMemorialToEdict(data.id || '');
    } else if (action === 'memorial-summon-desk') {
      closeDeskOverlay();
      openModule('wendui');
    } else if (action === 'letter-target-desk') {
      deskTargetLetter(data.name || data.id || '');
    } else if (action === 'letter-filter-desk') {
      state.letterFilter = data.filter || 'all';
      saveFormalDraftsToGM(false);
      openHongyanPreviewPanel();
    } else if (action === 'letter-thread-action-desk') {
      var letter = getLetters().find(function(x){ return String(x.id || '') === String(data.id || ''); });
      var rawLetter = letter && letter.raw;
      if (data.letterAction === 'recall' && rawLetter && typeof window._ltRecall === 'function') {
        window._ltRecall(rawLetter.id);
      } else if (data.letterAction === 'resend-secret' && rawLetter && typeof window._ltResend === 'function') {
        window._ltResend(rawLetter.id, 'secret_agent');
      } else if (data.letterAction === 'resend-fast' && rawLetter && typeof window._ltResend === 'function') {
        window._ltResend(rawLetter.id, 'multi_courier');
      } else if (data.letterAction === 'verify' && rawLetter && typeof window._ltVerify === 'function') {
        window._ltVerify(rawLetter.id);
      } else if (data.letterAction === 'reply' && rawLetter) {
        if (rawLetter._npcInitiated && typeof window._ltReplyToNpc === 'function') {
          try { window._ltReplyToNpc(rawLetter.id); } catch(_) {}
        }
        var replyTarget = rawLetter._npcInitiated ? (rawLetter.from || letter.from) : (rawLetter.to || letter.to || rawLetter.from || letter.from);
        if (window.GM) GM._pendingLetterTo = replyTarget || state.letterTarget;
        state.letterTarget = (replyTarget || state.letterTarget || '');
        state.letterDraft = state.letterDraft || {};
        state.letterDraft.to = state.letterTarget;
        saveFormalDraftsToGM(false);
      } else if (data.letterAction === 'star' && rawLetter) {
        if (typeof window._ltStar === 'function') {
          window._ltStar(rawLetter.id);
        } else {
          rawLetter._starred = !rawLetter._starred;
        }
      } else if (data.letterAction === 'excerpt') {
        if (rawLetter && typeof window._ltExcerptToEdict === 'function') {
          try { window._ltExcerptToEdict(rawLetter.id); } catch(_) {}
        }
        state.edictDrafts = state.edictDrafts || {};
        state.edictDrafts.private = (state.edictDrafts.private ? state.edictDrafts.private + '\n\n' : '') + '摘录鸿雁通信，着密察其情。';
        toast('已摘入密旨草诏');
      } else {
        toast('已记录鸿雁动作：' + (data.letterAction || '核实'));
      }
      openHongyanPreviewPanel();
    } else if (action === 'letter-send-desk') {
      deskSendLetter(false);
    } else if (action === 'letter-draft-desk') {
      deskSendLetter(true);
    } else if (action === 'letter-memory-desk') {
      deskStoreLetterMemory();
    } else if (action === 'select-record-desk') {
      deskSelectRecord(data.id || '');
    } else if (action === 'record-tab-desk') {
      state.recordTab = data.tab || 'shiji';
      openShiluPreviewPanel();
    } else if (action === 'record-filter-desk') {
      if (data.key) state[data.key] = data.value || '全部';
      openShiluPreviewPanel();
    } else if (action === 'record-archive-desk') {
      deskArchiveRecord(data.record || 'shilu');
    } else if (action === 'record-annotate-desk') {
      deskAnnotateRecord(data.id || state.recordId || '');
    } else if (action === 'record-star-desk') {
      deskToggleRecordStar(data.id || state.recordId || '');
    } else if (action === 'record-open-shiji-desk') {
      deskOpenShijiResult(data.id || state.recordId || '');
    } else if (action === 'shizheng-convene-desk') {
      closeDeskOverlay();
      if (typeof window._shizhengConvene === 'function') window._shizhengConvene(data.id || '');
      else openChaoyiMode('tingyi');
    } else if (action === 'shizheng-secret-desk') {
      closeDeskOverlay();
      if (typeof window._shizhengSecret === 'function') window._shizhengSecret(data.id || '');
      else openModule('wendui');
    } else if (action === 'shizheng-choice-desk') {
      if (typeof window._chooseIssueOption === 'function') {
        window._chooseIssueOption(data.id || '', Number(data.choice || 0));
        state.shizhengIssue = data.id || state.shizhengIssue || '';
        setTimeout(openShizhengPreviewPanel, 0);
      } else {
        toast('裁断流程未加载');
      }
    } else if (action === 'panel-desk') {
      closeDeskOverlay();
      openPanel(data.slot || '');
    } else if (action === 'module-desk') {
      var kind = data.kind || '';
      if (kind === 'edict') openZhaoPreviewPanel();
      else if (kind === 'memorial') openYueZouPreviewPanel();
      else if (kind === 'letter') openHongyanPreviewPanel();
      else if (kind === 'records') openShiluPreviewPanel();
      else {
        closeDeskOverlay();
        openModule(kind);
      }
    } else if (action === 'toast') {
      toast(data.text || '已记录');
    } else {
      handleModuleAction(action, data || {});
    }
  }

  function deskTabs(names, active){
    return '<div class="tm-desk-tabs">' + names.map(function(n, i){
      return '<button type="button" class="tm-desk-tab ' + (i === active ? 'active' : '') + '">' + esc(n) + '</button>';
    }).join('') + '</div>';
  }

  function deskRows(rows){
    return rows.map(function(r){
      return '<div class="tm-desk-row"><span>' + esc(r[0]) + '</span><b>' + esc(r[1] == null || r[1] === '' ? '未记' : r[1]) + '</b></div>';
    }).join('');
  }

  function deskStats(rows){
    return '<div class="tm-desk-grid">' + rows.map(function(r){
      return '<div class="tm-desk-stat"><span>' + esc(r[0]) + '</span><b>' + esc(r[1] == null || r[1] === '' ? '—' : r[1]) + '</b></div>';
    }).join('') + '</div>';
  }

  function deskList(items, emptyText, opts){
    opts = opts || {};
    if (!items || !items.length) return '<div class="tm-desk-empty">' + esc(emptyText || '暂无条目。') + '</div>';
    var hasHot = items.some(function(x){ return x && x.hot; });
    return '<div class="tm-desk-list">' + items.map(function(x, i){
      var cls = (x.hot || (!hasHot && i === 0)) ? ' hot' : '';
      var action = opts.action ? ' data-desk-action="' + attr(opts.action) + '" data-id="' + attr(x.id || '') + '"' : '';
      return '<button type="button" class="tm-desk-item' + cls + '"' + action + '><b>' + esc(x.title || x.name || '未题') + '</b><span>' + esc(x.meta || x.sub || x.text || '') + '</span></button>';
    }).join('') + '</div>';
  }

  function deskCard(title, body){
    return '<div class="tm-desk-card"><b>' + esc(title) + '</b><p>' + esc(body || '暂无详情。') + '</p></div>';
  }

  function deskAction(label, action, data, primary){
    data = data || {};
    var attrs = Object.keys(data).map(function(k){ return ' data-' + attr(k) + '="' + attr(data[k]) + '"'; }).join('');
    return '<button type="button" class="tm-desk-btn ' + (primary ? 'primary' : '') + '" data-desk-action="' + attr(action) + '"' + attrs + '>' + esc(label) + '</button>';
  }

  function installActionPanelExactStyles(){
    var st = document.getElementById('tm-phase8-action-panel-style');
    if (!st) {
      st = document.createElement('style');
      st.id = 'tm-phase8-action-panel-style';
      document.head.appendChild(st);
    }
    st.textContent = [
      'body.tm-phase8-formal .tm-bridge-overlay{position:fixed;inset:0;z-index:10030;display:block;background:rgba(8,6,4,.52);backdrop-filter:blur(2px);color:#eadfbd;font-family:"STKaiti","KaiTi",serif;}',
      'body.tm-phase8-formal .tm-bridge-scrim{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 20%,rgba(201,160,69,.10),transparent 44%),rgba(0,0,0,.34);}',
      'body.tm-phase8-formal .tm-bridge-panel{position:absolute;box-sizing:border-box;}',
      'body.tm-phase8-formal .tm-action-panel{left:58px;top:74px;width:min(1080px,calc(100vw - 132px));height:min(720px,calc(100vh - 118px));overflow:visible;transform:translateX(-12px);transition:transform .18s ease,opacity .18s ease;opacity:.98;}',
      'body.tm-phase8-formal .tm-bridge-overlay.show .tm-action-panel{transform:translateX(0);}',
      'body.tm-phase8-formal .tm-action-panel.edict-shell{left:50%;top:58px;width:min(1360px,calc(100vw - 72px));height:min(840px,calc(100vh - 86px));transform:translate(-50%,10px);}',
      'body.tm-phase8-formal .tm-bridge-overlay.show .tm-action-panel.edict-shell{transform:translate(-50%,0);}',
      'body.tm-phase8-formal .tm-action-panel.memorial-shell{left:40px;right:40px;top:64px;width:auto;height:min(820px,calc(100vh - 94px));transform:none;}',
      'body.tm-phase8-formal .tm-bridge-overlay.show .tm-action-panel.memorial-shell{transform:none;}',
      'body.tm-phase8-formal .tm-action-panel.letter-shell{left:50%;top:60px;width:min(1440px,calc(100vw - 64px));height:min(860px,calc(100vh - 90px));transform:translate(-50%,10px);}',
      'body.tm-phase8-formal .tm-bridge-overlay.show .tm-action-panel.letter-shell{transform:translate(-50%,0);}',
      'body.tm-phase8-formal .tm-action-panel.records-shell{left:40px;right:40px;top:64px;width:auto;height:min(830px,calc(100vh - 96px));transform:none;}',
      'body.tm-phase8-formal .tm-bridge-overlay.show .tm-action-panel.records-shell{transform:none;}',
      'body.tm-phase8-formal .tm-action-panel .tm-floating-close{position:absolute;right:18px;top:16px;z-index:5;width:34px;height:34px;border-radius:50%;border:1px solid rgba(201,160,69,.38);color:#f5df9d;background:linear-gradient(180deg,rgba(54,37,22,.95),rgba(12,9,7,.95));box-shadow:0 8px 22px rgba(0,0,0,.42);cursor:pointer;font-size:20px;line-height:30px;}',
      'body.tm-phase8-formal .tm-action-panel.edict-shell .tm-floating-close{top:20px;right:24px;color:#3a2818;background:linear-gradient(180deg,#f0d989,#bb873a);border-color:rgba(68,43,19,.32);}',
      'body.tm-phase8-formal .tm-action-panel>.tm-action-body{height:100%;min-height:0;}',
      'body.tm-phase8-formal .tm-action-panel.edict-shell .ed-panel-wrap{height:100%;box-sizing:border-box;overflow:auto;border:1px solid rgba(201,160,69,.28);box-shadow:0 24px 58px rgba(0,0,0,.52);}',
      'body.tm-phase8-formal .tm-action-panel.edict-shell .ed-panel-wrap>div{min-height:100%;}',
      'body.tm-phase8-formal .tm-action-panel.edict-shell .ed-action-bar{padding-bottom:14px;}',
      'body.tm-phase8-formal .tm-chip-row{display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap;}',
      'body.tm-phase8-formal .tm-chip{display:inline-flex;align-items:center;justify-content:center;min-height:18px;padding:1px 7px;border:1px solid rgba(201,160,69,.18);border-radius:999px;color:rgba(240,226,184,.78);background:rgba(255,245,210,.045);font-size:10.5px;line-height:1.2;white-space:nowrap;}',
      'body.tm-phase8-formal .tm-chip.green{border-color:rgba(126,184,167,.34);color:#a8dcc5;background:rgba(65,111,92,.14);}',
      'body.tm-phase8-formal .tm-chip.hot{border-color:rgba(213,92,64,.40);color:#f0a082;background:rgba(126,31,24,.20);}',
      'body.tm-phase8-formal .tm-mini-btn,body.tm-phase8-formal .tm-action-primary,body.tm-phase8-formal .tm-action-ghost{min-height:28px;border:1px solid rgba(201,160,69,.22);color:#eadfbd;background:rgba(0,0,0,.22);cursor:pointer;font-family:inherit;font-size:12px;padding:4px 10px;}',
      'body.tm-phase8-formal .tm-mini-btn.green,body.tm-phase8-formal .tm-action-primary{color:#fff0c9;border-color:rgba(213,92,64,.42);background:linear-gradient(180deg,#7f3528,#331612);}',
      'body.tm-phase8-formal .tm-mini-btn.hot{color:#fff0c9;border-color:rgba(213,92,64,.50);background:linear-gradient(180deg,#963b29,#421712);}',
      'body.tm-phase8-formal .tm-row-actions{display:flex;flex-wrap:wrap;gap:7px;align-items:center;}',
      'body.tm-phase8-formal .tm-input,body.tm-phase8-formal .tm-select,body.tm-phase8-formal .tm-textarea{box-sizing:border-box;width:100%;border:1px solid rgba(201,160,69,.22);background:rgba(0,0,0,.20);color:#eadfbd;font-family:inherit;font-size:12px;padding:7px 8px;}',
      'body.tm-phase8-formal .tm-textarea{min-height:86px;line-height:1.65;resize:vertical;}',
      'body.tm-phase8-formal .tm-stat-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:12px;}',
      'body.tm-phase8-formal .tm-stat{padding:8px;border:1px solid rgba(201,160,69,.16);background:linear-gradient(180deg,rgba(255,245,210,.065),rgba(0,0,0,.18)),rgba(18,13,10,.62);}',
      'body.tm-phase8-formal .tm-stat span{display:block;color:rgba(232,220,187,.50);font-size:10.5px;}',
      'body.tm-phase8-formal .tm-stat b{display:block;margin-top:3px;color:#f2ddb0;font-size:15px;}',
      'body.tm-phase8-formal .edict-old-panel{height:100%;box-sizing:border-box;display:grid;grid-template-columns:260px minmax(0,1fr);gap:18px;padding:18px 22px;border:1px solid rgba(201,160,69,.38);border-radius:7px;background:radial-gradient(ellipse at 50% 0,rgba(232,196,111,.10),transparent 34%),linear-gradient(180deg,rgba(36,28,20,.98),rgba(13,10,8,.97));box-shadow:0 24px 58px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,242,185,.10);color:#eadfbd;}',
      'body.tm-phase8-formal .edict-old-sug{min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:10px;padding:12px 10px 12px 12px;border:1px solid rgba(201,160,69,.20);border-left:3px solid rgba(180,54,37,.68);border-radius:5px;background:linear-gradient(90deg,rgba(0,0,0,.28),rgba(0,0,0,.06)),rgba(255,245,210,.035);}',
      'body.tm-phase8-formal .edict-old-sug-title,body.tm-phase8-formal .edict-old-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0;color:#f0d68d;font-family:"STKaiti","KaiTi",serif;font-size:14px;letter-spacing:.18em;}',
      'body.tm-phase8-formal .edict-old-sug-list,body.tm-phase8-formal .edict-old-main{min-height:0;overflow:auto;scrollbar-color:rgba(201,160,69,.48) rgba(0,0,0,.22);}',
      'body.tm-phase8-formal .edict-old-sug-item{margin-bottom:8px;padding:9px;border:1px solid rgba(201,160,69,.16);border-radius:4px;background:linear-gradient(180deg,rgba(255,246,216,.055),rgba(255,246,216,.025)),rgba(0,0,0,.14);}',
      'body.tm-phase8-formal .edict-old-sug-item b{display:block;color:#f0d892;font-size:12px;} body.tm-phase8-formal .edict-old-sug-item p{margin:5px 0 7px;color:rgba(236,226,193,.76);font-size:11.5px;line-height:1.48;}',
      'body.tm-phase8-formal .edict-old-title{display:grid;grid-template-columns:58px minmax(0,1fr);gap:12px;align-items:center;margin:0 0 14px;padding:13px 14px;border:1px solid rgba(201,160,69,.22);border-radius:5px;background:linear-gradient(90deg,rgba(139,38,28,.16),transparent 38%),rgba(255,245,210,.045);}',
      'body.tm-phase8-formal .edict-old-seal{width:50px;height:50px;display:grid;place-items:center;border:1px solid rgba(213,176,95,.48);border-radius:50%;color:#f2d98d;background:radial-gradient(circle,rgba(201,160,69,.20),rgba(64,31,20,.80) 72%);font-size:18px;}',
      'body.tm-phase8-formal .edict-old-title strong{display:block;color:#f5dc96;font-size:22px;letter-spacing:.22em;} body.tm-phase8-formal .edict-old-title span{display:block;margin-top:4px;color:rgba(232,218,178,.64);font-size:12px;letter-spacing:.14em;}',
      'body.tm-phase8-formal .edict-old-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}',
      'body.tm-phase8-formal .edict-old-card,body.tm-phase8-formal .edict-old-archive-card{min-width:0;padding:10px;border:1px solid rgba(201,160,69,.18);border-radius:5px;background:linear-gradient(180deg,rgba(255,246,216,.060),rgba(255,246,216,.030)),rgba(0,0,0,.12);}',
      'body.tm-phase8-formal .edict-old-card-head{display:grid;grid-template-columns:34px minmax(0,1fr);gap:8px;align-items:center;margin-bottom:7px;}',
      'body.tm-phase8-formal .edict-old-badge{width:30px;height:30px;display:grid;place-items:center;border:1px solid rgba(201,160,69,.30);border-radius:50%;color:#f2d98d;background:rgba(0,0,0,.22);}',
      'body.tm-phase8-formal .edict-old-card-head b{display:block;color:#f0d892;font-size:13px;} body.tm-phase8-formal .edict-old-card-head span span{display:block;margin-top:3px;color:rgba(224,211,171,.56);font-size:10.5px;}',
      'body.tm-phase8-formal .edict-old-forecast{margin-top:7px;color:rgba(232,220,187,.62);font-size:11px;line-height:1.45;}',
      'body.tm-phase8-formal .edict-old-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0;padding:10px;border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.16);}',
      'body.tm-phase8-formal .edict-xingzhi,body.tm-phase8-formal .edict-old-section{margin-top:12px;padding:10px;border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.12);}',
      'body.tm-phase8-formal .edict-xingzhi-head b{display:block;color:#f0d892;font-size:13px;} body.tm-phase8-formal .edict-xingzhi-head span{display:block;margin:4px 0 8px;color:rgba(232,220,187,.58);font-size:11px;}',
      'body.tm-phase8-formal .edict-old-archive{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}',
      'body.tm-phase8-formal .edict-sug-v2{display:grid;grid-template-columns:44px minmax(0,1fr);gap:9px;margin-bottom:9px;padding:9px;border:1px solid rgba(201,160,69,.16);border-radius:4px;background:linear-gradient(180deg,rgba(255,246,216,.055),rgba(255,246,216,.025)),rgba(0,0,0,.14);}',
      'body.tm-phase8-formal .edict-sug-portrait-wrap{width:42px;height:52px;display:grid;place-items:center;position:relative;overflow:hidden;border:1px solid rgba(201,160,69,.22);background:radial-gradient(circle at 50% 28%,rgba(201,160,69,.20),rgba(0,0,0,.26));color:#efd990;font-size:18px;}',
      'body.tm-phase8-formal .edict-sug-portrait-wrap:after{content:attr(data-glyph);display:none;font-family:"STKaiti","KaiTi",serif;text-shadow:0 1px 8px rgba(0,0,0,.55);}',
      'body.tm-phase8-formal .edict-sug-portrait-wrap.fallback:after{display:block;}',
      'body.tm-phase8-formal .edict-sug-portrait{width:100%;height:100%;object-fit:cover;display:block;}',
      'body.tm-phase8-formal .edict-sug-v2 b{display:block;color:#f0d892;font-size:12px;} body.tm-phase8-formal .edict-sug-v2 p{margin:5px 0 7px;color:rgba(236,226,193,.76);font-size:11.5px;line-height:1.48;}',
      'body.tm-phase8-formal .edict-sug-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;} body.tm-phase8-formal .edict-sug-adopt{min-height:24px;padding:2px 9px;border:1px solid rgba(213,92,64,.34);color:#fff0c9;background:linear-gradient(180deg,#7f3528,#331612);font-family:inherit;font-size:11px;cursor:pointer;}',
      'body.tm-phase8-formal .edict-sug-delete{margin-left:5px;min-width:24px;min-height:24px;border:1px solid rgba(201,160,69,.18);color:rgba(232,220,187,.58);background:rgba(0,0,0,.20);font-family:inherit;font-size:14px;line-height:1;cursor:pointer;} body.tm-phase8-formal .edict-sug-delete:hover{color:#f0a082;border-color:rgba(213,92,64,.40);}',
      'body.tm-phase8-formal .edict-old-label{display:block;margin-bottom:4px;color:rgba(224,211,171,.62);font-size:10.5px;letter-spacing:.12em;}',
      'body.tm-phase8-formal .edict-polish-scroll{position:relative;margin-top:12px;padding:16px 92px 14px 18px;border:1px solid rgba(201,160,69,.22);background:linear-gradient(180deg,rgba(239,215,150,.10),rgba(255,245,210,.035)),rgba(0,0,0,.16);}',
      'body.tm-phase8-formal .edict-polish-title{position:absolute;right:18px;top:16px;writing-mode:vertical-rl;color:#f0d892;letter-spacing:.35em;font-size:18px;} body.tm-phase8-formal .edict-polish-text{width:100%;min-height:130px;border:0;background:transparent;color:#f5e9c6;font-family:"STKaiti","KaiTi",serif;font-size:14px;line-height:1.85;resize:vertical;}',
      'body.tm-phase8-formal .edict-polish-actions{display:flex;gap:7px;margin-top:8px;} body.tm-phase8-formal .edict-polish-seal{position:absolute;right:30px;bottom:18px;width:44px;height:44px;display:grid;place-items:center;border:1px solid rgba(213,92,64,.50);border-radius:50%;color:#d66a50;font-size:10px;opacity:.82;}',
      'body.tm-phase8-formal .edict-xingzhi-row{display:grid;grid-template-columns:72px minmax(0,1fr);gap:8px;padding:5px 0;border-top:1px solid rgba(201,160,69,.12);font-size:11.5px;}',
      'body.tm-phase8-formal .memorial-office-v4,body.tm-phase8-formal .hy-office-v4,body.tm-phase8-formal .records-cabinet-v4{height:100%;box-sizing:border-box;position:relative;overflow:hidden;}',
      'body.tm-phase8-formal .memorial-office-v4{display:grid;grid-template-columns:292px minmax(0,1fr);gap:16px;padding:18px;border:1px solid rgba(185,144,71,.42);background:radial-gradient(ellipse at 24% 0,rgba(154,47,33,.15),transparent 42%),radial-gradient(ellipse at 92% 10%,rgba(211,167,82,.10),transparent 36%),linear-gradient(135deg,rgba(42,26,18,.98),rgba(11,8,7,.96));}',
      'body.tm-phase8-formal .memorial-cases-v4,body.tm-phase8-formal .hy-roster-v4,body.tm-phase8-formal .hy-compose-v4,body.tm-phase8-formal .records-spine-v4{min-height:0;overflow:auto;scrollbar-color:rgba(201,160,69,.48) rgba(0,0,0,.22);}',
      'body.tm-phase8-formal .memorial-cases-v4{padding:12px;border:1px solid rgba(201,160,69,.18);border-left:6px solid rgba(126,31,24,.76);background:linear-gradient(180deg,rgba(0,0,0,.28),rgba(255,245,210,.035)),repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 34px);}',
      'body.tm-phase8-formal .tm-panel-v4-title{display:grid;grid-template-columns:42px minmax(0,1fr);gap:9px;align-items:center;margin-bottom:12px;}',
      'body.tm-phase8-formal .tm-panel-v4-title .seal{width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(211,169,82,.38);color:#f1d98d;background:radial-gradient(circle,rgba(152,45,31,.34),rgba(24,13,8,.92) 70%);font-size:20px;}',
      'body.tm-phase8-formal .tm-panel-v4-title b{display:block;color:#f2d990;font-size:19px;letter-spacing:.10em;} body.tm-phase8-formal .tm-panel-v4-title span:not(.seal){display:block;margin-top:4px;color:rgba(232,217,176,.56);font-size:11px;}',
      'body.tm-phase8-formal .memorial-filter-v4{display:grid;gap:7px;} body.tm-phase8-formal .memorial-filter-v4 button,body.tm-phase8-formal .hy-person-v4,body.tm-phase8-formal .records-tab-v4{width:100%;border:1px solid rgba(201,160,69,.16);color:#eadfbd;background:rgba(255,245,210,.035);cursor:pointer;text-align:left;font-family:inherit;}',
      'body.tm-phase8-formal .memorial-filter-v4 button{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:43px;padding:7px 8px;} body.tm-phase8-formal .memorial-filter-v4 button.active,body.tm-phase8-formal .hy-person-v4.active,body.tm-phase8-formal .records-tab-v4.active{border-color:rgba(239,201,116,.52);background:linear-gradient(90deg,rgba(122,45,32,.34),rgba(255,245,210,.045));box-shadow:inset 2px 0 0 rgba(214,169,82,.80);}',
      'body.tm-phase8-formal .memorial-filter-v4 i{width:24px;height:24px;display:grid;place-items:center;border-radius:50%;border:1px solid rgba(201,160,69,.24);color:#f0d892;font-style:normal;font-size:12px;}',
      'body.tm-phase8-formal .memorial-filter-v4 b,body.tm-phase8-formal .hy-person-v4 b,body.tm-phase8-formal .records-tab-v4 b{display:block;color:#f0d892;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      'body.tm-phase8-formal .memorial-filter-v4 span,body.tm-phase8-formal .hy-person-v4 span,body.tm-phase8-formal .records-tab-v4 span{display:block;margin-top:3px;color:rgba(224,211,171,.54);font-size:10px;}',
      'body.tm-phase8-formal .memorial-side-note{margin-top:12px;padding:10px;border:1px solid rgba(201,160,69,.14);background:rgba(0,0,0,.18);} body.tm-phase8-formal .memorial-side-note b{display:block;margin-bottom:5px;color:#f0d892;font-size:12px;} body.tm-phase8-formal .memorial-side-note p{margin:0;color:rgba(232,220,187,.66);font-size:11.5px;line-height:1.55;}',
      'body.tm-phase8-formal .memorial-paper-v4,body.tm-phase8-formal .records-paper-v4{min-height:0;overflow:auto;padding:18px 20px;color:#eadfbd;border:1px solid rgba(201,160,69,.26);background:radial-gradient(ellipse at 18% 0,rgba(143,43,30,.16),transparent 38%),radial-gradient(ellipse at 88% 18%,rgba(81,126,104,.10),transparent 36%),repeating-linear-gradient(90deg,rgba(255,236,170,.025) 0 1px,transparent 1px 34px),linear-gradient(180deg,rgba(31,24,18,.98),rgba(12,9,7,.98));box-shadow:inset 0 1px 0 rgba(255,236,178,.08),0 18px 38px rgba(0,0,0,.38);scrollbar-color:rgba(201,160,69,.48) rgba(0,0,0,.26);}',
      'body.tm-phase8-formal .memorial-paper-head-v4,body.tm-phase8-formal .records-paper-head-v4{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid rgba(201,160,69,.20);} body.tm-phase8-formal .memorial-paper-head-v4 h2,body.tm-phase8-formal .records-paper-head-v4 h2{margin:0;color:#f1d98d;font-size:26px;letter-spacing:.08em;} body.tm-phase8-formal .memorial-paper-head-v4 p,body.tm-phase8-formal .records-paper-head-v4 p{margin:4px 0 0;color:rgba(232,220,187,.58);font-size:12px;}',
      'body.tm-phase8-formal .memorial-group-v4{margin-top:14px;} body.tm-phase8-formal .memorial-group-title-v4,body.tm-phase8-formal .records-section-title-v4{display:flex;align-items:center;justify-content:space-between;margin:0 0 8px;color:#efd58b;font-size:18px;letter-spacing:.08em;}',
      'body.tm-phase8-formal .memorial-card-v4,body.tm-phase8-formal .records-card-v4,body.tm-phase8-formal .bn-affair-v4{position:relative;margin-bottom:10px;padding:12px;border:1px solid rgba(201,160,69,.18);background:linear-gradient(90deg,rgba(126,32,24,.09),transparent 38%),linear-gradient(180deg,rgba(255,245,210,.055),rgba(0,0,0,.16)),rgba(19,14,11,.72);box-shadow:0 8px 18px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,236,178,.045);}',
      'body.tm-phase8-formal .memorial-card-v4::before,body.tm-phase8-formal .records-card-v4::before,body.tm-phase8-formal .bn-affair-v4::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:rgba(126,32,24,.58);}',
      'body.tm-phase8-formal .memorial-card-v4.done::before{background:rgba(60,107,83,.62);} body.tm-phase8-formal .memorial-card-v4.held::before{background:rgba(118,82,44,.58);} body.tm-phase8-formal .memorial-card-v4.review::before{background:rgba(176,113,51,.68);}',
      'body.tm-phase8-formal .memorial-card-head-v4{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:10px;align-items:center;} body.tm-phase8-formal .memorial-avatar-v4{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(201,160,69,.35);border-radius:50%;color:#f6e5ad;background:radial-gradient(circle,rgba(201,160,69,.28),rgba(38,21,13,.95) 70%);font-size:18px;}',
      'body.tm-phase8-formal .memorial-card-head-v4 b,body.tm-phase8-formal .records-card-v4 b,body.tm-phase8-formal .bn-affair-v4 b{display:block;color:#f1d98d;font-size:13px;} body.tm-phase8-formal .memorial-card-head-v4 span,body.tm-phase8-formal .records-card-v4 p,body.tm-phase8-formal .bn-affair-v4 p{color:rgba(232,220,187,.70);font-size:12px;line-height:1.55;}',
      'body.tm-phase8-formal .memorial-body-v4{margin:10px 0 9px;padding:10px 12px;color:rgba(242,231,202,.82);background:linear-gradient(180deg,rgba(255,245,210,.045),rgba(0,0,0,.10));border-top:1px solid rgba(201,160,69,.13);border-bottom:1px solid rgba(201,160,69,.10);font-size:13px;line-height:1.65;}',
      'body.tm-phase8-formal .memorial-reply-v4{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:end;} body.tm-phase8-formal .memorial-actions-v4,body.tm-phase8-formal .hy-actions-v4,body.tm-phase8-formal .records-card-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;}',
      'body.tm-phase8-formal .hy-office-v4{display:grid;grid-template-columns:252px minmax(0,1fr) 302px;gap:14px;padding:16px;border:1px solid rgba(126,184,167,.36);background:radial-gradient(ellipse at 70% 8%,rgba(126,184,167,.13),transparent 40%),linear-gradient(180deg,rgba(23,31,29,.98),rgba(9,10,9,.96));}',
      'body.tm-phase8-formal .hy-roster-v4,body.tm-phase8-formal .hy-thread-v4,body.tm-phase8-formal .hy-compose-v4{border:1px solid rgba(126,184,167,.18);background:rgba(0,0,0,.18);} body.tm-phase8-formal .hy-roster-v4,body.tm-phase8-formal .hy-compose-v4{padding:12px;}',
      'body.tm-phase8-formal .hy-route-v4{margin-bottom:10px;padding:9px 10px;border:1px solid rgba(198,139,69,.24);color:#eadbb4;background:linear-gradient(90deg,rgba(95,44,27,.40),rgba(0,0,0,.12));font-size:11.5px;line-height:1.45;}',
      'body.tm-phase8-formal .hy-region-v4{margin:10px 0 5px;color:rgba(240,214,141,.82);font-size:10.5px;letter-spacing:.14em;} body.tm-phase8-formal .hy-person-v4{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:45px;padding:7px 8px;margin-bottom:6px;} body.tm-phase8-formal .hy-face-v4{width:28px;height:28px;display:grid;place-items:center;border:1px solid rgba(126,184,167,.30);border-radius:50%;color:#d7f0df;background:radial-gradient(circle,rgba(126,184,167,.22),rgba(13,24,22,.92));}',
      'body.tm-phase8-formal .hy-thread-v4{min-height:0;overflow:auto;padding:12px;scrollbar-color:rgba(126,184,167,.44) rgba(0,0,0,.22);} body.tm-phase8-formal .hy-contact-head-v4{display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:10px;align-items:center;margin-bottom:10px;padding:10px;border:1px solid rgba(126,184,167,.18);background:linear-gradient(90deg,rgba(126,184,167,.12),rgba(255,245,210,.035));}',
      'body.tm-phase8-formal .hy-contact-head-v4 .portrait{width:50px;height:50px;display:grid;place-items:center;border:1px solid rgba(126,184,167,.36);color:#e8f6df;background:radial-gradient(circle,rgba(126,184,167,.28),rgba(11,19,18,.92));font-size:22px;} body.tm-phase8-formal .hy-contact-head-v4 b{color:#f0d892;font-size:15px;} body.tm-phase8-formal .hy-contact-head-v4 span{display:block;margin-top:4px;color:rgba(224,211,171,.58);font-size:11px;}',
      'body.tm-phase8-formal .hy-message-v4{margin-bottom:9px;padding:10px 11px;border:1px solid rgba(126,184,167,.16);background:rgba(255,245,210,.045);} body.tm-phase8-formal .hy-message-v4.out{margin-left:46px;border-right:2px solid rgba(126,184,167,.55);} body.tm-phase8-formal .hy-message-v4.in{margin-right:46px;border-left:2px solid rgba(213,92,64,.52);} body.tm-phase8-formal .hy-message-v4 b{display:block;color:#f0d892;font-size:12px;} body.tm-phase8-formal .hy-message-v4 p{margin:7px 0;color:rgba(238,228,197,.78);font-size:12.5px;line-height:1.58;}',
      'body.tm-phase8-formal .hy-message-v4.transit{border-color:rgba(126,184,167,.30);background:rgba(69,120,100,.10);} body.tm-phase8-formal .hy-message-v4.lost,body.tm-phase8-formal .hy-message-v4.intercepted{border-color:rgba(213,92,64,.34);background:rgba(126,31,24,.16);}',
      'body.tm-phase8-formal .hy-filterbar-v4{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;} body.tm-phase8-formal .hy-filterbar-v4 button{min-height:26px;padding:3px 9px;border:1px solid rgba(126,184,167,.18);color:#d9eddf;background:rgba(255,245,210,.035);font-family:inherit;font-size:11px;cursor:pointer;} body.tm-phase8-formal .hy-filterbar-v4 button.active{border-color:rgba(126,184,167,.42);background:linear-gradient(180deg,rgba(58,104,86,.44),rgba(13,24,22,.66));}',
      'body.tm-phase8-formal .hy-intercept-v4{margin-top:12px;padding-top:10px;border-top:1px solid rgba(126,184,167,.18);}',
      'body.tm-phase8-formal .hy-compose-v4 label{display:block;margin-bottom:8px;} body.tm-phase8-formal .hy-compose-v4 label span{display:block;margin-bottom:4px;color:rgba(224,211,171,.58);font-size:10.5px;}',
      'body.tm-phase8-formal .hy-office-v5{height:100%;box-sizing:border-box;display:grid;grid-template-columns:286px minmax(0,1fr) 284px;gap:14px;padding:16px;border:1px solid rgba(126,184,167,.36);background:radial-gradient(ellipse at 76% 4%,rgba(126,184,167,.14),transparent 42%),radial-gradient(ellipse at 18% 0,rgba(201,160,69,.08),transparent 36%),linear-gradient(180deg,rgba(22,31,29,.98),rgba(8,10,9,.97));overflow:hidden;}',
      'body.tm-phase8-formal .hy-contact-pane-v5,body.tm-phase8-formal .hy-compose-card-v5,body.tm-phase8-formal .hy-thread-card-v5,body.tm-phase8-formal .hy-inbox-pane-v5{min-height:0;border:1px solid rgba(126,184,167,.18);background:linear-gradient(180deg,rgba(255,245,210,.045),rgba(0,0,0,.12)),rgba(0,0,0,.18);box-shadow:inset 0 1px 0 rgba(255,245,210,.05);}',
      'body.tm-phase8-formal .hy-contact-pane-v5{display:grid;grid-template-rows:auto auto minmax(0,1fr);padding:12px;overflow:hidden;}',
      'body.tm-phase8-formal .hy-search-v5{margin-bottom:10px;} body.tm-phase8-formal .hy-roster-scroll-v5{min-height:0;overflow:auto;padding-right:4px;scrollbar-color:rgba(126,184,167,.44) rgba(0,0,0,.22);} body.tm-phase8-formal .hy-region-group-v5{margin-bottom:9px;}',
      'body.tm-phase8-formal .hy-person-v5{width:100%;display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:9px;align-items:center;min-height:64px;margin-bottom:7px;padding:7px 8px;border:1px solid rgba(126,184,167,.18);color:#eadfbd;background:rgba(255,245,210,.035);cursor:pointer;text-align:left;font-family:inherit;}',
      'body.tm-phase8-formal .hy-person-v5.active{border-color:rgba(239,201,116,.52);background:linear-gradient(90deg,rgba(58,104,86,.46),rgba(255,245,210,.055));box-shadow:inset 3px 0 0 rgba(126,184,167,.82);} body.tm-phase8-formal .hy-person-v5:hover{border-color:rgba(126,184,167,.38);background:rgba(126,184,167,.075);}',
      'body.tm-phase8-formal .hy-face-v5{width:46px;height:54px;object-fit:cover;border:1px solid rgba(126,184,167,.32);background:rgba(0,0,0,.28);box-shadow:0 5px 12px rgba(0,0,0,.24);} body.tm-phase8-formal .hy-person-main-v5{min-width:0;} body.tm-phase8-formal .hy-person-main-v5 b{display:block;color:#f0d892;font-size:13px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.35;} body.tm-phase8-formal .hy-person-main-v5 span,body.tm-phase8-formal .hy-person-main-v5 i{display:block;margin-top:3px;color:rgba(232,220,187,.58);font-size:10.5px;white-space:normal;overflow:visible;text-overflow:clip;font-style:normal;line-height:1.35;}',
      'body.tm-phase8-formal .hy-person-counts-v5{display:flex;flex-direction:column;gap:4px;align-items:flex-end;} body.tm-phase8-formal .hy-person-counts-v5 em{min-width:20px;height:18px;display:grid;place-items:center;border:1px solid rgba(126,184,167,.24);border-radius:999px;color:#d9eddf;background:rgba(0,0,0,.18);font-size:10px;font-style:normal;} body.tm-phase8-formal .hy-person-counts-v5 em.hot{border-color:rgba(213,92,64,.38);color:#f0a082;background:rgba(126,31,24,.18);} body.tm-phase8-formal .hy-person-counts-v5 em.on{border-color:rgba(239,201,116,.42);color:#f5db96;}',
      'body.tm-phase8-formal .hy-letter-desk-v5{min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;overflow:hidden;}',
      'body.tm-phase8-formal .hy-compose-card-v5{padding:13px 14px;} body.tm-phase8-formal .hy-compose-card-v5>header{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:11px;align-items:center;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(126,184,167,.16);} body.tm-phase8-formal .hy-compose-card-v5>header img{width:60px;height:66px;object-fit:cover;border:1px solid rgba(126,184,167,.34);background:rgba(0,0,0,.25);} body.tm-phase8-formal .hy-compose-card-v5>header b{display:block;color:#f0d892;font-size:18px;} body.tm-phase8-formal .hy-compose-card-v5>header em{display:block;margin-top:4px;color:rgba(232,220,187,.60);font-size:11px;font-style:normal;}',
      'body.tm-phase8-formal .hy-route-v5{margin-bottom:10px;padding:7px 9px;border:1px solid rgba(198,139,69,.24);color:#eadbb4;background:linear-gradient(90deg,rgba(95,44,27,.34),rgba(0,0,0,.10));font-size:11.5px;line-height:1.45;}',
      'body.tm-phase8-formal .hy-compose-grid-v5{display:grid;grid-template-columns:1.1fr repeat(4,minmax(96px,.7fr));gap:8px;margin-bottom:8px;} body.tm-phase8-formal .hy-compose-grid-v5 label span{display:block;margin-bottom:4px;color:rgba(224,211,171,.58);font-size:10.5px;} body.tm-phase8-formal .hy-compose-paper-v5{min-height:104px;max-height:180px;resize:vertical;} body.tm-phase8-formal .hy-compose-actions-v5{display:flex;flex-wrap:wrap;gap:7px;align-items:center;}',
      'body.tm-phase8-formal .hy-thread-card-v5{display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden;} body.tm-phase8-formal .hy-thread-card-v5>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid rgba(126,184,167,.16);background:rgba(0,0,0,.12);} body.tm-phase8-formal .hy-thread-card-v5>header b{display:block;color:#f0d892;font-size:16px;} body.tm-phase8-formal .hy-thread-card-v5>header em{display:block;margin-top:3px;color:rgba(232,220,187,.56);font-size:11px;font-style:normal;} body.tm-phase8-formal .hy-thread-scroll-v5{min-height:0;overflow:auto;padding:13px 14px 16px;scrollbar-color:rgba(126,184,167,.44) rgba(0,0,0,.22);}',
      'body.tm-phase8-formal .hy-filterbar-v5{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;} body.tm-phase8-formal .hy-filterbar-v5 button{min-height:26px;padding:3px 9px;border:1px solid rgba(126,184,167,.18);color:#d9eddf;background:rgba(255,245,210,.035);font-family:inherit;font-size:11px;cursor:pointer;} body.tm-phase8-formal .hy-filterbar-v5 button.active{border-color:rgba(126,184,167,.46);background:linear-gradient(180deg,rgba(58,104,86,.44),rgba(13,24,22,.66));}',
      'body.tm-phase8-formal .hy-letter-card-v5{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr);gap:10px;margin-bottom:10px;padding:11px;border:1px solid rgba(126,184,167,.16);background:linear-gradient(180deg,rgba(255,245,210,.052),rgba(0,0,0,.12)),rgba(15,18,16,.74);box-shadow:0 8px 18px rgba(0,0,0,.20);} body.tm-phase8-formal .hy-letter-card-v5.out{margin-left:42px;border-right:2px solid rgba(126,184,167,.58);} body.tm-phase8-formal .hy-letter-card-v5.in{margin-right:42px;border-left:2px solid rgba(213,92,64,.48);} body.tm-phase8-formal .hy-letter-card-v5.lost,body.tm-phase8-formal .hy-letter-card-v5.intercepted{border-color:rgba(213,92,64,.38);background:rgba(126,31,24,.14);} body.tm-phase8-formal .hy-letter-card-v5.transit{border-color:rgba(126,184,167,.30);background:rgba(69,120,100,.10);}',
      'body.tm-phase8-formal .hy-letter-stamp-v5{width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(126,184,167,.32);border-radius:50%;color:#dff2e1;background:radial-gradient(circle,rgba(126,184,167,.22),rgba(13,24,22,.94));font-size:16px;} body.tm-phase8-formal .hy-letter-main-v5{min-width:0;} body.tm-phase8-formal .hy-letter-main-v5 header{display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr) auto;gap:8px;align-items:start;} body.tm-phase8-formal .hy-letter-main-v5 header b{color:#f0d892;font-size:13px;} body.tm-phase8-formal .hy-letter-main-v5 header span{color:rgba(232,220,187,.62);font-size:11px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.35;} body.tm-phase8-formal .hy-letter-main-v5 header em{color:#a8dcc5;font-size:11px;font-style:normal;}',
      'body.tm-phase8-formal .hy-letter-meta-v5{display:flex;flex-wrap:wrap;gap:5px;margin:7px 0;} body.tm-phase8-formal .hy-letter-meta-v5 span{display:inline-flex;align-items:center;min-height:18px;padding:1px 6px;border:1px solid rgba(126,184,167,.16);color:rgba(224,237,222,.72);background:rgba(255,245,210,.035);font-size:10px;} body.tm-phase8-formal .hy-fulltext-v5{display:block;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;max-width:100%;} body.tm-phase8-formal .hy-letter-body-v5{white-space:pre-wrap;overflow:visible;color:rgba(242,231,202,.86);font-size:13px;line-height:1.75;padding:9px 10px;border-top:1px solid rgba(126,184,167,.12);border-bottom:1px solid rgba(126,184,167,.10);background:rgba(0,0,0,.10);} body.tm-phase8-formal .hy-letter-reply-v5{margin-top:8px;padding:9px 10px;border:1px solid rgba(201,160,69,.18);background:rgba(201,160,69,.07);} body.tm-phase8-formal .hy-letter-reply-v5 b{display:block;color:#f0d892;font-size:12px;} body.tm-phase8-formal .hy-letter-reply-v5 p{white-space:pre-wrap;margin:5px 0 0;color:rgba(242,231,202,.82);font-size:12.5px;line-height:1.65;}',
      'body.tm-phase8-formal .hy-actions-v5{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;} body.tm-phase8-formal .hy-letter-empty-v5{padding:18px;border:1px dashed rgba(126,184,167,.24);color:rgba(232,220,187,.68);background:rgba(0,0,0,.12);} body.tm-phase8-formal .hy-letter-empty-v5 b{display:block;color:#f0d892;font-size:14px;} body.tm-phase8-formal .hy-letter-empty-v5 p{margin:7px 0 0;font-size:12.5px;line-height:1.7;}',
      'body.tm-phase8-formal .hy-inbox-pane-v5{display:grid;grid-template-rows:auto auto minmax(0,1fr);padding:12px;overflow:hidden;} body.tm-phase8-formal .hy-inbox-summary-v5{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px;} body.tm-phase8-formal .hy-inbox-summary-v5 span{padding:7px 8px;border:1px solid rgba(126,184,167,.14);color:rgba(232,220,187,.62);background:rgba(0,0,0,.14);font-size:11px;} body.tm-phase8-formal .hy-inbox-summary-v5 b{color:#f0d892;font-size:14px;} body.tm-phase8-formal .hy-inbox-scroll-v5{min-height:0;overflow:auto;padding-right:4px;scrollbar-color:rgba(126,184,167,.44) rgba(0,0,0,.22);}',
      'body.tm-phase8-formal .hy-inbox-item-v5{margin-bottom:10px;padding:9px;border:1px solid rgba(126,184,167,.16);background:linear-gradient(180deg,rgba(255,245,210,.050),rgba(0,0,0,.12)),rgba(10,14,13,.68);} body.tm-phase8-formal .hy-inbox-item-v5.unread{border-color:rgba(213,92,64,.32);box-shadow:inset 3px 0 0 rgba(213,92,64,.58);} body.tm-phase8-formal .hy-inbox-open-v5{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:8px;align-items:start;border:0;background:transparent;color:#eadfbd;text-align:left;font-family:inherit;cursor:pointer;padding:0;} body.tm-phase8-formal .hy-inbox-seal-v5{width:32px;height:32px;display:grid;place-items:center;border:1px solid rgba(126,184,167,.30);border-radius:50%;color:#dff2e1;background:radial-gradient(circle,rgba(126,184,167,.22),rgba(13,24,22,.94));} body.tm-phase8-formal .hy-inbox-open-v5 b{display:block;color:#f0d892;font-size:12.5px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.35;} body.tm-phase8-formal .hy-inbox-open-v5 em{display:block;margin-top:3px;color:rgba(232,220,187,.58);font-size:10.5px;font-style:normal;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.35;} body.tm-phase8-formal .hy-inbox-open-v5 i{padding:2px 6px;border:1px solid rgba(126,184,167,.18);border-radius:999px;color:#a8dcc5;font-size:10px;font-style:normal;background:rgba(0,0,0,.16);}',
      'body.tm-phase8-formal .hy-inbox-meta-v5{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 6px;} body.tm-phase8-formal .hy-inbox-meta-v5 span{padding:1px 6px;border:1px solid rgba(126,184,167,.14);color:rgba(224,237,222,.68);background:rgba(255,245,210,.035);font-size:10px;} body.tm-phase8-formal .hy-inbox-body-v5{white-space:pre-wrap;color:rgba(242,231,202,.80);font-size:12px;line-height:1.62;padding:7px 8px;border-top:1px solid rgba(126,184,167,.10);border-bottom:1px solid rgba(126,184,167,.08);background:rgba(0,0,0,.10);}',
      'body.tm-phase8-formal .records-cabinet-v4{display:grid;grid-template-columns:118px minmax(0,1fr);padding:16px;border:1px solid rgba(214,177,88,.36);background:radial-gradient(ellipse at 18% 0,rgba(214,177,88,.10),transparent 40%),linear-gradient(180deg,rgba(42,30,20,.98),rgba(11,9,7,.96));}',
      'body.tm-phase8-formal .records-spine-v4{padding:12px 8px;border-right:1px solid rgba(214,177,88,.22);} body.tm-phase8-formal .records-tab-v4{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;min-height:82px;margin-bottom:8px;padding:8px 7px;writing-mode:vertical-rl;text-align:center;background:linear-gradient(180deg,rgba(88,55,24,.72),rgba(18,12,8,.72));}',
      'body.tm-phase8-formal .records-tab-v4 em{color:rgba(224,211,171,.48);font-style:normal;font-size:10px;} body.tm-phase8-formal .records-toolbar-v4{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-bottom:12px;} body.tm-phase8-formal .records-grid-v4,body.tm-phase8-formal .bn-active-grid-v4{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;} body.tm-phase8-formal .records-section-v4{margin-bottom:14px;}',
      'body.tm-phase8-formal .tm-roster-group{margin:10px 0 7px;color:rgba(240,214,141,.82);font-size:11px;letter-spacing:.16em;}',
      'body.tm-phase8-formal .records-source-legend-v4{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px;} body.tm-phase8-formal .records-source-legend-v4 button,body.tm-phase8-formal .records-toolbar-v4 button{min-height:28px;padding:4px 10px;border:1px solid rgba(201,160,69,.20);color:#eadfbd;background:rgba(0,0,0,.18);font-family:inherit;font-size:12px;cursor:pointer;} body.tm-phase8-formal .records-source-legend-v4 button.active,body.tm-phase8-formal .records-toolbar-v4 button.active{border-color:rgba(239,201,116,.52);background:linear-gradient(180deg,rgba(122,45,32,.34),rgba(255,245,210,.045));}',
      'body.tm-phase8-formal .bn-progress-v4{height:7px;margin-top:8px;border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.30);overflow:hidden;} body.tm-phase8-formal .bn-progress-v4 i{display:block;height:100%;background:linear-gradient(90deg,#8a3227,#dfba6f);}',
      'body.tm-phase8-formal .records-cabinet-v5{height:100%;box-sizing:border-box;display:grid;grid-template-columns:176px minmax(0,1fr) 296px;gap:14px;padding:16px;border:1px solid rgba(214,177,88,.38);background:radial-gradient(ellipse at 16% 0,rgba(214,177,88,.12),transparent 42%),radial-gradient(ellipse at 86% 8%,rgba(126,31,24,.13),transparent 36%),linear-gradient(180deg,rgba(42,30,20,.985),rgba(10,8,7,.97));overflow:hidden;}',
      'body.tm-phase8-formal .records-spine-v5,body.tm-phase8-formal .records-paper-v5,body.tm-phase8-formal .records-detail-v5{min-height:0;border:1px solid rgba(201,160,69,.18);background:linear-gradient(180deg,rgba(255,245,210,.050),rgba(0,0,0,.12)),rgba(0,0,0,.16);box-shadow:inset 0 1px 0 rgba(255,236,178,.05);}',
      'body.tm-phase8-formal .records-spine-v5{display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;gap:10px;padding:12px;overflow:hidden;border-left:4px solid rgba(126,31,24,.64);}',
      'body.tm-phase8-formal .records-tab-v5{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;margin-bottom:7px;padding:9px 8px;border:1px solid rgba(201,160,69,.15);color:#eadfbd;background:linear-gradient(90deg,rgba(0,0,0,.24),rgba(255,245,210,.030));font-family:inherit;text-align:left;cursor:pointer;} body.tm-phase8-formal .records-tab-v5.active{border-color:rgba(239,201,116,.52);background:linear-gradient(90deg,rgba(126,31,24,.38),rgba(255,245,210,.055));box-shadow:inset 3px 0 0 rgba(214,169,82,.82);} body.tm-phase8-formal .records-tab-v5 b{display:block;color:#f0d892;font-size:14px;letter-spacing:.14em;} body.tm-phase8-formal .records-tab-v5 span{display:block;margin-top:3px;color:rgba(232,220,187,.55);font-size:10.5px;} body.tm-phase8-formal .records-tab-v5 em{min-width:24px;height:22px;display:grid;place-items:center;border:1px solid rgba(201,160,69,.20);border-radius:999px;color:#f2ddb0;background:rgba(0,0,0,.20);font-style:normal;font-size:10.5px;}',
      'body.tm-phase8-formal .records-spine-note-v5{padding:9px;border:1px solid rgba(201,160,69,.14);background:rgba(0,0,0,.16);} body.tm-phase8-formal .records-spine-note-v5 b{display:block;color:#f0d892;font-size:12px;} body.tm-phase8-formal .records-spine-note-v5 p{margin:5px 0 0;color:rgba(232,220,187,.62);font-size:11px;line-height:1.55;}',
      'body.tm-phase8-formal .records-paper-v5{display:grid;grid-template-rows:auto auto minmax(0,1fr);overflow:hidden;padding:16px 18px;color:#eadfbd;} body.tm-phase8-formal .records-paper-head-v5{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid rgba(201,160,69,.18);} body.tm-phase8-formal .records-paper-head-v5 h2{margin:0;color:#f1d98d;font-size:25px;letter-spacing:.10em;} body.tm-phase8-formal .records-paper-head-v5 p{margin:4px 0 0;color:rgba(232,220,187,.58);font-size:12px;line-height:1.55;}',
      'body.tm-phase8-formal .records-toolbar-v5{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;margin-bottom:12px;} body.tm-phase8-formal .records-filter-v5{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px;} body.tm-phase8-formal .records-filter-v5 button{min-height:27px;padding:3px 9px;border:1px solid rgba(201,160,69,.18);color:#eadfbd;background:rgba(0,0,0,.18);font-family:inherit;font-size:11.5px;cursor:pointer;} body.tm-phase8-formal .records-filter-v5 button.active{border-color:rgba(239,201,116,.52);background:linear-gradient(180deg,rgba(122,45,32,.36),rgba(255,245,210,.050));}',
      'body.tm-phase8-formal .records-scroll-v5{min-height:0;overflow:auto;padding-right:5px;scrollbar-color:rgba(201,160,69,.48) rgba(0,0,0,.24);} body.tm-phase8-formal .records-section-v5{margin-bottom:14px;} body.tm-phase8-formal .records-section-title-v5{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px;color:#efd58b;font-size:17px;letter-spacing:.10em;} body.tm-phase8-formal .records-section-title-v5 small{color:rgba(232,220,187,.50);font-size:10.5px;font-weight:400;letter-spacing:.08em;}',
      'body.tm-phase8-formal .records-entry-v5{position:relative;margin-bottom:10px;padding:11px;border:1px solid rgba(201,160,69,.16);background:linear-gradient(90deg,rgba(126,32,24,.09),transparent 38%),linear-gradient(180deg,rgba(255,245,210,.052),rgba(0,0,0,.14)),rgba(19,14,11,.72);box-shadow:0 8px 18px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,236,178,.045);} body.tm-phase8-formal .records-entry-v5::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:rgba(126,32,24,.58);} body.tm-phase8-formal .records-entry-v5.hot::before{background:rgba(213,92,64,.82);} body.tm-phase8-formal .records-entry-v5.active{border-color:rgba(239,201,116,.42);box-shadow:inset 3px 0 0 rgba(214,169,82,.65),0 8px 18px rgba(0,0,0,.20);}',
      'body.tm-phase8-formal .records-entry-v5 header{display:grid;grid-template-columns:40px minmax(0,1fr);gap:9px;align-items:start;margin-bottom:8px;} body.tm-phase8-formal .records-seal-v5{width:36px;height:36px;display:grid;place-items:center;border:1px solid rgba(201,160,69,.30);border-radius:50%;color:#f3d98c;background:radial-gradient(circle,rgba(201,160,69,.18),rgba(50,24,16,.92) 72%);font-size:15px;} body.tm-phase8-formal .records-entry-main-v5{min-width:0;} body.tm-phase8-formal .records-entry-main-v5 b{display:block;color:#f1d98d;font-size:13.5px;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.45;} body.tm-phase8-formal .records-entry-main-v5 em{display:block;margin-top:3px;color:rgba(232,220,187,.56);font-size:10.5px;font-style:normal;white-space:normal;overflow:visible;text-overflow:clip;line-height:1.4;}',
      'body.tm-phase8-formal .records-fulltext-v5{display:block;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;max-width:100%;} body.tm-phase8-formal .records-entry-body-v5{white-space:pre-wrap;overflow:visible;margin:8px 0;padding:9px 10px;color:rgba(242,231,202,.84);border-top:1px solid rgba(201,160,69,.12);border-bottom:1px solid rgba(201,160,69,.10);background:rgba(0,0,0,.10);font-size:12.5px;line-height:1.75;} body.tm-phase8-formal .records-annot-v5{margin:8px 0;padding:8px 9px;border:1px solid rgba(126,184,167,.18);background:rgba(65,111,92,.10);} body.tm-phase8-formal .records-annot-v5 b{display:block;color:#a8dcc5;font-size:12px;} body.tm-phase8-formal .records-annot-v5 p{white-space:pre-wrap;margin:4px 0 0;color:rgba(232,240,220,.78);font-size:12px;line-height:1.62;}',
      'body.tm-phase8-formal .records-detail-v5{display:grid;grid-template-rows:auto auto minmax(180px,1fr) auto auto;gap:10px;padding:12px;overflow:auto;scrollbar-color:rgba(201,160,69,.48) rgba(0,0,0,.24);} body.tm-phase8-formal .records-detail-v5 h3{margin:0;color:#f1d98d;font-size:17px;line-height:1.35;letter-spacing:.08em;} body.tm-phase8-formal .records-detail-text-v5{min-height:180px;white-space:pre-wrap;overflow:auto;padding:10px;border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.14);color:rgba(242,231,202,.86);font-size:12.5px;line-height:1.75;scrollbar-color:rgba(201,160,69,.42) rgba(0,0,0,.20);} body.tm-phase8-formal .records-detail-source-v5{display:none;} body.tm-phase8-formal .records-detail-actions-v5{display:flex;flex-wrap:wrap;gap:7px;} body.tm-phase8-formal .records-empty-v5,body.tm-phase8-formal .records-search-empty-v5{padding:20px;border:1px dashed rgba(201,160,69,.22);color:rgba(232,220,187,.66);background:rgba(0,0,0,.14);font-size:13px;}',
      'body.tm-phase8-formal .bn-active-grid-v5{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px;} body.tm-phase8-formal .bn-affair-v5{padding:11px;border:1px solid rgba(201,160,69,.16);background:linear-gradient(180deg,rgba(255,245,210,.052),rgba(0,0,0,.14)),rgba(19,14,11,.70);} body.tm-phase8-formal .bn-affair-v5 header{display:grid;grid-template-columns:40px minmax(0,1fr);gap:9px;align-items:start;margin-bottom:7px;} body.tm-phase8-formal .bn-affair-v5 b{display:block;color:#f1d98d;font-size:13px;line-height:1.45;} body.tm-phase8-formal .bn-affair-v5 em{display:block;margin-top:3px;color:rgba(232,220,187,.56);font-size:10.5px;font-style:normal;line-height:1.4;} body.tm-phase8-formal .bn-affair-v5 p{min-height:42px;margin:0 0 8px;color:rgba(242,231,202,.78);font-size:12px;line-height:1.6;} body.tm-phase8-formal .bn-progress-v5{height:7px;margin:7px 0;border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.30);overflow:hidden;} body.tm-phase8-formal .bn-progress-v5 i{display:block;height:100%;background:linear-gradient(90deg,#8a3227,#dfba6f);}',
      '@media (max-width:1280px){body.tm-phase8-formal .memorial-office-v4{grid-template-columns:250px minmax(0,1fr)}body.tm-phase8-formal .hy-office-v4{grid-template-columns:220px minmax(0,1fr) 260px}body.tm-phase8-formal .hy-office-v5{grid-template-columns:258px minmax(0,1fr) 246px;gap:10px;padding:12px}body.tm-phase8-formal .hy-compose-grid-v5{grid-template-columns:repeat(3,minmax(0,1fr))}body.tm-phase8-formal .records-grid-v4,body.tm-phase8-formal .bn-active-grid-v4,body.tm-phase8-formal .bn-active-grid-v5{grid-template-columns:1fr}body.tm-phase8-formal .records-cabinet-v5{grid-template-columns:158px minmax(0,1fr) 270px;gap:10px;padding:12px}}',
      '@media (max-width:980px){body.tm-phase8-formal .tm-action-panel,body.tm-phase8-formal .tm-action-panel.edict-shell,body.tm-phase8-formal .tm-action-panel.memorial-shell,body.tm-phase8-formal .tm-action-panel.letter-shell,body.tm-phase8-formal .tm-action-panel.records-shell{left:12px;right:12px;top:64px;width:auto;height:calc(100vh - 86px);transform:none}body.tm-phase8-formal .tm-bridge-overlay.show .tm-action-panel.edict-shell,body.tm-phase8-formal .tm-bridge-overlay.show .tm-action-panel.letter-shell{transform:none}body.tm-phase8-formal .edict-old-panel,body.tm-phase8-formal .memorial-office-v4,body.tm-phase8-formal .hy-office-v4,body.tm-phase8-formal .hy-office-v5,body.tm-phase8-formal .records-cabinet-v4,body.tm-phase8-formal .records-cabinet-v5{display:block;overflow:auto}body.tm-phase8-formal .hy-letter-desk-v5{display:block;overflow:visible}body.tm-phase8-formal .hy-contact-pane-v5,body.tm-phase8-formal .hy-compose-card-v5,body.tm-phase8-formal .hy-thread-card-v5,body.tm-phase8-formal .hy-inbox-pane-v5,body.tm-phase8-formal .records-spine-v5,body.tm-phase8-formal .records-paper-v5,body.tm-phase8-formal .records-detail-v5{margin-bottom:10px}body.tm-phase8-formal .hy-compose-grid-v5{grid-template-columns:1fr}body.tm-phase8-formal .records-toolbar-v5{grid-template-columns:1fr}body.tm-phase8-formal .tm-stat-strip{grid-template-columns:repeat(2,minmax(0,1fr))}}'
    ].join('\n');
  }

  function actionShell(kind, body){
    installActionPanelExactStyles();
    return '<section class="tm-bridge-panel tm-action-panel ' + attr(kind) + '-shell" role="dialog" aria-modal="true">' +
      '<button type="button" class="tm-action-close tm-floating-close" data-close-bridge="1" title="关闭">×</button>' +
      '<div class="tm-action-body ' + attr(kind) + '">' + body + '</div>' +
      '</section>';
  }

  function actionChip(text, cls){
    return '<span class="tm-chip ' + attr(cls || '') + '">' + esc(text == null || text === '' ? '未记' : text) + '</span>';
  }

  function actionBtn(label, action, data, cls){
    data = data || {};
    var attrs = Object.keys(data).map(function(k){ return ' data-' + attr(k) + '="' + attr(data[k]) + '"'; }).join('');
    return '<button type="button" class="' + attr(cls || 'tm-mini-btn') + '" data-desk-action="' + attr(action) + '"' + attrs + '>' + esc(label) + '</button>';
  }

  function renderActionStats(rows){
    return '<div class="tm-stat-strip v4">' + rows.map(function(r){
      return '<div class="tm-stat"><span>' + esc(r[0]) + '</span><b>' + esc(r[1] == null || r[1] === '' ? '—' : r[1]) + '</b></div>';
    }).join('') + '</div>';
  }

  function getEdictArchiveRows(){
    var gm = window.GM || {};
    return firstArray(gm._edictTracker, gm.edicts, gm.edictLog, gm._issuedEdicts).slice(-8).reverse().map(function(x, i){
      return {
        title: x.title || compactText(x.content || x.text || x.body || '既有诏令', 24),
        turn: x.date || getTurnText(x.turn || ((window.GM && GM.turn) || 1)),
        status: x.status || x.result || '追踪中',
        target: x.assignee || x.target || x.receiver || '有司',
        effect: x.forecast || x.effect || x.resultText || compactText(x.content || x.text || '', 54)
      };
    });
  }

  function getEdictSuggestionRows(){
    var gm = window.GM || {};
    var list = Array.isArray(gm._edictSuggestions) ? gm._edictSuggestions : (Array.isArray(gm.edictSuggestions) ? gm.edictSuggestions : []);
    return list.map(function(x, i){
      x = x || {};
      return {
        id: x.id || ('edict-sug-' + i),
        realIndex: i,
        title: x.title || x.topic || x.source || '草诏建议',
        source: x.source || '御案',
        from: x.from || x.proposer || '',
        topic: x.topic || x.title || '',
        text: x.text || x.content || x.body || '',
        content: x.content || x.text || x.body || '',
        portrait: x.portrait || x.avatar || x.image || x.img || x.photo || x.characterImage || '',
        tags: x.tags || [],
        turn: x.turn || 0,
        used: !!x.used
      };
    }).filter(function(x){ return !x.used; }).sort(function(a, b){
      var ta = Number(a.turn || 0);
      var tb = Number(b.turn || 0);
      if (tb !== ta) return tb - ta;
      return a.realIndex - b.realIndex;
    });
  }

  function getFormalEdictCategories(){
    return [
      { id:'policy', badge:'政', label:'政令', hint:'朝政、制度、地方处置', forecast:'牵动皇权、吏治、党争与地方执行。' },
      { id:'military', badge:'军', label:'军令', hint:'兵马、边镇、粮饷调度', forecast:'牵动军心、边防、国库与将领忠诚。' },
      { id:'finance', badge:'财', label:'财赋', hint:'税赋、盐引、矿关、漕运', forecast:'牵动国库、民心、商贸与地方阻力。' },
      { id:'private', badge:'密', label:'密旨', hint:'私下诏谕、试探、任免前置', forecast:'牵动人物态度、派系关系与隐秘记忆。' }
    ];
  }

  function ensureFormalEdictDrafts(){
    if (!state.edictDrafts) state.edictDrafts = {};
    if (!state.edictDrafts.policy && state.edictDraft && state.edictDraft.length) {
      state.edictDrafts.policy = state.edictDraft.join('\n');
    }
    return state.edictDrafts;
  }

  function normalizeFormalImageSrc(src){
    src = String(src || '').trim();
    if (!src || src === '[IMG]') return '';
    if (/^(https?:|data:|blob:|\/|preview\/|assets\/)/.test(src)) return src;
    if (src.indexOf('img/') === 0) return 'preview/' + src;
    if (src.indexOf('portraits/') === 0) return 'preview/img/' + src;
    return src;
  }

  function formalEdictSourceName(value){
    var raw = String(value || '').trim();
    if (!raw) return '';
    return raw
      .replace(/^[\s\[]+|[\s\]]+$/g, '')
      .split(/[：:，,。.；;、（）()【】\[\]「」『』·\s]/)[0]
      .trim();
  }

  function findFormalEdictPerson(name){
    var raw = String(name || '').trim();
    if (!raw) return null;
    var clean = formalEdictSourceName(raw) || raw;
    var candidates = [raw, clean].filter(Boolean);
    if (typeof window.findCharByName === 'function') {
      for (var i = 0; i < candidates.length; i += 1) {
        try {
          var found = window.findCharByName(candidates[i]);
          if (found) return found;
        } catch(_) {}
      }
    }
    var people = getPeople();
    for (var p = 0; p < people.length; p += 1) {
      var person = people[p];
      if (!person) continue;
      var key = personKey(person);
      var pname = String(person.name || '');
      var compactName = personNameKey(person);
      for (var c = 0; c < candidates.length; c += 1) {
        var cand = String(candidates[c] || '');
        var compactCand = cand.replace(/\s+/g, '');
        if (key === cand || pname === cand || compactName === compactCand) return person;
        if (compactName && compactCand && (compactCand.indexOf(compactName) >= 0 || compactName.indexOf(compactCand) >= 0)) return person;
      }
    }
    return null;
  }

  function edictPortraitForFormal(s){
    var direct = normalizeFormalImageSrc(s && (s.portrait || s.avatar || s.image || s.img || s.photo || s.characterImage));
    if (direct) return direct;
    var person = findFormalEdictPerson(s && s.from);
    if (person && typeof tmfRenwuPortrait === 'function') {
      try {
        var portrait = normalizeFormalImageSrc(tmfRenwuPortrait(person));
        if (portrait) return portrait;
      } catch(_) {}
    }
    var text = [s && s.source, s && s.title, (s && s.tags || []).join(' ')].join(' ');
    if (/军|兵|边|镇|将/.test(text)) return asset('portraits/ming-general-ai.png');
    if (/内廷|司礼|东厂|宦/.test(text)) return asset('portraits/ming-eunuch-ai.png');
    if (/讲|学|礼|儒|史/.test(text)) return asset('portraits/ming-scholar-ai.png');
    return asset('portraits/ming-civil-ai.png');
  }

  function edictSuggestionPortraitHtml(x){
    var name = formalEdictSourceName((x && (x.from || x.source || x.title)) || '') || '\u81e3';
    var glyph = name.slice(0, 1) || '\u81e3';
    return '<span class="edict-sug-portrait-wrap" data-glyph="' + attr(glyph) + '">' +
      '<img class="edict-sug-portrait" src="' + attr(edictPortraitForFormal(x)) + '" alt="" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'fallback\');">' +
      '</span>';
  }

  function legacyEdictDraftValue(id, keys){
    var root = document.querySelector('.tm-desk-overlay');
    var live = root && root.querySelector ? root.querySelector('#' + cssEscape(id)) : null;
    if (live && typeof live.value === 'string') return live.value;
    var drafts = ensureFormalEdictDrafts();
    for (var i = 0; i < keys.length; i++) {
      if (drafts[keys[i]]) return drafts[keys[i]];
    }
    if (id === 'edict-pol' && state.edictDraft && state.edictDraft.length) return state.edictDraft.join('\n');
    return '';
  }

  function renderEdictSuggestionItem(x, index){
    var realIndex = x.realIndex == null ? index : x.realIndex;
    return '<article class="edict-sug-v2">' +
      edictSuggestionPortraitHtml(x) +
      '<div><b>【' + esc(x.source || '御案') + (x.from ? ' · ' + esc(x.from) : '') + '】</b>' +
      (x.topic ? '<p style="margin-bottom:2px;color:#c9a045;font-style:italic;">〔' + esc(x.topic) + '〕</p>' : '') +
      '<p>' + esc(compactText(x.text || x.content || '可纳入诏令草拟。', 92)) + '</p>' +
      '<div class="edict-sug-footer"><span class="tm-chip-row">' + actionChip(getTurnText((window.GM && GM.turn) || 1), 'green') + (x.tags || []).slice(0, 2).map(function(t){ return actionChip(t, /急|军|危/.test(String(t)) ? 'hot' : ''); }).join('') + '</span>' +
      '<span><button type="button" class="edict-sug-adopt" onclick="if(window.TMPhase8FormalBridge)TMPhase8FormalBridge.showEdictAdoptMenu(event,' + attr(realIndex) + ');return false;">纳 入</button>' +
      '<button type="button" class="edict-sug-delete" title="删除" onclick="if(window.TMPhase8FormalBridge)TMPhase8FormalBridge.dismissEdictSuggestion(' + attr(realIndex) + ');return false;">×</button></span></div></div></article>';
  }

  function formalEdictSuggestionList(){
    var gm = window.GM || {};
    return Array.isArray(gm._edictSuggestions) ? gm._edictSuggestions : (Array.isArray(gm.edictSuggestions) ? gm.edictSuggestions : []);
  }

  function formalEdictDraftKeys(catId){
    var keyMap = {
      'edict-pol':['policy','political'],
      'edict-mil':['military'],
      'edict-dip':['diplomatic','diplomacy'],
      'edict-eco':['finance','economic','economy'],
      'edict-oth':['other','private']
    };
    return keyMap[catId] || ['policy'];
  }

  function findFormalEdictDraftInput(catId, root){
    var selector = '#' + cssEscape(catId);
    var scoped = root && root.closest ? root.closest('.tm-desk-overlay') : root;
    if (scoped && scoped.querySelector) {
      var scopedEl = scoped.querySelector(selector);
      if (scopedEl) return scopedEl;
    }
    var actionOverlay = document.getElementById('tm-action-edict-overlay');
    if (actionOverlay && actionOverlay.querySelector) {
      var actionEl = actionOverlay.querySelector(selector);
      if (actionEl) return actionEl;
    }
    var currentOverlay = document.querySelector('.tm-desk-overlay');
    if (currentOverlay && currentOverlay.querySelector) {
      var currentEl = currentOverlay.querySelector(selector);
      if (currentEl) return currentEl;
    }
    return null;
  }

  function syncFormalEdictDraft(catId, value){
    state.edictDrafts = state.edictDrafts || {};
    formalEdictDraftKeys(catId).forEach(function(key){
      state.edictDrafts[key] = value || '';
    });
  }

  function formalEdictDraftValue(keys){
    var drafts = ensureFormalEdictDrafts();
    for (var i = 0; i < keys.length; i += 1) {
      var value = String(drafts[keys[i]] || '').trim();
      if (value) return value;
    }
    return '';
  }

  function getFormalEdictDraftSnapshot(){
    Array.prototype.forEach.call(document.querySelectorAll('.tm-desk-overlay'), captureDeskOverlayState);
    return {
      political: formalEdictDraftValue(['policy','political']),
      military: formalEdictDraftValue(['military']),
      diplomatic: formalEdictDraftValue(['diplomatic','diplomacy']),
      economic: formalEdictDraftValue(['finance','economic','economy']),
      other: formalEdictDraftValue(['other','private']),
      xingluPub: String(state.playerAction || '').trim()
    };
  }

  function removeFormalEdictHiddenInputs(){
    Array.prototype.forEach.call(document.querySelectorAll('[data-phase8-edict-bridge="1"]'), function(el){
      el.remove();
    });
  }

  function ensureFormalEdictBridgeInput(id, value){
    value = String(value || '');
    var el = document.getElementById(id);
    if (el && (!el.getAttribute || el.getAttribute('data-phase8-edict-bridge') !== '1')) {
      if (value && 'value' in el) el.value = value;
      return el;
    }
    if (!el) {
      if (!value) return null;
      el = document.createElement('textarea');
      el.id = id;
      el.setAttribute('data-phase8-edict-bridge', '1');
      el.setAttribute('aria-hidden', 'true');
      el.tabIndex = -1;
      el.style.cssText = 'position:absolute;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(el);
    }
    if ('value' in el) el.value = value;
    return el;
  }

  function syncFormalEdictDraftsToLegacyInputs(){
    var snap = getFormalEdictDraftSnapshot();
    [
      ['edict-pol', snap.political],
      ['edict-mil', snap.military],
      ['edict-dip', snap.diplomatic],
      ['edict-eco', snap.economic],
      ['edict-oth', snap.other],
      ['xinglu-pub', snap.xingluPub]
    ].forEach(function(pair){
      ensureFormalEdictBridgeInput(pair[0], pair[1]);
    });
    return snap;
  }

  function clearFormalEdictDrafts(){
    state.edictDraft = [];
    state.edictDrafts = {};
    state.playerAction = '';
    clearFormalDraftStore(['edictDraft', 'edictDrafts', 'playerAction']);
    removeFormalEdictHiddenInputs();
  }

  function appendFormalEdictDraft(catId, block, root){
    block = String(block || '').trim();
    if (!block) return { ok:false, live:false };
    state.edictDrafts = state.edictDrafts || {};
    var keys = formalEdictDraftKeys(catId);
    var primary = keys[0] || 'policy';
    var ta = findFormalEdictDraftInput(catId, root);
    var base = ta && typeof ta.value === 'string' ? ta.value : (state.edictDrafts[primary] || '');
    var next = (base ? String(base).replace(/\s+$/, '') + '\n\n' : '') + block;
    syncFormalEdictDraft(catId, next);
    if (ta) {
      ta.value = next;
      try { if (typeof window._edictLiveForecast === 'function') window._edictLiveForecast(catId); } catch(_) {}
      try { ta.focus(); } catch(_) {}
    }
    return { ok:true, live:!!ta };
  }

  function dismissFormalEdictSuggestion(realIndex){
    var list = formalEdictSuggestionList();
    if (list[realIndex]) list[realIndex].used = true;
    openZhaoPreviewPanel();
  }

  function showFormalEdictAdoptMenu(evt, realIndex){
    if (evt) { evt.preventDefault(); evt.stopPropagation(); }
    var old = document.getElementById('_edictAdoptMenu');
    if (old) old.remove();
    var list = formalEdictSuggestionList();
    var sg = list[realIndex];
    if (!sg) return;
    var anchor = evt && (evt.currentTarget || evt.target);
    var adoptRoot = anchor && anchor.closest ? anchor.closest('.tm-desk-overlay') : null;
    var rect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 80, right: 160, top: 120, bottom: 150 };
    var cats = [
      {id:'edict-pol', label:'政 令', color:'var(--indigo-400)'},
      {id:'edict-mil', label:'军 令', color:'var(--vermillion-400)'},
      {id:'edict-dip', label:'外 交', color:'var(--celadon-400)'},
      {id:'edict-eco', label:'经 济', color:'var(--gold-400)'},
      {id:'edict-oth', label:'其 他', color:'var(--ink-300)'}
    ];
    var menu = document.createElement('div');
    menu.id = '_edictAdoptMenu';
    var menuH = cats.length * 30 + 8;
    var top = rect.bottom + 4;
    if (top + menuH > window.innerHeight - 10) top = Math.max(10, rect.top - menuH - 4);
    menu.style.cssText = 'position:fixed;left:' + Math.max(10, rect.left) + 'px;top:' + top + 'px;z-index:10080;background:var(--color-elevated,#1a1a2e);border:1px solid var(--color-border-subtle,#444);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.5);min-width:96px;padding:3px 0;font-family:var(--font-serif);';
    cats.forEach(function(cat){
      var item = document.createElement('button');
      item.type = 'button';
      item.textContent = cat.label;
      item.style.cssText = 'display:block;width:100%;padding:6px 12px;border:0;background:transparent;text-align:left;font-size:0.8rem;cursor:pointer;color:' + cat.color + ';font-family:inherit;';
      item.onmouseover = function(){ this.style.background = 'var(--color-surface,rgba(255,255,255,0.06))'; };
      item.onmouseout = function(){ this.style.background = 'transparent'; };
      item.onclick = function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var content = String(sg.content || sg.text || sg.body || '').trim();
        var prefix = '';
        if (sg.topic || sg.title) prefix += '〔' + (sg.topic || sg.title) + '〕';
        if (sg.from) prefix += '（' + sg.from + '言）';
        var block = (prefix ? prefix + '\n' : '') + content;
        var write = appendFormalEdictDraft(cat.id, block, adoptRoot);
        if (write.ok) {
          if (typeof window.toast === 'function') window.toast('已纳入' + cat.label + (prefix ? '（含问题背景）' : ''));
          if (!write.live) setTimeout(openZhaoPreviewPanel, 0);
        } else if (typeof window.toast === 'function') {
          window.toast('建议为空，未纳入');
        }
        menu.remove();
      };
      menu.appendChild(item);
    });
    document.body.appendChild(menu);
    setTimeout(function(){
      function close(e){
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', close);
        }
      }
      document.addEventListener('click', close);
    }, 0);
  }

  function renderFormalEdictPanel(){
    restoreFormalDraftsFromGM(false);
    var gm = window.GM || {};
    var role = '天子';
    var sc = (typeof window.findScenarioById === 'function') ? window.findScenarioById(gm.sid) : null;
    if (sc && sc.role) role = sc.role;
    var icon = typeof window.tmIcon === 'function' ? window.tmIcon : function(){ return ''; };
    var cats = [
      {id:'edict-pol', keys:['policy','political'], label:'政 令', badge:'政', cls:'ed-c-pol', hint:'改革官制·任免官员·降旨安抚',  placeholder:'诏谕天下，如：改革官制、降旨安抚、任免官员……'},
      {id:'edict-mil', keys:['military'], label:'军 令', badge:'军', cls:'ed-c-mil', hint:'调兵遣将·加强边防·讨伐叛贼',  placeholder:'调兵遣将，如：调动军队、加强边防、讨伐叛贼……'},
      {id:'edict-dip', keys:['diplomatic','diplomacy'], label:'外 交', badge:'外', cls:'ed-c-dip', hint:'遣使和亲·结盟讨伐·册封藩属',  placeholder:'纵横捭阖，如：遣使和亲、结盟讨伐、册封藩属……'},
      {id:'edict-eco', keys:['finance','economic','economy'], label:'经 济', badge:'经', cls:'ed-c-eco', hint:'减税轻赋·开仓放粮·兴修水利',  placeholder:'经纶民生，如：减税轻赋、开仓放粮、兴修水利……'},
      {id:'edict-oth', keys:['other','private'], label:'其 他', badge:'他', cls:'ed-c-oth', hint:'大赦·科举·建造·礼仪', placeholder:'其他旨意，如：大赦天下、科举取士、建造宫殿……'}
    ];
    var suggestions = getEdictSuggestionRows();
    var html = '<section class="edict-old-panel">';
    html += '<aside class="edict-old-sug"><h3 class="edict-old-sug-title">议事清册 <small>' + esc(suggestions.length) + ' 条</small></h3><div class="edict-old-sug-list">';
    html += suggestions.map(renderEdictSuggestionItem).join('') || '<article class="edict-sug-v2"><div><b>暂无御案建议</b><p>召开朝议、问对或处理奏疏后，可摘入诏书草拟。</p></div></article>';
    html += '</div></aside>';
    html += '<main class="edict-old-main">';
    html += '<div class="ed-yubi-title">';
    html += '<div class="seal">' + esc(role) + '</div>';
    html += '<div class="main">' + esc(role) + ' 御 笔</div>';
    html += '<div class="sub">奉天承运皇帝　　诏曰</div>';
    html += '</div>';
    html += '<div class="ed-cards">';
    cats.forEach(function(cat){
      html += '<div class="ed-card ' + cat.cls + '">';
      html += '<div class="ed-card-hdr">';
      html += '<span class="ed-cat-icon">' + esc(cat.badge) + '</span>';
      html += '<span class="ed-cat-label">' + esc(cat.label) + '</span>';
      html += '<span class="ed-cat-hint">' + esc(cat.hint) + '</span>';
      html += '</div>';
      html += '<textarea id="' + attr(cat.id) + '" rows="2" class="edict-input paper-texture" data-desk-edict-cat="' + attr(cat.keys[0]) + '" data-label="' + attr(cat.label) + '" placeholder="' + attr(cat.placeholder) + '" oninput="var s=window.TM_PHASE8_FORMAL||(window.TM_PHASE8_FORMAL={});var d=s.edictDrafts||(s.edictDrafts={});d[&quot;' + attr(cat.keys[0]) + '&quot;]=this.value;if(window._edictLiveForecast)window._edictLiveForecast(&quot;' + attr(cat.id) + '&quot;)">' + esc(legacyEdictDraftValue(cat.id, cat.keys)) + '</textarea>';
      html += '<div id="' + attr(cat.id) + '-forecast" class="ed-forecast" style="display:none;"></div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div class="ed-polish-bar">';
    html += '<span class="ed-polish-label">文 风 选 择</span>';
    html += '<select id="edict-polish-style" style="font-size:12px;padding:6px 12px;background:var(--color-elevated);border:1px solid var(--color-border-subtle);color:var(--color-foreground);border-radius:2px;font-family:var(--font-serif);cursor:pointer;">';
    html += '<option value="elegant">典雅骈文</option>';
    html += '<option value="concise">简洁明快</option>';
    html += '<option value="ornate">华丽文藻</option>';
    html += '<option value="plain">白话文言</option>';
    html += '</select>';
    html += '<button class="ed-polish-btn" onclick="if(window._polishEdicts)window._polishEdicts();else if(window.toast)toast(\'诏书润色模块尚未载入\')">有 司 润 色</button>';
    html += '</div>';
    html += '<div id="edict-polished" style="display:none;margin-top:var(--space-3);"></div>';
    html += '<div class="ed-section-divider"><span class="label">主 角 行 止</span></div>';
    html += '<div class="ed-xinglu-card">';
    html += '<div class="ed-xinglu-hdr"><span class="title">本 回 合 行 动</span><span class="desc">——你这段时间做了什么</span></div>';
    html += '<textarea id="xinglu-pub" rows="4" class="edict-input paper-texture" data-desk-player-action="1" placeholder="如：召见某臣、校阅三军、微服私访、夜读史书、祖庙祭祀、宴请群臣……" oninput="(window.TM_PHASE8_FORMAL||(window.TM_PHASE8_FORMAL={})).playerAction=this.value">' + esc(deskValue('#xinglu-pub', state.playerAction || '')) + '</textarea>';
    var recentXinglu = firstArray(gm.qijuHistory).filter(function(q){ return q && q.xinglu && Number(q.turn || 0) < Number(gm.turn || 1); }).slice(-5).reverse();
    if (recentXinglu.length) {
      html += '<details class="ed-xinglu-hist"><summary>近期行止记录 <span style="color:var(--ink-300);margin-left:6px;font-size:10px;">' + esc(recentXinglu.length) + ' 条</span></summary>';
      html += '<div style="margin-top:10px;max-height:200px;overflow-y:auto;">';
      recentXinglu.forEach(function(q){
        html += '<div class="ed-xinglu-hist-item"><span class="turn">T' + esc(q.turn) + '</span>' + esc(q.xinglu) + '</div>';
      });
      html += '</div></details>';
    }
    html += '</div>';
    html += '<div class="ed-tyrant-block">';
    html += '<div class="ed-tyrant-toggle" onclick="var p=document.getElementById(&quot;tyrant-panel&quot;);if(p){p.style.display=p.style.display===&quot;none&quot;?&quot;block&quot;:&quot;none&quot;;this.classList.toggle(&quot;open&quot;);if(p.style.display!==&quot;none&quot;&amp;&amp;window.TyrantActivitySystem)TyrantActivitySystem.renderPanel();}">';
    html += '帝 王 私 行';
    html += '<span class="sub">—— 点击展开（后妃·游猎·丹药·密访）</span>';
    html += '</div>';
    html += '<div id="tyrant-panel" style="display:none;max-height:300px;overflow-y:auto;padding:var(--space-2);margin-top:var(--space-2);"></div>';
    html += '</div>';
    if (gm._edictTracker && gm._edictTracker.length > 0) {
      var allEdicts = gm._edictTracker.filter(function(e){ return e && Number(e.turn || 0) < Number(gm.turn || 1); });
      if (allEdicts.length > 0) {
        var byTurn = {};
        allEdicts.forEach(function(e){ (byTurn[e.turn] || (byTurn[e.turn] = [])).push(e); });
        var turns = Object.keys(byTurn).sort(function(a, b){ return Number(b) - Number(a); });
        html += '<details class="ed-archive"><summary>往 期 诏 令 档 案 · ' + esc(allEdicts.length) + ' 条</summary>';
        html += '<div style="margin-top:var(--space-2);max-height:400px;overflow-y:auto;">';
        turns.forEach(function(turn){
          var turnText = typeof window.getTSText === 'function' ? window.getTSText(parseInt(turn, 10)) : 'T' + turn;
          html += '<div class="ed-archive-group"><div class="ed-archive-group-title">第' + esc(turn) + '回合 · ' + esc(turnText) + '</div>';
          byTurn[turn].forEach(function(e){
            var color = e.status === 'completed' ? 'var(--celadon-400)' : e.status === 'obstructed' ? 'var(--vermillion-400)' : e.status === 'partial' ? '#e67e22' : e.status === 'pending_delivery' ? 'var(--amber-400)' : 'var(--ink-300)';
            var mark = { completed:'✅', obstructed:'❌', partial:'⚠️', executing:'⏳', pending:'⭕', pending_delivery:'📨' }[e.status] || '';
            html += '<div style="font-size:var(--text-xs);padding:2px 0;border-bottom:1px solid var(--color-border-subtle);">';
            html += '<span style="color:' + color + ';">' + mark + '</span> ';
            html += '<span style="color:var(--color-foreground-muted);">' + esc(e.category || '') + '</span> ';
            html += esc(e.content || '');
            if (e.assignee) html += ' <span style="color:var(--ink-300);">[执行:' + esc(e.assignee) + ']</span>';
            if (e.feedback) html += '<div style="color:var(--color-foreground-secondary);padding-left:1rem;">' + esc(e.feedback) + '</div>';
            html += '</div>';
          });
          html += '</div>';
        });
        html += '</div></details>';
      }
    }
    html += '<div class="ed-action-bar">';
    html += '<button class="bt bp" id="btn-end" onclick="if(window.confirmEndTurn)window.confirmEndTurn()" style="padding:var(--space-3) var(--space-8);font-size:var(--text-md);letter-spacing:0.15em;border:2px solid var(--gold-400);box-shadow:0 2px 12px rgba(184,154,83,0.2);">' + icon('end-turn',16) + ' 诏付有司</button>';
    html += '<button class="bt" title="地形图·山川城池分布（决策辅助）·与【军事·地图总览】数据源不同" onclick="if(window.TM&amp;&amp;TM.Map&amp;&amp;TM.Map.open)TM.Map.open(&quot;terrain&quot;)" style="padding:var(--space-3) var(--space-6);font-size:var(--text-md);">' + icon('map',16) + ' 查看地图</button>';
    html += '</div>';
    html += '</main></section>';
    return html;
  }

  function memorialGroupKey(m){
    var s = String((m && m.status) || '').toLowerCase();
    if (/done|approved|rejected|annotated|referred|court_debate|已批|已决|准|驳|批示|转|廷议/.test(s)) return 'done';
    if (/pending_review|hold|held|留中/.test(s)) return 'held';
    return /急|urgent|high/.test(String((m && ((m.priority || '') + (m.status || '') + (m.title || '') + (m.text || ''))) || '')) ? 'urgent' : 'pending';
  }

  function memorialMatchesFormal(filter, m){
    if (!filter || filter === 'all') return true;
    return memorialGroupKey(m) === filter;
  }

  function renderMemorialCardV4(m){
    var key = memorialGroupKey(m);
    var cls = key === 'done' ? 'done' : key === 'held' ? 'held' : '';
    var meta = [m.from || m.sender, m.dept || m.office || m.type, m.status || '待批'].filter(Boolean).join(' · ');
    var body = m.text || m.content || m.body || m.summary || '暂无正文。';
    var reply = m.reply || '着有关衙门速核，限期具奏。';
    var mid = 'mem-formal-' + (m.rawIndex != null ? m.rawIndex : String(m.id || '').replace(/[^a-zA-Z0-9_-]/g, ''));
    var bodyHtml = body.length > 180
      ? '<div class="mem-body collapsed wd-selectable" id="' + attr(mid) + '-body">' + esc(body) + '</div><button type="button" class="mem-toggle" onclick="var b=document.getElementById(&quot;' + attr(mid) + '-body&quot;);if(b){var col=b.classList.toggle(&quot;collapsed&quot;);this.textContent=col?&quot;▼ 展开全文&quot;:&quot;▲ 收起&quot;;}">▼ 展开全文</button>'
      : '<div class="mem-body wd-selectable">' + esc(body) + '</div>';
    var replyId = mid + '-reply';
    state.memorialReplies = state.memorialReplies || {};
    if (Object.prototype.hasOwnProperty.call(state.memorialReplies, replyId)) reply = state.memorialReplies[replyId];
    var btnData = function(decision){ return { id:m.id || '', decision:decision, replyid:replyId }; };
    return '<article class="memorial-card-v4 ' + cls + '">' +
      '<div class="memorial-card-head-v4"><span class="memorial-avatar-v4">' + esc((m.from || m.sender || '奏').slice(0, 1)) + '</span><span><b>' + esc(m.title || m.topic || '奏疏') + '</b><span>' + esc(meta) + '</span></span><span class="tm-chip-row">' + actionChip(key === 'urgent' ? '急奏' : key === 'done' ? '已批' : key === 'held' ? '留中' : '待批', key === 'urgent' ? 'hot' : key === 'done' ? 'green' : '') + '</span></div>' +
      '<div class="memorial-body-v4">' + bodyHtml + '</div>' +
      '<div class="memorial-reply-v4"><textarea id="' + attr(replyId) + '" class="tm-textarea" data-desk-memorial-reply placeholder="朱批意见">' + esc(reply) + '</textarea><div class="memorial-actions-v4">' + actionBtn('准奏', 'memorial-decision-desk', btnData('approved'), 'tm-mini-btn green') + actionBtn('驳回', 'memorial-decision-desk', btnData('rejected'), 'tm-mini-btn hot') + actionBtn('批示', 'memorial-decision-desk', btnData('annotated'), 'tm-mini-btn') + actionBtn('转有司', 'memorial-decision-desk', btnData('referred'), 'tm-mini-btn') + actionBtn('发廷议', 'memorial-decision-desk', btnData('court_debate'), 'tm-mini-btn') + (key === 'held' ? '' : actionBtn('留中', 'memorial-decision-desk', btnData('hold'), 'tm-mini-btn')) + actionBtn('摘入', 'memorial-edict-desk', { id:m.id || '' }, 'tm-mini-btn') + actionBtn('传召问询', 'memorial-summon-desk', { id:m.id || '' }, 'tm-mini-btn') + '</div></div>' +
      '</article>';
  }

  function renderFormalMemorialTransit(){
    var gm = window.GM || {};
    var pending = Array.isArray(gm._pendingMemorialDeliveries) ? gm._pendingMemorialDeliveries.filter(function(m){ return !m || m.status === 'in_transit'; }) : [];
    var rows = firstArray(pending, gm.memorialTransit, gm._memorialTransit, gm.zoushuTransit).slice(0, 4);
    if (!rows.length) return '';
    return rows.map(function(t){
      return '<div class="memorial-side-note"><b>' + esc([t.from || t.sender || '地方', t.office || t.dept || '衙门'].filter(Boolean).join(' · ')) + '</b><p>' + esc([t.type || '奏疏', t.eta || t.due || '在途'].filter(Boolean).join(' / ')) + '<br>' + esc(compactText(t.body || t.text || t.content || '', 72)) + '</p></div>';
    }).join('');
  }

  function renderFormalMemorialPanel(){
    restoreFormalDraftsFromGM(false);
    var mems = getMemorials();
    var filter = state.memorialFilter || 'all';
    if (filter === 'review') filter = 'all';
    var filters = [
      ['all','全部奏疏','旧奏疏总览'],
      ['urgent','急奏待批','红签优先'],
      ['pending','百官启奏','常规待批'],
      ['held','留中之折','御前暂存'],
      ['done','已批档案','朱批归档']
    ];
    var side = filters.map(function(f){
      var count = mems.filter(function(m){ return memorialMatchesFormal(f[0], m); }).length;
      return '<button type="button" class="' + (filter === f[0] ? 'active' : '') + '" data-desk-action="memorial-filter-desk" data-filter="' + attr(f[0]) + '"><i>奏</i><span><b>' + esc(f[1]) + '</b><span>' + esc(f[2]) + '</span></span>' + actionChip(String(count), count ? 'green' : '') + '</button>';
    }).join('');
    var visible = mems.filter(function(m){ return memorialMatchesFormal(filter, m); });
    var groupMeta = [
      ['urgent','急奏待批','红签急奏，优先于常规折件。'],
      ['pending','百官启奏','可准奏、驳回、批示、转交有司或发朝议。'],
      ['held','留中之折','暂不下发，保留御前判断与后续回合。'],
      ['done','已批档案','已形成朱批，可追踪回函与承办。']
    ];
    var groups = groupMeta.map(function(g){
      var key = g[0];
      var rows = visible.filter(function(m){ return memorialGroupKey(m) === key; });
      if (!rows.length) return '';
      return '<section class="memorial-group-v4"><h3 class="memorial-group-title-v4"><span>' + esc(g[1]) + '</span><small>' + esc(rows.length) + ' 件 · ' + esc(g[2]) + '</small></h3>' + rows.map(renderMemorialCardV4).join('') + '</section>';
    }).join('');
    var transit = renderFormalMemorialTransit();
    return '<section class="memorial-office-v4">' +
      '<aside class="memorial-cases-v4"><div class="tm-panel-v4-title"><span class="seal">奏</span><span><b>朱批案牍</b><span>急奏 / 留中 / 已批</span></span></div><div class="memorial-filter-v4">' + side + '</div>' + (transit ? '<h3 class="tm-roster-group" style="margin-top:12px">在途奏疏</h3>' + transit : '') + '</aside>' +
      '<main class="memorial-paper-v4"><header class="memorial-paper-head-v4"><span><h2>奏 疏 待 览</h2><p>案牍之司　　百官启奏</p></span><span class="tm-chip-row">' + actionChip('本回 ' + mems.filter(function(m){ return memorialGroupKey(m) !== 'done'; }).length + ' 件', 'green') + actionChip('急 ' + mems.filter(function(m){ return memorialGroupKey(m) === 'urgent'; }).length, 'hot') + '</span></header>' +
        (groups || '<div class="mem-empty">案牍清净　百官无事启奏</div>') +
      '</main></section>';
  }

  function normalizeLetterPeople(){
    var selfName = (window.P && P.playerInfo && P.playerInfo.characterName) || '';
    var people = getPeople().filter(function(p){
      if (!p) return false;
      if (p.alive === false) return false;
      if (p.isPlayer) return false;
      if (selfName && p.name === selfName) return false;
      return true;
    }).slice(0, 96);
    if (!people.length) people = [{ name:'臣工', office:'御前候命', faction:'京师' }];
    return people.map(function(p, i){
      var name = p.name || personKey(p) || ('人物' + (i + 1));
      return {
        id: name,
        name: name,
        role: p.officialTitle || p.office || p.title || p.role || p.faction || '臣工',
        region: letterRegionOf(p),
        location: p.location || p.region || p.faction || '京师',
        face: name.slice(0, 1),
        portrait: (typeof tmfRenwuPortrait === 'function') ? tmfRenwuPortrait(p) : '',
        faction: p.faction || p.group || '',
        raw: p
      };
    });
  }

  function letterRegionOf(p){
    var loc = String((p && (p.location || p.region)) || '');
    var title = String((p && (p.officialTitle || p.title || p.role || p.office)) || '');
    var capital = (window.GM && GM._capital) || '京城';
    if (/皇后|皇贵妃|贵妃|妃|嫔|夫人|公主|太后|太妃|内廷|司礼|东厂/.test(title + loc)) return '内廷';
    try { if (typeof window._isSameLocation === 'function' && window._isSameLocation(loc, capital)) return '在京'; } catch(_) {}
    if (/京城|京师|顺天|紫禁城|北京/.test(loc)) return '在京';
    if (/辽|宁远|锦|蓟|山海关|皮岛|沈阳|盛京/.test(loc)) return '辽东·北境';
    if (/大同|宣府|太原|山西|归化/.test(loc)) return '宣大·山西';
    if (/陕|西安|延|甘|宁夏|兰州|榆林|固原|米脂|安塞|府谷/.test(loc)) return '西陲·边镇';
    if (/四川|重庆|云|贵|蜀|巴|石柱|成都/.test(loc)) return '西南·巴蜀';
    if (/福建|广东|广西|厦门|台湾|琼|朝鲜|日本|海/.test(loc)) return '南方·海疆';
    if (/江|杭|南京|苏|湖广|浙|南直|安庆/.test(loc)) return '江南·江浙';
    if (/河南|山东|河北|北直|鲁|豫|保定|大名|商丘/.test(loc)) return '中原·鲁豫';
    return loc || '其他';
  }

  function letterStateClassFormal(stateText){
    if (/拦截|截获|失约|阻断|可疑/.test(stateText || '')) return 'lost intercepted';
    if (/在途|追回|核验|traveling|sent/i.test(stateText || '')) return 'transit';
    return '';
  }

  function letterTypeLabelFormal(type){
    var map = {
      personal: '私函',
      greeting: '问安函',
      report: '来报',
      secret_decree: '密旨',
      military_order: '征调令',
      formal_edict: '正式诏令',
      proclamation: '檄文',
      diplomatic: '外交书',
      diplomatic_dispatch: '外交书'
    };
    return map[type] || (type || '书信');
  }

  function letterUrgencyLabelFormal(v){
    return ({ normal:'普通驿递', urgent:'加急驿递', extreme:'八百里加急' })[v] || (v || '驿递');
  }

  function letterCipherLabelFormal(v){
    return ({ none:'不加密', yinfu:'阴符', yinshu:'阴书', wax_ball:'蜡丸密函', silk_sewn:'帛书缝衣' })[v] || (v || '不加密');
  }

  function letterSendModeLabelFormal(v){
    return ({ normal:'普通信使', multi_courier:'多路信使', secret_agent:'密使' })[v] || (v || '普通信使');
  }

  function letterStatusTextFormal(l){
    var s = String((l && l.status) || '');
    if (s === 'draft') return '草稿';
    if (s === 'traveling') return '信使在途';
    if (s === 'delivered') return '已送达';
    if (s === 'replying') return '回函在途';
    if (s === 'returned') return '已有回函';
    if (s === 'intercepted') return '信使失踪';
    if (s === 'intercepted_forging') return '回函在途';
    if (s === 'blocked') return '流转受阻';
    if (s === 'recalled') return '已追回';
    return s || '未阅';
  }

  function letterFilterMatchFormal(filter, l){
    var s = String((l && l.status) || '').toLowerCase();
    if (filter === 'unread') return !l.playerRead && !l.toPlayer && l.from !== '玩家';
    if (filter === 'road') return /traveling|replying|sent|delivered|intercepted_forging/.test(s);
    if (filter === 'lost') return /intercepted|blocked|lost/.test(s);
    if (filter === 'star') return !!l.starred;
    return true;
  }

  function letterTimeFormal(l){
    try { if (typeof window.getTSText === 'function') return window.getTSText(l.sentTurn || 1); } catch(_) {}
    return '第' + (l.sentTurn || 1) + '回合';
  }

  function letterPersonCounts(name, letters){
    var rows = letters.filter(function(l){ return String(l.from) === String(name) || String(l.to) === String(name); });
    var unread = rows.filter(function(l){ return l.from !== '玩家' && !l.playerRead; }).length;
    var road = rows.filter(function(l){ return /traveling|replying|delivered|intercepted_forging/.test(String(l.status || '')); }).length;
    var lost = rows.filter(function(l){ return /intercepted|blocked|lost/.test(String(l.status || '')); }).length;
    return { total: rows.length, unread: unread, road: road, lost: lost };
  }

  function formalIncomingLetters(letters){
    var rows = [];
    letters.forEach(function(l){
      if (!l) return;
      if (String(l.from) !== '玩家') {
        rows.push({
          id: l.id,
          from: l.from || '来信者',
          title: l.title || '来函',
          content: l.content || '暂无正文。',
          status: letterStatusTextFormal(l),
          time: letterTimeFormal(l),
          unread: !l.playerRead,
          reply: false,
          raw: l.raw,
          source: l
        });
      } else if (l.reply && /returned|intercepted_forging/.test(String(l.status || ''))) {
        rows.push({
          id: l.id,
          from: l.to || '回信者',
          title: '回书 · ' + (l.title || letterTypeLabelFormal(l.letterType)),
          content: l.reply,
          status: letterStatusTextFormal(l),
          time: l.replyTurn ? (function(){ try { if (typeof window.getTSText === 'function') return window.getTSText(l.replyTurn); } catch(_) {} return '第' + l.replyTurn + '回合'; })() : letterTimeFormal(l),
          unread: !l.raw || !l.raw._replyRead,
          reply: true,
          raw: l.raw,
          source: l
        });
      }
    });
    rows.sort(function(a, b){
      var at = (a.source && (a.source.replyTurn || a.source.sentTurn)) || 0;
      var bt = (b.source && (b.source.replyTurn || b.source.sentTurn)) || 0;
      if (bt !== at) return bt - at;
      return String(a.from).localeCompare(String(b.from));
    });
    return rows;
  }

  function renderFormalInboxItem(item){
    var actions = '';
    actions += actionBtn('展阅', 'letter-target-desk', { name:item.from || '' }, 'tm-mini-btn');
    actions += actionBtn('回书', 'letter-thread-action-desk', { id:item.id || '', letterAction:'reply' }, 'tm-mini-btn green');
    actions += actionBtn('摘入', 'letter-thread-action-desk', { id:item.id || '', letterAction:'excerpt' }, 'tm-mini-btn');
    return '<article class="hy-inbox-item-v5 ' + (item.unread ? 'unread' : '') + '">' +
      '<button type="button" class="hy-inbox-open-v5" data-desk-action="letter-target-desk" data-name="' + attr(item.from || '') + '">' +
        '<span class="hy-inbox-seal-v5">' + esc((item.from || '函').slice(0, 1)) + '</span>' +
        '<span><b>' + esc(item.from || '来信者') + '</b><em>' + fullHongyanText(item.title || '来函', '来函', 'hy-inbox-title-full-v5') + '</em></span>' +
        (item.unread ? '<i>未阅</i>' : '<i>' + esc(item.reply ? '回书' : item.status || '来函') + '</i>') +
      '</button>' +
      '<div class="hy-inbox-meta-v5"><span>' + esc(item.time || '') + '</span><span>' + esc(item.status || '') + '</span></div>' +
      '<div class="hy-inbox-body-v5 wd-selectable">' + fullHongyanText(item.content || '暂无正文。', '暂无正文。', 'hy-inbox-body-full-v5') + '</div>' +
      '<div class="hy-actions-v5">' + actions + '</div>' +
      '</article>';
  }

  function renderFormalLetterCard(l, targetName){
    var outgoing = String(l.from) === '玩家' || String(l.to) === String(targetName);
    if (!outgoing && l.raw && !l.raw._playerRead) l.raw._playerRead = true;
    var statusText = letterStatusTextFormal(l);
    var cls = outgoing ? 'out' : 'in';
    cls += ' ' + letterStateClassFormal(statusText + ' ' + l.status);
    var meta = [
      letterTypeLabelFormal(l.letterType),
      letterUrgencyLabelFormal(l.urgency),
      l.cipher && l.cipher !== 'none' ? letterCipherLabelFormal(l.cipher) : '',
      l.sendMode ? letterSendModeLabelFormal(l.sendMode) : '',
      letterTimeFormal(l)
    ].filter(Boolean);
    var actions = '';
    if (outgoing && l.raw && l.raw.status === 'traveling') actions += actionBtn('追回', 'letter-thread-action-desk', { id:l.id || '', letterAction:'recall' }, 'tm-mini-btn');
    if (outgoing && l.raw && /intercepted|blocked/.test(String(l.raw.status || ''))) {
      actions += actionBtn('重发·密使', 'letter-thread-action-desk', { id:l.id || '', letterAction:'resend-secret' }, 'tm-mini-btn');
      actions += actionBtn('重发·加急', 'letter-thread-action-desk', { id:l.id || '', letterAction:'resend-fast' }, 'tm-mini-btn hot');
    }
    if (!outgoing && l.raw && l.raw._npcInitiated) actions += actionBtn('回书', 'letter-thread-action-desk', { id:l.id || '', letterAction:'reply' }, 'tm-mini-btn green');
    actions += actionBtn('遣使核实', 'letter-thread-action-desk', { id:l.id || '', letterAction:'verify' }, 'tm-mini-btn');
    actions += actionBtn('摘入', 'letter-thread-action-desk', { id:l.id || '', letterAction:'excerpt' }, 'tm-mini-btn');
    actions += actionBtn(l.starred ? '★' : '☆', 'letter-thread-action-desk', { id:l.id || '', letterAction:'star' }, 'tm-mini-btn');
    return '<article class="hy-letter-card-v5 ' + cls + '">' +
      '<div class="hy-letter-stamp-v5">' + esc((letterTypeLabelFormal(l.letterType) || '书').slice(0, 1)) + '</div>' +
      '<div class="hy-letter-main-v5"><header><b>' + esc(outgoing ? '御前发出' : '来函上达') + '</b><span>' + esc([l.from, l.to].filter(Boolean).join(' → ')) + '</span><em>' + esc(statusText) + '</em></header>' +
      '<div class="hy-letter-meta-v5">' + meta.map(function(x){ return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<div class="hy-letter-body-v5 wd-selectable">' + fullHongyanText(l.content || '暂无正文。', '暂无正文。', 'hy-letter-body-full-v5') + '</div>' +
      (l.reply ? '<div class="hy-letter-reply-v5"><b>回书</b><p>' + fullHongyanText(l.reply, '暂无回书。', 'hy-letter-reply-full-v5') + '</p></div>' : '') +
      '<div class="hy-actions-v5">' + actions + '</div></div>' +
      '</article>';
  }

  function renderFormalLetterPanel(){
    restoreFormalDraftsFromGM(false);
    var letters = getLetters();
    var people = normalizeLetterPeople();
    var filter = state.letterFilter || 'all';
    var query = String(state.letterSearch || '').trim().toLowerCase();
    var targetName = (window.GM && GM._pendingLetterTo) || state.letterTarget || (people[0] && people[0].name) || '臣工';
    var target = people.find(function(p){ return String(p.name) === String(targetName) || String(p.id) === String(targetName); }) || people[0];
    state.letterTarget = target.name;
    var visiblePeople = people;
    var grouped = {};
    visiblePeople.forEach(function(p){ (grouped[p.region] || (grouped[p.region] = [])).push(p); });
    var regionOrder = ['内廷','在京','辽东·北境','宣大·山西','西陲·边镇','中原·鲁豫','江南·江浙','西南·巴蜀','南方·海疆','其他'];
    Object.keys(grouped).forEach(function(k){ if (regionOrder.indexOf(k) < 0) regionOrder.push(k); });
    var roster = regionOrder.map(function(region){
      if (!grouped[region] || !grouped[region].length) return '';
      return '<div class="hy-region-group-v5"><h4 class="hy-region-v4">' + esc(region) + '</h4>' + grouped[region].map(function(p){
        var active = String(p.name) === String(target.name);
        var counts = letterPersonCounts(p.name, letters);
        return '<button type="button" class="hy-person-v5 ' + (active ? 'active' : '') + '" data-desk-action="letter-target-desk" data-name="' + attr(p.name) + '" data-letter-search-text="' + attr([p.name, p.role, p.region, p.location, p.faction].join(' ')) + '"><img class="hy-face-v5" src="' + attr(p.portrait) + '" alt=""><span class="hy-person-main-v5"><b>' + esc(p.name) + '</b><span data-hy-contact-role="1">' + esc(p.role) + '</span><i data-hy-contact-location="1">' + esc(p.location) + '</i></span><span class="hy-person-counts-v5">' + (counts.unread ? '<em class="hot">' + esc(counts.unread) + '</em>' : '') + (counts.road ? '<em>' + esc(counts.road) + '</em>' : '') + (active ? '<em class="on">今</em>' : '') + '</span></button>';
      }).join('') + '</div>';
    }).join('') + '<div class="tm-desk-empty hy-search-empty-v5" style="display:none">没有匹配的通信对象。</div>';
    var targetLetters = letters.filter(function(l){ return String(l.from) === String(target.name) || String(l.to) === String(target.name); });
    targetLetters = targetLetters.filter(function(l){ return letterFilterMatchFormal(filter, l); });
    targetLetters.sort(function(a, b){ return (a.sentTurn || 0) - (b.sentTurn || 0); });
    var filterBtns = [['all','全部'],['unread','未读'],['road','在途'],['lost','失约/截获'],['star','星标']].map(function(f){
      return '<button type="button" class="' + (filter === f[0] ? 'active' : '') + '" data-desk-action="letter-filter-desk" data-filter="' + attr(f[0]) + '">' + esc(f[1]) + '</button>';
    }).join('');
    var gm = window.GM || {};
    var routeRows = firstArray(gm._routeDisruptions, gm.routeAlerts, gm._routeAlerts, gm.letterRouteAlerts).filter(function(r){ return !r || !r.resolved; });
    var route = routeRows.length ? routeRows.map(function(r){ return [r.route || r.region || r.to || r.place, r.reason || r.level || r.status || r.desc || r.text].filter(Boolean).join('：'); }).join('　') : '驿路平稳，暂无阻断。';
    var thread = targetLetters.length ? targetLetters.map(function(l){ return renderFormalLetterCard(l, target.name); }).join('') : '<article class="hy-letter-empty-v5"><b>尚无往来书信</b><p>选中人物后可直接拟函。信件送达、截获、逾期、回函仍写入旧鸿雁系统的 GM.letters，并随回合结算。</p></article>';
    var draft = state.letterDraft || {};
    var type = draft.type || 'personal';
    var urgency = draft.urgency || 'normal';
    var cipher = draft.cipher || 'none';
    var sendMode = draft.sendMode || 'multi_courier';
    var body = draft.body || '';
    var selectedCounts = letterPersonCounts(target.name, letters);
    var inboxRows = formalIncomingLetters(letters);
    var unreadInbox = inboxRows.filter(function(x){ return x.unread; }).length;
    var inbox = inboxRows.length ? inboxRows.slice(0, 20).map(renderFormalInboxItem).join('') : '<article class="hy-letter-empty-v5"><b>暂无来信</b><p>NPC 主动来函与已返回的回书会集中显示在这里。</p></article>';
    return '<section class="hy-office-v5">' +
      '<aside class="hy-contact-pane-v5"><div class="tm-panel-v4-title"><span class="seal">雁</span><span><b>鸿雁传书</b><span>人物 / 搜索 / 未读 / 在途</span></span></div><div class="hy-search-v5"><input class="tm-input" data-desk-letter-search value="' + attr(state.letterSearch || '') + '" placeholder="检索姓名、官职、党派、地点"></div><div class="hy-roster-scroll-v5">' + roster + '</div></aside>' +
      '<main class="hy-letter-desk-v5"><section class="hy-compose-card-v5"><header><img src="' + attr(target.portrait) + '" alt=""><span><b>致 ' + esc(target.name) + '</b><em>' + esc(target.role) + ' / ' + esc(target.location) + '</em></span><span class="tm-chip-row">' + actionChip('往来 ' + selectedCounts.total, 'green') + (selectedCounts.unread ? actionChip('未读 ' + selectedCounts.unread, 'hot') : '') + (selectedCounts.road ? actionChip('在途 ' + selectedCounts.road) : '') + '</span></header><div class="hy-route-v5">' + fullHongyanText(route, '驿路平稳，暂无阻断。', 'hy-route-full-v5') + '</div><div class="hy-compose-grid-v5"><label><span>收信人</span><input class="tm-input" data-desk-letter-to data-letter-draft-field="to" value="' + attr(target.name) + '"></label><label><span>书信类型</span><select class="tm-select" data-desk-letter-type data-letter-draft-field="type"><option value="secret_decree"' + (type === 'secret_decree' ? ' selected' : '') + '>密旨</option><option value="military_order"' + (type === 'military_order' ? ' selected' : '') + '>征调令</option><option value="greeting"' + (type === 'greeting' ? ' selected' : '') + '>问安函</option><option value="personal"' + (type === 'personal' ? ' selected' : '') + '>私函</option><option value="formal_edict"' + (type === 'formal_edict' ? ' selected' : '') + '>正式诏令</option><option value="proclamation"' + (type === 'proclamation' ? ' selected' : '') + '>檄文</option></select></label><label><span>驿递缓急</span><select class="tm-select" data-desk-letter-urgency data-letter-draft-field="urgency"><option value="normal"' + (urgency === 'normal' ? ' selected' : '') + '>普通驿递</option><option value="urgent"' + (urgency === 'urgent' ? ' selected' : '') + '>加急驿递</option><option value="extreme"' + (urgency === 'extreme' ? ' selected' : '') + '>八百里加急</option></select></label><label><span>加密方式</span><select class="tm-select" data-desk-letter-cipher data-letter-draft-field="cipher"><option value="none"' + (cipher === 'none' ? ' selected' : '') + '>不加密</option><option value="yinfu"' + (cipher === 'yinfu' ? ' selected' : '') + '>阴符</option><option value="yinshu"' + (cipher === 'yinshu' ? ' selected' : '') + '>阴书</option><option value="wax_ball"' + (cipher === 'wax_ball' ? ' selected' : '') + '>蜡丸密函</option><option value="silk_sewn"' + (cipher === 'silk_sewn' ? ' selected' : '') + '>帛书缝衣</option></select></label><label><span>信使方式</span><select class="tm-select" data-desk-letter-sendmode data-letter-draft-field="sendMode"><option value="normal"' + (sendMode === 'normal' ? ' selected' : '') + '>普通信使</option><option value="multi_courier"' + (sendMode === 'multi_courier' ? ' selected' : '') + '>多路信使</option><option value="secret_agent"' + (sendMode === 'secret_agent' ? ' selected' : '') + '>密使</option></select></label></div><textarea class="tm-textarea hy-compose-paper-v5" data-desk-letter-body data-letter-draft-field="body" placeholder="致书' + attr(target.name) + '……">' + esc(body) + '</textarea><div class="hy-compose-actions-v5">' + actionBtn('遣使送出', 'letter-send-desk', {}, 'tm-action-primary') + actionBtn('存为草稿', 'letter-draft-desk', {}, 'tm-action-ghost') + actionBtn('入人物记忆', 'letter-memory-desk', {}, 'tm-action-ghost') + '</div></section>' +
      '<section class="hy-thread-card-v5"><header><span><b>往来信札</b><em>' + esc(target.name) + ' · ' + esc(filter === 'all' ? '全部' : filter) + '</em></span><div class="hy-filterbar-v5">' + filterBtns + '</div></header><div class="hy-thread-scroll-v5">' + thread + '</div></section></main>' +
      '<aside class="hy-inbox-pane-v5"><div class="tm-panel-v4-title"><span class="seal">函</span><span><b>来信</b><span>主动来函 / 回书 / 未阅</span></span></div><div class="hy-inbox-summary-v5"><span>总来信 <b>' + esc(inboxRows.length) + '</b></span><span>未阅 <b>' + esc(unreadInbox) + '</b></span></div><div class="hy-inbox-scroll-v5">' + inbox + '</div></aside>' +
      '</section>';
  }

  function openZhaoPreviewPanel(){
    removeFormalEdictHiddenInputs();
    openDeskOverlay('tm-action-edict-overlay', actionShell('edict', renderFormalEdictPanel()));
    setTimeout(function(){
      if (typeof window._edictLiveForecast === 'function') {
        ['edict-pol','edict-mil','edict-dip','edict-eco','edict-oth'].forEach(function(id){
          try { window._edictLiveForecast(id); } catch(_) {}
        });
      }
    }, 0);
    return;
    var issues = getIssues().slice(0, 10);
    var draft = state.edictDraft && state.edictDraft.length ? state.edictDraft : ['奉天承运皇帝诏曰：', '诸司各以本职详议急务，毋得互相推诿。'];
    var issueItems = issues.map(function(x){
      return { id: x.id, title: x.title, meta: [x.category, x.severity, x.proposer].filter(Boolean).join(' · ') || compactText(x.text, 36) };
    });
    var left = deskTabs(['诏令','草稿','旧诏'], 0) + deskList(issueItems, '暂无可纳入诏令的御案议题。', { action:'add-edict-desk' });
    var main = '<h3 class="tm-desk-title">诏令草拟</h3>' +
      '<div class="tm-desk-field"><span>诏令类型</span><select data-desk-edict-type><option>敕令</option><option>谕旨</option><option>诰命</option><option>手诏</option><option>密旨</option></select></div>' +
      '<div class="tm-desk-field"><span>收受衙门</span><input data-desk-edict-receiver value="内阁、六部、都察院"></div>' +
      '<div class="tm-desk-field"><span>关联议题</span><input data-desk-edict-issue value="' + attr((issues[0] && issues[0].title) || '御案待裁') + '"></div>' +
      '<textarea aria-label="诏令正文" data-desk-edict-body>' + esc(draft.join('\n')) + '</textarea>' +
      '<div class="tm-desk-actions">' + deskAction('颁行诏令','publish-edict-desk',{}, true) + deskAction('交内阁票拟','save-edict-desk',{ stage:'review' }) + deskAction('存为草稿','save-edict-desk',{ stage:'draft' }) + deskAction('清空草诏','clear-edict-desk') + '</div>' +
      '<h4 class="tm-desk-subtitle">旧诏令页职能</h4>' +
      '<table class="tm-desk-table"><tr><th>项目</th><th>承接内容</th></tr><tr><td>合法性</td><td>校验皇权、诏令通过率、衙门承接能力</td></tr><tr><td>执行链</td><td>皇帝 → 内阁/司礼监 → 六部 → 地方/军镇</td></tr><tr><td>结果</td><td>写入近事、史官实录、变量影响与人物态度</td></tr></table>';
    var right = '<h4 class="tm-desk-subtitle">诏令影响预估</h4>' + deskStats([
      ['待纳议题', issues.length + ' 件'],
      ['草诏段落', draft.length + ' 条'],
      ['本回合', getTurnText(window.GM && GM.turn)],
      ['后续归档', '近事 / 实录']
    ]) + '<h4 class="tm-desk-subtitle">风险</h4>' +
      deskCard('票拟阻滞', '诏令过宽或财源不明时，内阁、户部、兵部可能推诿或要求复议。') +
      deskCard('可联动', '可从此处转入朝议、奏疏批复、史官实录与人物记忆。');
    openDeskOverlay('tm-zhao-overlay', deskPanelShell('edict', '撰写诏书', '承接旧 UI「诏令」标签页：草拟、校验、下发、留档', left, main, right));
  }

  function openYueZouPreviewPanel(){
    openDeskOverlay('tm-action-memorial-overlay', actionShell('memorial', renderFormalMemorialPanel()));
    return;
    var mems = getMemorials();
    var selected = mems.find(function(x){ return String(x.id) === String(state.memorialId || ''); }) || mems[0] || {};
    if (selected.id) state.memorialId = selected.id;
    var items = mems.map(function(x){
      return { id: x.id, title: x.title, meta: [x.from, x.dept, x.status].filter(Boolean).join(' · '), hot: String(x.id) === String(selected.id || '') };
    });
    var left = deskTabs(['待批','已批','钉选'], 0) + deskList(items, '暂无奏疏；御案议题与近事会补入此处。', { action:'select-memorial-desk' });
    var main = '<h3 class="tm-desk-title">奏疏批阅</h3>' +
      deskRows([['题名', selected.title || '暂无奏疏'], ['具奏', selected.from || '臣工'], ['衙门', selected.dept || '通政司'], ['状态', selected.status || '待批']]) +
      deskCard('奏疏正文', selected.text || '暂无正文。') +
      '<h4 class="tm-desk-subtitle">朱批</h4><textarea aria-label="朱批" data-desk-memorial-reply>着有关衙门速核，限期具册。若事涉军国钱粮，令内阁会同户部、兵部并议。</textarea>' +
      '<div class="tm-desk-actions">' + deskAction('准奏','memorial-decision-desk',{ id:selected.id || '', decision:'approved' }, true) + deskAction('驳回','memorial-decision-desk',{ id:selected.id || '', decision:'rejected' }) + deskAction('批示','memorial-decision-desk',{ id:selected.id || '', decision:'annotated' }) + deskAction('留中','memorial-decision-desk',{ id:selected.id || '', decision:'hold' }) + deskAction('转朝议','memorial-decision-desk',{ id:selected.id || '', decision:'court_debate' }) + deskAction('拟诏','memorial-edict-desk',{ id:selected.id || '' }) + '</div>';
    var right = '<h4 class="tm-desk-subtitle">旧奏疏页侧栏</h4>' + deskStats([
      ['待批', mems.length + ' 件'],
      ['急件', mems.filter(function(x){ return /急|urgent|high/i.test(String(x.status) + String(x.title)); }).length + ' 件'],
      ['可转议', getIssues().length + ' 项'],
      ['归档', '史官 / 近事']
    ]) + deskCard('筛选', '按急缓、衙门、人物、地区、变量、是否已批分类。') +
      deskCard('批复后', '写入近事、御案时政、人物记忆与史官档案。');
    openDeskOverlay('tm-zoushu-overlay', deskPanelShell('memorial', '百官奏疏', '承接旧 UI「奏疏」标签页：筛选、阅览、朱批、转议', left, main, right));
  }

  function openHongyanPreviewPanel(){
    openDeskOverlay('tm-action-letter-overlay', actionShell('letter', renderFormalLetterPanel()));
    return;
    var letters = getLetters();
    var people = getPeople().slice(0, 10);
    var target = (window.GM && GM._pendingLetterTo) || (people[0] && (people[0].name || personKey(people[0]))) || '臣工';
    var items = letters.map(function(x){
      return { id: x.id, title: x.title, meta: [x.from, '→ ' + x.to, x.status].filter(Boolean).join(' · '), text: x.text };
    });
    var left = deskTabs(['来信','发信','驿路'], 0) + deskList(items, '暂无来信。可从右侧人物图志或此处直接拟信。');
    var main = '<h3 class="tm-desk-title">鸿雁传书</h3>' +
      '<div class="tm-desk-field"><span>收信人</span><input data-desk-letter-to value="' + attr(target) + '"></div>' +
      '<div class="tm-desk-field"><span>驿路</span><select data-desk-letter-route><option>急递</option><option>常递</option><option>密递</option></select></div>' +
      '<div class="tm-desk-field"><span>语气</span><select data-desk-letter-tone><option>慰问</option><option>申饬</option><option>密询</option><option>嘉奖</option></select></div>' +
      '<textarea aria-label="书信正文" data-desk-letter-body>卿在外任，凡地方灾伤、军饷、民情，务须据实具奏，不得粉饰。</textarea>' +
      '<div class="tm-desk-actions">' + deskAction('遣使送出','letter-send-desk',{}, true) + deskAction('存为草稿','letter-draft-desk') + deskAction('转问对','module-desk',{ kind:'wendui' }) + deskAction('入人物记忆','letter-memory-desk') + '</div>' +
      '<h4 class="tm-desk-subtitle">通信记录</h4>' +
      (items.length ? items.slice(0, 2).map(function(x){ return deskCard(x.title, x.text || x.meta); }).join('') : deskCard('暂无通信', '远方人物、军镇、地方官可通过鸿雁传书建立联系。'));
    var right = '<h4 class="tm-desk-subtitle">旧鸿雁页职能</h4>' +
      deskRows([['远方臣子','不在京人物默认走传书'], ['耗时','随距离与驿路等级变化'], ['结果','改变人物态度、触发回复、写入近事']]) +
      '<h4 class="tm-desk-subtitle">可选收信人</h4>' +
      (people.length ? '<div class="tm-desk-list">' + people.map(function(p){ var nm = p.name || personKey(p); return '<button type="button" class="tm-desk-item" data-desk-action="letter-target-desk" data-name="' + attr(nm) + '"><b>' + esc(nm) + '</b><span>' + esc(p.office || p.title || p.faction || '人物图志') + '</span></button>'; }).join('') + '</div>' : deskCard('人物未载入', '人物数据载入后可从这里选定收信人。'));
    openDeskOverlay('tm-hongyan-overlay', deskPanelShell('letter', '鸿雁传书', '承接旧 UI「鸿雁传书」标签页：来信、发信、驿路、回信', left, main, right));
  }

  function openShiluPreviewPanel(){
    // renderFormalRecordsPanel split out·2026-05-26·Wave 1 → phase8-formal-records.js
    var recordsPanel = (window.TMPhase8FormalBridge && TMPhase8FormalBridge.records && TMPhase8FormalBridge.records.renderFormalRecordsPanel)
      ? TMPhase8FormalBridge.records.renderFormalRecordsPanel()
      : '<div class="tm-desk-empty">records module not loaded</div>';
    openDeskOverlay('tm-action-records-overlay', actionShell('records', recordsPanel));
    return;
    var tab = state.recordTab || 'shiji';
    var tabs = [['shiji','史记'],['shilu','实录'],['jishi','纪事'],['biannian','编年']];
    var events = collectRecentEvents(12);
    var selected = events.find(function(x){ return String(x.id || x.title) === String(state.recordId || ''); }) || events[0] || {};
    if (selected.id || selected.title) state.recordId = selected.id || selected.title;
    var left = '<div class="tm-desk-tabs">' + tabs.map(function(t){
      return '<button type="button" class="tm-desk-tab ' + (tab === t[0] ? 'active' : '') + '" data-desk-action="record-tab-desk" data-tab="' + attr(t[0]) + '">' + esc(t[1]) + '</button>';
    }).join('') + '</div>' + deskList(events.slice(0, 12).map(function(x){
      return { id: x.id || x.title, title: x.title, meta: ['T' + (x.turn || ''), x.type, x.time].filter(Boolean).join(' · '), text: x.text, hot: String(x.id || x.title) === String(state.recordId || '') };
    }), '暂无回合档案。', { action:'select-record-desk' });
    var main = '<h3 class="tm-desk-title">史官实录</h3>' +
      deskCard(selected.title || '暂无档案', selected.text || selected.detail || '过回合、诏令、问对、朝议、奏疏与地块事件会自动归档。') +
      '<table class="tm-desk-table"><tr><th>类目</th><th>承接旧 UI 内容</th></tr><tr><td>史记</td><td>按人物、地区、势力与大事归档</td></tr><tr><td>实录</td><td>保留诏令、问对、朝议、奏疏的逐条记录</td></tr><tr><td>纪事</td><td>把连续事件串为本末线索</td></tr><tr><td>编年</td><td>按回合与日期排序，自动纳入近事</td></tr></table>' +
      '<h4 class="tm-desk-subtitle">摘录</h4><textarea aria-label="史官摘录" data-desk-record-body>' + esc(selected.detail || selected.text || '') + '</textarea>' +
      '<div class="tm-desk-actions">' + deskAction('收入实录','record-archive-desk',{ record:'shilu' }, true) + deskAction('编入纪事','record-archive-desk',{ record:'jishi' }) + deskAction('转为编年','record-archive-desk',{ record:'biannian' }) + deskAction('关联人物','module-desk',{ kind:'renwu' }) + '</div>';
    var right = '<h4 class="tm-desk-subtitle">归档状态</h4>' + deskStats([
      ['本回近事', events.filter(function(x){ return Number(x.turn || 0) === Number((window.GM && GM.turn) || 1); }).length + ' 条'],
      ['近期待归档', events.length + ' 条'],
      ['当前类目', (tabs.find(function(t){ return t[0] === tab; }) || tabs[0])[1]],
      ['人物摘录', getPeople().length + ' 人']
    ]) + deskCard('自动来源', '御案时政、问对、朝议、奏疏、鸿雁、地图事件与过回合史记弹窗。');
    openDeskOverlay('tm-shilu-overlay', deskPanelShell('records', '史官实录', '承接旧 UI「史记 / 实录 / 纪事 / 编年」四类档案', left, main, right));
  }

  // ── public API attach (Wave 4·drafts) ─────────────────────────────
  bridge.drafts = bridge.drafts || {};
  bridge.drafts.installDeskPanelExactStyles = installDeskPanelExactStyles;
  bridge.drafts.installActionPanelExactStyles = installActionPanelExactStyles;
  bridge.drafts.closeDeskOverlay = closeDeskOverlay;
  bridge.drafts.openDeskOverlay = openDeskOverlay;
  bridge.drafts.captureDeskOverlayState = captureDeskOverlayState;
  bridge.drafts.openZhaoPreviewPanel = openZhaoPreviewPanel;
  bridge.drafts.openYueZouPreviewPanel = openYueZouPreviewPanel;
  bridge.drafts.openHongyanPreviewPanel = openHongyanPreviewPanel;
  bridge.drafts.openShiluPreviewPanel = openShiluPreviewPanel;
  bridge.drafts.showFormalEdictAdoptMenu = showFormalEdictAdoptMenu;
  bridge.drafts.dismissFormalEdictSuggestion = dismissFormalEdictSuggestion;
  bridge.drafts.getFormalEdictDraftSnapshot = getFormalEdictDraftSnapshot;
  bridge.drafts.clearFormalEdictDrafts = clearFormalEdictDrafts;
  bridge.drafts.syncFormalEdictDraftsToLegacyInputs = syncFormalEdictDraftsToLegacyInputs;

  // ── re-attach bridge.X exports that previously came from bridge.js ──
  bridge.openZhao = openZhaoPreviewPanel;
  bridge.openYueZou = openYueZouPreviewPanel;
  bridge.openHongyan = openHongyanPreviewPanel;
  bridge.openShilu = openShiluPreviewPanel;
  bridge.showEdictAdoptMenu = showFormalEdictAdoptMenu;
  bridge.dismissEdictSuggestion = dismissFormalEdictSuggestion;
  bridge.getEdictDraftSnapshot = getFormalEdictDraftSnapshot;
  bridge.clearEdictDrafts = clearFormalEdictDrafts;
  bridge.syncEdictDraftsToLegacy = syncFormalEdictDraftsToLegacyInputs;
  bridge._openHongyanPreviewPanel = openHongyanPreviewPanel;
  bridge._openShiluPreviewPanel = openShiluPreviewPanel;

  // ── re-attach window.* exports ────────────────────────────────────
  window.openZhao = openZhaoPreviewPanel;
  window.openYueZou = openYueZouPreviewPanel;
  window.openHongyan = openHongyanPreviewPanel;
  window.openShilu = openShiluPreviewPanel;
  window.syncPhase8FormalEdictDrafts = syncFormalEdictDraftsToLegacyInputs;
  window.getPhase8FormalEdictDraftSnapshot = getFormalEdictDraftSnapshot;

})();
