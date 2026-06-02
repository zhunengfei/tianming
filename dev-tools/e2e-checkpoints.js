// Dev-only e2e: 方向G 检查点/分支回溯 — 存点·多级回退·undo 弹栈·列表渲染（纯 UI 侧·无需 API）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8766/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('dialog', d => d.accept().catch(() => {}));   // 自动确认任何弹窗
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const U = window.TM_AuthoringAgentUI;
    return U && U.checkpoint && U.restore && U.checkpoints && U.undo && U._ui && U._ui.adapter &&
      document.querySelector('.je-aa-ckpt');
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); var d = document.querySelector('.je-aa-ckpt'); if (d) d.open = true; });

  // 用一个小剧本替换（隔离编辑器自身 writeStoredDraft 对 3.7M 大剧本的 localStorage quota——pre-existing 问题，与检查点无关）
  await page.evaluate(() => {
    try { localStorage.removeItem('tm.scenarioEditorReset.previewDraft.v1'); } catch (e) {}
    var app = window.TM_SCENARIO_EDITOR_RESET_APP;
    app.state.scenario = { name: '小测试剧本', characters: [{ name: '甲' }, { name: '乙' }], factions: [{ name: '丙' }] };
  });

  const r = await page.evaluate(() => {
    const U = window.TM_AuthoringAgentUI, ad = U._ui.adapter;
    const out = {};
    const n0 = ad.getScenario().name;
    out.n0 = n0;
    U.checkpoint('起点');
    out.len1 = U.checkpoints().length;
    // 模拟一次编辑提交
    const mod = JSON.parse(JSON.stringify(ad.getScenario())); mod.name = 'CKPT_TEST_X1'; ad.commit(mod);
    out.afterCommit = ad.getScenario().name;
    U.checkpoint('改后');
    out.len2 = U.checkpoints().length;
    // 回到「起点」
    const qi = U.checkpoints().filter(c => c.label === '起点')[0];
    U.restore(qi.id);
    out.afterRestore = ad.getScenario().name;     // 应 = n0
    out.len3 = U.checkpoints().length;            // 起点+改后+回退前 = 3
    // undo 弹栈 → 恢复「回退前」(它捕获的是 X1 状态)
    U.undo();
    out.afterUndo = ad.getScenario().name;        // 应 = X1
    out.len4 = U.checkpoints().length;            // 2
    return out;
  });

  // DOM：列表渲染 + summary 计数 + undo 按钮可见
  const dom = await page.evaluate(() => {
    return {
      summary: document.querySelector('.je-aa-ckpt summary').textContent,
      rows: document.querySelectorAll('.je-aa-ckpt .je-ckpt-row').length,
      undoVisible: !document.querySelector('.je-aa-undo').hidden
    };
  });

  // 点列表里的「回到」按钮（回到最旧的「起点」如果还在；此时栈为[起点,改后]）
  const clicked = await page.evaluate(() => {
    const U = window.TM_AuthoringAgentUI;
    const qi = U.checkpoints().filter(c => c.label === '起点')[0];
    if (!qi) return { ok: false };
    // 找到对应行的按钮点击
    const rows = [...document.querySelectorAll('.je-aa-ckpt .je-ckpt-row')];
    const row = rows.filter(rw => /起点/.test(rw.querySelector('.lbl').textContent))[0];
    if (row) row.querySelector('button').click();
    return { ok: true, name: U._ui.adapter.getScenario().name };
  });

  await browser.close();

  const checks = {
    checkpoint_added: r.len1 === 1,
    commit_changed_name: r.afterCommit === 'CKPT_TEST_X1',
    second_checkpoint: r.len2 === 2,
    restore_went_back: r.afterRestore === r.n0,
    restore_pushed_preback: r.len3 === 3,
    undo_pops_and_restores: r.afterUndo === 'CKPT_TEST_X1' && r.len4 === 2,
    dom_rows_rendered: dom.rows >= 2,
    dom_summary_count: /检查点（\d+）/.test(dom.summary),
    undo_button_visible: dom.undoVisible,
    list_restore_button_works: clicked.ok && clicked.name === r.n0,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, r, dom, clicked, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
