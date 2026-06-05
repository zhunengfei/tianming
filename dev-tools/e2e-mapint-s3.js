// 地图接入 · 刀3 行为验证：御案↔地图编辑器 跳转往返 handoff 三段。
// Leg A 御案 launchMapEditor 写交接键+开 URL；Leg C 御案 ingestMapReturn 读回写库；
// Leg B 真地图编辑器页载入交接地图+注入返回按钮+点返回写返回键。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const BASE = process.env.AU_URL || 'http://127.0.0.1:8080';
const PREVIEW = BASE + '/preview/scenario-editor-reset-preview.html';
const MAPED = BASE + '/map-editor.html?tmFromJuben=1';
const HANDOFF_KEY = 'tm.scenarioEditorReset.mapHandoff.v1';
const RETURN_KEY = 'tm.scenarioEditorReset.mapReturn.v1';

(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const out = [];
  const ok = (name, cond, info) => out.push({ name, pass: !!cond, info: info || '' });

  // ── 御案页：Leg A + Leg C ──
  await p.goto(PREVIEW, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });

  const phase1 = await p.evaluate(async (keys) => {
    const res = {};
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    res.bridgeFromHtml = typeof (window.MapEditorBridge && window.MapEditorBridge.convertScenarioToMapEditor) === 'function';
    res.launchExported = typeof app.launchMapEditor === 'function';
    res.ingestExported = typeof app.ingestMapReturn === 'function';

    app.loadOfficialScenario('tianqi7');
    await new Promise(r => setTimeout(r, 350));

    // Leg A：launch 写交接键 + 开 URL（拦截 window.open）
    try { localStorage.removeItem(keys.HANDOFF_KEY); localStorage.removeItem(keys.RETURN_KEY); } catch (e) {}
    let openedUrl = null;
    const realOpen = window.open;
    window.open = function (u) { openedUrl = u; return { closed: false }; };
    app.launchMapEditor();
    window.open = realOpen;
    let handoff = null;
    try { handoff = JSON.parse(localStorage.getItem(keys.HANDOFF_KEY)); } catch (e) {}
    res.legA_openUrl = openedUrl;
    res.legA_handoffDivs = handoff && handoff.native && handoff.native.divisions ? handoff.native.divisions.length : 0;
    res.nativeForPhase2 = handoff && handoff.native ? handoff.native : null;

    // Leg C：构造 return 键 → ingest → 验证写回
    const native = window.MapEditorBridge.convertScenarioToMapEditor(app.state.scenario);
    localStorage.setItem(keys.RETURN_KEY, JSON.stringify({ native: native, source: 'map-editor' }));
    // 先打乱当前 map，确认 ingest 真覆盖
    app.state.scenario.map = { regions: [{ id: 'stale', name: '陈旧' }] };
    app.ingestMapReturn();
    const sc = app.state.scenario;
    res.legC_regionCount = (sc.map && sc.map.regions || []).length;
    res.legC_firstHasOwnerKey = !!(sc.map && sc.map.regions && sc.map.regions[0] && sc.map.regions[0].ownerKey);
    res.legC_adminHierarchyKeys = sc.adminHierarchy && typeof sc.adminHierarchy === 'object' ? Object.keys(sc.adminHierarchy).length : 0;
    res.legC_returnKeyCleared = !localStorage.getItem(keys.RETURN_KEY);
    res.legC_stillStale = (sc.map && sc.map.regions || []).some(r => r.id === 'stale');
    return res;
  }, { HANDOFF_KEY, RETURN_KEY });

  ok('A0 御案 HTML 已引入 MapEditorBridge', phase1.bridgeFromHtml, 'bridge=' + phase1.bridgeFromHtml);
  ok('A1 launchMapEditor/ingestMapReturn 已导出', phase1.launchExported && phase1.ingestExported, 'launch=' + phase1.launchExported + ' ingest=' + phase1.ingestExported);
  ok('A2 launch 打开地图编辑器 URL', /map-editor\.html\?tmFromJuben=1/.test(phase1.legA_openUrl || ''), phase1.legA_openUrl);
  ok('A3 launch 写交接键(divisions>0)', phase1.legA_handoffDivs > 0, 'divs=' + phase1.legA_handoffDivs);
  ok('C1 ingest 覆盖写回 regions', phase1.legC_regionCount > 1 && !phase1.legC_stillStale, 'regions=' + phase1.legC_regionCount + ' stale残留=' + phase1.legC_stillStale);
  ok('C2 ingest 回种 ownerKey', phase1.legC_firstHasOwnerKey, 'firstOwnerKey=' + phase1.legC_firstHasOwnerKey);
  ok('C3 ingest 写 adminHierarchy', phase1.legC_adminHierarchyKeys > 0, 'facKeys=' + phase1.legC_adminHierarchyKeys);
  ok('C4 ingest 清返回键', phase1.legC_returnKeyCleared, 'cleared=' + phase1.legC_returnKeyCleared);

  // ── 真地图编辑器页：Leg B ──
  const native = phase1.nativeForPhase2;
  if (!native) {
    ok('B0 取到 phase1 native', false, 'native=null·跳过 Leg B');
  } else {
    ok('B0 取到 phase1 native', true, 'divs=' + (native.divisions || []).length);
    await p.addInitScript((data) => {
      try { localStorage.setItem('tm.scenarioEditorReset.mapHandoff.v1', data); } catch (e) {}
    }, JSON.stringify({ native: native, source: 'scenario-editor-reset-preview' }));
    await p.goto(MAPED, { waitUntil: 'domcontentloaded' });
    let loadedDivs = 0, btn = false, returnWritten = 0;
    try {
      await p.waitForFunction(() => {
        var m = window.TM && window.TM.MapEditor;
        return m && m.EDITOR && m.EDITOR.map && Array.isArray(m.EDITOR.map.divisions) && m.EDITOR.map.divisions.length > 0;
      }, { timeout: 30000 });
      loadedDivs = await p.evaluate(() => window.TM.MapEditor.EDITOR.map.divisions.length);
      await p.waitForSelector('#juben-return-btn', { timeout: 5000 });
      btn = await p.evaluate(() => !!document.getElementById('juben-return-btn'));
      // 点返回（拦截 window.close 防真关）
      returnWritten = await p.evaluate(() => {
        window.close = function () {};
        try { localStorage.removeItem('tm.scenarioEditorReset.mapReturn.v1'); } catch (e) {}
        document.getElementById('juben-return-btn').click();
        var raw = localStorage.getItem('tm.scenarioEditorReset.mapReturn.v1');
        var pl = raw ? JSON.parse(raw) : null;
        return pl && pl.native && pl.native.divisions ? pl.native.divisions.length : 0;
      });
    } catch (e) { errs.push('LegB:' + String(e).slice(0, 120)); }
    ok('B1 地图编辑器载入交接地图', loadedDivs > 0, 'loadedDivs=' + loadedDivs + ' vs handoff=' + (native.divisions || []).length);
    ok('B2 注入「返回剧本」按钮', btn, 'btn=' + btn);
    ok('B3 点返回写返回键(divisions>0)', returnWritten > 0, 'returnDivs=' + returnWritten);
  }

  await browser.close();
  let pass = 0, fail = 0;
  out.forEach(r => { if (r.pass) pass++; else fail++; console.log((r.pass ? 'PASS ' : 'RED  ') + r.name + (r.info ? '  [' + r.info + ']' : '')); });
  if (errs.length) console.log('pageErrors/notes:', errs.slice(0, 4));
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
