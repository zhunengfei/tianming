// Dev-only e2e: UI·X 逐条接受/拒绝改动 — 每条 hunk ✓/✗·拒绝某条后只落接受的(Cursor/Claude Code edit-review)·走 mock
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8784/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM && window.TM.AuthoringAgent.runAuthoringLoop && window.TM_AuthoringAgentUI && window.TM_AuthoringAgentUI._ui.adapter && document.getElementById('tm-aa-go'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  const origName = await page.evaluate(() => window.TM_AuthoringAgentUI._ui.adapter.getScenario().name);

  await page.locator('#tm-aa-req').fill('把势力名统一并补一个');
  await page.locator('#tm-aa-go').click();
  // diff 出来：每条改动一个 hunk + ✓ 开关
  await page.waitForFunction(() => document.querySelectorAll('#tm-aa-difflist .tm-aa-hunk').length >= 2, { timeout: 20000 });
  const initial = await page.evaluate(() => {
    var hunks = [...document.querySelectorAll('#tm-aa-difflist .tm-aa-hunk')];
    return {
      count: hunks.length,
      allAccepted: hunks.every(function (h) { return !h.classList.contains('rejected') && /✓/.test(h.querySelector('.hunk-tog').textContent); }),
      header: document.querySelector('[data-sec="diff"]').textContent,
      hasNameHunk: hunks.some(function (h) { return /__GRAN_NAME__/.test(h.textContent); }),
      hasFacHunk: hunks.some(function (h) { return /__GRAN_FAC__/.test(h.textContent); }),
    };
  });

  // 拒绝「改名」那一条（点它的 ✗ 开关）
  const rejected = await page.evaluate(() => {
    var hunks = [...document.querySelectorAll('#tm-aa-difflist .tm-aa-hunk')];
    var nameHunk = hunks.find(function (h) { return /__GRAN_NAME__/.test(h.textContent); });
    nameHunk.querySelector('.hunk-tog').click();
    var after = [...document.querySelectorAll('#tm-aa-difflist .tm-aa-hunk')].find(function (h) { return /__GRAN_NAME__/.test(h.textContent); });
    return {
      hunkRejected: after.classList.contains('rejected') && /✗/.test(after.querySelector('.hunk-tog').textContent),
      header: document.querySelector('[data-sec="diff"]').textContent,
    };
  });

  // 应用 → 只落接受的：改名被拒(name 不变)、新增势力被收(__GRAN_FAC__ 在)
  await page.locator('#tm-aa-apply').click();
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-status'); return s && /已应用/.test(s.textContent); }, { timeout: 8000 });
  const applied = await page.evaluate(() => {
    var sc = window.TM_AuthoringAgentUI._ui.adapter.getScenario();
    return {
      name: sc.name,
      facHasGran: Array.isArray(sc.factions) && sc.factions.some(function (f) { return f && f.name === '__GRAN_FAC__'; }),
      status: document.querySelector('#tm-aa-status').textContent,
    };
  });

  await browser.close();

  const checks = {
    hunks_rendered: initial.count >= 2 && initial.hasNameHunk && initial.hasFacHunk,
    default_all_accepted: initial.allAccepted === true && /接受 2\/2/.test(initial.header),
    reject_marks_hunk: rejected.hunkRejected === true,
    header_reflects_reject: /接受 1\/2/.test(rejected.header) && /✗1/.test(rejected.header),
    rejected_change_not_applied: applied.name === origName,         // 改名被拒 → 名字没变
    accepted_change_applied: applied.facHasGran === true,           // 新增势力被收 → 在
    partial_status: /仅接受的改动/.test(applied.status) && /拒绝了 1 处/.test(applied.status),
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, origName, initial, rejected, applied, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
