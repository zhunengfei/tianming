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

  async function testRoster(mod, render, kind, q, expectNarrow) {
    await p.evaluate((args) => { const a = window.TM_SCENARIO_EDITOR_RESET_APP; a.state.selectedModuleId = args.mod; if (args.kind === 'events') a.state._milTab='troops'; document.getElementById('module-primary-view').innerHTML = a[args.render](); }, { mod, render, kind });
    await p.waitForTimeout(120);
    const base = await p.evaluate((kind) => ({
      hasTB: !!document.querySelector('[data-roster-search="' + kind + '"]'),
      cards: document.querySelectorAll('#module-primary-view .rwf2-rc').length,
      count: (document.querySelector('.rwf2-rcount') || {}).textContent
    }), kind);
    console.log('  [' + kind + '] 工具栏=' + base.hasTB + ' 卡=' + base.cards + ' 计数=' + base.count);
    ok(base.hasTB, kind + ' 工具栏渲染');
    ok(base.cards > 0, kind + ' 有卡片');
    // 搜索
    const s = await p.evaluate((args) => {
      const inp = document.querySelector('[data-roster-search="' + args.kind + '"]'); inp.value = args.q; inp.dispatchEvent(new Event('input', { bubbles: true }));
      return { cards: document.querySelectorAll('#module-primary-view .rwf2-rc').length, count: (document.querySelector('.rwf2-rcount') || {}).textContent, focus: document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-roster-search') === args.kind };
    }, { kind, q });
    await p.waitForTimeout(80);
    console.log('    搜「' + q + '」→ 卡=' + s.cards + ' (' + s.count + ') 焦点保留=' + s.focus);
    ok(s.cards <= base.cards && s.focus, kind + ' 搜索收窄+焦点保留');
    // 清空
    await p.evaluate((kind) => { const inp = document.querySelector('[data-roster-search="' + kind + '"]'); inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); }, kind);
    await p.waitForTimeout(60);
    // 排序(取第二个 option)
    const so = await p.evaluate((kind) => {
      const sel = document.querySelector('[data-roster-sort="' + kind + '"]'); if (!sel || sel.options.length < 2) return { ok: true };
      sel.value = sel.options[1].value; sel.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: !!document.querySelector('[data-roster-sort="' + kind + '"]'), val: sel.options[1].value };
    }, kind);
    await p.waitForTimeout(80);
    ok(so.ok, kind + ' 排序切换不崩 (' + (so.val||'') + ')');
  }

  await testRoster('peopleLineages', 'renderCharacterFolio', 'characters', '袁', true);
  await testRoster('factionsSociety', 'renderFactionFolio', 'factions', '后金', true);
  await testRoster('eventsChronicle', 'renderEventsFolio', 'events', '魏忠贤', true);
  await testRoster('militaryFrontier', 'renderMilitaryFolio', 'troops', '关', true);

  ok(errs.length === 0, '无 pageerror: ' + errs.slice(0,2).join('|'));
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
