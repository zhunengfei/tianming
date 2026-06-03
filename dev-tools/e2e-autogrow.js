// Dev-only e2e: UI·AF 输入框自动增高+实时字数 — 随内容长高(到上限才滚)·右下角字数·清空复位(无需 mock)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8776/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => document.getElementById('tm-aa-req') && document.getElementById('tm-aa-charcount'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  const req = page.locator('#tm-aa-req');
  const initial = await page.evaluate(() => ({ h: document.getElementById('tm-aa-req').offsetHeight, ccHidden: document.getElementById('tm-aa-charcount').hidden }));

  // 短文 → 字数显示
  await req.fill('改名测试');
  const short = await page.evaluate(() => ({ h: document.getElementById('tm-aa-req').offsetHeight, cc: document.getElementById('tm-aa-charcount').textContent, ccHidden: document.getElementById('tm-aa-charcount').hidden }));

  // 多行长文 → 增高
  await req.fill(Array.from({ length: 14 }, (_, i) => '第' + (i + 1) + '行：把某势力改名并补齐字段，让剧本完整可玩').join('\n'));
  const grown = await page.evaluate(() => ({ h: document.getElementById('tm-aa-req').offsetHeight, sh: document.getElementById('tm-aa-req').scrollHeight }));

  // 超长 → 封顶 + 溢出可滚
  await req.fill(Array.from({ length: 60 }, (_, i) => '行' + i + ' 内容内容内容内容内容内容内容内容').join('\n'));
  const capped = await page.evaluate(() => { var el = document.getElementById('tm-aa-req'); return { h: el.offsetHeight, sh: el.scrollHeight, cc: document.getElementById('tm-aa-charcount').textContent }; });

  // 清空 → 复位
  await req.fill('');
  const cleared = await page.evaluate(() => ({ h: document.getElementById('tm-aa-req').offsetHeight, ccHidden: document.getElementById('tm-aa-charcount').hidden }));

  await browser.close();

  const checks = {
    charcount_hidden_empty: initial.ccHidden === true,
    charcount_shows_count: /^4 字$/.test(short.cc) && short.ccHidden === false,
    grows_with_content: grown.h > initial.h + 12,
    caps_at_max: capped.h <= 184 && capped.sh > capped.h + 10,   // 封顶 ~180 + 边框·内容更高=可滚
    cleared_resets: cleared.h <= initial.h + 4 && cleared.ccHidden === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, initial, short, grown, capped, cleared, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
