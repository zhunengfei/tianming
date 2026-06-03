// Dev-only e2e: 方向R 模板/宏 — 存/载入/同名覆盖/删除/持久化（纯 UI·无需 API）
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
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  const ready = () => page.waitForFunction(() => {
    const U = window.TM_AuthoringAgentUI;
    return U && U.macros && U.saveMacro && document.querySelector('.je-aa-macro');
  }, { timeout: 15000 });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ready();
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); var d = document.querySelector('.je-aa-macro'); if (d) d.open = true; try { localStorage.removeItem('tm_aa_macros'); } catch (e) {} window.TM_AuthoringAgentUI._ui._onMacrosChange && window.TM_AuthoringAgentUI._ui._onMacrosChange(); });

  const req = page.locator('#tm-aa-req');
  // 存第一个模板
  await req.click(); await req.fill('新建一个势力，含领袖、3名属官、与现有势力的关系网');
  await page.locator('.je-aa-macro .je-macro-name').fill('建标准势力');
  await page.locator('.je-aa-macro .je-macro-add').click();
  const afterSave1 = await page.evaluate(() => ({ count: window.TM_AuthoringAgentUI.macros().length, summary: document.querySelector('.je-aa-macro summary').textContent, rows: document.querySelectorAll('.je-aa-macro .je-macro-row').length }));

  // 清空输入框 → 点模板名 → 载入
  await req.fill('');
  await page.locator('.je-aa-macro .je-macro-row .nm').first().click();
  const afterApply = await page.evaluate(() => document.getElementById('tm-aa-req').value);

  // 存第二个
  await req.fill('润色所有人物的 bio，更生动'); await page.locator('.je-aa-macro .je-macro-name').fill('润色人物');
  await page.locator('.je-aa-macro .je-macro-add').click();
  const afterSave2 = await page.evaluate(() => window.TM_AuthoringAgentUI.macros().length);

  // 同名覆盖：再存「建标准势力」用新内容 → 仍 2 个、内容更新
  await req.fill('建一个更强的势力'); await page.locator('.je-aa-macro .je-macro-name').fill('建标准势力');
  await page.locator('.je-aa-macro .je-macro-add').click();
  const afterOverwrite = await page.evaluate(() => {
    var ms = window.TM_AuthoringAgentUI.macros();
    var m = ms.filter(function (x) { return x.name === '建标准势力'; })[0];
    return { count: ms.length, updated: m && m.prompt === '建一个更强的势力' };
  });

  // 删除一个 → 1 个
  await page.evaluate(() => {
    var ms = window.TM_AuthoringAgentUI.macros();
    var pol = ms.filter(function (x) { return x.name === '润色人物'; })[0];
    window.TM_AuthoringAgentUI.deleteMacro(pol.id);
  });
  const afterDelete = await page.evaluate(() => window.TM_AuthoringAgentUI.macros().length);

  // 持久化：重载后仍在
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ready();
  const afterReload = await page.evaluate(() => window.TM_AuthoringAgentUI.macros().length);

  await browser.close();

  const checks = {
    save_first: afterSave1.count === 1 && /模板（1）/.test(afterSave1.summary) && afterSave1.rows === 1,
    apply_loads_prompt: /关系网/.test(afterApply),
    save_second: afterSave2 === 2,
    same_name_overwrites: afterOverwrite.count === 2 && afterOverwrite.updated,
    delete_works: afterDelete === 1,
    persists_across_reload: afterReload === 1,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, afterSave1, afterApply, afterSave2, afterOverwrite, afterDelete, afterReload, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
