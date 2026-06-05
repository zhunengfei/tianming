const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext()).newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    var chars = app.state.scenario.characters || [];
    // 禀赋组 + 立场/家族组的 key（与代码一致）
    var ABIL = ['intelligence', 'valor', 'military', 'administration', 'management', 'charisma', 'diplomacy', 'benevolence', 'integrity', 'loyalty', 'ambition'];
    var WUCHANG = ['wisdom', 'honesty', 'righteousness', 'propriety', 'benevolenceTrait', 'morale'];
    // 跨所有 char 统计每个 ability/五常 key 的存在数
    function presence(keys) { var o = {}; keys.forEach(k => o[k] = 0); chars.forEach(c => keys.forEach(k => { if (typeof c[k] === 'number') o[k]++; })); return o; }
    // 所有 char 上出现过的"数值字段"全集（找我没覆盖的能力字段）
    var numKeys = {};
    chars.forEach(c => Object.keys(c).forEach(k => { if (typeof c[k] === 'number' && k.charAt(0) !== '_') numKeys[k] = (numKeys[k] || 0) + 1; }));
    // traits/spouse/spouseRank 看 label + 值
    var sample = chars.find(c => c.spouse || c.spouseRank || c.traits) || chars[0];
    function info(c, k) { return { onEntity: k in c, type: Array.isArray(c[k]) ? 'array[' + c[k].length + ']' : typeof c[k], val: Array.isArray(c[k]) ? JSON.stringify(c[k]).slice(0, 60) : (c[k] == null ? null : String(c[k]).slice(0, 40)) }; }
    return {
      abilPresence: presence(ABIL),
      wuchangPresence: presence(WUCHANG),
      allNumericFields: numKeys,
      traits: info(sample, 'traits'),
      spouse: info(sample, 'spouse'),
      spouseRank: info(sample, 'spouseRank'),
      sampleName: sample && sample.name
    };
  });
  await browser.close();
  console.log(JSON.stringify(r, null, 1));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
