// Dev-only e2e: 方向T 一致性守护（实时）— 破坏剧本→查出阻塞弹横幅·observer 经 save-indicator 触发·开关·干净不打扰（无需 API）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8778/preview/scenario-editor-reset-preview.html';
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
    return window._jeGuardRun && window._jeGuardSetEnabled && document.querySelector('.je-guard-toast') &&
      document.querySelector('.je-aa-guard-toggle') && window.TM_SCENARIO_EDITOR_RESET_APP &&
      window.TM && window.TM.AuthoringAgent && window.TM.AuthoringAgent.preflight;
  }, { timeout: 15000 });

  // 干净 天启：跑守护 → 横幅隐藏（0 阻塞·不打扰）
  const clean = await page.evaluate(() => { window._jeGuardRun(); return document.querySelector('.je-guard-toast').hidden; });

  // 破坏：加一个引用不存在势力的人物 → faction-refs 阻塞
  await page.evaluate(() => {
    var sc = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario;
    sc.characters.push({ name: '测试幽灵T', faction: '根本不存在的势力XYZ' });
  });

  // A) 直接跑守护 → 横幅出现 + 含阻塞文案
  const broken = await page.evaluate(() => {
    window._jeGuardRun();
    var t = document.querySelector('.je-guard-toast');
    return { hidden: t.hidden, text: t.querySelector('.gt-body').textContent, hasDetail: !!t.querySelector('.gt-detail') };
  });

  // 先收起，B) 经 #save-indicator 的属性变化触发 observer（模拟编辑器保存信号）
  await page.evaluate(() => {
    document.querySelector('.je-guard-toast').hidden = true;
    var ind = document.getElementById('save-indicator');
    if (!ind) { ind = document.createElement('span'); ind.id = 'save-indicator'; document.body.appendChild(ind); }
    // 触发属性变化（observer 监听 data-save-state）
    ind.setAttribute('data-save-state', 'saving');
    setTimeout(function () { ind.setAttribute('data-save-state', 'saved'); }, 50);
  });
  const observerFired = await page.waitForFunction(() => !document.querySelector('.je-guard-toast').hidden, { timeout: 4000 }).then(() => true).catch(() => false);

  // C) 关守护 → 横幅隐藏，再触发也不弹
  const toggledOff = await page.evaluate(() => {
    window._jeGuardSetEnabled(false);
    window._jeGuardRun();   // 即便手动跑也不弹
    return document.querySelector('.je-guard-toast').hidden;
  });

  // D) 修好（移除幽灵）+ 重新开守护 → 干净·不打扰
  const fixedClean = await page.evaluate(() => {
    var sc = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario;
    sc.characters = sc.characters.filter(function (c) { return c.name !== '测试幽灵T'; });
    window._jeGuardSetEnabled(true);
    window._jeGuardRun();
    return document.querySelector('.je-guard-toast').hidden;
  });

  await browser.close();

  const checks = {
    clean_no_toast: clean === true,
    broken_shows_toast: broken.hidden === false,
    toast_has_blocker_text: /一致性|问题|势力/.test(broken.text),
    toast_has_detail_btn: broken.hasDetail,
    observer_fires_on_save_signal: observerFired === true,
    toggle_off_suppresses: toggledOff === true,
    fixed_clean_no_toast: fixedClean === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, clean, broken, observerFired, toggledOff, fixedClean, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
