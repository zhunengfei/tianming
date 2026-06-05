// 地图接入 · 刀2 行为验证：反向桥 convertScenarioToMapEditor 的保真度（几何/归属/势力 round-trip）。
// 注入 map-editor-to-game.js 到剧本编辑器页，载真天启/绍宋，跑 scenario→ME→game 往返断言。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const BASE = process.env.AU_URL || 'http://127.0.0.1:8080';
const URL = BASE + '/preview/scenario-editor-reset-preview.html';

(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext()).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.addScriptTag({ url: '/map-editor-to-game.js' });

  const results = await p.evaluate(async () => {
    const out = [];
    function ok(name, cond, info) { out.push({ name, pass: !!cond, info: info || '' }); }
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;

    ok('R0 反向+正向桥均已加载', typeof window.convertScenarioToMapEditor === 'function' && typeof window.convertMapEditorToGame === 'function',
      'rev=' + typeof window.convertScenarioToMapEditor + ' fwd=' + typeof window.convertMapEditorToGame);
    if (typeof window.convertScenarioToMapEditor !== 'function') return out;

    // ── 天启：有真几何(polygon)的官方剧本 ──
    app.loadOfficialScenario('tianqi7');
    await new Promise(r => setTimeout(r, 350));
    const sc = JSON.parse(JSON.stringify(app.state.scenario));

    const me = window.convertScenarioToMapEditor(sc);
    ok('R1 天启→ME divisions 非空', me.divisions && me.divisions.length > 0, 'divisions=' + (me.divisions ? me.divisions.length : 0) + ' factions=' + (me.factions ? me.factions.length : 0));

    const withPoly = me.divisions.filter(d => Array.isArray(d.polygon) && d.polygon.length >= 3).length;
    const ratio = me.divisions.length ? withPoly / me.divisions.length : 0;
    ok('R2 几何 polygon 回挂覆盖≥90%', ratio >= 0.9, withPoly + '/' + me.divisions.length + ' = ' + Math.round(ratio * 100) + '%');

    const gm = window.convertMapEditorToGame(me);
    ok('R3 ME→game regions ≥ divisions(含飞地)', gm.regions.length >= me.divisions.length, 'regions=' + gm.regions.length + ' vs divisions=' + me.divisions.length);

    const gmIds = {}; gm.regions.forEach(r => { gmIds[r.id] = 1; });
    const missing = me.divisions.filter(d => !gmIds[d.id]).map(d => d.id);
    ok('R4 division id 往返全保留', missing.length === 0, missing.length ? ('丢 ' + missing.slice(0, 5).join(',')) : 'all kept');

    const facDivs = me.divisions.filter(d => d.factionId);
    const ownedRegions = gm.regions.filter(r => r.owner && String(r.owner).length).length;
    const coordRegions = gm.regions.filter(r => Array.isArray(r.coords) && r.coords.length >= 6).length;
    ok('R5 归属 owner 往返存活', facDivs.length > 0 ? ownedRegions > 0 : true, 'facDivs=' + facDivs.length + ' ownedRegions=' + ownedRegions);
    ok('R6 几何 coords 往返非空≥90%', gm.regions.length ? (coordRegions / gm.regions.length) >= 0.9 : false, coordRegions + '/' + gm.regions.length);

    const ahFacCount = sc.adminHierarchy && typeof sc.adminHierarchy === 'object' ? Object.keys(sc.adminHierarchy).length : 0;
    ok('R7 势力表与 adminHierarchy 对齐', me.factions.length >= 1 && me.factions.length <= ahFacCount + 1, 'meFactions=' + me.factions.length + ' ahFactions=' + ahFacCount);

    // ── 绍宋：无 map 几何，仅 adminHierarchy.divisions，验优雅降级 ──
    app.loadOfficialScenario('shaosong');
    await new Promise(r => setTimeout(r, 350));
    const sc2 = JSON.parse(JSON.stringify(app.state.scenario));
    const me2 = window.convertScenarioToMapEditor(sc2);
    ok('R8 绍宋(无几何)仍产出 divisions', me2.divisions && me2.divisions.length > 0, 'divisions=' + (me2.divisions ? me2.divisions.length : 0) + ' (几何空属正常)');
    const named = me2.divisions.filter(d => d.name && d.name.length).length;
    ok('R9 绍宋 division 名称保留', me2.divisions.length ? named === me2.divisions.length : false, named + '/' + me2.divisions.length);

    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  results.forEach(r => { if (r.pass) pass++; else fail++; console.log((r.pass ? 'PASS ' : 'RED  ') + r.name + (r.info ? '  [' + r.info + ']' : '')); });
  if (errs.length) console.log('pageErrors:', errs.slice(0, 3));
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===');
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
