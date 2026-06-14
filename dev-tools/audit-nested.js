// 深审嵌套：官方 characters/factions 的子字段清单（标量 vs object），对照编辑器 roster。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const ROSTER = {
  characters: ['id','name','zi','haoName','displayName','title','officialTitle','role','faction','party','age','gender','birthYear','birthplace','birthTime','alive','isHistorical','isFictional','occupation','rankLevel','class','appearance','diction','persona','personality','ambition','personalGoal','innerThought','coreMotivations','redLines','desc'],
  factions: ['id','name','leader','leaderTitle','coLeader','color','culture','capital','territory','strength','militaryStrength','economy','fiscalCondition','ideology','traits','attitude','mainstream','currentMorale','side','primaryTarget','primaryThreat','goal','strategy','desc']
};
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM_SCENARIO_EDITOR_RESET_APP && window.TM_SCENARIO_EDITOR_RESET_APP.state, { timeout: 15000 });
  await page.waitForTimeout(400);

  async function inv(kind) {
    return await page.evaluate((kind) => {
      var arr = (window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario || {})[kind];
      if (!Array.isArray(arr)) return { n: 0, scalar: [], object: [] };
      var scalar = {}, object = {};
      arr.forEach(function (e) {
        if (!e || typeof e !== 'object') return;
        Object.keys(e).forEach(function (k) {
          var v = e[k];
          if (v && typeof v === 'object') object[k] = (object[k] || 0) + 1;
          else scalar[k] = (scalar[k] || 0) + 1;
        });
      });
      return { n: arr.length, scalar: Object.keys(scalar), object: Object.keys(object) };
    }, kind);
  }

  const out = {};
  for (const sc of ['tianqi7', 'shaosong']) {
    await page.evaluate((id) => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario(id), sc);
    await page.waitForTimeout(700);
    out[sc] = { characters: await inv('characters'), factions: await inv('factions') };
  }
  await browser.close();

  function report(kind) {
    var allScalar = new Set(), allObject = new Set();
    ['tianqi7', 'shaosong'].forEach(s => { (out[s][kind].scalar || []).forEach(k => allScalar.add(k)); (out[s][kind].object || []).forEach(k => allObject.add(k)); });
    var roster = ROSTER[kind];
    var scalarNotInRoster = [...allScalar].filter(k => roster.indexOf(k) < 0);   // 标量但不在 roster（仍经 entity-merge 显示，仅说明 roster 未收录）
    var objectFields = [...allObject];                                            // object 子字段（友好表单 JSON-only）
    var rosterNotInData = roster.filter(k => !allScalar.has(k) && !allObject.has(k)); // roster 里但官方实体都没有（可选）
    console.log('\n========== ' + kind + ' ==========');
    console.log('天启人数/势力数:', out.tianqi7[kind].n, '| 绍宋:', out.shaosong[kind].n);
    console.log('① object 嵌套子字段（友好表单不展开，仅 JSON 可编）:', objectFields);
    console.log('② 标量子字段不在 roster（仍可编，roster 漏收录）:', scalarNotInRoster);
    console.log('③ roster 有但官方实体都没填（可选）:', rosterNotInData);
  }
  report('characters');
  report('factions');
})().catch(e => { console.error('ERR', e); process.exit(2); });
