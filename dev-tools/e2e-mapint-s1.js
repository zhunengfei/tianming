// 地图接入 · 刀1 行为验证：applyMapPatch 是否真守住不变量（写入落地 / map↔mapData 镜像 / 归一化 / normalize:false 保留 / 历史 / 不回归）。
// 跑前先起 8080 静态服务器。PW_PATH 指 playwright，channel msedge。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';

(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });

  const results = await p.evaluate(async () => {
    const out = [];
    function ok(name, cond, info) { out.push({ name, pass: !!cond, info: info || '' }); }

    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    ok('A1 applyMapPatch 已导出且为函数', typeof app.applyMapPatch === 'function', typeof app.applyMapPatch);
    if (typeof app.applyMapPatch !== 'function') return out;

    app.loadOfficialScenario('tianqi7');
    await new Promise(r => setTimeout(r, 400));

    const sc = app.state.scenario;
    let field = (sc.map && typeof sc.map === 'object') ? 'map' : 'mapData';
    // 确保有地块可测（天启官方应有；缺则用 ensureScaffold 兜底）
    if (!sc[field] || !Array.isArray(sc[field].regions) || !sc[field].regions.length) {
      app.applyMapPatch(function () {}, { ensureScaffold: true, silent: true, skipRender: true });
      field = (sc.map && typeof sc.map === 'object') ? 'map' : 'mapData';
    }
    const regions0 = sc[field] && sc[field].regions;
    ok('A0 有可测地块', Array.isArray(regions0) && regions0.length > 0, field + '.regions=' + (regions0 ? regions0.length : 'none'));
    if (!regions0 || !regions0.length) return out;

    // 强制建立 map↔mapData 双字段，测镜像
    app.state.scenario.mapData = JSON.parse(JSON.stringify(sc[field]));
    app.state.scenario.map = JSON.parse(JSON.stringify(sc[field]));

    // A2/A3 写入落地 + 镜像
    const SENT = '哨兵势力ZZ';
    const histBefore = app.state.history.length;
    app.applyMapPatch(function (m) { m.regions[0].ownerKey = SENT; m.regions[0].currentOwnerKey = ''; m.regions[0].controllerKey = ''; }, { field: 'map', label: '刀1测试·写入' });
    ok('A2 mutate 写入落地到 map', app.state.scenario.map.regions[0].ownerKey === SENT, app.state.scenario.map.regions[0].ownerKey);
    ok('A3 map→mapData 镜像同步', app.state.scenario.mapData.regions[0].ownerKey === SENT, app.state.scenario.mapData.regions[0].ownerKey);

    // A4 默认归一化：currentOwnerKey/controllerKey 从 ownerKey 补齐
    ok('A4 默认归一化补齐 current/controller',
      app.state.scenario.map.regions[0].currentOwnerKey === SENT && app.state.scenario.map.regions[0].controllerKey === SENT,
      'cur=' + app.state.scenario.map.regions[0].currentOwnerKey + ' ctrl=' + app.state.scenario.map.regions[0].controllerKey);

    // A5 normalize:false 保留被清空的 adminBinding（不回填 region.name）
    app.applyMapPatch(function (m) { m.regions[0].adminBinding = ''; }, { field: 'map', normalize: false, label: '刀1测试·清绑定' });
    ok('A5 normalize:false 保留空 adminBinding', app.state.scenario.map.regions[0].adminBinding === '', JSON.stringify(app.state.scenario.map.regions[0].adminBinding));

    // A6 默认 normalize:true 把空 adminBinding 回填为 region.name
    const nm = app.state.scenario.map.regions[0].name || '';
    app.applyMapPatch(function (m) { m.regions[0].adminBinding = ''; }, { field: 'map', label: '刀1测试·归一化回填' });
    ok('A6 默认归一化回填 adminBinding=name', nm ? app.state.scenario.map.regions[0].adminBinding === nm : true, 'name=' + nm + ' bind=' + app.state.scenario.map.regions[0].adminBinding);

    // A7 历史每次带 label 的 patch 都增长
    ok('A7 history 增长', app.state.history.length > histBefore, histBefore + ' → ' + app.state.history.length);

    // A8 回归：现存 saveMapBindings 经 applyMapPatch 仍可无异常调用
    let threw = false;
    try { app.saveMapBindings(); } catch (e) { threw = true; }
    ok('A8 saveMapBindings 不抛异常（回归）', !threw, threw ? 'threw' : 'ok');

    return out;
  });

  await browser.close();

  let pass = 0, fail = 0;
  results.forEach(r => { if (r.pass) pass++; else fail++; console.log((r.pass ? 'PASS ' : 'RED  ') + r.name + (r.info ? '  [' + r.info + ']' : '')); });
  if (errs.length) console.log('pageErrors:', errs.slice(0, 3));
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===');
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
