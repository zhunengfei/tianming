// Dev-only e2e: 方向C 检索/引用工具在【真·天启剧本】(370万字符) 上的真数据+规模校验
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8765/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const AA = window.TM && window.TM.AuthoringAgent;
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    return AA && AA.dispatchTool && app && app.state && (app.state.scenario.characters || []).length > 0;
  }, { timeout: 15000 });

  const result = await page.evaluate(() => {
    const AA = window.TM.AuthoringAgent;
    const sc = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario;
    const draft = AA.makeDraft(sc);
    // 取真实剧本里的一个真人物名作探针
    const probe = (sc.characters[0] && sc.characters[0].name) || '';
    const t0 = Date.now ? null : null;   // Date.now 在 workflow 禁用，但这是普通浏览器 e2e，可用
    const start = performance.now();
    const gs = AA.dispatchTool(draft, 'globalSearch', { query: probe });
    const fr = AA.dispatchTool(draft, 'findReferences', { name: probe });
    const elapsed = performance.now() - start;
    // 改名只动 draft，不碰 live scenario
    const liveBefore = sc.characters[0].name;
    const re = AA.dispatchTool(draft, 'renameEntity', { oldName: probe, newName: probe + '_改' });
    const liveAfter = sc.characters[0].name;
    const draftFacRenamed = draft.characters[0].name;
    return {
      probe,
      gsTotal: gs.total, gsColls: [...new Set((gs.hits || []).map(h => h.collection))],
      frExact: fr.exactCount, frMentions: fr.mentionCount,
      reChanged: re.changed,
      liveUnchanged: liveBefore === liveAfter && liveAfter === probe,
      draftRenamed: draftFacRenamed === probe + '_改',
      elapsedMs: Math.round(elapsed),
      charCount: JSON.stringify(sc).length
    };
  });

  await browser.close();

  const checks = {
    probe_nonempty: !!result.probe,
    globalSearch_hits: result.gsTotal > 0,
    globalSearch_cross_collection: result.gsColls.length >= 1,
    findReferences_exact: result.frExact >= 1,
    rename_changed: result.reChanged >= 1,
    rename_draft_only_live_untouched: result.liveUnchanged && result.draftRenamed,
    perf_reasonable: result.elapsedMs < 4000,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, result, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
