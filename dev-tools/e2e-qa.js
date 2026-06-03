// Dev-only e2e: 方向L 剧本问答（只读）— 💬问答：提问→agent查证→回答·剧本零改动（走 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8773/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const U = window.TM_AuthoringAgentUI;
    return U && U.qa && document.querySelector('.je-aa-qa') && window.TM_SCENARIO_EDITOR_RESET_APP;
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); });

  const before = await page.evaluate(() => JSON.stringify(window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario).length);

  const req = page.locator('#tm-aa-req');
  await req.click(); await req.fill('这剧本有几个东林党人物？');
  await page.locator('.je-aa-qa').click();

  await page.waitForFunction(() => {
    var s = document.querySelector('#tm-aa-summary');
    return s && s.style.display !== 'none' && /问：/.test(s.textContent);
  }, { timeout: 20000 });
  // UI·P 后回答会流式逐字揭显——等打字机收尾（光标消失）再读全文
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && !s.querySelector('.tm-aa-caret') && /回答完成|未得到/.test((document.querySelector('#tm-aa-status') || {}).textContent || ''); }, { timeout: 20000 });
  const r = await page.evaluate(() => {
    var s = document.querySelector('#tm-aa-summary');
    return {
      summaryText: s.textContent,
      hasQuestion: /问：这剧本有几个东林党/.test(s.textContent),
      hasAnswer: /东林党人物（mock 回答）/.test(s.textContent),
      actionsHidden: (function () { var a = document.querySelector('#tm-aa-actions'); return !a || a.style.display === 'none'; })(),
      status: document.querySelector('#tm-aa-status').textContent,
      reqCleared: (document.getElementById('tm-aa-req').value || '') === ''
    };
  });
  const after = await page.evaluate(() => JSON.stringify(window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario).length);

  await browser.close();

  const checks = {
    answer_summary_shown: r.hasQuestion && r.hasAnswer,
    no_apply_actions: r.actionsHidden,
    scenario_unchanged: before === after,
    status_done: /回答完成/.test(r.status),
    req_cleared: r.reqCleared,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, r, before, after, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
