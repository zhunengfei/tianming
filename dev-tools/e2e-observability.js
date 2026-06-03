// Dev-only e2e: 方向I 可观测性 — 运行中/收尾的 token·耗时·轮次计量条（走 mock 中转）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8771/preview/scenario-editor-reset-preview.html';
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
    return U && U._ui && document.getElementById('tm-aa-meter') && window.TM && window.TM.AuthoringAgent && window.TM.AuthoringAgent.runAuthoringLoop;
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  // 用注入 caller 跑一个"慢"运行，确保能在 LIVE 状态截到计量条（onStep 带 tokensUsed）
  const liveSeen = await page.evaluate(async () => {
    const AA = window.TM.AuthoringAgent, ui = window.TM_AuthoringAgentUI._ui;
    // 复刻 UI 的运行态钩子：直接驱动 appendLog 等不便，改为直接观察 meter 元素随 onStep 更新
    const meter = document.getElementById('tm-aa-meter');
    // 手动模拟 setRunning 不可外部调；改走真实 onGenerate 路径更稳 —— 这里改为直接验证 onStep.tokensUsed 流转
    let sawTokens = 0, sawIter = 0;
    const draft = AA.makeDraft({ name: 'x', characters: [], factions: [] });
    let n = 0;
    await AA.runAuthoringLoop(draft, 'x', {
      caller: function () {
        n++;
        if (n === 1) return Promise.resolve({ toolCalls: [{ name: 'applyPush', input: { path: 'factions', value: { name: '甲' } } }] });
        return Promise.resolve({ toolCalls: [{ name: 'finish', input: { summary: 'ok' } }] });
      },
      onStep: function (step) { if (step.tokensUsed != null) sawTokens = step.tokensUsed; if (step.iteration != null) sawIter = step.iteration; }
    });
    return { sawTokens: sawTokens, sawIter: sawIter };
  });

  // 真实 UI 路径：点生成（mock），跑完看收尾计量条
  const req = page.locator('#tm-aa-req');
  await req.click(); await req.fill('改个名并补一个势力');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => {
    var m = document.getElementById('tm-aa-meter');
    return m && m.style.display !== 'none' && /用时 \d+s/.test(m.textContent) && /tokens/.test(m.textContent);
  }, { timeout: 20000 });
  const finalMeter = await page.evaluate(() => {
    var m = document.getElementById('tm-aa-meter');
    var u = window.TM_AuthoringAgentUI._ui;
    return { text: m.textContent, visible: m.style.display !== 'none', lastTokens: u._lastTokens, lastIter: u._lastIter };
  });

  await browser.close();

  const checks = {
    onStep_emits_tokens: liveSeen.sawTokens > 0 && liveSeen.sawIter >= 1,
    final_meter_visible: finalMeter.visible,
    final_meter_has_time: /用时 \d+s/.test(finalMeter.text),
    final_meter_has_tokens: /tokens/.test(finalMeter.text),
    final_meter_has_rounds: /\d+ 轮/.test(finalMeter.text),
    ui_tracked_tokens: finalMeter.lastTokens > 0 && finalMeter.lastIter >= 1,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, liveSeen, finalMeter, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
