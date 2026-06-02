// @ts-check
/// <reference path="types.d.ts" />
/**
 * editor-authoring-agent.js — 剧本 authoring agent · S1 沙箱 + 工具层
 *
 * 目标：给"玩家在编辑器里用自然语言驱动 AI 生成/编辑剧本"提供安全的工具底座。
 * 本文件只含 S1（无 LLM）：
 *   makeDraft      —— scope 沙箱：深拷贝 scriptData 作为 draft，agent 只拿到这一个对象
 *   applyEdit/Push —— 在 draft 上做结构化编辑，旁路 PathUtils 的运行时副作用（坑 B）
 *   validateDraft  —— 3 条 draft-scoped 不变量校验器（不读 global GM）
 *
 * 安全模型（见 memory: agent 权限按作用范围非类型）：
 *   - 结构边界：所有工具只接受传入的 draft 对象，PathUtils.resolvePath 只在 draft 内部
 *     导航，物理上够不到 window / GM / 文件系统。
 *   - draft 内完整性：applyEdit 带 blocklist；validateDraft 守数据一致性。
 *
 * 关键设计（坑 B）：PathUtils.applyPathSet 带三条 global.GM 副作用通道
 *   （_syncCoreVarSideEffects / _recordToTurnChanges / loyalty 拦截）。本模块**不调用**它，
 *   只用下面内联的纯函数 _resolvePath 做导航，赋值由本模块自己完成 —— 零运行时副作用。
 *   （editor.html 不加载 tm-ai-change-pathutils.js，故按 copy-pure-helper paradigm 内联一份 resolvePath。）
 *
 * 双环境：浏览器（editor）+ node（smoke 测试）均可加载。
 */
(function(global) {
  'use strict';

  // 内联的纯路径解析器（复制自 tm-ai-change-pathutils.js 的 _resolvePath·纯函数·无副作用）
  // 支持 a.b、a[0]、以及在数组上按 name/id 取元素（如 chars.张三.loyalty）
  function _resolvePath(obj, path) {
    if (!obj || !path) return { parent: null, key: null, exists: false, value: undefined };
    var keys = String(path).split('.');
    var parent = obj;
    for (var i = 0; i < keys.length - 1; i++) {
      var k = keys[i];
      var m = k.match(/^(\w+)\[(\d+)\]$/);
      if (m) {
        if (!parent[m[1]]) return { parent: null, key: null, exists: false, value: undefined };
        parent = parent[m[1]][Number(m[2])];
      } else if (Array.isArray(parent) && isNaN(Number(k))) {
        var nextParent = parent.find(function(it) { return it && (it.name === k || it.id === k); });
        if (!nextParent) return { parent: null, key: null, exists: false, value: undefined };
        parent = nextParent;
      } else if (Array.isArray(parent) && !isNaN(Number(k))) {
        parent = parent[Number(k)];
      } else {
        if (parent[k] === undefined || parent[k] === null) return { parent: null, key: null, exists: false, value: undefined };
        parent = parent[k];
      }
      if (parent === undefined || parent === null) return { parent: null, key: null, exists: false, value: undefined };
    }
    var lastKey = keys[keys.length - 1];
    if (Array.isArray(parent) && isNaN(Number(lastKey))) {
      var target = parent.find(function(it) { return it && (it.name === lastKey || it.id === lastKey); });
      if (target !== undefined) {
        return { parent: parent, key: parent.indexOf(target), exists: true, value: target };
      }
    }
    return { parent: parent, key: lastKey, exists: parent[lastKey] !== undefined, value: parent[lastKey] };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  scope 沙箱
  // ═══════════════════════════════════════════════════════════════════

  /** 深拷贝 scriptData（或传入对象）作为 draft。与 editor 持久化的 _cloneForPersistence 同法。 */
  function makeDraft(source) {
    var src = source || global.scriptData || {};
    return JSON.parse(JSON.stringify(src));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  draft 内编辑保护（within-draft blocklist，非安全边界——边界是 draft 本身）
  // ═══════════════════════════════════════════════════════════════════
  //  agent 不应改的字段：剧本唯一 ID、下划线内部字段、API/AI 配置、通用 conf、meta
  var BLOCKED = [
    /^id$/,              // 剧本唯一 ID
    /(^|\.)_/,           // 任意下划线开头的段（内部态）
    /(^|\.)ai(\.|$)/i,   // API / AI 配置
    /(^|\.)conf(\.|$)/i, // 通用配置
    /(^|\.)meta(\.|$)/i  // 元信息
  ];

  function isBlocked(path) {
    if (!path) return true;
    var p = String(path);
    return BLOCKED.some(function(re) { return re.test(p); });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  applyEdit / applyPush —— 旁路 PathUtils 副作用
  // ═══════════════════════════════════════════════════════════════════

  /**
   * 在 draft 上按 path 设值。只用 PathUtils.resolvePath 纯导航 + 自己赋值，
   * 不触发任何 global.GM 副作用 / loyalty 拦截 / turnChanges 记录。
   * @returns {{ok:boolean, path?:string, old?:*, new?:*, created?:boolean, reason?:string}}
   */
  function applyEdit(draft, path, value, opts) {
    opts = opts || {};
    if (!draft || typeof draft !== 'object') return { ok: false, reason: 'no draft' };
    if (!path) return { ok: false, reason: 'empty path' };
    if (!opts.force && isBlocked(path)) return { ok: false, reason: 'blocked path: ' + path };

    var r = _resolvePath(draft, path);
    if (!r.parent) {
      // 创建缺失路径（仅纯对象路径；数组按名创建不支持）
      var keys = String(path).split('.');
      var cur = draft;
      for (var i = 0; i < keys.length - 1; i++) {
        var k = keys[i];
        if (/[\[\]]/.test(k)) return { ok: false, reason: '无法创建数组索引路径: ' + path };
        if (cur[k] === undefined || cur[k] === null) cur[k] = {};
        cur = cur[k];
      }
      var last = keys[keys.length - 1];
      var oldCreated = cur[last];
      cur[last] = value;
      return { ok: true, path: path, old: oldCreated, new: value, created: true };
    }
    var old = r.exists ? r.value : undefined;
    r.parent[r.key] = value;
    return { ok: true, path: path, old: old, new: value };
  }

  /** 在 draft 上按 path 向数组追加元素（同样旁路副作用）。 */
  function applyPush(draft, path, value, opts) {
    opts = opts || {};
    if (!draft || typeof draft !== 'object') return { ok: false, reason: 'no draft' };
    if (!path) return { ok: false, reason: 'empty path' };
    if (!opts.force && isBlocked(path)) return { ok: false, reason: 'blocked path: ' + path };

    var r = _resolvePath(draft, path);
    if (!r.parent) {
      var keys = String(path).split('.');
      var cur = draft;
      for (var i = 0; i < keys.length - 1; i++) {
        if (cur[keys[i]] === undefined || cur[keys[i]] === null) cur[keys[i]] = {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = [value];
      return { ok: true, path: path, pushed: value, created: true };
    }
    if (!Array.isArray(r.parent[r.key])) r.parent[r.key] = [];
    r.parent[r.key].push(value);
    return { ok: true, path: path, pushed: value };
  }

  /** 删除 draft 某路径的元素（数组按索引 splice·对象 delete）。同样旁路副作用。 */
  function applyRemove(draft, path, opts) {
    opts = opts || {};
    if (!draft || typeof draft !== 'object') return { ok: false, reason: 'no draft' };
    if (!path) return { ok: false, reason: 'empty path' };
    if (!opts.force && isBlocked(path)) return { ok: false, reason: 'blocked path: ' + path };
    var r = _resolvePath(draft, path);
    if (!r.parent) return { ok: false, reason: 'path not found: ' + path };
    if (Array.isArray(r.parent) && typeof r.key === 'number') {
      var removed = r.parent.splice(r.key, 1);
      return { ok: true, path: path, removed: removed[0] };
    }
    var old = r.parent[r.key];
    if (old === undefined) return { ok: false, reason: 'path not found: ' + path };
    delete r.parent[r.key];
    return { ok: true, path: path, removed: old };
  }

  /** 在 draft 某数组集合里按关键词查实体（读工具·让 agent 不盲改）。 */
  function _searchEntities(draft, collection, query) {
    var arr = draft && draft[collection];
    if (!Array.isArray(arr)) return { ok: false, reason: collection + ' 不是数组或不存在' };
    var q = String(query == null ? '' : query).trim();
    var matches = [];
    arr.forEach(function(it, i) {
      if (!it || typeof it !== 'object') return;
      var hay = [it.name, it.faction, it.id, it.title, it.leader].filter(Boolean).join(' ');
      if (!q || hay.indexOf(q) >= 0) matches.push({ index: i, name: it.name, faction: it.faction, fields: Object.keys(it).slice(0, 8) });
    });
    return { ok: true, collection: collection, count: matches.length, matches: matches.slice(0, 40) };
  }

  // 方向C · 全局检索：跨所有集合关键词搜（agent 的"全仓 grep"·大剧本里也能精准定位）
  function _globalSearch(draft, query, opts) {
    opts = opts || {};
    var q = String(query == null ? '' : query).trim().toLowerCase();
    if (!q) return { ok: false, reason: '需要 query' };
    var limit = Math.min(60, Number(opts.limit) || 30);
    var labelKeys = ['name', 'id', 'title', 'leader', 'faction'];
    var hits = [], capped = false;
    var colls = Object.keys(draft || {});
    for (var ci = 0; ci < colls.length && !capped; ci++) {
      var coll = colls[ci], arr = draft[coll];
      if (!Array.isArray(arr)) continue;
      for (var i = 0; i < arr.length; i++) {
        if (hits.length >= limit) { capped = true; break; }
        var it = arr[i];
        if (!it || typeof it !== 'object') {
          if (it != null && String(it).toLowerCase().indexOf(q) >= 0) hits.push({ path: coll + '[' + i + ']', collection: coll, label: String(it).slice(0, 40) });
          continue;
        }
        var matchedField = null, snippet = '', keys = Object.keys(it);
        for (var k = 0; k < keys.length; k++) {
          var v = it[keys[k]];
          if (typeof v === 'string' && v.toLowerCase().indexOf(q) >= 0) { matchedField = keys[k]; snippet = v.slice(0, 50); break; }
        }
        if (!matchedField) { try { if (JSON.stringify(it).toLowerCase().indexOf(q) >= 0) matchedField = '(深层字段)'; } catch (e) {} }
        if (matchedField) {
          var label = '';
          for (var li = 0; li < labelKeys.length; li++) { if (it[labelKeys[li]]) { label = String(it[labelKeys[li]]); break; } }
          hits.push({ path: coll + '[' + i + ']', collection: coll, label: label || ('#' + i), field: matchedField, snippet: snippet });
        }
      }
    }
    return { ok: true, query: query, total: hits.length, hits: hits, truncated: capped };
  }

  // 方向C · 引用感知：深walk 整个剧本，找出所有引用某实体名的位置（改名/删除前查死链）
  function _findReferences(draft, name, opts) {
    opts = opts || {};
    var target = String(name == null ? '' : name).trim();
    if (!target) return { ok: false, reason: '需要 name' };
    var limit = Math.min(120, Number(opts.limit) || 60);
    var exact = [], mentions = [];
    function walk(node, path) {
      if (exact.length + mentions.length >= limit) return;
      if (node == null) return;
      if (typeof node === 'string') {
        if (node === target) exact.push(path);
        else if (node.indexOf(target) >= 0) mentions.push({ path: path, snippet: node.slice(0, 50) });
        return;
      }
      if (Array.isArray(node)) { for (var i = 0; i < node.length; i++) walk(node[i], path + '[' + i + ']'); return; }
      if (typeof node === 'object') { Object.keys(node).forEach(function(kk) { walk(node[kk], path ? path + '.' + kk : kk); }); }
    }
    walk(draft, '');
    return { ok: true, name: target, exactCount: exact.length, mentionCount: mentions.length, exact: exact.slice(0, 40), mentions: mentions.slice(0, 20), truncated: (exact.length + mentions.length) >= limit };
  }

  // 方向C · 引用感知改名：把整个剧本里所有「精确等于 oldName」的字符串值改为 newName（含实体自身的 name + 一切引用）。
  // 只动精确等值（"明"不会误伤"明朝"），安全联动。
  function _renameEntity(draft, oldName, newName) {
    var from = String(oldName == null ? '' : oldName), to = String(newName == null ? '' : newName);
    if (!from || !to) return { ok: false, reason: '需要 oldName 和 newName' };
    if (from === to) return { ok: false, reason: 'oldName 与 newName 相同' };
    var changed = 0, samplePaths = [];
    function walk(node, path) {
      if (node == null || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
          if (node[i] === from) { node[i] = to; changed++; if (samplePaths.length < 30) samplePaths.push(path + '[' + i + ']'); }
          else walk(node[i], path + '[' + i + ']');
        }
        return;
      }
      Object.keys(node).forEach(function(k) {
        var p = path ? path + '.' + k : k;
        if (node[k] === from) { node[k] = to; changed++; if (samplePaths.length < 30) samplePaths.push(p); }
        else walk(node[k], p);
      });
    }
    walk(draft, '');
    return { ok: changed > 0, oldName: from, newName: to, changed: changed, samplePaths: samplePaths, note: changed ? ('已把 ' + changed + ' 处精确等于「' + from + '」的值改为「' + to + '」（含引用联动）') : ('没找到精确等于「' + from + '」的值') };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  校验器（draft-scoped 纯函数·返回 {ok, violations, details}）
  //  约定与 tm-invariants.js 对齐，但接收 draft 参数、不读 global GM。
  // ═══════════════════════════════════════════════════════════════════

  // 区划人口读取器（字段在不同剧本可能略有出入·单点防御）
  // TODO(确认): 对真实剧本(绍宋/天启)确认末级区划是否带 population.mouths
  function _getPop(node) {
    if (!node) return null;
    var p = node.population;
    if (p && typeof p === 'object' && typeof p.mouths === 'number') return p.mouths;
    if (typeof p === 'number') return p;
    if (typeof node.mouths === 'number') return node.mouths;
    if (typeof node.pop === 'number') return node.pop;
    return null; // 未知人口·跳过比较·不误报
  }

  /** ① 行政区划：父级人口 >= 子级人口之和（adminHierarchy 树·递归 .divisions） */
  function vAdminPopulation(draft) {
    var v = [];
    var h = draft && draft.adminHierarchy;
    if (!h || typeof h !== 'object' || Array.isArray(h)) {
      return { ok: true, violations: [], details: { skipped: '无 adminHierarchy' } };
    }
    var comparisons = 0;
    Object.keys(h).forEach(function(fac) {
      var root = h[fac];
      var divs = root && root.divisions;
      if (!Array.isArray(divs)) return;
      (function walk(nodes) {
        nodes.forEach(function(n) {
          if (!n) return;
          var kids = Array.isArray(n.divisions) ? n.divisions : [];
          if (kids.length) {
            var parentPop = _getPop(n);
            var sum = 0, allKnown = true;
            kids.forEach(function(k) {
              var kp = _getPop(k);
              if (kp == null) allKnown = false; else sum += kp;
            });
            if (parentPop != null && allKnown) {
              comparisons++;
              if (parentPop < sum) {
                v.push('[' + fac + '] ' + (n.name || '?') + ' 人口 ' + parentPop + ' < 子级之和 ' + sum);
              }
            }
            walk(kids);
          }
        });
      })(divs);
    });
    return { ok: v.length === 0, violations: v, details: { comparisons: comparisons } };
  }

  /** ② 势力引用合法性：人物/军队/地点引用的势力必须在 factions 中存在 */
  function vFactionRefs(draft) {
    var v = [];
    var facs = (draft && draft.factions) || [];
    if (!Array.isArray(facs) || !facs.length) {
      return { ok: true, violations: [], details: { skipped: '无 factions' } };
    }
    var legal = {};
    facs.forEach(function(f) { if (f && f.name) legal[f.name] = true; });
    function check(ref, who) {
      if (ref == null || ref === '') return;
      if (!legal[ref]) v.push(who + ' 引用不存在的势力「' + ref + '」');
    }
    (draft.characters || []).forEach(function(c) {
      if (c) check(c.faction, '人物 ' + (c.name || '?'));
    });
    var troops = (draft.military && draft.military.initialTroops) || [];
    troops.forEach(function(t) {
      if (!t) return;
      var ref = (t.faction != null) ? t.faction : ((t.owner != null) ? t.owner : t.side);
      check(ref, '军队 ' + (t.name || '?'));
    });
    var mapItems = [];
    if (draft.map) {
      mapItems = [].concat(draft.map.city || [], draft.map.strategic || [], draft.map.geo || [], draft.map.items || []);
    }
    mapItems.forEach(function(m) {
      if (!m) return;
      check(m.owner, '地点 ' + (m.name || '?') + '(owner)');
      check(m.controller, '地点 ' + (m.name || '?') + '(controller)');
    });
    return { ok: v.length === 0, violations: v, details: { legalFactions: Object.keys(legal).length } };
  }

  /** ③ 区划↔地图覆盖：末级区划应在 mapData.regions 中有对应区域 */
  function vRegionCoverage(draft) {
    var v = [];
    var regions = draft && draft.mapData && draft.mapData.regions;
    var h = draft && draft.adminHierarchy;
    if (!Array.isArray(regions) || !regions.length) {
      return { ok: true, violations: [], details: { skipped: '无 mapData.regions' } };
    }
    if (!h || typeof h !== 'object' || Array.isArray(h)) {
      return { ok: true, violations: [], details: { skipped: '无 adminHierarchy' } };
    }
    var regionNames = {};
    regions.forEach(function(r) { if (r && r.name) regionNames[r.name] = true; });
    var orphans = [];
    Object.keys(h).forEach(function(fac) {
      var divs = h[fac] && h[fac].divisions;
      if (!Array.isArray(divs)) return;
      (function walk(nodes) {
        nodes.forEach(function(n) {
          if (!n) return;
          var kids = Array.isArray(n.divisions) ? n.divisions : [];
          if (!kids.length && n.name && !regionNames[n.name]) orphans.push(n.name);
          if (kids.length) walk(kids);
        });
      })(divs);
    });
    if (orphans.length) {
      v.push(orphans.length + ' 个末级区划在地图中无对应区域: '
        + orphans.slice(0, 8).join('、') + (orphans.length > 8 ? '…' : ''));
    }
    return { ok: v.length === 0, violations: v, details: { orphanLeaves: orphans.length } };
  }

  var _checks = {
    'admin-population': vAdminPopulation,
    'faction-refs': vFactionRefs,
    'region-coverage': vRegionCoverage
  };

  /** 聚合校验·返回 {ok, violations, results, stats}（沿用 tm-invariants 报告形状） */
  function validateDraft(draft, groupName) {
    var groups = groupName ? [groupName] : Object.keys(_checks);
    var all = [];
    var results = {};
    groups.forEach(function(g) {
      var fn = _checks[g];
      if (!fn) {
        results[g] = { ok: false, violations: ['未知 group'] };
        all.push('[' + g + '] 未知 group');
        return;
      }
      try {
        var r = fn(draft) || { ok: true, violations: [] };
        results[g] = r;
        (r.violations || []).forEach(function(m) { all.push('[' + g + '] ' + m); });
      } catch (e) {
        results[g] = { ok: false, violations: ['检查异常: ' + (e.message || e)] };
        all.push('[' + g + '] 检查异常: ' + (e.message || e));
      }
    });
    return {
      ok: all.length === 0,
      violations: all,
      results: results,
      stats: {
        checked: groups.length,
        passed: groups.filter(function(g) { return results[g] && results[g].ok; }).length,
        failed: groups.filter(function(g) { return results[g] && !results[g].ok; }).length
      }
    };
  }

  /** 注册自定义校验（供后续 slice 扩展） */
  function addCheck(name, fn) {
    if (!name || typeof fn !== 'function') return false;
    _checks[name] = fn;
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  S2 · 推理 client（自包含·读编辑器自己的 localStorage.tm_api·坑 A 消解）
  //  editor.html 不加载 tm-ai-infra.js，故不复用 callAIWithTools；
  //  这里移植其多 provider tool-calling 分支，精简为编辑器已支持的两路 + 兜底。
  // ═══════════════════════════════════════════════════════════════════

  /** 读编辑器 BYOK 配置（与 callAIEditor 同源：localStorage.tm_api）。 */
  function loadEditorApiConfig() {
    var cfg = {};
    try {
      var raw = (global.localStorage && global.localStorage.getItem('tm_api')) || '{}';
      cfg = JSON.parse(raw);
    } catch (e) { cfg = {}; }
    return {
      key: cfg.key || '',
      url: (cfg.url || '').replace(/\/+$/, ''),
      model: cfg.model || 'gpt-4o',
      temp: (cfg.temp != null) ? cfg.temp : 0.7
    };
  }

  // 方向B · 剧本记忆：持久「剧本约定」（玩家写的创作偏好·等价 CLAUDE.md），每次 run 注入提示词。
  var CONVENTIONS_KEY = 'tm_aa_conventions';
  function loadConventions() {
    try { return String((global.localStorage && global.localStorage.getItem(CONVENTIONS_KEY)) || '').slice(0, 4000); }
    catch (e) { return ''; }
  }
  function saveConventions(text) {
    try { global.localStorage && global.localStorage.setItem(CONVENTIONS_KEY, String(text == null ? '' : text).slice(0, 4000)); return true; }
    catch (e) { return false; }
  }

  function _isAnthropic(url) {
    return url.indexOf('anthropic.com') >= 0 || url.indexOf('api.anthropic') >= 0;
  }

  // OpenAI 兼容端点规整：裸域名→/v1/chat/completions·.../v1→/chat/completions·完整端点原样。
  // 让第三方中转的各种 URL 写法都能拼对（成功调用中转的常见坑）。
  function _openaiEndpoint(url) {
    if (/\/(chat\/completions|messages|responses)(\?|#|$)/.test(url)) return url;
    if (/\/v\d+(beta)?$/.test(url)) return url + '/chat/completions';
    if (/^https?:\/\/[^/]+\/?$/.test(url)) return url.replace(/\/+$/, '') + '/v1/chat/completions';
    return url + '/chat/completions';
  }

  // 把调用失败归类成可操作的中文提示（中转最常见的 CORS/网络/鉴权/路径错误）。
  function _classifyApiError(e) {
    if (!e) return '未知错误';
    if (!e.status && ((e.name === 'TypeError') || /failed to fetch|networkerror|err_|load failed/i.test(e.message || ''))) {
      return '无法连接到 API：网络不通、地址错误，或第三方中转未开启 CORS 跨域。桌面客户端内一般不受 CORS 限制；浏览器内需中转支持跨域。';
    }
    if (e.status === 401 || e.status === 403) return 'API Key 无效或无权限（HTTP ' + e.status + '）。';
    if (e.status === 404) return 'API 地址不对（HTTP 404）：检查 URL 是否缺 /v1 或 /chat/completions。';
    if (e.status === 429) return 'API 限流（HTTP 429），已自动重试仍失败，请稍后再试。';
    if (e.status >= 500) return 'API 服务端错误（HTTP ' + e.status + '）。';
    return (e.message || String(e));
  }

  // ── 抽象 conversation → provider 消息 ──
  // conversation 项：{role:'user',text} | {role:'assistant',text,toolCalls:[{id,name,input}]} | {role:'tool',toolResults:[{id,name,content}]}
  function _genId(i) { return 'call_' + Date.now().toString(36) + '_' + i; }

  function _toAnthropic(conversation, system, tools, maxTok, model) {
    var messages = conversation.map(function(turn) {
      if (turn.role === 'user') return { role: 'user', content: turn.text || '' };
      if (turn.role === 'assistant') {
        var content = [];
        if (turn.text) content.push({ type: 'text', text: turn.text });
        (turn.toolCalls || []).forEach(function(tc) { content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input || {} }); });
        return { role: 'assistant', content: content.length ? content : (turn.text || '') };
      }
      return { role: 'user', content: (turn.toolResults || []).map(function(tr) { return { type: 'tool_result', tool_use_id: tr.id, content: String(tr.content == null ? '' : tr.content) }; }) };
    });
    var body = {
      model: model, max_tokens: maxTok, messages: messages,
      tools: tools.map(function(t) { return { name: t.name, description: t.description || '', input_schema: t.parameters || { type: 'object', properties: {} } }; }),
      tool_choice: { type: 'auto' }
    };
    // prompt caching：稳定的 system（规则+schema 速查）打 cache_control
    if (system) body.system = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
    return body;
  }

  function _toOpenAI(conversation, system, tools, maxTok, model, temp) {
    var messages = [];
    if (system) messages.push({ role: 'system', content: system });
    conversation.forEach(function(turn) {
      if (turn.role === 'user') messages.push({ role: 'user', content: turn.text || '' });
      else if (turn.role === 'assistant') {
        var m = { role: 'assistant', content: turn.text || null };
        if (turn.toolCalls && turn.toolCalls.length) {
          m.tool_calls = turn.toolCalls.map(function(tc) { return { id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.input || {}) } }; });
        }
        messages.push(m);
      } else {
        (turn.toolResults || []).forEach(function(tr) { messages.push({ role: 'tool', tool_call_id: tr.id, content: String(tr.content == null ? '' : tr.content) }); });
      }
    });
    return {
      model: model, temperature: temp, max_tokens: maxTok, messages: messages,
      tools: tools.map(function(t) { return { type: 'function', function: { name: t.name, description: t.description || '', parameters: t.parameters || { type: 'object', properties: {} } } }; }),
      tool_choice: 'auto'
    };
  }

  function _parseAnthropic(data) {
    var text = '', toolCalls = [];
    if (Array.isArray(data.content)) {
      data.content.forEach(function(b, i) {
        if (b.type === 'text' && b.text) text += b.text;
        else if (b.type === 'tool_use' && b.name) toolCalls.push({ id: b.id || _genId(i), name: b.name, input: b.input || {} });
      });
    }
    return { text: text, toolCalls: toolCalls };
  }

  function _parseOpenAI(data) {
    var text = '', toolCalls = [];
    if (data.choices && data.choices[0] && data.choices[0].message) {
      var msg = data.choices[0].message;
      if (msg.content) text = msg.content;
      (msg.tool_calls || []).forEach(function(tc, i) {
        var fn = tc.function || {}, input = {};
        try { input = JSON.parse(fn.arguments || '{}'); } catch (e) {}
        if (fn.name) toolCalls.push({ id: tc.id || _genId(i), name: fn.name, input: input });
      });
    }
    if (!toolCalls.length && Array.isArray(data.content)) return _parseAnthropic(data); // 代理直吐 anthropic content[]
    return { text: text, toolCalls: toolCalls };
  }

  // ── 刀C · gemini 原生 provider（对标游戏 tm-ai-infra·第三方中转走 openai-compat 不受影响） ──
  function _isGeminiNative(url) {
    return /generativelanguage\.googleapis\.com/i.test(url) && !/\/v1beta\/openai\//i.test(url);
  }
  function _geminiEndpoint(url, model) {
    if (/:generate(Content|Message)/i.test(url)) return url;
    return url.replace(/\/+$/, '') + '/models/' + (model || 'gemini-1.5-pro') + ':generateContent';
  }
  function _toGemini(conversation, system, tools, maxTok, temp) {
    var contents = conversation.map(function(turn) {
      if (turn.role === 'user') return { role: 'user', parts: [{ text: turn.text || '' }] };
      if (turn.role === 'assistant') {
        var parts = [];
        if (turn.text) parts.push({ text: turn.text });
        (turn.toolCalls || []).forEach(function(tc) { parts.push({ functionCall: { name: tc.name, args: tc.input || {} } }); });
        return { role: 'model', parts: parts.length ? parts : [{ text: turn.text || '' }] };
      }
      return { role: 'user', parts: (turn.toolResults || []).map(function(tr) { return { functionResponse: { name: tr.name, response: { result: String(tr.content == null ? '' : tr.content) } } }; }) };
    });
    var body = {
      contents: contents,
      tools: [{ functionDeclarations: tools.map(function(t) { return { name: t.name, description: t.description || '', parameters: t.parameters || { type: 'object', properties: {} } }; }) }],
      toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
      generationConfig: { temperature: temp, maxOutputTokens: maxTok }
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    return body;
  }
  function _parseGemini(data) {
    var text = '', toolCalls = [];
    var cand = data && data.candidates && data.candidates[0];
    var parts = cand && cand.content && cand.content.parts;
    if (Array.isArray(parts)) {
      parts.forEach(function(p, i) {
        if (p.text) text += p.text;
        if (p.functionCall && p.functionCall.name) toolCalls.push({ id: _genId(i), name: p.functionCall.name, input: p.functionCall.args || {} });
      });
    }
    return { text: text, toolCalls: toolCalls };
  }

  // 抠掉 ```json``` 围栏 / <json> 标签，便于从被包裹文本里解析工具调用（中转/模型常这么吐）。
  function _stripJsonWrappers(text) {
    var s = String(text || '');
    var fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1];
    var tag = s.match(/<json>\s*([\s\S]*?)<\/json>/i);
    if (tag) s = tag[1];
    return s;
  }

  // 从纯文本抠 {tool_calls:[{name,input}]}（端点忽略 tools 直接吐 JSON 时兜底）
  function _parseJsonToolCalls(text) {
    if (!text) return [];
    var parsed = null;
    try { var m = _stripJsonWrappers(text).match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch (e) { return []; }
    var calls = [];
    if (parsed && Array.isArray(parsed.tool_calls)) {
      parsed.tool_calls.forEach(function(c, i) { if (c && c.name) calls.push({ id: _genId(i), name: c.name, input: c.input || c.arguments || {} }); });
    } else if (parsed && parsed.name) {
      calls.push({ id: _genId(0), name: parsed.name, input: parsed.input || {} });
    }
    return calls;
  }

  function _flattenConversation(system, conversation, tools) {
    var lines = [];
    if (system) lines.push(system);
    conversation.forEach(function(turn) {
      if (turn.role === 'user') lines.push('【用户】' + (turn.text || ''));
      else if (turn.role === 'assistant') {
        if (turn.text) lines.push('【助手】' + turn.text);
        (turn.toolCalls || []).forEach(function(tc) { lines.push('【助手调用】' + tc.name + ' ' + JSON.stringify(tc.input || {})); });
      } else {
        (turn.toolResults || []).forEach(function(tr) { lines.push('【结果】' + tr.name + ': ' + tr.content); });
      }
    });
    lines.push('\n可用工具: ' + tools.map(function(t) { return t.name + '(' + Object.keys((t.parameters && t.parameters.properties) || {}).join(',') + ')'; }).join(' / '));
    lines.push('只返回纯 JSON（不要 markdown）：{"tool_calls":[{"name":"<工具>","input":{...}}]}');
    return lines.join('\n');
  }

  function _delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  // 带重试/超时的 fetch（429 Retry-After·5xx/网络错误指数退避·AbortController 超时）
  function _fetchJSON(url, options, opts) {
    opts = opts || {};
    var maxRetries = opts.maxRetries != null ? opts.maxRetries : 3;
    var timeoutMs = opts.timeoutMs || 180000;
    var base = opts.retryBaseMs || 1000;
    function attempt(n) {
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function() { ctrl.abort(); }, timeoutMs) : null;
      var fopt = Object.assign({}, options);
      if (ctrl) fopt.signal = ctrl.signal;
      return global.fetch(url, fopt).then(function(r) {
        if (timer) clearTimeout(timer);
        if (r.status === 429 && n < maxRetries) {
          var ra = parseInt((r.headers && r.headers.get && r.headers.get('Retry-After')) || '0', 10);
          return _delay(ra > 0 ? ra * 1000 : Math.min(30000, base * Math.pow(2, n))).then(function() { return attempt(n + 1); });
        }
        if (!r.ok) {
          return r.text().then(function(t) {
            var err = new Error('HTTP ' + r.status + ': ' + String(t).slice(0, 200));
            err.status = r.status;
            if (r.status >= 500 && n < maxRetries) return _delay(base * Math.pow(2, n)).then(function() { return attempt(n + 1); });
            throw err;
          });
        }
        return r.json();
      }).catch(function(e) {
        if (timer) clearTimeout(timer);
        if (e && e.status) throw e;               // 已分类的 HTTP 错误
        if (n < maxRetries) return _delay(base * Math.pow(2, n)).then(function() { return attempt(n + 1); }); // 网络/超时
        throw e;
      });
    }
    return attempt(0);
  }

  /**
   * 自包含 tool-calling 调用（多轮 conversation·retry·无-tool 端点 JSON 兜底·system 缓存）。
   * @param {string|Array} conversation - 字符串(单轮)或抽象消息数组
   * @param {Array} tools
   * @param {{cfg?,maxTok?,system?,maxRetries?,timeoutMs?}} [opts]
   * @returns {Promise<{text, toolCalls:Array<{id,name,input}>, fallback?:boolean}>}
   */
  function callWithTools(conversation, tools, opts) {
    opts = opts || {};
    if (typeof conversation === 'string') conversation = [{ role: 'user', text: conversation }];
    var cfg = opts.cfg || loadEditorApiConfig();
    var maxTok = opts.maxTok || 3000;
    var system = opts.system || '';
    if (!cfg.key) return Promise.reject(new Error('API Key 未配置（请先在设置面板配置 API）'));
    if (!cfg.url) return Promise.reject(new Error('API 地址未配置'));
    if (!Array.isArray(tools) || !tools.length) return Promise.reject(new Error('callWithTools 需要 tools'));

    // 三路 provider：gemini 原生 / anthropic 原生(api.anthropic.com) / openai-compat（含一切第三方中转）
    var gemini = _isGeminiNative(cfg.url);
    var anthropic = !gemini && _isAnthropic(cfg.url);
    var endpoint, headers, body;
    if (gemini) {
      endpoint = _geminiEndpoint(cfg.url, cfg.model);
      headers = { 'Content-Type': 'application/json' };
      if (!/[?&]key=/i.test(endpoint)) headers['x-goog-api-key'] = cfg.key;
      body = _toGemini(conversation, system, tools, maxTok, cfg.temp);
    } else if (anthropic) {
      endpoint = cfg.url.indexOf('/messages') < 0 ? cfg.url + '/v1/messages' : cfg.url;
      headers = { 'Content-Type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' };
      body = _toAnthropic(conversation, system, tools, maxTok, cfg.model);
    } else {
      endpoint = _openaiEndpoint(cfg.url);
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key };
      body = _toOpenAI(conversation, system, tools, maxTok, cfg.model, cfg.temp);
    }
    function _parseResp(data) { return gemini ? _parseGemini(data) : (anthropic ? _parseAnthropic(data) : _parseOpenAI(data)); }

    function fallbackTextCall() {
      var prompt = _flattenConversation(system, conversation, tools);
      var fbBody = gemini
        ? { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: cfg.temp, maxOutputTokens: maxTok } }
        : anthropic
          ? { model: cfg.model, max_tokens: maxTok, messages: [{ role: 'user', content: prompt }] }
          : { model: cfg.model, temperature: cfg.temp, max_tokens: maxTok, messages: [{ role: 'user', content: prompt }] };
      return _fetchJSON(endpoint, { method: 'POST', headers: headers, body: JSON.stringify(fbBody) }, opts).then(function(data) {
        var parsed = _parseResp(data);
        var calls = parsed.toolCalls.length ? parsed.toolCalls : _parseJsonToolCalls(parsed.text);
        return { text: parsed.text, toolCalls: calls, fallback: true };
      });
    }

    return _fetchJSON(endpoint, { method: 'POST', headers: headers, body: JSON.stringify(body) }, opts).then(function(data) {
      var parsed = _parseResp(data);
      if (parsed.toolCalls.length) return parsed;
      var fromText = _parseJsonToolCalls(parsed.text); // 端点忽略 tools 但吐了 JSON
      if (fromText.length) return { text: parsed.text, toolCalls: fromText, fallback: true };
      return parsed; // 纯文本无工具 → 交给 loop 判 noToolCalls
    }).catch(function(e) {
      if (e && e.status === 400) return fallbackTextCall(); // 端点多半拒绝 tools 参数 → 文本兜底
      var err = new Error(_classifyApiError(e));            // 网络/CORS/鉴权/路径 → 可操作中文提示
      err.status = e && e.status; err.cause = e;
      // 韧性：标记可重试的瞬态错误（429/5xx/网络/超时）；鉴权(401/403)/路径(404)等非瞬态不重试
      var s = err.status;
      var networkish = !s && e && (e.name === 'TypeError' || /failed to fetch|networkerror|err_|load failed|aborted|timeout/i.test(String(e.message || '')));
      err.transient = (s === 429) || (s >= 500) || !!networkish;
      throw err;
    });
  }

  /**
   * 中转连通性自检：用最小 ping 工具做一次真实调用，返回 {ok, detail}。
   * 给"成功调用中转第三方 api"一个可点验证入口（区分 CORS/鉴权/路径错误）。
   * @returns {Promise<{ok:boolean, detail:string, provider?:string, model?:string, status?:number}>}
   */
  function testConnection(opts) {
    opts = opts || {};
    var cfg = opts.cfg || loadEditorApiConfig();
    if (!cfg.key) return Promise.resolve({ ok: false, detail: '未配置 API Key（请先在设置面板填写）' });
    if (!cfg.url) return Promise.resolve({ ok: false, detail: '未配置 API 地址' });
    var ping = [{ name: 'ping', description: '连通性测试·回声', parameters: { type: 'object', properties: { ok: { type: 'boolean', description: '固定填 true' } }, required: ['ok'] } }];
    return callWithTools('调用 ping 工具，参数 ok=true，确认连通。', ping, { cfg: cfg, maxTok: 64, maxRetries: 1, timeoutMs: 30000 })
      .then(function(r) {
        return {
          ok: true,
          provider: _isAnthropic(cfg.url) ? 'anthropic' : 'openai-compat',
          model: cfg.model,
          detail: '连通成功 · ' + (r.fallback ? '端点不支持原生 tools，已用文本兜底（仍可用）' : '原生 tool-calling 可用')
        };
      })
      .catch(function(e) {
        return { ok: false, status: e && e.status, detail: (e && e.message) || String(e) };
      });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  S2 · agent 工具定义 + 派发 + loop
  // ═══════════════════════════════════════════════════════════════════

  var AGENT_TOOLS = [
    {
      name: 'applyEdit',
      description: '在剧本草稿上按 path 设值。path 形如 "name" / "factions.明.leader" / "playerInfo.factionName"。',
      parameters: { type: 'object', properties: {
        path: { type: 'string', description: '字段路径' },
        value: { type: ['string', 'number', 'boolean', 'object', 'array', 'null'], description: '要设置的值' },
        reason: { type: 'string', description: '简短理由（可选）' }
      }, required: ['path', 'value'] }
    },
    {
      name: 'applyPush',
      description: '向草稿里的数组追加一个元素，如 path="characters" value={name:"张三",...}。',
      parameters: { type: 'object', properties: {
        path: { type: 'string' },
        value: { type: 'object' }
      }, required: ['path', 'value'] }
    },
    {
      name: 'getField',
      description: '读取草稿某路径的当前值（改前先查看，避免盲改）。path 如 "factions" / "characters.张三" / "playerInfo"。',
      parameters: { type: 'object', properties: { path: { type: 'string', description: '字段路径' } }, required: ['path'] }
    },
    {
      name: 'searchEntities',
      description: '在某集合按关键词查实体。collection 如 characters/factions/parties；query 匹配 name/faction/id/title 包含（留空=全部）。',
      parameters: { type: 'object', properties: {
        collection: { type: 'string' }, query: { type: 'string' }
      }, required: ['collection'] }
    },
    {
      name: 'globalSearch',
      description: '跨【所有集合】按关键词全局检索（不知道东西在哪个集合时用这个，相当于全剧本 grep）。返回命中位置 path + 集合 + 标签 + 命中字段。大剧本里先 globalSearch 定位再动手。',
      parameters: { type: 'object', properties: {
        query: { type: 'string', description: '关键词' }, limit: { type: 'number', description: '最多返回多少条（默认 30）' }
      }, required: ['query'] }
    },
    {
      name: 'findReferences',
      description: '查整个剧本里有哪些地方引用了某实体名（势力/人物/物品名等）。改名或删除前必查，避免留下死链。返回 exact（精确等于该名的位置）与 mentions（文本里提到的位置）。',
      parameters: { type: 'object', properties: {
        name: { type: 'string', description: '实体名（精确）' }, limit: { type: 'number' }
      }, required: ['name'] }
    },
    {
      name: 'renameEntity',
      description: '引用感知改名：把整个剧本里所有【精确等于 oldName】的值改成 newName（含该实体自身的 name 字段 + 一切引用它的地方），一步联动不留死链。只动精确等值（不会误伤子串）。改名优先用它而非逐处 applyEdit。',
      parameters: { type: 'object', properties: {
        oldName: { type: 'string' }, newName: { type: 'string' }
      }, required: ['oldName', 'newName'] }
    },
    {
      name: 'removeEntity',
      description: '删除草稿某路径的元素（数组按名/索引，对象按键）。path 如 "characters.张三" / "factions.明"。',
      parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
    },
    {
      name: 'validateDraft',
      description: '校验当前草稿（父>=子人口/势力引用/区划覆盖），返回违规列表。每改完一批应调用以自查。',
      parameters: { type: 'object', properties: {
        group: { type: 'string', description: '可选：只跑某组 admin-population/faction-refs/region-coverage' }
      } }
    },
    {
      name: 'listGaps',
      description: '列出"游戏运行时必需但剧本里缺失"的字段（规格缺口）。改之前先 listGaps 看缺什么，与用户需求相关的缺口顺手补齐，让剧本完整可玩。',
      parameters: { type: 'object', properties: {
        includeOptional: { type: 'boolean', description: '是否一并列出可选缺口（默认只列必需缺口）' }
      } }
    },
    {
      name: 'listCollection',
      description: '总览某集合（紧凑列出名字+关键字段，不返回完整对象避免刷屏）。collection 如 characters/factions/parties；adminHierarchy 等对象映射返回键列表。',
      parameters: { type: 'object', properties: {
        collection: { type: 'string' }, limit: { type: 'number', description: '最多列几条（默认 40）' }
      }, required: ['collection'] }
    },
    {
      name: 'describeSchema',
      description: '查某类实体的完整字段形状（不填 kind 则列出所有可用类型）。kind 如 character/faction/troop/division/event/variable。',
      parameters: { type: 'object', properties: { kind: { type: 'string' } } }
    },
    {
      name: 'bulkAdd',
      description: '一次向集合批量追加多个实体（省往返，适合"生成 30 名人物"这类）。collection + items[]。',
      parameters: { type: 'object', properties: {
        collection: { type: 'string' }, items: { type: 'array', items: { type: 'object' } }
      }, required: ['collection', 'items'] }
    },
    {
      name: 'multiEdit',
      description: '一次施加多处改动（省往返）。edits[]，每项 {path, value, reason?}。',
      parameters: { type: 'object', properties: {
        edits: { type: 'array', items: { type: 'object' } }
      }, required: ['edits'] }
    },
    {
      name: 'note',
      description: '记录一条计划/进度备注（不改剧本，只写进过程记录，便于多步任务自我规划、也让用户看到思路）。',
      parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
    },
    {
      name: 'recordConvention',
      description: '当你发现这个玩家/剧本有一条值得长期沿用的约定（命名规律、文风、设定惯例等）时记一条，供以后所有编辑参考。仅在确有发现时调用，别凑数。',
      parameters: { type: 'object', properties: { convention: { type: 'string', description: '一句话约定，如"人名统一用明代官话""势力名带地名后缀"' } }, required: ['convention'] }
    },
    {
      name: 'finish',
      description: '剧本已按要求改好且校验通过时调用，结束本次编辑。',
      parameters: { type: 'object', properties: {
        summary: { type: 'string', description: '向玩家说清「改了什么、为什么这么改」：点出关键实体/字段，2-4 句中文，别只写"完成"' }
      } }
    }
  ];

  // ═══════════════════════════════════════════════════════════════════
  //  S5 · prompt 资产：实体骨架 + schema 速查（让 agent 用对字段名、守约束）
  // ═══════════════════════════════════════════════════════════════════

  var ENTITY_TEMPLATES = {
    character: { name: '', faction: '', officialTitle: '', loyalty: 80, ambition: 50, intelligence: 70, administration: 60, military: 50, age: 40, gender: '男', personality: '', bio: '' },
    faction: { name: '', leader: '', territory: '', strength: '', culture: '', goal: '', desc: '' },
    party: { name: '', leader: '', members: '', desc: '' },
    class: { name: '', desc: '' },
    troop: { name: '', commander: '', faction: '', location: '', soldiers: 10000, type: '' },
    division: { name: '', level: '', governor: '', population: { mouths: 0, households: 0 }, divisions: [] },
    event: { name: '', type: 'historical', trigger: '', desc: '' },
    variable: { name: '', defaultValue: 0, min: 0, max: 100, description: '' }
  };

  /** 剧本结构速查（注入 loop prompt·让模型用对字段名与形状、守硬约束）。 */
  function buildSchemaGuide() {
    var T = ENTITY_TEMPLATES;
    return [
      '【剧本结构速查】（applyEdit/applyPush 时遵循这些字段名与形状）',
      '- 顶层：name(剧本名) dynasty(朝代) emperor(帝王) overview(概述) startYear playerInfo gameSettings',
      '- factions[]（势力）: ' + JSON.stringify(T.faction),
      '- characters[]（人物）: ' + JSON.stringify(T.character) + '  ← faction 必须等于某个 factions[].name',
      '- parties[]（党派）: ' + JSON.stringify(T.party) + ' / classes[]（阶层）: ' + JSON.stringify(T['class']),
      '- military.initialTroops[]（开局部队）: ' + JSON.stringify(T.troop) + '  ← commander=人物名, faction=势力名',
      '- adminHierarchy{ "势力名":{ divisions:[ 区划 ] } }，区划递归含 .divisions；区划形如 ' + JSON.stringify(T.division),
      '- mapData.regions[]（地图区域，每个有 .name）；末级区划的 name 应能对上某个 region.name',
      '- variables.base[]（变量）: ' + JSON.stringify(T.variable),
      '- events.historical[]/random[]（事件）: ' + JSON.stringify(T.event),
      '【硬约束】① 中文显示名（人物/势力/地名）保持中文，禁止英译。',
      '② 人物/军队/地点引用的势力名必须在 factions 中存在。',
      '③ 行政区划父级 population.mouths 必须 >= 各子级 population.mouths 之和。'
    ].join('\n');
  }

  // ── 刀A · 懂规格·知缺口 ──
  // 读"游戏运行时要什么"的规格：新编辑器 RUNTIME_FIELD_SURFACES（{field,moduleId,required,title}）。
  // 优先 opts.fieldSurfaces；否则读运行时全局；都没有则空（旧编辑器 / node 下优雅降级）。
  function _getFieldSurfaces(opts) {
    if (opts && Array.isArray(opts.fieldSurfaces)) return opts.fieldSurfaces;
    try {
      var app = global.TM_SCENARIO_EDITOR_RESET_APP;
      if (app && Array.isArray(app.runtimeFieldSurfaces)) return app.runtimeFieldSurfaces;
    } catch (e) {}
    return [];
  }

  // 算规格缺口：规格里标 required/optional 的顶层字段，在草稿里缺失的。
  function _computeGaps(draft, surfaces) {
    draft = draft || {};
    var reqMiss = [], optMiss = [];
    (surfaces || []).forEach(function(s) {
      if (!s || !s.field || (s.field in draft)) return;
      var label = s.title ? (s.field + '(' + s.title + ')') : s.field;
      if (s.required) reqMiss.push(label); else optMiss.push(label);
    });
    return { requiredMissing: reqMiss, optionalMissing: optMiss };
  }

  /** 派发单个工具调用到 S1 工具，返回喂回模型的结果对象。 */
  function dispatchTool(draft, name, input, surfaces) {
    input = input || {};
    switch (name) {
      case 'applyEdit': return applyEdit(draft, input.path, input.value, { reason: input.reason });
      case 'applyPush': return applyPush(draft, input.path, input.value);
      case 'removeEntity': return applyRemove(draft, input.path);
      case 'getField': {
        var rr = _resolvePath(draft, input.path);
        if (!rr.parent) return { ok: false, reason: 'path not found: ' + input.path };
        return { ok: true, path: input.path, value: rr.value };
      }
      case 'searchEntities': return _searchEntities(draft, input.collection, input.query);
      case 'globalSearch': return _globalSearch(draft, input.query, { limit: input.limit });
      case 'findReferences': return _findReferences(draft, input.name, { limit: input.limit });
      case 'renameEntity': return _renameEntity(draft, input.oldName, input.newName);
      case 'validateDraft': return validateDraft(draft, input.group);
      case 'listGaps': {
        var gaps = _computeGaps(draft, surfaces || _getFieldSurfaces());
        if (!gaps.requiredMissing.length && !gaps.optionalMissing.length) {
          return { ok: true, requiredMissing: [], note: '无可用规格或无缺口（剧本必需字段已齐）' };
        }
        var out = { ok: true, requiredMissing: gaps.requiredMissing };
        if (input.includeOptional) out.optionalMissing = gaps.optionalMissing;
        return out;
      }
      case 'listCollection': {
        var rrc = _resolvePath(draft, input.collection);
        var arr = rrc && rrc.value;
        if (Array.isArray(arr)) {
          var lim = Math.min(80, Number(input.limit) || 40);
          var rows = arr.slice(0, lim).map(function(it, i) {
            if (it && typeof it === 'object') {
              var label = it.name || it.id || it.title || ('#' + i);
              var extra = [];
              ['faction', 'leader', 'role', 'officialTitle', 'type', 'level'].forEach(function(k) { if (it[k] != null && it[k] !== '') extra.push(k + '=' + it[k]); });
              return label + (extra.length ? ' (' + extra.slice(0, 3).join(', ') + ')' : '');
            }
            return String(it);
          });
          return { ok: true, collection: input.collection, count: arr.length, shown: rows.length, items: rows };
        }
        if (arr && typeof arr === 'object') return { ok: true, collection: input.collection, count: Object.keys(arr).length, keys: Object.keys(arr).slice(0, 80) };
        return { ok: false, reason: '不是集合（数组/对象映射）: ' + input.collection };
      }
      case 'describeSchema': {
        if (!input.kind) return { ok: true, availableKinds: Object.keys(ENTITY_TEMPLATES) };
        var tmpl = ENTITY_TEMPLATES[input.kind];
        if (!tmpl) return { ok: false, reason: '未知实体类型: ' + input.kind + '（可选: ' + Object.keys(ENTITY_TEMPLATES).join('/') + '）' };
        return { ok: true, kind: input.kind, template: tmpl, fields: Object.keys(tmpl) };
      }
      case 'bulkAdd': {
        var items = Array.isArray(input.items) ? input.items : [];
        if (!input.collection || !items.length) return { ok: false, reason: '需要 collection 和非空 items[]' };
        var added = 0, addErrs = [];
        items.forEach(function(it, i) {
          var r = applyPush(draft, input.collection, it);
          if (r && r.ok !== false) added++; else addErrs.push('#' + i + ': ' + ((r && r.reason) || 'fail'));
        });
        return { ok: addErrs.length === 0, collection: input.collection, added: added, errors: addErrs.slice(0, 5) };
      }
      case 'multiEdit': {
        var edits = Array.isArray(input.edits) ? input.edits : [];
        if (!edits.length) return { ok: false, reason: '需要非空 edits[]（每项 {path,value}）' };
        var done = 0, fails = [];
        edits.forEach(function(e, i) {
          if (!e || !e.path) { fails.push('#' + i + ': 缺 path'); return; }
          var r = applyEdit(draft, e.path, e.value, { reason: e.reason });
          if (r && r.ok !== false) done++; else fails.push('#' + i + '(' + e.path + '): ' + ((r && r.reason) || 'fail'));
        });
        return { ok: fails.length === 0, applied: done, failures: fails.slice(0, 5) };
      }
      case 'note': return { ok: true, note: String(input.text || '').slice(0, 500) };
      case 'recordConvention': return { ok: true, recorded: String(input.convention || '').slice(0, 200) };
      case 'proposePlan': return { ok: true, plan: true, steps: Array.isArray(input.steps) ? input.steps : [], summary: input.summary || '' };
      case 'submitReview': return { ok: true, review: true, findings: Array.isArray(input.findings) ? input.findings : [], summary: input.summary || '' };
      case 'finish': return { ok: true, finish: true, summary: input.summary || '' };
      default: return { ok: false, reason: '未知工具: ' + name };
    }
  }

  /** 草稿顶层摘要（给模型看当前状态·避免塞整个对象） */
  function _draftSummary(draft) {
    var keys = Object.keys(draft || {});
    var counts = [];
    ['characters', 'factions', 'parties', 'classes', 'items'].forEach(function(k) {
      if (Array.isArray(draft[k])) counts.push(k + ':' + draft[k].length);
    });
    return '顶层字段: ' + keys.join(', ') + (counts.length ? '\n数组规模: ' + counts.join(' / ') : '');
  }

  /** tool_result 内容文本（喂回模型）。带违规时明列，让 agent 知道修什么。 */
  function _resultToText(result) {
    if (!result) return '';
    if (result.violations && result.violations.length) return 'ok:false 违规: ' + result.violations.slice(0, 8).join('; ');
    if (result.ok === false) return 'ok:false ' + (result.reason || '');
    return JSON.stringify(result).slice(0, 1200);
  }

  /** 稳定 system（规则 + schema 速查）——多轮间字节稳定，供 prompt caching。 */
  // 维度 · 计划模式：只读工具 + proposePlan（产出编号计划，不动手）
  var PROPOSE_PLAN_TOOL = {
    name: 'proposePlan',
    description: '提出改动计划：给出编号步骤（每步一句话，具体到字段/实体），结束计划阶段交玩家批准。计划模式下不要调用任何修改工具。',
    parameters: { type: 'object', properties: {
      summary: { type: 'string', description: '一句话总述' },
      steps: { type: 'array', items: { type: 'string' }, description: '编号步骤（字符串数组）' }
    }, required: ['steps'] }
  };
  function _planTools() {
    var readNames = { getField: 1, searchEntities: 1, globalSearch: 1, findReferences: 1, listGaps: 1, listCollection: 1, describeSchema: 1 };
    return AGENT_TOOLS.filter(function(t) { return readNames[t.name]; }).concat([PROPOSE_PLAN_TOOL]);
  }
  // 方向D · 审阅模式：只读工具 + submitReview（产出结构化体检报告，不动剧本）
  var SUBMIT_REVIEW_TOOL = {
    name: 'submitReview',
    description: '提交剧本审阅报告：给出总评 + 逐条问题（维度/严重度/定位/问题/建议），结束审阅。审阅模式下绝不调用任何修改工具。',
    parameters: { type: 'object', properties: {
      summary: { type: 'string', description: '一句话总评（整体成色 + 最该先修的点）' },
      findings: { type: 'array', description: '问题清单', items: { type: 'object', properties: {
        dimension: { type: 'string', description: '维度：平衡性/史实合理性/可玩性/死局风险/内容缺口/叙事 之一' },
        severity: { type: 'string', description: '严重度：高/中/低' },
        location: { type: 'string', description: '定位：涉及的实体/字段，如"势力·东林党"或"characters[3].aiPersona"' },
        issue: { type: 'string', description: '问题是什么' },
        suggestion: { type: 'string', description: '怎么改的建议' }
      } } }
    }, required: ['findings'] }
  };
  function _reviewTools() {
    var readNames = { getField: 1, searchEntities: 1, globalSearch: 1, findReferences: 1, listGaps: 1, listCollection: 1, describeSchema: 1, validateDraft: 1 };
    return AGENT_TOOLS.filter(function(t) { return readNames[t.name]; }).concat([SUBMIT_REVIEW_TOOL]);
  }
  // 方向B · 把玩家的「剧本约定」拼成系统提示词里的一段（空则不注入）
  function _conventionsBlock(conventions) {
    var c = String(conventions || '').trim();
    if (!c) return '';
    return '\n【玩家的剧本创作约定·务必遵守】\n' + c.slice(0, 4000) + '\n（以上是该玩家一贯的创作偏好/规范，本次编辑须始终遵循；与具体需求冲突时以本次需求为准。）';
  }

  function _buildPlanSystemPrompt(conventions) {
    return [
      '你是历史策略游戏「天命」的剧本编辑助手，现在处于【计划模式】：只规划、不动手。',
      '步骤：① 用 getField/searchEntities/listGaps/listCollection/describeSchema 了解现状与规格缺口；',
      '② 然后调用 proposePlan，列出你打算怎么改的编号步骤（每步一句话、具体到字段/实体）；',
      '③ 这一步绝不调用任何修改工具、绝不直接改剧本——只产出计划，交玩家批准。',
      _conventionsBlock(conventions),
      '',
      buildSchemaGuide()
    ].join('\n');
  }

  function _buildReviewSystemPrompt(conventions) {
    return [
      '你是历史策略游戏「天命」的剧本审阅官，现在处于【审阅模式】：把剧本当作品做体检，只诊断、不修改。',
      '用 getField/searchEntities/listGaps/listCollection/describeSchema/validateDraft 充分了解剧本后，从这些维度找问题：',
      '· 平衡性：势力强弱/资源/兵力是否失衡，是否某方碾压或开局即崩；',
      '· 史实合理性：人物/势力/时间/官职/地理是否与设定时代相符，有无硬伤；',
      '· 可玩性：玩家开局目标是否清晰、是否有可操作的抓手、节奏是否合理；',
      '· 死局风险：是否存在玩家无论如何都赢不了/活不过的结构性死局；',
      '· 内容缺口：运行时必需但缺失的字段（listGaps）、缺关键人物/事件/关系；',
      '· 叙事：动机是否成立、忠奸是否脸谱化、开场是否抓人。',
      '逐条要可定位（指出具体实体/字段）、给可执行建议、按严重度（高/中/低）标注。充分查证后调用 submitReview 提交报告；绝不调用任何修改工具、绝不改剧本。',
      _conventionsBlock(conventions),
      '',
      buildSchemaGuide()
    ].join('\n');
  }

  function _buildSystemPrompt(conventions) {
    return [
      '你是历史策略游戏「天命」的剧本编辑助手。通过调用工具编辑剧本草稿，满足用户需求。',
      '⓪ 多步/复杂任务先用 note 记一句计划（1. 2. 3.）再动手；用 listCollection/describeSchema 看清现状与字段、bulkAdd/multiEdit 一次多改提效。',
      '规则：① 只用工具修改/查询，不要直接输出 JSON 剧本正文。② 中文显示名（人物/势力/地名）保持中文，禁止英译。',
      '③ 先用 getField/searchEntities/listGaps 查看现状与规格缺口再改；不确定东西在哪个集合时用 globalSearch 全局检索定位。与用户需求相关的必需缺口顺手补齐，让剧本完整可玩。④ 每改完一批用 validateDraft 自查，有违规继续修。⑤ 改好且校验通过后调用 finish——summary 要向玩家说清「改了什么、为什么这么改」（具体到关键实体/字段，2-4 句中文），不要只写"完成"。',
      '⑥ 若发现该玩家/剧本有值得长期沿用的约定（命名规律、文风、设定惯例），可调 recordConvention 记一条（仅在确有发现时，别凑数）。⑦ 改名优先用 renameEntity（联动所有引用、不留死链）；删除实体前先 findReferences 查谁引用了它。',
      _conventionsBlock(conventions),
      '',
      buildSchemaGuide()
    ].join('\n');
  }

  function _buildInitialUser(draft, userRequest, surfaces, editorContext) {
    var lines = [
      '【用户需求】\n' + (userRequest || '')
    ];
    if (editorContext) {   // 上下文感知：玩家在编辑器里正看着什么，指代优先指它
      lines.push('\n【当前编辑上下文】\n玩家正在编辑器中查看：' + editorContext
        + '\n（若需求中有"他/她/它/这个/当前/这名/此"等指代而未点名，优先理解为上述当前选中项。）');
    }
    lines.push('\n【草稿现状】\n' + _draftSummary(draft));
    var gaps = _computeGaps(draft, surfaces || []);
    if (gaps.requiredMissing.length) {
      lines.push('\n【规格缺口·游戏运行时必需但当前缺失】(' + gaps.requiredMissing.length + ' 项)\n'
        + gaps.requiredMissing.slice(0, 30).join('、')
        + '\n→ 与用户需求相关的缺口请顺手补齐；listGaps 可随时复查。');
    }
    lines.push('\n开始：先按需 getField/searchEntities/listGaps 查看，再用 applyEdit/applyPush/removeEntity 修改，validateDraft 自查，最后 finish。');
    return lines.join('\n');
  }

  // 方向D · 审阅模式的初始 user：把审阅重点（或玩家指定的关注点）+ 草稿现状 + 缺口喂给审阅官
  function _buildReviewUser(draft, userRequest, surfaces, editorContext) {
    var focus = String(userRequest || '').trim();
    var lines = [focus ? ('【本次审阅重点】\n' + focus + '\n（在全面体检基础上，重点关注以上方面。）') : '【任务】对整个剧本做一次全面体检。'];
    if (editorContext) lines.push('\n【当前编辑上下文】玩家正在查看：' + editorContext + '（如有相关问题可优先点到）。');
    lines.push('\n【草稿现状】\n' + _draftSummary(draft));
    var gaps = _computeGaps(draft, surfaces || []);
    if (gaps.requiredMissing.length) {
      lines.push('\n【已知规格缺口·运行时必需但缺失】(' + gaps.requiredMissing.length + ' 项)\n' + gaps.requiredMissing.slice(0, 30).join('、'));
    }
    lines.push('\n开始：先用读工具充分查证，再调用 submitReview 提交结构化报告。不要修改剧本。');
    return lines.join('\n');
  }

  // 维度1 · 对话式追问：在已改草稿基础上继续（agent 已有上文，提示从简）。
  function _buildFollowUpUser(draft, userRequest, surfaces, editorContext) {
    var lines = ['【追加需求】\n' + (userRequest || '') + '\n（在上面已改的草稿基础上继续；需要时可 listGaps/validateDraft 复查，改好后调用 finish。）'];
    if (editorContext) lines.push('（当前编辑上下文：' + editorContext + '；指代未点名时优先指它。）');
    var gaps = _computeGaps(draft, surfaces || []);
    if (gaps.requiredMissing.length) {
      lines.push('（提示：仍有必需缺口 ' + gaps.requiredMissing.length + ' 项，如与本次需求相关可一并补。）');
    }
    return lines.join('\n');
  }

  // 简易 token 估算（CJK≈1.3/字·其余≈0.25/字符·与 tm-ai-infra estimateTokens 同启发式）
  function _estimateTokens(text) {
    if (!text) return 0;
    var s = String(text), cjk = 0, other = 0;
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3040 && code <= 0x30FF)) cjk++;
      else other++;
    }
    return Math.ceil(cjk * 1.3 + other * 0.25);
  }

  // 跑前估算：按和 runAuthoringLoop 完全相同的构建路径，算「首发请求」与「整轮范围」的 token 粗估。
  // 仅供玩家心里有数（像 Claude code 跑前看上下文体量）；实际取决于改动复杂度与轮数，标注为估算。
  function estimateRun(draft, userRequest, opts) {
    opts = opts || {};
    var planOnly = !!opts.planOnly;
    var tools = planOnly ? _planTools() : (opts.tools || AGENT_TOOLS);
    var conventions = (opts.conventions != null ? opts.conventions : loadConventions()) || '';   // 方向B · 剧本约定
    var system = planOnly ? _buildPlanSystemPrompt(conventions) : _buildSystemPrompt(conventions);
    var surfaces = _getFieldSurfaces(opts);
    var continuing = !!(Array.isArray(opts.priorConversation) && opts.priorConversation.length);
    var editorContext = opts.editorContext || '';
    var userText = continuing ? _buildFollowUpUser(draft, userRequest, surfaces, editorContext) : _buildInitialUser(draft, userRequest, surfaces, editorContext);
    var priorTokens = 0;
    if (continuing) { try { priorTokens = _estimateTokens(JSON.stringify(opts.priorConversation)); } catch (e) {} }
    var toolsTokens = 0; try { toolsTokens = _estimateTokens(JSON.stringify(tools)); } catch (e) {}   // tools schema 每轮都发
    var perCallInput = _estimateTokens(system) + toolsTokens + priorTokens + _estimateTokens(userText);
    var maxTokens = opts.maxTokens || 120000;
    // 多轮会重发增长中的对话：按典型轮数 × 增长因子粗估，封顶于预算上限。计划模式只读+提案、轮数更少。
    var lowRounds = planOnly ? 1 : (continuing ? 1 : 2);
    var highRounds = planOnly ? 2 : 8;
    var rnd = function(n) { return Math.round(Math.min(maxTokens, n) / 100) * 100; };
    return {
      perCallInput: perCallInput,
      low: rnd(perCallInput * lowRounds * 1.1),
      high: rnd(perCallInput * highRounds * 1.25),
      maxTokens: maxTokens,
      planOnly: planOnly,
      continuing: continuing
    };
  }

  // 取指定 group 的违规（finish 门控只拦 agent 能改的硬不变量·见 blockingChecks 默认值）
  function _blockingViolations(report, blockingChecks) {
    var v = [];
    blockingChecks.forEach(function(g) {
      var r = report.results && report.results[g];
      if (r && r.violations) r.violations.forEach(function(m) { v.push('[' + g + '] ' + m); });
    });
    return v;
  }

  /**
   * 运行 authoring loop（B：真多轮 conversation·tool_use/tool_result 线程·system 缓存）。
   * S3：finish 门控（blocking 违规拒绝结束、喂回逼自修）+ maxIterations + token 预算闸。
   * @param {object} draft
   * @param {string} userRequest
   * @param {{caller?:Function, maxIterations?:number, maxTokens?:number, maxFinishAttempts?:number,
   *          blockingChecks?:string[], maxTok?:number, cfg?:object, onStep?:Function, onText?:Function}} [opts]
   *   caller(conversation, tools, {maxTok,cfg,system}) → Promise<{text,toolCalls:[{id,name,input}]}>；默认 callWithTools，测试可注入。
   * @returns {Promise<{draft, transcript, conversation, iterations, finished, finalValidation, stopReason, tokensUsed, finishAttempts}>}
   */
  // 方向F · 权限闸：write 工具受 allowedCollections(范围沙箱) + allowDestructive(危险操作开关) 约束，拦在 dispatch 边界（结构性强制）。
  var _WRITE_TOOLS = { applyEdit: 1, applyPush: 1, removeEntity: 1, multiEdit: 1, bulkAdd: 1, renameEntity: 1 };
  var _DESTRUCTIVE_TOOLS = { removeEntity: 1, renameEntity: 1 };
  function _topOf(path) { return String(path == null ? '' : path).split(/[.\[]/)[0]; }
  function _toolCollections(name, input) {   // 该工具会改的顶层集合；null=全局(无法限定·如 renameEntity 跨集合联动)
    input = input || {};
    switch (name) {
      case 'applyEdit': case 'applyPush': case 'removeEntity': return [_topOf(input.path)];
      case 'bulkAdd': return [_topOf(input.collection)];
      case 'multiEdit': return (Array.isArray(input.edits) ? input.edits : []).map(function(e) { return _topOf(e && e.path); });
      case 'renameEntity': return null;
      default: return [];
    }
  }
  function _permCheck(name, input, perms) {   // 返回拦截原因(字符串)或 null(放行)
    if (!perms || !_WRITE_TOOLS[name]) return null;
    if (_DESTRUCTIVE_TOOLS[name] && perms.allowDestructive === false) {
      return '危险操作保护已开启：删除/改名（' + name + '）被禁用。如确需请玩家在权限里允许危险操作。';
    }
    var allowed = perms.allowedCollections;
    if (Array.isArray(allowed) && allowed.length) {
      var cols = _toolCollections(name, input);
      if (cols === null) return '范围沙箱：renameEntity 跨集合联动、超出限定范围，已拦截（请在范围内逐处改，或扩大范围）。';
      var outside = cols.filter(function(c) { return c && allowed.indexOf(c) < 0; });
      if (outside.length) return '范围沙箱：本次只允许修改 [' + allowed.join('、') + ']，已拦截对 [' + outside.join('、') + '] 的修改。';
    }
    return null;
  }

  // 刀E · 可中断：模块级当前运行句柄 + abort()。Claude code 式"随时停"（轮间中断，干净收尾）。
  var _activeRun = null;
  function abort() { if (_activeRun) _activeRun.aborted = true; return !!_activeRun; }

  function runAuthoringLoop(draft, userRequest, opts) {
    opts = opts || {};
    var caller = opts.caller || callWithTools;
    var maxIterations = opts.maxIterations || 24;     // 刀D · 自主度：长任务多跑几轮
    var maxTokens = opts.maxTokens || 120000;         // 刀D · 自主度：放宽 token 预算
    var maxFinishAttempts = opts.maxFinishAttempts || 3;
    var blockingChecks = opts.blockingChecks || ['admin-population', 'faction-refs'];
    var perms = { allowedCollections: opts.allowedCollections || null, allowDestructive: opts.allowDestructive !== false };   // 方向F · 权限（默认无限制·全放行）
    var planOnly = !!opts.planOnly;   // 计划模式：只读 + proposePlan，不动手
    var reviewOnly = !!opts.reviewOnly;   // 方向D · 审阅模式：只读 + submitReview，不动剧本
    var tools = reviewOnly ? _reviewTools() : (planOnly ? _planTools() : (opts.tools || AGENT_TOOLS));
    var conventions = (opts.conventions != null ? opts.conventions : loadConventions()) || '';   // 方向B · 剧本约定（每次 run 注入·等价 CLAUDE.md）
    var system = reviewOnly ? _buildReviewSystemPrompt(conventions) : (planOnly ? _buildPlanSystemPrompt(conventions) : _buildSystemPrompt(conventions));
    var surfaces = _getFieldSurfaces(opts);   // 刀A · 规格（游戏运行时要什么）
    var editorContext = opts.editorContext || '';   // 上下文感知：编辑器当前焦点（模块/集合/选中实体）
    var conversation, _priorTokens = 0;   // 维度1 · 对话式追问：有 priorConversation 则接着上轮线程改
    if (Array.isArray(opts.priorConversation) && opts.priorConversation.length) {
      conversation = opts.priorConversation.slice();
      conversation.push({ role: 'user', text: _buildFollowUpUser(draft, userRequest, surfaces, editorContext) });
      try { _priorTokens = _estimateTokens(JSON.stringify(opts.priorConversation)); } catch (e) {}
    } else {
      conversation = [{ role: 'user', text: reviewOnly ? _buildReviewUser(draft, userRequest, surfaces, editorContext) : _buildInitialUser(draft, userRequest, surfaces, editorContext) }];
    }
    var transcript = [];
    var iterations = 0, finishAttempts = 0;
    var tokensUsed = _estimateTokens(system) + _priorTokens + _estimateTokens(conversation[conversation.length - 1].text);
    var finished = false, stopReason = 'maxIterations';
    var _planResult = null;   // 计划模式产出（proposePlan 的步骤）
    var _reviewResult = null;   // 方向D · 审阅模式产出（submitReview 的报告）
    var _finishSummary = '';   // 改动说明：finish 时 agent 给的"做了什么+为什么"
    var control = { aborted: false };   // 刀E · 本次运行的中断句柄
    _activeRun = control;
    // 方向A · 鲁棒自愈：noToolCalls 先 nudge 再放弃；caller 瞬态错误退避重试
    var noToolNudges = 0, maxNoToolNudges = (opts.maxNoToolNudges != null ? opts.maxNoToolNudges : 2);
    var stepRetries = 0, maxStepRetries = (opts.maxStepRetries != null ? opts.maxStepRetries : 2);
    var retryBaseMs = opts.retryBaseMs || 800;

    function record(name, input, result) {
      transcript.push({ name: name, input: input, result: result });
      if (typeof opts.onStep === 'function') {
        try { opts.onStep({ name: name, input: input, result: result, iteration: iterations }); } catch (e) {}
      }
    }

    function step() {
      if (control.aborted) { stopReason = 'aborted'; return Promise.resolve(); }   // 刀E · 轮间中断
      if (iterations >= maxIterations) { stopReason = 'maxIterations'; return Promise.resolve(); }
      if (tokensUsed >= maxTokens) { stopReason = 'tokenBudget'; return Promise.resolve(); }
      iterations++;
      return Promise.resolve(caller(conversation, tools, { maxTok: opts.maxTok, cfg: opts.cfg, system: system }))
        .then(function(resp) {
          stepRetries = 0;   // 成功一轮即重置：每个停顿点各容忍 maxStepRetries 次抖动
          var text = (resp && resp.text) || '';
          var calls = (resp && resp.toolCalls) || [];
          tokensUsed += _estimateTokens(text) + 200;
          if (text && typeof opts.onText === 'function') { try { opts.onText(text, iterations); } catch (e) {} }
          if (control.aborted) { conversation.push({ role: 'assistant', text: text, toolCalls: [] }); stopReason = 'aborted'; return; }   // 刀E · API 返回后即停，不再施改
          if (!calls.length) {
            conversation.push({ role: 'assistant', text: text, toolCalls: [] });
            // 韧性：没调工具不直接放弃，先 nudge 推一把（卡住 → 重新发起）
            if (noToolNudges < maxNoToolNudges && !control.aborted) {
              noToolNudges++;
              conversation.push({ role: 'user', text: '你刚才没有调用任何工具。若已按要求改完，请调用 finish 并写明改动说明；若还没改完，请继续用工具（applyEdit/applyPush/multiEdit/...）修改后再 finish。' });
              if (typeof opts.onText === 'function') { try { opts.onText('（未检测到工具调用，正在提示 agent 继续…）', iterations); } catch (e) {} }
              return step();
            }
            stopReason = 'noToolCalls';
            return;
          }
          var toolResults = [];
          var finishAccepted = false;
          for (var i = 0; i < calls.length; i++) {
            var c = calls[i];
            var result;
            if (c.name === 'finish') {
              var blocking = _blockingViolations(validateDraft(draft), blockingChecks);
              if (!blocking.length) { _finishSummary = (c.input && c.input.summary) || ''; result = { ok: true, finish: true, summary: _finishSummary }; finishAccepted = true; }
              else { finishAttempts++; result = { ok: false, finish: false, reason: '草稿仍有 ' + blocking.length + ' 项必修违规，禁止结束，请先修复', violations: blocking }; }
            } else {
              var deny = _permCheck(c.name, c.input, perms);   // 方向F · 权限闸（范围沙箱/危险操作）
              if (deny) {
                result = { ok: false, reason: deny };   // 拦截·喂回让 agent 换法（不执行）
              } else {
                try {
                  result = dispatchTool(draft, c.name, c.input, surfaces);   // 韧性：单工具抛错不拖垮整轮
                } catch (te) {
                  result = { ok: false, reason: '工具执行出错：' + ((te && te.message) || te) + '（请检查参数后重试，或换个工具/方式）' };
                }
              }
              if (c.name === 'proposePlan' && result && result.plan) { _planResult = { steps: result.steps, summary: result.summary }; finishAccepted = true; }
              if (c.name === 'submitReview' && result && result.review) { _reviewResult = { findings: result.findings, summary: result.summary }; finishAccepted = true; }
            }
            record(c.name, c.input, result);
            toolResults.push({ id: c.id, name: c.name, content: _resultToText(result) });
            if (finishAccepted) break;
          }
          conversation.push({ role: 'assistant', text: text, toolCalls: calls });
          conversation.push({ role: 'tool', toolResults: toolResults });
          tokensUsed += _estimateTokens(JSON.stringify(toolResults));
          if (finishAccepted) { finished = true; stopReason = _reviewResult ? 'reviewed' : (_planResult ? 'planned' : 'finish'); return; }
          if (finishAttempts >= maxFinishAttempts) { stopReason = 'finishBlocked'; return; }
          return step();
        })
        .catch(function(e) {
          if (control.aborted) { stopReason = 'aborted'; return; }
          if (e && e.transient && stepRetries < maxStepRetries) {   // 韧性：瞬态错误（429/5xx/网络）退避重试本轮
            stepRetries++;
            if (typeof opts.onText === 'function') { try { opts.onText('（网络/服务抖动，正在重试 ' + stepRetries + '/' + maxStepRetries + '…）', iterations); } catch (er) {} }
            iterations--;   // 重试不计入迭代预算
            return _delay(retryBaseMs * Math.pow(2, stepRetries - 1)).then(step);
          }
          throw e;   // 非瞬态 / 重试耗尽 → 维持原 reject 语义（UI 显示失败）
        });
    }

    return Promise.resolve().then(step).then(function() {
      if (_activeRun === control) _activeRun = null;   // 刀E · 收尾清句柄
      return {
        draft: draft, transcript: transcript, conversation: conversation,
        iterations: iterations, finished: finished, plan: _planResult, review: _reviewResult,
        finalValidation: validateDraft(draft), stopReason: stopReason,
        tokensUsed: tokensUsed, finishAttempts: finishAttempts,
        summary: _finishSummary,   // 改动说明：做了什么+为什么
        notes: transcript.filter(function(t) { return t.name === 'note'; }).map(function(t) { return (t.input && t.input.text) || ''; }).filter(Boolean),
        // 方向B · agent 回写：发现的可长期沿用约定（交玩家「记住」）
        suggestedConventions: transcript.filter(function(t) { return t.name === 'recordConvention'; }).map(function(t) { return (t.input && t.input.convention) || ''; }).filter(Boolean)
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  S4 · diff + 编辑器 adapter（取剧本 / 提交保存）
  // ═══════════════════════════════════════════════════════════════════

  /**
   * 深 diff：返回 before→after 的变更路径列表（用于批准前预览 agent 改了什么）。
   * @returns {Array<{path:string, type:'added'|'removed'|'changed', before?:*, after?:*}>}
   */
  function computeDiff(before, after, opts) {
    opts = opts || {};
    var maxEntries = opts.maxEntries || 300;
    var out = [];
    function isObj(x) { return x && typeof x === 'object'; }
    function walk(a, b, path) {
      if (out.length >= maxEntries) return;
      if (a === b) return;
      if (a === undefined) { out.push({ path: path, type: 'added', after: b }); return; }
      if (b === undefined) { out.push({ path: path, type: 'removed', before: a }); return; }
      if (isObj(a) && isObj(b)) {
        var keys = {};
        Object.keys(a).forEach(function(k) { keys[k] = 1; });
        Object.keys(b).forEach(function(k) { keys[k] = 1; });
        Object.keys(keys).forEach(function(k) {
          walk(a[k], b[k], path ? path + '.' + k : k);
        });
        return;
      }
      if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: path, type: 'changed', before: a, after: b });
    }
    walk(before, after, '');
    return out;
  }

  /** 旧编辑器（editor.html）：body = 全局 scriptData。 */
  function makeOldEditorAdapter(g) {
    g = g || global;
    return {
      id: 'legacy-editor',
      label: '剧本编辑器',
      isAvailable: function() { return typeof g.scriptData !== 'undefined' && g.scriptData && typeof g.saveScript === 'function'; },
      getScenario: function() { return g.scriptData; },
      getContext: function() { return ''; },   // 旧编辑器 state 结构不同·暂不提供焦点上下文
      commit: function(draft) {
        var sd = g.scriptData;
        // 就地替换（保留引用·所有闭包仍指向它）；draft 是完整深拷贝·不会洗字段
        Object.keys(sd).forEach(function(k) { delete sd[k]; });
        Object.keys(draft).forEach(function(k) { sd[k] = draft[k]; });
        if (typeof g.renderAll === 'function') g.renderAll();
        if (typeof g.saveScript === 'function') g.saveScript();
        return { ok: true };
      }
    };
  }

  /** 新编辑器（scenario-editor-reset）：body = TM_SCENARIO_EDITOR_RESET_APP.state.scenario。 */
  function makeResetEditorAdapter(g) {
    g = g || global;
    function app() { return g.TM_SCENARIO_EDITOR_RESET_APP; }
    return {
      id: 'scenario-editor-reset',
      label: '剧本编辑器（新）',
      isAvailable: function() { var a = app(); return !!(a && a.state && typeof a.applyImportedScenario === 'function'); },
      getScenario: function() { return app().state.scenario; },
      // 上下文感知（像 Claude code 知道你打开的文件）：读编辑器当前焦点——模块/集合/选中实体。
      getContext: function() {
        try {
          var a = app(); if (!a || !a.state) return '';
          var st = a.state, sc = st.scenario || {}, parts = [];
          if (st.selectedModuleId && Array.isArray(st.modules)) {
            var mod = st.modules.filter(function(m) { return m && m.id === st.selectedModuleId; })[0];
            if (mod && (mod.title || mod.name)) parts.push('当前模块：' + (mod.title || mod.name));
          }
          var field = st.selectedField;
          if (field) {
            parts.push('当前集合/字段：' + field);
            var coll = sc[field], idx = st.selectedEntityIndex;
            if (Array.isArray(coll) && idx != null && coll[idx]) {
              var e = coll[idx], nm = e && (e.name || e.id || e.title);
              parts.push('选中第 ' + idx + ' 项' + (nm ? '「' + nm + '」' : ''));
            }
          }
          return parts.join('，');
        } catch (e) { return ''; }
      },
      commit: function(draft) {
        app().applyImportedScenario(draft, 'AI 助手生成');
        return { ok: true };
      }
    };
  }

  /** 自动探测当前页面所属编辑器。 */
  function detectAdapter(g) {
    g = g || global;
    var reset = makeResetEditorAdapter(g);
    if (reset.isAvailable()) return reset;
    var legacy = makeOldEditorAdapter(g);
    if (legacy.isAvailable()) return legacy;
    return null;
  }

  // ── Export ──
  var TM = global.TM = global.TM || {};
  TM.AuthoringAgent = {
    // S1
    makeDraft: makeDraft,
    isBlocked: isBlocked,
    applyEdit: applyEdit,
    applyPush: applyPush,
    applyRemove: applyRemove,
    validateDraft: validateDraft,
    addCheck: addCheck,
    _checks: _checks,
    // S2
    loadEditorApiConfig: loadEditorApiConfig,
    loadConventions: loadConventions,
    saveConventions: saveConventions,
    callWithTools: callWithTools,
    testConnection: testConnection,
    abort: abort,
    estimateRun: estimateRun,
    AGENT_TOOLS: AGENT_TOOLS,
    dispatchTool: dispatchTool,
    computeGaps: _computeGaps,
    runAuthoringLoop: runAuthoringLoop,
    // S5
    ENTITY_TEMPLATES: ENTITY_TEMPLATES,
    buildSchemaGuide: buildSchemaGuide,
    // S4
    computeDiff: computeDiff,
    makeOldEditorAdapter: makeOldEditorAdapter,
    makeResetEditorAdapter: makeResetEditorAdapter,
    detectAdapter: detectAdapter
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TM.AuthoringAgent;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
