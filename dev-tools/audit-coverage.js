// 审计：正式剧本真实 top-level 字段 vs 编辑器 9 模块覆盖（两个官方剧本）。
// 输出：orphan(剧本里有但没模块管→编不了) / phantom(模块声明但剧本没有→显示"缺")
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
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

  // 官方剧本列表
  const officials = await page.evaluate(() => {
    var app = window.TM_SCENARIO_EDITOR_RESET_APP;
    var list = app.officialScenarios || [];
    return list.map(function (s, i) { return { i: i, id: s.id, name: s.name, key: s.key, file: s.file }; });
  });
  console.log('=== 官方剧本 ===');
  console.log(JSON.stringify(officials, null, 2));

  async function auditCurrent(tag) {
    return await page.evaluate((tag) => {
      var app = window.TM_SCENARIO_EDITOR_RESET_APP;
      var st = app.state;
      var scenarioKeys = Object.keys(st.scenario || {});
      var covered = {};
      (st.modules || []).forEach(function (m) {
        (m.topLevelKeys || []).forEach(function (k) { covered[k] = (covered[k] || []); covered[k].push(m.id); });
      });
      var coveredKeys = Object.keys(covered);
      var orphans = scenarioKeys.filter(function (k) { return !covered[k]; });
      var phantoms = coveredKeys.filter(function (k) { return scenarioKeys.indexOf(k) < 0; });
      // 重复归属（一个 key 进了多个模块）
      var dupes = coveredKeys.filter(function (k) { return covered[k].length > 1; }).map(function (k) { return k + ':' + covered[k].join(','); });
      return {
        tag: tag,
        scenarioName: (st.scenario && st.scenario.name) || '',
        scenarioKeyCount: scenarioKeys.length,
        moduleCount: (st.modules || []).length,
        coveredCount: coveredKeys.length,
        orphans: orphans,
        phantoms: phantoms,
        dupes: dupes,
        moduleKeyCounts: (st.modules || []).map(function (m) { return m.id + ':' + (m.topLevelKeys || []).length; })
      };
    }, tag);
  }

  const results = [];
  // 1) 当前（默认天启）
  results.push(await auditCurrent('default-loaded'));

  // 2) 逐个官方剧本
  for (const o of officials) {
    try {
      await page.evaluate((o) => {
        var app = window.TM_SCENARIO_EDITOR_RESET_APP;
        if (app.loadOfficialScenario) { try { return app.loadOfficialScenario(o.id); } catch (e) { return app.loadOfficialScenario(app.officialScenarios[o.i]); } }
      }, o);
      await page.waitForTimeout(700);
      results.push(await auditCurrent('official:' + (o.id || o.name || o.i)));
    } catch (e) { results.push({ tag: 'official:' + o.id, error: String(e) }); }
  }

  console.log('=== 覆盖审计结果 ===');
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error('AUDIT ERR', e); process.exit(2); });
