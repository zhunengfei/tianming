// Dev-only e2e: UI·AD 空状态欢迎+建议提示 — 空闲时显欢迎态+chips·fill chip 回填不自动跑·act chip 跑·有字/运行则隐(走 mock)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8778/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => window.TM && window.TM.AuthoringAgent.runAuthoringLoop && document.getElementById('tm-aa-go') && document.getElementById('tm-aa-empty'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  // 空闲 → 欢迎态可见 + 6 chips
  const initial = await page.evaluate(() => {
    var e = document.getElementById('tm-aa-empty');
    return { visible: e.style.display !== 'none', chips: e.querySelectorAll('.emp-chip').length, hasTitle: /国师在此/.test(e.textContent), labels: [...e.querySelectorAll('.emp-chip')].map(function (b) { return b.textContent; }) };
  });

  // 点「补齐字段」fill chip → 回填输入框·不自动跑·欢迎态隐
  await page.evaluate(() => { [...document.querySelectorAll('#tm-aa-empty .emp-chip')].find(function (b) { return /补齐/.test(b.textContent); }).click(); });
  await page.waitForTimeout(80);
  const afterFill = await page.evaluate(() => ({ reqVal: document.getElementById('tm-aa-req').value, emptyHidden: document.getElementById('tm-aa-empty').style.display === 'none', running: window.TM_AuthoringAgentUI._ui.running === true }));

  // 清空输入框 → 欢迎态重现
  await page.evaluate(() => { var r = document.getElementById('tm-aa-req'); r.value = ''; r.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(80);
  const afterClear = await page.evaluate(() => document.getElementById('tm-aa-empty').style.display !== 'none');

  // 点「体检」act chip → 跑 preflight（免 API）→ 出体检结果·欢迎态隐
  await page.evaluate(() => { [...document.querySelectorAll('#tm-aa-empty .emp-chip')].find(function (b) { return /体检/.test(b.textContent); }).click(); });
  await page.waitForFunction(() => { var s = document.getElementById('tm-aa-summary'); return s && s.style.display !== 'none' && /运行时体检/.test(s.textContent); }, { timeout: 10000 });
  const afterAct = await page.evaluate(() => ({ emptyHidden: document.getElementById('tm-aa-empty').style.display === 'none', summaryShown: /运行时体检/.test(document.getElementById('tm-aa-summary').textContent) }));

  await browser.close();

  const checks = {
    empty_visible_idle: initial.visible === true && initial.hasTitle === true,
    six_chips: initial.chips === 6 && initial.labels.some(function (l) { return /体检/.test(l); }) && initial.labels.some(function (l) { return /讲解/.test(l); }),
    fill_chip_refills_no_run: /listGaps/.test(afterFill.reqVal) && afterFill.emptyHidden === true && afterFill.running === false,
    clear_reshows_empty: afterClear === true,
    act_chip_runs: afterAct.summaryShown === true && afterAct.emptyHidden === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, initial, afterFill, afterClear, afterAct, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
