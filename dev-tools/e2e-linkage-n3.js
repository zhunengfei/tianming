// N3 e2e — @提及：输入@弹候选→选中插入名+chip→喂 agent 的上下文含圈定。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.TM_AuthoringAgentUI && document.getElementById('tm-aa-atpop') && window.TM_SCENARIO_EDITOR_RESET_APP, { timeout: 15000 });
  await p.evaluate(() => { var pn = document.getElementById('tm-aa-panel'); if (pn) pn.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  const checks = {};
  // 输入 @ → 弹候选
  await p.evaluate(() => { var r = document.getElementById('tm-aa-req'); r.focus(); r.value = '@'; r.setSelectionRange(1, 1); r.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.waitForTimeout(150);
  checks.atpop_shows_on_at = await p.evaluate(() => { var e = document.getElementById('tm-aa-atpop'); return !e.hidden && e.querySelectorAll('.tm-aa-atitem').length > 0; });

  // 取第一个候选名，模拟 @<片段> 过滤
  const firstName = await p.evaluate(() => { var it = document.querySelector('#tm-aa-atpop .tm-aa-atitem'); return it ? it.getAttribute('data-label') : ''; });
  const frag = firstName.slice(0, 1);
  await p.evaluate((f) => { var r = document.getElementById('tm-aa-req'); r.value = '@' + f; r.setSelectionRange(r.value.length, r.value.length); r.dispatchEvent(new Event('input', { bubbles: true })); }, frag);
  await p.waitForTimeout(150);
  checks.atpop_filters = await p.evaluate((f) => {
    var items = Array.from(document.querySelectorAll('#tm-aa-atpop .tm-aa-atitem')).map(x => x.getAttribute('data-label'));
    return items.length > 0 && items.every(l => l.toLowerCase().indexOf(f.toLowerCase()) >= 0);
  }, frag);

  // 选中第一个候选
  const picked = await p.evaluate(() => {
    var it = document.querySelector('#tm-aa-atpop .tm-aa-atitem');
    if (!it) return '';
    var lbl = it.getAttribute('data-label');
    it.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    return lbl;
  });
  await p.waitForTimeout(200);
  checks.inserts_name = await p.evaluate((lbl) => { var r = document.getElementById('tm-aa-req'); return r.value.indexOf('@' + lbl) >= 0; }, picked);
  checks.mention_chip = await p.evaluate((lbl) => { var m = document.getElementById('tm-aa-mentions'); return !m.hidden && m.textContent.indexOf(lbl) >= 0; }, picked);
  checks.fed_to_context = await p.evaluate((lbl) => {
    var ui = window.TM_AuthoringAgentUI._ui;
    // 复制 _editorContext 逻辑：mentions 应在喂 agent 的上下文里
    return ui && ui._mentions && ui._mentions.indexOf(lbl) >= 0;
  }, picked);
  // 移除 chip
  await p.evaluate(() => { var x = document.querySelector('#tm-aa-mentions .tm-aa-mx'); if (x) x.click(); });
  await p.waitForTimeout(120);
  checks.chip_removable = await p.evaluate(() => { var ui = window.TM_AuthoringAgentUI._ui; return !ui._mentions || ui._mentions.length === 0; });
  checks.noPageErrors = errs.length === 0;

  await b.close();
  console.log(JSON.stringify({ checks, firstName, picked, errs }, null, 1));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
