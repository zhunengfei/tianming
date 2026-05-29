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

  function _isAnthropic(url) {
    return url.indexOf('anthropic.com') >= 0 || url.indexOf('api.anthropic') >= 0;
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

  // 从纯文本抠 {tool_calls:[{name,input}]}（端点忽略 tools 直接吐 JSON 时兜底）
  function _parseJsonToolCalls(text) {
    if (!text) return [];
    var parsed = null;
    try { var m = String(text).match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch (e) { return []; }
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

    var anthropic = _isAnthropic(cfg.url);
    var endpoint, headers, body;
    if (anthropic) {
      endpoint = cfg.url.indexOf('/messages') < 0 ? cfg.url + '/v1/messages' : cfg.url;
      headers = { 'Content-Type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' };
      body = _toAnthropic(conversation, system, tools, maxTok, cfg.model);
    } else {
      endpoint = (cfg.url.indexOf('/chat/completions') < 0 && cfg.url.indexOf('/messages') < 0) ? cfg.url + '/chat/completions' : cfg.url;
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key };
      body = _toOpenAI(conversation, system, tools, maxTok, cfg.model, cfg.temp);
    }

    function fallbackTextCall() {
      var prompt = _flattenConversation(system, conversation, tools);
      var fbBody = anthropic
        ? { model: cfg.model, max_tokens: maxTok, messages: [{ role: 'user', content: prompt }] }
        : { model: cfg.model, temperature: cfg.temp, max_tokens: maxTok, messages: [{ role: 'user', content: prompt }] };
      return _fetchJSON(endpoint, { method: 'POST', headers: headers, body: JSON.stringify(fbBody) }, opts).then(function(data) {
        var parsed = anthropic ? _parseAnthropic(data) : _parseOpenAI(data);
        var calls = parsed.toolCalls.length ? parsed.toolCalls : _parseJsonToolCalls(parsed.text);
        return { text: parsed.text, toolCalls: calls, fallback: true };
      });
    }

    return _fetchJSON(endpoint, { method: 'POST', headers: headers, body: JSON.stringify(body) }, opts).then(function(data) {
      var parsed = anthropic ? _parseAnthropic(data) : _parseOpenAI(data);
      if (parsed.toolCalls.length) return parsed;
      var fromText = _parseJsonToolCalls(parsed.text); // 端点忽略 tools 但吐了 JSON
      if (fromText.length) return { text: parsed.text, toolCalls: fromText, fallback: true };
      return parsed; // 纯文本无工具 → 交给 loop 判 noToolCalls
    }).catch(function(e) {
      if (e && e.status === 400) return fallbackTextCall(); // 端点多半拒绝 tools 参数 → 文本兜底
      throw e;
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
      name: 'finish',
      description: '剧本已按要求改好且校验通过时调用，结束本次编辑。',
      parameters: { type: 'object', properties: {
        summary: { type: 'string', description: '一句话说明做了什么' }
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

  /** 派发单个工具调用到 S1 工具，返回喂回模型的结果对象。 */
  function dispatchTool(draft, name, input) {
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
      case 'validateDraft': return validateDraft(draft, input.group);
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
  function _buildSystemPrompt() {
    return [
      '你是历史策略游戏「天命」的剧本编辑助手。通过调用工具编辑剧本草稿，满足用户需求。',
      '规则：① 只用工具修改/查询，不要直接输出 JSON 剧本正文。② 中文显示名（人物/势力/地名）保持中文，禁止英译。',
      '③ 先用 getField/searchEntities 查看现状再改。④ 每改完一批用 validateDraft 自查，有违规继续修。⑤ 改好且校验通过后调用 finish。',
      '',
      buildSchemaGuide()
    ].join('\n');
  }

  function _buildInitialUser(draft, userRequest) {
    return '【用户需求】\n' + (userRequest || '')
      + '\n\n【草稿现状】\n' + _draftSummary(draft)
      + '\n\n开始：先按需 getField/searchEntities 查看，再用 applyEdit/applyPush/removeEntity 修改，validateDraft 自查，最后 finish。';
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
  function runAuthoringLoop(draft, userRequest, opts) {
    opts = opts || {};
    var caller = opts.caller || callWithTools;
    var maxIterations = opts.maxIterations || 16;
    var maxTokens = opts.maxTokens || 80000;
    var maxFinishAttempts = opts.maxFinishAttempts || 3;
    var blockingChecks = opts.blockingChecks || ['admin-population', 'faction-refs'];
    var system = _buildSystemPrompt();
    var conversation = [{ role: 'user', text: _buildInitialUser(draft, userRequest) }];
    var transcript = [];
    var iterations = 0, finishAttempts = 0;
    var tokensUsed = _estimateTokens(system) + _estimateTokens(conversation[0].text);
    var finished = false, stopReason = 'maxIterations';

    function record(name, input, result) {
      transcript.push({ name: name, input: input, result: result });
      if (typeof opts.onStep === 'function') {
        try { opts.onStep({ name: name, input: input, result: result, iteration: iterations }); } catch (e) {}
      }
    }

    function step() {
      if (iterations >= maxIterations) { stopReason = 'maxIterations'; return Promise.resolve(); }
      if (tokensUsed >= maxTokens) { stopReason = 'tokenBudget'; return Promise.resolve(); }
      iterations++;
      return Promise.resolve(caller(conversation, AGENT_TOOLS, { maxTok: opts.maxTok, cfg: opts.cfg, system: system }))
        .then(function(resp) {
          var text = (resp && resp.text) || '';
          var calls = (resp && resp.toolCalls) || [];
          tokensUsed += _estimateTokens(text) + 200;
          if (text && typeof opts.onText === 'function') { try { opts.onText(text, iterations); } catch (e) {} }
          if (!calls.length) {
            conversation.push({ role: 'assistant', text: text, toolCalls: [] });
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
              if (!blocking.length) { result = { ok: true, finish: true, summary: (c.input && c.input.summary) || '' }; finishAccepted = true; }
              else { finishAttempts++; result = { ok: false, finish: false, reason: '草稿仍有 ' + blocking.length + ' 项必修违规，禁止结束，请先修复', violations: blocking }; }
            } else {
              result = dispatchTool(draft, c.name, c.input);
            }
            record(c.name, c.input, result);
            toolResults.push({ id: c.id, name: c.name, content: _resultToText(result) });
            if (finishAccepted) break;
          }
          conversation.push({ role: 'assistant', text: text, toolCalls: calls });
          conversation.push({ role: 'tool', toolResults: toolResults });
          tokensUsed += _estimateTokens(JSON.stringify(toolResults));
          if (finishAccepted) { finished = true; stopReason = 'finish'; return; }
          if (finishAttempts >= maxFinishAttempts) { stopReason = 'finishBlocked'; return; }
          return step();
        });
    }

    return Promise.resolve().then(step).then(function() {
      return {
        draft: draft, transcript: transcript, conversation: conversation,
        iterations: iterations, finished: finished,
        finalValidation: validateDraft(draft), stopReason: stopReason,
        tokensUsed: tokensUsed, finishAttempts: finishAttempts
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
    callWithTools: callWithTools,
    AGENT_TOOLS: AGENT_TOOLS,
    dispatchTool: dispatchTool,
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
