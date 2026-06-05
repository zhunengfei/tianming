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

  // ===== 行政 =====
  await p.evaluate(() => { const a = window.TM_SCENARIO_EDITOR_RESET_APP; a.state.selectedModuleId='adminMap'; a.state._adminFaction=null; a.state._adminView='list'; document.getElementById('module-primary-view').innerHTML=a.renderAdminFolio(); });
  await p.waitForTimeout(120);
  const hasTab = await p.evaluate(() => !!document.querySelector('[data-editor-command="admin-view"][data-admin-view="tree"]'));
  ok(hasTab, '行政有「树状图」切换钮');
  // 切到树状图
  await p.evaluate(() => { document.querySelector('[data-editor-command="admin-view"][data-admin-view="tree"]').click(); });
  await p.waitForTimeout(150);
  const tree = await p.evaluate(() => ({
    wrap: !!document.querySelector('.oc-wrap[data-oc-pan="admin"]'),
    nodes: document.querySelectorAll('.oc-node:not(.oc-root)').length,
    root: !!document.querySelector('.oc-node.oc-root'),
    lines: document.querySelectorAll('.oc-inner svg path').length,
    ctrls: document.querySelectorAll('.oc-ctrls button').length
  }));
  console.log('  行政树: wrap=' + tree.wrap + ' 节点=' + tree.nodes + ' 根=' + tree.root + ' 连线=' + tree.lines + ' 缩放钮=' + tree.ctrls);
  ok(tree.wrap && tree.root, '行政树状图渲染(含根节点)');
  ok(tree.nodes >= 17 && tree.nodes < 60, '默认折叠到省级(17省左右·非429全展) got ' + tree.nodes);
  ok(tree.lines > 10, 'SVG连线渲染');
  // 展开一个省(点 ＋ 圈)
  const expanded = await p.evaluate(() => { const t = document.querySelector('.oc-tog'); if (t) t.click(); return true; });
  await p.waitForTimeout(150);
  const afterExp = await p.evaluate(() => document.querySelectorAll('.oc-node:not(.oc-root)').length);
  console.log('  展开一省后节点=' + afterExp);
  ok(afterExp > tree.nodes, '＋圈展开府州 (' + tree.nodes + '→' + afterExp + ')');
  // 点一个节点选中→详情
  const picked = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const node = document.querySelector('.oc-node[data-editor-command="orgchart-pick"]'); node.click();
    return { sel: a.state._adminDivId, hasDetail: !!document.querySelector('.rwf2-detail') };
  });
  await p.waitForTimeout(120);
  ok(picked.sel && picked.hasDetail, '点树节点→选中区划+右侧详情 (' + picked.sel + ')');
  // 缩放
  await p.evaluate(() => document.querySelector('[data-editor-command="orgchart-zoom"][data-oc-d="0.12"]').click());
  await p.waitForTimeout(100);
  const zoomed = await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.state._orgChart.admin.scale);
  ok(zoomed > 1, '缩放钮放大生效 scale=' + zoomed);

  // ===== 官制 =====
  await p.evaluate(() => { const a = window.TM_SCENARIO_EDITOR_RESET_APP; a.state.selectedModuleId='courtInstitutions'; a.state._officeView='tree'; document.getElementById('module-primary-view').innerHTML=a.renderOfficeFolio(); });
  await p.waitForTimeout(150);
  const off = await p.evaluate(() => ({
    wrap: !!document.querySelector('.oc-wrap[data-oc-pan="office"]'),
    nodes: document.querySelectorAll('.oc-node:not(.oc-root)').length,
    tab: !!document.querySelector('[data-editor-command="office-view"][data-office-view="tree"]')
  }));
  console.log('  官制树: wrap=' + off.wrap + ' 节点=' + off.nodes + ' 切换钮=' + off.tab);
  ok(off.wrap && off.tab, '官制树状图渲染+切换钮');
  ok(off.nodes >= 10, '官制衙门节点渲染 got ' + off.nodes);
  // 点官制节点→编辑该衙门官职
  const offPick = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const node = document.querySelector('.oc-node[data-editor-command="orgchart-pick"]'); node.click();
    return { sel: a.state._officeNodeId, hasPosHead: !!document.querySelector('.oft-poshead, .oft-node') };
  });
  await p.waitForTimeout(120);
  ok(offPick.sel != null && offPick.hasPosHead, '点官制节点→编辑该衙门官职 (' + offPick.sel + ')');

  ok(errs.length === 0, '无 pageerror: ' + errs.slice(0,2).join('|'));
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
