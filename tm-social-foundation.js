// tm-social-foundation.js — 社会层地基：阶层结构基线/稳定器 + 议程引擎 + 党派单源对账（2026-06-12）
// 三件事：
// ① 结构基线：满意度不再是「无主随机游走的积分器」——每回合从实况（税负/灾域/战区/欠饷/民心）
//    派生各阶层「应然势位」，实际满意度向它缓变回归（±1.2/回合·闸外恢复通道）。
//    暴跌必有结构性理由，低谷有恢复路径，近账可查——治「无缘无故跌到 0」。
// ② 议程引擎：诉求 = 结构化条目（seed 本位 + struct 结构触发 + ai 补充槽），按各阶层
//    暴露度确定性派生，议程必然各异且随局势消长；条件解除自动「得偿」回satisfaction——治「议程都一样」。
// ③ 党派对账：parties[]（剧本/AI/UI 面）与 partyState（引擎面）双写者每回合合流——治双源漂移。
// 跨朝代通用：只读通用引擎数据（taxFactor/statusEffects/warZone/payArrears），文案按身份桶取词，
// 朝代专名只能来自剧本 demands 种子。
(function(global) {
  'use strict';
  var TM = global.TM = global.TM || {};

  function clamp(n, min, max) {
    n = Number(n);
    if (!isFinite(n)) n = 0;
    return Math.max(min, Math.min(max, n));
  }
  function round2(n) { return Math.round(Number(n) * 100) / 100; }
  function toArray(v) {
    if (Array.isArray(v)) return v.slice();
    if (v === undefined || v === null || v === '') return [];
    return [v];
  }
  function compact(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n || 80); }
  function numOr(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

  // ── 区划叶子（镜像 class-minxin-bridge 的取法） ──
  function leafDivisions(P, GM) {
    var leaves = [];
    function walk(nodes) {
      toArray(nodes).forEach(function(node) {
        if (!node || typeof node !== 'object') return;
        var kids = toArray(node.children || node.divisions || node.subs);
        if (!kids.length) leaves.push(node);
        else walk(kids);
      });
    }
    [P && P.adminHierarchy, GM && GM.adminHierarchy].forEach(function(ah) {
      if (!ah || typeof ah !== 'object' || leaves.length) return;
      if (Array.isArray(ah.divisions)) walk(ah.divisions);
      else Object.keys(ah).forEach(function(k) {
        var fac = ah[k];
        walk(fac && (fac.divisions || fac.children || fac.subs));
      });
    });
    return leaves;
  }

  // ── 结构输入：一回合算一次，挂 GM._socialStructInputs ──
  function structuralInputs(GM, P) {
    GM = GM || {};
    var turn = numOr(GM.turn, 0);
    var cached = GM._socialStructInputs;
    if (cached && cached.turn === turn) return cached;
    var leaves = leafDivisions(P, GM);
    var n = leaves.length;
    var FP = TM.FieldPipes;
    var taxSum = 0, taxN = 0, disasterN = 0, warN = 0, mxSum = 0, mxN = 0;
    leaves.forEach(function(div) {
      if (FP && typeof FP.taxBurdenFactor === 'function') {
        var tf = Number(FP.taxBurdenFactor(div));
        if (isFinite(tf) && tf > 0) { taxSum += tf; taxN++; }
      }
      var hasDisaster = toArray(div.statusEffects).some(function(e) { return e && e.kind === 'disaster'; })
        || numOr(div.disasterPenalty, 0) > 0.05;
      if (hasDisaster) disasterN++;
      if (div.warZone || div._warZone || div.isWarZone) warN++;
      var mx = Number(div.minxin);
      if (isFinite(mx)) { mxSum += mx; mxN++; }
    });
    var arrSum = 0, arrN = 0;
    toArray(GM.armies).forEach(function(a) {
      if (!a || typeof a !== 'object') return;
      arrSum += clamp(numOr(a.payArrearsMonths, 0), 0, 12);
      arrN++;
    });
    var corrSum = 0, corrN = 0;
    var subDepts = GM.corruption && GM.corruption.subDepts;
    if (subDepts && typeof subDepts === 'object') {
      Object.keys(subDepts).forEach(function(k) {
        var v = subDepts[k];
        var c = Number(v && typeof v === 'object' ? (v.corruption != null ? v.corruption : v.value) : v);
        if (isFinite(c)) { corrSum += c; corrN++; }
      });
    }
    var inputs = {
      turn: turn,
      leaves: n,
      taxFactor: taxN ? round2(taxSum / taxN) : 1,
      disasterShare: n ? round2(disasterN / n) : 0,
      warShare: n ? round2(warN / n) : 0,
      arrearsMonths: arrN ? round2(arrSum / arrN) : 0,
      minxin: mxN ? round2(mxSum / mxN) : numOr(GM.minxin && (GM.minxin.trueIndex != null ? GM.minxin.trueIndex : GM.minxin.index), 55),
      corruption: corrN ? round2(corrSum / corrN) : 0
    };
    GM._socialStructInputs = inputs;
    return inputs;
  }

  // ── 身份桶（跨朝代通用：按经济角色/通称取桶，朝代专名不进引擎） ──
  function bucketOf(cls) {
    if (!cls) return 'agrarian';
    var name = String(cls.name || '');
    var role = String(cls.economicRole || cls.role || '');
    var status = String(cls.status || '');
    if (/军|兵|卒|戍|武/.test(name) || /军/.test(status)) return 'military';
    if (/僧|道|寺|庙|教|祝|巫/.test(name) || /宗教/.test(role)) return 'clergy';
    if (/治理/.test(role) || /皇族|宗亲|贵/.test(status)) return 'governing';
    if (/商|贾|匠|工|市|坊/.test(name) || /经营|流通|工商/.test(role)) return 'trade';
    return 'agrarian';
  }

  // ── 暴露度：优先用剧本 economicIndicators，缺省按身份桶 ──
  var EXPOSURE_BY_BUCKET = {
    agrarian:  { tax: 0.8, disaster: 1.0, war: 0.6, arrears: 0 },
    trade:     { tax: 0.6, disaster: 0.5, war: 0.4, arrears: 0 },
    military:  { tax: 0.4, disaster: 0.5, war: 1.0, arrears: 1 },
    governing: { tax: 0.15, disaster: 0.3, war: 0.3, arrears: 0 },
    clergy:    { tax: 0.3, disaster: 0.6, war: 0.3, arrears: 0 }
  };
  function classExposure(cls) {
    var bucket = bucketOf(cls);
    var base = EXPOSURE_BY_BUCKET[bucket] || EXPOSURE_BY_BUCKET.agrarian;
    var exp = { bucket: bucket, tax: base.tax, disaster: base.disaster, war: base.war, arrears: base.arrears };
    var ei = cls && cls.economicIndicators;
    var tb = Number(ei && ei.taxBurden);
    if (isFinite(tb) && tb >= 0) exp.tax = round2(clamp(tb / 100, 0, 1));
    return exp;
  }

  // ── 结构基线：实况 → 各阶层「应然势位」 ──
  function structuralBaseline(cls, inputs) {
    inputs = inputs || {};
    var exp = classExposure(cls);
    var parts = [];
    var base = 55;
    var taxHit = (numOr(inputs.taxFactor, 1) - 1) * 45 * exp.tax;
    if (Math.abs(taxHit) >= 1) { base -= taxHit; parts.push((taxHit > 0 ? '税负沉重' : '赋役宽减') + round2(-taxHit)); }
    else base -= taxHit;
    var disHit = Math.min(numOr(inputs.disasterShare, 0) * 40, 18) * exp.disaster;
    if (disHit >= 1) { base -= disHit; parts.push('灾域' + Math.round(numOr(inputs.disasterShare, 0) * 100) + '%·-' + round2(disHit)); }
    else base -= disHit;
    var warHit = Math.min(numOr(inputs.warShare, 0) * 50, 20) * exp.war;
    if (warHit >= 1) { base -= warHit; parts.push('兵燹-' + round2(warHit)); }
    else base -= warHit;
    var arrHit = Math.min(numOr(inputs.arrearsMonths, 0) * 3, 15) * exp.arrears;
    if (arrHit >= 1) { base -= arrHit; parts.push('欠饷-' + round2(arrHit)); }
    else base -= arrHit;
    if (exp.bucket === 'agrarian' || exp.tax >= 0.5) {
      var mxAdj = (numOr(inputs.minxin, 55) - 55) * 0.15;
      base += mxAdj;
      if (Math.abs(mxAdj) >= 1) parts.push('民心' + (mxAdj > 0 ? '+' : '') + round2(mxAdj));
    }
    if (exp.bucket === 'governing') base += 6;
    return { baseline: round2(clamp(base, 5, 95)), parts: parts, exposure: exp };
  }

  // ── 议程引擎 ──
  // 文案按 kind×身份桶取词（通用古语，朝代专名只能来自剧本种子）
  var AGENDA_TEXT = {
    tax: { agrarian: '减田赋·缓加派', trade: '减市税·弛关榷', military: '足军食·免摊买', governing: '减浮派·清虚耗', clergy: '免常住杂派' },
    disaster: { agrarian: '开仓赈济·蠲灾域钱粮', trade: '平籴止饥·宽灾年逋欠', military: '拨粮济军屯', governing: '遣使察灾·议蠲免', clergy: '施粥济民·请蠲寺租' },
    war: { agrarian: '止兵燹·守乡土', trade: '靖商路·护行旅', military: '增戍备·恤阵亡', governing: '议和战·固城守', clergy: '禳兵灾·安流亡' },
    arrears: { military: '清积欠·发饷银' },
    corruption: { governing: '惩贪墨·肃吏治', agrarian: '惩苛吏·禁私敛', trade: '禁勒索·平市税', military: '惩克扣·查空额', clergy: '禁渔夺常住' }
  };
  function agendaText(kind, bucket) {
    var row = AGENDA_TEXT[kind] || {};
    return row[bucket] || row.agrarian || '';
  }

  function ensureAgenda(cls, turn) {
    if (!cls._agenda || typeof cls._agenda !== 'object' || !Array.isArray(cls._agenda.items)) {
      cls._agenda = { items: [], builtTurn: turn };
    }
    // 本位种子只取一次快照——之后任何覆盖都不丢身份
    if (!Array.isArray(cls._seedDemands)) {
      var raw = cls.demands;
      var text = Array.isArray(raw) ? raw.join('·') : String(raw || '');
      cls._seedDemands = text.split(/[·;；，,、/]/).map(function(x) { return x.trim(); }).filter(Boolean).slice(0, 4);
      cls._seedDemands.forEach(function(t, i) {
        cls._agenda.items.push({ id: 'seed:' + i, kind: 'seed', text: compact(t, 40), urgency: 1, sinceTurn: turn, source: 'seed' });
      });
    }
    return cls._agenda;
  }

  function structTriggers(cls, inputs, exp) {
    var list = [];
    if (numOr(inputs.taxFactor, 1) >= 1.12 && exp.tax >= 0.45) {
      list.push({ kind: 'tax', urgency: inputs.taxFactor >= 1.25 ? 3 : 2 });
    }
    if (numOr(inputs.disasterShare, 0) >= 0.08 && exp.disaster >= 0.5) {
      list.push({ kind: 'disaster', urgency: inputs.disasterShare >= 0.25 ? 3 : 2 });
    }
    if (numOr(inputs.warShare, 0) >= 0.05 && exp.war >= 0.5) {
      list.push({ kind: 'war', urgency: inputs.warShare >= 0.2 ? 3 : 2 });
    }
    if (numOr(inputs.arrearsMonths, 0) >= 1 && exp.arrears >= 0.8) {
      list.push({ kind: 'arrears', urgency: inputs.arrearsMonths >= 3 ? 3 : 2 });
    }
    if (numOr(inputs.corruption, 0) >= 60 && (exp.bucket === 'governing' || exp.tax >= 0.6)) {
      list.push({ kind: 'corruption', urgency: 2 });
    }
    return list;
  }

  function rebuildDemandString(cls) {
    var items = (cls._agenda && cls._agenda.items || []).slice()
      .sort(function(a, b) {
        if ((b.urgency || 1) !== (a.urgency || 1)) return (b.urgency || 1) - (a.urgency || 1);
        return (b.sinceTurn || 0) - (a.sinceTurn || 0);
      });
    if (!items.length) return;
    cls.demands = items.slice(0, 3).map(function(it) { return it.text; }).join('·');
    cls.currentDemand = items[0].text;
  }

  // AI/校准器补充诉求：只占一个槽位，不再整体覆盖
  function setAiDemand(root, cls, text, info) {
    if (!cls || typeof cls !== 'object') return false;
    text = compact(Array.isArray(text) ? text.join('·') : text, 60);
    if (!text) return false;
    info = info || {};
    var turn = numOr(info.turn != null ? info.turn : root && root.turn, 0);
    var agenda = ensureAgenda(cls, turn);
    var slot = null;
    agenda.items.forEach(function(it) { if (it && it.id === 'ai:demand') slot = it; });
    if (slot) {
      slot.text = text;
      slot.sinceTurn = turn;
      slot.urgency = 2;
    } else {
      agenda.items.push({ id: 'ai:demand', kind: 'ai', text: text, urgency: 2, sinceTurn: turn, source: compact(info.source || 'ai', 30) });
    }
    rebuildDemandString(cls);
    return true;
  }

  function tickClassAgenda(GM, cls, inputs, turn) {
    var exp = classExposure(cls);
    var agenda = ensureAgenda(cls, turn);
    var active = structTriggers(cls, inputs, exp);
    var activeKinds = {};
    active.forEach(function(t) { activeKinds[t.kind] = t; });
    var changed = false;
    // 条件解除 → 得偿：移条目 + 满意度小幅回礼（过总闸）
    var kept = [];
    agenda.items.forEach(function(it) {
      if (!it) return;
      if (it.kind !== 'seed' && it.kind !== 'ai' && !activeKinds[it.kind]) {
        changed = true;
        if (!Array.isArray(cls._agendaResolved)) cls._agendaResolved = [];
        cls._agendaResolved.push({ t: turn, kind: it.kind, text: it.text });
        if (cls._agendaResolved.length > 6) cls._agendaResolved = cls._agendaResolved.slice(-6);
        var CE = TM.ClassEngine;
        if (CE && typeof CE.gateSatisfaction === 'function') {
          CE.gateSatisfaction(GM, cls, 2, { turn: turn, source: 'agenda-resolved', reason: '诉求得偿·' + it.text });
        }
        return;
      }
      kept.push(it);
    });
    agenda.items = kept;
    // 新触发 → 立项；既有 → 续期/升级
    active.forEach(function(t) {
      var found = null;
      agenda.items.forEach(function(it) { if (it && it.kind === t.kind && it.id === 'struct:' + t.kind) found = it; });
      if (!found) {
        agenda.items.push({
          id: 'struct:' + t.kind, kind: t.kind, text: agendaText(t.kind, exp.bucket) || agendaText(t.kind, 'agrarian'),
          urgency: t.urgency, sinceTurn: turn, source: 'struct'
        });
        changed = true;
      } else {
        var dur = turn - numOr(found.sinceTurn, turn);
        var want = Math.max(t.urgency, dur >= 6 ? 3 : 1);
        if (found.urgency !== want) { found.urgency = want; changed = true; }
      }
    });
    if (agenda.items.length > 8) agenda.items = agenda.items.slice(-8);
    if (changed || !agenda._strung) { rebuildDemandString(cls); agenda._strung = true; }
    return changed;
  }

  // ── 稳定器：满意度向结构基线缓变（闸外恢复通道·近账可查） ──
  function tickClassDrift(GM, cls, inputs, turn) {
    var sb = structuralBaseline(cls, inputs);
    cls._structBaseline = sb.baseline;
    cls._structParts = sb.parts.slice(0, 4);
    var sat = Number(cls.satisfaction);
    if (!isFinite(sat)) return 0;
    var drift = clamp((sb.baseline - sat) * 0.12, -1.2, 1.2);
    if (Math.abs(drift) < 0.05) return 0;
    cls.satisfaction = round2(clamp(sat + drift, 0, 100));
    if (!Array.isArray(cls._satLedger)) cls._satLedger = [];
    cls._satLedger.push({
      t: turn, d: round2(drift), src: 'struct-drift',
      why: '结构回归·势位' + sb.baseline + (sb.parts.length ? '·' + sb.parts.slice(0, 2).join('·') : '')
    });
    if (cls._satLedger.length > 12) cls._satLedger = cls._satLedger.slice(-12);
    return drift;
  }

  // ── 地域分账（2026-06-12 backlog 落地）：阶层 regionalVariants 活化 ──
  // 同一阶层在不同地块境遇悬殊（陕西自耕农 vs 江南自耕农）。变体满意度向「当地实况」
  // 派生的局部基线缓变——地方灾异/兵燹只压当地分账，全国账仍由全国基线管。
  function localInputsFor(GM, P, regionName) {
    GM = GM || {};
    var turn = numOr(GM.turn, 0);
    if (!GM._socialLocalInputs || GM._socialLocalInputs.turn !== turn) {
      GM._socialLocalInputs = { turn: turn, byRegion: {} };
    }
    var key = compact(regionName, 40);
    if (!key) return null;
    if (GM._socialLocalInputs.byRegion[key] !== undefined) return GM._socialLocalInputs.byRegion[key];
    // 找顶级区划：名字双向包含（剧本 variant.region 常是「陕西」「江南苏松」类泛称）
    var root = null;
    [P && P.adminHierarchy, GM && GM.adminHierarchy].forEach(function(ah) {
      if (root || !ah || typeof ah !== 'object') return;
      var tops = [];
      if (Array.isArray(ah.divisions)) tops = ah.divisions;
      else Object.keys(ah).forEach(function(k) {
        var fac = ah[k];
        toArray(fac && (fac.divisions || fac.children || fac.subs)).forEach(function(d) { tops.push(d); });
      });
      for (var i = 0; i < tops.length && !root; i += 1) {
        var n = String(tops[i] && tops[i].name || '');
        if (!n) continue;
        if (n.indexOf(key) >= 0 || key.indexOf(n) >= 0) root = tops[i];
      }
    });
    if (!root) { GM._socialLocalInputs.byRegion[key] = null; return null; }
    var leaves = [];
    (function walk(d) {
      var kids = toArray(d.children || d.divisions || d.subs);
      if (!kids.length) leaves.push(d);
      else kids.forEach(walk);
    })(root);
    var FP = TM.FieldPipes;
    var taxSum = 0, taxN = 0, disasterN = 0, warN = 0, mxSum = 0, mxN = 0;
    leaves.forEach(function(div) {
      if (FP && typeof FP.taxBurdenFactor === 'function') {
        var tf = Number(FP.taxBurdenFactor(div));
        if (isFinite(tf) && tf > 0) { taxSum += tf; taxN++; }
      }
      var hasDisaster = toArray(div.statusEffects).some(function(e) { return e && e.kind === 'disaster'; })
        || numOr(div.disasterPenalty, 0) > 0.05;
      if (hasDisaster) disasterN++;
      if (div.warZone || div._warZone || div.isWarZone) warN++;
      var mx = Number(div.minxin);
      if (isFinite(mx)) { mxSum += mx; mxN++; }
    });
    var national = structuralInputs(GM, P);
    var n = leaves.length;
    var out = !n ? null : {
      turn: turn,
      leaves: n,
      taxFactor: taxN ? round2(taxSum / taxN) : national.taxFactor,
      disasterShare: round2(disasterN / n),
      warShare: round2(warN / n),
      arrearsMonths: national.arrearsMonths,
      minxin: mxN ? round2(mxSum / mxN) : national.minxin,
      corruption: national.corruption
    };
    GM._socialLocalInputs.byRegion[key] = out;
    return out;
  }

  function tickClassRegional(GM, P, cls, inputs, turn) {
    var variants = toArray(cls.regionalVariants).filter(function(v) { return v && v.region; });
    if (!variants.length) return 0;
    var moved = 0;
    variants.slice(0, 8).forEach(function(v) {
      var li = localInputsFor(GM, P, String(v.region));
      var sb = structuralBaseline(cls, li || inputs);
      var cur = Number(v._satLocal != null ? v._satLocal : v.satisfaction);
      if (!isFinite(cur)) cur = numOr(cls.satisfaction, 50);
      var drift = clamp((sb.baseline - cur) * 0.12, -1.5, 1.5);
      v._satLocal = round2(clamp(cur + drift, 0, 100));
      v.satisfaction = Math.round(v._satLocal);
      v._structBaseline = sb.baseline;
      if (Math.abs(drift) >= 0.05) moved++;
    });
    return moved;
  }

  // AI 指域事件（class_changes.region）：只动当地分账（全国账已由 gateSatisfaction 管）
  function applyRegionalDelta(root, cls, regionName, delta, info) {
    if (!cls || typeof cls !== 'object') return false;
    var key = compact(regionName, 40);
    var d = clamp(Number(delta), -12, 12);
    if (!key || !d) return false;
    var variants = toArray(cls.regionalVariants);
    var hit = null;
    for (var i = 0; i < variants.length && !hit; i += 1) {
      var rn = String(variants[i] && variants[i].region || '');
      if (rn && (rn.indexOf(key) >= 0 || key.indexOf(rn) >= 0)) hit = variants[i];
    }
    if (!hit) return false;
    var cur = Number(hit._satLocal != null ? hit._satLocal : hit.satisfaction);
    if (!isFinite(cur)) cur = numOr(cls.satisfaction, 50);
    hit._satLocal = round2(clamp(cur + d, 0, 100));
    hit.satisfaction = Math.round(hit._satLocal);
    hit._lastDeltaTurn = numOr(info && info.turn != null ? info.turn : root && root.turn, 0);
    return true;
  }

  // ── 党派单源对账：parties[]（canonical）与 partyState（引擎）双写者合流 ──
  function syncPartyTruth(GM) {
    GM = GM || {};
    var parties = toArray(GM.parties);
    var ps = GM.partyState;
    var out = { synced: 0, engineMerged: 0, agendaRefreshed: 0 };
    if (!parties.length || !ps || typeof ps !== 'object') return out;
    var turn = numOr(GM.turn, 0);
    parties.forEach(function(p) {
      if (!p || !p.name || !ps[p.name]) return;
      var st = ps[p.name];
      ['influence', 'cohesion'].forEach(function(key) {
        var canonical = Number(p[key]);
        if (!isFinite(canonical)) canonical = key === 'influence' ? 30 : 50;
        var last = Number(st['_synced_' + key]);
        var engineDelta = isFinite(last) ? (numOr(st[key], canonical) - last) : 0;
        engineDelta = clamp(engineDelta, -10, 10);
        if (engineDelta) {
          canonical = clamp(canonical + engineDelta, 0, 100);
          out.engineMerged++;
          if (!Array.isArray(st.historyLog)) st.historyLog = [];
          st.historyLog.push({ turn: turn, field: key, delta: round2(engineDelta), reason: '朝局推移并账' });
          if (st.historyLog.length > 16) st.historyLog = st.historyLog.slice(-16);
        }
        p[key] = round2(canonical);
        st[key] = p[key];
        st['_synced_' + key] = p[key];
      });
      // 议程保鲜：8 回合无鲜议程且有活跃目标 → 由 top 目标派生
      var agendaTurn = Number(p._agendaTurn);
      var stale = !isFinite(agendaTurn) || (turn - agendaTurn) >= 8;
      if (stale && TM.PartyGoals && typeof TM.PartyGoals.getActiveGoals === 'function') {
        try {
          var goals = TM.PartyGoals.getActiveGoals(GM, p, { turn: turn, source: 'social-foundation' });
          var top = goals && goals[0];
          var text = top && compact(top.text, 60);
          if (text && text !== compact(p.currentAgenda, 60)) {
            p.currentAgenda = text;
            p._agendaTurn = turn;
            p._agendaSource = 'party-goal';
            out.agendaRefreshed++;
          }
        } catch (_goalE) {}
      }
      out.synced++;
    });
    return out;
  }

  // ── 总 tick：endturn-core 挂载 ──
  function tick(GM, P) {
    GM = GM || (typeof global.GM === 'object' ? global.GM : {});
    P = P || (typeof global.P === 'object' ? global.P : {});
    var out = { classes: 0, drifted: 0, agendaChanged: 0, party: null };
    var turn = numOr(GM.turn, 0);
    var classes = toArray(GM.classes).filter(function(c) { return c && typeof c === 'object' && (c.name || c.className); });
    if (classes.length) {
      var inputs = structuralInputs(GM, P);
      classes.forEach(function(cls) {
        out.classes++;
        if (tickClassAgenda(GM, cls, inputs, turn)) out.agendaChanged++;
        if (tickClassDrift(GM, cls, inputs, turn)) out.drifted++;
        out.regionalMoved = (out.regionalMoved || 0) + tickClassRegional(GM, P, cls, inputs, turn);
      });
    }
    out.party = syncPartyTruth(GM);
    GM._socialFoundationLastTick = { turn: turn, classes: out.classes, drifted: out.drifted, agendaChanged: out.agendaChanged, party: out.party };
    return out;
  }

  var api = {
    structuralInputs: structuralInputs,
    classExposure: classExposure,
    bucketOf: bucketOf,
    structuralBaseline: structuralBaseline,
    ensureAgenda: ensureAgenda,
    setAiDemand: setAiDemand,
    rebuildDemandString: rebuildDemandString,
    localInputsFor: localInputsFor,
    applyRegionalDelta: applyRegionalDelta,
    syncPartyTruth: syncPartyTruth,
    tick: tick
  };
  TM.SocialFoundation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
