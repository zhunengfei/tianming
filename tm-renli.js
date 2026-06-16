/* ============================================================
 * tm-renli.js — 人力 / 徭役 / 农政层（R1 数据底座 + R2 农政 tick + R3 满意度/裂口）
 *
 * 设计案：docs/renli-yaoyi-design-2026-06.md（§〇·五 单一真相源架构 + 附录 R0 契约）
 *
 * 单一真相源铁律（R0 裁定）：
 *   · 丁的家 = adminHierarchy 叶子「人口对象」(populationDetail 优先, 否则 population)——ding 总量真相源。
 *   · 丁「分配」(务农/役/征/免) = 叶子人口对象 alloc —— 农政层独占写者。
 *   · 逃亡/隐丁 写既有叶子字段 fugitives/hiddenCount（喂既有 fleeTaxPenalty 等）；
 *     实际在地丁 present = ding − fugitives。Renli **绝不写 ding 总量**（避开多写者纠缠·甲口径）。
 *   · 满意度只经 TM.ClassEngine.gateSatisfaction 总闸（闸缺则不动·永不直写·防跳楼）。
 *   · GM.renli 只存农政派生 + 役政策 + 近账 + 官报雾，绝无任何丁计数（防第三本账）。
 * ============================================================ */
(function () {
  'use strict';

  // ── 常量 ──────────────────────────────────────────────────────────────
  var ALLOC_KEYS = ['farm', 'corvee', 'draft', 'exempt']; // 务农 / 应役 / 应征 / 优免
  var FORBIDDEN_DING_KEYS = ['ding', 'registeredDing', 'hiddenDing', 'commendedDing',
    'fledDing', 'exemptDing', 'mouths', 'households', 'population', 'alloc']; // 不得入 GM.renli

  var SEED_DEFAULTS = { soilBase: 70, waterworks: 50, doubleCropping: 1.0, laborMarketDepth: 0.2 };

  // R2 农业
  var RHO_STAR = 0.25;   // 精耕基准密度（丁/亩）
  var RHO_MIN = 0.15;    // 粗放下限（低于此弃地抛荒）
  var BASE_YIELD = 1.5;  // 基准亩产（石/亩）
  var STRENGTH_CAP = { light: 0.15, normal: 0.25, heavy: 0.40, extreme: 0.55 }; // R6 诏书用

  // R3 满意度 / 缺粮 / 裂口
  var SUBSIST = 0.83;     // 民食 = 口 × subsistence（石/口/回合）
  var CORVEE_LINE = 0.20; // 可持续役负线
  var K_ROLE = 80;        // 役负满意度系数
  var K_GRAIN = 60;       // 缺粮满意度系数
  var FLEE_A = 0.15;      // 逃亡·役负项
  var FLEE_B = 0.10;      // 逃亡·缺粮项
  var FLEE_CAP = 0.6;     // 累计逃亡上限（×ding）
  var HIDE_C = 0.05;      // 隐丁·征发项
  var COMMEND_K = 0.08;   // 诡寄·役负项（自耕农投献士绅避役）
  var VARIANT_CAP = 6;    // 地域分账变体每回合 ±上限（ungated·与既有 social-foundation 同范式）
  var SAT_SOURCE = 'renli-corvee-grain';

  function num(v, d) { var n = Number(v); return isFinite(n) ? n : (d === undefined ? 0 : d); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, num(n))); }

  function _P() {
    if (typeof P !== 'undefined' && P) return P;
    if (typeof window !== 'undefined' && window.P) return window.P;
    if (typeof global !== 'undefined' && global.P) return global.P;
    return null;
  }
  function _classEngine() {
    if (typeof TM !== 'undefined' && TM && TM.ClassEngine) return TM.ClassEngine;
    if (typeof window !== 'undefined' && window.TM && window.TM.ClassEngine) return window.TM.ClassEngine;
    if (typeof global !== 'undefined' && global.TM && global.TM.ClassEngine) return global.TM.ClassEngine;
    return null;
  }

  // ── 叶子枚举 / 人口对象 ────────────────────────────────────────────────
  function leaves(Pp) {
    Pp = Pp || _P();
    if (!Pp || !Pp.adminHierarchy) return [];
    var IB = (typeof IntegrationBridge !== 'undefined' && IntegrationBridge)
      || (typeof window !== 'undefined' && window.IntegrationBridge)
      || (typeof global !== 'undefined' && global.IntegrationBridge) || null;
    if (IB && typeof IB.getLeafDivisions === 'function') {
      try { var r = IB.getLeafDivisions(Pp.adminHierarchy, 'player'); if (r && r.length) return r; } catch (_) {}
    }
    var out = [];
    var fac = Pp.adminHierarchy.player || Pp.adminHierarchy[Object.keys(Pp.adminHierarchy)[0]];
    (function walk(nodes) {
      if (!Array.isArray(nodes)) return;
      nodes.forEach(function (n) {
        if (!n) return;
        var kids = n.children || n.divisions || null;
        if (kids && kids.length) walk(kids); else out.push(n);
      });
    })(fac && fac.divisions);
    return out;
  }

  function regionIdOf(leaf) { return String((leaf && (leaf.id || leaf.name)) || ''); }

  // canonical 人口对象——绝不凭空新造平行账
  function popOf(leaf) {
    if (!leaf) return null;
    if (leaf.populationDetail && typeof leaf.populationDetail === 'object') return leaf.populationDetail;
    if (leaf.population && typeof leaf.population === 'object') return leaf.population;
    return null;
  }

  function presentDing(pd) { return Math.max(0, num(pd.ding, 0) - num(pd.fugitives, 0)); } // 实际在地丁

  // ── R1：ensure / 种子 / 近账 ───────────────────────────────────────────
  function ensureLeafFields(leaf) {
    var pd = popOf(leaf);
    if (!pd) return null;
    if (!pd.alloc || typeof pd.alloc !== 'object') pd.alloc = {};
    ALLOC_KEYS.forEach(function (k) { if (typeof pd.alloc[k] !== 'number') pd.alloc[k] = 0; });
    if (typeof pd.registeredDing !== 'number') pd.registeredDing = num(pd.ding, 0); // 册载丁默认=实在丁
    return pd;
  }

  function ensureRegion(GM, regionId, seed) {
    if (!GM.renli) GM.renli = { byRegion: {}, reported: {} };
    if (!GM.renli.byRegion) GM.renli.byRegion = {};
    if (!GM.renli.reported) GM.renli.reported = {};
    var r = GM.renli.byRegion[regionId];
    if (!r) {
      r = GM.renli.byRegion[regionId] = {
        soil: clamp((seed && seed.soilBase != null) ? seed.soilBase : SEED_DEFAULTS.soilBase, 0, 100),
        cultivatedLand: 0, fallowLand: 0, corveeRate: 0,
        levyPolicy: { strength: 'normal', remitTurns: 0 }, ledger: []
      };
    }
    if (!GM.renli.reported[regionId]) GM.renli.reported[regionId] = { corveeRate: 0, fallowShare: 0 };
    return r;
  }

  function ensureDefaults(GM, Pp) {
    if (!GM) return null;
    Pp = Pp || _P();
    if (!GM.renli) GM.renli = { byRegion: {}, reported: {} };
    leaves(Pp).forEach(function (leaf) { ensureLeafFields(leaf); ensureRegion(GM, regionIdOf(leaf), leaf && leaf.renliSeed); });
    return GM.renli;
  }

  function seedRegion(GM, Pp, regionId, seed) {
    Pp = Pp || _P();
    seed = Object.assign({}, SEED_DEFAULTS, seed || {});
    var ls = leaves(Pp), leaf = null;
    for (var i = 0; i < ls.length; i++) { if (regionIdOf(ls[i]) === String(regionId)) { leaf = ls[i]; break; } }
    if (!leaf) return null;
    leaf.renliSeed = seed;
    var pd = ensureLeafFields(leaf);
    if (pd && seed.registeredDing != null) pd.registeredDing = Math.max(0, Math.round(num(seed.registeredDing, pd.ding)));
    if (pd && seed.registeredLand != null) pd.registeredLand = Math.max(0, Math.round(num(seed.registeredLand, 0)));
    var r = ensureRegion(GM, String(regionId), seed);
    r.soil = clamp(seed.soilBase, 0, 100);
    return { leaf: leaf, region: r };
  }

  function ledgerPush(GM, regionId, key, delta, why, src) {
    var r = ensureRegion(GM, String(regionId));
    if (!Array.isArray(r.ledger)) r.ledger = [];
    r.ledger.push({ turn: num(GM.turn, 0), key: String(key || ''), delta: num(delta, 0), why: String(why || ''), src: String(src || 'renli') });
    if (r.ledger.length > 8) r.ledger = r.ledger.slice(-8);
    return r.ledger;
  }

  function getRegion(GM, regionId) {
    return (GM && GM.renli && GM.renli.byRegion) ? GM.renli.byRegion[String(regionId)] : null;
  }

  // 可征丁 = 在地丁 − 优免（优免取 canonical pd.exemptDing·与 tick 一致）
  function levyableDing(leaf) {
    var pd = popOf(leaf); if (!pd) return 0;
    var present = presentDing(pd);
    return Math.max(0, present - Math.min(num(pd.exemptDing, 0), present));
  }

  // 分配不变量：务农+役+征 ≤ 实在丁（不超总丁·逃亡发生于分配之后故用 ding 上界）；优免 ⊆ 务农；各项 ≥0
  function allocValid(leaf) {
    var pd = popOf(leaf); if (!pd || !pd.alloc) return true;
    var a = pd.alloc, ding = num(pd.ding, 0);
    var farm = num(a.farm, 0), corvee = num(a.corvee, 0), draft = num(a.draft, 0), exempt = num(a.exempt, 0);
    if (farm < 0 || corvee < 0 || draft < 0 || exempt < 0) return false;
    if ((farm + corvee + draft) > ding + 1) return false; // 分配不超总丁
    if (exempt > farm + 1) return false;                  // 优免 ⊆ 务农
    return true;
  }

  function assertNoDingInRenli(GM) {
    var bad = [];
    var br = (GM && GM.renli && GM.renli.byRegion) || {};
    Object.keys(br).forEach(function (rid) {
      var r = br[rid] || {};
      FORBIDDEN_DING_KEYS.forEach(function (k) { if (Object.prototype.hasOwnProperty.call(r, k)) bad.push(rid + '.' + k); });
    });
    return bad;
  }

  // ── R3：农户类定位 / 地域分账变体 ──────────────────────────────────────
  function findFarmerClass(GM) {
    var cs = (GM && Array.isArray(GM.classes)) ? GM.classes : [];
    for (var i = 0; i < cs.length; i++) { var c = cs[i]; if (c && /农/.test(String(c.name || c.className || ''))) return c; }
    for (var j = 0; j < cs.length; j++) { var d = cs[j]; if (d && /农|生产/.test(String(d.economicRole || ''))) return d; }
    return null;
  }

  // 地域分账：局部变体满意度（±VARIANT_CAP/回合·ungated·与既有 social-foundation 范式一致）
  function applyRegionalVariant(cls, regionId, delta) {
    if (!cls || !delta) return;
    if (!Array.isArray(cls.regionalVariants)) cls.regionalVariants = [];
    var v = null;
    for (var i = 0; i < cls.regionalVariants.length; i++) { var rv = cls.regionalVariants[i]; if (rv && String(rv.region) === String(regionId)) { v = rv; break; } }
    if (!v) { v = { region: String(regionId), satisfaction: num(cls.satisfaction, 50) }; cls.regionalVariants.push(v); }
    var d = clamp(delta, -VARIANT_CAP, VARIANT_CAP);
    v.satisfaction = clamp(num(v.satisfaction, 50) + d, 0, 100);
  }

  // ── R2/R3：农政 tick ──────────────────────────────────────────────────
  function _qOf(rho) {
    if (rho >= RHO_STAR) return 1.0;
    if (rho >= RHO_MIN) return clamp(0.7 + 3 * (rho - RHO_MIN), 0.7, 1.0);
    return 0.7;
  }
  function _regLandOf(leaf, pd) {
    var rl = num(pd.registeredLand, 0); if (rl > 0) return rl;
    if (leaf.environment && num(leaf.environment.arableLand, 0) > 0) return num(leaf.environment.arableLand, 0);
    return num(pd.arableLand, 0);
  }

  // 单地域 tick（确定性·闭式·每地 O(1)）。写 alloc + 既有 fugitives/hiddenCount + GM.renli 派生；不动 ding 总量。
  function tickLeaf(GM, leaf) {
    var pd = popOf(leaf); if (!pd) return null;
    ensureLeafFields(leaf);
    var rid = regionIdOf(leaf);
    var seed = leaf.renliSeed || {};
    var r = ensureRegion(GM, rid, seed);

    var ding = Math.max(0, num(pd.ding, 0));                 // 实在丁（真相源·只读）
    var present = presentDing(pd);                            // 在地丁 = ding − 逃亡
    var exempt = Math.min(Math.max(0, num(pd.exemptDing, 0)), present); // 优免（R4 由 gongming 填）
    var leviable = Math.max(0, present - (r.tanding ? 0 : exempt)); // 可征丁（摊丁入亩后优免不再蔽役·役随田走·R8）

    // 劳动力分流（R3.5：役 corvee + 军役 draft 共争同一可征丁池 → 军农争丁）
    var pol = r.levyPolicy || (r.levyPolicy = { strength: 'normal', remitTurns: 0 });
    var lm = clamp(num(seed.laborMarketDepth, SEED_DEFAULTS.laborMarketDepth), 0, 0.95);
    var demand = Math.max(0, num(pol.corveeDemand, 0));        // 役需(丁)·R6/诏书设
    var draftDemand = Math.max(0, num(pol.draftDemand, 0));    // 募兵+民夫转运需(丁)·R3.5·campaign/诏书设
    var commuted = Math.round(demand * lm);                    // 募役折银（不抽田丁·军役不折银）
    var wanted = Math.max(0, demand - commuted);
    var remit = num(pol.remitTurns, 0) > 0;
    var draftLevied = remit ? 0 : Math.min(draftDemand, leviable);                       // 军役优先（募兵补边）
    var corveeLevied = remit ? 0 : Math.min(wanted, Math.max(0, leviable - draftLevied)); // 役从可征余抽
    var levied = draftLevied + corveeLevied;                   // 总抽田丁（军农争夺）
    var farm = Math.max(0, present - levied);                  // 务农丁（优免也务农）
    pd.alloc = { farm: farm, corvee: corveeLevied, draft: draftLevied, exempt: exempt };
    var corveeRate = leviable > 0 ? (levied / leviable) : 0;   // 役负率=总抽/可征（含军役加负）

    // 农政层激活条件：仅「已种子(renliSeed)且有地数据」的地域才算粮/饥荒/逃亡/满意度；
    // 其余惰性（只留 alloc·良性）——R3 在 live 游戏对未种子地域零行为变更，待 R4 种子+校准激活。
    var regLand = _regLandOf(leaf, pd);
    if (!leaf.renliSeed || regLand <= 0) {
      r.cultivatedLand = 0; r.fallowLand = 0;
      r.corveeRate = Math.round(corveeRate * 10000) / 10000;
      r.grainOutput = 0; r.foodNeed = 0; r.foodDeficit = 0; r.signal = 0;
      return { regionId: rid, present: present, corveeRate: corveeRate, deficit: 0, signal: 0 };
    }

    // 双边际 + 粮产
    var soil = clamp(num(r.soil, seed.soilBase != null ? seed.soilBase : SEED_DEFAULTS.soilBase), 5, 95);
    var weather = clamp(num(r.weather, 1.0), 0.3, 1.3);
    var dc = num(seed.doubleCropping, SEED_DEFAULTS.doubleCropping);
    var ww = clamp(num(r.waterworks != null ? r.waterworks : seed.waterworks, SEED_DEFAULTS.waterworks), 0, 100);
    var rho = regLand > 0 ? (farm / regLand) : 0;
    var cult, fallow;
    if (regLand <= 0) { cult = 0; fallow = 0; }
    else if (rho >= RHO_MIN) { cult = regLand; fallow = 0; }
    else { cult = Math.round(farm / RHO_MIN); fallow = Math.max(0, regLand - cult); }
    var Q = _qOf(rho);
    var grain = Math.round(cult * BASE_YIELD * (soil / 100) * Q * dc * weather);

    // 缺粮（饥荒·R3）：民食 = 口 × subsistence；不含赋（赋由 cascade）
    var foodNeed = Math.round(num(pd.mouths, 0) * SUBSIST);
    var deficit = Math.max(0, foodNeed - grain);
    var deficitRatio = foodNeed > 0 ? (deficit / foodNeed) : 0;

    // 满意度原始信号（役负 + 缺粮）——交 tick() 过总闸·本函数不写满意度
    var sRole = -K_ROLE * Math.max(0, corveeRate - CORVEE_LINE);
    var sGrain = -K_GRAIN * deficitRatio;
    var signal = sRole + sGrain;

    // 三裂口（R3·写既有叶子字段·不动 ding 总量）：逃亡 + 隐丁（诡寄待 R4 优免归集）
    if (present > 0) {
      var fleeFrac = clamp(FLEE_A * Math.max(0, corveeRate - CORVEE_LINE) + FLEE_B * deficitRatio, 0, 0.5);
      var newFug = Math.round(present * fleeFrac);
      if (newFug > 0) {
        pd.fugitives = Math.min(num(pd.fugitives, 0) + newFug, Math.round(ding * FLEE_CAP)); // 逃亡→既有 fugitives
        ledgerPush(GM, rid, 'fugitives', newFug, '役负/缺粮逃亡', 'renli');
      }
      var hideFrac = clamp(HIDE_C * Math.max(0, corveeRate - CORVEE_LINE), 0, 0.2);
      var newHid = Math.round(present * hideFrac);
      if (newHid > 0) pd.hiddenCount = num(pd.hiddenCount, 0) + newHid; // 隐丁→既有 hiddenCount
      // 诡寄（R4）：役重→自耕农投献士绅避役（留田务农·转入优免不可征）→ commendedDing（下回合 refreshExempt 折叠进 exempt）
      var commendFrac = clamp(COMMEND_K * Math.max(0, corveeRate - CORVEE_LINE), 0, 0.3);
      var newCommend = Math.round(leviable * commendFrac);
      if (newCommend > 0) { pd.commendedDing = Math.min(num(pd.commendedDing, 0) + newCommend, Math.round(ding * 0.5)); ledgerPush(GM, rid, 'commended', newCommend, '役重诡寄投献', 'renli'); }
    }

    // 地力慢变（影响下回合）
    var dSoil = 0;
    if (rho < RHO_STAR) dSoil -= 2;
    if (weather < 0.85) dSoil -= 1;
    if (rho >= RHO_STAR && ww >= 60) dSoil += 1;
    r.soil = clamp(soil + dSoil, 5, 95);

    r.cultivatedLand = cult; r.fallowLand = fallow;
    r.corveeRate = Math.round(corveeRate * 10000) / 10000;
    r.rho = Math.round(rho * 10000) / 10000;
    r.q = Math.round(Q * 10000) / 10000;
    r.grainOutput = grain; r.foodNeed = foodNeed; r.foodDeficit = deficit;
    r.signal = Math.round(signal * 100) / 100;
    if (num(pol.remitTurns, 0) > 0) pol.remitTurns = num(pol.remitTurns, 0) - 1; // 蠲免倒计（R6）
    return { regionId: rid, present: present, corveeRate: corveeRate, deficit: deficit, signal: signal };
  }

  // 全图 tick：逐地域算 → 写局部地域分账变体 → 人口加权聚合过总闸（单地失败隔离）
  function tick(GM, Pp) {
    if (!GM) return;
    Pp = Pp || _P();
    if (!GM.renli) GM.renli = { byRegion: {}, reported: {} };
    var farmers = findFarmerClass(GM);
    var accW = 0, accSig = 0;
    leaves(Pp).forEach(function (leaf) {
      var res; try { res = tickLeaf(GM, leaf); } catch (_) { res = null; }
      if (!res) return;
      if (res.present > 0 && res.signal !== 0) { accW += res.present; accSig += res.signal * res.present; }
      if (farmers && res.signal !== 0) applyRegionalVariant(farmers, res.regionId, res.signal); // 地域分账（局部）
    });
    // 全局 农户：人口加权聚合 → 过 gateSatisfaction 总闸（绝不直写·闸缺则不动→防跳楼）
    if (farmers && accW > 0) {
      var agg = accSig / accW;
      var CE = _classEngine();
      if (agg !== 0 && CE && typeof CE.gateSatisfaction === 'function') {
        try { CE.gateSatisfaction(GM, farmers, agg, { turn: num(GM.turn, 0), source: SAT_SOURCE, reason: '役负/缺粮' }); } catch (_) {}
      }
    }
  }

  // ── R3.5：战争定位毁地（兵燹）──────────────────────────────────────────
  // 把战斗位置匹配到「已种子」前线地域（id/name 双向包含·只认已种子）
  function _seededRegionMatch(GM, Pp, name) {
    if (!name) return null;
    name = String(name);
    var ls = leaves(Pp);
    for (var i = 0; i < ls.length; i++) {
      var leaf = ls[i]; if (!leaf || !leaf.renliSeed) continue;
      var rid = regionIdOf(leaf);
      if (rid && (rid === name || name.indexOf(rid) >= 0 || rid.indexOf(name) >= 0)) return { leaf: leaf, rid: rid };
    }
    return null;
  }

  // 对单地域施加兵燹：平民逃散(→既有 fugitives·不写 ding 总量) + 地力/水利毁损。仅已种子地域。
  function warScar(GM, Pp, regionId, opts) {
    Pp = Pp || _P(); opts = opts || {};
    var ls = leaves(Pp), leaf = opts.leaf || null;
    if (!leaf) { for (var i = 0; i < ls.length; i++) { if (regionIdOf(ls[i]) === String(regionId)) { leaf = ls[i]; break; } } }
    if (!leaf || !leaf.renliSeed) return null; // 仅已种子前线（live 安全）
    var pd = popOf(leaf); if (!pd) return null;
    var seed = leaf.renliSeed || {};
    var r = ensureRegion(GM, String(regionId), seed);
    var ding = Math.max(1, num(pd.ding, 0));
    var present = presentDing(pd);
    var sev = (opts.severity != null) ? clamp(opts.severity, 0, 1) : clamp(num(opts.casualties, 0) / ding, 0, 0.5); // 烈度=伤亡/丁
    if (sev <= 0) return null;
    var flee = Math.round(present * sev * 0.5); // 兵燹驱民
    if (flee > 0) { pd.fugitives = Math.min(num(pd.fugitives, 0) + flee, Math.round(ding * FLEE_CAP)); ledgerPush(GM, String(regionId), 'fugitives', flee, '兵燹驱民', 'war'); }
    var soilHit = Math.round(sev * 30), waterHit = Math.round(sev * 20);
    r.soil = clamp(num(r.soil, seed.soilBase != null ? seed.soilBase : SEED_DEFAULTS.soilBase) - soilHit, 5, 95);
    r.waterworks = clamp(num(r.waterworks != null ? r.waterworks : seed.waterworks, SEED_DEFAULTS.waterworks) - waterHit, 0, 100);
    ledgerPush(GM, String(regionId), 'soil', -soilHit, '兵燹毁地', 'war');
    r._warScarTurn = num(GM.turn, 0);
    return { regionId: String(regionId), flee: flee, soilHit: soilHit, waterHit: waterHit, severity: sev };
  }

  // 战斗结算钩子（tm-military.applyBattleResult 一行调用·全包解析·非前线/未种子=no-op）
  function warScarFromBattle(GM, Pp, br, result) {
    if (!GM) return null;
    Pp = Pp || _P(); br = br || {}; result = result || {};
    var loc = br.location || br.targetCity || br.city || '';
    if (!loc && Array.isArray(result.affectedArmies)) {
      for (var i = 0; i < result.affectedArmies.length; i++) { var s = result.affectedArmies[i]; if (s && (s.location || s.garrison)) { loc = s.location || s.garrison; break; } }
    }
    var m = _seededRegionMatch(GM, Pp, loc);
    if (!m) return null; // 非已种子前线 → no-op
    var cas = 0;
    var list = (result.applied && result.applied.casualties) || result.affectedArmies || [];
    for (var j = 0; j < list.length; j++) { var c = list[j]; cas += Math.max(0, num(c && (c.loss != null ? c.loss : c.casualties), 0)); }
    return warScar(GM, Pp, m.rid, { casualties: cas, leaf: m.leaf });
  }

  // ── R4：优免按地域归集（接 tm-gongming）+ 诡寄折叠 ─────────────────────────
  function _gongming() {
    if (typeof TMGongming !== 'undefined' && TMGongming) return TMGongming;
    if (typeof window !== 'undefined' && window.TMGongming) return window.TMGongming;
    if (typeof global !== 'undefined' && global.TMGongming) return global.TMGongming;
    return null;
  }
  function _charRegionTokens(ch) {
    var bp = String((ch && (ch.birthplace || ch.nativePlace || ch.jiguan)) || '');
    return bp.split(/[·\-—~／/、,，\s（）()]+/).filter(Boolean); // 按·－/、，（）空白拆
  }
  function _charYoumian(GM, ch) {
    var GO = _gongming();
    if (GO && typeof GO.ensureGongming === 'function') { try { return num(GO.ensureGongming(ch, GM).youmian, 0); } catch (_) {} }
    return num(ch && ch.resources && ch.resources.gongming && ch.resources.gongming.youmian, 0);
  }
  // 在世士绅优免额按籍贯归集到已种子地域 → 写 leaf.exemptDing = 士绅优免 + 诡寄(commended)
  function refreshExempt(GM, Pp) {
    if (!GM) return;
    Pp = Pp || _P();
    var ls = leaves(Pp).filter(function (l) { return l && l.renliSeed; }); // 仅已种子（live 安全）
    if (!ls.length) return;
    var gentry = {}; ls.forEach(function (l) { gentry[regionIdOf(l)] = 0; });
    var chars = (GM && Array.isArray(GM.chars)) ? GM.chars : [];
    chars.forEach(function (ch) {
      if (!ch || ch.alive === false) return;
      var ym = _charYoumian(GM, ch); if (ym <= 0) return;
      var toks = _charRegionTokens(ch);
      for (var i = 0; i < ls.length; i++) {
        var rid = regionIdOf(ls[i]);
        var hit = toks.some(function (t) { return t && (rid.indexOf(t) >= 0 || t.indexOf(rid) >= 0); });
        if (hit) { gentry[rid] += ym; break; }
      }
    });
    ls.forEach(function (l) {
      var pd = popOf(l); if (!pd) return;
      var rr = (GM.renli.byRegion && GM.renli.byRegion[regionIdOf(l)]) || {};
      var cap = (typeof rr.exemptCapFactor === 'number') ? rr.exemptCapFactor : 1; // 限制优免（R6 变法）
      pd.exemptDing = Math.max(0, Math.round((gentry[regionIdOf(l)] || 0) * cap + num(pd.commendedDing, 0))); // 士绅优免×限免 + 诡寄
    });
  }
  // 过回合入口：先归集优免(含诡寄折叠)·再跑农政 tick
  function endturnTick(GM, Pp) {
    Pp = Pp || _P();
    try { refreshExempt(GM, Pp); } catch (_) {}
    tick(GM, Pp);
  }

  // ── R6：变法 ops（玩家杠杆 + 党派代价·仅已种子地域·诏书/AI 触发接线留 R6c）──────────
  function _reformGate(GM, classMatch, delta, source, reason) {
    var CE = _classEngine(); if (!CE || typeof CE.gateSatisfaction !== 'function') return;
    var cs = (GM && Array.isArray(GM.classes)) ? GM.classes : [];
    for (var i = 0; i < cs.length; i++) {
      var nm = String((cs[i] && (cs[i].name || cs[i].className)) || '');
      if (nm.indexOf(classMatch) >= 0) { try { CE.gateSatisfaction(GM, cs[i], delta, { turn: num(GM.turn, 0), source: source, reason: reason }); } catch (_) {} return; }
    }
  }
  // 施行一项变法（type 支持中英别名）。仅已种子地域；返回结果供邸报/AI 叙述。
  function applyReform(GM, Pp, regionId, type, opts) {
    Pp = Pp || _P(); opts = opts || {};
    var ls = leaves(Pp), leaf = null;
    for (var i = 0; i < ls.length; i++) { if (regionIdOf(ls[i]) === String(regionId)) { leaf = ls[i]; break; } }
    if (!leaf || !leaf.renliSeed) return { ok: false, reason: '未种子地域' };
    var pd = popOf(leaf); if (!pd) return { ok: false, reason: '无人口对象' };
    var rid = regionIdOf(leaf), seed = leaf.renliSeed;
    var r = ensureRegion(GM, rid, seed);
    var out = { ok: true, type: type, region: rid };
    if (type === 'remit' || type === '蠲免') {
      var turns = Math.max(1, Math.round(num(opts.turns, 1)));
      r.levyPolicy.remitTurns = Math.max(num(r.levyPolicy.remitTurns, 0), turns);
      out.remitTurns = r.levyPolicy.remitTurns;
      _reformGate(GM, '农户', 6, 'reform-remit', '蠲免徭役·与民休息');
    } else if (type === 'waterworks' || type === '兴修水利' || type === '河工') {
      var amt = Math.max(0, Math.round(num(opts.amount, 15)));
      out.waterworksBefore = num(r.waterworks != null ? r.waterworks : seed.waterworks, SEED_DEFAULTS.waterworks);
      r.waterworks = clamp(out.waterworksBefore + amt, 0, 100); out.waterworks = r.waterworks;
    } else if (type === 'resettle' || type === '招抚流民') {
      var before = num(pd.fugitives, 0);
      var back = (opts.amount != null) ? Math.round(num(opts.amount, 0)) : Math.round(before * clamp(num(opts.fraction, 0.4), 0, 1));
      pd.fugitives = Math.max(0, before - back);
      out.fugitivesBefore = before; out.fugitivesAfter = pd.fugitives; out.resettled = before - pd.fugitives;
      _reformGate(GM, '农户', 4, 'reform-resettle', '招抚流民·复业');
    } else if (type === 'survey' || type === '清丈' || type === '清丈田亩') {
      var f = clamp(num(opts.recoverFactor, 0.3), 0, 1);
      out.registeredLandBefore = num(pd.registeredLand, 0);
      pd.registeredLand = Math.round(out.registeredLandBefore * (1 + f));     // 丈出隐田入册
      pd.commendedDing = Math.round(num(pd.commendedDing, 0) * (1 - f));      // 诡寄逆转
      out.registeredLand = pd.registeredLand;
      _reformGate(GM, '士', -8, 'reform-survey', '清丈田亩·触士绅');           // 党派代价
    } else if (type === 'reregister' || type === '重修黄册' || type === '大造黄册') {
      out.registeredDingBefore = num(pd.registeredDing, 0);
      pd.registeredDing = num(pd.ding, 0);                                     // 册实归一·棘轮归零
      out.hiddenCleared = num(pd.hiddenCount, 0); pd.hiddenCount = 0;          // 隐丁现形入册
      pd.commendedDing = Math.round(num(pd.commendedDing, 0) * 0.5);          // 诡寄部分现形
      out.registeredDing = pd.registeredDing;
    } else if (type === 'whip' || type === '一条鞭法' || type === '役折银') {
      var orig = clamp(num(seed.laborMarketDepth, SEED_DEFAULTS.laborMarketDepth), 0, 0.95);
      out.suited = orig >= 0.4;                                               // 有银市场才适配
      seed.laborMarketDepth = Math.max(orig, 0.7); r.whip = true; out.laborMarketDepth = seed.laborMarketDepth;
      if (!out.suited) _reformGate(GM, '农户', -10, 'reform-whip-poison', '一条鞭法行于无银之地·逼贱卖'); // 穷省是毒
    } else if (type === 'capExempt' || type === '限制优免' || type === '士绅一体当差') {
      r.exemptCapFactor = clamp(num(opts.factor, 0.5), 0, 1);                 // 优免打折
      out.exemptCapFactor = r.exemptCapFactor;
      _reformGate(GM, '士', -10, 'reform-capexempt', '限制优免·触功名集团');
      try { refreshExempt(GM, Pp); } catch (_) {}                             // 立即重算 exempt
    } else if (type === 'tanding' || type === '摊丁入亩') {
      r.tanding = true; out.tanding = true;                                  // 丁银并入田赋·役随田走·优免不再蔽役（终局变法·丁作为计量被溶解）
      _reformGate(GM, '士', -12, 'reform-tanding', '摊丁入亩·士绅田亩一体当差'); // 最硬·士绅税特权终败
      _reformGate(GM, '农户', 4, 'reform-tanding', '摊丁入亩·役随田走·小民松');
    } else { return { ok: false, reason: '未知变法:' + type }; }
    ledgerPush(GM, rid, 'reform', 0, '变法:' + type, 'reform');
    return out;
  }

  // ── R5：问天 god-mode 解析器（丁/田/役/农政·镜像阶层/军队三件套·防幽灵属性）──────
  var WT_PREFIX = /^(region|地域|丁口|田|田土|役|役政)$/i; // 强制前缀·避免裸名误伤别的实体
  // field 别名 → {store:leaf|alloc|region|policy, key, kind:int(≥0)/pct(0-100)/weather/str}
  var WT_FIELDS = {
    '册载丁': { store: 'leaf', key: 'registeredDing', kind: 'int' }, 'registeredding': { store: 'leaf', key: 'registeredDing', kind: 'int' },
    '实在丁': { store: 'leaf', key: 'ding', kind: 'int' }, '丁': { store: 'leaf', key: 'ding', kind: 'int' }, 'ding': { store: 'leaf', key: 'ding', kind: 'int' },
    '逃亡': { store: 'leaf', key: 'fugitives', kind: 'int' }, '逃户': { store: 'leaf', key: 'fugitives', kind: 'int' }, 'fugitives': { store: 'leaf', key: 'fugitives', kind: 'int' },
    '隐丁': { store: 'leaf', key: 'hiddenCount', kind: 'int' }, '隐户': { store: 'leaf', key: 'hiddenCount', kind: 'int' }, 'hiddencount': { store: 'leaf', key: 'hiddenCount', kind: 'int' },
    '额田': { store: 'leaf', key: 'registeredLand', kind: 'int' }, 'registeredland': { store: 'leaf', key: 'registeredLand', kind: 'int' },
    '优免': { store: 'leaf', key: 'exemptDing', kind: 'int' }, 'exemptding': { store: 'leaf', key: 'exemptDing', kind: 'int' },
    '务农': { store: 'alloc', key: 'farm', kind: 'int' }, '应役': { store: 'alloc', key: 'corvee', kind: 'int' }, '应征': { store: 'alloc', key: 'draft', kind: 'int' },
    '地力': { store: 'region', key: 'soil', kind: 'pct' }, 'soil': { store: 'region', key: 'soil', kind: 'pct' },
    '水利': { store: 'region', key: 'waterworks', kind: 'pct' }, 'waterworks': { store: 'region', key: 'waterworks', kind: 'pct' },
    '天时': { store: 'region', key: 'weather', kind: 'weather' }, 'weather': { store: 'region', key: 'weather', kind: 'weather' },
    '役需': { store: 'policy', key: 'corveeDemand', kind: 'int' }, '军需': { store: 'policy', key: 'draftDemand', kind: 'int' },
    '征发强度': { store: 'policy', key: 'strength', kind: 'str' }, '蠲免': { store: 'policy', key: 'remitTurns', kind: 'int' }
  };
  function _wtNorm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function _wtScalar(old, op, value, kind) {
    if (kind === 'str') return String(value == null ? '' : value).trim();
    var v = Number(value), o = Number(old) || 0;
    if (op === 'add') return o + (isFinite(v) ? v : 0);
    if (op === 'mul') return o * (isFinite(v) ? v : 1);
    return isFinite(v) ? v : o; // set
  }
  function _wtClampField(val, kind) {
    if (kind === 'str') return val;
    if (kind === 'pct') return clamp(Math.round(num(val)), 0, 100);
    if (kind === 'weather') return clamp(Math.round(num(val) * 100) / 100, 0.3, 1.3);
    return Math.max(0, Math.round(num(val))); // int ≥0
  }
  // 返回 true=已处理（命中并写真对象）·false=非 renli 路径（交派发器继续）
  function wtHardChange(GM, Pp, parts, op, value, afterCb) {
    if (!GM || !Array.isArray(parts) || parts.length < 3) return false;
    if (!WT_PREFIX.test(String(parts[0]))) return false;          // 须前缀·裸名一律不收（防误伤）
    var name = parts[1];
    var rawF = parts.slice(2).join('.');
    var fld = WT_FIELDS[rawF] || WT_FIELDS[_wtNorm(rawF)];
    if (!name || !fld) return false;
    Pp = Pp || _P();
    var ls = leaves(Pp), leaf = null;
    for (var i = 0; i < ls.length; i++) { var rid = regionIdOf(ls[i]); if (rid === String(name) || rid.indexOf(name) >= 0 || String(name).indexOf(rid) >= 0) { leaf = ls[i]; break; } }
    if (!leaf) return false;
    var pd = popOf(leaf); if (!pd) return false;
    ensureLeafFields(leaf);
    var rid2 = regionIdOf(leaf);
    var r = ensureRegion(GM, rid2, leaf.renliSeed);
    var oldVal, newVal, host;
    if (fld.store === 'leaf') host = pd;
    else if (fld.store === 'alloc') { if (!pd.alloc) pd.alloc = {}; host = pd.alloc; }
    else if (fld.store === 'region') host = r;
    else if (fld.store === 'policy') { if (!r.levyPolicy) r.levyPolicy = { strength: 'normal', remitTurns: 0 }; host = r.levyPolicy; }
    else return false;
    oldVal = host[fld.key];
    newVal = _wtClampField(_wtScalar(oldVal, op || 'set', value, fld.kind), fld.kind);
    host[fld.key] = newVal; // 写真对象·非数组字符串幽灵键
    if (typeof afterCb === 'function') { try { afterCb('renli.' + rid2 + '.' + fld.key, oldVal, newVal); } catch (_) {} }
    return true;
  }

  // ── 导出 ──────────────────────────────────────────────────────────────
  var api = {
    ALLOC_KEYS: ALLOC_KEYS, SEED_DEFAULTS: SEED_DEFAULTS,
    RHO_STAR: RHO_STAR, RHO_MIN: RHO_MIN, BASE_YIELD: BASE_YIELD, STRENGTH_CAP: STRENGTH_CAP,
    CORVEE_LINE: CORVEE_LINE, SUBSIST: SUBSIST,
    leaves: leaves, popOf: popOf, presentDing: presentDing,
    ensureLeafFields: ensureLeafFields, ensureRegion: ensureRegion, ensureDefaults: ensureDefaults,
    seedRegion: seedRegion, ledgerPush: ledgerPush, getRegion: getRegion,
    levyableDing: levyableDing, allocValid: allocValid, assertNoDingInRenli: assertNoDingInRenli,
    findFarmerClass: findFarmerClass, applyRegionalVariant: applyRegionalVariant,
    _qOf: _qOf, tickLeaf: tickLeaf, tick: tick,
    warScar: warScar, warScarFromBattle: warScarFromBattle,
    refreshExempt: refreshExempt, endturnTick: endturnTick,
    applyReform: applyReform,
    wtHardChange: wtHardChange,
    VERSION: 3.5
  };

  if (typeof window !== 'undefined') { window.TM = window.TM || {}; window.TM.Renli = api; }
  else if (typeof globalThis !== 'undefined') { globalThis.TM = globalThis.TM || {}; globalThis.TM.Renli = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
