// phase8-formal-rightrail.js·右 rail panels + data helpers (9 dispatch renderers + handleRightPanelAction + bindRightPanelActions)
// split from phase8-formal-bridge.js·2026-05-26·Wave 3
// paradigm·head alias 块·body 0 改动·跨闭包 helper 通过 bridge._xxx + late-bound wrapper

(function(){
  'use strict';

  var bridge = window.TMPhase8FormalBridge;
  if (!bridge) {
    console.error('[phase8-formal-rightrail] TMPhase8FormalBridge not init·bridge.js 必须先 load');
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
  var getActiveScenario = bridge._getActiveScenario;
  var getArmies = bridge._getArmies;
  var issueIsResolved = bridge._issueIsResolved;
  var tmfRenwuPortrait = bridge._tmfRenwuPortrait;

  // ── late-bound wrappers for orchestration calls (bridge.X / window.X) ─
  function openPanel(slot){ return bridge.openPanel(slot); }
  function openModule(kind, opts){ return bridge.openModule(kind, opts); }
  function openGuoku(){ return bridge.openGuoku(); }
  function openOfficeStandalone(){ return bridge._openOfficeStandalone(); }
  function openShiluPreviewPanel(){ return bridge._openShiluPreviewPanel(); }
  function openHongyanPreviewPanel(){ return bridge._openHongyanPreviewPanel(); }
  function closeModule(){ return bridge._closeModule(); }
  function closeDeskOverlay(id){ return bridge._closeDeskOverlay(id); }
  function closeRightDrawer(){ return bridge._closeRightDrawer(); }
  function returnFormalHomeSoon(){ return bridge._returnFormalHomeSoon(); }
  function saveFormalDraftsToGM(){ return bridge._saveFormalDraftsToGM(); }

  // ── module body (P3 Wave 3 迁入·1623 行·body 0 改动) ──────────────

  function rightIssueFirst(p, keys, fallback){
    for (var i = 0; i < keys.length; i += 1) {
      var v = p && p[keys[i]];
      if (v != null && v !== '') return v;
    }
    return fallback;
  }

  function rightIssueNum(p, keys, fallback){
    var v = rightIssueFirst(p, keys, null);
    var n = Number(v);
    if (!isFinite(n)) return fallback == null ? 50 : fallback;
    return Math.max(0, Math.min(100, n));
  }

  function rightIssueIsPlayer(p){
    var playerName = (window.P && P.playerInfo && P.playerInfo.characterName) || '';
    return !!(p && (p.isPlayer || p.player || personKey(p) === 'player' || (playerName && p.name === playerName)));
  }

  function rightIssueAtCourt(p){
    if (!p || p.alive === false || p.dead) return false;
    if (p._travelTo || p._enRouteToOffice || p._imprisoned || p.imprisoned || p._exiled || p.exiled || p._fled || p._missing) return false;
    if (typeof window._wdIsAtCapital === 'function') {
      try { return !!window._wdIsAtCapital(p); } catch(_) {}
    }
    var gm = window.GM || {};
    var capital = String(gm._capital || '京师').replace(/\s+/g, '');
    var loc = String(p.location || p.place || p.currentLocation || '').replace(/\s+/g, '');
    var status = String(p.status || p.state || '');
    var office = String(p.officialTitle || p.office || p.title || p.role || '');
    try {
      if (loc && typeof window._isSameLocation === 'function' && window._isSameLocation(loc, capital)) return true;
    } catch(_) {}
    if (loc && (loc.indexOf(capital) >= 0 || /京|京师|京城|北京|顺天|宫|内廷|乾清|紫禁/.test(loc))) return true;
    if (!loc && /内阁|六部|都察院|司礼监|御史|给事中|尚书|侍郎|朝|宫|内廷/.test(office + status)) return true;
    return /在京|在朝|候旨|入值|当值/.test(status + office);
  }

  function rightIssuePersonTitle(p){
    return rightIssueFirst(p, ['officialTitle','office','title','role','position'], '未仕');
  }

  function rightIssueFaction(p){
    return rightIssueFirst(p, ['faction','party','class','group','camp'], '未录派系');
  }

  function rightCleanFactionName(value){
    return String(value || '')
      .replace(/[\s·\-—_]/g, '')
      .replace(/^大/, '')
      .replace(/(朝廷|王朝|政权|汗国|幕府|朝)$/g, '');
  }

  function rightCollectPlayerFactionNames(){
    var gm = window.GM || {};
    var p = window.P || {};
    var out = [];
    function add(value){
      if (!value) return;
      if (typeof value === 'object') {
        add(value.name || value.factionName || value.id || value.key);
        return;
      }
      value = String(value || '').trim();
      if (value && out.indexOf(value) < 0) out.push(value);
    }
    var pi = p.playerInfo || {};
    add(pi.factionName);
    add(pi.characterFaction);
    add(gm.playerFaction);
    var pc = Array.isArray(gm.chars) ? gm.chars.find(function(c){ return c && c.isPlayer; }) : null;
    add(pc && (pc.faction || pc.factionName));
    [gm.facs, gm.factions].forEach(function(list){
      (Array.isArray(list) ? list : []).forEach(function(f){
        if (!f) return;
        if (f.isPlayer || f.player || f.isPlayerFaction || (gm.playerFaction && f.name === gm.playerFaction)) add(f.name || f.id);
      });
    });
    var sc = getActiveScenario();
    if (sc && sc.playerInfo) add(sc.playerInfo.factionName || sc.playerInfo.characterFaction);
    return out;
  }

  function rightKnownFactionNames(){
    var gm = window.GM || {};
    var sc = getActiveScenario();
    var out = [];
    function add(value){
      value = String(value || '').trim();
      if (value && out.indexOf(value) < 0) out.push(value);
    }
    [gm.facs, gm.factions, sc && sc.factions].forEach(function(list){
      (Array.isArray(list) ? list : []).forEach(function(f){ if (f) { add(f.name); add(f.id); } });
    });
    return out;
  }

  function rightFactionMatch(value, names){
    var clean = rightCleanFactionName(value);
    if (!clean) return false;
    return (names || []).some(function(name){
      var n = rightCleanFactionName(name);
      return n && (clean === n || clean.indexOf(n) >= 0 || n.indexOf(clean) >= 0);
    });
  }

  function rightIsGenericCourtFaction(value){
    return /^(朝廷|本朝|官府|内廷|宫廷|皇室|王室|帝室|朝中|中枢)$/.test(String(value || '').trim());
  }

  function rightIssueIsPlayerConsort(p){
    if (typeof window._tmIsPlayerConsort === 'function') {
      try { return !!window._tmIsPlayerConsort(p); } catch(_) {}
    }
    return !!(p && p.spouse === true);
  }

  function rightIssueIsPlayerFactionPerson(p){
    if (!p || p.alive === false || p.dead || rightIssueIsPlayer(p)) return false;
    if (rightIssueIsPlayerConsort(p)) return true;
    var playerFactions = rightCollectPlayerFactionNames();
    if (typeof window._isPlayerFactionChar === 'function') {
      try { if (window._isPlayerFactionChar(p)) return true; } catch(_) {}
    }
    var explicit = [
      p.faction, p.factionName, p.currentFaction, p.allegiance,
      p.country, p.polity, p.realm, p.kingdom, p.force, p.camp
    ].filter(function(x){ return x != null && String(x).trim(); });
    if (p._envoy || p.isEnvoy || p.fromFaction) {
      return !!(p.fromFaction && rightFactionMatch(p.fromFaction, playerFactions));
    }
    if (explicit.length === 0) return true;
    if (explicit.some(rightIsGenericCourtFaction)) return true;
    if (playerFactions.length && explicit.some(function(x){ return rightFactionMatch(x, playerFactions); })) return true;
    var knownFactions = rightKnownFactionNames();
    if (knownFactions.length && explicit.some(function(x){ return rightFactionMatch(x, knownFactions); })) return false;
    return true;
  }

  function rightIssueTopic(p){
    var direct = rightIssueFirst(p, ['topic','currentTopic','agenda','currentAgenda','concern','demand','wish'], '');
    if (direct) return compactText(direct, 80);
    var office = rightIssuePersonTitle(p);
    if (/兵|军|督师|总兵|经略/.test(office)) return '可问边防、军饷、调防与将帅虚实。';
    if (/户|仓|漕|盐|税|粮/.test(office)) return '可问钱粮、漕运、赋税与库藏缺口。';
    if (/吏|都察|御史|给事/.test(office)) return '可问官箴、弹劾、考成与朝局风声。';
    if (/礼|学士|文|讲官/.test(office)) return '可问礼制、士论、经筵与舆情。';
    return '可问其所掌政务、朝局见闻与个人请陈。';
  }

  function rightIssuePortrait(p){
    var img = '';
    try {
      if (p && typeof tmfRenwuPortrait === 'function') img = tmfRenwuPortrait(p);
    } catch(_) {}
    if (!img && p) {
      img = p.portrait || p.avatar || p.image || p.img || p.photo || p.fullBody || p.halfBody || p.characterImage || p.illustration || p.standingArt || p.cardPortrait || '';
    }
    if (img) {
      img = String(img);
      if (/^(https?:|data:|\/|preview\/|assets\/)/.test(img)) {}
      else if (img.indexOf('img/') === 0) img = 'preview/' + img;
      else if (img.indexOf('portraits/') === 0) img = 'preview/img/' + img;
      return '<span class="tmrp-avatar portrait"><img src="' + attr(img) + '" alt=""></span>';
    }
    return '<span class="tmrp-avatar">' + esc(String((p && p.name) || '?').slice(0, 1) || '?') + '</span>';
  }

  function rightIssuePeople(){
    return getPeople().filter(function(p){
      return p && rightIssueIsPlayerFactionPerson(p);
    }).sort(function(a, b){
      var ac = rightIssueAtCourt(a) ? 1 : 0;
      var bc = rightIssueAtCourt(b) ? 1 : 0;
      if (bc !== ac) return bc - ac;
      var ap = (state.pinnedPeople || []).indexOf(personKey(a)) >= 0 ? 1 : 0;
      var bp = (state.pinnedPeople || []).indexOf(personKey(b)) >= 0 ? 1 : 0;
      if (bp !== ap) return bp - ap;
      var aa = rightIssueNum(a, ['stress','ambition','influence'], 0);
      var bb = rightIssueNum(b, ['stress','ambition','influence'], 0);
      return bb - aa;
    });
  }

  function rightIssueRows(rows){
    return '<div class="tmrp-rows">' + rows.map(function(r){
      return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1] == null || r[1] === '' ? '未录' : r[1]) + '</b></div>';
    }).join('') + '</div>';
  }

  function rightIssueBar(label, value){
    var n = Math.max(0, Math.min(100, Number(value) || 0));
    return '<div class="tmrp-bar"><span>' + esc(label) + '</span><i><b style="width:' + n + '%"></b></i><em>' + esc(Math.round(n)) + '</em></div>';
  }

  function rightIssuePersonButton(p, selectedKey){
    var key = personKey(p);
    var active = String(key) === String(selectedKey);
    var sub = [rightIssuePersonTitle(p), rightIssueFaction(p), p.location || p.status || ''].filter(Boolean).join(' · ');
    return '<button type="button" class="tmrp-person ' + (active ? 'active' : '') + '" data-right-action="wendui-select" data-id="' + attr(key) + '">' +
      rightIssuePortrait(p) +
      '<span><b>' + esc(p.name || key) + '</b><span>' + esc(sub) + '</span></span>' +
      '<small>' + (rightIssueAtCourt(p) ? '可召' : '传书') + '</small>' +
      '</button>';
  }

  function rightWenduiGroup(title, note, list, selectedKey){
    return '<section class="tmrp-card tmrp-group-card"><div class="tmrp-card-title"><span>' + esc(title) + '</span><small>' + esc(note || (list.length + ' 人')) + '</small></div>' +
      '<div class="tmrp-scroll compact">' +
      (list.length ? list.map(function(p){ return rightIssuePersonButton(p, selectedKey); }).join('') : '<div class="tmrp-empty">暂无记录。</div>') +
      '</div></section>';
  }

  function rightWenduiHistory(name){
    var gm = window.GM || {};
    var hist = gm.wenduiHistory && gm.wenduiHistory[name];
    return Array.isArray(hist) ? hist : [];
  }

  function rightHistoryCard(h){
    var role = h && h.role ? String(h.role) : '';
    var who = role === 'npc' ? '臣' : (role === 'player' ? '上' : '记');
    var text = typeof h === 'string' ? h : (h && (h.content || h.text || h.message || h.line || h.summary)) || '';
    var delta = h && h.loyaltyDelta != null ? ('忠诚 ' + (Number(h.loyaltyDelta) > 0 ? '+' : '') + h.loyaltyDelta) : '';
    return '<div class="tmrp-log"><b>' + esc(who) + '</b><span>' + esc(compactText(text, 110) || '无内容') + '</span>' + (delta ? '<em>' + esc(delta) + '</em>' : '') + '</div>';
  }

  function rightIssueTopicList(){
    var rows = [];
    var seen = {};
    function add(title, type, text){
      title = String(title || '').trim();
      if (!title || seen[title]) return;
      seen[title] = true;
      rows.push({ title:title, type:type || '朝政', text:text || '' });
    }
    getIssues().filter(function(x){ return !issueIsResolved(x); }).slice(0, 8).forEach(function(x){
      add(x.title, x.category || x.dept || x.severity, x.text || x.detail);
    });
    getMemorials().slice(0, 8).forEach(function(x){
      add(x.title, x.dept || x.type || '奏疏', x.text || x.content);
    });
    var gm = window.GM || {};
    (Array.isArray(gm._ccHeldItems) ? gm._ccHeldItems : []).slice(0, 5).forEach(function(x){
      add(x.title || x.topic, x.dept || x.type || '留中', x.content || x.detail);
    });
    return rows.slice(0, 10);
  }

  function rightChaoyiRecords(){
    var gm = window.GM || {};
    var out = [];
    (Array.isArray(gm.recentChaoyi) ? gm.recentChaoyi : []).forEach(function(r, i){
      r = r || {};
      out.push({ id:'recent-' + i, kind:r.kind || r.mode || '朝议', topic:r.topic || r.title || '未题', decision:r.decision || r.result || '', text:r.line || r.text || r.content || '' });
    });
    (Array.isArray(gm._courtRecords) ? gm._courtRecords : []).slice(-8).reverse().forEach(function(r, i){
      r = r || {};
      out.push({ id:'court-' + i, kind:r.mode || r.type || '朝议', topic:r.topic || r.title || '朝议记录', decision:r.finalRuling || r.decision || r.result || '', text:r.transcript || r.summary || r.content || '' });
    });
    (Array.isArray(gm.qijuHistory) ? gm.qijuHistory : []).forEach(function(r, i){
      var text = String((r && (r.content || r.text || r.zhengwen)) || '');
      if (!/朝议|常朝|廷议|御前会议|朔朝/.test(text)) return;
      out.push({ id:'qiju-' + i, kind:'起居注', topic:r.title || compactText(text, 24) || '朝议', decision:r.date || '', text:text });
    });
    return out.slice(0, 6);
  }

  function rightSelectedWenduiPerson(){
    var people = rightIssuePeople();
    var selected = findPerson(state.rightWenduiPerson);
    if (!selected || people.indexOf(selected) < 0) selected = people.filter(rightIssueAtCourt)[0] || people[0] || null;
    if (selected) state.rightWenduiPerson = personKey(selected);
    return selected;
  }

  function rightWenduiHasUnansweredLetter(name){
    var gm = window.GM || {};
    return (Array.isArray(gm.letters) ? gm.letters : []).some(function(l){
      return l && l._npcInitiated && l.from === name && l._replyExpected && !l._playerReplied && l.status === 'returned';
    });
  }

  function rightWenduiSeekReason(p){
    if (!p) return '';
    var stress = rightIssueNum(p, ['stress','pressure'], 0);
    var loyalty = rightIssueNum(p, ['loyalty','loyal'], 50);
    var ambition = rightIssueNum(p, ['ambition'], 50);
    var raw = String(p.status || '') + String(p.currentAgenda || '') + String(p.demand || '') + String(p.wish || '');
    if (rightWenduiHasUnansweredLetter(p.name || personKey(p))) return '前日来函未获回复，亲至求见。';
    if (/求见|候见|请见|请对|待对/.test(raw)) return compactText(raw, 58);
    if (stress > 60) return '面带忧色，似有为难之事。';
    if (loyalty > 90 && stress > 30) return '神色凝重，欲进忠言。';
    if (ambition > 80 && loyalty > 60) return '精神抖擞，欲呈策论。';
    return '候于殿外，请求面圣。';
  }

  function rightWenduiIsSeeker(p){
    if (!p || !rightIssueAtCourt(p)) return false;
    if (p._mourning || p._lastMetTurn === ((window.GM && GM.turn) || 1)) return false;
    var stress = rightIssueNum(p, ['stress','pressure'], 0);
    var loyalty = rightIssueNum(p, ['loyalty','loyal'], 50);
    var ambition = rightIssueNum(p, ['ambition'], 50);
    var raw = String(p.status || '') + String(p.currentAgenda || '') + String(p.demand || '') + String(p.wish || '');
    return /求见|候见|请见|请对|待对/.test(raw)
      || (loyalty > 90 && stress > 30)
      || (ambition > 80 && loyalty > 60)
      || stress > 60
      || rightWenduiHasUnansweredLetter(p.name || personKey(p));
  }

  function rightWenduiFactionTag(p){
    if (!p) return '';
    if (rightIssueIsPlayerConsort(p)) return '宫眷';
    if (p.party) return String(p.party).slice(0, 4);
    if (p.faction && p.faction !== '朝廷') return String(p.faction).slice(0, 4);
    var office = rightIssuePersonTitle(p);
    if (/将军|总兵|总督|指挥/.test(office)) return '武将';
    if (/司礼|太监|东厂/.test(office)) return '宦官';
    return '';
  }

  function rightWenduiPersonCard(p, action, note, extraAttrs){
    var key = personKey(p);
    var name = p.name || key;
    var hist = rightWenduiHistory(name);
    var loyalty = rightIssueNum(p, ['loyalty','loyal'], 50);
    var cls = loyalty >= 75 ? ' loyal-hi' : (loyalty < 45 ? ' loyal-lo' : '');
    var tag = rightWenduiFactionTag(p);
    return '<button type="button" class="tmrp-wd-person' + cls + (hist.length ? ' has-hist' : '') + '" data-right-action="' + attr(action || 'wendui-pick') + '" data-id="' + attr(key) + '"' + (extraAttrs || '') + '>' +
      rightIssuePortrait(p) +
      '<span class="main"><b>' + esc(name) + (rightIssueIsPlayerConsort(p) ? '<i>❦</i>' : '') + '</b><small>' + esc(rightIssuePersonTitle(p)) + '</small></span>' +
      '<span class="meta"><em>忠 ' + esc(Math.round(loyalty)) + '</em>' + (tag ? '<em>' + esc(tag) + '</em>' : '') + (note ? '<em>' + esc(note) + '</em>' : '') + '</span>' +
      '</button>';
  }

  function rightWenduiRequestItem(p){
    var key = personKey(p);
    var name = p.name || key;
    return '<article class="tmrp-wd-request">' +
      '<button type="button" class="tmrp-wd-request-main" data-right-action="wendui-audience" data-id="' + attr(key) + '">' +
      rightIssuePortrait(p) +
      '<span><b>' + esc(name) + '</b><small>' + esc(rightWenduiSeekReason(p)) + '</small></span>' +
      '</button>' +
      '<button type="button" class="tmrp-wd-mini danger" data-right-action="wendui-deny" data-id="' + attr(key) + '">不见</button>' +
      '</article>';
  }

  function rightWenduiQueueItem(q, idx){
    q = q || {};
    var name = q.name || '待见者';
    var initial = String(name).slice(0, 1) || '?';
    var person = findPerson(name);
    if (!person && typeof window.findCharByName === 'function') {
      try { person = window.findCharByName(name); } catch(_) {}
    }
    var face = person ? rightIssuePortrait(person) : '<span class="tmrp-avatar">' + esc(initial) + '</span>';
    return '<article class="tmrp-wd-request envoy">' +
      '<button type="button" class="tmrp-wd-request-main" data-right-action="wendui-queue" data-index="' + attr(idx) + '">' +
      face +
      '<span><b>' + esc(name) + (q.isEnvoy ? '<i>使节</i>' : '') + '</b><small>' + esc(compactText(q.reason || q.fromFaction || '等待陛下决断', 72)) + '</small></span>' +
      '</button>' +
      '<button type="button" class="tmrp-wd-mini" data-right-action="wendui-dismiss" data-index="' + attr(idx) + '">暂却</button>' +
      '</article>';
  }

  function rightWenduiGroupNew(title, note, body, emptyText){
    return '<section class="tmrp-card tmrp-wd-group"><div class="tmrp-card-title"><span>' + esc(title) + '</span><small>' + esc(note || '') + '</small></div>' +
      (body || '<div class="tmrp-empty">' + esc(emptyText || '暂无人物。') + '</div>') +
      '</section>';
  }

  function renderRightWenduiPanel(){
    var people = rightIssuePeople();
    var gm = window.GM || {};
    var rawPendingAudiences = Array.isArray(gm._pendingAudiences) ? gm._pendingAudiences : [];
    var pendingAudiences = rawPendingAudiences.filter(function(q){
      if (!q || !q.name) return false;
      if (!q.isConsort) return true;
      var p = findPerson(q.name);
      if (!p && typeof window.findCharByName === 'function') {
        try { p = window.findCharByName(q.name); } catch(_) {}
      }
      return !!(p && rightIssueIsPlayerConsort(p));
    });
    if (pendingAudiences.length !== rawPendingAudiences.length) gm._pendingAudiences = pendingAudiences;
    var atCourt = people.filter(rightIssueAtCourt);
    var seekers = atCourt.filter(rightWenduiIsSeeker);
    var waiting = atCourt.filter(function(p){ return seekers.indexOf(p) < 0; });
    var away = people.filter(function(p){ return !rightIssueAtCourt(p); });
    var waitingBody = waiting.length ? '<div class="tmrp-wd-grid">' + waiting.slice(0, 24).map(function(p){
      return rightWenduiPersonCard(p, 'wendui-pick', '');
    }).join('') + '</div>' : '';
    var awayBody = away.length ? '<div class="tmrp-wd-away">' + away.slice(0, 24).map(function(p){
      var loc = p.location || p.status || '远方';
      var travel = p._travelTo ? ' → ' + p._travelTo : '';
      return rightWenduiPersonCard(p, 'wendui-letter', compactText(loc + travel, 12));
    }).join('') + '</div>' : '';
    var queueBody = pendingAudiences.length ? '<div class="tmrp-wd-list">' + pendingAudiences.map(rightWenduiQueueItem).join('') + '</div>' : '';
    var seekerBody = seekers.length ? '<div class="tmrp-wd-list">' + seekers.slice(0, 12).map(rightWenduiRequestItem).join('') + '</div>' : '';
    return '<div class="tmrp-issue-shell tmrp-wendui">' +
      '<section class="tmrp-card tmrp-wd-rules"><div class="tmrp-card-title"><span>问对条件</span><small>旧流程原样承接</small></div>' +
      '<div><b>玩家召见</b><span>点击「百官候旨」人物，先选朝堂问对或私下叙谈。</span></div>' +
      '<div><b>臣下求见</b><span>点击「阶下待见 / 有臣求见」接见，人物先主动陈事。</span></div>' +
      '<div><b>不可召见</b><span>远方、在途、下狱、流放、病重、丁忧、逃亡、失踪等不走问对。</span></div>' +
      '</section>' +
      rightWenduiGroupNew('阶下待见', '使节、外藩、AI 推送求见 · 接见后对方先开口', queueBody, '暂无阶下待见。') +
      rightWenduiGroupNew('有臣求见', '压力高、忠诚极高、野心高或未回信者 · 接见后对方先开口', seekerBody, '暂无臣下主动求见。') +
      rightWenduiGroupNew('百官候旨', '在京在朝，可由玩家主动召见', waitingBody, '暂无在京可召人物。') +
      rightWenduiGroupNew('远方臣子', '不在陛下所在地，点击改走鸿雁传书', awayBody, '暂无远方臣子。') +
      '</div>';
  }

  function renderRightChaoyiPanel(){
    var mode = state.rightChaoyiMode || 'changchao';
    var modes = [
      { id:'changchao', name:'常朝', sub:'例行朝参', desc:'多事并奏、百官齐集、逐条裁决。', meta:'30-50 人 · 精力 10', img:'chaoyi-changchao-scene-v1.png' },
      { id:'tinyi', name:'廷议', sub:'集议大政', desc:'一议多轮、辩难立场、共识或乾纲独断。', meta:'15-30 人 · 精力 25', img:'chaoyi-tingyi-scene-v1.png' },
      { id:'yuqian', name:'御前会议', sub:'密召心腹', desc:'坦言直陈、君臣密议，可记起居注或不录。', meta:'3-8 人 · 精力 10', img:'chaoyi-yuqian-scene-v1.png' }
    ];
    return '<section class="tmrp-card">' +
      '<div class="tmrp-card-title"><span>朝议类型</span><small>点击场景图直接进入对应流程</small></div>' +
      '<div class="tmrp-chaoyi-scenes">' + modes.map(function(m){
        return '<button type="button" class="tmrp-chaoyi-card ' + (mode === m.id ? 'active' : '') + '" data-right-action="chaoyi-launch" data-mode="' + attr(m.id) + '">' +
          '<img src="' + attr(asset(m.img)) + '" alt="">' +
          '<span class="txt"><b>' + esc(m.name) + '</b><span>' + esc(m.sub + ' · ' + m.desc) + '</span><small>' + esc(m.meta) + '</small></span>' +
          '</button>';
      }).join('') + '</div>' +
      '</section>' +
      '<section class="tmrp-card">' +
      '<div class="tmrp-card-title"><span>流程承接</span><small>跳过旧版三选一中间页</small></div>' +
      '<div class="tmrp-meta">选择常朝、廷议或御前会议后，直接进入对应的筹备或朝会流程；议题、人员、奏对、记录与裁断仍由原业务逻辑处理。</div>' +
      '</section>';
  }

  function renderZheng(){
    var tab = state.rightIssueTab || 'wendui';
    return '<div class="tmrp-tabs tmrp-issue-tabs">' +
      '<button type="button" class="' + (tab === 'wendui' ? 'active' : '') + '" data-right-action="issue-tab" data-tab="wendui">问对</button>' +
      '<button type="button" class="' + (tab === 'chaoyi' ? 'active' : '') + '" data-right-action="issue-tab" data-tab="chaoyi">朝议</button>' +
      '</div>' +
      (tab === 'chaoyi' ? renderRightChaoyiPanel() : renderRightWenduiPanel());
  }

  function rightArmyFirst(a, keys, fallback){
    return rightIssueFirst(a, keys, fallback);
  }

  function rightArmyNumRaw(a, keys, fallback){
    var v = rightArmyFirst(a, keys, null);
    if (typeof v === 'string') v = v.replace(/,/g, '');
    var n = Number(v);
    return isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }

  function rightArmyPercent(a, keys, fallback){
    var n = rightArmyNumRaw(a, keys, fallback == null ? 50 : fallback);
    return Math.max(0, Math.min(100, n));
  }

  function rightArmySoldiers(a){
    return Math.max(0, Math.round(rightArmyNumRaw(a, ['soldiers','size','strength','troops','initialTroops'], 0)));
  }

  function rightArmyFmtNum(n){
    n = Number(n);
    return isFinite(n) ? Math.round(n).toLocaleString() : '未录';
  }

  function rightArmyType(a){
    return rightArmyFirst(a, ['armyType','type','branch','category','kind'], '其他');
  }

  function rightArmyName(a){
    return rightArmyFirst(a, ['name','id'], '未名部队');
  }

  function rightArmyKey(a, idx){
    return String(rightArmyFirst(a, ['id','name'], 'army-' + idx));
  }

  function rightArmyFaction(a){
    return rightArmyFirst(a, ['faction','factionName','owner','camp','force','realm','country','polity'], '');
  }

  function rightArmyBelongsToPlayer(a){
    if (!a || a.destroyed || a.disbanded || a.active === false) return false;
    var explicit = [
      a.faction, a.factionName, a.owner, a.camp, a.force, a.realm, a.country, a.polity
    ].filter(function(x){ return x != null && String(x).trim(); });
    if (explicit.length === 0) return true;
    if (explicit.some(rightIsGenericCourtFaction)) return true;
    var playerFactions = rightCollectPlayerFactionNames();
    if (!playerFactions.length) return true;
    if (explicit.some(function(x){ return rightFactionMatch(x, playerFactions); })) return true;
    var knownFactions = rightKnownFactionNames();
    if (knownFactions.length && explicit.some(function(x){ return rightFactionMatch(x, knownFactions); })) return false;
    return true;
  }

  function rightArmyList(){
    var raw = getArmies().filter(function(a){ return a && !a.destroyed && !a.disbanded && a.active !== false; });
    var mine = raw.filter(rightArmyBelongsToPlayer);
    return mine.length || !raw.length ? mine : raw;
  }

  function rightFindArmy(key){
    key = String(key || '');
    var list = rightArmyList();
    return list.find(function(a, idx){
      return rightArmyKey(a, idx) === key || rightArmyName(a) === key || String(a.id || '') === key;
    }) || null;
  }

  function rightArmyCompositionText(value){
    if (Array.isArray(value)) {
      return value.map(function(x){
        if (!x) return '';
        if (typeof x === 'string') return x;
        var name = x.type || x.name || x.kind || x.unit || '兵种';
        var count = x.count || x.soldiers || x.size || x.strength || '';
        return name + (count ? ' ' + rightArmyFmtNum(count) : '');
      }).filter(Boolean).join(' / ') || '未录';
    }
    if (value && typeof value === 'object') {
      return Object.keys(value).map(function(k){ return k + ' ' + rightArmyFmtNum(value[k]); }).join(' / ') || '未录';
    }
    return value || '未录';
  }

  function rightArmyEquipmentText(a){
    var direct = rightArmyFirst(a, ['equipmentCondition','equipmentStatus','equipmentLevel'], '');
    if (direct) return direct;
    var eq = a && a.equipment;
    if (Array.isArray(eq)) {
      return eq.map(function(x){
        if (!x) return '';
        if (typeof x === 'string') return x;
        return (x.name || x.type || '装备') + (x.condition ? '·' + x.condition : '') + (x.count ? ' ' + rightArmyFmtNum(x.count) : '');
      }).filter(Boolean).join(' / ') || '未录';
    }
    return eq || '未录';
  }

  function rightArmyActivityText(value){
    var raw = String(value || '').trim();
    if (!raw) return '驻防';
    var key = raw.toLowerCase();
    var map = {
      garrison: '驻防',
      stationed: '驻防',
      idle: '待命',
      marching: '行军',
      march: '行军',
      moving: '行军',
      siege: '围城',
      sieging: '围城',
      battle: '交战',
      fighting: '交战',
      training: '操练',
      patrol: '巡防',
      routed: '溃散',
      disbanded: '裁撤'
    };
    return map[key] || raw;
  }

  function rightArmyMoneyText(a){
    var value = rightArmyFirst(a, ['salary','annualSalary','yearlySalary','upkeep','cost','monthlyCost'], '');
    if (value && typeof value === 'object') {
      return Object.keys(value).map(function(k){ return k + ' ' + rightArmyFmtNum(value[k]); }).join(' / ');
    }
    if (value !== '') return isFinite(Number(value)) ? rightArmyFmtNum(value) : value;
    return '未录';
  }

  function rightArmyRows(rows){
    return '<div class="tmrp-rows">' + rows.map(function(r){
      return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1] == null || r[1] === '' ? '未录' : r[1]) + '</b></div>';
    }).join('') + '</div>';
  }

  function rightArmyBar(label, value){
    var n = Math.max(0, Math.min(100, Number(value)));
    if (!isFinite(n)) n = 0;
    return '<div class="tmrp-bar"><span>' + esc(label) + '</span><i><b style="width:' + n + '%"></b></i><em>' + Math.round(n) + '</em></div>';
  }

  function renderRightArmyDetailCard(a){
    if (!a) return '';
    var armyKey = rightArmyKey(a, rightArmyList().indexOf(a));
    var soldiers = rightArmySoldiers(a);
    var morale = rightArmyPercent(a, ['morale','moraleValue'], 50);
    var training = rightArmyPercent(a, ['training','trainingValue'], 50);
    var loyalty = rightArmyPercent(a, ['loyalty','cohesion'], 50);
    var control = rightArmyPercent(a, ['control','discipline','commandControl'], 50);
    var supply = rightArmyPercent(a, ['supply','supplies'], 70);
    var mutiny = rightArmyPercent(a, ['mutinyRisk','rebellionRisk'], 0);
    var hot = morale < 45 || supply < 35 || mutiny >= 55;
    var commander = rightArmyFirst(a, ['commander','commanderName','commanderDisplayName','commander_name','general','generalName','leader','leaderName','commandingOfficer','chiefCommander','chiefGeneral','mainGeneral'], '未置统帅');
    var location = rightArmyFirst(a, ['location','garrison','station','theater','region'], '未置驻地');
    var activity = rightArmyActivityText(rightArmyFirst(a, ['activity','state','status','currentAction'], '驻防'));
    var desc = rightArmyFirst(a, ['description','desc','note','memo','reason'], '暂无军情说明');
    return '<section class="tmrp-card tmrp-army-detail ' + (hot ? 'hot' : 'ok') + '">' +
      '<div class="tmrp-card-title"><span>' + esc(rightArmyName(a)) + '</span><small>' + esc(rightArmyType(a)) + ' · ' + esc(rightArmyFmtNum(soldiers)) + ' 兵</small></div>' +
      '<div class="tmrp-mini-grid">' +
      '<div><span>统帅</span><b>' + esc(commander) + '</b></div>' +
      '<div><span>驻地</span><b>' + esc(location) + '</b></div>' +
      '<div><span>军质</span><b>' + esc(rightArmyFirst(a, ['quality','grade','eliteLevel'], '未录')) + '</b></div>' +
      '<div><span>装备</span><b>' + esc(rightArmyEquipmentText(a)) + '</b></div>' +
      '</div>' +
      rightArmyRows([['当前动态', activity], ['说明', desc], ['所属', rightArmyFaction(a) || '未录'], ['补给/兵变险', Math.round(supply) + ' / ' + Math.round(mutiny)]]) +
      rightArmyBar('士气', morale) + rightArmyBar('训练', training) + rightArmyBar('忠诚', loyalty) + rightArmyBar('控制', control) +
      '<table class="tmrp-data-table"><thead><tr><th>项目</th><th>明细</th></tr></thead><tbody>' +
      '<tr><td>兵种构成</td><td>' + esc(rightArmyCompositionText(a.composition || a.unitsComposition || a.units)) + '</td></tr>' +
      '<tr><td>岁饷</td><td>' + esc(rightArmyMoneyText(a)) + '</td></tr>' +
      '<tr><td>军需</td><td>' + esc(rightArmyFirst(a, ['logistics','supplyState','supplyDepotId'], '未录')) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="tmrp-action-row">' +
      '<button type="button" class="tmrp-btn primary" data-right-action="army-command" data-command="orders" data-id="' + attr(armyKey) + '">查看军令</button>' +
      '<button type="button" class="tmrp-btn" data-right-action="army-command" data-command="pay" data-id="' + attr(armyKey) + '">核饷</button>' +
      '<button type="button" class="tmrp-btn" data-right-action="army-command" data-command="train" data-id="' + attr(armyKey) + '">整训</button>' +
      '<button type="button" class="tmrp-btn" data-right-action="army-command" data-command="redeploy" data-id="' + attr(armyKey) + '">调防</button>' +
      '<button type="button" class="tmrp-btn" data-right-action="army-command" data-command="chaoyi" data-id="' + attr(armyKey) + '">入朝议</button>' +
      '</div>' +
      '</section>';
  }

  function renderArmy(){
    var armies = rightArmyList();
    var total = armies.reduce(function(s, a){ return s + rightArmySoldiers(a); }, 0);
    var avgMorale = armies.length ? Math.round(armies.reduce(function(s, a){ return s + rightArmyPercent(a, ['morale'], 50); }, 0) / armies.length) : 0;
    var avgTraining = armies.length ? Math.round(armies.reduce(function(s, a){ return s + rightArmyPercent(a, ['training'], 50); }, 0) / armies.length) : 0;
    var selected = rightFindArmy(state.selectedArmy) || armies[0] || null;
    if (selected) state.selectedArmy = rightArmyKey(selected, armies.indexOf(selected));
    var groups = [];
    armies.forEach(function(a){
      var t = rightArmyType(a);
      if (groups.indexOf(t) < 0) groups.push(t);
    });
    return '<div class="tmrp-army-shell">' +
      '<div class="tmrp-summary"><div class="tmrp-stat"><b>' + esc(armies.length) + '</b><span>军队</span></div><div class="tmrp-stat"><b>' + esc(rightArmyFmtNum(total)) + '</b><span>总兵力</span></div><div class="tmrp-stat"><b>' + esc(avgMorale + '/' + avgTraining) + '</b><span>士气/训练</span></div></div>' +
      '<section class="tmrp-card"><div class="tmrp-card-title"><span>军务总览</span><small>承接旧军务边防数据，不另造死数据</small></div><div class="tmrp-meta">这里读取正式存档里的 GM.armies / P.armies。点击部队会按预览页方式在左侧展开详情；兵力、统帅、驻地、军质、装备、士气、训练、忠诚、控制、编制和岁饷都来自真实军队对象。</div></section>' +
      '<section class="tmrp-card"><div class="tmrp-card-title"><span>部队名册</span><small>点击左展明细</small></div>' +
      (armies.length ? '<div class="tmrp-scroll compact tmrp-army-list">' + groups.map(function(g){
        var list = armies.filter(function(a){ return rightArmyType(a) === g; });
        var subtotal = list.reduce(function(s, a){ return s + rightArmySoldiers(a); }, 0);
        return '<div class="tmrp-ledger-head"><span>' + esc(g) + '</span><small>' + esc(list.length) + ' 支 · ' + esc(rightArmyFmtNum(subtotal)) + ' 兵</small></div>' +
          list.map(function(a){
            var key = rightArmyKey(a, armies.indexOf(a));
            var active = selected && key === state.selectedArmy;
          var commander = rightArmyFirst(a, ['commander','commanderName','commanderDisplayName','commander_name','general','generalName','leader','leaderName','commandingOfficer','chiefCommander','chiefGeneral','mainGeneral'], '未置统帅');
            var location = rightArmyFirst(a, ['location','garrison','station','theater','region'], '未置驻地');
            return '<button type="button" class="tmrp-person ' + (active ? 'active' : '') + '" data-right-action="army-select" data-id="' + attr(key) + '">' +
              '<span class="tmrp-avatar">军</span><span><b>' + esc(rightArmyName(a)) + '</b><span>' + esc(commander) + ' · ' + esc(location) + '</span></span><small>' + esc(rightArmyFmtNum(rightArmySoldiers(a))) + '</small></button>';
          }).join('');
      }).join('') + '</div>' : '<div class="tmrp-empty">暂无可读取的军队数据。</div>') +
      '</section>' +
      '</div>';
  }

  function rightAdminNum(v, fallback){
    if (v && typeof v === 'object') v = v.mouths || v.count || v.value;
    var n = Number(v);
    return isFinite(n) ? n : (fallback == null ? 0 : fallback);
  }

  function rightAdminWan(v){
    var n = rightAdminNum(v, 0);
    if (!n) return '未录';
    return n >= 10000 ? (Math.round(n / 1000) / 10) + '万' : rightArmyFmtNum(n);
  }

  function rightAdminFromDivision(d, faction){
    d = d || {};
    var popObj = (d.population && typeof d.population === 'object') ? d.population : null;
    var detail = d.populationDetail || d.population_detail || {};
    return {
      name: d.name || d.title || d.officialName || d.id || '未名区划',
      level: d.level || d.adminLevel || d.regionType || d.type || '行政区',
      faction: faction || d.dejureOwner || d.owner || d.factionName || d.faction || '',
      governor: d.governor || d.chief || d.holder || d.official || '',
      position: d.officialPosition || d.office || d.position || '',
      pop: (popObj && (popObj.mouths || popObj.population)) || d.population || detail.mouths || d.pop || 0,
      households: (popObj && popObj.households) || d.households || detail.households || 0,
      prosperity: d.prosperity || d.development || d.wealth || 0,
      minxin: d.minxinLocal || d.minxin || d.mood || d.publicOrder || 0,
      corruption: d.corruptionLocal || d.corruption || d.officeRisk || 0,
      terrain: d.terrain || d.geography || '',
      resources: d.specialResources || d.resources || d.resource || '',
      tax: d.taxLevel || d.tax || d.fiscalPolicy || '',
      children: d.children || d.divisions || d.subs || []
    };
  }

  function rightAdminItems(){
    var gm = window.GM || {};
    var p = window.P || {};
    var out = [];
    function addDivision(d, faction){
      if (!d) return;
      out.push(rightAdminFromDivision(d, faction));
    }
    var ah = (gm.adminHierarchy && Object.keys(gm.adminHierarchy).length ? gm.adminHierarchy : p.adminHierarchy) || null;
    if (Array.isArray(ah)) {
      ah.forEach(function(root){ addDivision(root, root && (root.name || root.factionName)); });
    } else if (ah && typeof ah === 'object') {
      Object.keys(ah).forEach(function(k){
        var root = ah[k] || {};
        var list = root.divisions || root.children || root.subs || [];
        if (Array.isArray(list) && list.length) list.forEach(function(d){ addDivision(d, root.name || k); });
        else addDivision(root, root.name || k);
      });
    }
    if (!out.length) {
      var map = getMapData();
      (map && Array.isArray(map.regions) ? map.regions : []).forEach(function(r){
        var admin = r.admin || {};
        addDivision(Object.assign({}, admin, {
          name: r.officialName || r.title || r.name,
          level: admin.level || r.level || r.type,
          factionName: r.factionName || r.owner || ownerName(r),
          resources: admin.specialResources || r.resources,
          terrain: admin.terrain || r.terrain
        }), r.factionName || r.owner || ownerName(r));
      });
    }
    return out.filter(function(x){ return x && x.name; });
  }

  function renderMapPanelRich(){
    var items = rightAdminItems();
    var totalPop = items.reduce(function(s, x){ return s + rightAdminNum(x.pop, 0); }, 0);
    var crisis = items.filter(function(x){ return rightAdminNum(x.minxin, 60) < 45 || rightAdminNum(x.corruption, 0) > 55; });
    var factions = [];
    items.forEach(function(x){ if (x.faction && factions.indexOf(x.faction) < 0) factions.push(x.faction); });
    return '<div class="tmrp-admin-shell">' +
      '<div class="tmrp-summary"><div class="tmrp-stat"><b>' + esc(items.length) + '</b><span>行政区</span></div><div class="tmrp-stat"><b>' + esc(rightAdminWan(totalPop)) + '</b><span>总人口</span></div><div class="tmrp-stat"><b>' + esc(crisis.length) + '</b><span>危机</span></div></div>' +
      '<section class="tmrp-card"><div class="tmrp-card-title"><span>行政区划</span><small>承接地图与行政层级真实数据</small></div>' +
      '<div class="tmrp-chip-list">' + factions.slice(0, 8).map(function(f){ return '<span class="tmrp-pill">' + esc(f) + '</span>'; }).join('') + '</div></section>' +
      (crisis.length ? '<section class="tmrp-card hot"><div class="tmrp-card-title"><span>区划预警</span><small>民心低 / 腐败高</small></div>' + crisis.slice(0, 4).map(function(x){ return '<div class="tmrp-step"><b>' + esc(x.name) + '</b> 民心 ' + esc(Math.round(rightAdminNum(x.minxin, 0))) + ' · 腐败 ' + esc(Math.round(rightAdminNum(x.corruption, 0))) + ' · ' + esc(x.governor || '主官未录') + '</div>'; }).join('') + '</section>' : '') +
      (items.length ? '<div class="tmrp-scroll tall">' + items.map(function(x, i){
        var hot = rightAdminNum(x.minxin, 60) < 45 || rightAdminNum(x.corruption, 0) > 55;
        return '<section class="tmrp-card tmrp-admin-card ' + (hot ? 'hot' : '') + '" style="--admin-c:' + ['#c9a84c','#70b097','#8e6aa8','#c95340','#5e8fb3'][i % 5] + '">' +
          '<div class="tmrp-admin-title"><b>' + esc(x.name) + '</b><small>' + esc(x.level) + '<br>' + esc(x.faction || '未录') + '</small></div>' +
          '<div class="tmrp-mini-grid"><div><span>主官</span><b>' + esc(x.governor || '未置') + '</b></div><div><span>官职</span><b>' + esc(x.position || '未录') + '</b></div><div><span>人口</span><b>' + esc(rightAdminWan(x.pop)) + '</b></div><div><span>户数</span><b>' + esc(rightAdminWan(x.households)) + '</b></div></div>' +
          rightArmyBar('民心', rightAdminNum(x.minxin, 50)) + rightArmyBar('繁荣', rightAdminNum(x.prosperity, 50)) + rightArmyBar('腐败', rightAdminNum(x.corruption, 0)) +
          rightArmyRows([['地形', x.terrain], ['特产', x.resources], ['税负', x.tax], ['下辖', Array.isArray(x.children) ? x.children.length + ' 处' : '未录']]) +
          '<div class="tmrp-action-row"><button type="button" class="tmrp-btn" data-right-action="admin-edict" data-kind="安民" data-name="' + attr(x.name) + '">安民</button><button type="button" class="tmrp-btn" data-right-action="admin-edict" data-kind="巡按" data-name="' + attr(x.name) + '">巡按</button><button type="button" class="tmrp-btn" data-right-action="admin-edict" data-kind="调粮" data-name="' + attr(x.name) + '">调粮</button><button type="button" class="tmrp-btn primary" data-right-action="admin-edict" data-kind="拟诏" data-name="' + attr(x.name) + '">拟诏</button></div>' +
          '</section>';
      }).join('') + '</div>' : '<section class="tmrp-card empty"><div class="tmrp-empty">行政区划数据尚未载入。</div></section>') +
      '</div>';
  }

  function rightFinanceRoot(){
    var gm = window.GM || {};
    var p = window.P || {};
    return {
      guoku: gm.guoku || p.guoku || {},
      neitang: gm.neitang || p.neitang || {},
      fiscal: gm.fiscal || gm.fiscalSystem || gm.fiscalConfig || p.fiscal || p.fiscalSystem || p.fiscalConfig || {}
    };
  }

  function rightFinanceFirst(obj, keys, fallback){
    for (var i = 0; i < keys.length; i += 1) {
      var v = obj && obj[keys[i]];
      if (v != null && v !== '') return v;
    }
    return fallback;
  }

  function rightFinanceMoney(v){
    if (v && typeof v === 'object') v = v.amount || v.value || v.money || v.total;
    var n = Number(v);
    if (!isFinite(n)) return v == null || v === '' ? '未录' : String(v);
    if (Math.abs(n) >= 10000) return (Math.round(n / 1000) / 10) + '万';
    return rightArmyFmtNum(n);
  }

  function rightFinanceCollect(keys){
    var root = rightFinanceRoot();
    var sources = [root.guoku, root.fiscal, root.guoku.fiscal, root.fiscal.config].filter(Boolean);
    var out = [];
    function addList(list, sourceName){
      if (!Array.isArray(list)) return;
      list.forEach(function(x){
        if (!x) return;
        if (typeof x === 'string') out.push({ name: x, amount: '', note: sourceName || '' });
        else out.push({
          name: x.name || x.title || x.type || x.category || sourceName || '项目',
          amount: x.amount || x.value || x.money || x.grain || x.total || x.monthly || x.annual || '',
          note: x.note || x.desc || x.description || x.reason || x.status || ''
        });
      });
    }
    sources.forEach(function(src){
      keys.forEach(function(k){ addList(src && src[k], k); });
    });
    return out;
  }

  function rightFinanceItemList(items, empty){
    if (!items.length) return '<div class="tmrp-empty">' + esc(empty || '暂无明细') + '</div>';
    return items.slice(0, 8).map(function(x){
      return '<div class="tmrp-fin-line"><b>' + esc(x.name || '项目') + '</b><span>' + esc(rightFinanceMoney(x.amount)) + '</span><small>' + esc(compactText(x.note || '', 46)) + '</small></div>';
    }).join('');
  }

  function renderFinanceRich(){
    var root = rightFinanceRoot();
    var g = root.guoku || {};
    var n = root.neitang || {};
    var f = root.fiscal || {};
    var money = rightFinanceFirst(g, ['stockMoney','money','balance','silver','taicangMoney'], 0);
    var grain = rightFinanceFirst(g, ['stockGrain','grain','grainStock','food'], 0);
    var cloth = rightFinanceFirst(g, ['stockCloth','cloth','clothStock'], '');
    var neitang = rightFinanceFirst(n, ['money','balance','silver'], '');
    var income = rightFinanceFirst(g, ['turnIncome','monthlyIncome','income','lastIncome'], rightFinanceFirst(f, ['turnIncome','monthlyIncome','income'], 0));
    var expense = rightFinanceFirst(g, ['turnExpense','monthlyExpense','expense','lastExpense'], rightFinanceFirst(f, ['turnExpense','monthlyExpense','expense'], 0));
    var net = rightAdminNum(income, 0) - rightAdminNum(expense, 0);
    var incomeItems = rightFinanceCollect(['incomeItems','incomes','longTermIncome','recurringIncome','customTaxes','taxes']);
    var expenseItems = rightFinanceCollect(['expenseItems','expenses','longTermExpense','recurringExpense','fixedExpenses','spendingItems']);
    return '<div class="tmrp-finance-shell">' +
      '<div class="tmrp-summary"><div class="tmrp-stat"><b>' + esc(rightFinanceMoney(money)) + '</b><span>太仓银</span></div><div class="tmrp-stat"><b>' + esc(rightFinanceMoney(grain)) + '</b><span>太仓粮</span></div><div class="tmrp-stat"><b>' + esc(rightFinanceMoney(net)) + '</b><span>本期结余</span></div></div>' +
      '<section class="tmrp-card"><div class="tmrp-card-title"><span>库藏</span><small>国库 / 内帑 / 本回合</small></div>' +
      '<div class="tmrp-mini-grid"><div><span>太仓银</span><b>' + esc(rightFinanceMoney(money)) + '</b></div><div><span>太仓粮</span><b>' + esc(rightFinanceMoney(grain)) + '</b></div><div><span>库存布</span><b>' + esc(rightFinanceMoney(cloth)) + '</b></div><div><span>内帑银</span><b>' + esc(rightFinanceMoney(neitang)) + '</b></div></div></section>' +
      '<section class="tmrp-card ' + (net < 0 ? 'hot' : '') + '"><div class="tmrp-card-title"><span>本期收支</span><small>' + esc(getTurnText(window.GM && GM.turn)) + '</small></div>' +
      rightArmyRows([['本期收入', rightFinanceMoney(income)], ['本期支出', rightFinanceMoney(expense)], ['军饷', rightFinanceMoney(rightFinanceFirst(g, ['armyExpense','militaryExpense'], '待核'))], ['宗禄', rightFinanceMoney(rightFinanceFirst(g, ['royalExpense','clanExpense'], '待核'))]]) +
      '<div class="tmrp-action-row"><button type="button" class="tmrp-btn primary" data-right-action="finance-module">帑廪详情</button><button type="button" class="tmrp-btn" data-right-action="finance-old" data-method="extraTax">加派</button><button type="button" class="tmrp-btn" data-right-action="finance-old" data-method="openGranary">开仓</button><button type="button" class="tmrp-btn" data-right-action="finance-old" data-method="loan">借贷</button><button type="button" class="tmrp-btn" data-right-action="finance-old" data-method="advisor">户部参议</button><button type="button" class="tmrp-btn" data-right-action="finance-edict" data-kind="拨内帑">拨内帑</button><button type="button" class="tmrp-btn" data-right-action="finance-edict" data-kind="核饷">核饷</button><button type="button" class="tmrp-btn" data-right-action="finance-edict" data-kind="清查税粮">清查税粮</button></div></section>' +
      '<section class="tmrp-card"><div class="tmrp-card-title"><span>长期收入</span><small>AI 和玩家操作可增删这些项</small></div>' + rightFinanceItemList(incomeItems, '暂无长期收入明细') + '</section>' +
      '<section class="tmrp-card"><div class="tmrp-card-title"><span>长期支出</span><small>军饷、宗禄、工程、赈济等</small></div>' + rightFinanceItemList(expenseItems, '暂无长期支出明细') + '</section>' +
      '</div>';
  }

  function rightWorkGenreLabel(v){
    var map = { poem:'诗', ci:'词', fu:'赋', prose:'散文', essay:'散文', memorial:'奏议', document:'应用文' };
    return map[String(v || '').toLowerCase()] || v || '未分类';
  }

  function rightWorkRiskLabel(v){
    v = String(v || '').toLowerCase();
    if (v === 'high' || v === '高') return '高风险';
    if (v === 'medium' || v === '中') return '中风险';
    if (v === 'low' || v === '低') return '低风险';
    return '未定风险';
  }

  function rightWorks(){
    var gm = window.GM || {};
    var p = window.P || {};
    var works = [];
    function push(w, author, source, sourceIndex){
      if (!w) return;
      var meta = { _source: source || '', _sourceIndex: sourceIndex == null ? -1 : sourceIndex };
      if (typeof w === 'string') {
        works.push(Object.assign({ title: w, author: author || '无名', content: '', quality: 0 }, meta));
      } else {
        works.push(Object.assign({ author: author || w.author || '无名' }, w, meta));
      }
    }
    [
      ['GM.culturalWorks', gm.culturalWorks],
      ['GM.works', gm.works],
      ['GM.wenshiWorks', gm.wenshiWorks],
      ['P.culturalWorks', p.culturalWorks],
      ['P.presetWorks', p.presetWorks],
      ['P.culturalConfig.presetWorks', p.culturalConfig && p.culturalConfig.presetWorks]
    ].forEach(function(pair){
      var source = pair[0];
      var list = Array.isArray(pair[1]) ? pair[1] : [];
      list.forEach(function(w, idx){ push(w, null, source, idx); });
    });
    if (!works.length) {
      getPeople().forEach(function(c){
        ['works','writings','documents','memorials'].forEach(function(k){
          (Array.isArray(c && c[k]) ? c[k] : []).forEach(function(w, idx){ push(w, c.name, 'person.' + (c && c.name || '') + '.' + k, idx); });
        });
      });
    }
    return works;
  }

  function renderWenRich(){
    var works = rightWorks();
    var preserved = works.filter(function(w){ return w.isPreserved || w.preserved || w.status === '传世'; }).length;
    var risky = works.filter(function(w){ return /high|medium|高|中/.test(String(w.politicalRisk || w.risk || '')); }).length;
    var pk = (typeof P !== 'undefined' && P && P.keju) || {};
    var kejuEnabled = !!pk.enabled;
    var jinshiCount = (pk.history && pk.history.length) || 0;
    var kejuBadge = pk.currentExam ? '科举进行中' : (kejuEnabled ? ('进士 ' + jinshiCount + ' 名') : '未开科');
    return '<div class="tmrp-wenshi-shell">' +
      '<section class="tmrp-card" style="background:linear-gradient(135deg,rgba(206,169,87,.18),rgba(80,40,20,.12));border-color:rgba(206,169,87,.45);">' +
        '<div class="tmrp-card-title"><span>📜 科举</span><small>开科取士·贡士·殿试·授官</small></div>' +
        '<div class="tmrp-meta">' + esc(kejuBadge) + (pk.examSubjects ? ' · ' + esc(pk.examSubjects) : '') + '</div>' +
        '<div class="tmrp-action-row"><button type="button" class="tmrp-btn primary" onclick="if(typeof window.openKejuPanel===&#39;function&#39;)window.openKejuPanel();else if(typeof window.showKejuModal===&#39;function&#39;)window.showKejuModal();else if(typeof toast===&#39;function&#39;)toast(&#39;科举系统未加载&#39;);">入科举主面板</button></div>' +
      '</section>' +
      '<div class="tmrp-summary"><div class="tmrp-stat"><b>' + esc(works.length) + '</b><span>总录</span></div><div class="tmrp-stat"><b>' + esc(preserved) + '</b><span>传世</span></div><div class="tmrp-stat"><b>' + esc(risky) + '</b><span>政险</span></div></div>' +
      '<section class="tmrp-card"><div class="tmrp-card-title"><span>文苑披览</span><small>作品、品评、查禁、入诏</small></div><div class="tmrp-chip-list">' +
      ['全部触发','诗','词','赋','散文','应用文','仅传世','隐藏查禁'].map(function(x){ return '<span class="tmrp-pill">' + esc(x) + '</span>'; }).join('') +
      '</div></section>' +
      (works.length ? '<div class="tmrp-scroll tall">' + works.slice(0, 24).map(function(w, i){
        var title = w.title || w.name || '无题';
        var author = w.author || w.creator || '无名';
        var excerpt = compactText(w.preview || w.content || w.text || w.narrativeContext || w.description || '', 150);
        var hot = /high|高/.test(String(w.politicalRisk || w.risk || '')) || w.isForbidden;
        var ok = w.isPreserved || w.preserved;
        return '<section class="tmrp-card tmrp-work-card ' + (hot ? 'hot' : (ok ? 'ok' : '')) + '">' +
          '<div class="tmrp-work-tab">' + esc(String(author).slice(0, 3)) + '</div><div>' +
          '<div class="tmrp-card-title"><span>' + esc(title) + '</span><small>' + esc(rightWorkGenreLabel(w.genre || w.type)) + ' · ' + esc(w.triggerCategory || w.category || '文苑') + '</small></div>' +
          '<div class="tmrp-meta">' + esc(author) + ' · ' + esc(w.date || ('T' + (w.turn || '?'))) + ' · ' + esc(w.location || '未录') + '</div>' +
          '<div class="tmrp-meta">' + esc(excerpt || '暂无正文') + '</div>' +
          '<div class="tmrp-chip-list"><span class="tmrp-pill">品 ' + esc(Math.round(Number(w.quality) || 0)) + '</span><span class="tmrp-pill">' + esc(rightWorkRiskLabel(w.politicalRisk || w.risk)) + '</span>' + (w.theme ? '<span class="tmrp-pill">' + esc(w.theme) + '</span>' : '') + '</div>' +
          rightArmyRows([['创作背景', w.narrativeContext || w.background], ['政治暗线', w.politicalImplication || w.implication]]) +
          '<div class="tmrp-action-row"><button type="button" class="tmrp-btn" data-right-action="work-detail" data-index="' + attr(i) + '">详情</button><button type="button" class="tmrp-btn" data-right-action="work-action" data-index="' + attr(i) + '" data-work-action="appreciate">赏析</button><button type="button" class="tmrp-btn" data-right-action="work-action" data-index="' + attr(i) + '" data-work-action="inscribe">题序</button><button type="button" class="tmrp-btn" data-right-action="work-action" data-index="' + attr(i) + '" data-work-action="echo">追和</button><button type="button" class="tmrp-btn" data-right-action="work-action" data-index="' + attr(i) + '" data-work-action="circulate">传抄</button>' + (w.isForbidden ? '<button type="button" class="tmrp-btn primary" data-right-action="work-action" data-index="' + attr(i) + '" data-work-action="unban">解禁</button>' : '<button type="button" class="tmrp-btn ' + (hot ? 'primary' : '') + '" data-right-action="work-action" data-index="' + attr(i) + '" data-work-action="ban">查禁</button>') + '</div>' +
          '</div></section>';
      }).join('') + '</div>' : '<section class="tmrp-card empty"><div class="tmrp-empty">暂无文事作品；人物著述或回合文事生成后会显示在这里。</div></section>') +
      '</div>';
  }

  function rightOpenWorkDetail(data){
    var works = rightWorks();
    var w = works[Number(data && data.index)];
    if (!w) return;
    if (w._source === 'GM.culturalWorks' && w._sourceIndex >= 0 && typeof window._showWorkDetail === 'function') {
      window._showWorkDetail(w._sourceIndex);
      return;
    }
    var title = w.title || w.name || '无题';
    var author = w.author || w.creator || '无名';
    var text = w.content || w.text || w.preview || w.narrativeContext || w.description || '暂无正文。';
    if (typeof window.openGenericModal === 'function') {
      window.openGenericModal('文苑详情', '<div style="padding:1rem;line-height:1.85;"><h3 style="margin-top:0;color:var(--gold);">' + esc(title) + '</h3><p style="color:var(--txt-s);">作者：' + esc(author) + '</p><div style="white-space:pre-wrap;">' + esc(text) + '</div></div>', null);
    } else {
      toast(title + ' · ' + compactText(text, 36));
    }
  }

  function rightHandleWorkAction(data){
    var works = rightWorks();
    var w = works[Number(data && data.index)];
    if (!w) return;
    var wa = (data && data.workAction) || 'appreciate';
    if (w._source === 'GM.culturalWorks' && w._sourceIndex >= 0 && typeof window._workAction === 'function') {
      window._workAction(w._sourceIndex, wa);
      return;
    }
    var labels = { appreciate:'赐阅赏析', inscribe:'御题赐序', echo:'追和', circulate:'传抄', ban:'查禁', unban:'解禁' };
    rightAddEdictSuggestion('文事艺府', w.author || '文苑', labels[wa] || wa, (labels[wa] || wa) + '《' + (w.title || w.name || '无题') + '》');
    toast('已纳入诏书建议库：' + (labels[wa] || wa));
  }

  function rightOpenGuokuLegacyAction(method){
    var map = {
      extraTax: '_guoku_extraTax',
      openGranary: '_guoku_openGranary',
      loan: '_guoku_takeLoan',
      loans: '_guoku_showLoans',
      advisor: '_guoku_fiscalAdvisor',
      caoyun: '_guoku_caoyunWarning',
      taxAdvisor: '_guoku_taxAdvisor'
    };
    openGuoku();
    var fnName = map[method || ''];
    if (!fnName) return;
    setTimeout(function(){
      var fn = window[fnName];
      if (typeof fn === 'function') fn();
      else toast('国库旧动作尚未载入：' + method);
    }, 80);
  }

  function rightSocNum(x, keys, fallback){
    return rightIssueNum(x, keys, fallback == null ? 50 : fallback);
  }

  function renderGangRich(){
    var tab = state.rightOutlineTab || 'classes';
    return '<div class="tmrp-outline-shell">' +
      '<div class="tmrp-tabs"><button type="button" class="' + (tab === 'classes' ? 'active' : '') + '" data-right-action="outline-tab" data-tab="classes">阶层</button><button type="button" class="' + (tab === 'parties' ? 'active' : '') + '" data-right-action="outline-tab" data-tab="parties">党派</button></div>' +
      (tab === 'parties' ? renderRightPartyPanel() : renderRightClassPanel()) +
      '</div>';
  }

  function renderRightClassPanel(){
    var rows = getClasses();
    var avg = rows.length ? Math.round(rows.reduce(function(s, c){ return s + rightSocNum(c, ['satisfaction','support','mood','loyalty'], 50); }, 0) / rows.length) : 0;
    var maxInf = rows.reduce(function(m, c){ return Math.max(m, rightSocNum(c, ['influence','power','weight'], 0)); }, 0);
    return '<div class="tmrp-summary"><div class="tmrp-stat"><b>' + esc(rows.length) + '</b><span>阶层</span></div><div class="tmrp-stat"><b>' + esc(avg) + '</b><span>平均满意</span></div><div class="tmrp-stat"><b>' + esc(maxInf) + '</b><span>最高影响</span></div></div>' +
      (rows.length ? '<div class="tmrp-scroll tall">' + rows.map(function(c){
        var sat = rightSocNum(c, ['satisfaction','support','mood','loyalty'], 50);
        var inf = rightSocNum(c, ['influence','power','weight'], 0);
        return '<section class="tmrp-card ' + (sat < 45 ? 'hot' : (sat > 62 ? 'ok' : '')) + '"><div class="tmrp-card-title"><span>' + esc(c.name || c.label || c.id || '未名阶层') + '</span><small>满意 ' + esc(Math.round(sat)) + ' · 影响 ' + esc(Math.round(inf)) + '</small></div>' +
          rightArmyBar('满意', sat) + rightArmyBar('影响', inf) +
          rightArmyRows([['规模', c.size || c.population || c.scale], ['经济角色', c.economicRole || c.role], ['法律地位', c.status], ['流动性', c.mobility], ['特权', c.privileges], ['义务', c.obligations], ['诉求', c.demands || c.currentDemand]]) +
          '<div class="tmrp-meta">' + esc(c.description || c.desc || '') + '</div></section>';
      }).join('') + '</div>' : '<section class="tmrp-card empty"><div class="tmrp-empty">暂无阶层数据。</div></section>');
  }

  function renderRightPartyPanel(){
    var rows = getParties();
    var active = rows.filter(function(p){ return /活跃|active/i.test(String(p.status || p.state || '')); }).length;
    var maxInf = rows.reduce(function(m, p){ return Math.max(m, rightSocNum(p, ['influence','power','weight'], 0)); }, 0);
    return '<div class="tmrp-summary"><div class="tmrp-stat"><b>' + esc(rows.length) + '</b><span>党派</span></div><div class="tmrp-stat"><b>' + esc(active) + '</b><span>活跃</span></div><div class="tmrp-stat"><b>' + esc(maxInf) + '</b><span>最高影响</span></div></div>' +
      (rows.length ? '<div class="tmrp-scroll tall">' + rows.map(function(p){
        var inf = rightSocNum(p, ['influence','power','weight'], 0);
        var status = p.status || p.state || '未录';
        var stance = p.policyStance || p.stances || p.agenda;
        var stanceHtml = (Array.isArray(stance) ? stance : [stance]).filter(Boolean).map(function(x){ return '<span class="tmrp-pill">' + esc(x) + '</span>'; }).join('');
        return '<section class="tmrp-card ' + (/活跃|active/i.test(String(status)) ? 'hot' : '') + '"><div class="tmrp-card-title"><span>' + esc(p.name || p.label || p.id || '未名党派') + '</span><small>' + esc(status) + ' · 影响 ' + esc(Math.round(inf)) + '</small></div>' +
          rightArmyBar('影响', inf) +
          rightArmyRows([['首领', p.leader || p.head], ['立场', p.ideology || p.stance], ['支持群体', p.base || p.supportBase], ['核心成员', p.members], ['当前议程', p.currentAgenda || p.agenda], ['短期目标', p.shortGoal], ['长期追求', p.longGoal]]) +
          '<div class="tmrp-chip-list">' + stanceHtml + '</div></section>';
      }).join('') + '</div>' : '<section class="tmrp-card empty"><div class="tmrp-empty">暂无党派数据。</div></section>');
  }

  function renderPinnedPeopleRich(){
    var ids = state.pinnedPeople || [];
    var people = ids.map(findPerson).filter(Boolean);
    var atCourt = people.filter(rightIssueAtCourt).length;
    var lowLoyal = people.filter(function(p){ return rightIssueNum(p, ['loyalty','loyal'], 50) < 45; }).length;
    if (!people.length) {
      return '<div class="tmrp-minister-shell"><div class="tmrp-summary"><div class="tmrp-stat"><b>0</b><span>钉选</span></div><div class="tmrp-stat"><b>0</b><span>在京</span></div><div class="tmrp-stat"><b>0</b><span>风险</span></div></div>' +
        '<section class="tmrp-card empty"><div class="tmrp-card-title"><span>百官人事</span><small>钉选后在此集中处置</small></div><div class="tmrp-empty">暂无钉选臣僚。可从人物图志或人物卡片钉选。</div>' +
        '<div class="tmrp-action-row"><button type="button" class="tmrp-btn primary" onclick="TMPhase8FormalBridge.openRenwu()">打开人物图志</button></div></section></div>';
    }
    return '<div class="tmrp-minister-shell"><div class="tmrp-summary"><div class="tmrp-stat"><b>' + esc(people.length) + '</b><span>钉选</span></div><div class="tmrp-stat"><b>' + esc(atCourt) + '</b><span>在京</span></div><div class="tmrp-stat"><b>' + esc(lowLoyal) + '</b><span>低忠</span></div></div>' +
      '<div class="tmrp-scroll tall">' + people.map(function(p){
        var key = personKey(p);
        return '<section class="tmrp-card tmrp-minister-card"><div class="tmrp-minister-face">' + rightIssuePortrait(p) + '</div><div class="tmrp-minister-main">' +
          '<div class="tmrp-card-title"><span>' + esc(p.name || key) + '</span><small>' + esc(p.title || p.office || p.role || p.faction || '未仕') + '</small></div>' +
          '<div class="tmrp-mini-grid"><div><span>忠</span><b>' + esc(p.loyalty || p.loyal || '未录') + '</b></div><div><span>智</span><b>' + esc(p.intelligence || p.wisdom || '未录') + '</b></div><div><span>政</span><b>' + esc(p.administration || p.politics || '未录') + '</b></div><div><span>军</span><b>' + esc(p.military || '未录') + '</b></div></div>' +
          '<div class="tmrp-action-row"><button type="button" class="tmrp-btn primary" onclick="TMPhase8FormalBridge.personAction(\'' + attr(key) + '\',\'detail\')">详阅</button><button type="button" class="tmrp-btn" onclick="TMPhase8FormalBridge.personAction(\'' + attr(key) + '\',\'wendui\')">问对</button><button type="button" class="tmrp-btn" onclick="TMPhase8FormalBridge.personAction(\'' + attr(key) + '\',\'letter\')">传书</button><button type="button" class="tmrp-btn" onclick="TMPhase8FormalBridge.personAction(\'' + attr(key) + '\',\'office\')">官制</button><button type="button" class="tmrp-btn" onclick="TMPhase8FormalBridge.unpin(\'' + attr(key) + '\')">移除</button></div>' +
          '</div></section>';
      }).join('') + '</div></div>';
  }

  function renderRumorRich(){
    var list = collectRecentEvents().slice(0, 12);
    var hot = list.filter(function(item){ return /危|乱|叛|灾|兵|饷|腐|急|警|hot|warn/i.test(String(item.type || '') + String(item.title || '') + String(item.text || '')); }).length;
    return '<div class="tmrp-rumor-shell">' +
      '<div class="tmrp-summary"><div class="tmrp-stat"><b>' + esc(list.length) + '</b><span>风闻</span></div><div class="tmrp-stat"><b>' + esc(hot) + '</b><span>待察</span></div><div class="tmrp-stat"><b>' + esc(state.eventLookback || 3) + '</b><span>回合</span></div></div>' +
      '<section class="tmrp-card"><div class="tmrp-card-title"><span>风闻情报</span><small>近事、邸报、人物与势力活动摘要</small></div><div class="tmrp-meta">这里读取事件栏同源数据，不另造静态传闻。可继续转入史官实录查看完整档案。</div></section>' +
      (list.length ? '<div class="tmrp-scroll tall">' + list.map(function(item){
        var cls = /危|乱|叛|灾|兵|饷|腐|急|警|hot|warn/i.test(String(item.type || '') + String(item.title || '') + String(item.text || '')) ? 'hot' : '';
        return '<section class="tmrp-card ' + cls + '"><div class="tmrp-card-title"><span>' + esc(item.title || '未题') + '</span><small>' + esc(item.type || '近事') + ' · T' + esc(item.turn || '') + '</small></div><div class="tmrp-meta">' + esc(item.text || item.detail || item.time || '') + '</div></section>';
      }).join('') + '</div>' : '<section class="tmrp-card empty"><div class="tmrp-empty">暂无可读取风闻。</div></section>') +
      '<section class="tmrp-card"><div class="tmrp-action-row"><button type="button" class="tmrp-btn primary" data-right-action="rumor-records">打开史官实录</button></div></section>' +
      '</div>';
  }

  function rightOfficeTree(){
    var gm = window.GM || {};
    var p = window.P || {};
    if (Array.isArray(gm.officeTree) && gm.officeTree.length) return gm.officeTree;
    if (Array.isArray(p.officeTree) && p.officeTree.length) return p.officeTree;
    if (p.government && Array.isArray(p.government.nodes) && p.government.nodes.length) return p.government.nodes;
    if (p.government && p.government.officeTree) {
      if (Array.isArray(p.government.officeTree)) return p.government.officeTree;
      if (p.government.officeTree.nodes && Array.isArray(p.government.officeTree.nodes)) return p.government.officeTree.nodes;
    }
    return [];
  }

  function rightOfficeChildren(n){
    return (n && (n.subs || n.children || n.departments || n.nodes)) || [];
  }

  function rightOfficeHolderText(p){
    if (!p) return '空缺';
    if (p.holder) return p.holder;
    if (Array.isArray(p.actualHolders)) {
      var names = p.actualHolders.map(function(h){ return h && (h.name || h.holder || h.character); }).filter(Boolean);
      if (names.length) return names.join('、');
    }
    if (Array.isArray(p.holders)) return p.holders.filter(Boolean).join('、') || '空缺';
    return '空缺';
  }

  function rightOfficeStats(nodes){
    var r = { depts: 0, pos: 0, filled: 0, vacant: 0 };
    function walk(list){
      (Array.isArray(list) ? list : []).forEach(function(n){
        if (!n) return;
        r.depts += 1;
        (Array.isArray(n.positions) ? n.positions : []).forEach(function(p){
          r.pos += 1;
          var holders = rightOfficeHolderText(p);
          if (holders && holders !== '空缺') r.filled += 1;
          else r.vacant += 1;
        });
        walk(rightOfficeChildren(n));
      });
    }
    walk(nodes);
    return r;
  }

  function rightOfficeTreasuryText(t){
    if (!t || typeof t !== 'object') return '';
    var parts = [];
    if (t.money != null) parts.push('银 ' + rightArmyFmtNum(t.money));
    if (t.grain != null) parts.push('粮 ' + rightArmyFmtNum(t.grain));
    if (t.cloth != null) parts.push('布 ' + rightArmyFmtNum(t.cloth));
    return parts.join(' / ');
  }

  function renderRightOfficeNode(n, depth){
    if (!n) return '';
    depth = depth || 0;
    var positions = Array.isArray(n.positions) ? n.positions : [];
    var children = rightOfficeChildren(n);
    var funcs = Array.isArray(n.functions) ? n.functions : [];
    return '<details class="tmrp-office-node" ' + (depth < 2 ? 'open' : '') + '>' +
      '<summary>' + esc(n.name || n.title || '未名衙门') + '<small>职位 ' + esc(positions.length) + ' · 下辖 ' + esc(children.length) + '</small></summary>' +
      (n.desc || n.description ? '<div class="tmrp-meta">' + esc(n.desc || n.description) + '</div>' : '') +
      (funcs.length ? '<div class="tmrp-chip-list">' + funcs.slice(0, 6).map(function(f){ return '<span class="tmrp-pill">' + esc(f) + '</span>'; }).join('') + '</div>' : '') +
      positions.map(function(p){
        var treasury = rightOfficeTreasuryText(p.publicTreasuryInit || p.publicTreasury || p.treasury);
        return '<div class="tmrp-office-pos"><b>' + esc(p.name || p.title || '未名官') + '</b>' +
          '<span class="tmrp-pill">' + esc(p.rank || p.grade || '未定品') + '</span>' +
          '<span class="tmrp-pill">' + esc(rightOfficeHolderText(p)) + '</span>' +
          '<div class="tmrp-meta">' + esc(p.duties || p.desc || p.description || '职责未录') + '</div>' +
          rightArmyRows([['继任', p.succession || p.appointment || '未录'], ['权限', p.authority || p.power || '未录'], ['公库', treasury || '未录']]) +
          '</div>';
      }).join('') +
      children.map(function(c){ return renderRightOfficeNode(c, depth + 1); }).join('') +
      '</details>';
  }

  function renderZhiRich(){
    var tree = rightOfficeTree();
    var s = rightOfficeStats(tree);
    return '<div class="tmrp-office-shell">' +
      '<div class="tmrp-summary"><div class="tmrp-stat"><b>' + esc(s.depts) + '</b><span>衙门</span></div><div class="tmrp-stat"><b>' + esc(s.filled + '/' + s.pos) + '</b><span>在任/职位</span></div><div class="tmrp-stat"><b>' + esc(s.vacant) + '</b><span>空缺</span></div></div>' +
      '<section class="tmrp-card"><div class="tmrp-card-title"><span>官制总览</span><small>衙门、层级、职位、任职、权限、公库</small></div>' +
      '<div class="tmrp-action-row"><button type="button" class="tmrp-btn primary" data-right-action="office-standalone">进入官制衙门</button><button type="button" class="tmrp-btn" data-right-action="office-people">荐贤廷推</button><button type="button" class="tmrp-btn" data-right-action="office-edict">拟任免诏</button></div></section>' +
      (tree.length ? '<div class="tmrp-scroll tall tmrp-office-tree">' + tree.map(function(n){ return renderRightOfficeNode(n, 0); }).join('') + '</div>' : '<section class="tmrp-card empty"><div class="tmrp-empty">当前剧本尚未载入官制树。</div></section>') +
      '</div>';
  }

  var renderers = {
    ol: renderGangRich,
    issue: renderZheng,
    policy: renderWenRich,
    office: renderPinnedPeopleRich,
    army: renderArmy,
    map: renderMapPanelRich,
    finance: renderFinanceRich,
    rumor: renderRumorRich,
    archive: renderZhiRich
  };

  var titles = {
    ol: '纲纪总览',
    issue: '政务问对',
    policy: '文事科举',
    office: '钉选臣僚',
    army: '军务边防',
    map: '舆图政区',
    finance: '户部财计',
    rumor: '风闻情报',
    archive: '官制衙门'
  };

  function rightPanelInput(id){
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function rightChaoyiModeLabel(mode){
    return mode === 'changchao' ? '常朝' : (mode === 'yuqian' ? '御前会议' : '廷议');
  }

  function rightSelectedPersonFromData(data){
    var p = findPerson(data && data.id);
    if (!p) p = rightSelectedWenduiPerson();
    return p;
  }

  function rightAppendWenduiHistory(name, text, role){
    if (!name || !window.GM) return;
    if (!GM.wenduiHistory) GM.wenduiHistory = {};
    if (!Array.isArray(GM.wenduiHistory[name])) GM.wenduiHistory[name] = [];
    GM.wenduiHistory[name].push({
      role: role || 'system',
      content: text,
      turn: GM.turn || 1,
      source: 'phase8-right-issue'
    });
  }

  function rightWenduiCeremonyLabel(kind){
    return {
      seat:'赐座', stand:'不赐座', tea:'赐茶', wine:'赐酒',
      confront:'召人对质', suggest:'摘入建议库', reward:'赏', punish:'罚'
    }[kind] || '问对动作';
  }

  function rightAddEdictSuggestion(source, from, topic, content){
    if (!content || !window.GM) return false;
    if (!GM._edictSuggestions) GM._edictSuggestions = [];
    GM._edictSuggestions.push({
      source: source || '问对',
      from: from || '御前',
      topic: topic || '',
      content: content,
      turn: GM.turn || 1,
      used: false
    });
    try { if (typeof window._renderEdictSuggestions === 'function') window._renderEdictSuggestions(); } catch(_) {}
    return true;
  }

  function rightOpenWendui(data){
    var p = rightSelectedPersonFromData(data || {});
    if (!p) { toast('暂无可问对人物'); return; }
    if (!rightIssueAtCourt(p)) { rightOpenLetter(data); return; }
    var name = p.name || personKey(p);
    var mode = state.rightWenduiMode || 'formal';
    var prefill = rightPanelInput('tmrp-wendui-input');
    if (window.GM) {
      GM.wenduiTarget = name;
      GM._pendingWenduiChar = name;
    }
    closeDeskOverlay();
    closeModule();
    closeRightDrawer();
    if (typeof window.openWenduiModal === 'function') {
      window.openWenduiModal(name, mode, prefill);
    } else if (typeof window.openWenduiPick === 'function') {
      window.openWenduiPick(name);
    } else {
      state.modulePerson = personKey(p);
      openModule('wendui');
    }
    returnFormalHomeSoon();
  }

  function rightOpenWenduiPick(data){
    var p = rightSelectedPersonFromData(data || {});
    if (!p) { toast('暂无可问对人物'); return; }
    if (!rightIssueAtCourt(p)) { rightOpenLetter(data); return; }
    var name = p.name || personKey(p);
    if (window.GM) {
      GM.wenduiTarget = name;
      GM._pendingWenduiChar = name;
    }
    closeDeskOverlay();
    closeModule();
    closeRightDrawer();
    if (typeof window.openWenduiPick === 'function') {
      window.openWenduiPick(name);
    } else if (typeof openWenduiPick === 'function') {
      openWenduiPick(name);
    } else if (typeof window.openWenduiModal === 'function') {
      window.openWenduiModal(name, 'formal');
    } else {
      state.modulePerson = personKey(p);
      openModule('wendui');
    }
    returnFormalHomeSoon();
  }

  function rightOpenWenduiAudience(data){
    var p = rightSelectedPersonFromData(data || {});
    if (!p) { toast('暂无求见人物'); return; }
    if (!rightIssueIsPlayerFactionPerson(p)) { toast('此人不属本朝可直接问对人员，请走使节或鸿雁流程'); return; }
    if (!rightIssueAtCourt(p)) { toast('此人不在御前，不能直接接见'); return; }
    var name = p.name || personKey(p);
    closeDeskOverlay();
    closeModule();
    closeRightDrawer();
    if (typeof window._wdOpenAudience === 'function') {
      window._wdOpenAudience(name);
    } else if (typeof _wdOpenAudience === 'function') {
      _wdOpenAudience(name);
    } else if (typeof window.openWenduiModal === 'function') {
      window.openWenduiModal(name, 'formal');
    } else {
      toast('问对流程未加载');
    }
    returnFormalHomeSoon();
  }

  function rightOpenWenduiQueue(data){
    var idx = Number(data && data.index);
    if (!Number.isFinite(idx)) return;
    closeDeskOverlay();
    closeModule();
    closeRightDrawer();
    if (typeof window._wdOpenAudienceQueue === 'function') {
      window._wdOpenAudienceQueue(idx);
    } else if (typeof _wdOpenAudienceQueue === 'function') {
      _wdOpenAudienceQueue(idx);
    } else {
      toast('待见流程未加载');
    }
    returnFormalHomeSoon();
  }

  function rightDismissWenduiQueue(data){
    var idx = Number(data && data.index);
    if (!Number.isFinite(idx) || !window.GM) return;
    if (typeof window._wdDismissPending === 'function') {
      window._wdDismissPending(idx);
    } else if (typeof _wdDismissPending === 'function') {
      _wdDismissPending(idx);
    } else if (Array.isArray(GM._pendingAudiences) && GM._pendingAudiences[idx]) {
      GM._pendingAudiences.splice(idx, 1);
      toast('已暂却待见');
    }
    openPanel('issue');
  }

  function rightDenyWenduiAudience(data){
    var p = rightSelectedPersonFromData(data || {});
    if (!p) return;
    var name = p.name || personKey(p);
    if (typeof window._wdDenyAudience === 'function') {
      window._wdDenyAudience(name);
    } else if (typeof _wdDenyAudience === 'function') {
      _wdDenyAudience(name);
    } else {
      if (window.NpcMemorySystem && typeof NpcMemorySystem.remember === 'function') {
        NpcMemorySystem.remember(name, '求见皇帝被拒于殿外', '忧', 4, '天子');
      }
      toast(name + '的求见被拒');
    }
    openPanel('issue');
  }

  function rightOpenLetter(data){
    var p = rightSelectedPersonFromData(data || {});
    if (!p) { toast('暂无传书对象'); return; }
    var name = p.name || personKey(p);
    if (window.GM) GM._pendingLetterTo = name;
    state.letterTarget = name;
    state.letterDraft = state.letterDraft || {};
    state.letterDraft.to = name;
    saveFormalDraftsToGM(false);
    closeDeskOverlay();
    closeModule();
    closeRightDrawer();
    if (typeof openHongyanPreviewPanel === 'function') openHongyanPreviewPanel();
    else openModule('letter');
  }

  function rightRecordChaoyi(kind, decision, text){
    var gm = window.GM || {};
    if (!gm.recentChaoyi) gm.recentChaoyi = [];
    var topic = rightPanelInput('tmrp-chaoyi-topic') || state.rightChaoyiTopic || '未题';
    var mode = state.rightChaoyiMode || 'changchao';
    var date = (typeof window.getTSText === 'function') ? window.getTSText(gm.turn || 1) : ('第 ' + (gm.turn || 1) + ' 回合');
    var row = {
      turn: gm.turn || 1,
      date: date,
      kind: kind || rightChaoyiModeLabel(mode),
      mode: mode,
      topic: topic,
      decision: decision || '',
      line: text || '',
      source: 'phase8-right-issue'
    };
    gm.recentChaoyi.unshift(row);
    if (typeof window.addEB === 'function') {
      try { window.addEB('朝议', rightChaoyiModeLabel(mode) + '·' + topic + (decision ? '·' + decision : '')); } catch(_) {}
    }
    return row;
  }

  function rightOpenChaoyi(){
    var gm = window.GM || {};
    var mode = state.rightChaoyiMode || 'changchao';
    var topic = rightPanelInput('tmrp-chaoyi-topic') || state.rightChaoyiTopic || '';
    var line = rightPanelInput('tmrp-chaoyi-line');
    gm._phase8ChaoyiPrefill = { mode:mode, topic:topic, line:line, turn:gm.turn || 1 };
    if (topic) gm._pendingChaoyiTopic = topic;
    closeDeskOverlay();
    closeModule();
    closeRightDrawer();
    if (typeof window.openChaoyi === 'function') {
      var old = document.getElementById('chaoyi-modal');
      if (old) old.remove();
      window.openChaoyi();
      if (!document.getElementById('chaoyi-modal')) return;
      try {
        var pick = window._cy_pickMode;
        if (typeof pick !== 'function' && typeof _cy_pickMode === 'function') pick = _cy_pickMode;
        if (typeof pick === 'function') {
          pick(mode);
          rightApplyChaoyiPrefill(mode, topic, line);
        } else {
          var modal = document.getElementById('chaoyi-modal');
          if (modal) modal.remove();
          toast('朝议流程未加载');
        }
      } catch(e) {
        try { window.TM && TM.errors && TM.errors.captureSilent(e, 'phase8-right-chaoyi-open'); } catch(_) {}
      }
      return;
    }
    openModule('chaoyi', { mode: mode === 'changchao' ? 'routine' : mode });
  }

  function rightApplyChaoyiPrefill(mode, topic, line){
    var inp = document.getElementById('cy-player-input');
    if (inp && line) inp.value = line;
    if (!topic) return;
    var topicInput = null;
    if (mode === 'tinyi') topicInput = document.getElementById('ty2-topic');
    else if (mode === 'yuqian') topicInput = document.getElementById('yq2-topic');
    if (topicInput && !topicInput.value) topicInput.value = topic;
  }

  function rightCloseArmyFlyout(){
    var old = document.getElementById('tm-army-detail-flyout');
    if (old) old.remove();
  }

  function rightOpenArmyFlyout(key){
    var army = rightFindArmy(key) || rightArmyList()[0];
    if (!army) { toast('暂无可查看部队'); return; }
    state.selectedArmy = rightArmyKey(army, rightArmyList().indexOf(army));
    rightCloseArmyFlyout();
    var fly = document.createElement('aside');
    fly.id = 'tm-army-detail-flyout';
    fly.className = 'tm-army-detail-flyout';
    fly.innerHTML = '<div class="tm-army-detail-head"><b>部队详情</b><button type="button" data-army-close="1">×</button></div>' + renderRightArmyDetailCard(army);
    fly.addEventListener('click', function(e){
      var close = e.target && e.target.closest ? e.target.closest('[data-army-close]') : null;
      if (close) {
        e.preventDefault();
        rightCloseArmyFlyout();
        return;
      }
      var btn = e.target && e.target.closest ? e.target.closest('[data-right-action]') : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      handleRightPanelAction(btn.dataset.rightAction, btn.dataset);
    });
    document.body.appendChild(fly);
  }

  function refreshArmyFlyout(){
    var fly = document.getElementById('tm-army-detail-flyout');
    if (!fly) return false;
    var army = rightFindArmy(state.selectedArmy) || rightArmyList()[0];
    if (!army) {
      rightCloseArmyFlyout();
      return false;
    }
    state.selectedArmy = rightArmyKey(army, rightArmyList().indexOf(army));
    fly.innerHTML = '<div class="tm-army-detail-head"><b>部队详情</b><button type="button" data-army-close="1">×</button></div>' + renderRightArmyDetailCard(army);
    return true;
  }

  function rightSelectArmy(data){
    var key = data && data.id;
    var army = rightFindArmy(key);
    if (!army) { toast('未找到该部队'); return; }
    state.selectedArmy = rightArmyKey(army, rightArmyList().indexOf(army));
    openPanel('army');
    rightOpenArmyFlyout(state.selectedArmy);
  }

  function rightArmyCommand(data){
    var army = rightFindArmy(data && data.id) || rightFindArmy(state.selectedArmy);
    if (!army) { toast('暂无可处置部队'); return; }
    var name = rightArmyName(army);
    var cmd = data && data.command;
    if (cmd === 'orders') {
      rightOpenArmyFlyout(rightArmyKey(army, rightArmyList().indexOf(army)));
      toast('已展开 ' + name + ' 军令详情');
    } else if (cmd === 'pay') {
      state.selectedArmy = rightArmyKey(army, rightArmyList().indexOf(army));
      openPanel('finance');
      toast('已转入户部财计，可核查 ' + name + ' 岁饷');
    } else if (cmd === 'train') {
      rightAddEdictSuggestion('军务边防', name, '整训军队', '命 ' + name + ' 整饬营伍、核实兵额、补足器械，并回奏训练成效。');
      toast('已纳入诏书建议库：整训 ' + name);
    } else if (cmd === 'redeploy') {
      rightAddEdictSuggestion('军务边防', name, '调防军队', '议定 ' + name + ' 调防路线、粮饷供给与接防期限，不得擅离驻地。');
      toast('已纳入诏书建议库：调防 ' + name);
    } else if (cmd === 'chaoyi') {
      state.rightIssueTab = 'chaoyi';
      state.rightChaoyiMode = 'tinyi';
      state.rightChaoyiTopic = name + ' 军务处置';
      openPanel('issue');
    }
  }

  function handleRightPanelAction(action, data){
    data = data || {};
    if (action === 'issue-tab') {
      state.rightIssueTab = data.tab || 'wendui';
      openPanel('issue');
    } else if (action === 'outline-tab') {
      state.rightOutlineTab = data.tab || 'classes';
      openPanel('ol');
    } else if (action === 'wendui-select') {
      state.rightWenduiPerson = data.id || '';
      openPanel('issue');
    } else if (action === 'wendui-mode') {
      state.rightWenduiMode = data.mode || 'formal';
      openPanel('issue');
    } else if (action === 'wendui-pick') {
      rightOpenWenduiPick(data);
    } else if (action === 'wendui-audience') {
      rightOpenWenduiAudience(data);
    } else if (action === 'wendui-queue') {
      rightOpenWenduiQueue(data);
    } else if (action === 'wendui-dismiss') {
      rightDismissWenduiQueue(data);
    } else if (action === 'wendui-deny') {
      rightDenyWenduiAudience(data);
    } else if (action === 'wendui-open') {
      rightOpenWendui(data);
    } else if (action === 'wendui-letter') {
      rightOpenLetter(data);
    } else if (action === 'wendui-note') {
      var p = rightSelectedPersonFromData(data);
      if (!p) return;
      var name = p.name || personKey(p);
      var text = rightPanelInput('tmrp-wendui-input') || ('【' + (state.rightWenduiMode === 'private' ? '私下叙谈' : '朝堂问对') + '】皇帝召问' + name + '，记其待对。');
      rightAppendWenduiHistory(name, text, 'system');
      toast('已记入问对记录');
      openPanel('issue');
    } else if (action === 'wendui-ceremony') {
      var cp = rightSelectedPersonFromData(data);
      if (!cp) return;
      var cname = cp.name || personKey(cp);
      var kind = data.kind || '';
      if (kind === 'suggest') {
        var sug = rightPanelInput('tmrp-wendui-input') || rightIssueTopic(cp);
        rightAddEdictSuggestion('问对', cname, '御前问对', sug);
        toast('已摘入诏书建议库');
      } else {
        var label = rightWenduiCeremonyLabel(kind);
        rightAppendWenduiHistory(cname, '【' + label + '】皇帝于问对中对' + cname + '行此处置。', 'system');
        toast('已记录问对动作：' + label);
      }
      openPanel('issue');
    } else if (action === 'chaoyi-mode') {
      state.rightChaoyiMode = data.mode || 'changchao';
      openPanel('issue');
    } else if (action === 'chaoyi-launch') {
      state.rightChaoyiMode = data.mode || state.rightChaoyiMode || 'changchao';
      rightOpenChaoyi();
    } else if (action === 'chaoyi-topic') {
      state.rightChaoyiTopic = data.topic || '';
      openPanel('issue');
    } else if (action === 'chaoyi-start') {
      rightOpenChaoyi();
    } else if (action === 'chaoyi-record') {
      var line = rightPanelInput('tmrp-chaoyi-line');
      var r = rightRecordChaoyi(rightChaoyiModeLabel(state.rightChaoyiMode || 'changchao'), '记起居注', line);
      if (window.GM) {
        if (!Array.isArray(GM.qijuHistory)) GM.qijuHistory = [];
        GM.qijuHistory.unshift({
          turn: GM.turn || 1,
          date: r.date,
          content: '【' + r.kind + '】议「' + r.topic + '」' + (line ? '。上谕：' + line : '。')
        });
      }
      toast('已记入起居注');
      openPanel('issue');
    } else if (action === 'chaoyi-norecord') {
      if (window.GM) GM._phase8ChaoyiNoRecord = true;
      toast('已标记本次御前议事不主动入录');
    } else if (action === 'chaoyi-quick') {
      var decision = data.decision || '已议';
      rightRecordChaoyi(rightChaoyiModeLabel(state.rightChaoyiMode || 'changchao'), decision, rightPanelInput('tmrp-chaoyi-line'));
      toast('已记录朝议预案：' + decision);
      openPanel('issue');
    } else if (action === 'army-select') {
      rightSelectArmy(data);
    } else if (action === 'army-command') {
      rightArmyCommand(data);
    } else if (action === 'office-people') {
      openPanel('office');
    } else if (action === 'office-standalone') {
      openOfficeStandalone();
    } else if (action === 'office-edict') {
      rightAddEdictSuggestion('官制衙门', '吏部', '官职任免', '请据官制空缺、臣工资望与朝议形势，拟定任免官员诏令。');
      toast('已纳入诏书建议库：官职任免');
    } else if (action === 'office-refresh') {
      openOfficeStandalone();
    } else if (action === 'admin-edict') {
      var area = data.name || '地方';
      var kind = data.kind || '处置';
      rightAddEdictSuggestion('行政区划', area, kind, '命有司就' + area + '办理' + kind + '，核实主官、钱粮、民心与地方积弊，限期回奏。');
      toast('已纳入诏书建议库：' + area + '·' + kind);
    } else if (action === 'finance-module') {
      openGuoku();
    } else if (action === 'finance-old') {
      rightOpenGuokuLegacyAction(data.method);
    } else if (action === 'finance-edict') {
      var fk = data.kind || '财计处置';
      rightAddEdictSuggestion('户部财计', '户部', fk, '命户部就' + fk + '核算太仓、内帑、收支、军饷与长期财源，列明可行方案。');
      toast('已纳入诏书建议库：' + fk);
    } else if (action === 'work-action') {
      rightHandleWorkAction(data);
    } else if (action === 'work-detail') {
      rightOpenWorkDetail(data);
    } else if (action === 'rumor-records') {
      openShiluPreviewPanel();
    }
  }

  function bindRightPanelActions(host){
    if (!host || host.__phase8RightPanelActions) return;
    host.__phase8RightPanelActions = true;
    host.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('[data-right-action]') : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      handleRightPanelAction(btn.dataset.rightAction, btn.dataset);
    });
  }

  // ── public API attach (Wave 3·rightrail panels + dispatch) ──
  bridge.rightrail = bridge.rightrail || {};
  bridge.rightrail.renderers = renderers;
  bridge.rightrail.titles = titles;
  bridge.rightrail.handleRightPanelAction = handleRightPanelAction;
  bridge.rightrail.bindRightPanelActions = bindRightPanelActions;
  bridge.rightrail.rightCloseArmyFlyout = rightCloseArmyFlyout;
  bridge.rightrail.rightOpenArmyFlyout = rightOpenArmyFlyout;
  bridge.rightrail.refreshArmyFlyout = typeof refreshArmyFlyout === "function" ? refreshArmyFlyout : null;
})();
