const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.module-rail'), { timeout: 15000 });
  await page.waitForTimeout(1200);

  // 候选可见性/尺寸
  const info = await page.evaluate(() => {
    const sels = ['#editor-grid', '.module-rail', '#module-detail', '.inspector', '.main-stack'];
    return sels.map(s => {
      const el = document.querySelector(s);
      if (!el) return { s, exists: false };
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      return { s, disp: cs.display, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), gridCols: s==='#editor-grid'?cs.gridTemplateColumns:undefined };
    });
  });
  console.log(JSON.stringify(info, null, 2));

  // 左列
  const rail = page.locator('.module-rail').first();
  if (await rail.count()) { try { await rail.screenshot({ path: 'dev-tools/_shot-left.png' }); console.log('left ok'); } catch(e){ console.log('left fail', e.message); } }

  // 中列：取可见且最宽的
  const midSel = info.filter(i => i.exists !== false && i.disp !== 'none' && i.h > 50 && i.x > 200 && i.x < 1100).sort((a,b)=>b.w-a.w)[0];
  console.log('mid pick:', midSel && midSel.s);
  if (midSel) {
    const mid = page.locator(midSel.s).first();
    try { await mid.screenshot({ path: 'dev-tools/_shot-mid.png' }); console.log('mid ok'); } catch(e){ console.log('mid fail', e.message); }
  }
  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('SHOT ERROR', e); process.exit(2); });
