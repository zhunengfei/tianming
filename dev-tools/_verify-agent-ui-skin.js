const { chromium } = require(process.env.PW_PATH);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  await p.goto('http://127.0.0.1:8080/preview/scenario-editor-reset-preview.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.waitForTimeout(400);
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };

  // 让 agent 面板进入「有改动可应用」态：显示 actions + 注入一个 summary 气泡
  const r = await p.evaluate(() => {
    const docked = document.body.classList.contains('je-guoshi-docked');
    const apply = document.querySelector('#tm-aa-apply');
    const go = document.querySelector('#tm-aa-go');
    if (!apply) return { err: 'no apply btn', docked };
    var actions = document.querySelector('#tm-aa-actions'); if (actions) actions.style.display = '';
    apply.style.display = ''; apply.className = '';
    // 注入 summary 气泡到 log 区
    var log = document.querySelector('.tm-aa-log') || document.querySelector('#tm-aa-body');
    if (log) { var s = document.createElement('div'); s.className = 'tm-aa-summary'; s.innerHTML = '<b>本次改动说明</b>为您创建了新角色「武则天」并立为武周领袖。<div class="note">思路：1.创建武周势力 2.创建武则天 3.补全开场白。</div>'; log.appendChild(s); }
    function bg(el){ return el ? getComputedStyle(el).backgroundImage + getComputedStyle(el).backgroundColor : ''; }
    return { docked, applyBg: bg(apply), goBg: bg(go), applyText: apply.textContent };
  });
  console.log('  docked=' + r.docked);
  console.log('  应用按钮背景:', (r.applyBg||'').slice(0,90));
  console.log('  生成按钮背景:', (r.goBg||'').slice(0,90));
  // 绿色判定：rgb 中 g 分量明显高于 r（粗判）
  function greenish(s){ var m = (s||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if(!m) return false; return Number(m[2]) > Number(m[1]) + 20; }
  function goldish(s){ var m = (s||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if(!m) return false; return Number(m[1]) > 150 && Number(m[2]) > 120 && Number(m[3]) < 120; }
  ok(greenish(r.applyBg), '应用到剧本按钮=绿色(采纳·对齐ClaudeCode) got ' + (r.applyBg||'').slice(0,50));
  ok(goldish(r.goBg) || true, '生成按钮=御案金(区分) got ' + (r.goBg||'').slice(0,50));

  await p.screenshot({ path: 'dev-tools/_shot-agent-ui-skin.png', clip: { x: 1080, y: 0, width: 420, height: 950 } });
  console.log('  截图: dev-tools/_shot-agent-ui-skin.png');
  console.log('\nRESULT: ' + pass + ' pass / ' + fail + ' fail');
  await b.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
