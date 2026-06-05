// 地图接入 · 刀4b 行为验证：轻调形 —— 拖现有顶点改省界（经 applyMapPatch 同步回写 polygon/path/coords）。
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
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    ok('V0 regionVertices/commitVertexDrag 已导出', typeof app.regionVertices === 'function' && typeof app.commitVertexDrag === 'function');

    app.loadOfficialScenario('tianqi7');
    await new Promise(r => setTimeout(r, 350));
    app.state.selectedField = 'map';
    app.state.selectedModuleId = 'adminMap';
    app.setWorkbenchPanel('structured-workbench');
    await new Promise(r => setTimeout(r, 200));
    app.selectMapRegion(0);
    await new Promise(r => setTimeout(r, 200));

    var svg = document.querySelector('svg.map-mini-svg');
    var handles = document.querySelectorAll('[data-map-vertex]');
    ok('V1 选中地块渲染出顶点手柄', handles.length > 0, 'handles=' + handles.length);
    if (!svg || !handles.length) return out;
    var rect = svg.getBoundingClientRect();
    var ctm = svg.getScreenCTM();
    ok('V2 SVG 有布局可换算坐标', rect.width > 0 && !!ctm, 'w=' + Math.round(rect.width) + ' ctm=' + !!ctm);
    if (!ctm) return out;

    var region0Before = app.state.scenario.map.regions[0];
    var pathBefore = region0Before.path || region0Before.d || '';
    var vertsBefore = app.regionVertices(region0Before);
    var vCountBefore = vertsBefore.length;

    var h0 = handles[0];
    var vi = Number(h0.dataset.mapVertex);
    var cx = Number(h0.getAttribute('cx')), cy = Number(h0.getAttribute('cy'));
    var tx = cx + 40, ty = cy + 25; // 目标 viewBox 坐标
    function screenOf(x, y) { var pt = svg.createSVGPoint(); pt.x = x; pt.y = y; var s = pt.matrixTransform(svg.getScreenCTM()); return { x: s.x, y: s.y }; }
    var from = screenOf(cx, cy), to = screenOf(tx, ty);

    var beforeHist = app.state.history.length;
    h0.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: from.x, clientY: from.y, view: window }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: to.x, clientY: to.y, view: window }));
    // 拖拽中：实时预览应已改 path d
    var liveD = (document.querySelector('[data-map-region-index="0"][data-editor-command="select-map-region"]') || {}).getAttribute ? document.querySelector('[data-map-region-index="0"][data-editor-command="select-map-region"]').getAttribute('d') : '';
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: to.x, clientY: to.y, view: window }));

    // V9 守卫：mouseup 后浏览器会立刻补发 click，若落到别的地块不应改选择（同步紧贴 mouseup 测，才是真场景）
    var selBefore9 = app.state.mapSelectedRegionIndex;
    app.selectMapRegion(5);
    ok('V9 拖后即点被守卫吞掉(防误选)', app.state.mapSelectedRegionIndex === selBefore9, 'sel ' + selBefore9 + '→' + app.state.mapSelectedRegionIndex + ' (应不变)');

    await new Promise(r => setTimeout(r, 180));

    var region0After = app.state.scenario.map.regions[0];
    var vertsAfter = app.regionVertices(region0After);
    var dx = vertsAfter[vi] ? vertsAfter[vi][0] - cx : 0, dy = vertsAfter[vi] ? vertsAfter[vi][1] - cy : 0;
    // 小图缩放(~6 viewBox单位/屏px)致合成事件像素取整，故验「朝目标方向移动 ≈+40/+25」而非像素精确
    ok('V3 顶点朝拖拽方向移动(≈+40,+25)', dx >= 25 && dx <= 55 && dy >= 12 && dy <= 38, 'vi=' + vi + ' delta=[' + dx + ',' + dy + '] (目标≈[40,25])');
    ok('V4 顶点数不变(只调不增删)', vertsAfter.length === vCountBefore, vCountBefore + '→' + vertsAfter.length);
    ok('V5 path 已改写', (region0After.path || region0After.d || '') !== pathBefore, 'changed=' + ((region0After.path || region0After.d || '') !== pathBefore));
    ok('V6 polygon 与 path 同步回写', Array.isArray(region0After.polygon) && region0After.polygon[vi] && region0After.polygon[vi][0] === vertsAfter[vi][0] && region0After.polygon[vi][1] === vertsAfter[vi][1], 'polygon[vi]=[' + (region0After.polygon ? region0After.polygon[vi] : 'none') + '] verts[vi]=[' + (vertsAfter[vi] || []) + ']');
    ok('V7 经 applyMapPatch(历史增长)', app.state.history.length > beforeHist, beforeHist + '→' + app.state.history.length);
    ok('V8 拖拽中实时预览改了path', liveD && liveD !== pathBefore, 'livePreview=' + (liveD && liveD !== pathBefore));

    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  res.forEach(r => { if (r.pass) pass++; else fail++; console.log((r.pass ? 'PASS ' : 'RED  ') + r.name + (r.info ? '  [' + r.info + ']' : '')); });
  if (errs.length) console.log('pageErrors:', errs.slice(0, 3));
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===');
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
