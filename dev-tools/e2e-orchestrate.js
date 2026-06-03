// Dev-only e2e: 方向H 子代理/任务分解 — 🧩分解执行：decompose→多子任务→共享草稿合并→diff（走 mock 中转）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8769/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); } catch (e) {}
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const U = window.TM_AuthoringAgentUI, AA = window.TM && window.TM.AuthoringAgent;
    return U && U.orchestrate && AA && AA.runOrchestrated && document.querySelector('.je-aa-orch');
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); });

  // 输入大需求 → 点 🧩 分解执行
  const req = page.locator('#tm-aa-req');
  await req.click(); await req.fill('建一整个新势力：含若干人物与开场设定');
  await page.locator('.je-aa-orch').click();

  // 等编排完成（出现 diff actions 或状态含"分解执行完成"）
  await page.waitForFunction(() => {
    var st = document.querySelector('#tm-aa-status');
    return st && /分解执行完成|执行完成/.test(st.textContent);
  }, { timeout: 30000 });

  // UI·P 流式：等总览打字机收尾再读
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && !s.querySelector('.tm-aa-caret'); }, { timeout: 20000 }).catch(() => {});
  const r = await page.evaluate(() => {
    // UI·D 后分解进度走 .tm-aa-checklist（取代旧的 log 文本）
    var cl = document.querySelector('#tm-aa-loglist .tm-aa-checklist');
    var diff = document.querySelector('#tm-aa-difflist');
    var summary = document.querySelector('#tm-aa-summary');
    return {
      checklistHead: cl ? cl.querySelector('.cl-head').textContent : '',
      checklistItems: cl ? cl.querySelectorAll('.cl-item').length : 0,
      allDone: cl ? [].slice.call(cl.querySelectorAll('.cl-item')).every(function (i) { return i.classList.contains('done'); }) : false,
      summaryText: summary ? summary.textContent : '',
      diffGroups: diff ? diff.querySelectorAll('.tm-aa-diff-group').length : 0,
      actionsShown: (function () { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; })(),
      status: document.querySelector('#tm-aa-status').textContent
    };
  });

  await browser.close();

  const checks = {
    decompose_shown: /分解为 \d+ 个子任务|已完成/.test(r.checklistHead) && r.checklistItems >= 2,
    subtasks_done: r.allDone === true && r.checklistItems >= 2,
    summary_shown: r.summaryText.length > 0,
    diff_rendered: r.diffGroups >= 1,
    actions_apply_shown: r.actionsShown,
    status_done: /分解执行完成|执行完成/.test(r.status),
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, r: { checklistHead: r.checklistHead, checklistItems: r.checklistItems, allDone: r.allDone, summaryText: r.summaryText.slice(0, 40), diffGroups: r.diffGroups, status: r.status }, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
