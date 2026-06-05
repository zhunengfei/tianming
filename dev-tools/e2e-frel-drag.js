// B-2 节点拖拽 行为验证。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(450);

  const r = await p.evaluate(async () => {
    const out = []; const ok = (n, c, i) => out.push({ name: n, pass: !!c, info: i || '' });
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    app.state.selectedModuleId = 'factionsSociety'; app.state.selectedField = 'factions';
    app.setWorkbenchPanel('structured-workbench');
    await new Promise(r => setTimeout(r, 200));
    var host = document.getElementById('module-primary-view');
    var svg = host && host.querySelector('.frel-svg');
    ok('D0 图谱+节点在', !!(svg && host.querySelector('[data-frel-node]')), svg ? 'nodes=' + host.querySelectorAll('[data-frel-node]').length : 'no-svg');
    if (!svg) return out;

    var g = host.querySelector('[data-frel-node]');
    var name = g.dataset.frelNode;
    var m = (g.getAttribute('transform') || '').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    var cx = +m[1], cy = +m[2];
    var tx = cx + 60, ty = cy - 40;
    function screenOf(x, y) { var pt = svg.createSVGPoint(); pt.x = x; pt.y = y; var sp = pt.matrixTransform(svg.getScreenCTM()); return { x: sp.x, y: sp.y }; }
    var from = screenOf(cx, cy), to = screenOf(tx, ty);

    g.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: from.x, clientY: from.y, view: window }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: to.x, clientY: to.y, view: window }));
    var liveTransform = host.querySelector('[data-frel-node="' + name + '"]').getAttribute('transform');
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: to.x, clientY: to.y, view: window }));
    await new Promise(r => setTimeout(r, 150));

    var pos = app.state._frelPos && app.state._frelPos[name];
    var dx = pos ? pos[0] - cx : 0, dy = pos ? pos[1] - cy : 0;
    ok('D1 拖动落 _frelPos(朝目标≈+60,-40)', pos && dx >= 40 && dx <= 80 && dy <= -20 && dy >= -60, 'pos=' + JSON.stringify(pos) + ' from[' + cx + ',' + cy + '] d[' + dx + ',' + dy + ']');
    ok('D2 拖中实时移动节点', liveTransform && liveTransform !== 'translate(' + cx + ' ' + cy + ')', 'live=' + liveTransform);
    var host2 = document.getElementById('module-primary-view');
    var g2 = host2.querySelector('[data-frel-node="' + name + '"]');
    var m2 = (g2.getAttribute('transform') || '').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    ok('D3 重渲后节点保持新位', m2 && Math.abs(+m2[1] - (pos ? pos[0] : cx)) <= 1, 'transform=' + (g2 && g2.getAttribute('transform')));
    // 连边端点跟随：找一条连到该节点的边，验端点≈新位
    var edge = Array.prototype.filter.call(host2.querySelectorAll('[data-frel-index]'), e => e.getAttribute('data-frel-from') === name || e.getAttribute('data-frel-to') === name)[0];
    var follow = false;
    if (edge && pos) {
      var end = edge.getAttribute('data-frel-from') === name ? ['x1', 'y1'] : ['x2', 'y2'];
      var ln = edge.querySelector('line');
      follow = ln && Math.abs(+ln.getAttribute(end[0]) - pos[0]) <= 1 && Math.abs(+ln.getAttribute(end[1]) - pos[1]) <= 1;
    }
    ok('D4 连边端点跟随节点', edge ? follow : true, 'edge=' + !!edge + ' follow=' + follow);

    // 拖后守卫吞掉误触 tap
    var selBefore = app.state._frelSelNode;
    app.tapFrelNode('某不存在势力XYZ');
    ok('D5 拖后即点被守卫吞', app.state._frelSelNode === selBefore, 'sel ' + selBefore + '→' + app.state._frelSelNode);
    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  r.forEach(x => { if (x.pass) pass++; else fail++; console.log((x.pass ? 'PASS ' : 'RED  ') + x.name + (x.info ? '  [' + x.info + ']' : '')); });
  if (errs.length) console.log('pageErrors:', errs.slice(0, 3));
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===');
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
