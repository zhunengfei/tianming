// Dev-only screenshot: 只截国师面板本体（放大看清 chat-first 版式）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', String(e)));
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM_AuthoringAgentUI && document.getElementById('tm-aa-panel'), { timeout: 15000 });
  await page.evaluate(() => {
    const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open');
    document.body.classList.add('je-guoshi-docked');
  });
  await page.waitForTimeout(600);
  const panel = page.locator('#tm-aa-panel');
  await panel.screenshot({ path: 'dev-tools/_shot-panel-empty.png' });
  console.log('panel empty saved');

  // 跑一轮
  await page.evaluate(() => { const r = document.getElementById('tm-aa-req'); r.value = '把第一个势力改个更威风的名字'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => {
    var a = document.querySelector('#tm-aa-actions');
    var s = document.querySelector('#tm-aa-summary');
    return (a && a.style.display !== 'none') || (s && s.textContent.length > 40 && !s.querySelector('.tm-aa-caret'));
  }, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(700);
  await panel.screenshot({ path: 'dev-tools/_shot-panel-run.png' });
  console.log('panel run saved');

  // 点 + 模式 菜单展开看一眼
  const plus = page.locator('.je-aa-plus');
  if (await plus.count()) { await plus.first().click().catch(()=>{}); await page.waitForTimeout(300); await panel.screenshot({ path: 'dev-tools/_shot-panel-modes.png' }); console.log('panel modes saved'); }

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('SHOT ERROR', e); process.exit(2); });
