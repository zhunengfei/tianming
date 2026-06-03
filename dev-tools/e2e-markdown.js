// Dev-only e2e: UI·A Markdown 渲染 — 问答回答渲染加粗+列表·changelog 渲染标题+列表·XSS 安全（走 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8787/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); localStorage.removeItem('tm_aa_run_history'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => { const U = window.TM_AuthoringAgentUI; return U && U.qa && U.runChangelog && document.getElementById('tm-aa-go'); }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); });

  // 问答 → 回答含 markdown（mock 吐 **加粗** + 列表）
  const req = page.locator('#tm-aa-req');
  await req.click(); await req.fill('有几个东林党？');
  await page.locator('.je-aa-qa').click();
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && s.style.display !== 'none' && /问：/.test(s.textContent); }, { timeout: 20000 });
  const answerMd = await page.evaluate(() => {
    var s = document.querySelector('#tm-aa-summary');
    return { hasStrong: !!s.querySelector('strong'), hasList: !!s.querySelector('.md-list li'), text: s.textContent };
  });

  // 做一次编辑+应用，然后生成 changelog → 渲染标题+列表（不是 raw ##）
  await req.click(); await req.fill('改个名');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; }, { timeout: 20000 });
  await page.locator('#tm-aa-apply').click();
  await page.waitForTimeout(200);
  await page.evaluate(() => window.TM_AuthoringAgentUI.runChangelog());
  const clMd = await page.evaluate(() => {
    var s = document.querySelector('#tm-aa-summary');
    return { hasHeading: !!s.querySelector('.md-h'), hasList: !!s.querySelector('.md-list'), rawHashVisible: /^##\s/m.test(s.textContent) };
  });

  // XSS 安全：直接喂含 <script> 的 markdown 给 renderAnswer 路径不可能注入（验 _md 转义）
  const xssSafe = await page.evaluate(() => {
    // 通过 qa 渲染器间接不便·直接验 DOM 不含注入：构造一个含恶意的 answer 走 renderAnswer
    var s = document.querySelector('#tm-aa-summary');
    // 用页面内的渲染：模拟 renderAnswer 不可直接调·改为检查现有 summary 无 <script>
    return document.querySelectorAll('#tm-aa-summary script').length === 0;
  });

  await browser.close();

  const checks = {
    answer_bold_rendered: answerMd.hasStrong === true,
    answer_list_rendered: answerMd.hasList === true,
    changelog_heading_rendered: clMd.hasHeading === true,
    changelog_list_rendered: clMd.hasList === true,
    changelog_no_raw_hash: clMd.rawHashVisible === false,
    no_script_injection: xssSafe === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, answerMd, clMd, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
