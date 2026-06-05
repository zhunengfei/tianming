const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7')); await p.waitForTimeout(450);
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP; const adapter = window.TM.AuthoringAgent.makeResetEditorAdapter(window);
    app.state.selectedModuleId = 'eventsChronicle'; app.setWorkbenchPanel('structured-workbench'); await new Promise(r => setTimeout(r, 200));
    var before = { mod: app.state.selectedModuleId, panel: app.state.workbenchPanel || app.state.activePanel || app.state.panel, hostExists: !!document.getElementById('module-primary-view') };
    var draft = JSON.parse(JSON.stringify(adapter.getScenario())); draft.events[0].name = '国师改的事件X';
    adapter.commit(draft); await new Promise(r => setTimeout(r, 250));
    var host = document.getElementById('module-primary-view');
    var after = { mod: app.state.selectedModuleId, panel: app.state.workbenchPanel || app.state.activePanel || app.state.panel, hostExists: !!host, hostLen: host ? host.innerHTML.length : 0, hostHead: host ? host.innerHTML.slice(0, 90).replace(/\s+/g, ' ') : '', dataName: (app.state.scenario.events[0] || {}).name };
    // 强制 reRenderModulePrimary 看是否就生效
    var forced = null;
    if (app.reRenderModulePrimary) { app.reRenderModulePrimary(); var h2 = document.getElementById('module-primary-view'); forced = h2 ? h2.innerHTML.indexOf('国师改的事件X') >= 0 : false; }
    return { before: before, after: after, dataUpdated: (app.state.scenario.events[0] || {}).name === '国师改的事件X', forcedReRenderShows: forced };
  });
  console.log(JSON.stringify(r, null, 1)); await b.close(); process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
