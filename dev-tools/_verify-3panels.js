const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7')); await p.waitForTimeout(450);
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP; const out = []; const ok = (n, c, i) => out.push((c ? 'PASS ' : 'RED  ') + n + (i ? ' [' + i + ']' : ''));
    async function show(m){ app.state.selectedModuleId=m; app.setWorkbenchPanel('structured-workbench'); await new Promise(r=>setTimeout(r,250)); return document.getElementById('module-primary-view'); }
    var H = await show('economyPopulation');
    ok('财政 节', H.querySelectorAll('.rwf2-st').length>=3, [].slice.call(H.querySelectorAll('.rwf2-st')).map(e=>e.textContent).join('/'));
    ok('财政 中文标签', /浮动征收率/.test(H.innerHTML)&&/吏治浊度/.test(H.innerHTML));
    var fc = H.querySelector('[data-gen-kind="fiscalConfig"][data-gen-field="floatingCollectionRate"]');
    if(fc){fc.value='0.5';fc.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,120));ok('财政 编辑落库',app.state.scenario.fiscalConfig.floatingCollectionRate===0.5,'='+app.state.scenario.fiscalConfig.floatingCollectionRate);}else ok('财政 编辑落库',false,'no ctl');
    H = await show('scenarioOpening');
    ok('开篇 总览+设置', /剧本名/.test(H.innerHTML)&&/起始年/.test(H.innerHTML)&&/玩家身份/.test(H.innerHTML));
    var nm = H.querySelector('[data-gen-kind="__root"][data-gen-field="name"]');
    if(nm){nm.value='改名测试';nm.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,120));ok('开篇 name落库',app.state.scenario.name==='改名测试',app.state.scenario.name);}else ok('开篇 name落库',false,'no ctl');
    H = await show('militaryFrontier');
    ok('军事 部队卡', H.querySelectorAll('.rwf2-rc').length>=10, H.querySelectorAll('.rwf2-rc').length+'卡');
    ok('军事 中文标签', /兵员/.test(H.innerHTML)&&/统帅/.test(H.innerHTML));
    var sc2 = H.querySelector('[data-gen-kind="troops"][data-gen-field="morale"]');
    if(sc2){sc2.value='88';sc2.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,120));var sel=(app.state._genSel&&app.state._genSel.troops)||0;ok('军事 编辑落库',app.state.scenario.military.initialTroops[sel].morale===88,'morale='+app.state.scenario.military.initialTroops[sel].morale);}else ok('军事 编辑落库',false,'no ctl');
    // 军制 tab
    var mt = document.getElementById('module-primary-view').querySelector('[data-mil-tab="system"]'); mt.dispatchEvent(new MouseEvent('click',{bubbles:true})); await new Promise(r=>setTimeout(r,200));
    ok('军事 军制tab(军械库)', /红夷大炮/.test(document.getElementById('module-primary-view').innerHTML));
    return out;
  });
  r.forEach(x => console.log(x)); await b.close(); process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
