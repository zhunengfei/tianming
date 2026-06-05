const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7')); await p.waitForTimeout(450);
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP; const out = []; const ok = (n, c, i) => out.push((c ? 'PASS ' : 'RED  ') + n + (i ? ' [' + i + ']' : ''));
    app.state.selectedModuleId = 'eventsChronicle'; app.setWorkbenchPanel('structured-workbench'); await new Promise(r => setTimeout(r, 250));
    var H = document.getElementById('module-primary-view');
    ok('事件卡', H.querySelectorAll('.rwf2-rc').length >= 30, H.querySelectorAll('.rwf2-rc').length + '卡');
    ok('分组节', [].slice.call(H.querySelectorAll('.rwf2-st')).map(e=>e.textContent).join('/'));
    ok('中文标签', /事件名/.test(H.innerHTML) && /触发条件/.test(H.innerHTML) && /关联人物/.test(H.innerHTML));
    var nm = H.querySelector('[data-gen-field="name"]'); nm.value = '测试事件改名'; nm.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 150));
    var sel = (app.state._genSel && app.state._genSel.events) || 0;
    ok('就地编辑落库', app.state.scenario.events[sel].name === '测试事件改名', app.state.scenario.events[sel].name);
    return out;
  });
  r.forEach(x => console.log(x)); await b.close(); process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
