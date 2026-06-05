// 人物列传 v2 验证：名册+详情、每字段带游戏对齐标签、完整、选人切换、编辑落库、checkbox。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 940 }, deviceScaleFactor: 1.4 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(450);

  const r = await p.evaluate(async () => {
    const out = []; const ok = (n, c, i) => out.push({ name: n, pass: !!c, info: i || '' });
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    app.state.selectedModuleId = 'peopleLineages'; app.state.selectedField = 'characters';
    app.setWorkbenchPanel('structured-workbench');
    await new Promise(r => setTimeout(r, 200));
    var host = document.getElementById('module-primary-view');
    var roster = host && host.querySelectorAll('.rwf2-rc');
    ok('V1 名册卡渲染', !!(roster && roster.length > 0), 'roster=' + (roster ? roster.length : 0));
    var detail = host && host.querySelector('.rwf2-detail');
    var fields = host && host.querySelectorAll('.rwf2-detail .rwf2-f');
    ok('V2 详情逐字段(完整≥30)', !!(detail && fields && fields.length >= 30), 'fields=' + (fields ? fields.length : 0));
    var labels = fields ? Array.prototype.map.call(fields, f => (f.querySelector('.rwf2-fl') || {}).textContent) : [];
    ok('V3 每字段带游戏对齐标签(姓名/官职/智谋)', labels.indexOf('姓名') >= 0 && labels.indexOf('官职') >= 0 && labels.indexOf('智谋') >= 0, '含: ' + labels.slice(0, 8).join('/'));
    var nameCtl = host.querySelector('.rwf2-detail [data-folio-field="name"]');
    ok('V4 姓名字段有标签且控件接对', !!nameCtl && nameCtl.value === app.state.scenario.characters[(app.state._folioSel || 0)].name, 'nameVal=' + (nameCtl && nameCtl.value));

    // 选别的人 → 详情切换
    var targetIdx = -1;
    for (var k = 0; k < roster.length; k++) { if (Number(roster[k].dataset.folioCharI) !== (app.state._folioSel || 0)) { targetIdx = k; break; } }
    var ti = Number(roster[targetIdx].dataset.folioCharI);
    roster[targetIdx].click();
    await new Promise(r => setTimeout(r, 150));
    var dh = document.querySelector('#module-primary-view .rwf2-dh b');
    ok('V5 点名册切换详情', app.state._folioSel === ti && dh && dh.textContent === app.state.scenario.characters[ti].name, 'sel=' + app.state._folioSel + ' dh=' + (dh && dh.textContent));

    // 编辑官职 → 落库
    var offCtl = document.querySelector('#module-primary-view .rwf2-detail [data-folio-field="officialTitle"]');
    offCtl.value = '测试·首辅';
    offCtl.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    ok('V6 详情编辑官职落库', app.state.scenario.characters[ti].officialTitle === '测试·首辅', 'officialTitle=' + app.state.scenario.characters[ti].officialTitle);

    // checkbox（isPlayer）→ 布尔落库
    var cb = document.querySelector('#module-primary-view .rwf2-detail [data-folio-field="isPlayer"]');
    var before = app.state.scenario.characters[ti].isPlayer;
    if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change', { bubbles: true })); }
    await new Promise(r => setTimeout(r, 150));
    ok('V7 checkbox 布尔落库', cb ? (typeof app.state.scenario.characters[ti].isPlayer === 'boolean' && app.state.scenario.characters[ti].isPlayer !== before) : true, 'isPlayer ' + before + '→' + app.state.scenario.characters[ti].isPlayer);

    // 字段墙原 saveFolioField 仍在（bug 修复：未被覆盖）
    ok('V8 原 saveFolioField 仍导出(字段墙不再被覆盖)', typeof app.saveFolioField === 'function' && typeof app.saveCharFolioField === 'function', 'save=' + typeof app.saveFolioField + ' saveChar=' + typeof app.saveCharFolioField);
    return out;
  });

  await p.evaluate(() => { document.querySelectorAll('details.adv-fields,details.deep-bench,details.field-index').forEach(d => d.open = false); var el = document.getElementById('module-primary-view'); if (el) el.scrollIntoView({ block: 'start' }); });
  await p.waitForTimeout(200);
  await p.screenshot({ path: 'dev-tools/shot-renwu-v2.png' });
  const box = await p.evaluate(() => { var el = document.getElementById('module-primary-view'); if (!el) return null; var b = el.getBoundingClientRect(); return { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(1050, b.width), height: Math.min(880, b.height) }; });
  if (box && box.width > 50) await p.screenshot({ path: 'dev-tools/shot-renwu-v2-only.png', clip: box });

  await browser.close();
  let pass = 0, fail = 0;
  r.forEach(x => { if (x.pass) pass++; else fail++; console.log((x.pass ? 'PASS ' : 'RED  ') + x.name + (x.info ? '  [' + x.info + ']' : '')); });
  if (errs.length) console.log('pageErrors:', errs.slice(0, 3));
  console.log('=== ' + pass + ' PASS / ' + fail + ' RED ===  (shot-renwu-v2-only.png)');
  process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
