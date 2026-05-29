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
  var ui = { adapter: null, draft: null, running: false, els: null };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    ui.els.val.style.display = 'none';
    ui.els.actions.style.display = 'none';
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

  function appendLog(step) {
    if (!ui.els) return;
    ui.els.logSec.style.display = ''; ui.els.log.style.display = '';
    var r = step.result || {};
    var cls = (step.name === 'finish' && r.ok) ? 'fin' : (r.ok ? 'ln' : 'bad');
    var detail = r.ok ? '' : (' — ' + esc(r.reason || ''));
    if (r.violations && r.violations.length) detail += ' [' + esc(r.violations.slice(0, 3).join('; ')) + ']';
    var line = document.createElement('div');
    line.className = cls;
    line.innerHTML = '#' + step.iteration + ' ' + esc(step.name) + '(' + esc(JSON.stringify(step.input || {}).slice(0, 80)) + ')' + detail;
    ui.els.log.appendChild(line);
    ui.els.log.scrollTop = ui.els.log.scrollHeight;
  }

  function renderDiff(diffs) {
    if (!ui.els) return;
    ui.els.diffSec.style.display = ''; ui.els.diff.style.display = '';
    if (!diffs.length) { ui.els.diff.innerHTML = '<div class="ln" style="color:#8b90a8">（无改动）</div>'; return; }
    var rows = diffs.slice(0, 200).map(function(d) {
      if (d.type === 'added') return '<div class="add">+ ' + esc(d.path) + ' = ' + esc(JSON.stringify(d.after).slice(0, 80)) + '</div>';
      if (d.type === 'removed') return '<div class="rm">− ' + esc(d.path) + '</div>';
      return '<div class="ch">~ ' + esc(d.path) + ': ' + esc(JSON.stringify(d.before).slice(0, 40)) + ' → ' + esc(JSON.stringify(d.after).slice(0, 60)) + '</div>';
    });
    if (diffs.length > 200) rows.push('<div class="ln">… 还有 ' + (diffs.length - 200) + ' 处</div>');
    ui.els.diff.innerHTML = rows.join('');
  }

  function renderValidation(report) {
    if (!ui.els) return;
    var v = ui.els.val;
    v.style.display = '';
    if (report.ok) { v.className = 'tm-aa-val ok'; v.textContent = '✓ 校验通过'; return; }
    v.className = 'tm-aa-val bad';
    v.textContent = '⚠ 仍有 ' + report.violations.length + ' 项校验问题：' + report.violations.slice(0, 4).join('；');
  }

  function onGenerate() {
    if (ui.running) return;
    var request = (ui.els.req.value || '').trim();
    if (!request) { setStatus('请先输入需求'); return; }
    if (!AA || typeof AA.runAuthoringLoop !== 'function') { setStatus('agent 核心未加载'); return; }
    resetResults();
    ui.running = true;
    ui.els.go.disabled = true;
    setStatus('正在生成…（agent 多轮编辑+自校验，可能需要数十秒）');
    var current = ui.adapter.getScenario();
    ui.draft = AA.makeDraft(current);

    AA.runAuthoringLoop(ui.draft, request, {
      onStep: function(step) { appendLog(step); setStatus('第 ' + step.iteration + ' 轮…'); },
      onText: function(text, iter) { appendText(text, iter); }
    }).then(function(res) {
      ui.running = false;
      ui.els.go.disabled = false;
      var stopMap = { finish: '完成', maxIterations: '达迭代上限', tokenBudget: '达 token 上限', finishBlocked: '校验未过·已停', noToolCalls: 'agent 未再操作' };
      setStatus('结束（' + (stopMap[res.stopReason] || res.stopReason) + '·' + res.iterations + ' 轮·约 ' + res.tokensUsed + ' tokens）');
      renderDiff(AA.computeDiff(ui.adapter.getScenario(), ui.draft));
      renderValidation(res.finalValidation);
      ui.els.actions.style.display = '';
      ui.els.apply.className = res.finalValidation.ok ? '' : 'warn';
      ui.els.apply.textContent = res.finalValidation.ok ? '应用到剧本' : '仍有问题·确认应用';
    }).catch(function(err) {
      ui.running = false;
      ui.els.go.disabled = false;
      setStatus('失败：' + (err && err.message || err));
    });
  }

  function onApply() {
    if (!ui.draft) return;
    try {
      ui.adapter.commit(ui.draft);
      setStatus('已应用到剧本 ✓');
      ui.els.actions.style.display = 'none';
      ui.draft = null;
    } catch (e) {
      setStatus('应用失败：' + (e && e.message || e));
    }
  }

  function onDiscard() {
    ui.draft = null;
    resetResults();
    setStatus('已放弃本次改动');
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
  global.TM_AuthoringAgentUI = { init: init, _ui: ui };
})(typeof window !== 'undefined' ? window : this);
