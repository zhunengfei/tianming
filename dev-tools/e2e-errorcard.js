// Dev-only e2e: UI·AC 错误态卡片+一键重试 — 运行失败渲醒目错误卡(分类提示+重试+复制)·点重试可恢复(走 mock·[FAIL] 首次 401)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8779/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => { try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM && window.TM.AuthoringAgent.runAuthoringLoop && document.getElementById('tm-aa-go'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  // [FAIL] → 首次 401 → 错误卡
  await page.locator('#tm-aa-req').fill('[FAIL] 改个名');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => document.querySelector('#tm-aa-summary .tm-aa-errcard'), { timeout: 20000 });
  const card = await page.evaluate(() => {
    var c = document.querySelector('#tm-aa-summary .tm-aa-errcard');
    return {
      head: c.querySelector('.ec-head') ? c.querySelector('.ec-head').textContent : '',
      msg: c.querySelector('.ec-msg') ? c.querySelector('.ec-msg').textContent : '',
      hasRetry: !!c.querySelector('.ec-retry'),
      hasCopy: !!c.querySelector('.ec-copy'),
      actionsHidden: (function () { var a = document.querySelector('#tm-aa-actions'); return !a || a.style.display === 'none'; })(),
      goRestored: document.getElementById('tm-aa-go').textContent === '生成',
      status: document.querySelector('#tm-aa-status').textContent,
    };
  });

  // 复制错误 → 剪贴板拿到分类提示
  await page.evaluate(() => document.querySelector('#tm-aa-summary .ec-copy').click());
  await page.waitForTimeout(120);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));

  // 点重试 → 重跑（[FAIL] 这次放行）→ 成功（错误卡消失·diff+应用出现）
  await page.evaluate(() => document.querySelector('#tm-aa-summary .ec-retry').click());
  await page.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none' && !document.querySelector('#tm-aa-summary .tm-aa-errcard'); }, { timeout: 20000 });
  const recovered = await page.evaluate(() => ({
    errCardGone: !document.querySelector('#tm-aa-summary .tm-aa-errcard'),
    actionsShown: (function () { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; })(),
    hasDiff: document.querySelectorAll('#tm-aa-difflist .tm-aa-hunk').length >= 1,
  }));

  await browser.close();

  const checks = {
    error_card_shown: /运行失败/.test(card.head) && card.hasRetry && card.hasCopy,
    classified_message: /401|无效|无权限/.test(card.msg),
    actions_hidden_on_error: card.actionsHidden === true,
    go_button_restored: card.goRestored === true,
    copy_error_to_clipboard: /401|无效|无权限/.test(clip),
    retry_recovers: recovered.errCardGone === true && recovered.actionsShown === true && recovered.hasDiff === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, card, clip, recovered, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
