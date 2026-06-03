// Dev-only e2e: 方向M 运行历史/审计日志 — 记录·应用标记·搜索·面板·持久化（走 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8775/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); } catch (e) {}   // 不清历史·新 context 本就空·重载验持久化
  });
  let page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  const ready = () => page.waitForFunction(() => {
    const U = window.TM_AuthoringAgentUI;
    return U && U.history && document.querySelector('.je-aa-hist') && window.TM && window.TM.AuthoringAgent && window.TM.AuthoringAgent.runAuthoringLoop;
  }, { timeout: 15000 });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ready();
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); var d = document.querySelector('.je-aa-hist'); if (d) d.open = true; });

  // 跑一次编辑 → 历史 +1
  const req = page.locator('#tm-aa-req');
  await req.click(); await req.fill('把势力改名并补一个');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => window.TM_AuthoringAgentUI.history().length >= 1, { timeout: 20000 });
  const afterEdit = await page.evaluate(() => {
    var h = window.TM_AuthoringAgentUI.history();
    return { count: h.length, kind: h[0].kind, hasReq: /改名/.test(h[0].request), hasTokens: h[0].tokensUsed > 0, applied: h[0].applied };
  });

  // 应用 → 最近一条标记 applied
  await page.locator('#tm-aa-apply').click();
  await page.waitForTimeout(200);
  const afterApply = await page.evaluate(() => window.TM_AuthoringAgentUI.history()[0].applied);

  // 跑一次问答 → 历史 +1（kind 问答）
  await req.click(); await req.fill('这剧本有几个东林党？');
  await page.locator('.je-aa-qa').click();
  await page.waitForFunction(() => window.TM_AuthoringAgentUI.history().length >= 2, { timeout: 20000 });
  const afterQa = await page.evaluate(() => {
    var h = window.TM_AuthoringAgentUI.history();
    return { count: h.length, newestKind: h[0].kind };
  });

  // 搜索过滤 + 面板渲染
  const searchAndPanel = await page.evaluate(() => {
    var s = document.querySelector('.je-hist-search'); s.value = '问答'; s.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      filtered: window.TM_AuthoringAgentUI.history('问答').length,
      panelRows: document.querySelectorAll('.je-aa-hist .je-hist-row').length,
      summaryHasCount: /历史（\d+/.test(document.querySelector('.je-aa-hist summary').textContent)
    };
  });

  // 持久化：重载页面后历史仍在
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ready();
  const afterReload = await page.evaluate(() => window.TM_AuthoringAgentUI.history().length);

  await browser.close();

  const checks = {
    edit_logged: afterEdit.count === 1 && afterEdit.kind === '编辑' && afterEdit.hasReq && afterEdit.hasTokens,
    not_applied_initially: afterEdit.applied === false,
    apply_marks_applied: afterApply === true,
    qa_logged: afterQa.count === 2 && afterQa.newestKind === '问答',
    search_filters: searchAndPanel.filtered === 1,
    panel_rows_rendered: searchAndPanel.panelRows >= 1,
    panel_summary_count: searchAndPanel.summaryHasCount,
    persists_across_reload: afterReload >= 2,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, afterEdit, afterApply, afterQa, searchAndPanel, afterReload, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
