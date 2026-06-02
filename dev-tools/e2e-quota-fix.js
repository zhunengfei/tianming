// Dev-only e2e: 修 quota — 对真·天启大剧本(3.7M字符) commit 不再抛 QuotaExceededError，编辑落地、提示优雅
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8767/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const U = window.TM_AuthoringAgentUI;
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    return U && U._ui && U._ui.adapter && app && app.state && (app.state.scenario.characters || []).length > 0;
  }, { timeout: 15000 });

  const r = await page.evaluate(() => {
    const U = window.TM_AuthoringAgentUI, ad = U._ui.adapter;
    const sc = ad.getScenario();
    const charCount = JSON.stringify(sc).length;
    const before = sc.name;
    // 模拟一次对大剧本的"应用"：clone + 改名 + commit（修复前这里会 throw QuotaExceededError）
    const mod = JSON.parse(JSON.stringify(sc));
    mod.name = (before || '') + '·已改';
    var threw = null;
    try { ad.commit(mod); } catch (e) { threw = String((e && e.name) || e); }
    const after = ad.getScenario().name;
    // 存档指示器状态
    var pill = document.getElementById('save-indicator');
    return {
      charCount: charCount,
      threw: threw,
      committedName: after,
      changed: after === (before || '') + '·已改',
      indicator: pill ? (pill.dataset.saveState + '|' + pill.textContent) : '(无指示器)',
      // localStorage 里没把大草稿塞进去（被跳过）
      draftStored: (function () { try { return !!localStorage.getItem('tm.scenarioEditorReset.previewDraft.v1'); } catch (e) { return null; } })()
    };
  });

  await browser.close();

  const checks = {
    big_scenario: r.charCount > 1000000,
    commit_no_throw: r.threw === null,
    edit_landed: r.changed === true,
    autosave_degraded_gracefully: /剧本过大|存储空间不足/.test(r.indicator) || r.draftStored === false,
    no_page_errors_from_quota: !errs.some(function (e) { return /QuotaExceeded/i.test(e); }),
  };
  console.log(JSON.stringify({ checks, r, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
