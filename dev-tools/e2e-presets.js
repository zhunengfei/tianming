// Dev-only e2e: 预置提示词（section-aware buildPrompt）+ UI 优化（头部换行 + ⌘K 提示）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8782/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window._jeBuildPrompt && document.querySelector('#tm-aa-hd'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  // 预置提示词：按 section 关键词注入要点
  const prompts = await page.evaluate(() => ({
    chara: window._jeBuildPrompt('generate', '人物'),
    faction: window._jeBuildPrompt('polish', '势力'),
    event: window._jeBuildPrompt('generate', '事件'),
    generic: window._jeBuildPrompt('fill-field', 'someRandomField'),
    relation: window._jeBuildPrompt('generate', '关系')
  }));

  // UI 优化：头部 flex-wrap + ⌘K 提示
  const ui = await page.evaluate(() => {
    var hd = document.querySelector('#tm-aa-hd');
    var sub = document.querySelector('#tm-aa-hd .sub');
    return {
      headerWraps: getComputedStyle(hd).flexWrap === 'wrap',
      cmdkHint: sub ? sub.textContent : '',
      btnCount: hd.querySelectorAll('.je-aa-test').length
    };
  });

  // ⌘K 提示可点开命令面板
  await page.locator('#tm-aa-hd .sub').click();
  await page.waitForTimeout(150);
  const subOpensCmdk = await page.evaluate(() => { var b = document.querySelector('.je-cmdk-back'); return b && !b.hidden; });

  await browser.close();

  const checks = {
    chara_guide: /本部分要点/.test(prompts.chara) && /AI 人格|能力数值|忠奸不脸谱化/.test(prompts.chara),
    faction_guide: /本部分要点/.test(prompts.faction) && /领袖|一家独大|平衡/.test(prompts.faction),
    event_guide: /本部分要点/.test(prompts.event) && /触发条件|戏剧张力/.test(prompts.event),
    relation_guide: /本部分要点/.test(prompts.relation) && /from\/to|类型具体|自洽/.test(prompts.relation),
    section_specific: /AI 人格/.test(prompts.chara) && !/AI 人格/.test(prompts.faction) && /领袖/.test(prompts.faction) && /草稿待我确认/.test(prompts.generic),
    header_wraps: ui.headerWraps === true,
    cmdk_hint_shown: /⌘K/.test(ui.cmdkHint),
    cmdk_hint_clickable: subOpensCmdk === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, prompts, ui, subOpensCmdk, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
