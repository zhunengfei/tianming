const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7')); await p.waitForTimeout(450);
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP, st = app.state; const out = []; const ok = (n, c, i) => out.push((c ? 'PASS ' : 'RED  ') + n + (i ? ' [' + i + ']' : ''));
    async function show(m) { st.selectedModuleId = m; app.setWorkbenchPanel('structured-workbench'); await new Promise(r => setTimeout(r, 200)); return document.getElementById('module-primary-view'); }
    // 人物：选一个有 relations 的人
    var ci = (st.scenario.characters || []).findIndex(c => c.relations || c.resources); st._folioSel = ci >= 0 ? ci : 0;
    var H = await show('peopleLineages'); document.getElementById('module-primary-view').innerHTML = app.renderCharacterFolio(); H = document.getElementById('module-primary-view');
    ok('人物 关系/履历 section出现', /关系 · 家族 · 履历/.test(H.innerHTML));
    ok('人物 嵌套字段可见(characters kind)', !!H.querySelector('[data-gen-kind="characters"]') || /关系网|私产|价值体系/.test(H.innerHTML), '');
    // 人物 内部元数据已隐藏
    ok('人物 abilityAudit已隐藏', H.innerHTML.indexOf('abilityAudit') < 0);
    // 官制：salary 字段出现
    H = await show('courtInstitutions');
    ok('官制 俸禄字段露出', !!H.querySelector('[data-office-field="salary"]'));
    ok('官制 职责字段露出', !!H.querySelector('[data-office-field="duties"]'));
    // 行政：地图按钮
    H = await show('adminMap');
    ok('行政 地图编辑器按钮', !!H.querySelector('[data-editor-command="launch-map-editor"]'), '');
    return out;
  });
  r.forEach(x => console.log(x)); await b.close(); process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
