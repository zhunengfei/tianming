// Dev-only e2e: UI 桌面端质感 — 聚焦环/数字等宽/过渡/分隔 计算样式生效 + 无功能回归（无需 API）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8786/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM_AuthoringAgentUI && window.TM_AuthoringAgentUI._ui && document.getElementById('tm-aa-req') && window._jeCmdkOpen, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  const css = await page.evaluate(() => {
    var req = document.getElementById('tm-aa-req');
    var panel = document.getElementById('tm-aa-panel');
    var go = document.getElementById('tm-aa-go');
    var actions = document.getElementById('tm-aa-actions');
    req.focus();
    var reqCs = getComputedStyle(req);
    return {
      focusRing: reqCs.boxShadow && reqCs.boxShadow !== 'none',
      tabularNums: /tabular-nums/.test(getComputedStyle(panel).fontVariantNumeric || ''),
      btnTransition: (getComputedStyle(go).transitionDuration || '0s') !== '0s',
      actionsDivider: parseFloat(getComputedStyle(actions).borderTopWidth || '0') > 0
    };
  });

  // 无功能回归：⌘K 开 + 搜 + 执行（切计划模式）仍工作
  const planBefore = await page.evaluate(() => !!window.TM_AuthoringAgentUI._ui.planMode);
  await page.keyboard.press('Control+k');
  await page.locator('.je-cmdk input').fill('计划');
  await page.locator('.je-cmdk input').press('Enter');
  await page.waitForTimeout(150);
  const regression = await page.evaluate(() => ({
    planToggled: !!window.TM_AuthoringAgentUI._ui.planMode,
    cmdkClosed: document.querySelector('.je-cmdk-back').hidden,
    panelStillThere: !!document.getElementById('tm-aa-panel')
  }));

  await browser.close();

  const checks = {
    focus_ring_applied: css.focusRing === true,
    tabular_numerals: css.tabularNums === true,
    button_transition: css.btnTransition === true,
    actions_divider: css.actionsDivider === true,
    no_regression_cmdk_runs: regression.planToggled !== planBefore && regression.cmdkClosed && regression.panelStillThere,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, css, planBefore, regression, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
