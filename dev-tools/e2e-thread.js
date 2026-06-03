// Dev-only e2e: UI·B 会话流布局 — 用户气泡回显·续接线程累积·右靠·无功能回归（走 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8790/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM && window.TM.AuthoringAgent.runAuthoringLoop && document.getElementById('tm-aa-go'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  const req = page.locator('#tm-aa-req');
  // 第一轮
  await req.click(); await req.fill('第一条需求：改名');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; }, { timeout: 20000 });
  const turn1 = await page.evaluate(() => {
    var bubbles = [...document.querySelectorAll('#tm-aa-loglist .tm-aa-msg-user')];
    var first = bubbles[0];
    var log = document.querySelector('#tm-aa-loglist');
    var rightAligned = false;
    if (first) { var lr = log.getBoundingClientRect(), br = first.getBoundingClientRect(); rightAligned = (br.right > lr.left + lr.width * 0.5) && (br.left > lr.left + 8); }
    return { bubbles: bubbles.length, text: first ? first.textContent : '', rightAligned: rightAligned, hasCards: document.querySelectorAll('#tm-aa-loglist .tm-aa-step').length >= 1 };
  });

  // 第二轮（不应用·续接）→ 线程累积第二个气泡
  await req.click(); await req.fill('第二条追问：再补一个');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => { var st = document.querySelector('#tm-aa-status'); return st && /结束|完成/.test(st.textContent); }, { timeout: 20000 });
  const turn2 = await page.evaluate(() => {
    var bubbles = [...document.querySelectorAll('#tm-aa-loglist .tm-aa-msg-user')];
    return { bubbles: bubbles.length, texts: bubbles.map(function (b) { return b.textContent; }) };
  });

  await browser.close();

  const checks = {
    turn1_user_bubble: turn1.bubbles === 1 && /第一条需求/.test(turn1.text),
    turn1_who_label: /你/.test(turn1.text),
    turn1_right_aligned: turn1.rightAligned === true,
    turn1_assistant_cards: turn1.hasCards === true,
    turn2_thread_accumulates: turn2.bubbles === 2,
    turn2_second_bubble: turn2.texts.some(function (t) { return /第二条追问/.test(t); }) && turn2.texts.some(function (t) { return /第一条需求/.test(t); }),
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, turn1, turn2, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
