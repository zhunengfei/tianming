const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  // 预置一个 tm_api（模拟游戏里设过的主API）
  await p.evaluate(() => localStorage.setItem('tm_api', JSON.stringify({ key: 'sk-existing-123', url: 'https://relay.example/v1/chat/completions', model: 'claude-sonnet-4' })));
  const r = await p.evaluate(async () => {
    const out = []; const ok = (n, c, i) => out.push((c ? 'PASS ' : 'RED  ') + n + (i ? ' [' + i + ']' : ''));
    // 1) 顶栏 ⚙ 按钮
    var btn = document.querySelector('[data-editor-command="open-api-settings-modal"]');
    ok('顶栏⚙按钮存在', !!btn);
    // 2) 点开弹窗
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, 120));
    var modal = document.getElementById('gm-api-modal'); ok('弹窗打开', !!modal);
    // 3) 预填来自 tm_api（同源验证）
    ok('预填读 tm_api · url', document.getElementById('gm-api-url').value === 'https://relay.example/v1/chat/completions', document.getElementById('gm-api-url').value);
    ok('预填读 tm_api · model', document.getElementById('gm-api-model').value === 'claude-sonnet-4');
    ok('预填读 tm_api · key', document.getElementById('gm-api-key').value === 'sk-existing-123');
    // 4) 改 + 保存 → 写回 tm_api（扁平结构=游戏兼容）
    document.getElementById('gm-api-model').value = 'gpt-4o-mini';
    document.getElementById('gm-api-key').value = 'sk-new-999';
    document.querySelector('[data-editor-command="save-api-settings-modal"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await new Promise(r => setTimeout(r, 150));
    var saved = JSON.parse(localStorage.getItem('tm_api') || '{}');
    ok('保存写回 tm_api', saved.model === 'gpt-4o-mini' && saved.key === 'sk-new-999' && saved.url === 'https://relay.example/v1/chat/completions', JSON.stringify(saved));
    ok('结构扁平(游戏兼容{key,url,model})', ('key' in saved) && ('url' in saved) && ('model' in saved) && !('main' in saved));
    ok('保存后弹窗关闭', !document.getElementById('gm-api-modal'));
    // 5) 国师读到同一份
    var cfg = window.TM.AuthoringAgent.loadEditorApiConfig();
    ok('国师 loadEditorApiConfig 同源', cfg.model === 'gpt-4o-mini' && cfg.key === 'sk-new-999', JSON.stringify(cfg));
    return out;
  });
  r.forEach(x => console.log(x));
  // 截图弹窗
  await p.evaluate(() => document.querySelector('[data-editor-command="open-api-settings-modal"]').click()); await p.waitForTimeout(150);
  const m = await p.$('#gm-api-modal'); if (m) await m.screenshot({ path: 'dev-tools/shot-api-modal.png' });
  await b.close(); process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
