// Dev-only: 截国师 UI 关键状态图（系统 Edge·走 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const OUT = process.env.SHOT_DIR || '.';
(async () => {
  const url = 'http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, deviceScaleFactor: 1.5, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => { try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-demo', model: 'gpt-4o', temp: 0.7 })); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM_AuthoringAgentUI && window.TM_AuthoringAgentUI.qa && document.getElementById('tm-aa-go'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });
  await page.waitForTimeout(400);

  const panel = page.locator('#tm-aa-panel');
  // 1) 空状态欢迎 + 建议 chips
  await panel.screenshot({ path: OUT + '/01-empty.png' });
  // 1b) ＋模式 菜单展开
  await page.evaluate(() => { var b = document.querySelector('.je-aa-plus-btn'); if (b) b.click(); }).catch(() => {});
  await page.waitForTimeout(150);
  await panel.screenshot({ path: OUT + '/01b-plus.png' });
  await page.evaluate(() => { var m = document.querySelector('.je-aa-plus-menu'); if (m) m.hidden = true; }).catch(() => {});

  // 2) 跑一次生成 → 思考折叠 + 工具卡 + diff 逐条接受/拒绝 + 改动说明
  await page.locator('#tm-aa-req').fill('把主角势力改名并补一个文官');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; }, { timeout: 20000 });
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && !s.querySelector('.tm-aa-caret'); }, { timeout: 20000 });
  await page.waitForTimeout(300);
  await panel.screenshot({ path: OUT + '/02-result.png' });

  // 3) 快捷键速查（⌘/）
  await page.locator('#tm-aa-req').click();
  await page.keyboard.press('Control+Slash');
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/03-cheatsheet.png' });
  await page.keyboard.press('Escape');

  // 4) 长回答折叠「显示更多」
  await page.locator('#tm-aa-discard').click().catch(() => {});
  await page.locator('#tm-aa-req').fill('[LONG] 详细讲讲这个剧本');
  await page.evaluate(() => window.TM_AuthoringAgentUI.qa());
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && s.classList.contains('tm-aa-clamped'); }, { timeout: 20000 });
  await page.waitForTimeout(300);
  await panel.screenshot({ path: OUT + '/04-clamp.png' });

  await browser.close();
  console.log('SHOTS DONE');
})().catch(e => { console.error('SHOT ERROR', e); process.exit(2); });
