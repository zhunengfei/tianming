const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

  // 渲染多个人物的详情，扫 resources(私产)区是否含公帑/publicPurse
  const r = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP, st = a.state, sc = st.scenario;
    st.selectedModuleId = 'peopleLineages';
    const H = document.getElementById('module-primary-view');
    let gongtangHits = 0, siProperty = 0, dataHasPurse = 0;
    // 找有 resources 的人物渲染
    for (let i = 0; i < Math.min(20, (sc.characters || []).length); i++) {
      st._folioSel = i; H.innerHTML = a.renderCharacterFolio();
      const txt = H.textContent || '';
      // 私产区
      if (/公帑|publicPurse/.test(txt)) gongtangHits++;
      if (/私财/.test(txt)) siProperty++;
      if (sc.characters[i].resources && sc.characters[i].resources.publicPurse != null) dataHasPurse++;
    }
    return { gongtangHits, siProperty, dataHasPurse };
  });
  console.log('  20个人物详情扫描: 含"公帑/publicPurse"=' + r.gongtangHits + ' · 含"私财"=' + r.siProperty + ' · 数据仍有publicPurse=' + r.dataHasPurse);
  ok(r.gongtangHits === 0, '人物编辑器不再显示公帑/publicPurse (got ' + r.gongtangHits + ')');
  ok(r.siProperty > 0, '私财等真·个人私产仍正常显示');
  ok(r.dataHasPurse > 0, '数据层publicPurse保留(引擎运行时仍用·未动数据)');

  // 官职侧确认有 公库初值(publicTreasuryInit)
  const office = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP, st = a.state, sc = st.scenario;
    let posWithTreasury = 0;
    (function walk(ns){ (ns||[]).forEach(function(n){ (n.positions||[]).forEach(function(po){ if (po.publicTreasuryInit) posWithTreasury++; }); walk(n.subs); }); })(sc.officeTree||[]);
    return posWithTreasury;
  });
  console.log('  官职带公库初值(publicTreasuryInit)的职位数=' + office);
  ok(office > 0, '公库确实绑在官职上(officeTree publicTreasuryInit)');

  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
