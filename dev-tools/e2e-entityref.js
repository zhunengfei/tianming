// Dev-only e2e: UI·AH 行内实体引用跳转 — 结果里的剧本实体名渲成可点链接·点了编辑器导航到该实体(走 mock·qa 路径)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8774/preview/scenario-editor-reset-preview.html';
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
  await page.waitForFunction(() => window.TM_SCENARIO_EDITOR_RESET_APP && typeof window.TM_SCENARIO_EDITOR_RESET_APP.revealEntity === 'function' && window.TM_AuthoringAgentUI && window.TM_AuthoringAgentUI.qa, { timeout: 15000 });

  // 注入两个与 mock 回答匹配的实体（getScenario 返回 state.scenario 活引用）
  await page.evaluate(() => {
    var sc = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario;
    sc.factions = sc.factions || []; if (!sc.factions.some(function (f) { return f && f.name === '东林党'; })) sc.factions.push({ name: '东林党' });
    sc.characters = sc.characters || []; if (!sc.characters.some(function (c) { return c && c.name === '钱谦益'; })) sc.characters.push({ name: '钱谦益' });
  });
  const injected = await page.evaluate(() => {
    var sc = window.TM_AuthoringAgentUI._ui.adapter.getScenario();
    return { fac: sc.factions.some(function (f) { return f.name === '东林党'; }), chr: sc.characters.some(function (c) { return c.name === '钱谦益'; }) };
  });

  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });
  await page.locator('#tm-aa-req').fill('东林党都有谁？');
  await page.evaluate(() => window.TM_AuthoringAgentUI.qa());
  // linkify 在打字机 onDone 跑 → 等链接出现
  await page.waitForFunction(() => document.querySelector('#tm-aa-summary .je-entity-ref'), { timeout: 20000 });
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && !s.querySelector('.tm-aa-caret'); }, { timeout: 20000 });

  const links = await page.evaluate(() => {
    var as = [...document.querySelectorAll('#tm-aa-summary .je-entity-ref')];
    return { count: as.length, names: as.map(function (a) { return a.getAttribute('data-name'); }), fields: as.map(function (a) { return a.getAttribute('data-field'); }) };
  });

  // Part A · 原语：直接 revealEntity 到势力「东林党」
  const reveal = await page.evaluate(() => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP;
    var ok = app.revealEntity('factions', '东林党');
    var active = document.querySelector('.entity-row[data-active="true"] strong');
    return { ok: ok, field: app.state.selectedField, activeLabel: active ? active.textContent : '' };
  });

  // Part B · 点国师结果里的「钱谦益」链接 → 导航到人物
  await page.evaluate(() => { var a = [...document.querySelectorAll('#tm-aa-summary .je-entity-ref')].find(function (x) { return x.getAttribute('data-name') === '钱谦益'; }); if (a) a.click(); });
  await page.waitForTimeout(120);
  const clicked = await page.evaluate(() => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP;
    var tgt = app.state.scenario.characters[app.state.selectedEntityIndex];   // 按 state 直接核导航目标（不依赖列表 slice 渲染）
    return { field: app.state.selectedField, targetName: tgt ? tgt.name : '', status: (document.querySelector('#tm-aa-status') || {}).textContent || '' };
  });

  await browser.close();

  const checks = {
    entities_injected: injected.fac === true && injected.chr === true,
    links_rendered: links.count >= 2 && links.names.indexOf('东林党') >= 0 && links.names.indexOf('钱谦益') >= 0,
    link_fields_correct: links.fields.indexOf('factions') >= 0 && links.fields.indexOf('characters') >= 0,
    reveal_primitive: reveal.ok === true && reveal.field === 'factions' && /东林党/.test(reveal.activeLabel),
    click_navigates: clicked.field === 'characters' && clicked.targetName === '钱谦益' && /已跳到/.test(clicked.status),
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, injected, links, reveal, clicked, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
