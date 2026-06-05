const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

  // 1. 模拟一轮完成态：设 conversation+draft+空diff，点应用，验 conversation 保留
  const r = await p.evaluate(() => {
    const UI = window.TM_AuthoringAgentUI; if (!UI || !UI._ui) return { err: 'no UI' };
    const ui = UI._ui;
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    ui.conversation = [{ role: 'user', text: '加武则天' }, { role: 'assistant', text: '已加' }];
    ui.draft = JSON.parse(JSON.stringify(app.state.scenario));   // 无实改·commit 无害
    ui._lastDiffs = []; ui._diffRejected = new Set(); ui._lastRunId = null;
    const before = ui.conversation.length;
    // 触发应用按钮
    const ab = document.querySelector('#tm-aa-apply'); if (!ab) return { err: 'no apply btn' };
    var actions = document.querySelector('#tm-aa-actions'); if (actions) actions.style.display = '';
    ab.click();
    return { before, afterConv: ui.conversation ? ui.conversation.length : null, draftAfter: ui.draft };
  });
  await p.waitForTimeout(200);
  console.log('  应用前对话轮数=' + r.before + ' 应用后对话=' + r.afterConv + ' draft已清=' + (r.draftAfter === null));
  ok(r.afterConv === r.before, '应用后对话线程【保留】(连续会话·非null)');
  ok(r.draftAfter === null, '应用后 draft 已清(下条从当前剧本新建)');

  // 2. 续接判定：conversation 在 → onGenerate 会 continuing(不重置)。验 newConversation 重置
  const r2 = await p.evaluate(() => {
    const ui = window.TM_AuthoringAgentUI._ui;
    const hadConv = !!(ui.conversation && ui.conversation.length);
    const nc = document.querySelector('#tm-aa-newchat'); if (nc) nc.click();
    return { hadConv, afterNew: ui.conversation };
  });
  await p.waitForTimeout(150);
  console.log('  新对话按钮存在+点击后 conversation=' + r2.afterNew);
  ok(r2.hadConv, '应用后 conversation 确在(可续接)');
  ok(r2.afterNew === null, '点「新对话」重置线程');

  ok(errs.length === 0, '无 pageerror: ' + errs.slice(0,2).join('|'));
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
