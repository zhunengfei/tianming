// Dev-only e2e: UI·AB 滚动跟随+回到底部 — 运行中贴底跟随·上翻暂停跟随并浮出「↓ 最新」·点它回底续跟(走 mock)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8780/preview/scenario-editor-reset-preview.html';
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

  await page.locator('#tm-aa-req').fill('改名并补齐势力');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; }, { timeout: 20000 });

  // 运行结束仍贴底跟随
  const afterRun = await page.evaluate(() => ({ pinned: window.TM_AuthoringAgentUI._ui._logPinned, fabHidden: document.getElementById('tm-aa-tobottom').hidden }));

  // 撑出溢出：展开所有工具卡 + 思考块
  await page.evaluate(() => {
    document.querySelectorAll('#tm-aa-loglist .tm-aa-step, #tm-aa-loglist .tm-aa-think').forEach(function (d) { d.open = true; });
    var el = document.getElementById('tm-aa-loglist'); el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(60);
  const atBottom = await page.evaluate(() => {
    var el = document.getElementById('tm-aa-loglist');
    return { overflow: el.scrollHeight > el.clientHeight + 4, fabHidden: document.getElementById('tm-aa-tobottom').hidden, pinned: window.TM_AuthoringAgentUI._ui._logPinned };
  });

  // 上翻 → 暂停跟随 + 浮出「↓ 最新」
  await page.evaluate(() => { var el = document.getElementById('tm-aa-loglist'); el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(60);
  const scrolledUp = await page.evaluate(() => ({ fabHidden: document.getElementById('tm-aa-tobottom').hidden, pinned: window.TM_AuthoringAgentUI._ui._logPinned, label: document.getElementById('tm-aa-tobottom').textContent }));

  // 点「↓ 最新」→ 回底 + 续跟 + FAB 隐
  await page.evaluate(() => document.getElementById('tm-aa-tobottom').click());
  await page.waitForTimeout(60);
  const clicked = await page.evaluate(() => {
    var el = document.getElementById('tm-aa-loglist');
    return { atBottom: (el.scrollHeight - el.scrollTop - el.clientHeight) < 24, fabHidden: document.getElementById('tm-aa-tobottom').hidden, pinned: window.TM_AuthoringAgentUI._ui._logPinned };
  });

  await browser.close();

  const checks = {
    auto_follow_after_run: afterRun.pinned === true && afterRun.fabHidden === true,
    overflow_and_pinned_at_bottom: atBottom.overflow === true && atBottom.fabHidden === true && atBottom.pinned === true,
    scroll_up_shows_fab: scrolledUp.fabHidden === false && scrolledUp.pinned === false && /最新/.test(scrolledUp.label),
    fab_click_returns_bottom: clicked.atBottom === true && clicked.fabHidden === true && clicked.pinned === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, afterRun, atBottom, scrolledUp, clicked, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
