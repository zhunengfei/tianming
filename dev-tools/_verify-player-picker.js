const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

  await p.evaluate(() => { const a = window.TM_SCENARIO_EDITOR_RESET_APP; a.state.selectedModuleId = 'scenarioOpening'; document.getElementById('module-primary-view').innerHTML = a.renderOpeningFolio(); });
  await p.waitForTimeout(150);
  const ui = await p.evaluate(() => {
    const fac = document.querySelector('[data-player-pick-faction]');
    const ch = document.querySelector('[data-player-pick-char]');
    return { fac: !!fac, ch: !!ch, facOpts: fac ? fac.options.length : 0, chOpts: ch ? ch.options.length : 0 };
  });
  console.log('  下拉: 势力=' + ui.fac + '(' + ui.facOpts + '项) 角色=' + ui.ch + '(' + ui.chOpts + '项)');
  ok(ui.fac && ui.ch, '玩家入口两个下拉都渲染');
  ok(ui.facOpts > 20, '势力下拉含全部已有势力(22+1)');
  ok(ui.chOpts > 200, '角色下拉含全部已有角色(203+1)');

  // 选一个势力 → playerInfo.factionName + 字段被导入
  const r = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const sel = document.querySelector('[data-player-pick-faction]');
    sel.value = '后金'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    const pi = a.state.scenario.playerInfo || {};
    return { fn: pi.factionName, ftype: pi.factionType, fleader: pi.factionLeader, fdesc: (pi.factionDesc || '').slice(0, 20) };
  });
  await p.waitForTimeout(150);
  console.log('  选「后金」后: factionName=' + r.fn + ' type=' + r.ftype + ' leader=' + r.fleader);
  ok(r.fn === '后金', '选势力→playerInfo.factionName=后金');
  ok(!!(r.ftype || r.fleader || r.fdesc), '选势力→带出了类型/首领/简述等字段');

  // 选一个角色
  const r2 = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const sel = document.querySelector('[data-player-pick-char]');
    sel.value = '袁崇焕'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    const pi = a.state.scenario.playerInfo || {};
    return { cn: pi.characterName, ct: pi.characterTitle, intel: pi.intelligence };
  });
  await p.waitForTimeout(150);
  console.log('  选「袁崇焕」后: characterName=' + r2.cn + ' title=' + r2.ct + ' intel=' + r2.intel);
  ok(r2.cn === '袁崇焕', '选角色→playerInfo.characterName=袁崇焕');
  ok(r2.ct != null || r2.intel != null, '选角色→带出了头衔/能力等字段');

  ok(errs.length === 0, '无 pageerror: ' + errs.slice(0,2).join('|'));
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
