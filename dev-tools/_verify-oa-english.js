// e2e：对象数组 compact 视图英文键审计（势力 触怒阈值/历史大事 等）
const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);

  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

  // 扫所有势力的 compact 对象数组项，收集仍含英文键(形如 word:)的项
  const res = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP, st = a.state, sc = st.scenario;
    st.selectedModuleId = 'factionsSociety'; st._facFolioTab = 'roster';
    const H = document.getElementById('module-primary-view');
    const engItems = new Set();
    let sampled = '';
    (sc.factions || []).forEach((f, i) => {
      st._facFolioSel = i; H.innerHTML = a.renderFactionFolio();
      H.querySelectorAll('.facf-oa-item').forEach(el => {
        const t = el.textContent || '';
        // 英文键 = 冒号前是纯ASCII字母词
        const m = t.match(/(^|　)([A-Za-z][A-Za-z0-9]*):/g);
        if (m) m.forEach(x => engItems.add(x.replace(/[　:]/g, '').trim()));
        if (/触怒|敌对|后果|回合.*事件|里程碑/.test(t) && !sampled) sampled = t.slice(0, 80);
      });
    });
    return { engKeys: Array.from(engItems), sampled };
  });
  console.log('  势力面板样本:', res.sampled);
  console.log('  对象数组里仍残留的英文键:', res.engKeys.length ? res.engKeys.join(' | ') : '(无·全中文✓)');
  ok(res.engKeys.length === 0, '势力对象数组无英文键: ' + res.engKeys.join(','));

  // 同样扫人物/事件
  const res2 = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP, st = a.state, sc = st.scenario;
    const out = { peopleLineages: new Set(), eventsChronicle: new Set() };
    const H = document.getElementById('module-primary-view');
    st.selectedModuleId = 'peopleLineages';
    (sc.characters || []).slice(0, 60).forEach((c, i) => {
      st._folioSel = i; H.innerHTML = a.renderCharacterFolio();
      H.querySelectorAll('.facf-oa-item').forEach(el => { const m = (el.textContent || '').match(/(^|　)([A-Za-z][A-Za-z0-9]*):/g); if (m) m.forEach(x => out.peopleLineages.add(x.replace(/[　:]/g, '').trim())); });
    });
    st.selectedModuleId = 'eventsChronicle';
    (sc.events || []).slice(0, 64).forEach((e, i) => {
      (st._genSel = st._genSel || {}).events = i; H.innerHTML = a.renderEventsFolio();
      H.querySelectorAll('.facf-oa-item').forEach(el => { const m = (el.textContent || '').match(/(^|　)([A-Za-z][A-Za-z0-9]*):/g); if (m) m.forEach(x => out.eventsChronicle.add(x.replace(/[　:]/g, '').trim())); });
    });
    return { people: Array.from(out.peopleLineages), events: Array.from(out.eventsChronicle) };
  });
  console.log('  人物对象数组残留英文键:', res2.people.length ? res2.people.join(' | ') : '(无✓)');
  console.log('  事件对象数组残留英文键:', res2.events.length ? res2.events.join(' | ') : '(无✓)');
  ok(res2.people.length === 0, '人物对象数组无英文键: ' + res2.people.join(','));
  ok(res2.events.length === 0, '事件对象数组无英文键: ' + res2.events.join(','));

  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
