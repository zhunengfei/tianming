// POC① 人物列传 行为验证 + 截图。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 940 }, deviceScaleFactor: 1.5 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.setWorkbenchPanel('renwu-folio'));
  await p.waitForTimeout(400);

  const r = await p.evaluate(() => {
    const out = [];
    const ok = (n, c, i) => out.push({ name: n, pass: !!c, info: i || '' });
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    ok('F0 导出 renderCharacterFolio/saveFolioField', typeof app.renderCharacterFolio === 'function' && typeof app.saveFolioField === 'function');
    var cards = document.querySelectorAll('[data-panel="renwu-folio"] .rwf-card');
    ok('F1 列传卡片渲染', cards.length > 0, 'cards=' + cards.length + ' chars=' + (app.state.scenario.characters || []).length);
    if (!cards.length) return out;

    // 就地改名
    var nameIn = document.querySelector('[data-panel="renwu-folio"] [data-folio-field="name"]');
    var oldName = app.state.scenario.characters[0].name;
    nameIn.value = '测试·改名钦';
    nameIn.dispatchEvent(new Event('change', { bubbles: true }));
    ok('F2 就地改名落库', app.state.scenario.characters[0].name === '测试·改名钦', '"' + oldName + '"→"' + app.state.scenario.characters[0].name + '"');
    ok('F3 改后面板自刷(卡片仍在)', document.querySelectorAll('[data-panel="renwu-folio"] .rwf-card').length > 0, '');

    // 就地改能力（数字·类型保持）
    var abIn = document.querySelector('[data-panel="renwu-folio"] [data-folio-field="intelligence"]');
    if (abIn) { abIn.value = '88'; abIn.dispatchEvent(new Event('change', { bubbles: true })); }
    ok('F4 就地改能力数字(保持number)', app.state.scenario.characters[0].intelligence === 88, 'intelligence=' + app.state.scenario.characters[0].intelligence + ' (' + typeof app.state.scenario.characters[0].intelligence + ')');

    // 改势力→换色
    var facSel = document.querySelector('[data-panel="renwu-folio"] [data-folio-field="faction"]');
    var card0 = document.querySelector('[data-panel="renwu-folio"] .rwf-card');
    var colorBefore = card0 && card0.style.getPropertyValue('--fc');
    var opts = facSel ? Array.prototype.map.call(facSel.options, o => o.value).filter(v => v && v !== app.state.scenario.characters[0].faction) : [];
    if (facSel && opts.length) { facSel.value = opts[0]; facSel.dispatchEvent(new Event('change', { bubbles: true })); }
    var card0b = document.querySelector('[data-panel="renwu-folio"] .rwf-card');
    var colorAfter = card0b && card0b.style.getPropertyValue('--fc');
    ok('F5 改势力落库', facSel ? app.state.scenario.characters[0].faction === opts[0] : true, 'faction=' + app.state.scenario.characters[0].faction);
    ok('F6 势力换色(stripe --fc变)', facSel && opts.length ? colorBefore !== colorAfter : true, colorBefore + '→' + colorAfter);

    // 国师改 → 实时刷（模拟：直接改 draft + 重渲面板）
    app.state.scenario.characters[0].officialTitle = '国师所改·首辅';
    var panel = document.querySelector('[data-panel="renwu-folio"]');
    panel.innerHTML = app.renderCharacterFolio();
    var oTitle = document.querySelector('[data-panel="renwu-folio"] [data-folio-field="officialTitle"]');
    ok('F7 国师改后实时反映', oTitle && oTitle.value === '国师所改·首辅', 'shown=' + (oTitle && oTitle.value));

    return out;
  });

  await p.evaluate(() => { var el = document.querySelector('[data-panel="renwu-folio"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' }); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: 'dev-tools/shot-renwu-folio.png' });

  await browser.close();
  let pass = 0, fail = 0;
  r.forEach(x => { if (x.pass) pass++; else fail++; console.log((x.pass ? 'PASS ' : 'RED  ') + x.name + (x.info ? '  [' + x.info + ']' : '')); });
  if (errs.length) console.log('pageErrors:', errs.slice(0, 3));
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===  (shot-renwu-folio.png)');
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
