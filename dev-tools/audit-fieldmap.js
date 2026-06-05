// 审计 — 官方剧本载入后字段对应：模块归属/孤儿、专业表单标签↔key↔值、RUNTIME_FIELD_SURFACES 一致性。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';

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

  async function dumpSpecialist(coll, idx) {
    return await p.evaluate(async (args) => {
      var app = window.TM_SCENARIO_EDITOR_RESET_APP, sc = app.state.scenario;
      var list = sc[args.coll] || [];
      var ent = list[args.idx];
      if (!ent) return { coll: args.coll, empty: true };
      app.revealEntity(args.coll, ent.name || ent.id);
      await new Promise(function (r) { setTimeout(r, 200); });
      app.setWorkbenchPanel('specialist-editor');
      await new Promise(function (r) { setTimeout(r, 250); });
      var rows = [].slice.call(document.querySelectorAll('[data-panel="specialist-editor"] .specialist-field'));
      var fields = rows.map(function (row) {
        var input = row.querySelector('[data-specialist-field]');
        var key = input ? input.getAttribute('data-specialist-field') : null;
        var labelSpan = row.querySelector('span');
        var aliasEm = row.querySelector('[data-specialist-alias]');
        var shownVal = input ? input.value : '';
        // 比对：输入框显示值 vs 实体真实值(经 alias 解析)
        var realKey = key;
        if (aliasEm) { var m = (aliasEm.textContent || '').match(/实际是\s*(\S+?)\)/); if (m) realKey = m[1]; }
        var realVal = ent[realKey];
        var realShown = Array.isArray(realVal) ? realVal.join('、') : (realVal == null ? '' : String(realVal));
        return {
          key: key, realKey: realKey,
          label: labelSpan ? labelSpan.textContent.replace(/\s+/g, ' ').trim() : '',
          existsOnEntity: Object.prototype.hasOwnProperty.call(ent, realKey),
          valueMatches: shownVal === realShown,
          untranslated: labelSpan ? (labelSpan.textContent.trim().indexOf(key) === 0) : false,
          inputType: input ? input.tagName.toLowerCase() + (input.type ? (':' + input.type) : '') : '',
          numMismatch: input && input.type === 'number' && typeof realVal !== 'number' && realVal != null
        };
      });
      // 实体上有但表单没展示的字段（覆盖缺口）
      var shownKeys = {}; fields.forEach(function (f) { shownKeys[f.realKey] = 1; shownKeys[f.key] = 1; });
      var entityOnlyKeys = Object.keys(ent).filter(function (k) { return !shownKeys[k] && k.charAt(0) !== '_'; });
      return { coll: args.coll, entLabel: ent.name || ent.id, fieldCount: fields.length, fields: fields, entityOnlyKeys: entityOnlyKeys };
    }, { coll, idx });
  }

  const out = {};
  for (const scen of ['tianqi7', 'shaosong']) {
    await p.evaluate((s) => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario(s), scen);
    await p.waitForTimeout(500);

    // A. 模块归属 + 孤儿
    const moduleMap = await p.evaluate(() => {
      var app = window.TM_SCENARIO_EDITOR_RESET_APP, sc = app.state.scenario, mods = app.state.modules;
      var keyToModules = {};
      mods.forEach(function (m) { (m.topLevelKeys || []).forEach(function (k) { (keyToModules[k] = keyToModules[k] || []).push(m.id); }); });
      var scKeys = Object.keys(sc).filter(function (k) { return k.charAt(0) !== '_'; });
      var orphans = scKeys.filter(function (k) { return !keyToModules[k]; });
      var multi = Object.keys(keyToModules).filter(function (k) { return keyToModules[k].length > 1; }).map(function (k) { return k + '→[' + keyToModules[k].join(',') + ']'; });
      return { scKeyCount: scKeys.length, orphans: orphans, multiAssigned: multi };
    });

    // B. RUNTIME_FIELD_SURFACES 一致性
    const surfaces = await p.evaluate(() => {
      var app = window.TM_SCENARIO_EDITOR_RESET_APP, sc = app.state.scenario, mods = app.state.modules;
      var surf = app.runtimeFieldSurfaces || [];
      var modById = {}; mods.forEach(function (m) { modById[m.id] = m; });
      var fieldMissing = [], moduleMismatch = [];
      surf.forEach(function (s) {
        if (!s || !s.field) return;
        var present = Object.prototype.hasOwnProperty.call(sc, s.field);
        if (!present && s.required) fieldMissing.push(s.field + '(必填·剧本缺)');
        var mod = modById[s.moduleId];
        if (mod && (mod.topLevelKeys || []).indexOf(s.field) < 0 && present) moduleMismatch.push(s.field + '→声明属' + s.moduleId + '但该模块topLevelKeys没列它');
      });
      return { surfCount: surf.length, fieldMissingSample: fieldMissing.slice(0, 12), moduleMismatchSample: moduleMismatch.slice(0, 12), missingCount: fieldMissing.length, mismatchCount: moduleMismatch.length };
    });

    const charSpec = await dumpSpecialist('characters', 0);
    const facSpec = await dumpSpecialist('factions', 0);
    out[scen] = { moduleMap, surfaces, charSpec, facSpec };
  }

  await browser.close();

  // 汇总异常
  function anomalies(scen, d) {
    var a = [];
    if (d.moduleMap.orphans.length) a.push('孤儿字段(未归任何模块·落 scenarioOpening): ' + d.moduleMap.orphans.join(', '));
    if (d.surfaces.missingCount) a.push('RUNTIME_FIELD_SURFACES 必填字段剧本缺(' + d.surfaces.missingCount + '): ' + d.surfaces.fieldMissingSample.join('; '));
    if (d.surfaces.mismatchCount) a.push('surfaces 模块归属不一致(' + d.surfaces.mismatchCount + '): ' + d.surfaces.moduleMismatchSample.join(' | '));
    [d.charSpec, d.facSpec].forEach(function (sp) {
      if (sp.empty) return;
      var vmis = (sp.fields || []).filter(function (f) { return !f.valueMatches; });
      var notExist = (sp.fields || []).filter(function (f) { return !f.existsOnEntity; });
      var untr = (sp.fields || []).filter(function (f) { return f.untranslated; });
      var numMis = (sp.fields || []).filter(function (f) { return f.numMismatch; });
      if (vmis.length) a.push(sp.coll + ' 表单值/字段不符(对应错误!): ' + vmis.map(function (f) { return f.key + '(显示≠' + f.realKey + ')'; }).join(', '));
      if (notExist.length) a.push(sp.coll + ' 表单展示了实体没有的字段: ' + notExist.map(function (f) { return f.key; }).join(', '));
      if (untr.length) a.push(sp.coll + ' 字段无中文标签: ' + untr.map(function (f) { return f.key; }).join(', '));
      if (numMis.length) a.push(sp.coll + ' number输入框但实际非数字: ' + numMis.map(function (f) { return f.key; }).join(', '));
    });
    return a;
  }

  console.log('=== 天启 异常 ==='); (anomalies('tianqi7', out.tianqi7).forEach(function (x) { console.log(' - ' + x); }) || 0);
  if (!anomalies('tianqi7', out.tianqi7).length) console.log(' (无明显字段对应异常)');
  console.log('=== 绍宋 异常 ==='); anomalies('shaosong', out.shaosong).forEach(function (x) { console.log(' - ' + x); });
  if (!anomalies('shaosong', out.shaosong).length) console.log(' (无明显字段对应异常)');
  console.log('\n=== 概览 ===');
  console.log(JSON.stringify({
    tianqi7: { keys: out.tianqi7.moduleMap.scKeyCount, surfaces: out.tianqi7.surfaces.surfCount, charFields: out.tianqi7.charSpec.fieldCount, charEntityOnly: out.tianqi7.charSpec.entityOnlyKeys, facFields: out.tianqi7.facSpec.fieldCount, facEntityOnly: out.tianqi7.facSpec.entityOnlyKeys },
    shaosong: { keys: out.shaosong.moduleMap.scKeyCount, surfaces: out.shaosong.surfaces.surfCount, charFields: out.shaosong.charSpec.fieldCount, charEntityOnly: out.shaosong.charSpec.entityOnlyKeys, facFields: out.shaosong.facSpec.fieldCount, facEntityOnly: out.shaosong.facSpec.entityOnlyKeys }
  }, null, 1));
  console.log('pageErrors:', errs.length, errs.slice(0, 3));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
