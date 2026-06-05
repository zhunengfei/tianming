const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP, st = a.state;
    st.selectedModuleId = 'adminMap';
    // 找一个含无地块区划的势力 key
    const ah = st.scenario.adminHierarchy;
    let fk = Object.keys(ah).find(k => /播州|郑氏|陕北|奢安/.test(ah[k].factionName || ''));
    st._adminFaction = fk; st._adminDivId = null;
    document.getElementById('module-primary-view').innerHTML = a.renderAdminFolio();
    return {
      fk, faction: ah[fk].factionName,
      nobind: document.querySelectorAll('#module-primary-view .adt-nobind').length,
      nobindTxt: (document.querySelector('#module-primary-view .adt-nobind')||{}).textContent || ''
    };
  });
  console.log('势力=' + r.faction + '  ⚠无地块徽章数=' + r.nobind + '  样本=' + r.nobindTxt);
  console.log(r.nobind >= 1 ? 'PASS: territory-less 势力显示 ⚠无地块' : 'FAIL');
  await b.close();
  process.exit(r.nobind >= 1 ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
