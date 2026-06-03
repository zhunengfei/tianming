// Dev-only e2e: 方向B 剧本记忆与约定 — B1 约定框存→读, B2 agent 回写「记住」追加
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8763/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 }));
      localStorage.removeItem('tm_aa_conventions');
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => {
    const AA = window.TM && window.TM.AuthoringAgent;
    return AA && AA.loadConventions && AA.saveConventions && document.querySelector('.je-aa-conv .je-conv-text') &&
      window.TM_AuthoringAgentUI && window.TM_AuthoringAgentUI._ui && window.TM_AuthoringAgentUI._ui.adapter;
  }, { timeout: 15000 });

  await page.evaluate(() => {
    const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open');
    document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open');
  });

  // ---- B1: 约定框 输入→保存→读 ----
  await page.evaluate(() => { const d = document.querySelector('.je-aa-conv'); if (d) d.open = true; });
  await page.locator('.je-aa-conv .je-conv-text').fill('文风暗黑写实，忠奸不脸谱化');
  await page.locator('.je-aa-conv .je-conv-save').click();
  const b1Saved = await page.evaluate(() => window.TM.AuthoringAgent.loadConventions());
  // estimate 反映约定（token 比无约定高）
  const estBump = await page.evaluate(() => {
    const AA = window.TM.AuthoringAgent;
    const sc = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario;
    const d = AA.makeDraft(sc);
    const withC = AA.estimateRun(d, '改个名', { conventions: '文风暗黑写实，忠奸不脸谱化' }).perCallInput;
    const noC = AA.estimateRun(d, '改个名', { conventions: '' }).perCallInput;
    return withC > noC;
  });

  // ---- B2: 跑一次（mock 会吐 recordConvention）→ 💡建议记住 → 点「记住」→ 约定追加 ----
  const req = page.locator('#tm-aa-req');
  await req.click(); await req.fill('把势力改名并补齐缺口');
  await req.press('Control+Enter');
  await page.waitForFunction(() => {
    const s = document.querySelector('#tm-aa-summary');
    return s && s.style.display !== 'none' && s.querySelector('.sug-keep');
  }, { timeout: 15000 });
  // UI·P 流式：等打字机收尾（光标消失）再读，否则建议约定 span 文本还没揭显
  await page.waitForFunction(() => { const s = document.querySelector('#tm-aa-summary'); return s && !s.querySelector('.tm-aa-caret'); }, { timeout: 15000 });
  const sugText = await page.evaluate(() => { const r = document.querySelector('.tm-aa-sug .sug-row span'); return r ? r.textContent : ''; });
  await page.locator('.tm-aa-sug .sug-keep').first().click();
  const afterKeep = await page.evaluate(() => ({
    btnText: document.querySelector('.tm-aa-sug .sug-keep').textContent,
    conventions: window.TM.AuthoringAgent.loadConventions()
  }));

  await browser.close();

  const checks = {
    b1_saved_roundtrip: b1Saved === '文风暗黑写实，忠奸不脸谱化',
    b1_estimate_reflects_conventions: estBump,
    b2_suggestion_shown: /明代官话/.test(sugText),
    b2_keep_marks_done: /已记住/.test(afterKeep.btnText),
    b2_keep_appends_not_overwrites: afterKeep.conventions.indexOf('文风暗黑写实') >= 0 && afterKeep.conventions.indexOf('明代官话') >= 0,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, b1Saved, sugText, afterKeep, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
