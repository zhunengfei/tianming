const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 940 }, deviceScaleFactor: 1.4 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  // 进人物章
  const r = await p.evaluate(() => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP;
    app.state.selectedModuleId = 'peopleLineages';
    app.state.selectedField = 'characters';
    app.setWorkbenchPanel('structured-workbench'); // 触发 renderDetailApp（主视图与 panel 无关）
    var primary = document.getElementById('module-primary-view');
    var cardsInPrimary = primary ? primary.querySelectorAll('.rwf-card').length : 0;
    var adv = document.querySelector('details.adv-fields');
    return { hasPrimary: !!primary, cardsInPrimary: cardsInPrimary, advCollapsed: adv ? !adv.open : null, advExists: !!adv };
  });
  await p.waitForTimeout(200);
  await p.screenshot({ path: 'dev-tools/shot-people-chapter.png' });
  await browser.close();
  console.log(JSON.stringify(r), 'errs=' + errs.length);
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
