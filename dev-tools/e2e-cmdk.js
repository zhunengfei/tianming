// Dev-only e2e: 方向V 命令面板 ⌘K — 开/搜/键盘/执行/关（纯交互·无需 API）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8779/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window._jeCmdkOpen && document.querySelector('.je-cmdk-back') && window.TM_AuthoringAgentUI && window.TM_AuthoringAgentUI._ui, { timeout: 15000 });

  // Ctrl+K 开
  await page.keyboard.press('Control+k');
  const opened = await page.evaluate(() => !document.querySelector('.je-cmdk-back').hidden);

  // 搜「计划」→ 过滤
  await page.locator('.je-cmdk input').fill('计划');
  const filtered = await page.evaluate(() => {
    var items = [...document.querySelectorAll('.je-cmdk-item')];
    return { count: items.length, hasPlanToggle: items.some(function (el) { return /计划模式/.test(el.textContent); }) };
  });

  // 回车执行「切换 计划模式」→ planMode 翻转 + 面板关
  const planBefore = await page.evaluate(() => !!window.TM_AuthoringAgentUI._ui.planMode);
  await page.locator('.je-cmdk input').press('Enter');
  await page.waitForTimeout(150);
  const afterRun = await page.evaluate(() => ({ planAfter: !!window.TM_AuthoringAgentUI._ui.planMode, closed: document.querySelector('.je-cmdk-back').hidden }));

  // 再开 → 搜「体检」→ ArrowDown 改高亮 → 执行 → preflight 渲染
  await page.keyboard.press('Control+k');
  await page.locator('.je-cmdk input').fill('体检');
  const tijianMatch = await page.evaluate(() => document.querySelectorAll('.je-cmdk-item').length >= 1 && /体检/.test(document.querySelector('.je-cmdk-item').textContent));
  await page.locator('.je-cmdk input').press('Enter');
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && s.style.display !== 'none' && /运行时体检/.test(s.textContent); }, { timeout: 8000 }).catch(() => {});
  const preflightRan = await page.evaluate(() => { var s = document.querySelector('#tm-aa-summary'); return s && s.style.display !== 'none' && /运行时体检/.test(s.textContent); });

  // Esc 关
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(80);
  await page.locator('.je-cmdk input').press('Escape');
  const escClosed = await page.evaluate(() => document.querySelector('.je-cmdk-back').hidden);

  await browser.close();

  const checks = {
    ctrlk_opens: opened === true,
    search_filters: filtered.count >= 1 && filtered.hasPlanToggle && filtered.count < 15,
    enter_runs_and_toggles_plan: afterRun.planAfter !== planBefore && afterRun.closed === true,
    tijian_matched: tijianMatch === true,
    preflight_ran_via_cmdk: preflightRan === true,
    esc_closes: escClosed === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, opened, filtered, planBefore, afterRun, tijianMatch, preflightRan, escClosed, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
