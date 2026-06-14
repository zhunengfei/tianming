// 审计 Layer2：游戏真读字段(RUNTIME_FIELD_SURFACES, 源码抽) vs 编辑器模块覆盖(104 topLevelKeys)。
const PW = process.env.PW_PATH || 'playwright';
const fs = require('fs');
const { chromium } = require(PW);
(async () => {
  // 源码抽 runtimeSurface 字段
  const src = fs.readFileSync('preview/scenario-editor-reset-app.js', 'utf8');
  const R = Array.from(new Set((src.match(/runtimeSurface\('([^']+)'/g) || []).map(m => m.replace(/runtimeSurface\('/, '').replace(/'$/, ''))));

  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM_SCENARIO_EDITOR_RESET_APP && window.TM_SCENARIO_EDITOR_RESET_APP.state, { timeout: 15000 });
  await page.waitForTimeout(500);

  const data = await page.evaluate(() => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP;
    function coverAndKeys() {
      var st = app.state;
      var covered = {};
      (st.modules || []).forEach(function (m) { (m.topLevelKeys || []).forEach(function (k) { covered[k] = 1; }); });
      return { covered: Object.keys(covered), scenarioKeys: Object.keys(st.scenario || {}) };
    }
    var out = { tianqi: null, shaosong: null };
    out.tianqi = coverAndKeys();
    return out;
  });

  // 绍宋
  await page.evaluate(() => { var app = window.TM_SCENARIO_EDITOR_RESET_APP; if (app.loadOfficialScenario) app.loadOfficialScenario('shaosong'); });
  await page.waitForTimeout(700);
  const ss = await page.evaluate(() => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP; var st = app.state;
    return { scenarioKeys: Object.keys(st.scenario || {}) };
  });
  await browser.close();

  const covered = data.tianqi.covered; // 模块覆盖与剧本无关，固定 104
  const tqKeys = data.tianqi.scenarioKeys;
  const ssKeys = ss.scenarioKeys;
  const allRealKeys = Array.from(new Set(tqKeys.concat(ssKeys)));

  const notSurfaced = R.filter(f => covered.indexOf(f) < 0);          // 游戏读但模块不管
  const surfacedNotInData = R.filter(f => allRealKeys.indexOf(f) < 0); // 游戏读、模块管，但两个官方剧本都没填（可选/默认）
  const coveredNotRuntime = covered.filter(k => R.indexOf(k) < 0 && !/^_/.test(k)); // 模块管但 RUNTIME 表没列（编辑器多管的/或审计表漏列）

  console.log('runtimeSurface 字段数:', R.length, '| 模块覆盖:', covered.length);
  console.log('\n=== ① 游戏真读但模块不覆盖（真缺口！应为空） ===');
  console.log(notSurfaced.length ? notSurfaced : '（无）');
  console.log('\n=== ② 游戏读+模块管，但两官方剧本都没填（可选字段，编辑器有入口可补） ===');
  console.log(surfacedNotInData);
  console.log('\n=== ③ 模块管但不在 RUNTIME 表（编辑器多给的字段 / 或审计表未收录，需人工判是否游戏真用） ===');
  console.log(coveredNotRuntime);
})().catch(e => { console.error('ERR', e); process.exit(2); });
