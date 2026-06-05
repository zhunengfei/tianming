const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };
  const r = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    // 导航磁贴
    const tiles = document.querySelectorAll('#module-rail .module-tile, [data-module-id]').length;
    // 批量导入工作台：触发 bulk-data-workbench
    let bulkOk = false;
    try { if (typeof a.openBulkDataWorkbench === 'function') bulkOk = true; } catch (e) {}
    // parseDelimitedRows 导出?
    const apiKeys = Object.keys(a).filter(k => /bulk|delimit|import/i.test(k));
    return { tiles, bulkOk, apiKeys };
  });
  console.log('  导航磁贴数=' + r.tiles + ' · bulk相关API=' + r.apiKeys.join(','));
  ok(r.tiles >= 9, '模块导航磁贴存在(9章) got ' + r.tiles);
  // 跳到批量工作台
  const bulk = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    a.state.selectedField = 'characters';
    if (typeof a.setWorkbenchPanel === 'function') a.setWorkbenchPanel('bulk-data-workbench');
    return { panel: a.state.workbenchPanel || a.state.activeWorkbenchPanel, hasInput: !!document.getElementById('bulk-import-input') };
  });
  await p.waitForTimeout(150);
  const bulkUi = await p.evaluate(() => ({ hasInput: !!document.getElementById('bulk-import-input'), hasMode: !!document.getElementById('bulk-import-mode'), bodyHasBulk: /批量导入/.test(document.body.textContent) }));
  console.log('  批量工作台: 输入框=' + bulkUi.hasInput + ' 模式=' + bulkUi.hasMode + ' 含"批量导入"文案=' + bulkUi.bodyHasBulk);
  ok(bulkUi.hasInput || bulkUi.bodyHasBulk, 'CSV批量导入工作台存在');
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
