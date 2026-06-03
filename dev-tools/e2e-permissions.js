// Dev-only e2e: 方向F 自主度/权限分级 — 🔐面板→ui状态接线 + 权限经 ui 真流入 run 的强制（浏览器）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8768/preview/scenario-editor-reset-preview.html';
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
    const U = window.TM_AuthoringAgentUI, AA = window.TM && window.TM.AuthoringAgent;
    return U && U._ui && AA && AA.runAuthoringLoop && document.querySelector('.je-aa-perm');
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); var d = document.querySelector('.je-aa-perm'); if (d) d.open = true; });

  // ---- Part A: 面板 → ui 状态 ----
  const partA = await page.evaluate(() => {
    var pbox = document.querySelector('.je-aa-perm');
    // 自主度 = 全自动
    var sel = pbox.querySelector('.je-perm-auto'); sel.value = 'auto'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    // 关危险操作
    var dc = pbox.querySelector('.je-perm-destructive'); dc.checked = false; dc.dispatchEvent(new Event('change', { bubbles: true }));
    // 取消勾选 factions（若存在）
    var boxes = [].slice.call(pbox.querySelectorAll('.je-perm-coll input'));
    var fac = boxes.filter(function (b) { return b.value === 'factions'; })[0];
    if (fac) { fac.checked = false; fac.dispatchEvent(new Event('change', { bubbles: true })); }
    var u = window.TM_AuthoringAgentUI._ui;
    return {
      autonomy: u.autonomy,
      allowDestructive: u.allowDestructive,
      allowedNonNull: Array.isArray(u.allowedCollections),
      excludesFactions: Array.isArray(u.allowedCollections) ? (u.allowedCollections.indexOf('factions') < 0) : null,
      includesCharacters: Array.isArray(u.allowedCollections) ? (u.allowedCollections.indexOf('characters') >= 0) : null,
      hadFactionsBox: !!fac
    };
  });

  // ---- Part B: 用 ui 的权限跑一次（注入 caller·浏览器内真 _permCheck）----
  const partB = await page.evaluate(async () => {
    const AA = window.TM.AuthoringAgent, u = window.TM_AuthoringAgentUI._ui;
    const draft = AA.makeDraft({ name: 'x', characters: [{ name: '甲' }], factions: [{ name: '乙' }] });
    let n = 0;
    const calls = [
      { name: 'applyPush', input: { path: 'characters', value: { name: '丙' } } },   // characters 在范围内→放行
      { name: 'applyPush', input: { path: 'factions', value: { name: '丁' } } },      // factions 被排除→拦
      { name: 'removeEntity', input: { path: 'characters.甲' } }                       // 危险操作禁用→拦
    ];
    const res = await AA.runAuthoringLoop(draft, 'x', {
      allowedCollections: u.allowedCollections,
      allowDestructive: u.allowDestructive,
      caller: function () { n++; return Promise.resolve({ toolCalls: n <= calls.length ? [calls[n - 1]] : [{ name: 'finish', input: { summary: 'ok' } }] }); }
    });
    const t = res.transcript;
    const charPush = t.filter(function (x) { return x.name === 'applyPush' && x.input.path === 'characters'; })[0];
    const facPush = t.filter(function (x) { return x.name === 'applyPush' && x.input.path === 'factions'; })[0];
    const rm = t.filter(function (x) { return x.name === 'removeEntity'; })[0];
    return {
      charAllowed: charPush && charPush.result.ok !== false,
      facBlocked: facPush && facPush.result.ok === false,
      facReason: facPush && facPush.result.reason,
      rmBlocked: rm && rm.result.ok === false
    };
  });

  await browser.close();

  const checks = {
    A_autonomy_auto: partA.autonomy === 'auto',
    A_destructive_off: partA.allowDestructive === false,
    A_scope_nonnull: partA.allowedNonNull === true,
    A_scope_excludes_factions: partA.hadFactionsBox ? partA.excludesFactions === true : true,
    A_scope_keeps_characters: partA.hadFactionsBox ? partA.includesCharacters === true : true,
    B_characters_allowed: partB.charAllowed === true,
    B_factions_blocked: partB.facBlocked === true,
    B_destructive_blocked: partB.rmBlocked === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, partA, partB, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
