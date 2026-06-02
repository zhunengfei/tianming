// Dev-only e2e: verify pre-run token estimate (estimateRun + UI line in 国师 dock)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8762/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => {
    const AA = window.TM && window.TM.AuthoringAgent;
    const req = document.getElementById('tm-aa-req');
    return AA && typeof AA.estimateRun === 'function' && req && req._jeMentionInit === true;
  }, { timeout: 15000 });

  // estimateRun returns sane numbers in-page (real baked scenario)
  const apiEst = await page.evaluate(() => {
    const AA = window.TM.AuthoringAgent;
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    const sc = app.state.scenario;
    const draft = AA.makeDraft(sc);
    const n = AA.estimateRun(draft, '把主角势力改名为西凉军并补两个文官');
    const p = AA.estimateRun(draft, '把主角势力改名为西凉军并补两个文官', { planOnly: true });
    return { n, p };
  });

  // open panel + dock so UI line is live
  await page.evaluate(() => {
    const pn = document.getElementById('tm-aa-panel'); if (pn) pn.classList.add('open');
    document.body.classList.add('je-guoshi-docked');
  });

  // type a request → estimate line appears
  const req = page.locator('#tm-aa-req');
  await req.click();
  await req.fill('给本剧本补齐缺失的必需字段，并新增三名东林党谏官');
  await req.dispatchEvent('input');
  await page.waitForFunction(() => {
    const e = document.querySelector('.je-aa-esttok');
    return e && !e.hidden && /tokens/.test(e.textContent);
  }, { timeout: 4000 });
  const lineNormal = await page.evaluate(() => document.querySelector('.je-aa-esttok').textContent);

  // toggle plan mode → line refreshes with 计划模式
  await page.evaluate(() => {
    const cb = document.querySelector('.je-aa-planmode input');
    if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
  });
  const linePlan = await page.evaluate(() => document.querySelector('.je-aa-esttok').textContent);

  // clear request → line hides
  await req.fill('');
  await req.dispatchEvent('input');
  await page.waitForTimeout(700);
  const hiddenWhenEmpty = await page.evaluate(() => { const e = document.querySelector('.je-aa-esttok'); return e ? e.hidden : null; });

  await browser.close();

  const checks = {
    apiNormal_sane: apiEst.n.perCallInput > 0 && apiEst.n.low <= apiEst.n.high && apiEst.n.high <= apiEst.n.maxTokens,
    apiPlan_cheaper: apiEst.p.high < apiEst.n.high,
    uiLine_shows_tokens: /tokens/.test(lineNormal) && /≈/.test(lineNormal),
    uiLine_has_estimate_note: /估算/.test(lineNormal),
    planMode_line_marked: /计划模式/.test(linePlan),
    hides_when_empty: hiddenWhenEmpty === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, apiEst, lineNormal, linePlan, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
