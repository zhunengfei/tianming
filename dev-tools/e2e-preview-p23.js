// P2/P3 e2e — 玩家视角预览 + 数值体检模态。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.TM_SCENARIO_EDITOR_RESET_APP && document.querySelector('.top-actions'), { timeout: 15000 });
  await p.waitForTimeout(1600); // 等启动钮注入

  const checks = {};
  checks.launchers_injected = await p.evaluate(() => document.querySelectorAll('.top-actions [data-pv-launch]').length === 2);

  // P2 玩家视角
  await p.evaluate(() => { var b = document.querySelector('[data-pv-launch="preview"]'); if (b) b.click(); });
  await p.waitForTimeout(250);
  checks.p2_modal_opens = await p.evaluate(() => !!document.getElementById('je-pv-back'));
  checks.p2_opening_card = await p.evaluate(() => { var b = document.getElementById('je-pv-body'); return !!b && !!b.querySelector('.je-pv-open h2'); });
  checks.p2_char_stats = await p.evaluate(() => document.querySelectorAll('#je-pv-body .je-pv-stat').length >= 6);
  checks.p2_stat_chinese = await p.evaluate(() => { var l = document.querySelector('#je-pv-body .je-pv-stat label'); return !!l && /[智武军政魅交仁廉]/.test(l.textContent); });
  await p.evaluate(() => { var x = document.querySelector('.je-pv-x'); if (x) x.click(); });
  await p.waitForTimeout(150);
  checks.modal_closes = await p.evaluate(() => !document.getElementById('je-pv-back'));

  // P3 数值体检
  await p.evaluate(() => { var b = document.querySelector('[data-pv-launch="audit"]'); if (b) b.click(); });
  await p.waitForTimeout(250);
  checks.p3_modal_opens = await p.evaluate(() => !!document.getElementById('je-pv-back'));
  checks.p3_distribution = await p.evaluate(() => document.querySelectorAll('#je-pv-body .je-pv-distrow').length >= 6);
  const dist0 = await p.evaluate(() => { var r = document.querySelector('#je-pv-body .je-pv-distrow b'); return r ? r.textContent : ''; });
  checks.p3_has_avg = /均/.test(dist0);

  checks.noPageErrors = errs.length === 0;
  await b.close();
  console.log(JSON.stringify({ checks, dist0, errs }, null, 1));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
