// Dev-only e2e: verify this round's 4 digs in a real browser (Edge channel).
//   1) 上下文感知 getContext   2) 改动说明 summary block   3) 斜杠命令   4) 快捷键+历史
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8762/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  // point the agent's BYOK at the local mock relay before page scripts run
  await ctx.addInitScript(() => {
    try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); } catch (e) {}
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => {
    const AA = window.TM && window.TM.AuthoringAgent;
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    const req = document.getElementById('tm-aa-req');
    return AA && app && app.state && (app.state.scenario.characters || []).length &&
      req && req._jeMentionInit && req._jeSlashInit && req._jeHotkeyInit;
  }, { timeout: 15000 });

  // open panel + dock
  await page.evaluate(() => {
    const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open');
    document.body.classList.add('je-guoshi-docked');
  });

  // ---- Slice 1: 上下文感知 ----
  const ctxInfo = await page.evaluate(() => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    app.state.selectedField = 'characters';
    app.state.selectedEntityIndex = 0;
    if (Array.isArray(app.state.modules) && app.state.modules[0]) app.state.selectedModuleId = app.state.modules.filter(m => m.id === 'characters')[0] ? 'characters' : app.state.modules[0].id;
    const adapter = window.TM_AuthoringAgentUI._ui.adapter;
    const name = app.state.scenario.characters[0] && app.state.scenario.characters[0].name;
    return { context: adapter.getContext(), firstName: name };
  });

  const req = page.locator('#tm-aa-req');

  // ---- Slice 3: 斜杠命令 ----
  await req.click(); await req.fill('');
  await req.type('/', { delay: 20 });
  const slashShown = await page.evaluate(() => { const m = document.querySelector('.je-aa-slash'); return m && !m.hidden && m.querySelectorAll('button').length; });
  await req.press('ArrowDown');
  const slashActive0 = await page.evaluate(() => [...document.querySelectorAll('.je-aa-slash button')].findIndex(b => b.classList.contains('je-m-active')) === 0);

  // '/计划' + Enter → 计划模式勾上
  await req.fill(''); await req.type('/计划', { delay: 20 });
  await req.press('Enter');
  const planToggled = await page.evaluate(() => { const cb = document.querySelector('.je-aa-planmode input'); return !!(cb && cb.checked); });
  // 关掉计划模式（为 slice 4 的真跑准备）
  await page.evaluate(() => { const cb = document.querySelector('.je-aa-planmode input'); if (cb && cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change')); } });

  // '/补齐' + Enter → 填入模板（含 listGaps）
  await req.click(); await req.fill(''); await req.type('/补齐', { delay: 20 });
  await req.press('Enter');
  const slashFilled = await page.evaluate(() => (document.getElementById('tm-aa-req').value || '').indexOf('listGaps') >= 0);

  // ---- Slice 4 + Slice 2: Ctrl+Enter 发送（走 mock）→ 改动说明块 + 历史 ----
  await req.click(); await req.fill('把势力改名并补齐缺口');
  await req.press('Control+Enter');
  // 等 mock 跑完 → 改动说明块出现
  await page.waitForFunction(() => {
    const s = document.querySelector('#tm-aa-summary');
    return s && s.style.display !== 'none' && /改动说明/.test(s.textContent);
  }, { timeout: 15000 });
  // UI·P 流式：等打字机收尾（光标消失）再读，否则 rationale 还没揭显
  await page.waitForFunction(() => { const s = document.querySelector('#tm-aa-summary'); return s && !s.querySelector('.tm-aa-caret'); }, { timeout: 15000 });
  const summaryInfo = await page.evaluate(() => {
    const s = document.querySelector('#tm-aa-summary');
    return { visible: s.style.display !== 'none', text: s.textContent };
  });

  // 历史：清空后 ↑ 回溯刚提交的指令
  await req.click();
  await page.evaluate(() => { const r = document.getElementById('tm-aa-req'); r.value = ''; r.setSelectionRange(0, 0); });
  await req.press('ArrowUp');
  const histRecall = await page.evaluate(() => document.getElementById('tm-aa-req').value);

  await browser.close();

  const checks = {
    s1_context_has_name: !!ctxInfo.firstName && ctxInfo.context.indexOf(ctxInfo.firstName) >= 0,
    s1_context_has_collection: /集合\/字段：characters/.test(ctxInfo.context),
    s3_slash_menu_shows: !!slashShown,
    s3_slash_arrowdown_active0: slashActive0,
    s3_slash_plan_toggled: planToggled,
    s3_slash_fill_template: slashFilled,
    s2_summary_visible: summaryInfo.visible,
    s2_summary_has_rationale: /mock 改动说明/.test(summaryInfo.text),
    s4_history_recall: histRecall === '把势力改名并补齐缺口',
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, ctxInfo, summaryText: summaryInfo.text, histRecall, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
