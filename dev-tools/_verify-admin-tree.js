const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

  await p.evaluate(() => { const a = window.TM_SCENARIO_EDITOR_RESET_APP; a.state.selectedModuleId = 'adminMap'; a.state._adminFaction = null; a.state._adminExpanded = {}; document.getElementById('module-primary-view').innerHTML = a.renderAdminFolio(); });
  await p.waitForTimeout(150);
  const base = await p.evaluate(() => ({
    nodes: document.querySelectorAll('#module-primary-view .adt-node').length,
    togs: document.querySelectorAll('#module-primary-view .adt-tog:not(.adt-tog-leaf)').length,
    hasExpandAll: !!document.querySelector('[data-editor-command="admin-expand-all"]')
  }));
  console.log('  默认(收起): 可见节点=' + base.nodes + ' 可展开节点=' + base.togs + ' 展开全部按钮=' + base.hasExpandAll);
  ok(base.nodes < 40, '默认只显顶级省道(明朝廷17省·非429全展开) got ' + base.nodes);
  ok(base.togs > 10, '省级节点有展开切换钮');
  ok(base.hasExpandAll, '展开全部按钮存在');

  // 点第一个 toggle 展开北直隶
  const afterTog = await p.evaluate(() => {
    const tog = document.querySelector('#module-primary-view .adt-tog:not(.adt-tog-leaf)');
    tog.click();
    return { nodes: document.querySelectorAll('#module-primary-view .adt-node').length };
  });
  await p.waitForTimeout(120);
  console.log('  展开第一省后: 可见节点=' + afterTog.nodes);
  ok(afterTog.nodes > base.nodes, '展开一省后显出府州子级 (' + base.nodes + '→' + afterTog.nodes + ')');

  // 展开全部
  const expAll = await p.evaluate(() => {
    document.querySelector('[data-editor-command="admin-expand-all"]').click();
    return { nodes: document.querySelectorAll('#module-primary-view .adt-node').length };
  });
  await p.waitForTimeout(150);
  console.log('  展开全部后: 可见节点=' + expAll.nodes);
  ok(expAll.nodes > 100, '展开全部显出大量府州 got ' + expAll.nodes);

  // 收起全部
  const colAll = await p.evaluate(() => {
    document.querySelector('[data-editor-command="admin-collapse-all"]').click();
    return { nodes: document.querySelectorAll('#module-primary-view .adt-node').length };
  });
  await p.waitForTimeout(120);
  console.log('  收起全部后: 可见节点=' + colAll.nodes);
  ok(colAll.nodes < 40, '收起全部回到顶级 got ' + colAll.nodes);

  ok(errs.length === 0, '无 pageerror: ' + errs.slice(0,2).join('|'));
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
