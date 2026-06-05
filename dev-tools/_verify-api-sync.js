const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

  // 预置「游戏」P.ai 到 localStorage（模拟用户在游戏里配了 API）
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    localStorage.setItem('tm_P_lite', JSON.stringify({ scenarios: [], ai: { key: 'GAME-KEY-123', url: 'https://game.example.com/v1', model: 'claude-opus-4-8', temp: 0.5 }, _hasFullData: true }));
    localStorage.removeItem('tm_api');
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });

  // 1. 编辑器 readApiSettings 读到游戏 P.ai
  const r1 = await p.evaluate(() => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    const s = app.readApiSettings ? app.readApiSettings() : null;
    // agent loadEditorApiConfig 也读到
    const ag = window.TM && window.TM.AuthoringAgent && window.TM.AuthoringAgent.loadEditorApiConfig();
    return { editorKey: s && s.main && s.main.key, editorModel: s && s.main && s.main.model, agentKey: ag && ag.key, agentUrl: ag && ag.url, agentModel: ag && ag.model };
  });
  console.log('  读同步: 编辑器key=' + r1.editorKey + ' model=' + r1.editorModel + ' | agent key=' + r1.agentKey + ' url=' + r1.agentUrl + ' model=' + r1.agentModel);
  ok(r1.editorKey === 'GAME-KEY-123', '编辑器 readApiSettings 读到游戏 P.ai 的 key');
  ok(r1.agentKey === 'GAME-KEY-123' && r1.agentModel === 'claude-opus-4-8', 'agent loadEditorApiConfig 读到游戏 P.ai');

  // 2. 编辑器保存 API → 写回游戏 P.ai
  const r2 = await p.evaluate(() => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    if (typeof app.saveApiSettings !== 'function') return { err: 'no saveApiSettings' };
    app.saveApiSettings({ main: { key: 'EDITOR-KEY-789', url: 'https://editor.example.com/v1', model: 'gpt-4o' }, image: {} });
    // 读回游戏 P.ai
    const lite = JSON.parse(localStorage.getItem('tm_P_lite') || '{}');
    const tmapi = JSON.parse(localStorage.getItem('tm_api') || '{}');
    return { gameKey: lite.ai && lite.ai.key, gameModel: lite.ai && lite.ai.model, tmapiKey: tmapi.key };
  });
  console.log('  写同步: 保存后 游戏P.ai key=' + r2.gameKey + ' model=' + r2.gameModel + ' | tm_api key=' + r2.tmapiKey);
  ok(r2.gameKey === 'EDITOR-KEY-789', '编辑器保存 API → 写回游戏 P.ai(tm_P_lite.ai)');
  ok(r2.tmapiKey === 'EDITOR-KEY-789', '编辑器保存 API → 也写 tm_api');

  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
