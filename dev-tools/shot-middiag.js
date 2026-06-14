const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.module-folio'), { timeout: 15000 });
  await page.waitForTimeout(800);

  // 1) 视口实景（用户真正看到的）：截 .inspector 在视口内的样子（不滚动，原始视口高度）
  await page.screenshot({ path: 'dev-tools/_diag-viewport.png' });

  // 2) 诊断数据：每个折子标签是中文还是英文 key？可见字段数？空值数？
  const diag = await page.evaluate(() => {
    var rows = Array.from(document.querySelectorAll('.module-folio .folio-row'));
    var labels = rows.map(function (r) {
      var lab = r.querySelector('.folio-label');
      var key = r.querySelector('.folio-key');
      return { label: lab ? lab.textContent.trim() : '', key: key ? key.textContent.trim() : '', complex: r.classList.contains('folio-row-complex'), missing: r.hasAttribute('data-folio-missing') };
    });
    var englishLabels = labels.filter(function (l) { return l.label && !/[一-鿿]/.test(l.label); });
    // 各模块 tile 的字段数（看看每章字段多不多）
    var inspectorH = (document.querySelector('.inspector') || {}).scrollHeight;
    var folioH = (document.querySelector('.module-folio') || {}).scrollHeight;
    return {
      totalRows: rows.length,
      englishLabelCount: englishLabels.length,
      englishLabelSamples: englishLabels.slice(0, 18).map(function (l) { return l.label; }),
      complexCount: labels.filter(function (l) { return l.complex; }).length,
      missingCount: labels.filter(function (l) { return l.missing; }).length,
      inspectorScrollH: inspectorH,
      folioScrollH: folioH,
      viewportH: window.innerHeight
    };
  });
  console.log(JSON.stringify(diag, null, 2));
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(2); });
