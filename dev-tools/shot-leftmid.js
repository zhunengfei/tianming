// Dev-only screenshot: 当前剧本工坊左+中两列现状（高清·真实加载态）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR', String(e)));
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM_SCENARIO_EDITOR_RESET_APP || document.querySelector('#module-detail, .reset-shell, .je-rail'), { timeout: 15000 });
  await page.waitForTimeout(1200); // 等自动 dock 国师 + 渲染
  // 全页
  await page.screenshot({ path: 'dev-tools/_shot-full.png' });
  console.log('full saved');

  // 左 rail 单独
  const rail = page.locator('.je-rail, .module-rail, .reset-rail, nav').first();
  if (await rail.count()) { try { await rail.screenshot({ path: 'dev-tools/_shot-left.png' }); console.log('left saved'); } catch(e){ console.log('left fail', e.message);} }

  // 中心模块编辑器
  const mid = page.locator('#module-detail, .inspector, .module-detail, .main-stack').first();
  if (await mid.count()) { try { await mid.screenshot({ path: 'dev-tools/_shot-mid.png' }); console.log('mid saved'); } catch(e){ console.log('mid fail', e.message);} }

  // 打印实际左中 DOM 结构线索
  const probe = await page.evaluate(() => {
    const out = {};
    const shell = document.querySelector('.reset-shell') || document.body;
    out.shellChildren = Array.from(shell.children).map(c => c.tagName.toLowerCase() + (c.id ? '#'+c.id : '') + (c.className ? '.'+String(c.className).split(' ').slice(0,2).join('.') : '')).slice(0, 12);
    const cands = ['.je-rail', '.module-rail', '.reset-rail', '#module-detail', '.inspector', '.main-stack', '.reset-shell'];
    out.found = cands.filter(s => document.querySelector(s));
    // grid 列定义
    out.shellDisplay = getComputedStyle(shell).display;
    out.shellCols = getComputedStyle(shell).gridTemplateColumns;
    return out;
  });
  console.log(JSON.stringify(probe, null, 2));

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('SHOT ERROR', e); process.exit(2); });
