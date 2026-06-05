// N4 e2e — 国师应用改动后，被改字段在折子高亮回显。
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

  const checks = {};
  checks.api_markAgentTouched = await p.evaluate(() => typeof window.TM_SCENARIO_EDITOR_RESET_APP.markAgentTouched === 'function');

  // 跑生成 → diff
  await p.evaluate(() => { var r = document.getElementById('tm-aa-req'); r.value = '把第一个势力改个更威风的名字'; r.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.locator('#tm-aa-go').click();
  await p.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; }, { timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(300);
  // 应用
  await p.locator('#tm-aa-apply').click();
  await p.waitForTimeout(400);

  checks.agent_touched_set = await p.evaluate(() => { var st = window.TM_SCENARIO_EDITOR_RESET_APP.state; return !!(st._agentTouched && Object.keys(st._agentTouched).length > 0); });
  const touchedFields = await p.evaluate(() => { var st = window.TM_SCENARIO_EDITOR_RESET_APP.state; return st._agentTouched ? Object.keys(st._agentTouched) : []; });
  // 导航到被改字段所在模块，确认折子行高亮
  if (touchedFields.length) {
    await p.evaluate((f) => { if (window.TM_SCENARIO_EDITOR_RESET_APP.revealField) window.TM_SCENARIO_EDITOR_RESET_APP.revealField(f); }, touchedFields[0]);
    await p.waitForTimeout(300);
    checks.folio_row_highlighted = await p.evaluate((f) => !!document.querySelector('.module-folio [data-folio-row="' + f + '"].folio-agent-touched'), touchedFields[0]);
  }
  checks.noPageErrors = errs.length === 0;

  await b.close();
  console.log(JSON.stringify({ checks, touchedFields, errs }, null, 1));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
