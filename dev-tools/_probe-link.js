// 探针：天启 map.regions 与 adminHierarchy.divisions 到底靠什么字段对应？id？name？mapRegionId？
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
    app.loadOfficialScenario('tianqi7');
    await new Promise(r => setTimeout(r, 350));
    const sc = app.state.scenario;
    const regions = (sc.map && sc.map.regions) || [];
    const ah = sc.adminHierarchy || {};
    const divs = [];
    Object.keys(ah).forEach(k => { (ah[k].divisions || []).forEach(d => divs.push(d)); });

    const regById = {}, regByName = {}, regByMapRegionId = {};
    regions.forEach(r => { if (r.id) regById[r.id] = r; if (r.name) regByName[r.name] = r; if (r.mapRegionId) regByMapRegionId[r.mapRegionId] = r; });

    let byId = 0, byName = 0, byMapRegionId = 0, byDivMapRegionId = 0;
    divs.forEach(d => {
      if (regById[d.id]) byId++;
      if (d.name && regByName[d.name]) byName++;
      if (d.mapRegionId && regById[d.mapRegionId]) byDivMapRegionId++;
      if (regByMapRegionId[d.id]) byMapRegionId++;
    });

    return {
      regionCount: regions.length, divCount: divs.length,
      match_div_id_to_region_id: byId,
      match_div_name_to_region_name: byName,
      match_div_mapRegionId_to_region_id: byDivMapRegionId,
      match_div_id_to_region_mapRegionId: byMapRegionId,
      sampleRegions: regions.slice(0, 4).map(r => ({ id: r.id, name: r.name, mapRegionId: r.mapRegionId, adminBinding: r.adminBinding, sourceId: r.sourceId })),
      sampleDivs: divs.slice(0, 6).map(d => ({ id: d.id, name: d.name, mapRegionId: d.mapRegionId, level: d.level, hasPolygon: Array.isArray(d.polygon) })),
      divKeys: divs[0] ? Object.keys(divs[0]) : []
    };
  });
  await browser.close();
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
