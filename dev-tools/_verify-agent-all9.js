const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7')); await p.waitForTimeout(450);
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP; const out = []; const ok = (n, c, i) => out.push((c ? 'PASS ' : 'RED  ') + n + (i ? ' [' + i + ']' : ''));
    const adapter = window.TM.AuthoringAgent.makeResetEditorAdapter(window);
    // 模拟：用户停在「开篇」，国师改各章字段 → 应跳到对应章 + 反映
    var cases = [
      { name: '人物', mod: 'peopleLineages', mut: d => d.characters[0].name = '国师改人物A', show: '国师改人物A' },
      { name: '势力', mod: 'factionsSociety', mut: d => d.factions[0].name = '国师改势力B', show: '国师改势力B' },
      { name: '事件', mod: 'eventsChronicle', mut: d => d.events[0].name = '国师改事件C', show: '国师改事件C' },
      { name: '财政', mod: 'economyPopulation', mut: d => d.fiscalConfig.floatingCollectionRate = 0.77, show: '0.77' },
      { name: '军事', mod: 'militaryFrontier', mut: d => d.military.initialTroops[0].name = '国师改部队D', show: '国师改部队D' },
      { name: '官制', mod: 'courtInstitutions', mut: d => d.officeTree[0].positions[0].holder = '国师任命E', show: '国师任命E' },
      { name: '规则', mod: 'rulesAi', mut: d => d.variables[0].name = '国师改变量F', show: '国师改变量F' },
      { name: '行政', mod: 'adminMap', mut: d => { d.adminHierarchy.player.divisions[0].name = '国师改区划G'; }, show: '国师改区划G' },
      { name: '开篇', mod: 'scenarioOpening', mut: d => d.name = '国师改剧本名H', show: '国师改剧本名H' },
    ];
    for (const cs of cases) {
      app.state.selectedModuleId = 'scenarioOpening'; app.setWorkbenchPanel('structured-workbench'); await new Promise(r => setTimeout(r, 120));
      var draft = JSON.parse(JSON.stringify(adapter.getScenario())); cs.mut(draft); adapter.commit(draft); await new Promise(r => setTimeout(r, 220));
      var jumped = app.state.selectedModuleId === cs.mod;
      var H = document.getElementById('module-primary-view');
      var shows = H && H.innerHTML.indexOf(cs.show) >= 0;
      ok(cs.name + ' 跳对章+反映', jumped && shows, '跳' + app.state.selectedModuleId + (shows ? '·见改' : '·没见改'));
    }
    return out;
  });
  r.forEach(x => console.log(x)); await b.close(); process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
