// Dev-only e2e: UI·P 流式打字机 — AI 结果以打字机逐字揭显(光标在途) + 完成后整文落定·确定性渲染不吐字(走 mock)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8786/preview/scenario-editor-reset-preview.html';
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
  await req.click(); await req.fill('把所有势力名改统一');
  await page.locator('#tm-aa-go').click();

  // 光标在途 → 流式路径已触发；原子地取一帧采样（此刻已揭显的字数）
  const sampleH = await page.waitForFunction(() => {
    var s = document.querySelector('#tm-aa-summary');
    var c = s && s.querySelector('.tm-aa-caret');
    if (!c) return false;
    return { len: s.textContent.length };
  }, { timeout: 20000 });
  const sample = await sampleH.jsonValue();

  // 完成 → 光标移除、actions 出现、整文落定
  await page.waitForFunction(() => {
    var a = document.querySelector('#tm-aa-actions');
    var s = document.querySelector('#tm-aa-summary');
    return a && a.style.display !== 'none' && s && !s.querySelector('.tm-aa-caret');
  }, { timeout: 20000 });
  const fin = await page.evaluate(() => {
    var s = document.querySelector('#tm-aa-summary');
    return { text: s.textContent, len: s.textContent.length, caret: s.querySelectorAll('.tm-aa-caret').length };
  });

  // 负向对照：确定性渲染（运行时体检）不应吐字（无光标）
  await page.evaluate(() => { try { window.TM_AuthoringAgentUI.preflight(); } catch (e) {} });
  await page.waitForTimeout(120);
  const det = await page.evaluate(() => {
    var s = document.querySelector('#tm-aa-summary');
    return { text: s.textContent, caret: s.querySelectorAll('.tm-aa-caret').length };
  });

  await browser.close();

  const checks = {
    caret_appeared_streaming: !!sample,                          // 走到这步=光标出现过=流式路径运行了
    sample_partial: sample && sample.len >= 1,                   // 采样帧确有已揭显的字
    progressive_reveal: sample && sample.len < fin.len,          // 采样早于完成 → 字数少于最终
    caret_removed_on_finish: fin.caret === 0,                    // 完成后光标移除
    final_full_text: /已将势力改名/.test(fin.text) && /本次改动说明/.test(fin.text),
    deterministic_no_caret: det.caret === 0 && /运行时体检/.test(det.text),  // 体检瞬显·不吐字
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, sample, fin: { len: fin.len, caret: fin.caret, head: fin.text.slice(0, 40) }, det: { caret: det.caret, head: det.text.slice(0, 20) }, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
