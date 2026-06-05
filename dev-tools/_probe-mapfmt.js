// 一次性探针：天启真数据里 map.regions 用 path 还是 coords？mapRuntimeContract 装什么？adminHierarchy 形状？
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext()).newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    function probe(name) {
      app.loadOfficialScenario(name);
      const sc = app.state.scenario;
      const m = sc.map || sc.mapData || {};
      const r0 = (m.regions || [])[0] || {};
      const ah = sc.adminHierarchy;
      let ahShape = Array.isArray(ah) ? ('array[' + ah.length + ']') : (ah && typeof ah === 'object' ? 'object{' + Object.keys(ah).slice(0,4).join(',') + '}' : typeof ah);
      let ahFirst = null;
      if (Array.isArray(ah) && ah[0]) ahFirst = Object.keys(ah[0]);
      else if (ah && typeof ah === 'object') { const k = Object.keys(ah)[0]; ahFirst = k ? (k + ':' + Object.keys(ah[k]).join(',')) : null; }
      return {
        scenario: name,
        mapField: sc.map ? 'map' : (sc.mapData ? 'mapData' : 'none'),
        mapTopKeys: Object.keys(m),
        regionCount: (m.regions || []).length,
        region0Keys: Object.keys(r0),
        region0HasPath: 'path' in r0, region0HasCoords: 'coords' in r0,
        region0Geom: r0.path ? ('path:' + String(r0.path).slice(0, 30)) : (r0.coords ? ('coords[' + (r0.coords.length) + ']') : 'NONE'),
        mapRuntimeContract: sc.mapRuntimeContract ? (typeof sc.mapRuntimeContract === 'object' ? Object.keys(sc.mapRuntimeContract) : String(sc.mapRuntimeContract).slice(0, 80)) : 'absent',
        adminHierarchyShape: ahShape, adminHierarchyFirst: ahFirst,
        hasNativeMapSource: ['mapSource', 'mapEditorSource', 'meMap', 'divisions'].filter(k => k in sc)
      };
    }
    return [probe('tianqi7'), probe('shaosong')];
  });
  await browser.close();
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
