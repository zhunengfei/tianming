// 捞全 9 模块里折子标签仍是英文（缺 FIELD_DESCRIPTIONS）的字段 key
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.module-folio') && window.TM_SCENARIO_EDITOR_RESET_APP, { timeout: 15000 });
  await page.waitForTimeout(400);
  const out = await page.evaluate(async () => {
    const tiles = Array.from(document.querySelectorAll('#module-rail .module-tile[data-module-id]'));
    const result = {};
    const allEnglish = {};
    for (const t of tiles) {
      t.click();
      await new Promise(r => setTimeout(r, 120));
      const mod = t.dataset.moduleId;
      const rows = Array.from(document.querySelectorAll('.module-folio .folio-row'));
      const en = rows.map(r => ({
        key: (r.querySelector('.folio-key') || {}).textContent || '',
        label: ((r.querySelector('.folio-label') || {}).textContent || '').trim()
      })).filter(x => x.label && !/[一-鿿]/.test(x.label));
      result[mod] = { total: rows.length, english: en.map(x => x.key.trim() || x.label) };
      en.forEach(x => { allEnglish[(x.key.trim() || x.label)] = 1; });
    }
    return { perModule: result, allEnglishKeys: Object.keys(allEnglish) };
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(2); });
