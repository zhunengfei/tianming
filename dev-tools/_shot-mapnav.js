// 截图：天启载入后的编辑器布局 + 导航到 map 字段后的工作台（确认「去地图编辑器」按钮位置）。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  // 默认视图截图
  await p.screenshot({ path: 'dev-tools/shot-1-default.png' });

  // 载天启
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'dev-tools/shot-2-loaded.png' });

  // 探测：模块/字段导航的可点元素 + adminMap 模块标题
  const nav = await p.evaluate(() => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP;
    var mods = (app.state.modules || []).map(function(m) { return { id: m.id, title: m.title || m.label || '', keys: (m.topLevelKeys || []).slice(0, 6) }; });
    // 找含 map 的模块
    var mapMod = mods.filter(function(m) { return (m.keys || []).indexOf('map') >= 0; });
    // 页面上有没有可点的模块块 / 字段块
    var moduleTiles = [].slice.call(document.querySelectorAll('[data-module-id]')).map(function(e) { return { id: e.dataset.moduleId, text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24) }; }).slice(0, 30);
    var fieldPicks = [].slice.call(document.querySelectorAll('[data-field-pick]')).map(function(e) { return e.dataset.fieldPick; }).slice(0, 40);
    return { mapMod: mapMod, moduleTileCount: moduleTiles.length, moduleTiles: moduleTiles.slice(0, 16), hasMapFieldPick: fieldPicks.indexOf('map') >= 0, fieldPickSample: fieldPicks.slice(0, 20) };
  });
  console.log(JSON.stringify(nav, null, 1));

  // 导航到 map 工作台并截图
  await p.evaluate(() => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP;
    app.state.selectedField = 'map';
    app.state.selectedModuleId = 'adminMap';
    app.setWorkbenchPanel('structured-workbench');
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'dev-tools/shot-3-mapworkbench.png' });
  const btn = await p.evaluate(() => {
    var b = document.querySelector('[data-editor-command="launch-map-editor"]');
    if (!b) return { found: false };
    var r = b.getBoundingClientRect();
    return { found: true, text: b.textContent, x: Math.round(r.x), y: Math.round(r.y), visible: r.width > 0 };
  });
  console.log('launch-button:', JSON.stringify(btn));
  await browser.close();
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
