// Dev-only e2e: 方向N 解释/教学 — 📖讲解：通读→按主题讲解·剧本零改动·/讲解·⌘K（走 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8783/preview/scenario-editor-reset-preview.html';
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
    return U && U.explain && document.querySelector('.je-aa-explain') && window.TM_SCENARIO_EDITOR_RESET_APP;
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); });

  const before = await page.evaluate(() => JSON.stringify(window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario).length);

  // 点 📖 讲解
  await page.locator('.je-aa-explain').click();
  await page.waitForFunction(() => {
    var s = document.querySelector('#tm-aa-summary');
    return s && s.style.display !== 'none' && /剧本讲解/.test(s.textContent) && document.querySelectorAll('#tm-aa-difflist .tm-aa-finding').length > 0;
  }, { timeout: 20000 });
  // UI·P 后讲解总览流式逐字——等打字机收尾（光标消失）再读全文
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && !s.querySelector('.tm-aa-caret') && /讲解完成|未生成/.test((document.querySelector('#tm-aa-status') || {}).textContent || ''); }, { timeout: 20000 });
  const r = await page.evaluate(() => ({
    summary: document.querySelector('#tm-aa-summary').textContent,
    topics: document.querySelectorAll('#tm-aa-difflist .tm-aa-finding').length,
    firstTopic: document.querySelector('#tm-aa-difflist .tm-aa-finding') ? document.querySelector('#tm-aa-difflist .tm-aa-finding').textContent : '',
    actionsHidden: (function () { var a = document.querySelector('#tm-aa-actions'); return !a || a.style.display === 'none'; })(),
    status: document.querySelector('#tm-aa-status').textContent
  }));
  const after = await page.evaluate(() => JSON.stringify(window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario).length);

  // ⌘K 有「讲解剧本」
  await page.keyboard.press('Control+k');
  await page.locator('.je-cmdk input').fill('讲解');
  const cmdkHasExplain = await page.evaluate(() => [...document.querySelectorAll('.je-cmdk-item')].some(function (el) { return /讲解剧本/.test(el.textContent); }));
  await page.keyboard.press('Escape');

  // /讲解 slash 命令
  await page.evaluate(() => { document.querySelector('#tm-aa-difflist').innerHTML = ''; document.querySelector('#tm-aa-summary').style.display = 'none'; });
  const req = page.locator('#tm-aa-req');
  await req.click(); await req.fill(''); await req.type('/讲解', { delay: 20 });
  await req.press('Enter');
  const slashWorks = await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && s.style.display !== 'none' && /剧本讲解/.test(s.textContent); }, { timeout: 20000 }).then(() => true).catch(() => false);

  await browser.close();

  const checks = {
    explain_summary_shown: /剧本讲解/.test(r.summary) && /死局|mock/.test(r.summary),
    topics_rendered: r.topics === 2,
    first_topic_has_content: /玩家处境/.test(r.firstTopic),
    no_apply_actions: r.actionsHidden,
    scenario_unchanged: before === after,
    status_done: /讲解完成/.test(r.status),
    cmdk_has_explain: cmdkHasExplain === true,
    slash_explain_works: slashWorks === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, r, before, after, cmdkHasExplain, slashWorks, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
