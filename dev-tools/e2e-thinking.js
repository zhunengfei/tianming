// Dev-only e2e: UI·Z 思考过程折叠块 — agent 多段推理收拢进默认收起的 <details>·标题「💭 推理 N 步」·点开看全(走 mock)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8782/preview/scenario-editor-reset-preview.html';
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

  await page.locator('#tm-aa-req').fill('补齐缺失字段');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => document.querySelector('#tm-aa-loglist .tm-aa-think'), { timeout: 20000 });
  await page.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; }, { timeout: 20000 });

  const collapsed = await page.evaluate(() => {
    var blk = document.querySelector('#tm-aa-loglist .tm-aa-think');
    var body = blk.querySelector('.tm-aa-think-body');
    return {
      blocks: document.querySelectorAll('#tm-aa-loglist .tm-aa-think').length,
      open: blk.open,
      label: blk.querySelector('.tk-label').textContent,
      bodyHeightCollapsed: body.offsetHeight,
      lineCount: blk.querySelectorAll('.tk-line').length,
      flatThoughtLines: [...document.querySelectorAll('#tm-aa-loglist > .ln')].filter(function (l) { return /💭/.test(l.textContent); }).length,
    };
  });

  // 点开 → 推理可见
  await page.evaluate(() => { document.querySelector('#tm-aa-loglist .tm-aa-think').open = true; });
  await page.waitForTimeout(80);
  const expanded = await page.evaluate(() => {
    var blk = document.querySelector('#tm-aa-loglist .tm-aa-think');
    var body = blk.querySelector('.tm-aa-think-body');
    return { bodyVisible: body.offsetParent !== null, text: body.textContent };
  });

  await browser.close();

  const checks = {
    single_think_block: collapsed.blocks === 1,
    collapsed_by_default: collapsed.open === false,
    body_hidden_when_collapsed: collapsed.bodyHeightCollapsed === 0,
    label_shows_step_count: /推理 \d+ 步/.test(collapsed.label),
    accumulates_reasoning: collapsed.lineCount >= 1,
    no_flat_thought_lines: collapsed.flatThoughtLines === 0,   // 不再平铺 💭 行
    expands_to_show: expanded.bodyVisible === true && expanded.text.length > 0,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, collapsed, expanded: { bodyVisible: expanded.bodyVisible, head: expanded.text.slice(0, 30) }, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
