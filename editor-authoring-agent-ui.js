// @ts-check
/**
 * editor-authoring-agent-ui.js — 剧本 authoring agent 的对话面板 UI（S4）
 *
 * 自注入浮层：检测当前页面属于哪个剧本编辑器（旧 editor.html / 新 scenario-editor-reset），
 * 注入一个启动按钮 + 面板。流程：
 *   输入需求 → getScenario → makeDraft → runAuthoringLoop（实时 transcript）
 *           → computeDiff 预览 + finalValidation → 玩家「应用」走 adapter.commit / 「放弃」。
 *
 * 依赖 editor-authoring-agent.js（TM.AuthoringAgent）。仅浏览器加载。
 * 两个编辑器零布局耦合：浮层 + adapter，HTML 不需要预留容器。
 */
(function(global) {
  'use strict';
  if (typeof document === 'undefined') return;

  var AA = global.TM && global.TM.AuthoringAgent;
  var PANEL_ID = 'tm-aa-panel';
  var ui = { adapter: null, draft: null, running: false, els: null, _checkpoints: [], _ckptSeq: 0 };
  var MAX_CKPT = 15;   // 方向G · 检查点栈上限（session 内存态·满则淘汰最旧）

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _clone(o) { try { return JSON.parse(JSON.stringify(o)); } catch (e) { return o; } }   // 维度3 · 撤销快照
  // 上下文感知：编辑器当前焦点（模块/集合/选中实体），喂给 agent 解析"他/这个/当前"等指代
  function _editorContext() {
    try { return (ui.adapter && typeof ui.adapter.getContext === 'function') ? (ui.adapter.getContext() || '') : ''; }
    catch (e) { return ''; }
  }

  function injectStyles() {
    if (document.getElementById('tm-aa-style')) return;
    var css = [
      '#tm-aa-fab{position:fixed;right:18px;bottom:18px;z-index:99998;background:#7a5cff;color:#fff;border:none;',
      'border-radius:24px;padding:10px 16px;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);font-family:inherit}',
      '#tm-aa-fab:hover{background:#8c72ff}',
      '#' + PANEL_ID + '{position:fixed;right:18px;bottom:64px;z-index:99999;width:380px;max-width:calc(100vw - 36px);',
      'max-height:78vh;display:none;flex-direction:column;background:#1d2030;color:#e8e8f0;border:1px solid #3a3f55;',
      'border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.5);font-family:inherit;font-size:13px;overflow:hidden}',
      '#' + PANEL_ID + '.open{display:flex}',
      '#tm-aa-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#262a3d;border-bottom:1px solid #3a3f55}',
      '#tm-aa-hd b{font-size:13px}',
      '#tm-aa-hd .sub{font-size:11px;color:#8b90a8;margin-left:6px}',
      '#tm-aa-x{background:none;border:none;color:#8b90a8;font-size:18px;cursor:pointer;line-height:1}',
      '#tm-aa-body{padding:10px 12px;overflow:auto;display:flex;flex-direction:column;gap:8px}',
      '#tm-aa-req{width:100%;box-sizing:border-box;background:#13151f;color:#e8e8f0;border:1px solid #3a3f55;',
      'border-radius:8px;padding:8px;font-family:inherit;font-size:13px;resize:vertical;min-height:54px}',
      '#tm-aa-go{background:#7a5cff;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:13px}',
      '#tm-aa-go:disabled{opacity:.5;cursor:default}',
      '#tm-aa-status{font-size:12px;color:#9aa0bd;min-height:16px}',
      '.tm-aa-log{background:#13151f;border:1px solid #2c3145;border-radius:8px;padding:6px 8px;max-height:150px;overflow:auto;font-size:11px;line-height:1.5}',
      '.tm-aa-log .ln{color:#b7bcd6}.tm-aa-log .bad{color:#ff8f8f}.tm-aa-log .fin{color:#7fe0a0}',
      '.tm-aa-sec{font-size:11px;color:#8b90a8;text-transform:none;margin-top:2px}',
      '.tm-aa-diff{background:#13151f;border:1px solid #2c3145;border-radius:8px;padding:6px 8px;max-height:180px;overflow:auto;font-size:11px;line-height:1.5}',
      '.tm-aa-diff .add{color:#7fe0a0}.tm-aa-diff .rm{color:#ff8f8f}.tm-aa-diff .ch{color:#e8c86a}',
      '.tm-aa-summary{background:#191c2b;border:1px solid #3a3f55;border-left:3px solid #7a5cff;border-radius:8px;padding:7px 10px;font-size:12px;line-height:1.55;color:#d8dcf0}',
      '.tm-aa-summary b{color:#bfa9ff;font-size:11px;display:block;margin-bottom:3px}',
      '.tm-aa-summary .note{color:#9aa0bd;font-size:11px;margin-top:3px}',
      '.tm-aa-sug{margin-top:6px;padding-top:5px;border-top:1px solid #3a3f55}.tm-aa-sug b{color:#e8c86a}',
      '.tm-aa-sug .sug-row{display:flex;align-items:center;gap:6px;margin-top:4px;font-size:11px;color:#d8dcf0}.tm-aa-sug .sug-row span{flex:1}',
      '.tm-aa-sug .sug-keep{background:#3a3f55;color:#e8e8f0;border:none;border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer}.tm-aa-sug .sug-keep:disabled{opacity:.6;cursor:default}',
      '.tm-aa-finding{margin-bottom:6px;padding:5px 7px;background:#13151f;border:1px solid #2c3145;border-left:3px solid #3a3f55;border-radius:6px}',
      '.tm-aa-finding .sev{font-weight:bold;font-size:11px}.tm-aa-finding .sev.rm{color:#ff8f8f}.tm-aa-finding .sev.ch{color:#e8c86a}.tm-aa-finding .sev.add{color:#7fe0a0}',
      '.tm-aa-finding b{color:#cfd3ee;font-size:12px}.tm-aa-finding .loc{color:#8b90a8;font-size:10px}',
      '.tm-aa-finding .iss{color:#d8dcf0;font-size:11px;margin-top:2px;line-height:1.5}.tm-aa-finding .sug{color:#9aa0bd;font-size:11px;margin-top:2px;line-height:1.5}',
      '.tm-aa-diff-group{margin-bottom:6px;border-bottom:1px solid #2c3145;padding-bottom:4px}.tm-aa-diff-head{display:block;cursor:pointer;color:#e8e8f0;padding:2px 0;font-size:12px}.tm-aa-diff-head input{margin-right:5px;vertical-align:middle}',
      '.tm-aa-val.ok{color:#7fe0a0}.tm-aa-val.bad{color:#ff8f8f}',
      '#tm-aa-actions{display:flex;gap:8px}',
      '#tm-aa-apply{flex:1;background:#2e9e5b;color:#fff;border:none;border-radius:8px;padding:8px;cursor:pointer}',
      '#tm-aa-apply.warn{background:#b5872e}',
      '#tm-aa-discard{flex:1;background:#3a3f55;color:#e8e8f0;border:none;border-radius:8px;padding:8px;cursor:pointer}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'tm-aa-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function buildPanel() {
    var panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = [
      '<div id="tm-aa-hd"><span><b>AI 剧本助手</b><span class="sub">' + esc(ui.adapter.label || '') + '</span></span>',
      '<button id="tm-aa-x" title="关闭">×</button></div>',
      '<div id="tm-aa-body">',
      '<textarea id="tm-aa-req" placeholder="描述你想要的修改，例如：把主角势力改名为「西凉军」并补两个文官"></textarea>',
      '<button id="tm-aa-go">生成</button>',
      '<div id="tm-aa-status"></div>',
      '<div class="tm-aa-sec" data-sec="log" style="display:none">执行过程</div>',
      '<div class="tm-aa-log" id="tm-aa-loglist" style="display:none"></div>',
      '<div class="tm-aa-summary" id="tm-aa-summary" style="display:none"></div>',
      '<div class="tm-aa-sec" data-sec="diff" style="display:none">改动预览</div>',
      '<div class="tm-aa-diff" id="tm-aa-difflist" style="display:none"></div>',
      '<div class="tm-aa-val" id="tm-aa-val" style="display:none"></div>',
      '<div id="tm-aa-actions" style="display:none">',
      '<button id="tm-aa-apply">应用到剧本</button><button id="tm-aa-discard">放弃</button>',
      '</div></div>'
    ].join('');
    document.body.appendChild(panel);

    ui.els = {
      panel: panel,
      req: panel.querySelector('#tm-aa-req'),
      go: panel.querySelector('#tm-aa-go'),
      status: panel.querySelector('#tm-aa-status'),
      logSec: panel.querySelector('[data-sec="log"]'),
      log: panel.querySelector('#tm-aa-loglist'),
      summary: panel.querySelector('#tm-aa-summary'),
      diffSec: panel.querySelector('[data-sec="diff"]'),
      diff: panel.querySelector('#tm-aa-difflist'),
      val: panel.querySelector('#tm-aa-val'),
      actions: panel.querySelector('#tm-aa-actions'),
      apply: panel.querySelector('#tm-aa-apply'),
      discard: panel.querySelector('#tm-aa-discard')
    };
    panel.querySelector('#tm-aa-x').addEventListener('click', function() { panel.classList.remove('open'); });
    ui.els.go.addEventListener('click', onGenerate);
    ui.els.apply.addEventListener('click', onApply);
    ui.els.discard.addEventListener('click', onDiscard);
    return panel;
  }

  function ensurePanel() {
    var p = document.getElementById(PANEL_ID);
    if (!p) p = buildPanel();
    return p;
  }

  function setStatus(t) { if (ui.els) ui.els.status.textContent = t || ''; }

  function resetResults() {
    if (!ui.els) return;
    ui.els.log.innerHTML = ''; ui.els.log.style.display = 'none'; ui.els.logSec.style.display = 'none';
    ui.els.diff.innerHTML = ''; ui.els.diff.style.display = 'none'; ui.els.diffSec.style.display = 'none';
    if (ui.els.summary) { ui.els.summary.innerHTML = ''; ui.els.summary.style.display = 'none'; }
    ui.els.val.style.display = 'none';
    ui.els.actions.style.display = 'none';
  }

  // 改动说明：把 agent 的 finish summary（做了什么+为什么）+ 计划备注醒目展示在 diff 之上；
  // 方向B · 若 agent 发现可长期沿用的约定，列出 + 给「记住」按钮（追加进持久 conventions）。
  function renderSummary(summary, notes, suggestions) {
    if (!ui.els || !ui.els.summary) return;
    var s = (summary || '').trim();
    var sug = (suggestions || []).filter(Boolean);
    if (!s && (!notes || !notes.length) && !sug.length) { ui.els.summary.style.display = 'none'; return; }
    var html = '';
    if (s || (notes && notes.length)) {
      html += '<b>本次改动说明</b>' + (s ? esc(s) : '（agent 未给出说明）');
      if (notes && notes.length) {
        html += '<div class="note">思路：' + notes.slice(0, 4).map(function(n) { return esc(String(n).slice(0, 120)); }).join('；') + '</div>';
      }
    }
    if (sug.length) {
      html += '<div class="tm-aa-sug"><b>💡 建议记住的约定</b>' + sug.slice(0, 5).map(function(c, i) {
        return '<div class="sug-row"><span>' + esc(String(c).slice(0, 120)) + '</span><button type="button" class="sug-keep" data-i="' + i + '">记住</button></div>';
      }).join('') + '</div>';
    }
    ui.els.summary.innerHTML = html;
    ui.els.summary.style.display = '';
    Array.prototype.forEach.call(ui.els.summary.querySelectorAll('.sug-keep'), function(btn) {
      btn.addEventListener('click', function() {
        var idx = +btn.getAttribute('data-i'), conv = sug[idx];
        if (conv && AA && AA.saveConventions && AA.loadConventions) {
          var cur = AA.loadConventions(), lines = cur ? cur.split('\n') : [];
          if (lines.indexOf(conv) < 0) { lines.push(conv); AA.saveConventions(lines.join('\n')); }
          btn.textContent = '已记住 ✓'; btn.disabled = true;
        }
      });
    });
  }

  function appendText(text, iter) {
    if (!ui.els || !text) return;
    ui.els.logSec.style.display = ''; ui.els.log.style.display = '';
    var line = document.createElement('div');
    line.className = 'ln';
    line.style.color = '#9aa0bd';
    line.style.fontStyle = 'italic';
    line.innerHTML = '#' + iter + ' 💭 ' + esc(String(text).slice(0, 200));
    ui.els.log.appendChild(line);
    ui.els.log.scrollTop = ui.els.log.scrollHeight;
  }

  // 维度2 · 把工具调用 / diff 渲染成玩家看得懂的中文（rendering only · 两编辑器同享）。
  var _COLL_CN = { characters: '人物', factions: '势力', parties: '党派', classes: '阶层', items: '物品', events: '事件', families: '家族', cities: '城市', traitDefinitions: '特质', adminHierarchy: '行政区划', military: '军务', variables: '变量', relations: '关系', openingLetters: '开场信', government: '官制', goals: '目标' };
  function _shortVal(v) {
    if (v == null) return '空';
    if (typeof v === 'object') return String(v.name || v.id || v.title || (Array.isArray(v) ? (v.length + ' 项') : JSON.stringify(v))).slice(0, 40);
    return String(v).slice(0, 40);
  }
  function _friendlyPath(p) {
    var s = String(p || '');
    var top = s.split(/[.\[]/)[0];
    var rest = s.slice(top.length).replace(/^\./, '').replace(/\[(\d+)\]/g, '#$1').replace(/\./g, ' › ');
    return (_COLL_CN[top] || top) + (rest ? ' › ' + rest : '');
  }
  function _friendlyStep(step) {
    var n = step.name, i = step.input || {}, r = step.result || {};
    switch (n) {
      case 'applyEdit': return '改 ' + _friendlyPath(i.path) + ' ＝ ' + _shortVal(i.value);
      case 'applyPush': return '新增一项到 ' + (_COLL_CN[i.path] || _friendlyPath(i.path)) + '：' + _shortVal(i.value);
      case 'removeEntity': return '删除 ' + _friendlyPath(i.path);
      case 'getField': return '查看 ' + _friendlyPath(i.path);
      case 'searchEntities': return '搜索 ' + (_COLL_CN[i.collection] || i.collection || '') + (i.query ? '「' + i.query + '」' : '');
      case 'globalSearch': return '🔎 全局检索「' + (i.query || '') + '」' + (r.total != null ? '（命中 ' + r.total + '）' : '');
      case 'findReferences': return '🔗 查引用「' + (i.name || '') + '」' + (r.exactCount != null ? '（精确 ' + r.exactCount + '·提及 ' + (r.mentionCount || 0) + '）' : '');
      case 'renameEntity': return '✎ 改名「' + (i.oldName || '') + '」→「' + (i.newName || '') + '」' + (r.changed != null ? '（联动 ' + r.changed + ' 处）' : '');
      case 'listCollection': return '浏览 ' + (_COLL_CN[i.collection] || i.collection || '') + (r.count != null ? '（共 ' + r.count + '）' : '');
      case 'describeSchema': return '查字段形状 ' + (i.kind || '(全部)');
      case 'listGaps': return '查规格缺口' + (r.requiredMissing ? '（必需缺 ' + r.requiredMissing.length + '）' : '');
      case 'validateDraft': return '校验' + (r.ok === false ? '：发现 ' + ((r.violations || []).length) + ' 处问题' : '：通过');
      case 'bulkAdd': return '批量新增 ' + (r.added != null ? r.added : '') + ' 项到 ' + (_COLL_CN[i.collection] || i.collection || '');
      case 'multiEdit': return '一次改 ' + (r.applied != null ? r.applied : (i.edits || []).length) + ' 处';
      case 'note': return '📝 ' + _shortVal(i.text);
      case 'recordConvention': return '📌 记下约定：' + _shortVal(i.convention);
      case 'finish': return '✓ 完成：' + (i.summary || '');
      default: return n + '(' + JSON.stringify(i).slice(0, 60) + ')';
    }
  }

  function appendLog(step) {
    if (!ui.els) return;
    ui.els.logSec.style.display = ''; ui.els.log.style.display = '';
    var r = step.result || {};
    var cls = (step.name === 'finish' && r.ok) ? 'fin' : (r.ok ? 'ln' : 'bad');
    var detail = r.ok ? '' : (' — ' + esc(r.reason || ''));
    if (r.violations && r.violations.length) detail += ' [' + esc(r.violations.slice(0, 3).join('; ')) + ']';
    var line = document.createElement('div');
    line.className = cls;
    line.innerHTML = '#' + step.iteration + ' ' + esc(_friendlyStep(step)) + detail;
    ui.els.log.appendChild(line);
    ui.els.log.scrollTop = ui.els.log.scrollHeight;
  }

  function _diffEntryHtml(d) {
    var p = _friendlyPath(d.path);
    if (d.type === 'added') return '<div class="add">＋ 新增 ' + esc(p) + '：' + esc(_shortVal(d.after)) + '</div>';
    if (d.type === 'removed') return '<div class="rm">－ 删除 ' + esc(p) + '</div>';
    return '<div class="ch">✎ 改 ' + esc(p) + '：' + esc(_shortVal(d.before)) + ' → ' + esc(_shortVal(d.after)) + '</div>';
  }
  // 逐项纳入：按顶层字段分组 + 每组一个勾选框（默认勾选），应用时只取勾中的字段
  function renderDiff(diffs) {
    if (!ui.els) return;
    ui.els.diffSec.style.display = ''; ui.els.diff.style.display = '';
    ui.els.diffSec.textContent = '改动预览（勾选要应用的字段）';
    if (!diffs.length) { ui.els.diff.innerHTML = '<div class="ln" style="color:#8b90a8">（无改动）</div>'; return; }
    var groups = {}, order = [];
    diffs.forEach(function(d) { var top = String(d.path || '').split(/[.\[]/)[0] || '(根)'; if (!groups[top]) { groups[top] = []; order.push(top); } groups[top].push(d); });
    var html = order.map(function(field) {
      var es = groups[field];
      var inner = es.slice(0, 40).map(_diffEntryHtml).join('');
      if (es.length > 40) inner += '<div class="ln">… 还有 ' + (es.length - 40) + ' 处</div>';
      return '<div class="tm-aa-diff-group"><label class="tm-aa-diff-head"><input type="checkbox" data-diff-field="' + esc(field) + '" checked> <b>' + esc(_COLL_CN[field] || field) + '</b> <span style="color:#8b90a8">(' + es.length + ' 处)</span></label>' + inner + '</div>';
    }).join('');
    ui.els.diff.innerHTML = html;
  }

  function renderValidation(report) {
    if (!ui.els) return;
    var v = ui.els.val;
    v.style.display = '';
    if (report.ok) { v.className = 'tm-aa-val ok'; v.textContent = '✓ 校验通过'; return; }
    v.className = 'tm-aa-val bad';
    v.textContent = '⚠ 仍有 ' + report.violations.length + ' 项校验问题：' + report.violations.slice(0, 4).join('；');
  }

  // 方向D · 审阅报告：总评进 summary 块、findings 按严重度排序着色进 diff 区（只读·无应用）
  function renderReview(review) {
    if (!ui.els) return;
    if (ui.els.summary) {
      ui.els.summary.innerHTML = '<b>剧本审阅报告</b>' + esc((review && review.summary) || '（无总评）');
      ui.els.summary.style.display = '';
    }
    ui.els.diffSec.style.display = ''; ui.els.diff.style.display = '';
    var findings = ((review && review.findings) || []).slice();
    ui.els.diffSec.textContent = '审阅发现（' + findings.length + ' 条）';
    var sevRank = { '高': 0, '中': 1, '低': 2 };
    findings.sort(function(a, b) { return (sevRank[a && a.severity] != null ? sevRank[a.severity] : 3) - (sevRank[b && b.severity] != null ? sevRank[b.severity] : 3); });
    if (!findings.length) { ui.els.diff.innerHTML = '<div class="ln" style="color:#7fe0a0">✓ 未发现明显问题</div>'; return; }
    ui.els.diff.innerHTML = findings.slice(0, 40).map(function(f) {
      f = f || {};
      var sev = f.severity || '?';
      var sevCls = sev === '高' ? 'rm' : (sev === '中' ? 'ch' : 'add');
      return '<div class="tm-aa-finding"><span class="sev ' + sevCls + '">[' + esc(sev) + ']</span> <b>' + esc(f.dimension || '') + '</b>'
        + (f.location ? ' <span class="loc">' + esc(String(f.location).slice(0, 50)) + '</span>' : '')
        + '<div class="iss">' + esc(f.issue || '') + '</div>'
        + (f.suggestion ? '<div class="sug">→ ' + esc(f.suggestion) + '</div>' : '') + '</div>';
    }).join('') + (findings.length > 40 ? '<div class="ln">… 还有 ' + (findings.length - 40) + ' 条</div>' : '');
  }

  // 计划模式 · 展示 agent 的编号计划
  function renderPlan(plan) {
    if (!ui.els) return;
    ui.els.diffSec.style.display = ''; ui.els.diff.style.display = '';
    ui.els.diffSec.textContent = '改动计划（批准后执行）';
    var steps = (plan && plan.steps) || [];
    var rows = [];
    if (plan && plan.summary) rows.push('<div class="ch">' + esc(plan.summary) + '</div>');
    steps.forEach(function(s, i) { rows.push('<div class="ln">' + (i + 1) + '. ' + esc(typeof s === 'string' ? s : (s.text || JSON.stringify(s))) + '</div>'); });
    if (!rows.length) rows.push('<div class="ln">（agent 未给出明确步骤）</div>');
    ui.els.diff.innerHTML = rows.join('');
  }

  // 计划模式 · 批准后按计划执行（续规划线程、全工具）
  function executePlan() {
    if (ui.running || !ui.draft) return;
    resetResults();
    ui.running = true; ui.els.go.disabled = true;
    setStatus('正在按计划执行…');
    AA.runAuthoringLoop(ui.draft, '按上面的计划执行这些改动；改完用 validateDraft 自查后调用 finish。', {
      priorConversation: ui.conversation,
      editorContext: _editorContext(),
      onStep: function(step) { appendLog(step); setStatus('第 ' + step.iteration + ' 轮…'); },
      onText: function(text, iter) { appendText(text, iter); }
    }).then(function(res) {
      ui.running = false; ui.els.go.disabled = false;
      ui.conversation = res.conversation;
      renderSummary(res.summary, res.notes, res.suggestedConventions);
      renderDiff(AA.computeDiff(ui.adapter.getScenario(), ui.draft));
      renderValidation(res.finalValidation);
      ui.els.actions.style.display = '';
      ui.els.apply.className = res.finalValidation.ok ? '' : 'warn';
      ui.els.apply.textContent = res.finalValidation.ok ? '应用到剧本' : '仍有问题·确认应用';
      ui.els.discard.textContent = '放弃';
      setStatus('已按计划执行（' + res.iterations + ' 轮）· 可应用 / 放弃 / 追问');
    }).catch(function(err) { ui.running = false; ui.els.go.disabled = false; setStatus('执行失败：' + (err && err.message || err)); });
  }

  // 方向D · 审阅模式：只读巡查 → 出体检报告（不产生可应用改动）。输入框文字（若有）作审阅重点。
  function runReview() {
    if (ui.running) return;
    if (!AA || typeof AA.runAuthoringLoop !== 'function') { setStatus('agent 核心未加载'); return; }
    resetResults();
    ui.draft = AA.makeDraft(ui.adapter.getScenario());   // 只读快照（审阅不改它）
    ui.conversation = null; ui._pendingPlan = false;
    ui.running = true; ui.els.go.disabled = true;
    var focus = (ui.els.req.value || '').trim();
    setStatus('正在审阅剧本…（agent 只读巡查，出体检报告，可能需要数十秒）');
    AA.runAuthoringLoop(ui.draft, focus, {
      reviewOnly: true,
      editorContext: _editorContext(),
      onStep: function(step) { appendLog(step); setStatus('审阅中·第 ' + step.iteration + ' 轮…'); },
      onText: function(text, iter) { appendText(text, iter); }
    }).then(function(res) {
      ui.running = false; ui.els.go.disabled = false;
      ui.els.req.value = '';
      ui.draft = null;   // 审阅不产生可应用改动
      if (res.review) {
        renderReview(res.review);
        setStatus('审阅完成（' + res.iterations + ' 轮·约 ' + res.tokensUsed + ' tokens）· 仅诊断，未改动剧本');
      } else {
        setStatus('审阅结束（' + (res.stopReason || '') + '）· 未生成报告，可重试');
      }
    }).catch(function(err) {
      ui.running = false; ui.els.go.disabled = false;
      setStatus('审阅失败：' + (err && err.message || err));
    });
  }

  function onGenerate() {
    if (ui.running) return;
    var request = (ui.els.req.value || '').trim();
    if (!request) { setStatus('请先输入需求'); return; }
    if (!AA || typeof AA.runAuthoringLoop !== 'function') { setStatus('agent 核心未加载'); return; }
    resetResults();
    ui.running = true;
    ui.els.go.disabled = true;
    var planOnly = !!ui.planMode;   // 计划模式：先出计划，批准再执行
    setStatus(planOnly ? '正在规划…（agent 先只读、出计划）' : '正在生成…（agent 多轮编辑+自校验，可能需要数十秒）');
    // 维度1 · 对话式追问：上一轮草稿/线程还在(没应用也没放弃)→接着改；计划模式总从当前剧本起新计划
    var continuing = !planOnly && !!(ui.draft && ui.conversation && ui.conversation.length && !ui._pendingPlan);
    if (!continuing) { ui.draft = AA.makeDraft(ui.adapter.getScenario()); if (!planOnly) ui.conversation = null; }

    AA.runAuthoringLoop(ui.draft, request, {
      planOnly: planOnly,
      priorConversation: continuing ? ui.conversation : null,
      editorContext: _editorContext(),
      onStep: function(step) { appendLog(step); setStatus('第 ' + step.iteration + ' 轮…'); },
      onText: function(text, iter) { appendText(text, iter); }
    }).then(function(res) {
      ui.running = false;
      ui.els.go.disabled = false;
      ui.conversation = res.conversation;   // 维度1 · 存住线程
      ui.els.req.value = '';
      var stopMap = { finish: '完成', maxIterations: '达迭代上限', tokenBudget: '达 token 上限', finishBlocked: '校验未过·已停', noToolCalls: 'agent 未再操作', aborted: '已停止', planned: '已出计划' };
      if (res.plan) {                       // 计划模式：展示计划 + 批准/重规划
        renderPlan(res.plan);
        ui.els.actions.style.display = '';
        ui.els.apply.className = 'plan-approve';
        ui.els.apply.textContent = '批准并执行';
        ui.els.discard.textContent = '放弃计划';
        ui._pendingPlan = true;
        setStatus('已出计划（' + res.iterations + ' 轮）· 批准则按计划执行，或改需求重新规划');
      } else {                              // 普通：diff + 应用
        ui._pendingPlan = false;
        ui.els.discard.textContent = '放弃';
        setStatus('结束（' + (stopMap[res.stopReason] || res.stopReason) + '·' + res.iterations + ' 轮·约 ' + res.tokensUsed + ' tokens）· 可继续追加需求，或应用/放弃');
        renderSummary(res.summary, res.notes, res.suggestedConventions);
        renderDiff(AA.computeDiff(ui.adapter.getScenario(), ui.draft));
        renderValidation(res.finalValidation);
        ui.els.actions.style.display = '';
        ui.els.apply.className = res.finalValidation.ok ? '' : 'warn';
        ui.els.apply.textContent = res.finalValidation.ok ? '应用到剧本' : '仍有问题·确认应用';
      }
    }).catch(function(err) {
      ui.running = false;
      ui.els.go.disabled = false;
      setStatus('失败：' + (err && err.message || err));
    });
  }

  // 逐项纳入 · 读 diff 分组勾选状态（无分组返回 null=整份应用）
  function _selectedDiffFields() {
    if (!ui.els || !ui.els.diff) return null;
    var cbs = ui.els.diff.querySelectorAll('input[data-diff-field]');
    if (!cbs.length) return null;
    var sel = {};
    Array.prototype.forEach.call(cbs, function(cb) { sel[cb.getAttribute('data-diff-field')] = cb.checked; });
    return sel;
  }
  // 逐项纳入 · 从当前剧本起，把勾中的顶层字段整块换成草稿值（整块拷贝，避免数组索引漂移）
  function _applyScenario() {
    var sel = _selectedDiffFields();
    if (!sel) return ui.draft;   // 无分组勾选 → 整份草稿
    var cur = _clone(ui.adapter.getScenario());
    Object.keys(sel).forEach(function(field) {
      if (!sel[field]) return;   // 未勾 → 保留当前剧本的该字段
      if (field in ui.draft) cur[field] = _clone(ui.draft[field]); else delete cur[field];
    });
    return cur;
  }

  function onApply() {
    if (ui._pendingPlan) { ui._pendingPlan = false; executePlan(); return; }   // 计划模式：批准 → 执行
    if (!ui.draft) return;
    try {
      var sel = _selectedDiffFields();
      if (sel && !Object.keys(sel).some(function(f) { return sel[f]; })) { setStatus('未勾选任何字段，未应用'); return; }
      _pushCheckpoint('应用前 ' + _ckptTime());   // 方向G · 应用前自动存检查点（可多级回溯）
      ui.adapter.commit(_applyScenario());
      var partial = sel && Object.keys(sel).some(function(f) { return !sel[f]; });
      setStatus('已应用到剧本 ✓' + (partial ? '（仅所选字段）' : '') + '（可撤销）');
      ui.els.actions.style.display = 'none';
      ui.draft = null;
      ui.conversation = null;   // 维度1 · 应用后结束会话，下次从新剧本起
    } catch (e) {
      setStatus('应用失败：' + (e && e.message || e));
    }
  }

  function onDiscard() {
    ui.draft = null;
    ui.conversation = null;   // 维度1 · 放弃后结束会话
    ui._pendingPlan = false;
    if (ui.els && ui.els.discard) ui.els.discard.textContent = '放弃';
    resetResults();
    setStatus('已放弃本次改动');
  }

  // 方向G · 检查点栈：把"应用前快照"升级为可命名、多级回溯的检查点（session 内存态·不持久，避免大剧本撑爆 localStorage）。
  function _ckptTime() { try { var d = new Date(); function p(n) { return (n < 10 ? '0' : '') + n; } return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); } catch (e) { return ''; } }
  function _pushCheckpoint(label) {
    if (!ui.adapter || typeof ui.adapter.getScenario !== 'function') return null;
    var cp = { id: ++ui._ckptSeq, label: label || '检查点', when: _ckptTime(), snapshot: _clone(ui.adapter.getScenario()) };
    ui._checkpoints.push(cp);
    if (ui._checkpoints.length > MAX_CKPT) ui._checkpoints.shift();   // 淘汰最旧
    if (typeof ui._onCheckpointsChange === 'function') { try { ui._onCheckpointsChange(); } catch (e) {} }
    return cp;
  }
  // 撤销 = 弹出并恢复最近的检查点（回到上次应用/回退前）
  function undoLastApply() {
    if (!ui._checkpoints.length) { setStatus('无可撤销的检查点'); return false; }
    try {
      var cp = ui._checkpoints.pop();
      ui.adapter.commit(cp.snapshot);
      ui.draft = null; ui.conversation = null;
      if (typeof ui._onCheckpointsChange === 'function') { try { ui._onCheckpointsChange(); } catch (e) {} }
      setStatus('已撤销，回到「' + cp.label + '」(' + cp.when + ') ↩');
      return true;
    } catch (e) { setStatus('撤销失败：' + (e && e.message || e)); return false; }
  }
  // 手动存检查点（命名存档点）
  function manualCheckpoint(label) {
    var cp = _pushCheckpoint(label || ('手动存档 ' + _ckptTime()));
    if (cp) setStatus('已存检查点「' + cp.label + '」(' + cp.when + ')');
    return cp;
  }
  // 回到指定检查点（先把当前状态存一个"回退前"·使回退本身可再撤销）
  function restoreCheckpoint(id) {
    var cp = null;
    for (var i = 0; i < ui._checkpoints.length; i++) { if (ui._checkpoints[i].id === id) { cp = ui._checkpoints[i]; break; } }
    if (!cp) { setStatus('找不到该检查点'); return false; }
    try {
      _pushCheckpoint('回退前 ' + _ckptTime());
      ui.adapter.commit(_clone(cp.snapshot));
      ui.draft = null; ui.conversation = null;
      setStatus('已回到检查点「' + cp.label + '」(' + cp.when + ')');
      return true;
    } catch (e) { setStatus('回退失败：' + (e && e.message || e)); return false; }
  }
  // 列出检查点元数据（新→旧·供 UI 渲染）
  function listCheckpoints() {
    return ui._checkpoints.slice().reverse().map(function(c) { return { id: c.id, label: c.label, when: c.when }; });
  }

  function mountLauncher() {
    if (document.getElementById('tm-aa-fab')) return;
    var fab = document.createElement('button');
    fab.id = 'tm-aa-fab';
    fab.textContent = 'AI 剧本助手';
    fab.addEventListener('click', function() {
      var p = ensurePanel();
      p.classList.toggle('open');
    });
    document.body.appendChild(fab);
  }

  function init() {
    if (!AA || typeof AA.detectAdapter !== 'function') {
      console.warn('[authoring-ui] TM.AuthoringAgent 未加载，跳过');
      return;
    }
    var adapter = AA.detectAdapter(global);
    if (!adapter) return; // 非剧本编辑器页面
    ui.adapter = adapter;
    injectStyles();
    mountLauncher();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 暴露给测试/调试
  global.TM_AuthoringAgentUI = { init: init, _ui: ui, undo: undoLastApply, review: runReview, checkpoint: manualCheckpoint, checkpoints: listCheckpoints, restore: restoreCheckpoint };
})(typeof window !== 'undefined' ? window : this);
