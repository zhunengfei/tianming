const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 940 }, deviceScaleFactor: 1.5 })).newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.setWorkbenchPanel('renwu-folio'));
  await p.waitForTimeout(300);
  // 强制展开深度编辑台 + 滚到列传面板
  await p.evaluate(() => {
    document.querySelectorAll('details.deep-bench, details.field-index').forEach(d => { d.open = true; });
    var el = document.querySelector('[data-panel="renwu-folio"]');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'dev-tools/shot-folio-surfaced.png' });
  // 再截一张只含列传面板的裁切图
  const box = await p.evaluate(() => { var el = document.querySelector('[data-panel="renwu-folio"]'); if (!el) return null; var r = el.getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(1100, r.width), height: Math.min(900, r.height) }; });
  if (box && box.width > 50 && box.height > 50) await p.screenshot({ path: 'dev-tools/shot-folio-only.png', clip: box });
  await browser.close();
  console.log('shots written; folioBox=' + JSON.stringify(box));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
