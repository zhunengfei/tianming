const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(600);
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

  // revealPath 到 characters.5 → 选中第5人 + 模块=人物 + 卡片高亮
  const r = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const target = a.state.scenario.characters[5].name;
    a.revealPath('characters.5.name');
    return { mod: a.state.selectedModuleId, sel: a.state._folioSel, targetName: target, detailName: (document.querySelector('#module-primary-view .rwf2-dh-t b, #module-primary-view .rwf2-dh b')||{}).textContent };
  });
  console.log('  revealPath(characters.5): 模块=' + r.mod + ' _folioSel=' + r.sel + ' 目标=' + r.targetName + ' 详情显示=' + r.detailName);
  ok(r.mod === 'peopleLineages', '跳到人物模块');
  ok(r.sel === 5, '_folioSel=5 (精确选中第5人)');
  ok(r.detailName && r.detailName.indexOf(r.targetName) >= 0, '右侧详情显示的就是第5人');

  // revealPath 到 factions.3
  const r2 = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const t = a.state.scenario.factions[3].name;
    a.revealPath('factions.3.leader');
    return { mod: a.state.selectedModuleId, sel: a.state._facFolioSel, t };
  });
  console.log('  revealPath(factions.3): 模块=' + r2.mod + ' _facFolioSel=' + r2.sel);
  ok(r2.mod === 'factionsSociety' && r2.sel === 3, '势力跳转精确到第3方');

  // revealPath 到 events.10
  const r3 = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    a.revealPath('events.10.name');
    return { mod: a.state.selectedModuleId, sel: a.state._genSel && a.state._genSel.events };
  });
  ok(r3.mod === 'eventsChronicle' && r3.sel === 10, '事件跳转精确到第10条');

  ok(errs.length === 0, '无 pageerror: ' + errs.slice(0,2).join('|'));
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
