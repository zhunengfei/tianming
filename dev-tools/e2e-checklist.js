// Dev-only e2e: UI·D 步骤清单+实时勾 — 分解执行渲染清单·完成后全部✓（走 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8789/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => { const U = window.TM_AuthoringAgentUI; return U && U.orchestrate && document.querySelector('.je-aa-orch'); }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); });

  await page.locator('#tm-aa-req').fill('建一整个新势力：含若干人物与开场设定');
  await page.locator('.je-aa-orch').click();

  // 清单出现（分解为 N 个子任务）
  await page.waitForFunction(() => { var c = document.querySelector('.tm-aa-checklist'); return c && c.querySelectorAll('.cl-item').length >= 1; }, { timeout: 20000 });
  const appeared = await page.evaluate(() => {
    var c = document.querySelector('.tm-aa-checklist');
    return { items: c.querySelectorAll('.cl-item').length, headHasCount: /分解为 \d+ 个子任务/.test(c.querySelector('.cl-head').textContent) };
  });

  // 等执行完成 → 全部 done(✓)
  await page.waitForFunction(() => { var st = document.querySelector('#tm-aa-status'); return st && /分解执行完成|执行完成/.test(st.textContent); }, { timeout: 30000 });
  await page.waitForTimeout(150);
  const done = await page.evaluate(() => {
    var c = document.querySelector('.tm-aa-checklist');
    var items = [...c.querySelectorAll('.cl-item')];
    return {
      allDone: items.length > 0 && items.every(function (it) { return it.classList.contains('done'); }),
      allCheck: items.every(function (it) { return /✓/.test(it.querySelector('.cl-ic').textContent); }),
      headDone: /已完成/.test(c.querySelector('.cl-head').textContent),
      itemCount: items.length
    };
  });

  await browser.close();

  const checks = {
    checklist_appeared: appeared.items >= 2 && appeared.headHasCount,
    all_done_on_finish: done.allDone === true,
    all_checkmarks: done.allCheck === true,
    head_shows_done: done.headDone === true,
    item_count_ge2: done.itemCount >= 2,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, appeared, done, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
