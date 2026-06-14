// N2-ii e2e — 国师 diff 分组头字段名可点→revealField 折子定位。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); } catch (e) {} });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.TM_SCENARIO_EDITOR_RESET_APP && window.TM && window.TM.AuthoringAgent && document.getElementById('tm-aa-go'), { timeout: 15000 });
  await p.evaluate(() => { var pn = document.getElementById('tm-aa-panel'); if (pn) pn.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  // 跑一轮生成（mock 返回 diff）
  await p.evaluate(() => { var r = document.getElementById('tm-aa-req'); r.value = '把第一个势力改个更威风的名字'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.locator('#tm-aa-go').click();
  await p.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; }, { timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(400);

  const checks = {};
  checks.diff_jump_present = await p.evaluate(() => !!document.querySelector('#tm-aa-difflist .tm-aa-diff-jump[data-reveal-field]'));
  const click = await p.evaluate(() => {
    var j = document.querySelector('#tm-aa-difflist .tm-aa-diff-jump[data-reveal-field]');
    if (!j) return { ok: false };
    var f = j.getAttribute('data-reveal-field');
    j.click();
    return { ok: true, field: f };
  });
  await p.waitForTimeout(300);
  if (click.ok) checks.diff_jump_navigates = await p.evaluate((f) => window.TM_SCENARIO_EDITOR_RESET_APP.state.selectedField === f, click.field);
  checks.noPageErrors = errs.length === 0;

  await b.close();
  console.log(JSON.stringify({ checks, click, errs }, null, 1));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
