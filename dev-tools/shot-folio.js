const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.module-folio'), { timeout: 15000 });
  await page.waitForTimeout(600);
  const folio = page.locator('.module-folio');
  await folio.screenshot({ path: 'dev-tools/_shot-folio.png' });
  console.log('folio saved');
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(2); });
