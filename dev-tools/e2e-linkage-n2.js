// N2 e2e — 折子↗→revealField+国师预填；rail↗→revealModule+国师预填。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.TM_SCENARIO_EDITOR_RESET_APP && document.querySelector('.module-folio') && window.TM_AuthoringAgentUI, { timeout: 15000 });
  await p.evaluate(() => { var pn = document.getElementById('tm-aa-panel'); if (pn) pn.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });
  await p.waitForTimeout(1400); // 等 rail ↗ 注入

  const checks = {};
  checks.folio_ask_present = await p.evaluate(() => !!document.querySelector('.module-folio .folio-ask[data-ask-guoshi]'));
  checks.rail_ask_injected = await p.evaluate(() => document.querySelectorAll('#module-rail .module-tile .tile-ask[data-ask-guoshi-module]').length >= 9);
  checks.api_revealField = await p.evaluate(() => typeof window.TM_SCENARIO_EDITOR_RESET_APP.revealField === 'function');
  checks.api_revealModule = await p.evaluate(() => typeof window.TM_SCENARIO_EDITOR_RESET_APP.revealModule === 'function');

  // 点折子某字段 ↗
  const fres = await p.evaluate(() => {
    var btn = document.querySelector('.module-folio .folio-ask[data-ask-guoshi]');
    if (!btn) return { ok: false };
    var field = btn.getAttribute('data-ask-guoshi');
    btn.click();
    return { ok: true, field: field };
  });
  await p.waitForTimeout(300);
  if (fres.ok) {
    checks.folio_ask_selects_field = await p.evaluate((f) => window.TM_SCENARIO_EDITOR_RESET_APP.state.selectedField === f, fres.field);
    checks.folio_ask_prefills_guoshi = await p.evaluate(() => { var r = document.getElementById('tm-aa-req'); return !!r && /关于字段/.test(r.value); });
  }

  // 点 rail 某模块 ↗
  const mres = await p.evaluate(() => {
    var btn = document.querySelector('#module-rail .module-tile[data-module-id="courtInstitutions"] .tile-ask') || document.querySelector('#module-rail .tile-ask');
    if (!btn) return { ok: false };
    var mid = btn.getAttribute('data-ask-guoshi-module');
    btn.click();
    return { ok: true, mid: mid };
  });
  await p.waitForTimeout(300);
  if (mres.ok) {
    checks.rail_ask_selects_module = await p.evaluate((m) => window.TM_SCENARIO_EDITOR_RESET_APP.state.selectedModuleId === m, mres.mid);
    checks.rail_ask_prefills_guoshi = await p.evaluate(() => { var r = document.getElementById('tm-aa-req'); return !!r && /审阅本章/.test(r.value); });
  }
  checks.noPageErrors = errs.length === 0;

  await b.close();
  console.log(JSON.stringify({ checks, fres, mres, errs }, null, 1));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
