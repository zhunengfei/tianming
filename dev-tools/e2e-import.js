// Dev-only e2e: 方向U 导入/转换 — 弹窗·空文本守卫·抽取构造提示词含素材·触发生成出 diff·⌘K入口（走 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8780/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => window._jeOpenImport && document.querySelector('.je-import-back') && document.querySelector('.je-aa-import') && window.TM && window.TM.AuthoringAgent.runAuthoringLoop, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); });

  // 点 📥 导入 → 弹窗开
  await page.locator('.je-aa-import').click();
  const opened = await page.evaluate(() => !document.querySelector('.je-import-back').hidden);

  // 空文本守卫
  await page.locator('.je-import:not(.je-bundle):not(.je-batch) .je-import-go').click();
  const emptyGuard = await page.evaluate(() => ({ stillOpen: !document.querySelector('.je-import-back').hidden, status: document.querySelector('#tm-aa-status').textContent }));

  // 粘素材 → 抽取入草稿
  const SRC = '崇祯帝朱由检，明思宗，十七岁继位，勤政多疑。东林党，江南士绅清流集团。';
  await page.locator('.je-import:not(.je-bundle):not(.je-batch) .je-import-text').fill(SRC);
  await page.locator('.je-import:not(.je-bundle):not(.je-batch) .je-import-go').click();
  // 立即查 req（run 进行中·尚未清空）
  const afterExtract = await page.evaluate((src) => {
    return {
      modalClosed: document.querySelector('.je-import-back').hidden,
      reqHasSrc: (document.getElementById('tm-aa-req').value || '').indexOf(src) >= 0,
      reqHasFraming: /素材如下|抽取/.test(document.getElementById('tm-aa-req').value || '')
    };
  }, SRC);

  // 等生成完成 → diff 出现（mock 抽出实体）
  await page.waitForFunction(() => { var d = document.querySelector('#tm-aa-difflist'); return d && d.querySelectorAll('.tm-aa-diff-group').length >= 1; }, { timeout: 20000 });
  const diffGroups = await page.evaluate(() => document.querySelectorAll('#tm-aa-difflist .tm-aa-diff-group').length);

  // ⌘K 里有「导入素材」命令·能开弹窗
  await page.evaluate(() => { document.querySelector('.je-import-back').hidden = true; });
  await page.keyboard.press('Control+k');
  await page.locator('.je-cmdk input').fill('导入');
  const cmdkHasImport = await page.evaluate(() => [...document.querySelectorAll('.je-cmdk-item')].some(function (el) { return /导入素材/.test(el.textContent); }));
  await page.locator('.je-cmdk input').press('Enter');
  await page.waitForTimeout(150);
  const cmdkOpensImport = await page.evaluate(() => !document.querySelector('.je-import-back').hidden);

  await browser.close();

  const checks = {
    import_button_opens_modal: opened === true,
    empty_text_guarded: emptyGuard.stillOpen === true && /粘贴素材/.test(emptyGuard.status),
    extract_closes_modal: afterExtract.modalClosed === true,
    prompt_contains_source: afterExtract.reqHasSrc === true,
    prompt_has_extract_framing: afterExtract.reqHasFraming === true,
    run_produced_diff: diffGroups >= 1,
    cmdk_has_import_command: cmdkHasImport === true,
    cmdk_opens_import: cmdkOpensImport === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, opened, emptyGuard, afterExtract, diffGroups, cmdkHasImport, cmdkOpensImport, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
