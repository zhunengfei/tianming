// e2e：编辑器加载天启后 = 游戏数据(429府州+laterjin地图)，绑定带数字合理
const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext()).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(600);

  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

  // 数据层：429 区划 + laterjin 地图
  const data = await p.evaluate(() => {
    const sc = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario;
    let div = 0; Object.keys(sc.adminHierarchy || {}).forEach(fk => (function dig(ds){(ds||[]).forEach(d=>{div++;dig(d.children);});})((sc.adminHierarchy[fk]||{}).divisions));
    const regs = (sc.map && sc.map.regions) || [];
    return {
      div,
      regs: regs.length,
      laterjin: regs.some(r => /辽东占领区|盛京/.test(r.name)),
      chars: (sc.characters || []).length,
      ownerOK: regs.every(r => { const ids = {}; (sc.factions||[]).forEach(f => { if(f.id) ids[f.id]=1; if(f.name) ids[f.name]=1; }); return !r.owner || ids[r.owner]; })
    };
  });
  console.log('  数据: 区划=' + data.div + ' 地块=' + data.regs + ' laterjin=' + data.laterjin + ' 人物=' + data.chars + ' owner全解析=' + data.ownerOK);
  ok(data.div === 429, '编辑器 adminHierarchy = 429 府州 (got ' + data.div + ')');
  ok(data.laterjin, '地图含 laterjin 新区块(辽东占领区/盛京)');
  ok(data.chars === 203, '人物保留 203 (got ' + data.chars + ')');
  ok(data.ownerOK, '地图块 owner 全部解析到 JSON 势力');

  // 渲染层：adminMap 主视图 + 绑定带数字
  await p.evaluate(() => { const a = window.TM_SCENARIO_EDITOR_RESET_APP; a.state.selectedModuleId = 'adminMap'; a.state._adminFaction = null; const H = document.getElementById('module-primary-view'); H.innerHTML = a.renderAdminFolio(); });
  await p.waitForTimeout(150);
  const band = await p.evaluate(() => {
    const sumSpans = Array.from(document.querySelectorAll('#module-primary-view .adt-band-sum > span')).map(s => s.textContent.trim());
    const nobind = document.querySelectorAll('#module-primary-view .adt-nobind').length;
    const bind = document.querySelectorAll('#module-primary-view .adt-bind').length;
    const treeNodes = document.querySelectorAll('#module-primary-view .adt-node').length;
    return { sumSpans, nobind, bind, treeNodes };
  });
  console.log('  绑定带:', band.sumSpans.join(' · '));
  console.log('  徽章 bind=' + band.bind + ' nobind=' + band.nobind + ' · 明朝廷树节点=' + band.treeNodes);
  ok(band.sumSpans.some(x => /429 区划/.test(x)), '带显示 429 区划');
  ok(band.sumSpans.some(x => /顶级有地块/.test(x)), '带显示 顶级有地块 比例');
  ok(band.nobind < 30, '无地块徽章数合理(顶级级·非府州刷屏) got ' + band.nobind);
  ok(band.treeNodes >= 17, '明朝廷树顶级省道渲染(府州默认折叠·点钮展开) got ' + band.treeNodes);

  // 明朝廷第一省 北直隶 应有府州 children
  const prov = await p.evaluate(() => {
    const sc = window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario;
    const p0 = ((sc.adminHierarchy.player || {}).divisions || [])[0];
    return { name: p0 && p0.name, kids: (p0 && p0.children || []).length, kid0: p0 && p0.children && p0.children[0] && p0.children[0].name };
  });
  console.log('  明朝廷首省: ' + prov.name + ' 下辖 ' + prov.kids + ' 府州，例: ' + prov.kid0);
  ok(prov.kids > 0, '省级下有府州子级 (got ' + prov.kids + ')');

  ok(errs.length === 0, '无 pageerror: ' + errs.slice(0, 2).join(' || '));
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
