// 地图接入 · 刀4 行为验证：御案迷你几何 —— 点选地块 / 快编条 / 高亮 / 改归属即时上色（经 applyMapPatch）。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';

(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext()).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });

  const res = await p.evaluate(async () => {
    const out = [];
    const ok = (n, c, i) => out.push({ name: n, pass: !!c, info: i || '' });
    const fire = (el) => el && el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    ok('S0 selectMapRegion/applySelectedRegionOwner 已导出', typeof app.selectMapRegion === 'function' && typeof app.applySelectedRegionOwner === 'function');

    app.loadOfficialScenario('tianqi7');
    await new Promise(r => setTimeout(r, 350));
    // 进入 map 字段 + 结构化工作台
    app.state.selectedField = 'map';
    app.state.selectedModuleId = 'adminMap';
    app.setWorkbenchPanel('structured-workbench');
    await new Promise(r => setTimeout(r, 250));

    var svgPaths = document.querySelectorAll('.map-mini-svg path');
    ok('S1 SVG 渲染出地块形（regionSvgPath）', svgPaths.length > 0, 'svgPaths=' + svgPaths.length);
    var paths = document.querySelectorAll('[data-editor-command="select-map-region"]');
    ok('S2 地块可点选', paths.length > 0, 'selectable=' + paths.length);
    if (!paths.length) return out;

    var first = paths[0];
    var firstIdx = Number(first.dataset.mapRegionIndex);
    var fillBefore = first.getAttribute('fill');
    fire(first);
    await new Promise(r => setTimeout(r, 180));
    ok('S3 点选写入 selection', app.state.mapSelectedRegionIndex === firstIdx, 'sel=' + app.state.mapSelectedRegionIndex + ' want=' + firstIdx);

    var strip = document.querySelector('.map-selected-strip [data-map-sel-owner]');
    ok('S4 快编条出现(归属下拉)', !!strip, strip ? 'present' : 'absent');
    var selPath = document.querySelector('[data-map-region-index="' + firstIdx + '"][data-editor-command="select-map-region"]');
    ok('S5 选中地块描边高亮', !!(selPath && selPath.getAttribute('stroke')), 'stroke=' + (selPath && selPath.getAttribute('stroke')));
    if (!strip) return out;

    // 改归属：挑一个与当前不同的 faction
    var region = app.state.scenario.map.regions[firstIdx];
    var beforeOwner = region.ownerKey || '';
    var optVals = Array.prototype.map.call(strip.options, o => o.value).filter(v => v && v !== beforeOwner);
    var newOwner = optVals[0] || '';
    strip.value = newOwner;
    var beforeHist = app.state.history.length;
    app.applySelectedRegionOwner();
    await new Promise(r => setTimeout(r, 180));
    var after = app.state.scenario.map.regions[firstIdx];
    ok('S6 改归属落库 ownerKey', after.ownerKey === newOwner, 'before=' + beforeOwner + ' set=' + newOwner + ' after=' + after.ownerKey);
    ok('S7 经 applyMapPatch(历史增长+镜像)', app.state.history.length > beforeHist && (!app.state.scenario.mapData || app.state.scenario.mapData.regions[firstIdx].ownerKey === newOwner), 'hist ' + beforeHist + '→' + app.state.history.length);
    var repath = document.querySelector('[data-map-region-index="' + firstIdx + '"][data-editor-command="select-map-region"]');
    var fillAfter = repath && repath.getAttribute('fill');
    ok('S8 重渲染后地块上色(fill 仍在)', !!fillAfter, 'fillBefore=' + fillBefore + ' fillAfter=' + fillAfter + (fillAfter !== fillBefore ? ' (变色)' : ' (同色)'));

    // 取消选择
    var clearBtn = document.querySelector('[data-editor-command="clear-map-selection"]');
    fire(clearBtn);
    await new Promise(r => setTimeout(r, 150));
    ok('S9 取消选择清空 selection', app.state.mapSelectedRegionIndex == null, 'sel=' + app.state.mapSelectedRegionIndex);

    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  res.forEach(r => { if (r.pass) pass++; else fail++; console.log((r.pass ? 'PASS ' : 'RED  ') + r.name + (r.info ? '  [' + r.info + ']' : '')); });
  if (errs.length) console.log('pageErrors:', errs.slice(0, 3));
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===');
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
