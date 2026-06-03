// Dev-only e2e: 方向J 从官方剧本学习（开关式）— 📚开关→注入剧本范例·关→不注入·估算反映（真天启·无需 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8774/preview/scenario-editor-reset-preview.html';
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
    return U && U._ui && AA && AA.buildExemplars && document.querySelector('.je-aa-fewshot') &&
      window.TM_SCENARIO_EDITOR_RESET_APP && window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario.characters.length > 0;
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });

  // buildExemplars 直接在真天启上抽样 → 有界、含真实体
  const built = await page.evaluate(() => {
    const AA = window.TM.AuthoringAgent;
    const sc = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario;
    const ex = AA.buildExemplars(sc);
    const firstChar = sc.characters[0] && sc.characters[0].name;
    return { len: ex.length, hasCharBlock: /characters 范例/.test(ex), hasRealEntity: !!firstChar && ex.indexOf(firstChar) >= 0, fullLen: JSON.stringify(sc).length };
  });

  // 勾选 📚 → ui.exemplars 被填；估算抬高
  const toggled = await page.evaluate(() => {
    const cb = document.querySelector('.je-aa-fewshot input');
    cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    const u = window.TM_AuthoringAgentUI._ui;
    const AA = window.TM.AuthoringAgent;
    const draft = AA.makeDraft(window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario);
    const withEx = AA.estimateRun(draft, '加个新人物', { exemplars: u.exemplars }).perCallInput;
    const noEx = AA.estimateRun(draft, '加个新人物', { exemplars: null }).perCallInput;
    return { exemplarsSet: !!u.exemplars, exemplarsLen: (u.exemplars || '').length, estWith: withEx, estNo: noEx };
  });

  // 取消勾选 → ui.exemplars 清空
  const off = await page.evaluate(() => {
    const cb = document.querySelector('.je-aa-fewshot input');
    cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true }));
    return { exemplarsNull: !window.TM_AuthoringAgentUI._ui.exemplars };
  });

  await browser.close();

  const checks = {
    exemplars_bounded: built.len > 0 && built.len < 8000 && built.fullLen > 1000000,   // 远小于 3.7M 全本
    exemplars_has_char_block: built.hasCharBlock,
    exemplars_has_real_entity: built.hasRealEntity,
    toggle_on_sets_exemplars: toggled.exemplarsSet && toggled.exemplarsLen > 0,
    estimate_bumps_with_exemplars: toggled.estWith > toggled.estNo,
    toggle_off_clears: off.exemplarsNull,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, built, toggled, off, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
