const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = 'http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html';
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(450);
  const r = await p.evaluate(() => {
    var sc = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario;
    function shape(v, depth) {
      depth = depth || 0;
      if (Array.isArray(v)) return 'array[' + v.length + ']' + (v.length ? ' of ' + (typeof v[0] === 'object' && v[0] ? '{' + Object.keys(v[0]).slice(0, 14).join(',') + '}' : typeof v[0]) : '');
      if (v && typeof v === 'object') { var ks = Object.keys(v); return 'obj{' + ks.slice(0, 22).join(',') + (ks.length > 22 ? ',…+' + (ks.length - 22) : '') + '}'; }
      return typeof v + (typeof v === 'string' ? '(' + String(v).slice(0, 30) + ')' : '=' + v);
    }
    var fields = ['military', 'events', 'timeline', 'rigidHistoryEvents', 'objectives', 'victoryConditions', 'officeTree', 'government', 'officeConfig', 'fiscalConfig', 'corruption', 'economyConfig', 'techTree', 'civicTree', 'variables', 'mechanicsConfig', 'rules', 'adminHierarchy', 'map', 'gameSettings', 'playerInfo', 'name', 'parties', 'classes', 'items', 'families'];
    var out = {};
    fields.forEach(function (f) { if (sc[f] !== undefined) out[f] = shape(sc[f]); });
    // deeper: military + officeTree + fiscalConfig first child
    var deep = {};
    if (sc.military && typeof sc.military === 'object') { deep.military_keys = {}; Object.keys(sc.military).forEach(function (k) { deep.military_keys[k] = shape(sc.military[k]); }); }
    if (Array.isArray(sc.events) && sc.events[0]) deep.event0 = Object.keys(sc.events[0]);
    if (sc.officeTree) deep.officeTree = shape(sc.officeTree);
    if (Array.isArray(sc.officeTree) && sc.officeTree[0]) deep.office0 = JSON.stringify(sc.officeTree[0]).slice(0, 300);
    if (sc.fiscalConfig) { deep.fiscalConfig_keys = {}; Object.keys(sc.fiscalConfig).forEach(function (k) { deep.fiscalConfig_keys[k] = shape(sc.fiscalConfig[k]); }); }
    if (Array.isArray(sc.variables) && sc.variables[0]) deep.var0 = JSON.stringify(sc.variables[0]).slice(0, 160);
    if (sc.techTree) deep.techTree = shape(sc.techTree);
    if (sc.adminHierarchy) deep.adminHierarchy = shape(sc.adminHierarchy);
    return { fields: out, deep: deep };
  });
  await b.close();
  console.log(JSON.stringify(r, null, 1));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
