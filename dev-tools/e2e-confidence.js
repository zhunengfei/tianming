// Dev-only e2e: 置信度标注 — agent flagUncertain → diff ⚠高亮 + 理由 + 待核计数（走 mock）
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
  await page.waitForFunction(() => window.TM && window.TM.AuthoringAgent && window.TM.AuthoringAgent.AGENT_TOOLS.some(t => t.name === 'flagUncertain') && document.getElementById('tm-aa-go'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  // 跑一次编辑（mock 会吐 applyEdit(name) + flagUncertain(name)）
  const req = page.locator('#tm-aa-req');
  await req.click(); await req.fill('改个名');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => { var d = document.querySelector('#tm-aa-difflist'); return d && d.querySelectorAll('.tm-aa-diff-group').length >= 1; }, { timeout: 20000 });

  const r = await page.evaluate(() => {
    var diff = document.querySelector('#tm-aa-difflist');
    var diffSec = document.querySelector('[data-sec="diff"]');
    return {
      sectionShowsCount: /待核/.test(diffSec ? diffSec.textContent : ''),
      uncertainEntries: diff.querySelectorAll('.uncertain').length,
      uncReasonShown: diff.querySelector('.tm-aa-unc') ? diff.querySelector('.tm-aa-unc').textContent : '',
      groupHeadHasWarn: [...diff.querySelectorAll('.tm-aa-diff-head')].some(function (h) { return /⚠/.test(h.textContent); })
    };
  });

  await browser.close();

  const checks = {
    tool_in_agent_tools: true,
    section_shows_uncertain_count: r.sectionShowsCount,
    entry_highlighted: r.uncertainEntries >= 1,
    reason_shown: /待核|推测|核实/.test(r.uncReasonShown),
    group_head_warns: r.groupHeadHasWarn,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, r, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
