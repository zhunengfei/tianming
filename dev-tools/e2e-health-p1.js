// P1 e2e — 主动体检横幅 + healthCheck + 定位/交国师。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.TM_SCENARIO_EDITOR_RESET_APP && window.TM_SCENARIO_EDITOR_RESET_APP.healthCheck && document.querySelector('.module-folio'), { timeout: 15000 });
  await p.waitForTimeout(2000); // 等体检横幅注入

  const checks = {};
  const rep = await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.healthCheck());
  checks.healthCheck_returns = !!(rep && typeof rep.total === 'number' && Array.isArray(rep.categories));
  checks.banner_present = await p.evaluate(() => !!document.getElementById('je-health'));
  checks.banner_shows_count = await p.evaluate(() => { var e = document.getElementById('je-health'); return !!e && /体检/.test(e.textContent); });

  // 展开
  await p.evaluate(() => { var t = document.querySelector('#je-health [data-health-toggle]'); if (t) t.click(); });
  await p.waitForTimeout(200);
  checks.expand_shows_rows = await p.evaluate(() => document.querySelectorAll('#je-health .je-health-row').length > 0 || (window.TM_SCENARIO_EDITOR_RESET_APP.healthCheck().total === 0));

  // 点定位（若有 row）
  const jr = await p.evaluate(() => {
    var j = document.querySelector('#je-health .je-health-jump');
    if (!j) return { ok: false, noRows: true };
    var f = j.getAttribute('data-health-field') || j.getAttribute('data-health-ref') || '';
    j.click();
    return { ok: true, target: f };
  });
  await p.waitForTimeout(300);
  checks.locate_navigates = jr.noRows ? true : await p.evaluate(() => { var st = window.TM_SCENARIO_EDITOR_RESET_APP.state; return !!(st.selectedField || st.selectedEntityIndex >= 0); });

  // 点交国师（若有 row）
  const ar = await p.evaluate(() => { var x = document.querySelector('#je-health .je-health-ask'); if (!x) return { noRows: true }; x.click(); return { ok: true }; });
  await p.waitForTimeout(300);
  checks.ask_opens_guoshi = ar.noRows ? true : await p.evaluate(() => { var r = document.getElementById('tm-aa-req'); return !!r && (/补齐|修复/.test(r.value)); });

  checks.noPageErrors = errs.length === 0;
  await b.close();
  console.log(JSON.stringify({ checks, repSummary: rep ? { total: rep.total, cats: rep.categories.map(c => c.label + ':' + c.items.length) } : null, errs }, null, 1));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
