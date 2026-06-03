// Dev-only e2e: UI·AI 面板可调宽度+全屏 — 左缘拖拽调宽(持久+槽宽随动)·⛶全屏/还原(无需 mock)
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
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('tm-aa-resize') && document.getElementById('tm-aa-fs') && document.getElementById('tm-aa-panel'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });
  await page.waitForTimeout(80);

  const before = await page.evaluate(() => document.getElementById('tm-aa-panel').offsetWidth);

  // 拖左缘加宽 ~120px
  const box = await page.locator('#tm-aa-resize').boundingBox();
  await page.mouse.move(box.x + 3, box.y + 60);
  await page.mouse.down();
  await page.mouse.move(box.x - 120, box.y + 60, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(60);
  const resized = await page.evaluate(() => ({
    width: document.getElementById('tm-aa-panel').offsetWidth,
    saved: parseInt(localStorage.getItem('tm_aa_panel_width') || '0', 10),
    cssVar: document.body.style.getPropertyValue('--tm-aa-dock-w'),
    shellPad: getComputedStyle(document.querySelector('.reset-shell')).paddingRight,
  }));

  // 全屏
  await page.locator('#tm-aa-fs').click();
  await page.waitForTimeout(60);
  const full = await page.evaluate(() => {
    var r = document.getElementById('tm-aa-panel').getBoundingClientRect();
    return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(window.innerWidth - r.right), w: Math.round(r.width), resizeHidden: document.getElementById('tm-aa-resize').style.display === 'none', fsLabel: document.getElementById('tm-aa-fs').textContent };
  });

  // 还原 → 回到调宽后的宽度
  await page.locator('#tm-aa-fs').click();
  await page.waitForTimeout(60);
  const restored = await page.evaluate(() => ({ width: document.getElementById('tm-aa-panel').offsetWidth, resizeShown: document.getElementById('tm-aa-resize').style.display !== 'none', fsLabel: document.getElementById('tm-aa-fs').textContent }));

  await browser.close();

  const checks = {
    resize_widens: resized.width >= before + 80,
    width_persisted: resized.saved >= 320 && Math.abs(resized.saved - resized.width) <= 4,
    gutter_synced: /\d+px/.test(resized.cssVar) && parseInt(resized.shellPad, 10) >= resized.width,
    fullscreen_fills: full.left <= 18 && full.top <= 18 && full.right <= 18 && full.w > before + 200 && full.resizeHidden === true,
    fullscreen_label: full.fsLabel === '🗗' && restored.fsLabel === '⛶',
    restores_to_resized: Math.abs(restored.width - resized.width) <= 4 && restored.resizeShown === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, before, resized, full, restored, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
