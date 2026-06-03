// Dev-only e2e: UI·Y 消息操作 — 用户气泡 hover 出 复制/编辑重发/重试；copy→剪贴板·edit→回填不自动发·retry→重跑(走 mock)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8783/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => { try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM && window.TM.AuthoringAgent.runAuthoringLoop && document.getElementById('tm-aa-go'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  const REQ = '统一所有势力的称呼';
  await page.locator('#tm-aa-req').fill(REQ);
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; }, { timeout: 20000 });

  // 气泡结构：3 个操作键 + data-msg 存全文
  const struct = await page.evaluate(() => {
    var b = document.querySelector('#tm-aa-loglist .tm-aa-msg-user');
    return { bubbles: document.querySelectorAll('#tm-aa-loglist .tm-aa-msg-user').length, acts: b.querySelectorAll('.mu-act').length, dataMsg: b.getAttribute('data-msg'), kind: b.getAttribute('data-kind') };
  });

  // hover → 操作条可见（测 CSS :hover 规则）
  await page.hover('#tm-aa-loglist .tm-aa-msg-user');
  const hoverVisible = await page.evaluate(() => { var a = document.querySelector('#tm-aa-loglist .tm-aa-msg-acts'); return getComputedStyle(a).display !== 'none'; });

  // 复制 → 剪贴板含原文
  await page.evaluate(() => { var b = document.querySelector('#tm-aa-loglist .tm-aa-msg-user'); b.querySelector('.mu-act[data-act="copy"]').click(); });
  await page.waitForTimeout(150);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));

  // 编辑重发 → 回填输入框·不自动发（气泡数不变·非运行中）
  await page.evaluate(() => { document.getElementById('tm-aa-req').value = ''; var b = document.querySelector('#tm-aa-loglist .tm-aa-msg-user'); b.querySelector('.mu-act[data-act="edit"]').click(); });
  await page.waitForTimeout(150);
  const edited = await page.evaluate(() => ({ reqVal: document.getElementById('tm-aa-req').value, bubbles: document.querySelectorAll('#tm-aa-loglist .tm-aa-msg-user').length, status: document.querySelector('#tm-aa-status').textContent }));

  // 重试 → 重跑同一条（线程多一个气泡）
  await page.evaluate(() => { var b = document.querySelector('#tm-aa-loglist .tm-aa-msg-user'); b.querySelector('.mu-act[data-act="retry"]').click(); });
  await page.waitForFunction(() => document.querySelectorAll('#tm-aa-loglist .tm-aa-msg-user').length >= 2, { timeout: 20000 });
  const retried = await page.evaluate(() => ({ bubbles: document.querySelectorAll('#tm-aa-loglist .tm-aa-msg-user').length, lastMsg: [...document.querySelectorAll('#tm-aa-loglist .tm-aa-msg-user')].pop().getAttribute('data-msg') }));

  await browser.close();

  const checks = {
    bubble_has_3_acts: struct.acts === 3 && struct.bubbles === 1,
    data_msg_full_text: struct.dataMsg === REQ && struct.kind === 'generate',
    acts_visible_on_hover: hoverVisible === true,
    copy_to_clipboard: clip === REQ,
    edit_refills_no_send: edited.reqVal === REQ && edited.bubbles === 1 && /编辑后/.test(edited.status),
    retry_reruns: retried.bubbles === 2 && retried.lastMsg === REQ,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, struct, hoverVisible, clip, edited, retried, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
