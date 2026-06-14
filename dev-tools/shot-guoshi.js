// Dev-only screenshot: 国师面板 chat-first 成品图（欢迎态 + 跑一轮后）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', String(e)));
  // demo 页会预置 mock API 再 location.replace 到 preview
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /scenario-editor-reset-preview/.test(location.pathname) || document.getElementById('tm-aa-panel'), { timeout: 15000 });
  await page.waitForFunction(() => {
    const U = window.TM_AuthoringAgentUI;
    return U && document.getElementById('tm-aa-panel');
  }, { timeout: 15000 });
  // 打开面板 + docked chat 模式
  await page.evaluate(() => {
    const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open');
    document.body.classList.add('je-guoshi-docked');
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'dev-tools/_shot-guoshi-empty.png' });
  console.log('shot 1: empty/welcome saved');

  // 跑一轮对话（生成）看消息流 + 工具卡 + diff
  await page.evaluate(() => { const r = document.getElementById('tm-aa-req'); r.value = '把第一个势力改个更威风的名字'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#tm-aa-go').click();
  // 等流式跑完（光标消失或 actions 出现）
  await page.waitForFunction(() => {
    var a = document.querySelector('#tm-aa-actions');
    var s = document.querySelector('#tm-aa-summary');
    return (a && a.style.display !== 'none') || (s && /完成|完毕|draft|草案/.test(s.textContent));
  }, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'dev-tools/_shot-guoshi-run.png' });
  console.log('shot 2: after one run saved');

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('SHOT ERROR', e); process.exit(2); });
