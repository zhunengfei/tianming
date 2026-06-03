// Dev-only e2e: 方向S 批量扩写 — 弹窗·选集合+数量·构造批量提示词(含范例)·触发生成·⌘K（走 mock·真天启）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8785/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => window._jeOpenBatch && document.querySelector('.je-aa-batch') && window.TM && window.TM.AuthoringAgent.runAuthoringLoop && window.TM_SCENARIO_EDITOR_RESET_APP, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); });

  // 开 🔢 批量 → 集合下拉填充
  await page.locator('.je-aa-batch').click();
  const opened = await page.evaluate(() => ({
    open: !document.querySelectorAll('.je-import-back')[0] ? false : [...document.querySelectorAll('.je-import-back')].some(function (b) { return !b.hidden && b.querySelector('.je-batch'); }),
    collOpts: document.querySelectorAll('.je-batch-coll option').length,
    hasN: !!document.querySelector('.je-batch-n')
  }));

  // 选 characters · 数量 8 · 开始扩写
  await page.evaluate(() => {
    var sel = document.querySelector('.je-batch-coll');
    var opt = [...sel.options].filter(function (o) { return o.value === 'characters'; })[0];
    if (opt) sel.value = 'characters';
    document.querySelector('.je-batch-n').value = '8';
    document.querySelector('.je-batch-note').value = '偏文官';
  });
  await page.locator('.je-batch-go').click();
  // 立即查 req（run 进行中·未清空）
  const built = await page.evaluate(() => {
    var v = document.getElementById('tm-aa-req').value || '';
    return {
      modalClosed: [...document.querySelectorAll('.je-import-back')].every(function (b) { return b.hidden; }),
      hasCount: /批量新增 8 个人物/.test(v),
      hasNote: /偏文官/.test(v),
      hasExemplars: /参考现有范例/.test(v),
      hasBulkAdd: /bulkAdd/.test(v)
    };
  });

  // 等生成完成 → diff
  await page.waitForFunction(() => { var d = document.querySelector('#tm-aa-difflist'); return d && d.querySelectorAll('.tm-aa-diff-group').length >= 1; }, { timeout: 20000 });
  const diffGroups = await page.evaluate(() => document.querySelectorAll('#tm-aa-difflist .tm-aa-diff-group').length);

  // ⌘K 有「批量扩写」
  await page.keyboard.press('Control+k');
  await page.locator('.je-cmdk input').fill('批量');
  const cmdkHasBatch = await page.evaluate(() => [...document.querySelectorAll('.je-cmdk-item')].some(function (el) { return /批量扩写/.test(el.textContent); }));

  await browser.close();

  const checks = {
    modal_opens_with_colls: opened.open === true && opened.collOpts >= 1 && opened.hasN,
    modal_closes_on_start: built.modalClosed,
    prompt_has_count: built.hasCount,
    prompt_has_note: built.hasNote,
    prompt_embeds_exemplars: built.hasExemplars,
    prompt_asks_bulkadd: built.hasBulkAdd,
    run_produced_diff: diffGroups >= 1,
    cmdk_has_batch: cmdkHasBatch === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, opened, built, diffGroups, cmdkHasBatch, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
