// Dev-only e2e: verify @mention dropdown keyboard nav (ArrowDown/Up highlight, Enter insert, Esc close)
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8761/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // wait for scenario entities + @mention init on the req box
  await page.waitForFunction(() => {
    const app = window.TM_SCENARIO_EDITOR_RESET_APP;
    const has = app && app.state && app.state.scenario && (app.state.scenario.characters || []).length > 0;
    const req = document.getElementById('tm-aa-req');
    return has && req && req._jeMentionInit === true;
  }, { timeout: 15000 });

  // open the panel so req is interactable
  await page.evaluate(() => {
    const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open');
    document.body.classList.add('je-guoshi-docked');
  });

  const req = page.locator('#tm-aa-req');
  await req.click();
  await req.fill('');
  await req.type('@朱', { delay: 20 });

  // menu should be visible with buttons
  const menuVisible = await page.evaluate(() => {
    const m = document.querySelector('.je-aa-mention');
    return m && !m.hidden && m.querySelectorAll('button').length;
  });

  // ArrowDown → first button active
  await req.press('ArrowDown');
  const after1 = await page.evaluate(() => {
    const btns = document.querySelectorAll('.je-aa-mention button');
    return { active: [...btns].findIndex(b => b.classList.contains('je-m-active')), count: btns.length };
  });

  // ArrowDown again → second active
  await req.press('ArrowDown');
  const after2 = await page.evaluate(() => [...document.querySelectorAll('.je-aa-mention button')].findIndex(b => b.classList.contains('je-m-active')));

  // ArrowUp from index 1 → index 0
  await req.press('ArrowUp');
  const afterUp = await page.evaluate(() => [...document.querySelectorAll('.je-aa-mention button')].findIndex(b => b.classList.contains('je-m-active')));

  // remember which name is highlighted (index 0 now)
  const pickName = await page.evaluate(() => {
    const b = document.querySelectorAll('.je-aa-mention button')[0];
    return b ? b._jeName : null;
  });

  // Enter → insert highlighted, remove '@', menu hidden
  await req.press('Enter');
  const afterEnter = await page.evaluate(() => {
    const r = document.getElementById('tm-aa-req');
    const m = document.querySelector('.je-aa-mention');
    return { val: r.value, hidden: m ? m.hidden : null };
  });

  // re-open menu then Esc closes
  await req.type(' @朱', { delay: 20 });
  const reopened = await page.evaluate(() => { const m = document.querySelector('.je-aa-mention'); return m && !m.hidden; });
  await req.press('Escape');
  const afterEsc = await page.evaluate(() => { const m = document.querySelector('.je-aa-mention'); return m ? m.hidden : null; });

  // Enter with NO highlight (fresh menu) should still pick first match
  await req.fill(''); await req.type('@朱', { delay: 20 });
  await req.press('Enter');
  const enterNoHighlight = await page.evaluate(() => document.getElementById('tm-aa-req').value);

  await browser.close();

  const checks = {
    menuVisible: !!menuVisible,
    arrowDown1_active0: after1.active === 0,
    arrowDown2_active1: after2 === 1,
    arrowUp_active0: afterUp === 0,
    pickName_nonnull: !!pickName,
    enter_inserted: pickName && afterEnter.val.indexOf(pickName) >= 0,
    enter_removed_at: afterEnter.val.indexOf('@') < 0,
    enter_hid_menu: afterEnter.hidden === true,
    reopened: !!reopened,
    esc_hid_menu: afterEsc === true,
    enterNoHighlight_inserted: enterNoHighlight.indexOf('@') < 0 && enterNoHighlight.length > 0,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, pickName, afterEnterVal: afterEnter.val, enterNoHighlight, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
