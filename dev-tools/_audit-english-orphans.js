// 套天启官方剧本审计：①全9面板残留英文标签 ②没有对应显示位置的字段(orphan)。
const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7')); await p.waitForTimeout(450);
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP, st = app.state, sc = st.scenario;
    function isEng(s) { s = (s || '').trim(); return s.length > 0 && /[A-Za-z]/.test(s) && /^[\x00-\x7f]+$/.test(s) && !/^[\d\s.+%/·:()-]+$/.test(s); }
    function setCover(arr) { // 选最少实体覆盖所有key
      var need = {}; arr.forEach(e => Object.keys(e || {}).forEach(k => need[k] = 1)); need = Object.keys(need);
      var picked = [], cov = {};
      while (Object.keys(cov).length < need.length && picked.length < arr.length) {
        var best = -1, bn = -1;
        arr.forEach((e, i) => { if (picked.indexOf(i) >= 0) return; var nw = Object.keys(e || {}).filter(k => !cov[k]).length; if (nw > bn) { bn = nw; best = i; } });
        if (best < 0 || bn <= 0) break; picked.push(best); Object.keys(arr[best] || {}).forEach(k => cov[k] = 1);
      }
      return picked;
    }
    function scanLabels() { // 当前主画布的英文标签 + 其字段key
      var H = document.getElementById('module-primary-view'); if (!H) return [];
      var res = [];
      [].forEach.call(H.querySelectorAll('.rwf2-f, .rwf2-fl'), function (el) {
        var fl = el.classList.contains('rwf2-fl') ? el : el.querySelector(':scope > .rwf2-fl');
        if (!fl) return; var t = fl.textContent;
        if (!isEng(t)) return;
        var inp = el.closest('.rwf2-f') ? el.closest('.rwf2-f').querySelector('[data-gen-field],[data-fac-field],[data-folio-field]') : null;
        res.push(t + (inp ? ' ←' + (inp.getAttribute('data-gen-field') || inp.getAttribute('data-fac-field') || inp.getAttribute('data-folio-field')) : ''));
      });
      return res;
    }
    async function render(mod) { st.selectedModuleId = mod; app.setWorkbenchPanel('structured-workbench'); await new Promise(r => setTimeout(r, 60)); }
    var ENG = {}, add = (mod, arr) => { ENG[mod] = ENG[mod] || new Set(); arr.forEach(x => ENG[mod].add(x)); };

    // 人物（set-cover）
    await render('peopleLineages');
    setCover(sc.characters || []).forEach(i => { st._folioSel = i; var H = document.getElementById('module-primary-view'); H.innerHTML = app.renderCharacterFolio(); add('peopleLineages', scanLabels()); });
    // 势力
    await render('factionsSociety'); st._facFolioTab = 'roster';
    setCover(sc.factions || []).forEach(i => { st._facFolioSel = i; document.getElementById('module-primary-view').innerHTML = app.renderFactionFolio(); add('factionsSociety', scanLabels()); });
    // 事件/军事troops/规则vars（gen kinds）
    [['eventsChronicle', sc.events, 'events', app.renderEventsFolio], ['rulesAi', sc.variables, 'variables', app.renderRulesFolio]].forEach(function (cfg) { });
    await render('eventsChronicle');
    setCover(sc.events || []).forEach(i => { (st._genSel = st._genSel || {}).events = i; document.getElementById('module-primary-view').innerHTML = app.renderEventsFolio(); add('eventsChronicle', scanLabels()); });
    await render('militaryFrontier'); st._milTab = 'troops';
    setCover((sc.military && sc.military.initialTroops) || []).forEach(i => { (st._genSel = st._genSel || {}).troops = i; document.getElementById('module-primary-view').innerHTML = app.renderMilitaryFolio(); add('militaryFrontier', scanLabels()); });
    st._milTab = 'system'; document.getElementById('module-primary-view').innerHTML = app.renderMilitaryFolio(); add('militaryFrontier', scanLabels()); st._milTab = 'troops';
    await render('rulesAi'); st._rulesTab = 'vars';
    setCover(sc.variables || []).forEach(i => { (st._genSel = st._genSel || {}).variables = i; document.getElementById('module-primary-view').innerHTML = app.renderRulesFolio(); add('rulesAi', scanLabels()); });
    ['tech', 'mech'].forEach(tb => { st._rulesTab = tb; document.getElementById('module-primary-view').innerHTML = app.renderRulesFolio(); add('rulesAi', scanLabels()); }); st._rulesTab = 'vars';
    // 财政/开篇（config·render once）
    await render('economyPopulation'); add('economyPopulation', scanLabels());
    await render('scenarioOpening'); add('scenarioOpening', scanLabels());
    // 行政（各势力的区划 set-cover）
    await render('adminMap');
    var divs = []; Object.keys(sc.adminHierarchy || {}).forEach(fk => { function dig(ds) { (ds || []).forEach(d => { divs.push(d); dig(d.children); }); } dig((sc.adminHierarchy[fk] || {}).divisions); });
    setCover(divs).forEach(i => { st._adminDivId = divs[i].id; st._adminFaction = null; document.getElementById('module-primary-view').innerHTML = app.renderAdminFolio(); add('adminMap', scanLabels()); });
    // 官制（职位字段是固定中文表头，标签无英文；查 orphan 在下面）
    await render('courtInstitutions'); add('courtInstitutions', scanLabels());

    // ── Orphan 审计 ──
    var orphans = {};
    // 人物：对象/对象数组字段，不在 charDetailGroups + 不被catch-all收（catch-all排除object/objArray）
    var charGroupKeys = {}; ['name','zi','haoName','displayName','title','officialTitle','role','occupation','rankLevel','class','age','gender','birthYear','birthplace','birthTime','ethnicity','faith','culture','learning','location','alive','isHistorical','isFictional','isPlayer','isRoyal','royalRelation','intelligence','valor','military','administration','management','charisma','diplomacy','benevolence','integrity','loyalty','ambition','faction','party','partyRank','stance','superior','mentor','family','familyTier','familyRole','clanPrestige','lineage','appearance','diction','persona','personality','personalGoal','innerThought','coreMotivations','redLines','hobbies','bio','desc','traits','wuchang'].forEach(k => charGroupKeys[k] = 1);
    var hide = { id: 1, sid: 1, traitIds: 1, rels: 1, wuchangOverride: 1 };
    var charOrphan = {};
    (sc.characters || []).forEach(c => Object.keys(c || {}).forEach(k => {
      if (charGroupKeys[k] || hide[k] || k.charAt(0) === '_') return;
      var v = c[k]; var isObj = v && typeof v === 'object' && !Array.isArray(v); var isObjArr = Array.isArray(v) && v[0] && typeof v[0] === 'object';
      if (isObj || isObjArr) charOrphan[k] = (charOrphan[k] || 0) + 1; // 这些被catch-all排除→无处显示
    }));
    orphans.peopleLineages_对象字段无处显示 = charOrphan;
    // 官制：职位字段(露了5个) + 衙门节点字段(露了name/desc)
    var posShown = { name: 1, rank: 1, holder: 1, establishedCount: 1, vacancyCount: 1 }, nodeShown = { name: 1, desc: 1, positions: 1, subs: 1, id: 1 };
    var posOrphan = {}, nodeOrphan = {};
    (function walk(ns) { (ns || []).forEach(n => { Object.keys(n || {}).forEach(k => { if (!nodeShown[k]) nodeOrphan[k] = (nodeOrphan[k] || 0) + 1; }); (n.positions || []).forEach(po => Object.keys(po || {}).forEach(k => { if (!posShown[k]) posOrphan[k] = (posOrphan[k] || 0) + 1; })); walk(n.subs); }); })(sc.officeTree || []);
    orphans.courtInstitutions_职位字段没露 = posOrphan;
    orphans.courtInstitutions_衙门字段没露 = nodeOrphan;

    var out = { englishLabels: {}, orphans: orphans };
    Object.keys(ENG).forEach(m => { var a = Array.from(ENG[m]); if (a.length) out.englishLabels[m] = a; });
    return out;
  });
  await b.close();
  console.log(JSON.stringify(r, null, 1));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
