const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type()==='error') errs.push('CONSOLE '+m.text()); });
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(600);

  // 1. 测 commit 路径: 构造 draft 改 name+人物名 → adapter.commit → 验 state.scenario 真变
  const r = await p.evaluate(() => {
    const out = {};
    try {
      const AA = window.TM && window.TM.AuthoringAgent;
      out.hasAA = !!AA;
      const adapter = AA && AA.detectAdapter(window);
      out.adapterId = adapter && adapter.id;
      out.adapterAvail = adapter && adapter.isAvailable();
      const app = window.TM_SCENARIO_EDITOR_RESET_APP;
      const before = app.state.scenario.name;
      const beforeChar = (app.state.scenario.characters[0]||{}).name;
      // 构造 draft
      const draft = JSON.parse(JSON.stringify(app.state.scenario));
      draft.name = before + '·【测试改名】';
      draft.characters[0].name = beforeChar + '·改';
      // commit
      let commitErr = null;
      try { adapter.commit(draft); } catch(e){ commitErr = e.message; }
      out.commitErr = commitErr;
      out.afterName = app.state.scenario.name;
      out.afterChar = (app.state.scenario.characters[0]||{}).name;
      out.nameChanged = app.state.scenario.name === before + '·【测试改名】';
      out.charChanged = (app.state.scenario.characters[0]||{}).name === beforeChar + '·改';
    } catch(e){ out.fatal = e.message; }
    return out;
  });
  console.log('=== commit 路径测试 ===');
  console.log(JSON.stringify(r, null, 1));

  // 2. agent UI 面板 + 应用按钮 是否存在/接线
  const ui = await p.evaluate(() => ({
    panel: !!document.querySelector('#tm-aa-panel'),
    applyBtn: !!document.querySelector('#tm-aa-apply'),
    reqInput: !!document.querySelector('#tm-aa-panel textarea, #tm-aa-panel input'),
    launcher: !!document.querySelector('#tm-aa-launcher, [class*="aa-launch"]')
  }));
  console.log('\n=== agent UI ===');
  console.log(JSON.stringify(ui, null, 1));
  console.log('\nerrs:', errs.slice(0,4).join(' || ')||'(none)');
  await b.close();
})().catch(e => { console.error('ERR', e); process.exit(2); });
