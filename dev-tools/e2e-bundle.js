// Dev-only e2e: 方向W 实体捆绑 — 导出势力包·导入合并(去重/重名/重映射)·diff·非法JSON守卫·⌘K（真天启·无需 API）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8781/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const U = window.TM_AuthoringAgentUI;
    return U && U.exportBundle && U.importBundle && window._jeOpenBundle && document.querySelector('.je-aa-bundle') &&
      window.TM_SCENARIO_EDITOR_RESET_APP && window.TM_SCENARIO_EDITOR_RESET_APP.state.scenario.factions.length > 0;
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); });

  // 开 📦 捆绑 → 势力下拉填充
  await page.locator('.je-aa-bundle').click();
  const opened = await page.evaluate(() => ({ open: !document.querySelector('.je-import-back.je-bundle, .je-bundle') && !document.querySelectorAll('.je-import-back')[0] ? false : true, facOpts: document.querySelectorAll('.je-bundle-fac option').length }));

  // 导出第一个势力
  await page.locator('.je-bundle-do-export').click();
  const exported = await page.evaluate(() => {
    var t = document.querySelector('.je-bundle-text').value;
    var dlVisible = !document.querySelector('.je-bundle-download').hidden;
    var b = null; try { b = JSON.parse(t); } catch (e) {}
    return { isBundle: b && b.type === 'tm-entity-bundle', faction: b && b.faction, charCount: b && b.characters ? b.characters.length : 0, dlVisible: dlVisible };
  });

  // 导入这个包（同名势力+人物已存在 → 去重+重名）→ diff + summary
  await page.locator('.je-bundle-do-import').click();
  await page.waitForFunction(() => { var s = document.querySelector('#tm-aa-summary'); return s && s.style.display !== 'none' && /合并捆绑包/.test(s.textContent); }, { timeout: 8000 });
  const imported = await page.evaluate(() => ({
    summary: document.querySelector('#tm-aa-summary').textContent,
    diffGroups: document.querySelectorAll('#tm-aa-difflist .tm-aa-diff-group').length,
    actionsShown: document.querySelector('#tm-aa-actions').style.display !== 'none'
  }));

  // 非法 JSON 守卫
  const badGuard = await page.evaluate(() => {
    window._jeOpenBundle();
    document.querySelector('.je-bundle-text').value = '这不是JSON{{{';
    document.querySelector('.je-bundle-do-import').click();
    return document.querySelector('#tm-aa-status').textContent;
  });

  // ⌘K 有「实体捆绑」命令
  await page.evaluate(() => { document.querySelectorAll('.je-import-back').forEach(function (b) { b.hidden = true; }); });
  await page.keyboard.press('Control+k');
  await page.locator('.je-cmdk input').fill('捆绑');
  const cmdkHasBundle = await page.evaluate(() => [...document.querySelectorAll('.je-cmdk-item')].some(function (el) { return /实体捆绑/.test(el.textContent); }));

  await browser.close();

  const checks = {
    modal_opens_with_factions: exported !== null && opened.facOpts >= 1,
    export_produces_bundle: exported.isBundle === true && !!exported.faction,
    download_button_shown: exported.dlVisible === true,
    import_merges_to_draft: /合并捆绑包/.test(imported.summary) && imported.actionsShown,
    import_dedup_and_rename: /人物 \+\d+/.test(imported.summary),
    bad_json_guarded: /不是合法 JSON/.test(badGuard),
    cmdk_has_bundle: cmdkHasBundle === true,
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, opened, exported, imported, badGuard, cmdkHasBundle, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
