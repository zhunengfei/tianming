const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7')); await p.waitForTimeout(450);
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP; const out = []; const ok = (n, c, i) => out.push((c ? 'PASS ' : 'RED  ') + n + (i ? ' [' + i + ']' : ''));
    async function show(m){ app.state.selectedModuleId=m; app.setWorkbenchPanel('structured-workbench'); await new Promise(r=>setTimeout(r,220)); return document.getElementById('module-primary-view'); }
    // 行政
    var H = await show('adminMap');
    ok('行政 势力选择器', !!H.querySelector('[data-admin-faction]'));
    ok('行政 区划树节点', H.querySelectorAll('.adt-node').length>=5, H.querySelectorAll('.adt-node').length+'节点');
    ok('行政 中文标签(民心/繁荣度)', /民心/.test(H.innerHTML)&&/繁荣度/.test(H.innerHTML));
    var nd = H.querySelectorAll('.adt-node')[1]||H.querySelector('.adt-node'); var did=nd.dataset.adminDivId; nd.dispatchEvent(new MouseEvent('click',{bubbles:true})); await new Promise(r=>setTimeout(r,180));
    var H2=document.getElementById('module-primary-view'); var pf=H2.querySelector('[data-gen-kind="adminDiv"][data-gen-field="prosperity"]');
    if(pf){pf.value='77';pf.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,150));ok('行政 区划编辑落库',app.state._adminCurDiv&&app.state._adminCurDiv.prosperity===77,'prosperity='+(app.state._adminCurDiv&&app.state._adminCurDiv.prosperity));}else ok('行政 区划编辑落库',false,'no ctl');
    // 全 9 章渲染无碎
    var mods=['scenarioOpening','peopleLineages','factionsSociety','courtInstitutions','adminMap','economyPopulation','militaryFrontier','eventsChronicle','rulesAi'];
    for(const m of mods){ var hh=await show(m); ok('章渲染 '+m, hh && hh.innerHTML.length>200 && !/undefined<\/|NaN/.test(hh.innerHTML.slice(0,400))); }
    return out;
  });
  r.forEach(x => console.log(x)); await b.close(); process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
