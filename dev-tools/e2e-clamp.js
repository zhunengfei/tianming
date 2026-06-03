// Dev-only e2e: UI·AK 长内容折叠「显示更多」— 超长结果夹高+按钮展开/收起·短结果不夹(走 mock·[LONG] 长回答)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8770/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => window.TM_AuthoringAgentUI && window.TM_AuthoringAgentUI.qa && document.getElementById('tm-aa-go'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  // 负向：短的改动说明（generate）不夹
  await page.locator('#tm-aa-req').fill('改个名');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; }, { timeout: 20000 });
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && !s.querySelector('.tm-aa-caret'); }, { timeout: 20000 });
  await page.waitForTimeout(80);
  const shortCase = await page.evaluate(() => ({ clamped: document.getElementById('tm-aa-summary').classList.contains('tm-aa-clamped'), btn: !!document.querySelector('.tm-aa-clamp-btn') }));

  await page.locator('#tm-aa-discard').click();

  // 正向：超长回答（[LONG]）夹高 + 显示更多
  await page.locator('#tm-aa-req').fill('[LONG] 详细讲讲这个剧本');
  await page.evaluate(() => window.TM_AuthoringAgentUI.qa());
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && s.classList.contains('tm-aa-clamped'); }, { timeout: 20000 });
  await page.waitForTimeout(80);
  const clamped = await page.evaluate(() => {
    var s = document.getElementById('tm-aa-summary'), b = document.querySelector('.tm-aa-clamp-btn');
    return { clampedClass: s.classList.contains('tm-aa-clamped'), height: s.offsetHeight, scrollH: s.scrollHeight, btnText: b ? b.textContent : '', btnAfterSummary: !!(b && s.nextSibling === b) };
  });

  // 展开
  await page.locator('.tm-aa-clamp-btn').click();
  await page.waitForTimeout(60);
  const expanded = await page.evaluate(() => {
    var s = document.getElementById('tm-aa-summary'), b = document.querySelector('.tm-aa-clamp-btn');
    return { open: s.classList.contains('tm-aa-clamp-open'), height: s.offsetHeight, btnText: b ? b.textContent : '' };
  });

  // 收起
  await page.locator('.tm-aa-clamp-btn').click();
  await page.waitForTimeout(60);
  const recollapsed = await page.evaluate(() => {
    var s = document.getElementById('tm-aa-summary'), b = document.querySelector('.tm-aa-clamp-btn');
    return { open: s.classList.contains('tm-aa-clamp-open'), height: s.offsetHeight, btnText: b ? b.textContent : '' };
  });

  await browser.close();

  const checks = {
    short_not_clamped: shortCase.clamped === false && shortCase.btn === false,
    long_clamped: clamped.clampedClass === true && clamped.height <= 322 && clamped.scrollH > clamped.height + 40,
    btn_shows_more: /显示更多/.test(clamped.btnText) && clamped.btnAfterSummary === true,
    expands: expanded.open === true && expanded.height > clamped.height + 60 && /收起/.test(expanded.btnText),
    recollapses: recollapsed.open === false && recollapsed.height <= 322 && /显示更多/.test(recollapsed.btnText),
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, shortCase, clamped, expanded, recollapsed, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
