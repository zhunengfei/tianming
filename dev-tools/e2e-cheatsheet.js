// Dev-only e2e: UI·AG 快捷键速查面板 — ⌘/ 与 ? 唤出·Esc/背景关·文档国师热键·⌘K 命令项入口（无需 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8775/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._jeCheatOpen === 'function' && document.getElementById('shortcut-cheatsheet'), { timeout: 15000 });

  const isOpen = () => page.evaluate(() => { var c = document.getElementById('shortcut-cheatsheet'); return c.getAttribute('data-active') === 'true' && getComputedStyle(c).display !== 'none'; });

  const initHidden = await page.evaluate(() => { var c = document.getElementById('shortcut-cheatsheet'); return c.getAttribute('data-active') !== 'true' && getComputedStyle(c).display === 'none'; });

  // ⌘/ (Ctrl+/) 唤出
  await page.evaluate(() => { try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (e) {} });
  await page.keyboard.press('Control+Slash');
  await page.waitForTimeout(80);
  const openedByChord = await isOpen();
  const content = await page.evaluate(() => {
    var c = document.getElementById('shortcut-cheatsheet');
    return {
      groups: c.querySelectorAll('.shortcut-cheatsheet-group').length,
      kbds: [...c.querySelectorAll('kbd')].map(function (k) { return k.textContent; }),
      spans: [...c.querySelectorAll('.shortcut-cheatsheet-group span')].map(function (s) { return s.textContent; }).join(' | '),
    };
  });

  // Esc 关
  await page.keyboard.press('Escape');
  await page.waitForTimeout(60);
  const closedByEsc = !(await isOpen());

  // ? (Shift+/) 唤出（焦点在 body）
  await page.evaluate(() => { try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); document.body.focus(); } catch (e) {} });
  await page.keyboard.press('Shift+Slash');
  await page.waitForTimeout(80);
  const openedByQuestion = await isOpen();

  // 点背景关
  await page.evaluate(() => document.querySelector('#shortcut-cheatsheet .shortcut-cheatsheet-backdrop').click());
  await page.waitForTimeout(60);
  const closedByBackdrop = !(await isOpen());

  // ⌘K 命令面板里有「快捷键速查」项
  const cmdkHasItem = await page.evaluate(() => {
    if (window._jeCmdkOpen) window._jeCmdkOpen();
    var has = [...document.querySelectorAll('.je-cmdk-item')].some(function (el) { return /快捷键速查/.test(el.textContent); });
    if (window._jeCmdkClose) window._jeCmdkClose();
    return has;
  });

  await browser.close();

  const checks = {
    hidden_initially: initHidden === true,
    chord_opens: openedByChord === true,
    documents_hotkeys: content.groups >= 2 && content.kbds.some(function (k) { return /⌘ K/.test(k); }) && content.kbds.some(function (k) { return /@/.test(k); }) && /命令面板/.test(content.spans) && /发送/.test(content.spans),
    esc_closes: closedByEsc === true,
    question_opens: openedByQuestion === true,
    backdrop_closes: closedByBackdrop === true,
    cmdk_entry: cmdkHasItem === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, content, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
