// ② 国师实时刷 行为验证：国师改主视图相关键→主画布闪+数据实时刷；无关键不闪。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(450);

  const r = await p.evaluate(async () => {
    const out = []; const ok = (n, c, i) => out.push({ name: n, pass: !!c, info: i || '' });
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    app.state.selectedModuleId = 'peopleLineages'; app.state.selectedField = 'characters';
    app.setWorkbenchPanel('structured-workbench');
    await new Promise(r => setTimeout(r, 150));

    // 模拟国师改人物属性
    app.state.scenario.characters[0].loyalty = 99;
    app.markAgentTouched(['characters']);
    await new Promise(r => setTimeout(r, 120));
    var host = document.getElementById('module-primary-view');
    ok('L1 国师改人物→主画布闪', !!(host && host.classList.contains('primary-agent-flash')), host ? 'flash=' + host.classList.contains('primary-agent-flash') : 'no-host');
    var loy = host && host.querySelector('[data-folio-char="0"][data-folio-field="loyalty"]');
    ok('L2 数据实时刷(列传卡反映99)', !!(loy && loy.value === '99'), 'loyalty=' + (loy && loy.value));

    // 无关键不闪
    if (host) host.classList.remove('primary-agent-flash');
    app.markAgentTouched(['economyConfig']);
    await new Promise(r => setTimeout(r, 120));
    var host2 = document.getElementById('module-primary-view');
    ok('L3 无关改动不闪', !!(host2 && !host2.classList.contains('primary-agent-flash')), 'flash=' + (host2 && host2.classList.contains('primary-agent-flash')));

    // 势力章：改关系→图谱闪
    app.state.selectedModuleId = 'factionsSociety'; app.state.selectedField = 'factions';
    app.setWorkbenchPanel('structured-workbench');
    await new Promise(r => setTimeout(r, 150));
    app.markAgentTouched(['factionRelations']);
    await new Promise(r => setTimeout(r, 120));
    var host3 = document.getElementById('module-primary-view');
    ok('L4 国师改关系→图谱闪', !!(host3 && host3.classList.contains('primary-agent-flash') && host3.querySelector('.frel-svg')), 'flash=' + (host3 && host3.classList.contains('primary-agent-flash')) + ' svg=' + !!(host3 && host3.querySelector('.frel-svg')));
    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  r.forEach(x => { if (x.pass) pass++; else fail++; console.log((x.pass ? 'PASS ' : 'RED  ') + x.name + (x.info ? '  [' + x.info + ']' : '')); });
  if (errs.length) console.log('pageErrors:', errs.slice(0, 3));
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===');
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
