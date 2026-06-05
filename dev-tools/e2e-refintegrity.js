// e2e — 深查修验证：S1扫描器盲区 + S1删除清理 + S2重命名传播 + bug6关系模板。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.RI_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';

(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });

  async function reload() {
    await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
    await p.waitForTimeout(450);
  }

  // === S1 扫描器盲区：注入悬空 factionRelations/relations 引用，collectMissingReferences 应报 ===
  await reload();
  const scanner = await p.evaluate(() => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP, sc = app.state.scenario;
    var realFac = (sc.factions[0] || {}).name;
    var realChar = (sc.characters[0] || {}).name;
    (sc.factionRelations = sc.factionRelations || []).push({ from: realFac, to: '幽灵势力ZZZ', type: 'war', value: 0, desc: 't' });
    (sc.relations = sc.relations || []).push({ from: '幽灵人物YYY', to: realChar, type: 't', value: 0, desc: 't' });
    var missing = app.collectMissingReferences();
    return {
      facGhost: missing.some(function (r) { return r.kind === 'faction' && r.ref === '幽灵势力ZZZ'; }),
      charGhost: missing.some(function (r) { return r.kind === 'character' && r.ref === '幽灵人物YYY'; })
    };
  });

  // === S1 删除清理：删被 factionRelations 引用的势力 → 那些行被清掉 ===
  await reload();
  const del = await p.evaluate(async () => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP, sc = app.state.scenario;
    var fr = sc.factionRelations || [];
    var X = (sc.factions.find(function (f) { return fr.some(function (r) { return r.from === f.name || r.to === f.name; }); }) || {}).name;
    var refsBefore = fr.filter(function (r) { return r.from === X || r.to === X; }).length;
    var charRefsBefore = (sc.characters || []).filter(function (c) { return c.faction === X; }).length;
    app.revealEntity('factions', X);
    await new Promise(function (r) { setTimeout(r, 250); });
    var btn = document.querySelector('[data-editor-command="delete-entity"]');
    if (btn) btn.click();
    await new Promise(function (r) { setTimeout(r, 250); });
    var sc2 = app.state.scenario;
    return {
      X: X, refsBefore: refsBefore, charRefsBefore: charRefsBefore,
      facStillThere: (sc2.factions || []).some(function (f) { return f.name === X; }),
      relRefsAfter: (sc2.factionRelations || []).filter(function (r) { return r.from === X || r.to === X; }).length,
      charRefsAfter: (sc2.characters || []).filter(function (c) { return c.faction === X; }).length
    };
  });

  // === S2 重命名传播：改势力名 → character.faction + factionRelations.from/to 同步 ===
  await reload();
  const rename = await p.evaluate(async () => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP, sc = app.state.scenario;
    var fr = sc.factionRelations || [];
    var Y = (sc.factions.find(function (f) {
      return fr.some(function (r) { return r.from === f.name || r.to === f.name; }) && (sc.characters || []).some(function (c) { return c.faction === f.name; });
    }) || {}).name;
    var NEW = Y + '·改名测试';
    var relRefsBefore = fr.filter(function (r) { return r.from === Y || r.to === Y; }).length;
    var charRefsBefore = (sc.characters || []).filter(function (c) { return c.faction === Y; }).length;
    app.revealEntity('factions', Y);
    await new Promise(function (r) { setTimeout(r, 250); });
    app.setWorkbenchPanel('specialist-editor');
    await new Promise(function (r) { setTimeout(r, 250); });
    var nameInput = document.querySelector('[data-panel="specialist-editor"] [data-specialist-field="name"]');
    var inputFound = !!nameInput;
    if (nameInput) { nameInput.value = NEW; }
    app.saveSpecialistEntity();
    await new Promise(function (r) { setTimeout(r, 250); });
    var sc2 = app.state.scenario;
    return {
      Y: Y, NEW: NEW, inputFound: inputFound, relRefsBefore: relRefsBefore, charRefsBefore: charRefsBefore,
      oldNameGone: !(sc2.factionRelations || []).some(function (r) { return r.from === Y || r.to === Y; }) && !(sc2.characters || []).some(function (c) { return c.faction === Y; }),
      relRefsNew: (sc2.factionRelations || []).filter(function (r) { return r.from === NEW || r.to === NEW; }).length,
      charRefsNew: (sc2.characters || []).filter(function (c) { return c.faction === NEW; }).length
    };
  });

  // === bug6 关系模板：新增 factionRelations 行应有 from/to ===
  await reload();
  const tmpl = await p.evaluate(async () => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP;
    app.revealField('factionRelations');
    await new Promise(function (r) { setTimeout(r, 250); });
    var before = (app.state.scenario.factionRelations || []).length;
    var btn = document.querySelector('[data-editor-command="add-entity"]');
    if (btn) btn.click();
    await new Promise(function (r) { setTimeout(r, 200); });
    var arr = app.state.scenario.factionRelations || [];
    var row = arr[arr.length - 1] || {};
    return { added: arr.length === before + 1, hasFrom: 'from' in row, hasTo: 'to' in row, keys: Object.keys(row) };
  });

  await browser.close();
  const checks = {
    'S1扫描_悬空势力被报': scanner.facGhost,
    'S1扫描_悬空人物被报': scanner.charGhost,
    'S1删除_势力真被删': del.refsBefore > 0 && !del.facStillThere,
    'S1删除_factionRelations引用被清': del.refsBefore > 0 && del.relRefsAfter === 0,
    'S1删除_character.faction被清': del.charRefsAfter === 0,
    'S2重命名_有输入框': rename.inputFound,
    'S2重命名_旧名引用消失': rename.relRefsBefore > 0 && rename.oldNameGone,
    'S2重命名_factionRelations同步新名': rename.relRefsNew === rename.relRefsBefore && rename.relRefsBefore > 0,
    'S2重命名_character.faction同步新名': rename.charRefsNew === rename.charRefsBefore && rename.charRefsBefore > 0,
    'bug6_关系模板有fromto': tmpl.added && tmpl.hasFrom && tmpl.hasTo,
    'noPageErrors': errs.length === 0
  };
  console.log(JSON.stringify({ checks, scanner, del, rename, tmpl, errs: errs.slice(0, 3) }, null, 1));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
