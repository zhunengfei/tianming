// M1 e2e — 折子表单：标量就地保存 + 复杂字段展开 + 字段索引默认折叠
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM_SCENARIO_EDITOR_RESET_APP && document.querySelector('.module-folio'), { timeout: 15000 });
  await page.waitForTimeout(500);

  const checks = {};

  // 1) 折子存在 + 有字段组 + 有标量输入
  checks.folio_present = await page.evaluate(() => !!document.querySelector('.module-folio .folio-group .folio-rows'));
  checks.has_scalar_input = await page.evaluate(() => !!document.querySelector('.folio-input[data-folio-field]'));

  // 2) 字段索引默认折叠
  checks.field_index_collapsed = await page.evaluate(() => {
    var d = document.querySelector('.field-index');
    return !!d && !d.open;
  });

  // 2b) M6 · 深度工作台默认收起（标量字段选中时）
  checks.deep_bench_collapsed_default = await page.evaluate(() => {
    var d = document.querySelector('.deep-bench');
    return !!d && !d.open;
  });

  // 3) 标量就地保存：找一个 string 文本输入，改值，blur，断言 state.scenario 更新 + ✓
  const saveResult = await page.evaluate(() => {
    var sc = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario;
    var inp = Array.from(document.querySelectorAll('input.folio-input[type="text"][data-folio-field]'))[0];
    if (!inp) return { ok: false, why: 'no text folio input' };
    var field = inp.dataset.folioField;
    var before = sc[field];
    var nv = 'e2e_' + field + '_改';
    inp.focus(); inp.value = nv;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    var after = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario[field];
    var row = inp.closest('.folio-row');
    return { ok: true, field: field, before: before, after: after, saved: !!(row && row.getAttribute('data-folio-saved')), match: after === nv };
  });
  checks.scalar_saved_to_state = saveResult.ok && saveResult.match === true;
  checks.scalar_saved_badge = saveResult.ok && saveResult.saved === true;

  // 4) 复杂字段展开：点 .folio-row-complex 的展开按钮，selectedField 切到该字段
  const expandResult = await page.evaluate(() => {
    var btn = document.querySelector('.folio-row-complex .folio-expand[data-field-pick]');
    if (!btn) return { ok: false, why: 'no complex expand btn' };
    var field = btn.dataset.fieldPick;
    btn.click();
    return { ok: true, field: field };
  });
  if (expandResult.ok) {
    await page.waitForTimeout(80);
    // M2 · 展开后下方 workbench 应被加上 folio-reveal-flash（指引视线）
    checks.complex_expand_flash = await page.evaluate(() => !!document.querySelector('#module-detail .folio-reveal-flash'));
    await page.waitForTimeout(200);
    checks.complex_expand_selects = await page.evaluate((f) => {
      var st = window.TM_SCENARIO_EDITOR_RESET_APP.state;
      return st && st.selectedField === f;
    }, expandResult.field);
    // M6 · 展开复杂字段后深度工作台自动 open
    checks.deep_bench_opens_on_complex = await page.evaluate(() => {
      var d = document.querySelector('.deep-bench');
      return !!d && d.open;
    });
  } else {
    checks.complex_expand_selects = false;
    checks.complex_expand_flash = false;
    checks.deep_bench_opens_on_complex = false;
  }

  // 5) AI 钮存在于折子行（路由到案侧国师 = fill-field）
  checks.folio_ai_button = await page.evaluate(() => !!document.querySelector('.folio-ai[data-ai-action="fill-field"]'));

  checks.noPageErrors = errs.length === 0;

  await browser.close();
  console.log(JSON.stringify({ checks, saveResult, expandResult, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
