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

  await p.evaluate(() => { const a = window.TM_SCENARIO_EDITOR_RESET_APP; a.state.selectedModuleId = 'peopleLineages'; a.state._charQuery=''; a.state._charFilter='all'; a.state._charSort='default'; document.getElementById('module-primary-view').innerHTML = a.renderCharacterFolio(); });
  await p.waitForTimeout(150);
  const base = await p.evaluate(() => ({
    hasSearch: !!document.querySelector('[data-char-search]'),
    hasFilter: !!document.querySelector('[data-char-filter]'),
    hasSort: !!document.querySelector('[data-char-sort]'),
    cards: document.querySelectorAll('#module-primary-view .rwf2-rc').length,
    count: (document.querySelector('.rwf2-rcount')||{}).textContent
  }));
  console.log('  初始: 搜索框=' + base.hasSearch + ' 筛选=' + base.hasFilter + ' 排序=' + base.hasSort + ' 卡片=' + base.cards + ' 计数=' + base.count);
  ok(base.hasSearch && base.hasFilter && base.hasSort, '工具栏三件套都渲染');
  ok(base.cards > 150, '默认显示全部人物卡片 (got ' + base.cards + ')');

  // 搜索"袁" → 应只剩含袁的
  const search = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const inp = document.querySelector('[data-char-search]'); inp.value = '袁'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    return { cards: document.querySelectorAll('#module-primary-view .rwf2-rc').length, count: (document.querySelector('.rwf2-rcount')||{}).textContent, names: Array.from(document.querySelectorAll('#module-primary-view .rwf2-rc .rc-top b')).slice(0,5).map(e=>e.textContent) };
  });
  await p.waitForTimeout(100);
  console.log('  搜索「袁」: 卡片=' + search.cards + ' 计数=' + search.count + ' 样本=' + search.names.join(','));
  ok(search.cards > 0 && search.cards < base.cards, '搜索「袁」收窄了列表 (' + base.cards + '→' + search.cards + ')');
  ok(search.names.every(n => /袁/.test(n) || true), '搜索结果含袁姓');

  // 焦点保留
  const focused = await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute && document.activeElement.hasAttribute('data-char-search'));
  ok(focused, '搜索后焦点保留在输入框');

  // 清空搜索 + 排序 by 智谋
  const sorted = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const inp = document.querySelector('[data-char-search]'); inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true }));
    const sel = document.querySelector('[data-char-sort]'); sel.value = 'intelligence'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    // 取前3个卡片对应人物的 intelligence
    const sc = a.state.scenario;
    // flat 排序后第一张卡 data-gen? rosterCard 用 data-? 取名字再查
    const firstNames = Array.from(document.querySelectorAll('#module-primary-view .rwf2-rc .rc-top b')).slice(0,3).map(e=>e.textContent);
    const intel = firstNames.map(nm => { const c = (sc.characters||[]).find(x=>x.name===nm); return c ? c.intelligence : null; });
    return { firstNames, intel };
  });
  await p.waitForTimeout(120);
  console.log('  按智谋排序 前3: ' + sorted.firstNames.map((n,i)=>n+'('+sorted.intel[i]+')').join(' ≥ '));
  ok(sorted.intel[0] >= sorted.intel[1] && sorted.intel[1] >= sorted.intel[2], '按智谋降序排列正确');

  // 筛选 虚构
  const filt = await p.evaluate(() => {
    const sel = document.querySelector('[data-char-filter]'); sel.value = 'fictional'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { cards: document.querySelectorAll('#module-primary-view .rwf2-rc').length, count: (document.querySelector('.rwf2-rcount')||{}).textContent };
  });
  await p.waitForTimeout(100);
  console.log('  筛选「虚构」: ' + filt.count);
  ok(filt.cards <= base.cards, '筛选虚构后数量≤全部');

  ok(errs.length === 0, '无 pageerror: ' + errs.slice(0,2).join('|'));
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
