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
    ok('adapter 可用', adapter.isAvailable());
    // 对每个新章：导航→agent读context→agent commit改一个字段→看主画布反映
    var cases = [
      { mod: 'eventsChronicle', titleHas: '事件', mut: function(d){ d.events[0].name='国师改的事件X'; }, shows: '国师改的事件X' },
      { mod: 'economyPopulation', titleHas: '', mut: function(d){ d.fiscalConfig.floatingCollectionRate=0.99; }, shows: '0.99' },
      { mod: 'militaryFrontier', titleHas: '', mut: function(d){ d.military.initialTroops[0].name='国师改的部队Y'; }, shows: '国师改的部队Y' },
      { mod: 'courtInstitutions', titleHas: '', mut: function(d){ d.officeTree[0].positions[0].holder='国师任命Z'; }, shows: '国师任命Z' },
    ];
    for (const cs of cases) {
      app.state.selectedModuleId = cs.mod; app.setWorkbenchPanel('structured-workbench'); await new Promise(r => setTimeout(r, 200));
      var ctx = adapter.getContext();
      if (cs.titleHas) ok('context知道当前章 ' + cs.mod, ctx.indexOf(cs.titleHas) >= 0, ctx);
      var draft = JSON.parse(JSON.stringify(adapter.getScenario()));
      cs.mut(draft);
      adapter.commit(draft); await new Promise(r => setTimeout(r, 200));
      var H = document.getElementById('module-primary-view');
      ok('commit后主画布反映 ' + cs.mod, H && H.innerHTML.indexOf(cs.shows) >= 0, '找' + cs.shows);
    }
    // markAgentTouched 闪烁覆盖检查
    var mptk = (function(){ try { return JSON.stringify(Object.keys(app.MODULE_PRIMARY_TOUCH_KEYS||{})); } catch(e){ return 'n/a(私有)'; } })();
    out.push('INFO MODULE_PRIMARY_TOUCH_KEYS=' + mptk);
    return out;
  });
  r.forEach(x => console.log(x)); await b.close(); process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
