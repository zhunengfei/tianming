const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7')); await p.waitForTimeout(450);
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP; const out = []; const ok = (n, c, i) => out.push((c ? 'PASS ' : 'RED  ') + n + (i ? ' [' + i + ']' : ''));
    async function show(m){ app.state.selectedModuleId=m; app.setWorkbenchPanel('structured-workbench'); await new Promise(r=>setTimeout(r,250)); return document.getElementById('module-primary-view'); }
    var H = await show('courtInstitutions');
    ok('官制 官职树节点', H.querySelectorAll('.oft-node').length>=10, H.querySelectorAll('.oft-node').length+'节点');
    ok('官制 职位行', H.querySelectorAll('.oft-pos').length>=10, H.querySelectorAll('.oft-pos').length+'行');
    ok('官制 表头(现任/员额/缺员)', /现任/.test(H.innerHTML)&&/员额/.test(H.innerHTML)&&/缺员/.test(H.innerHTML));
    var hd = H.querySelector('[data-office-field="holder"]');
    if(hd){var pathStr=hd.dataset.officePath;hd.value='测试任官';hd.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,150));
      var parts=pathStr.split('.').map(x=>/^\d+$/.test(x)?Number(x):x);var o=app.state.scenario.officeTree;parts.forEach(pp=>o=o&&o[pp]);
      ok('官制 任官落库',o&&o.holder==='测试任官',o?o.holder:'no');}else ok('官制 任官落库',false,'no holder ctl');
    H = await show('rulesAi');
    ok('规则 变量卡', H.querySelectorAll('.rwf2-rc').length>=15, H.querySelectorAll('.rwf2-rc').length+'卡');
    ok('规则 中文标签', /当前值/.test(H.innerHTML)&&/反向/.test(H.innerHTML));
    var vv = H.querySelector('[data-gen-kind="variables"][data-gen-field="value"]');
    if(vv){vv.value='42';vv.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,120));var sel=(app.state._genSel&&app.state._genSel.variables)||0;ok('规则 变量编辑落库',app.state.scenario.variables[sel].value===42,'value='+app.state.scenario.variables[sel].value);}else ok('规则 变量编辑落库',false,'no ctl');
    var tt = document.getElementById('module-primary-view').querySelector('[data-rules-tab="tech"]'); tt.dispatchEvent(new MouseEvent('click',{bubbles:true})); await new Promise(r=>setTimeout(r,200));
    ok('规则 科技tab', /科技树/.test(document.getElementById('module-primary-view').innerHTML));
    return out;
  });
  r.forEach(x => console.log(x));
  await p.evaluate(()=>{window.TM_SCENARIO_EDITOR_RESET_APP.state.selectedModuleId='courtInstitutions';window.TM_SCENARIO_EDITOR_RESET_APP.setWorkbenchPanel('structured-workbench');});await p.waitForTimeout(300);
  const host = await p.$('#module-primary-view'); if (host) await host.screenshot({ path: 'dev-tools/shot-office-folio.png' });
  await b.close(); process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
