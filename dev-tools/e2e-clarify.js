// Dev-only e2e: 方向K 交互式澄清 — 含糊需求→agent反问→玩家作答→续接编辑（走 mock·[CLARIFY] gate）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8772/preview/scenario-editor-reset-preview.html';
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
    const U = window.TM_AuthoringAgentUI, AA = window.TM && window.TM.AuthoringAgent;
    return U && U._ui && AA && AA.AGENT_TOOLS.some(t => t.name === 'askClarification') && document.getElementById('tm-aa-go');
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  const req = page.locator('#tm-aa-req');
  // 含糊需求（带 [CLARIFY] 触发 mock 反问）
  await req.click(); await req.fill('[CLARIFY] 加个厉害的武将');
  await page.locator('#tm-aa-go').click();

  // 等澄清问题出现
  await page.waitForFunction(() => {
    var st = document.querySelector('#tm-aa-status');
    return st && /澄清/.test(st.textContent) && document.querySelectorAll('#tm-aa-difflist .tm-aa-finding').length > 0;
  }, { timeout: 20000 });
  const clarifyPhase = await page.evaluate(() => ({
    status: document.querySelector('#tm-aa-status').textContent,
    questionCount: document.querySelectorAll('#tm-aa-difflist .tm-aa-finding').length,
    applyText: document.querySelector('#tm-aa-apply').textContent,
    reqEmpty: (document.getElementById('tm-aa-req').value || '') === '',
    pendingClarify: !!window.TM_AuthoringAgentUI._ui._pendingClarify
  }));

  // 作答 → 点「提交回答并继续」
  await req.click(); await req.fill('放东林党，侧重统帅');
  await page.locator('#tm-aa-apply').click();

  // 等编辑结果出现（diff 分组）
  await page.waitForFunction(() => {
    var st = document.querySelector('#tm-aa-status');
    var groups = document.querySelectorAll('#tm-aa-difflist .tm-aa-diff-group').length;
    return groups >= 1 && st && /结束|完成/.test(st.textContent);
  }, { timeout: 20000 });
  const answerPhase = await page.evaluate(() => ({
    diffGroups: document.querySelectorAll('#tm-aa-difflist .tm-aa-diff-group').length,
    status: document.querySelector('#tm-aa-status').textContent,
    pendingClarify: !!window.TM_AuthoringAgentUI._ui._pendingClarify,
    applyText: document.querySelector('#tm-aa-apply').textContent
  }));

  await browser.close();

  const checks = {
    clarify_questions_shown: clarifyPhase.questionCount === 2,
    clarify_status: /澄清/.test(clarifyPhase.status),
    clarify_apply_label: /提交回答并继续/.test(clarifyPhase.applyText),
    clarify_pending_flag: clarifyPhase.pendingClarify === true,
    answer_produced_edits: answerPhase.diffGroups >= 1,
    answer_cleared_pending: answerPhase.pendingClarify === false,
    answer_apply_is_normal: /应用到剧本|确认应用/.test(answerPhase.applyText),
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, clarifyPhase, answerPhase, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
