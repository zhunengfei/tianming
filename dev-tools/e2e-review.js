// Dev-only e2e: 方向D 审阅模式 — 🔍审阅按钮 + /审阅命令 → 只读体检报告（草稿不变）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8764/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); } catch (e) {}
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => {
    const U = window.TM_AuthoringAgentUI;
    return U && U.review && document.querySelector('.je-aa-review') && window.TM_SCENARIO_EDITOR_RESET_APP;
  }, { timeout: 15000 });
  await page.evaluate(() => {
    const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open');
    document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open');
  });

  // 记录审阅前剧本指纹（验证只读不改）
  const before = await page.evaluate(() => JSON.stringify(window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario).length + '|' + (window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario.name || ''));

  // 点 🔍审阅 按钮
  await page.locator('.je-aa-review').click();
  await page.waitForFunction(() => {
    const d = document.querySelector('#tm-aa-difflist');
    return d && d.querySelector('.tm-aa-finding');
  }, { timeout: 15000 });
  const report = await page.evaluate(() => {
    const sum = document.querySelector('#tm-aa-summary');
    const findings = [...document.querySelectorAll('.tm-aa-finding')];
    return {
      summaryShown: sum && sum.style.display !== 'none' && /审阅报告/.test(sum.textContent),
      summaryText: sum ? sum.textContent : '',
      count: findings.length,
      firstHasSeverity: findings[0] ? /\[(高|中|低)\]/.test(findings[0].textContent) : false,
      firstText: findings[0] ? findings[0].textContent : '',
      // 高严重度应排在前（sev.rm = 高）
      firstIsHigh: findings[0] ? !!findings[0].querySelector('.sev.rm') : false,
      noApplyShown: (function () { var a = document.querySelector('#tm-aa-actions'); return !a || a.style.display === 'none'; })()
    };
  });
  const after = await page.evaluate(() => JSON.stringify(window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario).length + '|' + (window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario.name || ''));

  // /审阅 slash 命令也触发（先清掉报告 → 输入 /审阅 → Enter）
  await page.evaluate(() => { document.querySelector('#tm-aa-difflist').innerHTML = ''; });
  const reqL = page.locator('#tm-aa-req');
  await reqL.click(); await reqL.fill(''); await reqL.type('/审阅', { delay: 20 });
  await reqL.press('Enter');
  const slashTriggered = await page.waitForFunction(() => {
    const d = document.querySelector('#tm-aa-difflist');
    return d && d.querySelector('.tm-aa-finding');
  }, { timeout: 15000 }).then(() => true).catch(() => false);

  await browser.close();

  const checks = {
    summary_shown: report.summaryShown,
    findings_rendered: report.count === 2,
    severity_tag_shown: report.firstHasSeverity,
    sorted_high_first: report.firstIsHigh,
    no_apply_button: report.noApplyShown,
    scenario_unchanged: before === after,
    slash_review_triggers: slashTriggered,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, report, before, after, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
