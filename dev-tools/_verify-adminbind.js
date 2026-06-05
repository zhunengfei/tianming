// e2e：adminMap 主视图 地图绑定显形 + 校准 + 逐块编辑
const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(500);

  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };

  // 进 adminMap 主视图
  await p.evaluate(() => { const a = window.TM_SCENARIO_EDITOR_RESET_APP; a.state.selectedModuleId = 'adminMap'; a.setWorkbenchPanel('structured-workbench'); });
  await p.waitForTimeout(250);
  await p.evaluate(() => { const H = document.getElementById('module-primary-view'); H.innerHTML = window.TM_SCENARIO_EDITOR_RESET_APP.renderAdminFolio(); });
  await p.waitForTimeout(120);

  // 1. 对应带存在 + 计数
  const sum = await p.evaluate(() => {
    const band = document.querySelector('.adt-band'); if (!band) return null;
    const spans = Array.from(band.querySelectorAll('.adt-band-sum > span')).map(s => s.textContent.trim());
    return { txt: band.querySelector('.adt-band-sum b') ? band.querySelector('.adt-band-sum b').textContent : '', spans, hasCalBtn: !!band.querySelector('.adt-calbtn'), unbound: (band.querySelector('.adt-unbound') || {}).textContent || '' };
  });
  ok(sum, '对应带 .adt-band 存在');
  if (sum) {
    console.log('  带摘要:', sum.txt, '|', sum.spans.join(' · '));
    console.log('  无地块区划:', sum.unbound.slice(0, 80));
    ok(sum.spans.some(x => /45 区划/.test(x)), 'spans 含 45 区划: ' + sum.spans.join(','));
    ok(sum.spans.some(x => /43 地块/.test(x)), 'spans 含 43 地块');
    ok(sum.spans.some(x => /41 已绑定/.test(x)), 'spans 含 41 已绑定');
    ok(sum.spans.some(x => /4 无地块/.test(x)), 'spans 含 4 无地块');
    ok(sum.spans.some(x => /细分多块/.test(x)), 'spans 含 细分多块');
    ok(sum.hasCalBtn, '一键校准按钮存在');
    ok(/播州|郑氏|陕北|奢安/.test(sum.unbound), '无地块清单含 4 流动势力');
  }

  // 2. 树徽章：默认势力(明朝廷)节点应带 🗺 徽章
  const badges = await p.evaluate(() => {
    const bind = document.querySelectorAll('#module-primary-view .adt-bind').length;
    const nobind = document.querySelectorAll('#module-primary-view .adt-nobind').length;
    const sample = Array.from(document.querySelectorAll('#module-primary-view .adt-bind')).slice(0, 3).map(e => e.textContent.trim());
    return { bind, nobind, sample };
  });
  ok(badges.bind > 0, '明朝廷区划有 🗺 绑定徽章 (' + badges.bind + ')');
  console.log('  徽章 bind=' + badges.bind + ' nobind=' + badges.nobind + ' 样本=' + badges.sample.join(','));

  // 3. 折叠展开逐块清单
  await p.evaluate(() => { const btn = document.querySelector('#module-primary-view .adt-toggle'); btn && btn.click(); });
  await p.waitForTimeout(150);
  const roster = await p.evaluate(() => {
    const rows = document.querySelectorAll('#module-primary-view .adt-regrow');
    const sels = document.querySelectorAll('#module-primary-view .adt-regsel');
    const optCount = sels[0] ? sels[0].options.length : 0;
    return { rows: rows.length, sels: sels.length, optCount };
  });
  ok(roster.rows === 43, '展开后 43 个地块行 (got ' + roster.rows + ')');
  ok(roster.sels === 43, '43 个绑定下拉 (got ' + roster.sels + ')');
  ok(roster.optCount >= 46, '下拉含全部区划选项+未绑定 (got ' + roster.optCount + ')');

  // 4. 改一个地块的绑定 → 写回 sc.map
  const editRes = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const sel = document.querySelector('#module-primary-view .adt-regsel[data-admin-bind-region="台湾"]');
    if (!sel) return { err: 'no 台湾 select' };
    const before = (a.state.scenario.map.regions.find(r => (r.name || r.id) === '台湾') || {}).adminBinding;
    sel.value = '朝鲜八道';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { before };
  });
  await p.waitForTimeout(200);
  const afterEdit = await p.evaluate(() => (window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario.map.regions.find(r => (r.name || r.id) === '台湾') || {}).adminBinding);
  ok(editRes.before === '大员荷兰商馆区', '台湾原绑 大员荷兰商馆区 (got ' + editRes.before + ')');
  ok(afterEdit === '朝鲜八道', '改绑后 sc.map 写回 朝鲜八道 (got ' + afterEdit + ')');

  // 一键校准：把可 fuzzy 匹配的「浙江」绑乱 + 不可匹配的「台湾」绑乱，校准应修浙江、留台湾不瞎猜
  await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const z = a.state.scenario.map.regions.find(x => (x.name || x.id) === '浙江');
    if (z) z.adminBinding = '乱绑XYZ';
    const t = a.state.scenario.map.regions.find(x => (x.name || x.id) === '台湾');
    if (t) t.adminBinding = '乱绑ABC';
  });
  await p.evaluate(() => { const btn = document.querySelector('#module-primary-view .adt-calbtn'); btn && btn.click(); });
  await p.waitForTimeout(250);
  const afterCal = await p.evaluate(() => {
    const a = window.TM_SCENARIO_EDITOR_RESET_APP;
    const z = a.state.scenario.map.regions.find(x => (x.name || x.id) === '浙江');
    const t = a.state.scenario.map.regions.find(x => (x.name || x.id) === '台湾');
    return { zhejiang: z ? z.adminBinding : null, taiwan: t ? t.adminBinding : null };
  });
  ok(afterCal.zhejiang === '浙江布政使司', '一键校准 fuzzy 修复 浙江→浙江布政使司 (got ' + afterCal.zhejiang + ')');
  ok(afterCal.taiwan === '乱绑ABC', '不可匹配的台湾被保留不瞎猜 (got ' + afterCal.taiwan + ')');

  ok(errs.length === 0, '无 pageerror/console error: ' + errs.slice(0, 3).join(' || '));

  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
