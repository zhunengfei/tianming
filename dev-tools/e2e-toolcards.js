// Dev-only e2e: UI·C 工具调用折叠卡片 — 每步 <details> 卡·收起摘要/点开 input-output（走 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8788/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => window.TM && window.TM.AuthoringAgent.runAuthoringLoop && document.getElementById('tm-aa-go'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  const req = page.locator('#tm-aa-req');
  await req.click(); await req.fill('改个名并补一个');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => document.querySelectorAll('#tm-aa-loglist .tm-aa-step').length >= 1, { timeout: 20000 });

  const cards = await page.evaluate(() => {
    var steps = [...document.querySelectorAll('#tm-aa-loglist .tm-aa-step')];
    var first = steps[0];
    return {
      count: steps.length,
      collapsedByDefault: steps.every(function (s) { return !s.open; }),
      firstHasSummary: !!first.querySelector('summary'),
      firstSummaryText: first.querySelector('summary') ? first.querySelector('summary').textContent : '',
      firstBodyHeightCollapsed: (function () { var b = first.querySelector('.tm-aa-step-body'); return b ? b.offsetHeight : -1; })()
    };
  });

  // 点开第一张卡 → body 显示 input/result
  await page.evaluate(() => { var s = document.querySelector('#tm-aa-loglist .tm-aa-step'); if (s) s.open = true; });
  await page.waitForTimeout(80);
  const expanded = await page.evaluate(() => {
    var s = document.querySelector('#tm-aa-loglist .tm-aa-step');
    var body = s.querySelector('.tm-aa-step-body');
    var pres = s.querySelectorAll('.tm-aa-step-body pre');
    return {
      bodyVisible: body && body.offsetParent !== null,
      hasInputOrResult: pres.length >= 1,
      preText: pres.length ? pres[0].textContent : ''
    };
  });

  await browser.close();

  const checks = {
    cards_rendered: cards.count >= 2,
    collapsed_by_default: cards.collapsedByDefault === true,
    summary_present: cards.firstHasSummary && /#\d/.test(cards.firstSummaryText),
    body_hidden_when_collapsed: cards.firstBodyHeightCollapsed === 0,
    expands_on_open: expanded.bodyVisible === true,
    shows_input_output: expanded.hasInputOrResult && expanded.preText.length > 0,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, cards, expanded, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
