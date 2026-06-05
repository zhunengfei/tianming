// B 势力外交关系图谱 行为验证 + 截图。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 940 }, deviceScaleFactor: 1.4 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);

  const r = await p.evaluate(() => {
    const out = []; const ok = (n, c, i) => out.push({ name: n, pass: !!c, info: i || '' });
    const fire = (el) => el && el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    ok('B0 导出', typeof app.renderFactionRelationFolio === 'function' && typeof app.selectFrelEdge === 'function');
    app.state.selectedModuleId = 'factionsSociety';
    app.state.selectedField = 'factions';
    app.setWorkbenchPanel('structured-workbench');

    var host = document.getElementById('module-primary-view');
    ok('B1 势力章主视图=关系图谱', !!(host && host.querySelector('.frel-svg')), host ? 'has-svg=' + !!host.querySelector('.frel-svg') : 'no-host');
    if (!host || !host.querySelector('.frel-svg')) return out;
    var edges = host.querySelectorAll('[data-editor-command="frel-select-edge"]');
    var nodes = host.querySelectorAll('[data-editor-command="frel-tap-node"]');
    ok('B2 节点+连线渲染', edges.length > 0 && nodes.length > 0, 'nodes=' + nodes.length + ' edges=' + edges.length);
    if (!edges.length) return out;

    // 点连线 → 选中 + 编辑条
    var idx = Number(edges[0].dataset.frelIndex);
    fire(edges[0]);
    var strip = document.getElementById('module-primary-view').querySelector('.frel-edit [data-frel-field="value"]');
    ok('B3 点连线弹就地编辑条', app.state._frelSelEdge === idx && !!strip, 'sel=' + app.state._frelSelEdge + ' strip=' + !!strip);
    if (!strip) return out;

    // 改倾向 → 落库 + recolor
    strip.value = '-90'; strip.dispatchEvent(new Event('change', { bubbles: true }));
    ok('B4 改倾向落库', app.state.scenario.factionRelations[idx].value === -90, 'value=' + app.state.scenario.factionRelations[idx].value);
    var line = document.getElementById('module-primary-view').querySelector('[data-frel-index="' + idx + '"] line');
    ok('B5 敌对→红线 recolor', line && line.getAttribute('stroke') === '#a83228', 'stroke=' + (line && line.getAttribute('stroke')));

    // 改类型 → 落库
    var typeSel = document.getElementById('module-primary-view').querySelector('.frel-edit [data-frel-field="type"]');
    if (typeSel) { typeSel.value = 'alliance'; typeSel.dispatchEvent(new Event('change', { bubbles: true })); }
    ok('B6 改类型落库', app.state.scenario.factionRelations[idx].type === 'alliance', 'type=' + app.state.scenario.factionRelations[idx].type);

    // 点势力→再点另一势力 = 建新关系
    app.state._frelSelEdge = -1; app.state._frelSelNode = null;
    var host2 = document.getElementById('module-primary-view');
    var ns = host2.querySelectorAll('[data-editor-command="frel-tap-node"]');
    var nameA = ns[0].dataset.frelNode, nameB = null;
    for (var k = 1; k < ns.length; k++) { if (ns[k].dataset.frelNode !== nameA) { nameB = ns[k].dataset.frelNode; break; } }
    var before = app.state.scenario.factionRelations.length;
    fire(ns[0]);
    var host3 = document.getElementById('module-primary-view');
    var nb = Array.prototype.filter.call(host3.querySelectorAll('[data-editor-command="frel-tap-node"]'), e => e.dataset.frelNode === nameB)[0];
    fire(nb);
    ok('B7 点两势力建新关系', app.state.scenario.factionRelations.length >= before && app.state._frelSelEdge >= 0 && !app.state._frelSelNode, 'len ' + before + '→' + app.state.scenario.factionRelations.length + ' selEdge=' + app.state._frelSelEdge);

    return out;
  });

  // 截图（强制展开 + 滚到主视图）
  await p.evaluate(() => { document.querySelectorAll('details.deep-bench,details.field-index,details.adv-fields').forEach(d => d.open = false); var el = document.getElementById('module-primary-view'); if (el) el.scrollIntoView({ block: 'start' }); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: 'dev-tools/shot-frel-chapter.png' });
  const box = await p.evaluate(() => { var el = document.getElementById('module-primary-view'); if (!el) return null; var b = el.getBoundingClientRect(); return { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(1000, b.width), height: Math.min(880, b.height) }; });
  if (box && box.width > 50) await p.screenshot({ path: 'dev-tools/shot-frel-only.png', clip: box });

  await browser.close();
  let pass = 0, fail = 0;
  r.forEach(x => { if (x.pass) pass++; else fail++; console.log((x.pass ? 'PASS ' : 'RED  ') + x.name + (x.info ? '  [' + x.info + ']' : '')); });
  if (errs.length) console.log('pageErrors:', errs.slice(0, 3));
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===  (shot-frel-only.png)');
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
