// e2e — QuotaExceeded 治本：超大剧本(天启 3.7M)草稿落 IndexedDB 后备 + 重载恢复。
// 验:① 大剧本编辑后 localStorage 装不下被清空 ② 草稿落进 IndexedDB ③ 重载后编辑被恢复(不再静默丢一整轮)。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.QUOTA_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
const STORAGE_KEY = 'tm.scenarioEditorReset.previewDraft.v1';
const DB = 'tm-scenario-editor-reset-projects';
const STORE = 'projectBodies';
const DRAFT_ID = '__autosaveDraft__';
const MARKER = 'QUOTA_FIX_MARK_8472';

(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });

  const pre = await p.evaluate(() => ({ size: JSON.stringify(window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario).length }));

  // 触发一次大剧本编辑 → writeStoredDraft 走 IndexedDB 后备
  await p.evaluate((mark) => { window.TM_SCENARIO_EDITOR_RESET_APP.saveField('summary', mark); }, MARKER);
  await p.waitForTimeout(900); // 等异步 putDraftBody 落盘

  const persisted = await p.evaluate(async (args) => {
    var ls = localStorage.getItem(args.STORAGE_KEY);
    function idbGet(id) {
      return new Promise(function (resolve) {
        var req = indexedDB.open(args.DB, 1);
        req.onsuccess = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(args.STORE)) { db.close(); return resolve(null); }
          var tx = db.transaction(args.STORE, 'readonly');
          var g = tx.objectStore(args.STORE).get(args.DRAFT_ID);
          g.onsuccess = function () { db.close(); resolve(g.result || null); };
          g.onerror = function () { db.close(); resolve(null); };
        };
        req.onerror = function () { resolve(null); };
      });
    }
    var rec = await idbGet(args.DRAFT_ID);
    return {
      lsEmpty: ls === null,
      idbHasDraft: !!(rec && rec.draft && rec.draft.scenario),
      idbMarker: rec && rec.draft && rec.draft.scenario ? rec.draft.scenario.summary : null,
      indicator: (function () { var pill = document.getElementById('save-indicator'); return pill ? (pill.dataset.saveState + '|' + pill.textContent) : '(无)'; })()
    };
  }, { STORAGE_KEY, DB, STORE, DRAFT_ID });

  // 重载(同 context → IndexedDB 保留)→ 应从 IndexedDB 恢复编辑
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.waitForTimeout(300);
  const restored = await p.evaluate(() => ({ summary: window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario.summary }));

  const checks = {
    isLargeScenario: pre.size > 2000000,
    localStorageCleared: persisted.lsEmpty,
    draftInIndexedDB: persisted.idbHasDraft,
    idbHasMarker: persisted.idbMarker === MARKER,
    restoredAfterReload: restored.summary === MARKER,
    noQuotaPageErrors: !errs.some(e => /QuotaExceeded/i.test(e))
  };
  await browser.close();
  console.log(JSON.stringify({ checks, pre, persisted, restored, errs: errs.slice(0, 3) }, null, 1));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
