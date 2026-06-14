const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1500, height: 1150 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.TM_SCENARIO_EDITOR_RESET_APP && window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario.characters, { timeout: 15000 });

  async function openSpecialist(field) {
    await p.evaluate((f) => {
      var app = window.TM_SCENARIO_EDITOR_RESET_APP;
      var arr = app.state.scenario[f] || [];
      app.revealEntity(f, (arr[0] || {}).name || (arr[0] || {}).id || '');
      app.state.activeWorkbenchPanel = 'specialist-editor';
    }, field);
    await p.evaluate(() => { var btn = document.querySelector('[data-workbench-panel="specialist-editor"]'); if (btn) btn.click(); });
    await p.waitForTimeout(300);
  }

  await openSpecialist('factions');
  const fac = await p.evaluate(() => {
    var f = Array.from(document.querySelectorAll('[data-panel="specialist-editor"] [data-specialist-field]')).map(x => x.getAttribute('data-specialist-field'));
    return { total: f.length, shown: ['courtInfluence', 'popularInfluence', 'factionType', 'loyaltyToSong', 'cultureLevel', 'prestige'].filter(s => f.indexOf(s) >= 0) };
  });
  console.log('势力影响力字段现身:', JSON.stringify(fac));

  await openSpecialist('characters');
  const el = await p.$('[data-panel="specialist-editor"]');
  if (el) { await el.screenshot({ path: 'dev-tools/_shot-specialist.png' }); console.log('人物表单截图已存'); }
  await b.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
