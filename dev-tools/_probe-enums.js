const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const BASE = process.env.AU_URL || 'http://127.0.0.1:8080';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext()).newPage();
  await p.goto(BASE + '/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    function distinct(scen, keys) {
      app.loadOfficialScenario(scen);
      var chars = app.state.scenario.characters || [];
      var out = {};
      keys.forEach(k => { out[k] = {}; });
      chars.forEach(c => { keys.forEach(k => { var v = c[k]; if (v != null && v !== '') out[k][v] = (out[k][v] || 0) + 1; }); });
      return out;
    }
    var keys = ['type', 'familyTier', 'royalRelation', 'class', 'stance', 'role', 'occupation', 'vassalType', 'partyRank', 'familyRole', 'behaviorMode'];
    return { tianqi: distinct('tianqi7', keys), shaosong: distinct('shaosong', keys) };
  });
  // 验证立绘路径可达
  const portraitCode = await p.evaluate(() => { var c = (window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario.characters || [])[0]; return c && c.portrait; });
  await browser.close();
  console.log('ENUMS:', JSON.stringify(r, null, 1));
  if (portraitCode) {
    const u = BASE + '/' + String(portraitCode).replace(/^\//, '');
    console.log('portrait sample url:', u);
  }
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
