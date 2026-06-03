// Dev-only e2e: UI·AA 代码块复制+语法高亮 — 围栏代码渲成带语言标签+复制键的卡·token 着色·复制原文(走 mock·qa 路径)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8781/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => window.TM && window.TM.AuthoringAgent.runAuthoringLoop && window.TM_AuthoringAgentUI && window.TM_AuthoringAgentUI.qa, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  // 问答路径（mock 回答含 ```json 块）
  await page.locator('#tm-aa-req').fill('东林党有几人？');
  await page.evaluate(() => window.TM_AuthoringAgentUI.qa());
  await page.waitForFunction(() => document.querySelector('#tm-aa-summary .md-codewrap'), { timeout: 20000 });
  // UI·P 流式：等打字机收尾（光标消失）再读，否则 lang 标签/代码文本还没揭显完
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && !s.querySelector('.tm-aa-caret') && /回答完成|未得到/.test((document.querySelector('#tm-aa-status') || {}).textContent || ''); }, { timeout: 20000 });

  const block = await page.evaluate(() => {
    var w = document.querySelector('#tm-aa-summary .md-codewrap');
    var pre = w.querySelector('pre.md-code');
    return {
      hasCopyBtn: !!w.querySelector('.md-copy'),
      lang: w.querySelector('.md-lang') ? w.querySelector('.md-lang').textContent : '',
      tokKey: w.querySelectorAll('.tok-key').length,
      tokStr: w.querySelectorAll('.tok-str').length,
      tokNum: w.querySelectorAll('.tok-num').length,
      tokKw: w.querySelectorAll('.tok-kw').length,
      dataCode: pre.getAttribute('data-code'),
      noRawFence: !/```/.test(document.querySelector('#tm-aa-summary').textContent),
    };
  });

  // 点复制 → 剪贴板拿到原文（真引号·非转义）
  await page.evaluate(() => { document.querySelector('#tm-aa-summary .md-copy').click(); });
  await page.waitForTimeout(150);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));

  await browser.close();

  const EXPECT = '{"faction": "东林党", "count": 2, "active": true}';
  const checks = {
    codeblock_rendered: block.hasCopyBtn === true,
    lang_label_json: block.lang === 'json',
    syntax_highlighted: block.tokKey >= 2 && block.tokStr >= 1 && block.tokNum >= 1 && block.tokKw >= 1,
    data_code_raw: block.dataCode === EXPECT,
    no_raw_fence: block.noRawFence === true,
    copy_raw_to_clipboard: clip === EXPECT,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, block, clip, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
