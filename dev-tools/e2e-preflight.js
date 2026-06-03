// Dev-only e2e: 方向E 真实运行时校验 — 🩺体检(确定性·无需API)·真天启剧本可运行·坏剧本出阻塞·/体检命令·preflight工具在册
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8770/preview/scenario-editor-reset-preview.html';
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
    return U && U.preflight && AA && AA.preflight && document.querySelector('.je-aa-preflight') &&
      window.TM_SCENARIO_EDITOR_RESET_APP && window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario.characters.length > 0;
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); });

  // preflight 工具在 AGENT_TOOLS
  const toolPresent = await page.evaluate(() => window.TM.AuthoringAgent.AGENT_TOOLS.some(t => t.name === 'preflight'));

  // 点 🩺 体检（真·天启剧本）
  await page.locator('.je-aa-preflight').click();
  await page.waitForFunction(() => {
    const s = document.querySelector('#tm-aa-summary');
    return s && s.style.display !== 'none' && /运行时体检/.test(s.textContent);
  }, { timeout: 8000 });
  const real = await page.evaluate(() => {
    const AA = window.TM.AuthoringAgent;
    const pf = AA.preflight(AA.makeDraft(window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario));
    return { summary: document.querySelector('#tm-aa-summary').textContent, bootable: pf.bootable, blockers: pf.blockers, warnings: pf.warnings.length };
  });

  // 坏剧本（重名·幽灵 holder·无玩家）→ 阻塞
  const broken = await page.evaluate(() => {
    const AA = window.TM.AuthoringAgent;
    const d = AA.makeDraft({ name: 't', factions: [{ name: '明' }], characters: [{ name: '甲', faction: '明' }, { name: '甲', faction: '明' }], officeTree: [{ id: 'o', name: '阁', positions: [{ name: '首辅', holder: '幽灵' }], subs: [] }] });
    const pf = AA.dispatchTool(d, 'preflight', {});
    return { bootable: pf.bootable, blockerCount: (pf.blockers || []).length, hasDup: (pf.blockers || []).some(b => /重名/.test(b)), hasPhantom: (pf.blockers || []).some(b => /holder|幽灵/.test(b)), hasNoPlayer: (pf.blockers || []).some(b => /isPlayer|玩家/.test(b)) };
  });

  // /体检 slash 命令
  await page.evaluate(() => { document.querySelector('#tm-aa-difflist').innerHTML = ''; document.querySelector('#tm-aa-summary').style.display = 'none'; });
  const req = page.locator('#tm-aa-req');
  await req.click(); await req.fill(''); await req.type('/体检', { delay: 20 });
  await req.press('Enter');
  const slashWorks = await page.waitForFunction(() => {
    const s = document.querySelector('#tm-aa-summary');
    return s && s.style.display !== 'none' && /运行时体检/.test(s.textContent);
  }, { timeout: 8000 }).then(() => true).catch(() => false);

  await browser.close();

  const checks = {
    tool_in_agent_tools: toolPresent,
    real_scenario_report_rendered: /运行时体检/.test(real.summary),
    real_scenario_bootable: real.bootable === true,
    broken_not_bootable: broken.bootable === false,
    broken_dup_blocker: broken.hasDup,
    broken_phantom_blocker: broken.hasPhantom,
    broken_noplayer_blocker: broken.hasNoPlayer,
    slash_preflight_works: slashWorks,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, real: { summary: real.summary, bootable: real.bootable, blockers: real.blockers, warnings: real.warnings }, broken, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
