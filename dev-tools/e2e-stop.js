// Dev-only e2e: UI·Q 停止/中断 — 运行中「生成」键变形为「■停止」·点击 abort·轮间干净收尾·按钮恢复(走 mock·[SLOW] 慢响应开窗)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8785/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => window.TM && window.TM.AuthoringAgent.runAuthoringLoop && document.getElementById('tm-aa-go'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  const go = page.locator('#tm-aa-go');
  // 静止态：按钮应为「生成」、无 stopbtn 类
  const idle = await page.evaluate(() => { var g = document.getElementById('tm-aa-go'); return { text: g.textContent, stop: g.classList.contains('stopbtn'), disabled: g.disabled }; });

  await page.locator('#tm-aa-req').fill('[SLOW] 把所有势力名改统一');
  await go.click();

  // 运行中：按钮变形为「■ 停止」+ stopbtn 类 + 不禁用
  await page.waitForFunction(() => { var g = document.getElementById('tm-aa-go'); return g.classList.contains('stopbtn') && /停止/.test(g.textContent) && !g.disabled; }, { timeout: 8000 });
  const running = await page.evaluate(() => { var g = document.getElementById('tm-aa-go'); return { text: g.textContent, stop: g.classList.contains('stopbtn'), disabled: g.disabled }; });

  // 点「停止」→ 立即进入「停止中…」(禁用) + 状态提示停止
  await go.click();
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-status'); return s && /停止/.test(s.textContent); }, { timeout: 5000 });
  const stopping = await page.evaluate(() => { var g = document.getElementById('tm-aa-go'), s = document.querySelector('#tm-aa-status'); return { goText: g.textContent, goDisabled: g.disabled, status: s.textContent }; });

  // 慢响应返回后干净收尾：按钮恢复「生成」+ 状态含「已停止」(aborted) + 未产生改动(无应用按钮或空 diff)
  await page.waitForFunction(() => { var g = document.getElementById('tm-aa-go'); return g.textContent === '生成' && !g.classList.contains('stopbtn') && !g.disabled; }, { timeout: 10000 });
  const ended = await page.evaluate(() => {
    var g = document.getElementById('tm-aa-go'), s = document.querySelector('#tm-aa-status');
    var actions = document.querySelector('#tm-aa-actions');
    var diff = document.querySelector('#tm-aa-diff');
    var diffRows = diff ? diff.querySelectorAll('.tm-aa-diff-group, .add, .rm, .ch').length : 0;
    return { goText: g.textContent, status: s.textContent, actionsShown: !!(actions && actions.style.display !== 'none'), diffRows: diffRows };
  });

  await browser.close();

  const checks = {
    idle_is_generate: idle.text === '生成' && idle.stop === false,
    morphs_to_stop: running.stop === true && /停止/.test(running.text) && running.disabled === false,
    stopping_feedback: /停止/.test(stopping.status) && stopping.goDisabled === true,
    button_restored: ended.goText === '生成',
    aborted_status: /已停止/.test(ended.status),
    no_changes_applied: ended.diffRows === 0,    // 轮间中断·edits 未施
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, idle, running, stopping, ended, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
