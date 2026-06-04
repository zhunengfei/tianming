// @ts-check
/// <reference path="types.d.ts" />
/**
 * tm-edict-parser.js — 诏令识别与制度演化
 *
 * 实施以下 2 个设计文档：
 *  - 设计方案-诏令识别补完.md（P0/P1 五大虚空渠道 UI 路径）
 *  - 设计方案-制度设计与演化.md（诏书六类 + 判定分流 + 二阶段 + 抗疏）
 *
 * 六大诏书类型：
 *  1. 货币改革 2. 税种设立 3. 户籍制度 4. 徭役改革 5. 兵制改革 6. 官制设立
 *
 * 三类分流：
 *  A. AI 可直断（完整度 > 0.6 或紧急度 > 0.7）
 *  B. 意图明确但细节不足（复奏/求见）
 *  C. 意图模糊（AI 追问）
 *
 * 30 条历代典范
 */
(function(global) {
  'use strict';

  function _turnsForMonthsLocal(months) {
    return (typeof global.turnsForMonths === 'function') ? global.turnsForMonths(months) : months;
  }

  function _getMonthRatioLocal(ctx) {
    return (ctx && typeof ctx.monthRatio === 'number') ? ctx.monthRatio
      : ((typeof global._getDaysPerTurn === 'function') ? global._getDaysPerTurn() / 30 : 1);
  }

  function _edictRatioFromText(text, fallback) {
    text = String(text || '');
    var numeric = text.match(/(\d+(?:\.\d+)?)\s*成/);
    if (numeric) return Math.max(0, Math.min(1, parseFloat(numeric[1]) / 10));
    var map = { '一':1, '二':2, '两':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9 };
    var cn = text.match(/([一二两三四五六七八九])成/);
    if (cn && map[cn[1]]) return map[cn[1]] / 10;
    return fallback;
  }

  function _edictAmountFromText(text, fallback) {
    text = String(text || '');
    var m = text.match(/(\d+(?:\.\d+)?)\s*(亿|万|千|贯|两|文)?/);
    if (!m) return fallback;
    var n = parseFloat(m[1]);
    var unit = m[2] || '';
    if (unit === '亿') n *= 100000000;
    else if (unit === '万') n *= 10000;
    else if (unit === '千') n *= 1000;
    return Math.max(0, Math.round(n));
  }

  function _currencyPaperNameFromText(text) {
    text = String(text || '');
    if (/交子/.test(text)) return '交子';
    if (/会子/.test(text)) return '会子';
    if (/官票/.test(text)) return '官票';
    if (/宝钞/.test(text)) return '宝钞';
    if (/钞/.test(text)) return '纸钞';
    if (/纸币|纸钱/.test(text)) return '纸币';
    return '纸币';
  }

  function _currencyCoinTypeFromText(text) {
    text = String(text || '');
    if (/银|白银/.test(text)) return 'silver';
    if (/铁/.test(text)) return 'iron';
    if (/金/.test(text)) return 'gold';
    return 'copper';
  }

  function _findCurrencyPaperIdFromText(text) {
    var G = global.GM || {};
    var paper = G.currency && G.currency.paper;
    var list = paper && Array.isArray(paper.issuances) ? paper.issuances : [];
    var active = list.filter(function(p) { return p && p.state !== 'abolish'; });
    for (var i = 0; i < active.length; i++) {
      var p = active[i];
      if (p.name && text.indexOf(p.name) >= 0) return p.id;
    }
    if (/宝钞/.test(text)) {
      var baochao = active.find(function(p) { return /宝钞/.test(p.name || ''); });
      if (baochao) return baochao.id;
    }
    if (/交子/.test(text)) {
      var jiaozi = active.find(function(p) { return /交子/.test(p.name || ''); });
      if (jiaozi) return jiaozi.id;
    }
    return active[0] && active[0].id;
  }

  function _recordEdictPolicyAction(kind, action, result, text) {
    var G = global.GM;
    if (!G) return;
    if (!G._edictPolicyActions) G._edictPolicyActions = [];
    G._edictPolicyActions.push({
      turn: G.turn || 0,
      kind: kind,
      action: action,
      ok: !(result && result.ok === false),
      text: String(text || '').slice(0, 120)
    });
    if (G._edictPolicyActions.length > 80) G._edictPolicyActions.splice(0, G._edictPolicyActions.length - 80);
  }

  function _executeCurrencyTextPolicy(text, params) {
    text = String(text || '');
    var CE = global.CurrencyEngine;
    if (!CE) return false;

    if (/私铸|私钱|盗铸|伪钱/.test(text) && /禁|严禁|禁绝|搜检|整饬|查/.test(text)) {
      var ban = (typeof CE.banPrivateMint === 'function') ? CE.banPrivateMint() : false;
      _recordEdictPolicyAction('currency', 'ban_private_mint', ban, text);
      return ban || true;
    }

    if (/废|罢|停用|禁用|废止|收回/.test(text) && /交子|会子|宝钞|官票|纸币|纸钞|钞/.test(text)) {
      var paperId = params.paperId || _findCurrencyPaperIdFromText(text);
      if (!paperId) return { ok: false, reason: '未找到可废止纸币' };
      var abolished = (typeof CE.abolishPaper === 'function') ? CE.abolishPaper(paperId) : false;
      _recordEdictPolicyAction('currency', 'abolish_paper', abolished, text);
      return abolished || true;
    }

    if (/发|发行|颁行|开印|官办/.test(text) && /交子|会子|宝钞|官票|纸币|纸钞|钞/.test(text)) {
      var spec = {
        id: params.paperId || ('edict_paper_' + ((global.GM && global.GM.turn) || 0)),
        name: params.paperName || _currencyPaperNameFromText(text),
        originalAmount: params.amount || _edictAmountFromText(text, 1000000),
        reserveRatio: params.reserveRatio != null ? params.reserveRatio : _edictRatioFromText(text, 0.3)
      };
      var issued = (typeof CE.issuePaper === 'function') ? CE.issuePaper(spec) : false;
      _recordEdictPolicyAction('currency', 'issue_paper', issued, text);
      return issued || true;
    }

    if (/减铸|轻钱|小钱|降成色|贬/.test(text) && /铜钱|铜|银|铁|金|钱/.test(text)) {
      var coin = params.coinType || _currencyCoinTypeFromText(text);
      var level = params.level != null ? params.level : _edictRatioFromText(text, 0.1);
      var debased = (typeof CE.debaseCoin === 'function') ? CE.debaseCoin(coin, level) : false;
      _recordEdictPolicyAction('currency', 'debase_coin', debased, text);
      return debased || true;
    }

    return false;
  }

  function _isCurrencyTextPolicy(text) {
    text = String(text || '');
    if (/私铸|私钱|盗铸|伪钱/.test(text) && /禁|严禁|禁绝|搜检|整饬|查/.test(text)) return true;
    if (/废|罢|停用|禁用|废止|收回/.test(text) && /交子|会子|宝钞|官票|纸币|纸钞|钞/.test(text)) return true;
    if (/发|发行|颁行|开印|官办/.test(text) && /交子|会子|宝钞|官票|纸币|纸钞|钞/.test(text)) return true;
    if (/减铸|轻钱|小钱|降成色|贬/.test(text) && /铜钱|铜|银|铁|金|钱/.test(text)) return true;
    return false;
  }

  function _inferHujiTextPolicy(text) {
    text = String(text || '');
    if (/隐户|隐匿户|漏籍/.test(text) && /清查|搜检|搜括|括户|核查|编入|入籍/.test(text)) {
      return { action: 'purge_hidden', target: 'hidden_households', scope: /全国|天下/.test(text) ? 'national' : 'general' };
    }
    if (/逃户|流民|流亡|逃亡/.test(text) && /招抚|抚辑|安插|复业|入籍|复籍/.test(text)) {
      return { action: 'resettle_refugees', target: 'fugitives', scope: /全国|天下/.test(text) ? 'national' : 'general' };
    }
    if (/保甲|里甲/.test(text) && /编设|推行|立|置|行/.test(text)) {
      return { action: 'baojia_setup', target: 'households', scope: /全国|天下/.test(text) ? 'national' : 'general' };
    }
    if (/黄册|户籍|户口|籍/.test(text) && /重造|大造|编审|清厘|清理|修造|造册/.test(text)) {
      return { action: 'recount', target: 'registry', scope: /全国|天下/.test(text) ? 'national' : 'general' };
    }
    return {};
  }

  function _isHujiTextPolicy(text) {
    return !!_inferHujiTextPolicy(text).action;
  }

  function _edictRatioAfterLabel(text, label, fallback) {
    text = String(text || '');
    var re = new RegExp(label + '\\s*(?:为|至|按|定为)?\\s*(\\d+(?:\\.\\d+)?|[一二两三四五六七八九十])\\s*成');
    var m = text.match(re);
    if (!m) return fallback;
    var token = m[1];
    if (/^\d/.test(token)) return Math.max(0, Math.min(1, parseFloat(token) / 10));
    var map = { '一':1, '二':2, '两':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10 };
    return map[token] ? map[token] / 10 : fallback;
  }

  function _resolvePolicyRegionId(text, params) {
    text = String(text || '');
    params = params || {};
    if (params.regionId) return params.regionId;
    var G = global.GM || {};
    var candidates = [];
    if (G.fiscal && G.fiscal.regions) {
      Object.keys(G.fiscal.regions).forEach(function(id) {
        var rf = G.fiscal.regions[id] || {};
        candidates.push({ id: id, name: rf.name || rf.regionName || id });
      });
    }
    if (Array.isArray(G.regions)) {
      G.regions.forEach(function(r) {
        if (r && r.id) candidates.push({ id: r.id, name: r.name || r.title || r.id });
      });
    }
    var aliases = {
      '江南': 'jiangnan',
      '山西': 'shanxi',
      '陕西': 'shaanxi',
      '陕': 'shaanxi',
      '京畿': 'jingji',
      '直隶': 'zhili',
      '广东': 'guangdong',
      '广西': 'guangxi',
      '福建': 'fujian',
      '浙江': 'zhejiang',
      '湖广': 'huguang',
      '四川': 'sichuan',
      '山东': 'shandong',
      '河南': 'henan'
    };
    var aliasKeys = Object.keys(aliases);
    for (var a = 0; a < aliasKeys.length; a++) {
      if (text.indexOf(aliasKeys[a]) >= 0) return aliases[aliasKeys[a]];
    }
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (c.id && text.indexOf(c.id) >= 0) return c.id;
      if (c.name && text.indexOf(c.name) >= 0) return c.id;
    }
    return candidates.length === 1 ? candidates[0].id : null;
  }

  function _centralLocalPurposeFromText(text) {
    text = String(text || '');
    if (/赈|灾|荒|水灾|旱灾/.test(text)) return 'disaster_relief';
    if (/军饷|军用|边饷|兵饷/.test(text)) return 'military_funding';
    if (/水利|修河|治水|河工/.test(text)) return 'public_works_water';
    if (/驿|道路|转运/.test(text)) return 'post_stations';
    return 'regional_support';
  }

  function _centralLocalAllocationSpecFromText(text, params) {
    params = params || {};
    var qiyun = params.qiyunRatio != null ? params.qiyunRatio : _edictRatioAfterLabel(text, '起运', null);
    var cunliu = params.cunliuRatio != null ? params.cunliuRatio : _edictRatioAfterLabel(text, '存留', null);
    if (qiyun == null && cunliu == null) return null;
    if (qiyun == null) qiyun = Math.max(0, Math.min(1, 1 - cunliu));
    if (cunliu == null) cunliu = Math.max(0, Math.min(1, 1 - qiyun));
    var perTax = {};
    ['land_grain', 'head_tax', 'salt', 'commerce'].forEach(function(k) {
      perTax[k] = { qiyun: qiyun, cunliu: cunliu };
    });
    return { mode: 'qiyun_cunliu', perTax: perTax };
  }

  function _inferCentralLocalTextPolicy(text, params) {
    text = String(text || '');
    params = params || {};
    var regionId = _resolvePolicyRegionId(text, params);
    var amount = params.amount || _edictAmountFromText(text, 0);
    if (/监察|御史|巡按|巡察|查核|核查|稽核/.test(text)) {
      return { action: 'dispatch_censor', regionId: regionId, cost: params.cost || 3000 };
    }
    if (/强征|追征|催征|催解|提解|起解/.test(text) && /地方留存|存留|地方银|留存银|地方库|地方财政/.test(text)) {
      return { action: 'force_levy', regionId: regionId, amount: amount, reason: _centralLocalPurposeFromText(text) };
    }
    if (/下拨|拨银|拨款|拨给|发帑|发银|给银|赈济|赈灾/.test(text) && amount > 0) {
      return { action: 'transfer_to_region', regionId: regionId, amount: amount, purpose: _centralLocalPurposeFromText(text) };
    }
    if (/分成|起运|存留|留成|分税/.test(text)) {
      var allocSpec = _centralLocalAllocationSpecFromText(text, params);
      if (allocSpec) return { action: 'set_region_allocation', regionId: regionId, allocSpec: allocSpec };
    }
    return {};
  }

  function _isCentralLocalTextPolicy(text) {
    return !!_inferCentralLocalTextPolicy(text).action;
  }

  function _ensureCentralLocalPolicyState() {
    var G = global.GM;
    if (!G) return;
    if (!G._centralLocalPolicyActions) G._centralLocalPolicyActions = [];
  }

  function _executeCentralLocalTextPolicy(text, params) {
    var G = global.GM;
    if (!G) return false;
    params = Object.assign({}, _inferCentralLocalTextPolicy(text, params), params || {});
    var action = params.action;
    if (!action) return false;
    _ensureCentralLocalPolicyState();
    var result = null;

    if (action === 'transfer_to_region') {
      if (!params.regionId || !params.amount) return { ok: false, reason: '缺少下拨区域或金额' };
      if (global.EconomyLinkage && typeof global.EconomyLinkage.createTransferOrder === 'function') {
        result = global.EconomyLinkage.createTransferOrder({
          fromAccount: params.fromAccount || 'guoku.money',
          toRegion: params.regionId,
          toAccount: params.toAccount || 'regional',
          amount: params.amount,
          purpose: params.purpose || 'regional_support',
          durationMonths: params.durationMonths || 3
        });
      } else {
        if (!G.transferOrders) G.transferOrders = [];
        result = { ok: true, fallback: true, orderId: 'edict_transfer_' + (G.turn || 0) };
        G.transferOrders.push({
          id: result.orderId,
          fromAccount: params.fromAccount || 'guoku.money',
          toRegion: params.regionId,
          amount: params.amount,
          purpose: params.purpose || 'regional_support',
          status: 'pending',
          createTurn: G.turn || 0
        });
      }
    } else if (action === 'force_levy') {
      if (!params.regionId || !params.amount) return { ok: false, reason: '缺少强征区域或金额' };
      if (global.EconomyGapFill && typeof global.EconomyGapFill.forceLevy === 'function') {
        result = global.EconomyGapFill.forceLevy(params.regionId, params.amount, params.reason || 'edict');
      } else if (G.fiscal && G.fiscal.regions && G.fiscal.regions[params.regionId]) {
        var rf = G.fiscal.regions[params.regionId];
        var actual = Math.min(params.amount, (rf.ledgers && rf.ledgers.money) || params.amount);
        if (rf.ledgers) rf.ledgers.money = Math.max(0, (rf.ledgers.money || 0) - actual);
        if (G.guoku) G.guoku.balance = (G.guoku.balance || 0) + actual;
        rf.compliance = Math.max(0.05, (rf.compliance || 0.8) - 0.2);
        result = { ok: true, actualAmount: actual, fallback: true };
      }
    } else if (action === 'dispatch_censor') {
      if (!params.regionId) return { ok: false, reason: '缺少监察区域' };
      if (global.CentralLocalEngine && typeof global.CentralLocalEngine.dispatchCensor === 'function') {
        result = global.CentralLocalEngine.dispatchCensor({
          targetRegion: params.regionId,
          cost: params.cost || 3000,
          inspector: params.inspector || '监察御史',
          type: params.type || 'touring'
        });
      } else {
        if (!G.fiscal) G.fiscal = {};
        if (!G.fiscal.auditSystem) G.fiscal.auditSystem = { ongoingInspections: [] };
        if (!G.fiscal.auditSystem.ongoingInspections) G.fiscal.auditSystem.ongoingInspections = [];
        result = { ok: true, censorId: 'edict_censor_' + (G.turn || 0), fallback: true };
        G.fiscal.auditSystem.ongoingInspections.push({ id: result.censorId, target: params.regionId, startTurn: G.turn || 0 });
      }
    } else if (action === 'set_region_allocation') {
      if (!params.regionId || !params.allocSpec) return { ok: false, reason: '缺少分成区域或比例' };
      if (global.CentralLocalEngine && typeof global.CentralLocalEngine.setRegionAllocation === 'function') {
        result = global.CentralLocalEngine.setRegionAllocation(params.regionId, params.allocSpec);
      } else if (G.fiscal && G.fiscal.regions && G.fiscal.regions[params.regionId]) {
        G.fiscal.regions[params.regionId].allocation = Object.assign({}, G.fiscal.regions[params.regionId].allocation || {}, params.allocSpec);
        result = true;
      }
    }

    _recordEdictPolicyAction('central_local', action, result, text);
    if (G._centralLocalPolicyActions) {
      G._centralLocalPolicyActions.push({ turn: G.turn || 0, action: action, regionId: params.regionId, amount: params.amount || 0 });
      if (G._centralLocalPolicyActions.length > 80) G._centralLocalPolicyActions.splice(0, G._centralLocalPolicyActions.length - 80);
    }
    return (result && (result.ok === false || result.success === false)) ? false : (result || true);
  }

  function _inferEnvironmentTextPolicy(text, params) {
    text = String(text || '');
    params = params || {};
    var regionId = _resolvePolicyRegionId(text, params);
    var policyId = params.policyId || null;
    if (!policyId && /禁伐|禁樵|禁樵采|严禁樵采/.test(text)) policyId = 'jin_hu_kui';
    if (!policyId && /封山|育木|育林|造林/.test(text)) policyId = 'feng_shan_mu';
    if (!policyId && /疏浚|浚河|疏河|浚渠/.test(text)) policyId = 'yi_he_shui';
    if (!policyId && /兴修水利|水利|修渠|治水/.test(text)) policyId = 'shui_li';
    if (!policyId && /限垦|休耕|轮休|轮作|养地力/.test(text)) policyId = 'fan_gu';
    if (!policyId && /复耕|屯田|养地|赈灾复耕/.test(text)) policyId = 'tun_tian';
    if (!policyId && /开荒|垦荒|垦殖|荒田/.test(text)) policyId = 'ken_huang';
    if (!policyId && /治盐|盐碱|压盐|治碱/.test(text)) policyId = 'ke_gao';
    if (!policyId && /清污|净流|排污|清河|净渭/.test(text)) policyId = 'jing_wei';
    if (!policyId && /禁猎|保畜|禁网/.test(text)) policyId = 'jin_dian_hun';
    if (!policyId && /节用|节俭|省费/.test(text)) policyId = 'jie_yong';
    return policyId ? { action: 'enact_env_policy', policyId: policyId, regionId: regionId } : {};
  }

  function _isEnvironmentTextPolicy(text) {
    return !!_inferEnvironmentTextPolicy(text).policyId;
  }

  function _executeEnvironmentTextPolicy(text, params) {
    var G = global.GM;
    if (!G) return false;
    params = Object.assign({}, _inferEnvironmentTextPolicy(text, params), params || {});
    if (!params.policyId) return false;
    var result = null;
    if (global.EnvCapacityEngine && typeof global.EnvCapacityEngine.enactPolicy === 'function') {
      result = global.EnvCapacityEngine.enactPolicy(params.policyId, params.regionId || undefined);
    } else {
      if (!G._envPolicyActions) G._envPolicyActions = [];
      result = { ok: true, fallback: true, policyId: params.policyId, regionId: params.regionId || 'all' };
      G._envPolicyActions.push({
        turn: G.turn || 0,
        policyId: params.policyId,
        regionId: params.regionId || 'all',
        source: 'edict'
      });
    }
    _recordEdictPolicyAction('environment', params.policyId, result, text);
    return (result && result.ok === false) ? false : (result || true);
  }

  function _edictOfficeRankFromText(text, fallback) {
    text = String(text || '');
    var cn = text.match(/([一二三四五六七八九])品/);
    var map = { '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9 };
    if (cn && map[cn[1]]) return map[cn[1]];
    var n = text.match(/(?:正|从)?\s*(\d+)\s*品/);
    if (n) return Math.max(1, Math.min(9, parseInt(n[1], 10) || fallback || 5));
    return fallback || 5;
  }

  function _inferOfficeReformFromText(text) {
    text = String(text || '');
    var name = '';
    var m = text.match(/(?:设|立|置|创|新设|添设)\s*([^，。、；;\s]{1,16}?(?:司|部|院|监|处|局|署|府|所|馆))/);
    if (m) name = m[1];
    var duties = '';
    var d = text.match(/(?:掌|管|司|辖)\s*([^。；;，,]{2,40})/);
    if (d) duties = d[1].replace(/^(掌|管|司|辖)/, '').trim();
    return {
      officeName: name,
      rank: _edictOfficeRankFromText(text, 5),
      duties: duties
    };
  }

  function _findDynamicInstitutionByName(name) {
    var G = global.GM || {};
    var list = Array.isArray(G.dynamicInstitutions) ? G.dynamicInstitutions : [];
    name = String(name || '').trim();
    if (!name) return null;
    return list.find(function(inst) {
      return inst && inst.stage !== 'abolished' && String(inst.name || '') === name;
    }) || null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  六大诏书类型参数 schema
  // ═══════════════════════════════════════════════════════════════════

  var EDICT_TYPES = {
    currency_reform: {
      name: '货币改革',
      requiredFields: ['coinType', 'weight', 'purity', 'mintAgency'],
      critical: ['coinType'],
      drafter: '户部尚书',
      aiEntry: function(params) {
        if (typeof global.CurrencyEngine === 'undefined') return false;
        params = params || {};
        var preset = (global.CurrencyEngine.REFORM_PRESETS || []).find(function(r) {
          return params.presetId === r.id;
        });
        var ok = preset ? global.CurrencyEngine.applyReform(preset.id, params) : _executeCurrencyTextPolicy(params._edictText || '', params);
        // 皇威反馈：改革成功 → structuralReform；失败 → brokenPromise
        if (typeof global.AuthorityComplete !== 'undefined') {
          if (ok && ok.success) global.AuthorityComplete.triggerHuangweiEvent('structuralReform');
          else if (ok && !ok.success) global.AuthorityComplete.triggerHuangweiEvent('brokenPromise');
        }
        return ok;
      }
    },
    tax_reform: {
      name: '税种设立',
      requiredFields: ['taxType', 'base', 'rate'],
      critical: ['taxType', 'rate'],
      drafter: '户部尚书',
      aiEntry: function(params) {
        if (!global.GM.fiscalConfig) global.GM.fiscalConfig = {};
        if (!global.GM.fiscalConfig.customTaxes) global.GM.fiscalConfig.customTaxes = [];
        global.GM.fiscalConfig.customTaxes.push({
          id: params.taxId || ('custom_' + (global.GM.turn || 0)),
          name: params.taxName || '新税',
          formulaType: params.formulaType || 'percent',
          rate: params.rate || 0.03,
          base: params.base || 'commerce',
          description: params.description || ''
        });
        // 皇威反馈：加税 → lostVirtueRumor；减税/蠲免 → benevolence
        if (typeof global.AuthorityComplete !== 'undefined') {
          var rate = params.rate || 0.03;
          if (rate > 0.05) global.AuthorityComplete.triggerHuangweiEvent('lostVirtueRumor');
          else if (rate < 0) global.AuthorityComplete.triggerHuangweiEvent('benevolence');
        }
        return true;
      }
    },
    central_local_finance: {
      name: '央地财政',
      requiredFields: ['action', 'target', 'amount'],
      critical: ['action'],
      drafter: '户部尚书',
      aiEntry: function(params) {
        params = params || {};
        return _executeCentralLocalTextPolicy(params._edictText || '', params);
      }
    },
    environment_policy: {
      name: '环境承载',
      requiredFields: ['policyId', 'target'],
      critical: ['policyId'],
      drafter: '工部尚书',
      aiEntry: function(params) {
        params = params || {};
        return _executeEnvironmentTextPolicy(params._edictText || '', params);
      }
    },
    huji_reform: {
      name: '户籍制度',
      requiredFields: ['action', 'target', 'scope'],
      critical: ['action'],
      drafter: '户部尚书',
      aiEntry: function(params) {
        if (typeof global.HujiEngine === 'undefined') return false;
        params = params || {};
        if (!params.action) {
          var inferredHuji = _inferHujiTextPolicy(params._edictText || '');
          Object.keys(inferredHuji).forEach(function(k) {
            if (params[k] === undefined) params[k] = inferredHuji[k];
          });
        }
        var P = global.GM.population;
        if (!P) return false;
        var action = params.action || '';
        // recount/重造黄册
        if (action === 'recount' || action === '重造' || action === '大造') {
          P.meta.lastRegistrationTurn = 0;
          return true;
        }
        // 改色目（bianhu → 某色）
        if (action === 'change_category' || action === '转色目') {
          var from = params.fromCategory || 'bianhu';
          var to = params.toCategory;
          var count = params.count || 10000;
          if (P.byCategory[from] && P.byCategory[to]) {
            P.byCategory[from].mouths = Math.max(0, P.byCategory[from].mouths - count);
            P.byCategory[to].mouths += count;
            if (global.addEB) global.addEB('户籍', count + ' 口由 ' + from + ' 转 ' + to);
            return true;
          }
        }
        // 清查隐户
        if (action === 'purge_hidden' || action === '清查隐户') {
          var purged = Math.round((P.hiddenCount || 0) * 0.5);
          P.hiddenCount = Math.max(0, P.hiddenCount - purged);
          if (P.byLegalStatus.huangji) P.byLegalStatus.huangji.households += purged;
          if (global.addEB) global.addEB('户籍', '清查隐户 ' + purged + ' 户');
          return true;
        }
        // 招抚流民
        if (action === 'resettle_refugees' || action === '招抚流民') {
          var taohu = P.byLegalStatus.taoohu || {};
          var resettled = Math.round((taohu.mouths || 0) * 0.3);
          if (resettled > 0) {
            taohu.mouths -= resettled;
            taohu.households = Math.max(0, (taohu.households || 0) - Math.round(resettled / 5));
            taohu.ding = Math.max(0, (taohu.ding || 0) - Math.round(resettled * 0.3));
            if (P.byLegalStatus.huangji) {
              P.byLegalStatus.huangji.mouths += resettled;
              P.byLegalStatus.huangji.households += Math.round(resettled / 5);
              P.byLegalStatus.huangji.ding += Math.round(resettled * 0.3);
            }
            P.fugitives = Math.max(0, (P.fugitives || 0) - resettled);
            if (global.addEB) global.addEB('招抚', '流民 ' + resettled + ' 口复业');
            // 皇威：德政
            if (typeof global.AuthorityComplete !== 'undefined') global.AuthorityComplete.triggerHuangweiEvent('benevolence');
            return true;
          }
        }
        // 保甲编设
        if (action === 'baojia_setup' || action === '编设保甲') {
          Object.keys(P.byRegion || {}).forEach(function(rid) {
            var r = P.byRegion[rid];
            r.baojiaUnits = Math.round(r.households / 10);
            r.lijiaUnits = Math.round(r.households / 110);
          });
          if (global.addEB) global.addEB('户籍', '全国编设保甲');
          return true;
        }
        return false;
      }
    },
    corvee_reform: {
      name: '徭役改革',
      requiredFields: ['mode', 'commutationRate'],
      critical: ['mode'],
      drafter: '户部尚书',
      aiEntry: function(params) {
        var P = global.GM.population;
        if (!P || !P.corvee) return false;
        var ok = false;
        if (params.mode === 'fully_commuted' || params.preset === 'yitiao_bian') {
          P.corvee.fullyCommuted = true;
          if (global.addEB) global.addEB('徭役', '役银合一（一条鞭法）');
          ok = true;
        } else if (typeof params.commutationRate === 'number') {
          P.corvee.commutationRate = params.commutationRate;
          ok = true;
        }
        // 皇威：重大改革成功 → structuralReform
        if (ok && typeof global.AuthorityComplete !== 'undefined') global.AuthorityComplete.triggerHuangweiEvent('structuralReform');
        return ok;
      }
    },
    military_reform: {
      name: '兵制改革',
      requiredFields: ['system', 'scale'],
      critical: ['system'],
      drafter: '兵部尚书',
      aiEntry: function(params) {
        var P = global.GM.population;
        if (!P || !P.military) return false;
        var ok = false;
        if (params.enable && P.military.types[params.enable]) {
          P.military.types[params.enable].enabled = true;
          if (global.addEB) global.addEB('兵制', '启用 ' + params.enable);
          ok = true;
        } else if (params.disable && P.military.types[params.disable]) {
          P.military.types[params.disable].enabled = false;
          if (global.addEB) global.addEB('兵制', '废止 ' + params.disable);
          ok = true;
        }
        // 皇威：兵制改革+皇权军权集中
        if (ok && typeof global.AuthorityComplete !== 'undefined') {
          global.AuthorityComplete.triggerHuangweiEvent('structuralReform');
          global.AuthorityComplete.triggerHuangquanEvent('militaryCentral');
        }
        return ok;
      }
    },
    office_reform: {
      name: '官制设立',
      requiredFields: ['officeName', 'rank', 'duties'],
      critical: ['officeName'],
      drafter: '吏部尚书',
      aiEntry: function(params) {
        if (!global.GM.officeTree) return false;
        params = Object.assign({}, _inferOfficeReformFromText(params && params._edictText || ''), params || {});
        if (!params.officeName) return false;
        if (!global.GM.customOffices) global.GM.customOffices = [];
        if (!global.GM.customOffices.some(function(o) { return o && o.name === params.officeName; })) {
          global.GM.customOffices.push({
            name: params.officeName,
            rank: params.rank || 5,
            duties: params.duties || '',
            createdTurn: global.GM.turn || 0
          });
        }
        var inst = _findDynamicInstitutionByName(params.officeName);
        if (!inst && typeof registerDynamicInstitution === 'function') {
          inst = registerDynamicInstitution({
            name: params.officeName,
            rank: params.rank || 5,
            duties: params.duties || '',
            region: params.region || 'central',
            staffSize: params.staffSize || 20,
            annualBudget: params.annualBudget || 50000,
            fundingSource: params.fundingSource || 'guoku.central',
            headOfficial: params.headOfficial || null,
            createdBy: params.createdBy || 'edict'
          });
        }
        if (global.addEB) global.addEB('官制', '新设 ' + params.officeName + '（品级 ' + (params.rank||5) + '）');
        // 皇威：制度改革 + 皇权：结构改革
        if (typeof global.AuthorityComplete !== 'undefined') {
          global.AuthorityComplete.triggerHuangweiEvent('structuralReform');
          global.AuthorityComplete.triggerHuangquanEvent('structureReform');
        }
        return inst || true;
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  //  30 条历代典范
  // ═══════════════════════════════════════════════════════════════════

  var HISTORICAL_EDICT_PRESETS = [
    // 货币改革 (5)
    { id:'qin_banliang', type:'currency_reform', dynasty:'秦', text:'统一币制，废六国异币，铸圆方孔半两' },
    { id:'han_wuzhu', type:'currency_reform', dynasty:'汉', text:'铸五铢钱，禁郡国铸' },
    { id:'tang_kaiyuan', type:'currency_reform', dynasty:'唐', text:'废五铢，立开元通宝' },
    { id:'song_jiaozi', type:'currency_reform', dynasty:'宋', text:'发交子于蜀' },
    { id:'ming_baochao', type:'currency_reform', dynasty:'明', text:'发大明宝钞' },
    // 税种设立 (5)
    { id:'han_suanfu', type:'tax_reform', dynasty:'汉', text:'立算赋，每人每年一百二十钱' },
    { id:'tang_zuyongdiao', type:'tax_reform', dynasty:'唐', text:'租庸调：丁岁粟二石、绢二丈、役二十日' },
    { id:'liangshui', type:'tax_reform', dynasty:'唐', text:'行两税法，夏秋两征' },
    { id:'wang_junshushi', type:'tax_reform', dynasty:'唐', text:'立均输实钱' },
    { id:'yitiao_bian', type:'tax_reform', dynasty:'明', text:'一条鞭法：赋役合一折银' },
    // 户籍制度 (4)
    { id:'qin_bianhu', type:'huji_reform', dynasty:'秦', text:'编户齐民，什伍连坐' },
    { id:'ming_huangce', type:'huji_reform', dynasty:'明', text:'造黄册，十年一大造' },
    { id:'qing_baojia', type:'huji_reform', dynasty:'清', text:'推行保甲，十户一牌，十牌一甲' },
    { id:'tandin_rumu', type:'huji_reform', dynasty:'清', text:'摊丁入亩，永不加赋' },
    // 徭役改革 (5)
    { id:'qin_gengyi', type:'corvee_reform', dynasty:'秦', text:'立更役，丁岁一月' },
    { id:'tang_yongzhi', type:'corvee_reform', dynasty:'唐', text:'庸役折绢，岁二丈' },
    { id:'ming_junyao', type:'corvee_reform', dynasty:'明', text:'均徭，按丁田轮派' },
    { id:'yitiao_bian_corvee', type:'corvee_reform', dynasty:'明', text:'役银合一，摊入田赋' },
    { id:'qing_huomao', type:'corvee_reform', dynasty:'清', text:'火耗归公，养廉银制' },
    // 兵制改革 (6)
    { id:'fubing', type:'military_reform', dynasty:'唐', text:'立府兵，府兵轮番宿卫' },
    { id:'mubing', type:'military_reform', dynasty:'宋', text:'行募兵制' },
    { id:'weisuo', type:'military_reform', dynasty:'明', text:'立卫所，军户世袭' },
    { id:'baqi', type:'military_reform', dynasty:'清', text:'立八旗，兵民合一' },
    { id:'luying', type:'military_reform', dynasty:'清', text:'立绿营，募汉人' },
    { id:'xiangyong', type:'military_reform', dynasty:'清', text:'湘军淮军，团练练勇' },
    // 官制设立 (5)
    { id:'qin_sangong', type:'office_reform', dynasty:'秦', text:'立三公九卿' },
    { id:'han_cishi', type:'office_reform', dynasty:'汉', text:'立刺史部十三州' },
    { id:'tang_sansheng', type:'office_reform', dynasty:'唐', text:'立三省六部' },
    { id:'song_zhonshu', type:'office_reform', dynasty:'宋', text:'立中书门下政事堂' },
    { id:'ming_neige', type:'office_reform', dynasty:'明', text:'立内阁大学士' }
  ];

  // ═══════════════════════════════════════════════════════════════════
  //  三维评估
  // ═══════════════════════════════════════════════════════════════════

  function _assessCompleteness(text, typeKey) {
    var type = EDICT_TYPES[typeKey];
    if (!type || !type.requiredFields) return 0.5;
    if (typeKey === 'currency_reform' && _isCurrencyTextPolicy(text)) return 0.75;
    if (typeKey === 'huji_reform' && _isHujiTextPolicy(text)) return 0.75;
    if (typeKey === 'central_local_finance' && _isCentralLocalTextPolicy(text)) return 0.75;
    if (typeKey === 'environment_policy' && _isEnvironmentTextPolicy(text)) return 0.75;
    // 按关键字检测
    var keywordMap = {
      coinType: /铜钱|银|金|铁钱|纸|钞|通宝|重宝|元宝/,
      weight: /重\s*[一二三四五六七八九十百千]|\d+\s*铢|\d+\s*两/,
      purity: /成色|足色|精铸|减铸|减重/,
      mintAgency: /户部|宝泉局|宝源局|铸所|造币|铸钱/,
      taxType: /商税|盐税|茶税|市舶|关税|算赋|田租/,
      base: /按人|按丁|按亩|按户|按产/,
      rate: /\d+\s*文|\d+%|百分之|什一|十分之/,
      target: /江南|山西|陕西|京畿|直隶|广东|广西|福建|浙江|湖广|四川|山东|河南|某省|某路|某道/,
      policyId: /禁伐|封山|疏浚|水利|治水|复耕|屯田|休耕|限垦|开荒|垦荒|治盐|清污|禁猎/,
      action: /清查|重造|改色|变籍|入编/,
      target: /逃户|隐户|僧道|军户|编户/,
      scope: /全国|天下|某省|某府|某县/,
      mode: /折银|钱粮|半折|全折|常额|均派/,
      commutationRate: /折\s*[五六七八九]\s*分/,
      system: /府兵|募兵|卫所|八旗|绿营|团练/,
      scale: /\d+\s*万|五万|十万/,
      officeName: /设.*司|立.*部|置.*院|创.*监/,
      rank: /[一二三四五六七八九]品/,
      duties: /掌|辖|管|司/
    };
    var filled = 0;
    type.requiredFields.forEach(function(f) {
      if (keywordMap[f] && keywordMap[f].test(text)) filled++;
    });
    return filled / Math.max(1, type.requiredFields.length);
  }

  function _assessUrgency(text, ctx) {
    var u = 0;
    ctx = ctx || {};
    var G = global.GM;
    if (G.activeWars && G.activeWars.length > 0) u += 0.4;
    if (G.activeFamine || (G.vars && G.vars.disasterLevel > 0.3)) u += 0.4;
    if (G.activeRevolt || (typeof G.unrest === 'number' && G.unrest > 70)) u += 0.5;
    var sc = (typeof global.findScenarioById === 'function') ? global.findScenarioById(G.sid) : null;
    var dpt = (typeof global._getDaysPerTurn === 'function') ? global._getDaysPerTurn() :
      ((sc && sc.time && sc.time.daysPerTurn) || (sc && sc.gameSettings && sc.gameSettings.daysPerTurn) || (sc && sc.timeConfig && sc.timeConfig.daysPerTurn) || 30);
    if (dpt <= 3) u += 0.3;
    else if (dpt <= 30) u += 0.1;
    else if (dpt > 180) u -= 0.2;
    if (/赈|救|急|速|速办|立即/.test(text)) u += 0.3;
    if (/朕欲.*改.*制/.test(text)) u -= 0.2;
    return Math.max(0, Math.min(1, u));
  }

  function _assessImportance(text, typeKey) {
    var i = 0;
    if (/全国|天下/.test(text)) i += 0.7;
    else if (/某省|某路|某道/.test(text)) i += 0.5;
    else i += 0.2;
    if (typeKey === 'currency_reform' || typeKey === 'military_reform' || typeKey === 'office_reform') i += 0.3;
    if (/改制|变法|创新/.test(text)) i += 0.2;
    return Math.max(0, Math.min(1, i));
  }

  function _detectType(text) {
    if (/铜钱|银本|金本|铸.*通宝|发.*钞|交子|会子|宝钞|官票|纸币|纸钞|私铸|私钱|减铸|币制|钱法|币改/.test(text)) return 'currency_reform';
    if (/禁伐|封山|育木|育林|疏浚|浚河|水利|治水|复耕|屯田|休耕|限垦|开荒|垦荒|垦殖|治盐|盐碱|清污|净流|禁猎|环境|承载/.test(text)) return 'environment_policy';
    if (/央地|起运|存留|留成|分成|分税|下拨|拨银|拨款|发帑|强征|地方留存|监察御史|巡按|巡察|查核钱粮/.test(text)) return 'central_local_finance';
    if (/税|赋|榷|课|饷/.test(text)) return 'tax_reform';
    if (/户籍|户口|户等|黄册|白册|保甲|里甲|编户|色目|隐户|逃户|流民|黄籍|漏籍/.test(text)) return 'huji_reform';
    if (/徭役|役法|差役|均徭|一条鞭|摊丁|役银/.test(text)) return 'corvee_reform';
    if (/府兵|募兵|卫所|八旗|绿营|兵制|军制|常备/.test(text)) return 'military_reform';
    if (/设.*司|立.*部|置.*院|创.*监|官制|职官|机构/.test(text)) return 'office_reform';
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  判定分流主函数
  // ═══════════════════════════════════════════════════════════════════

  function classify(text, ctx) {
    ctx = ctx || {};
    var typeKey = ctx.typeOverride || _detectType(text);
    if (!typeKey) {
      return { pathway: 'other', typeKey: null, reason: '未识别为制度类诏书' };
    }
    var completeness = _assessCompleteness(text, typeKey);
    var urgency = _assessUrgency(text, ctx);
    var importance = _assessImportance(text, typeKey);

    var pathway;
    if (urgency > 0.7) pathway = 'direct';                    // 紧急强制直断
    else if (completeness > 0.6) pathway = 'direct';          // 完整度高直断
    else if (completeness < 0.1) pathway = 'ask';             // 意图模糊追问
    else if (completeness < 0.3 && importance > 0.7 && urgency < 0.5) pathway = 'memorial'; // 复奏
    else pathway = 'direct';                                  // 默认直断（AI 补缺）

    var drafter = EDICT_TYPES[typeKey].drafter;
    var objectionRisk = (1 - completeness) * importance * 0.5;

    return {
      pathway: pathway,
      typeKey: typeKey,
      typeName: EDICT_TYPES[typeKey].name,
      completeness: completeness,
      urgency: urgency,
      importance: importance,
      drafter: drafter,
      objectionRisk: objectionRisk
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  解析 + 执行（直断路径）
  // ═══════════════════════════════════════════════════════════════════

  function tryExecute(text, params, ctx) {
    var cls = classify(text, ctx);
    if (cls.pathway !== 'direct') {
      return { ok: false, pathway: cls.pathway, classification: cls };
    }
    var type = EDICT_TYPES[cls.typeKey];
    if (!type || !type.aiEntry) return { ok: false, reason: '类型无执行入口' };
    var exec = false;
    try {
      var execParams = Object.assign({ _edictText: text, _edictContext: ctx || {}, _classification: cls }, params || {});
      exec = type.aiEntry(execParams);
      if (exec && cls.typeKey === 'huji_reform') _recordEdictPolicyAction('huji', execParams.action || cls.typeKey, exec, text);
    } catch(e) { console.error('[edict] exec', e); exec = false; }
    return { ok: exec, pathway: 'direct', classification: cls };
  }

  /** 将意图明确但细节不足的诏书转奏疏（二阶段） */
  function submitToMemorial(text, cls) {
    var G = global.GM;
    if (!G._pendingMemorials) G._pendingMemorials = [];
    var memo = {
      id: 'memo_' + (G.turn || 0) + '_' + Math.floor(Math.random()*10000),
      originalEdictText: text,
      typeKey: cls.typeKey,
      typeName: cls.typeName,
      drafter: cls.drafter,
      turn: G.turn || 0,
      expectedReturnTurn: (G.turn || 0) + 1,
      completeness: cls.completeness,
      importance: cls.importance,
      urgency: cls.urgency,
      status: 'pending_draft'
    };
    G._pendingMemorials.push(memo);
    if (global.addEB) global.addEB('诏令', '意旨已下，' + cls.drafter + ' 将于下回合具奏');
    return memo;
  }

  /** AI 侍臣问疑（类 C 追问） */
  function askForClarification(text, cls) {
    var G = global.GM;
    if (!G._pendingClarifications) G._pendingClarifications = [];
    var clar = {
      id: 'clar_' + (G.turn || 0) + '_' + Math.floor(Math.random()*10000),
      originalText: text,
      turn: G.turn || 0,
      questions: _generateQuestions(text, cls),
      status: 'awaiting_answer'
    };
    G._pendingClarifications.push(clar);
    if (global.addEB) global.addEB('诏令', '侍臣问疑：' + clar.questions[0]);
    return clar;
  }

  function _generateQuestions(text, cls) {
    var type = EDICT_TYPES[cls.typeKey] || {};
    var qs = [];
    (type.critical || []).forEach(function(f) {
      var fMap = {
        coinType: '欲铸何币（铜/银/铁/纸）？',
        taxType: '征何税（商/盐/茶/市舶）？',
        rate: '税率几何？',
        action: '欲行何事（清查/重造/变籍）？',
        mode: '役法何制（折银/钱粮/均派）？',
        system: '兵何制（府兵/募兵/卫所）？',
        officeName: '欲设何官司？'
      };
      if (fMap[f]) qs.push(fMap[f]);
    });
    if (qs.length === 0) qs.push('圣意具体如何？');
    return qs;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  每回合处理奏疏/抗疏
  // ═══════════════════════════════════════════════════════════════════

  function _tickPendingMemorials(ctx) {
    var G = global.GM;
    if (!G._pendingMemorials) return;
    G._pendingMemorials.forEach(function(memo) {
      if (memo.status === 'pending_draft' && (ctx.turn || 0) >= memo.expectedReturnTurn) {
        memo.status = 'drafted';
        memo.draftText = _generateDraft(memo);
        // 加入 notifications / qiju
        if (!G._memorialNotifications) G._memorialNotifications = [];
        G._memorialNotifications.push({ id: memo.id, drafter: memo.drafter, summary: (memo.draftText || '').slice(0, 80) });
        if (global.addEB) global.addEB('奏疏', memo.drafter + '呈奏：' + (memo.draftText || '').slice(0, 30) + '…');
        // 重大奏疏触发抗疏
        try { _checkAbduction(memo, ctx); } catch(e) { (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'edict] abduction:') : console.error('[edict] abduction:', e); }
      }
    });
    // 清理 30 回合前的
    G._pendingMemorials = G._pendingMemorials.filter(function(m) { return (ctx.turn || 0) - m.turn < _turnsForMonthsLocal(30); });
  }

  function _generateDraft(memo) {
    // 简化：按类型生成默认提案
    var templates = {
      currency_reform: '臣奉旨议币改。拟铸新钱，重三铢五分，官铸户部，岁铸百万贯，禁私铸。伏乞圣裁。',
      tax_reform: '臣奉旨议立新税。拟于通关要道征税，百抽三，商户登记。伏乞圣裁。',
      huji_reform: '臣奉旨议户籍整饬。拟重造黄册，限三年清查，罚匿户仗八十。伏乞圣裁。',
      corvee_reform: '臣奉旨议役法。拟行折银，每丁岁一钱五分，灾年减半。伏乞圣裁。',
      military_reform: '臣奉旨议兵制。拟募兵五万，月饷二两，岁训春秋。伏乞圣裁。',
      office_reform: '臣奉旨议官制。拟设新司，正五品衙，员额二十，辖各属。伏乞圣裁。'
    };
    return templates[memo.typeKey] || '臣奉旨谨议。伏乞圣裁。';
  }

  /** 皇帝朱批（approve/reject/modify）*/
  function _getMemorialPolicyText(memo, params) {
    params = params || {};
    return String(params._edictText || params.draftText || params.text ||
      (memo && (memo.draftText || memo.originalEdictText || memo.text || memo.subject)) || '');
  }

  function _buildMemorialExecParams(memo, extra) {
    var params = Object.assign({}, (memo && memo.draftParams) || {}, extra || {});
    var text = _getMemorialPolicyText(memo, params);
    if (text && params._edictText == null) params._edictText = text;
    if (params.trialRegion && !params.regionId) params.regionId = params.trialRegion;
    if (memo && memo.trialRegion && !params.regionId) params.regionId = memo.trialRegion;
    if (!params._edictContext) {
      params._edictContext = {
        source: 'memorial',
        memoId: memo && memo.id,
        trialMode: !!(memo && memo.trialMode)
      };
    }
    if (!params._classification && memo) {
      params._classification = {
        pathway: 'memorial',
        typeKey: memo.typeKey,
        typeName: memo.typeName
      };
    }
    return params;
  }

  function processImperialAssent(memoId, decision, modifications) {
    var G = global.GM;
    if (!G._pendingMemorials) return { ok: false };
    var memo = G._pendingMemorials.find(function(m) { return m.id === memoId; });
    if (!memo) return { ok: false, reason: '未找到奏疏' };
    // R12b inline (原 phase-c-patches OVERRIDE side-effect)·官制类 approve 时·自动注册 dynamicInstitution
    if (memo.typeKey === 'office_reform' && decision === 'approve') {
      var assentParams = Object.assign({}, memo.draftParams || {}, modifications || {});
      if (assentParams.officeName) {
        registerDynamicInstitution({
          name: assentParams.officeName,
          rank: assentParams.rank || 5,
          duties: assentParams.duties || '',
          region: (assentParams.details && assentParams.details.region) || 'central',
          staffSize: (assentParams.details && assentParams.details.staffSize) || 20,
          fundingSource: (assentParams.details && assentParams.details.fundingSource) || 'guoku.central',
          annualBudget: (assentParams.details && assentParams.details.annualBudget) || 50000,
          createdBy: 'memorial_approved_' + memoId
        });
      }
    }
    if (decision === 'approve') {
      memo.status = 'approved';
      // 执行
      var type = EDICT_TYPES[memo.typeKey];
      if (type && type.aiEntry) {
        var params = _buildMemorialExecParams(memo, modifications);
        memo.executionResult = type.aiEntry(params);
      }
      if (global.addEB) global.addEB('诏令', memo.typeName + ' 已施行');
    } else if (decision === 'reject') {
      memo.status = 'rejected';
      if (global.addEB) global.addEB('诏令', memo.typeName + ' 诏议搁置');
    } else if (decision === 'modify') {
      memo.status = 'modified';
      memo.draftParams = Object.assign({}, memo.draftParams || {}, modifications || {});
      // 下回合再议
      memo.expectedReturnTurn = (G.turn || 0) + 1;
    }
    return { ok: true, status: memo.status };
  }

  /** 抗疏 — 重大制度诏书触发 */
  function _checkAbduction(memo, ctx) {
    var G = global.GM;
    if (!memo || memo.objectionRisk < 0.5) return null;
    // 抗疏概率 = importance × (1 - completeness) × 抵抗因子
    var risk = (memo.importance || 0.5) * (1 - (memo.completeness || 0.5));
    // 有清流大臣可能抗疏
    var objector = (G.chars || []).find(function(c) {
      if (c.alive === false) return false;
      var integrity = c.integrity || c.benevolence || 50;
      return integrity > 70 && c.loyalty > 60 && (c.officialTitle || '').match(/御史|谏议|拾遗|补阙/);
    });
    if (!objector) return null;
    if (Math.random() < risk) {
      // 触发抗疏
      var obj = {
        id: 'obj_' + (ctx.turn || 0) + '_' + Math.floor(Math.random()*10000),
        turn: ctx.turn || 0,
        objector: objector.name,
        target: memo.id,
        content: '臣 ' + objector.name + ' 死谏：' + memo.typeName + ' 不可行也。'
      };
      if (!G._abductions) G._abductions = [];
      G._abductions.push(obj);
      if (global.addEB) global.addEB('抗疏', objector.name + ' 抗疏：' + memo.typeName);
      return obj;
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  主 tick
  // ═══════════════════════════════════════════════════════════════════

  function tick(ctx) {
    ctx = ctx || {};
    // R12b inline (原 phase-c-patches OVERRIDE)·官制 pending_draft 到期 enhance Phase II 详奏
    var G = global.GM;
    (G && G._pendingMemorials || []).forEach(function(m) {
      if (m.typeKey === 'office_reform' && m.status === 'pending_draft' && (ctx.turn || 0) >= m.expectedReturnTurn && !m._enhanced) {
        m._enhanced = true;
        try { enhanceOfficeReformDraft(m); } catch(_e) {}
      }
    });
    try { _tickPendingMemorials(ctx); } catch(e) { (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'edict] memo:') : console.error('[edict] memo:', e); }
    // R12b inline (原 phase-c-patches PhaseC.tick 内容)·御史核查 + 动态机构衰减
    try { _tickInvestigations(ctx); } catch(e) { (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'edict] inv:') : console.error('[edict] inv:', e); }
    try { _tickDynamicInstitutions(ctx, _getMonthRatioLocal(ctx)); } catch(e) { (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'edict] inst:') : console.error('[edict] inst:', e); }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  R12b 合并·原 tm-phase-c-patches.js (LAYERED OVERRIDE + APPEND·498 行)
  //  · C1 侍臣问疑 UI (QUERY_QUICK_OPTIONS·openClarificationPanel·_answerClarification)
  //  · C2 朱批扩展 7 选项 (processImperialAssentExtended·_tickInvestigations)
  //  · C3 动态机构 (registerDynamicInstitution·_tickDynamicInstitutions·abolishInstitution)
  //  · C3.5 官制二阶段 Phase II (enhanceOfficeReformDraft)
  // ═══════════════════════════════════════════════════════════════════

  // C1 · 侍臣问疑 7 快捷选项
  var QUERY_QUICK_OPTIONS = [
    { id:'admin',    label:'吏治 · 整顿官场',    route:'integrity',       fill:'整顿吏治，清查墨吏' },
    { id:'civil',    label:'民生 · 赈济教化',    route:'welfare',         fill:'赈济灾民，劝农桑' },
    { id:'fiscal',   label:'财政 · 税赋徭役',    route:'tax_reform',      fill:'议税法徭役，宽民力' },
    { id:'frontier', label:'边防 · 御敌守疆',    route:'military',        fill:'整饬边备，强边军' },
    { id:'water',    label:'水利 · 治河疏渠',    route:'public_works',    fill:'兴水利，疏浚河道' },
    { id:'military', label:'军政 · 兵制武备',    route:'military_reform', fill:'议兵制，明武备' },
    { id:'judicial', label:'刑狱 · 司法清明',    route:'legal',           fill:'清理狱讼，平冤抑' }
  ];

  function _escapeHtmlEdict(s) { return (typeof escHtml === 'function') ? escHtml(s) : (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function openClarificationPanel(clarId) {
    var G = global.GM;
    if (!G._pendingClarifications) return;
    var clar = clarId ? G._pendingClarifications.find(function(c){return c.id===clarId;}) : G._pendingClarifications.filter(function(c){return c.status==='awaiting_answer';})[0];
    if (!clar) {
      if (global.toast) global.toast('无待答问疑');
      return;
    }
    var body = '<div style="max-width:540px;font-family:inherit;">';
    body += '<div style="font-size:1.0rem;color:var(--gold-300);margin-bottom:0.4rem;letter-spacing:0.1em;">🤵 臣愚钝，斗胆请示</div>';
    body += '<div style="font-size:0.78rem;color:var(--ink-300);padding:8px 10px;background:var(--bg-2);border-radius:4px;margin-bottom:0.8rem;font-style:italic;">';
    body += '陛下所谕"' + _escapeHtmlEdict((clar.originalText||'').slice(0,80)) + '"——' + (clar.questions && clar.questions[0] ? '<br>' + _escapeHtmlEdict(clar.questions[0]) : '其所指为何方？');
    body += '</div>';
    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:0.6rem;">';
    QUERY_QUICK_OPTIONS.forEach(function(opt) {
      body += '<button class="btn" style="font-size:0.72rem;padding:8px;text-align:left;" onclick="EdictComplete._answerClarification(\''+clar.id+'\',\'quick\',\''+opt.id+'\')">' + _escapeHtmlEdict(opt.label) + '</button>';
    });
    body += '</div>';
    body += '<div style="margin-bottom:0.4rem;">';
    body += '<input id="_clar_fill_' + clar.id + '" type="text" placeholder="自填补充……" style="width:100%;padding:6px;background:var(--bg-2);border:1px solid var(--bdr);color:var(--ink-100);font-family:inherit;font-size:0.78rem;">';
    body += '<button class="btn" style="font-size:0.72rem;padding:4px 10px;margin-top:4px;" onclick="EdictComplete._answerClarification(\''+clar.id+'\',\'fill\',document.getElementById(\'_clar_fill_'+clar.id+'\').value)">提交补诏</button>';
    body += '</div>';
    body += '<hr style="border:0;border-top:1px dashed var(--bdr);margin:0.6rem 0;">';
    body += '<div style="display:flex;gap:4px;">';
    body += '<button class="btn" style="font-size:0.72rem;padding:6px 12px;" onclick="EdictComplete._answerClarification(\''+clar.id+'\',\'delegate\')">让有司揣摩圣意</button>';
    body += '<button class="btn" style="font-size:0.72rem;padding:6px 12px;" onclick="EdictComplete._answerClarification(\''+clar.id+'\',\'abandon\')">不予作答</button>';
    body += '</div>';
    body += '</div>';
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:19010;display:flex;align-items:center;justify-content:center;';
    ov.innerHTML = '<div style="background:var(--bg-1);border:1px solid var(--gold);border-radius:6px;padding:1.0rem;width:92%;max-width:560px;max-height:88vh;overflow-y:auto;">' + body + '<button class="btn" style="margin-top:0.6rem;" onclick="this.parentNode.parentNode.remove()">关闭</button></div>';
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    ov._clarId = clar.id;
  }

  function _answerClarification(clarId, mode, payload) {
    var G = global.GM;
    var clar = (G._pendingClarifications || []).find(function(c){return c.id===clarId;});
    if (!clar) return;
    var ovs = document.querySelectorAll('div[style*="z-index:19010"]');
    ovs.forEach(function(o){ if (o._clarId === clarId) o.remove(); });
    var rewrite = clar.originalText || '';
    if (mode === 'quick') {
      var opt = QUERY_QUICK_OPTIONS.find(function(o){return o.id===payload;});
      if (opt) rewrite = rewrite + '——' + opt.fill;
    } else if (mode === 'fill') {
      if (!payload || !payload.trim()) { if (global.toast) global.toast('未补充'); return; }
      rewrite = rewrite + '：' + payload.trim();
    } else if (mode === 'delegate') {
      clar.status = 'delegated';
      var cls = classify(rewrite, {});
      cls.pathway = 'memorial';
      cls.drafter = cls.drafter || '宰相';
      var memo = submitToMemorial(rewrite, cls);
      if (memo) memo._delegatedFromClarification = true;
      if (global.addEB) global.addEB('诏令', '令有司揣摩圣意，下回合具奏');
      if (global.toast) global.toast('已令有司揣摩');
      return;
    } else if (mode === 'abandon') {
      clar.status = 'abandoned';
      if (global.addEB) global.addEB('诏令', '诏议作罢');
      if (global.toast) global.toast('诏议作罢');
      return;
    }
    clar.status = 'answered';
    var result = tryExecute(rewrite, {}, {});
    if (global.addEB) global.addEB('诏令', '补诏重议：' + (result.pathway || '未定'));
    if (global.toast) global.toast('已重议：' + (result.pathway === 'direct' ? '直断' : result.pathway === 'memorial' ? '转复奏' : result.pathway === 'ask' ? '仍需再问' : '未识别'));
  }

  // C2 · 朱批扩展 7 选项
  function processImperialAssentExtended(memoId, action, opts) {
    var G = global.GM;
    opts = opts || {};
    if (!G._pendingMemorials) return { ok: false };
    var memo = G._pendingMemorials.find(function(m){return m.id===memoId;});
    if (!memo) return { ok: false, reason: '未找到奏疏' };
    if (action === 'approve') {
      return processImperialAssent(memoId, 'approve', opts.modifications);
    }
    if (action === 'modify_field') {
      memo.draftParams = Object.assign({}, memo.draftParams || {}, opts.fields || {});
      memo.status = 'modified';
      memo.expectedReturnTurn = (G.turn || 0) + 1;
      if (global.addEB) global.addEB('朱批', memo.typeName + '改' + Object.keys(opts.fields||{}).join('、') + '后再议');
      return { ok: true, status: 'modified' };
    }
    if (action === 'pick_official') {
      memo.draftParams = Object.assign({}, memo.draftParams || {}, { assignedOfficial: opts.officialName });
      memo.status = 'drafted';
      if (global.addEB) global.addEB('朱批', memo.typeName + '主官改选为 ' + opts.officialName);
      return { ok: true, status: 'drafted' };
    }
    if (action === 'trial_region') {
      memo.draftParams = Object.assign({}, memo.draftParams || {}, { trialRegion: opts.regionId, scope: 'trial' });
      memo.status = 'approved';
      memo.trialMode = true;
      var type = EDICT_TYPES && EDICT_TYPES[memo.typeKey];
      if (type && type.aiEntry) memo.executionResult = type.aiEntry(_buildMemorialExecParams(memo, {}));
      if (global.addEB) global.addEB('朱批', memo.typeName + ' 试点于 ' + opts.regionId);
      return { ok: true, status: 'trial' };
    }
    if (action === 'reject') {
      memo.status = 'rejected';
      if (global.addEB) global.addEB('朱批', memo.typeName + ' 诏议搁置');
      return { ok: true, status: 'rejected' };
    }
    if (action === 'redraft') {
      memo.status = 'redraft_pending';
      memo.drafter = opts.newDrafter || memo.drafter;
      memo.expectedReturnTurn = (G.turn || 0) + 1;
      if (global.addEB) global.addEB('朱批', memo.typeName + '换 ' + memo.drafter + ' 再议');
      return { ok: true, status: 'redraft_pending' };
    }
    if (action === 'investigate') {
      if (!G._investigations) G._investigations = [];
      G._investigations.push({
        id: 'invest_' + (G.turn||0) + '_' + Math.floor(Math.random()*10000),
        target: memoId,
        drafter: memo.drafter,
        startTurn: G.turn || 0,
        expectedReturnTurn: (G.turn || 0) + 2,
        cost: 5000
      });
      if (G.guoku) G.guoku.money = Math.max(0, G.guoku.money - 5000);
      memo.status = 'under_investigation';
      if (global.addEB) global.addEB('监察', '派御史核查 ' + memo.drafter + ' 奏疏');
      return { ok: true, status: 'investigating' };
    }
    return { ok: false, reason: '未知动作' };
  }

  function _tickInvestigations(ctx) {
    var G = global.GM;
    if (!G || !G._investigations) return;
    G._investigations.forEach(function(inv) {
      if (inv.status === 'done') return;
      if ((ctx.turn || 0) < inv.expectedReturnTurn) return;
      var drafter = (G.chars || []).find(function(c){return c.name===inv.drafter;});
      var fraudScore = drafter ? Math.max(0, 100 - (drafter.integrity || 60)) / 100 : 0.3;
      var flaws = [];
      if (fraudScore > 0.5) flaws.push('工料费夹带');
      if (fraudScore > 0.7) flaws.push('门生亲族列于人选');
      if (fraudScore > 0.6 && Math.random() < 0.5) flaws.push('虚报工程量');
      inv.result = { fraudScore: fraudScore, flaws: flaws, reportedTurn: ctx.turn };
      inv.status = 'done';
      if (global.addEB) global.addEB('监察', '御史回奏：' + inv.drafter + (flaws.length > 0 ? ' 涉 ' + flaws.join('、') : ' 奏疏清白'));
    });
    G._investigations = G._investigations.filter(function(i){return (ctx.turn - i.startTurn) < _turnsForMonthsLocal(12);});
  }

  // C3 · 动态机构 GM.dynamicInstitutions
  function registerDynamicInstitution(spec) {
    var G = global.GM;
    if (!G.dynamicInstitutions) G.dynamicInstitutions = [];
    var hq = (G.huangquan && G.huangquan.index) || 50;
    var inst = {
      id: 'inst_' + (G.turn || 0) + '_' + Math.floor(Math.random()*10000),
      name: spec.name || '新设衙门',
      rank: spec.rank || 5,
      duties: spec.duties || '',
      region: spec.region || 'central',
      subordinateTo: spec.subordinateTo || null,
      staffSize: spec.staffSize || 20,
      publicTreasuryBinding: spec.fundingSource || 'guoku.central',
      annualBudget: spec.annualBudget || 50000,
      headOfficial: spec.headOfficial || null,
      createdTurn: G.turn || 0,
      createdBy: spec.createdBy || 'edict',
      stage: 'proposal',
      effectiveness: hq < 40 ? 0.4 : hq < 70 ? 0.75 : 1.0,
      corruption: hq < 40 ? 40 : 15,
      history: []
    };
    G.dynamicInstitutions.push(inst);
    if (hq > 75 && typeof G.huangquan === 'object') {
      if (global.AuthorityEngines && global.AuthorityEngines.adjustHuangquan) {
        global.AuthorityEngines.adjustHuangquan('cabinetization', -5, '\u65b0\u8bbe\u673a\u6784\u5206\u6743');
      } else {
        G.huangquan.index = Math.max(0, G.huangquan.index - 5);
      }
    }
    if (G.guoku && G.guoku.money >= inst.annualBudget) {
      G.guoku.money -= inst.annualBudget;
    } else {
      inst.stage = 'underfunded';
      inst.effectiveness *= 0.5;
    }
    if (global.addEB) global.addEB('机构', '新设 ' + inst.name + '（品 ' + inst.rank + '，岁支 ' + inst.annualBudget + '）');
    return inst;
  }

  function _tickDynamicInstitutions(ctx, mr) {
    var G = global.GM;
    if (!G || !G.dynamicInstitutions) return;
    var isFiscalYear = (typeof global.isYearBoundary === 'function') ? global.isYearBoundary(ctx.turn || G.turn || 0) : ((G.month || 1) === 1 && G.turn > 0);
    G.dynamicInstitutions.forEach(function(inst) {
      if (inst.stage === 'abolished') return;
      if (isFiscalYear && G.guoku) {
        if (G.guoku.money >= inst.annualBudget) {
          G.guoku.money -= inst.annualBudget;
          inst.stage = 'running';
        } else {
          inst.stage = 'underfunded';
          inst.effectiveness *= 0.8;
          if (global.addEB) global.addEB('机构', inst.name + ' 拨款不足，裁员');
        }
      }
      inst.corruption = Math.min(100, inst.corruption + 0.1 * mr);
      if (inst.corruption > 80 && G.corruption) {
        G.corruption.trueIndex = Math.min(100, (typeof G.corruption.trueIndex === 'number' ? G.corruption.trueIndex : (G.corruption.overall || 0)) + 0.05 * mr);
        G.corruption.overall = G.corruption.trueIndex;
      }
    });
    G.dynamicInstitutions = G.dynamicInstitutions.filter(function(inst) {
      if (inst.stage === 'abolished' && (ctx.turn - inst.abolishedTurn) > _turnsForMonthsLocal(60)) return false;
      return true;
    });
  }

  function abolishInstitution(instId) {
    var G = global.GM;
    if (!G.dynamicInstitutions) return;
    var inst = G.dynamicInstitutions.find(function(i){return i.id===instId;});
    if (!inst) return;
    inst.stage = 'abolished';
    inst.abolishedTurn = G.turn || 0;
    if (global.addEB) global.addEB('机构', inst.name + ' 已废');
    return inst;
  }

  // C3.5 · 官制二阶段 Phase II
  function enhanceOfficeReformDraft(memo) {
    if (!memo || memo.typeKey !== 'office_reform') return;
    var G = global.GM;
    var params = memo.draftParams || {};
    var candidates = (G.chars || []).filter(function(c) {
      return c.alive !== false && c.officialTitle && (c.rank || 5) <= 4;
    }).slice(0, 3).map(function(c){return c.name;});
    var fundingSources = ['帑廪', '户部度支', '节余', '新加税赋'];
    params.details = {
      staffSize: 20 + Math.floor(Math.random() * 80),
      region: params.region || 'central',
      annualBudget: 50000 + Math.floor(Math.random() * 100000),
      fundingSource: fundingSources[Math.floor(Math.random() * fundingSources.length)],
      candidates: candidates,
      rank: params.rank || 5
    };
    memo.draftParams = params;
    memo.draftText = (params.officeName ? '设 ' + params.officeName + ' ' : '') + '拟：员额 ' + params.details.staffSize + '；驻 ' + params.details.region + '；岁支 ' + params.details.annualBudget + '；款出 ' + params.details.fundingSource + '；举 ' + params.details.candidates.join('、') + ' 候选。伏乞圣裁。';
    return memo;
  }

  // (C4 环保 POLICY_KEYWORDS / detectEnvPolicy / routeEnvPolicy — R12 遗留死代码·主流程零调用·2026-05-29 删除)

  // ═══════════════════════════════════════════════════════════════════
  //  AI 上下文
  // ═══════════════════════════════════════════════════════════════════

  function getAIContext() {
    var G = global.GM;
    if (!G) return '';
    var lines = [];
    if (G._pendingMemorials && G._pendingMemorials.length > 0) {
      var pending = G._pendingMemorials.filter(function(m) { return m.status === 'drafted'; });
      if (pending.length > 0) {
        lines.push('【奏疏】已拟就待朱批 ' + pending.length + ' 本：' + pending.slice(0,3).map(function(m) { return m.typeName; }).join('、'));
      }
    }
    if (G._pendingClarifications && G._pendingClarifications.length > 0) {
      lines.push('【问疑】侍臣待回答 ' + G._pendingClarifications.length + ' 项');
    }
    if (G._abductions && G._abductions.length > 0) {
      var recent = G._abductions.filter(function(o) { return (G.turn || 0) - o.turn < 5; });
      if (recent.length > 0) lines.push('【抗疏】近有 ' + recent.length + ' 起');
    }
    return lines.length > 0 ? lines.join('\n') : '';
  }

  // ═══════════════════════════════════════════════════════════════════
  //  导出
  // ═══════════════════════════════════════════════════════════════════

  global.EdictParser = {
    classify: classify,
    tryExecute: tryExecute,
    submitToMemorial: submitToMemorial,
    askForClarification: askForClarification,
    processImperialAssent: processImperialAssent,
    tick: tick,
    getAIContext: getAIContext,
    EDICT_TYPES: EDICT_TYPES,
    HISTORICAL_EDICT_PRESETS: HISTORICAL_EDICT_PRESETS,
    // 动态访问（支持 scriptData.customPresets.edictPresets 覆盖/追加）
    getHistoricalEdictPresets: function() {
      var sd = global.scriptData || {};
      var cps = sd.customPresets || {};
      var overrides = cps.edictPresets || cps.classicalEdicts;  // 两个键都支持
      if (!Array.isArray(overrides) || overrides.length === 0) return HISTORICAL_EDICT_PRESETS;
      var map = {};
      HISTORICAL_EDICT_PRESETS.forEach(function(x){ if (x && x.id) map[x.id] = x; });
      overrides.forEach(function(x){ if (x && x.id) map[x.id] = Object.assign({}, map[x.id]||{}, x); });
      return Object.keys(map).map(function(k){ return map[k]; });
    },
    // R12b inline·原 phase-c-patches APPEND
    registerDynamicInstitution: registerDynamicInstitution,
    abolishInstitution: abolishInstitution,
    enhanceOfficeReformDraft: enhanceOfficeReformDraft,
    VERSION: 2
  };

  // R12b inline·原 phase-c-patches EdictComplete extension
  global.EdictComplete = global.EdictComplete || {};
  global.EdictComplete.openClarificationPanel = openClarificationPanel;
  global.EdictComplete._answerClarification = _answerClarification;
  global.EdictComplete.processImperialAssentExtended = processImperialAssentExtended;
  global.EdictComplete.QUERY_QUICK_OPTIONS = QUERY_QUICK_OPTIONS;

  // R12b inline·原 phase-c-patches PhaseC namespace (defensive shim·防 3rd party reference)
  global.PhaseC = global.PhaseC || {};
  global.PhaseC.init = function() { /* OVERRIDEs 已 inline 入 v1·init 不再需要安装 patch */ };
  global.PhaseC.tick = tick;
  global.PhaseC.registerDynamicInstitution = registerDynamicInstitution;
  global.PhaseC.abolishInstitution = abolishInstitution;
  global.PhaseC.enhanceOfficeReformDraft = enhanceOfficeReformDraft;
  global.PhaseC.openClarificationPanel = openClarificationPanel;
  global.PhaseC.processImperialAssentExtended = processImperialAssentExtended;
  global.PhaseC.VERSION = 2;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
