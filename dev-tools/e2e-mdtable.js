// Dev-only e2e: UI·AE Markdown 表格渲染 — GFM 表格(|列|列|)渲成真 <table>·表头/数据/对齐·无 raw 竖线泄露(走 mock·qa 路径)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8777/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => window.TM && window.TM.AuthoringAgent.runAuthoringLoop && window.TM_AuthoringAgentUI && window.TM_AuthoringAgentUI.qa, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  await page.locator('#tm-aa-req').fill('东林党都有谁？');
  await page.evaluate(() => window.TM_AuthoringAgentUI.qa());
  await page.waitForFunction(() => document.querySelector('#tm-aa-summary .md-table'), { timeout: 20000 });
  // UI·P 流式：等打字机收尾（光标消失）再读，否则 cell 文本还没揭显完
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && !s.querySelector('.tm-aa-caret') && /回答完成|未得到/.test((document.querySelector('#tm-aa-status') || {}).textContent || ''); }, { timeout: 20000 });

  const tbl = await page.evaluate(() => {
    var s = document.querySelector('#tm-aa-summary');
    var t = s.querySelector('.md-table');
    return {
      hasTable: !!t,
      ths: [...t.querySelectorAll('thead th')].map(function (e) { return e.textContent; }),
      bodyRows: t.querySelectorAll('tbody tr').length,
      tds: [...t.querySelectorAll('tbody td')].map(function (e) { return e.textContent; }),
      noRawPipeRow: !/\|\s*姓名\s*\|/.test(s.textContent),     // 不残留 raw 「| 姓名 |」
      noSepRow: !/^\s*\|?\s*-{3}/m.test(s.textContent),         // 不残留分隔行 ---
      // 同条答案里 list + 代码块仍在（回归）
      stillHasList: !!s.querySelector('.md-list li'),
      stillHasCode: !!s.querySelector('.md-codewrap'),
      stillHasStrong: !!s.querySelector('strong'),
    };
  });

  await browser.close();

  const checks = {
    table_rendered: tbl.hasTable === true,
    header_cells: tbl.ths.length === 2 && /姓名/.test(tbl.ths[0]) && /派系/.test(tbl.ths[1]),
    two_data_rows: tbl.bodyRows === 2 && tbl.tds.length === 4,
    cell_content: tbl.tds.some(function (t) { return /钱谦益/.test(t); }) && tbl.tds.some(function (t) { return /东林/.test(t); }),
    no_raw_pipe_leak: tbl.noRawPipeRow === true && tbl.noSepRow === true,
    coexists_list_code_bold: tbl.stillHasList && tbl.stillHasCode && tbl.stillHasStrong,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, tbl, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
