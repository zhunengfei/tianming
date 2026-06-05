const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext()).newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(450);
  const r = await p.evaluate(async () => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    app.state.selectedModuleId = 'peopleLineages'; app.state.selectedField = 'characters';
    app.setWorkbenchPanel('structured-workbench');
    await new Promise(r => setTimeout(r, 200));
    const c = app.state.scenario.characters[0];
    // 渲染出的标签：哪些是英文(ASCII)
    var labs = [].slice.call(document.querySelectorAll('#module-primary-view .rwf2-detail .rwf2-fl')).map(e => e.textContent);
    var asciiLabels = labs.filter(l => /^[\x00-\x7f]+$/.test(l));
    // 字段值里疑似英文(纯ASCII且非数字)的
    var engVals = {};
    Object.keys(c).forEach(k => { var v = c[k]; if (typeof v === 'string' && v && /^[\x00-\x7f]+$/.test(v) && !/^https?:|^data:|^\//.test(v)) engVals[k] = v; });
    return {
      keys: Object.keys(c),
      asciiLabels: asciiLabels,
      englishStringValues: engVals,
      portrait: c.portrait != null ? (String(c.portrait).slice(0, 80) + (String(c.portrait).length > 80 ? '…' : '')) : '(无portrait字段)',
      portraitType: typeof c.portrait,
      sampleLongFields: { bio: (c.bio || '').length, appearance: (c.appearance || '').length, innerThought: (c.innerThought || '').length, personalGoal: (c.personalGoal || '').length },
      // alias 嫌疑：desc vs description
      hasDesc: 'desc' in c, hasDescription: 'description' in c
    };
  });
  await browser.close();
  console.log(JSON.stringify(r, null, 1));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
