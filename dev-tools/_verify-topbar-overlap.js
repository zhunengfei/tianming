const { chromium } = require(process.env.PW_PATH);
function overlaps(a, c) { return !(a.x + a.width <= c.x + 0.5 || c.x + c.width <= a.x + 0.5 || a.y + a.height <= c.y + 0.5 || c.y + c.height <= a.y + 0.5); }
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(600);
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

  const rects = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.top-actions .icon-btn'));
    return btns.map(el => { const r = el.getBoundingClientRect(); return { t: el.textContent.trim(), x: r.x, y: r.y, width: r.width, height: r.height }; });
  });
  console.log('  顶栏钮数=' + rects.length + ' · 尺寸=' + (rects[0] ? Math.round(rects[0].width) + 'px' : '?'));
  // 检查任意两钮是否重叠
  let overlapPairs = 0;
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { if (overlaps(rects[i], rects[j])) { overlapPairs++; if (overlapPairs <= 3) console.log('    重叠: ' + rects[i].t + ' × ' + rects[j].t); } }
  ok(rects.length >= 10, '顶栏钮渲染 (' + rects.length + ')');
  ok(overlapPairs === 0, '无任何按钮重叠 (重叠对=' + overlapPairs + ')');

  await p.screenshot({ path: 'dev-tools/_shot-topbar.png', clip: { x: 0, y: 0, width: 1280, height: 90 } });
  console.log('  截图: dev-tools/_shot-topbar.png');
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
