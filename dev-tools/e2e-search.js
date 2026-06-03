// Dev-only e2e: UI·AJ 过程区内搜索(⌘F) — 面板内焦点按 ⌘F 开搜索条·高亮匹配·Enter 下一个·Esc 关清高亮(走 mock·qa)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8771/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => window.TM_AuthoringAgentUI && window.TM_AuthoringAgentUI.qa && document.getElementById('tm-aa-search'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  await page.locator('#tm-aa-req').fill('东林党都有谁？');
  await page.evaluate(() => window.TM_AuthoringAgentUI.qa());
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && s.style.display !== 'none' && !s.querySelector('.tm-aa-caret') && /回答完成|未得到/.test((document.querySelector('#tm-aa-status') || {}).textContent || ''); }, { timeout: 20000 });

  const hiddenBefore = await page.evaluate(() => document.getElementById('tm-aa-search').hidden);

  // 焦点在面板内 → ⌘F 开搜索条
  await page.locator('#tm-aa-req').click();
  await page.keyboard.press('Control+f');
  await page.waitForTimeout(60);
  const opened = await page.evaluate(() => ({ visible: !document.getElementById('tm-aa-search').hidden, focused: document.activeElement && document.activeElement.id === 'tm-aa-search-in' }));

  // 查「东林」→ 高亮
  await page.locator('#tm-aa-search-in').fill('东林');
  await page.waitForTimeout(80);
  const found = await page.evaluate(() => ({ marks: document.querySelectorAll('#tm-aa-body .tm-aa-hl').length, active: document.querySelectorAll('#tm-aa-body .tm-aa-hl.active').length, count: document.getElementById('tm-aa-search-n').textContent }));

  // Enter → 下一个（计数 1/N → 2/N，active 换位）
  const firstActiveIdx = await page.evaluate(() => { var ms = [...document.querySelectorAll('#tm-aa-body .tm-aa-hl')]; return ms.findIndex(function (m) { return m.classList.contains('active'); }); });
  await page.locator('#tm-aa-search-in').press('Enter');
  await page.waitForTimeout(60);
  const afterNext = await page.evaluate(() => { var ms = [...document.querySelectorAll('#tm-aa-body .tm-aa-hl')]; return { count: document.getElementById('tm-aa-search-n').textContent, activeIdx: ms.findIndex(function (m) { return m.classList.contains('active'); }) }; });

  // Esc → 关 + 清高亮
  await page.locator('#tm-aa-search-in').press('Escape');
  await page.waitForTimeout(60);
  const closed = await page.evaluate(() => ({ hidden: document.getElementById('tm-aa-search').hidden, marks: document.querySelectorAll('#tm-aa-body .tm-aa-hl').length }));

  await browser.close();

  const checks = {
    search_hidden_initially: hiddenBefore === true,
    cmdf_opens_focused: opened.visible === true && opened.focused === true,
    highlights_matches: found.marks >= 2 && found.active === 1 && /^1\/\d+$/.test(found.count),
    enter_moves_next: /^2\/\d+$/.test(afterNext.count) && afterNext.activeIdx !== firstActiveIdx && afterNext.activeIdx >= 0,
    esc_closes_and_clears: closed.hidden === true && closed.marks === 0,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, hiddenBefore, opened, found, firstActiveIdx, afterNext, closed, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
