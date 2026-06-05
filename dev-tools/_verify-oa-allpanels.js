const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP, st = a.state, sc = st.scenario;
    const H = document.getElementById('module-primary-view');
    const found = {};
    function scan(panel) { H.querySelectorAll('.facf-oa-item').forEach(el => { const m = (el.textContent || '').match(/(^|　)([A-Za-z][A-Za-z0-9]*):/g); if (m) m.forEach(x => { const k = x.replace(/[　:]/g, '').trim(); (found[panel] = found[panel] || new Set()).add(k); }); }); }
    // 军务 troops + system
    st.selectedModuleId = 'militaryFrontier'; st._milTab = 'troops';
    ((sc.military && sc.military.initialTroops) || []).forEach((t, i) => { (st._genSel = st._genSel || {}).troops = i; H.innerHTML = a.renderMilitaryFolio(); scan('military'); });
    st._milTab = 'system'; H.innerHTML = a.renderMilitaryFolio(); scan('military');
    // 规则 vars + tech + mech
    st.selectedModuleId = 'rulesAi'; ['vars','tech','mech'].forEach(tb => { st._rulesTab = tb; ((sc.variables||[]).slice(0,21)).forEach((v,i)=>{ (st._genSel=st._genSel||{}).variables=i; H.innerHTML=a.renderRulesFolio(); scan('rules'); }); });
    // 财政
    st.selectedModuleId = 'economyPopulation'; H.innerHTML = a.renderFiscalFolio(); scan('fiscal');
    // 开篇
    st.selectedModuleId = 'scenarioOpening'; H.innerHTML = a.renderOpeningFolio(); scan('opening');
    // 行政 div detail (genDetail 对象数组)
    st.selectedModuleId = 'adminMap';
    const facs = Object.keys(sc.adminHierarchy||{});
    facs.slice(0,6).forEach(fk => { st._adminFaction = fk; const d0 = ((sc.adminHierarchy[fk]||{}).divisions||[])[0]; if(d0){ st._adminDivId = d0.id; H.innerHTML = a.renderAdminFolio(); scan('admin'); } });
    // 官制
    st.selectedModuleId = 'courtInstitutions'; H.innerHTML = a.renderOfficeFolio(); scan('office');
    const out = {}; Object.keys(found).forEach(k => out[k] = Array.from(found[k]));
    return out;
  });
  let total = 0;
  Object.keys(r).forEach(panel => { console.log('  '+panel+': '+(r[panel].length?r[panel].join(' | '):'(无✓)')); total += r[panel].length; });
  if (!Object.keys(r).length) console.log('  (所有面板对象数组无英文键✓)');
  console.log('\nRESULT: ' + (total === 0 ? 'PASS 全清' : 'FAIL 残留'+total));
  await b.close();
  process.exit(total === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
