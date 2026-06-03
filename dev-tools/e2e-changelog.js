// Dev-only e2e: 方向O 自动 changelog — 汇总已应用改动成版本说明（确定性·只含 applied 改动·走 mock）
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const url = 'http://127.0.0.1:8776/preview/scenario-editor-reset-preview.html';
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('tm_api', JSON.stringify({ url: 'http://127.0.0.1:8799/v1', key: 'sk-test', model: 'gpt-4o', temp: 0.7 })); localStorage.removeItem('tm_aa_run_history'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const U = window.TM_AuthoringAgentUI;
    return U && U.changelog && U.runChangelog && document.querySelector('.je-hist-changelog') && window.TM && window.TM.AuthoringAgent.runAuthoringLoop;
  }, { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); document.body.classList.add('je-guoshi-settings-open'); var d = document.querySelector('.je-aa-hist'); if (d) d.open = true; });

  const req = page.locator('#tm-aa-req');
  async function editAndApply(text) {
    await req.click(); await req.fill(text);
    await page.locator('#tm-aa-go').click();
    await page.waitForFunction(() => { var a = document.querySelector('#tm-aa-actions'); return a && a.style.display !== 'none'; }, { timeout: 20000 });
    await page.locator('#tm-aa-apply').click();
    await page.waitForTimeout(250);
  }

  await editAndApply('第一处改动：把势力改名');
  await editAndApply('第二处改动：再补一个势力');

  // changelog 应含 2 项已应用改动
  const afterTwo = await page.evaluate(() => window.TM_AuthoringAgentUI.changelog());

  // 第三处：跑但不应用 → changelog 仍 2
  await req.click(); await req.fill('第三处：先不应用');
  await page.locator('#tm-aa-go').click();
  await page.waitForFunction(() => document.querySelector('#tm-aa-actions').style.display !== 'none', { timeout: 20000 });
  const afterUnapplied = await page.evaluate(() => window.TM_AuthoringAgentUI.changelog());
  // 放弃这次未应用的
  await page.locator('#tm-aa-discard').click();

  // 一次问答（非改动）→ changelog 仍只含改动
  await req.click(); await req.fill('有几个东林党？');
  await page.locator('.je-aa-qa').click();
  await page.waitForFunction(() => /回答完成/.test(document.querySelector('#tm-aa-status').textContent), { timeout: 20000 });
  const afterQa = await page.evaluate(() => window.TM_AuthoringAgentUI.changelog());

  // 点「生成版本说明」按钮 → 渲染 + 复制按钮
  await page.evaluate(() => { var d = document.querySelector('.je-aa-hist'); if (d) d.open = true; });
  // sticky 输入框(z-index)可能盖住抽屉底部按钮 → JS 直接 click 绕过指针拦截
  await page.evaluate(() => { var b = document.querySelector('.je-hist-changelog'); if (b) b.click(); });
  const rendered = await page.evaluate(() => {
    var s = document.querySelector('#tm-aa-summary');
    return { visible: s.style.display !== 'none', hasTitle: /版本说明/.test(s.textContent), hasUpdate: /本次更新/.test(s.textContent), hasCopy: !!s.querySelector('.tm-aa-cl-copy'), status: document.querySelector('#tm-aa-status').textContent };
  });

  await browser.close();

  const checks = {
    two_applied_changes: afterTwo.count === 2 && /本次更新/.test(afterTwo.text),
    changelog_lists_both: /第一处改动|改名/.test(afterTwo.text) && /第二处改动|补一个/.test(afterTwo.text) || afterTwo.text.split('\n- ').length >= 3,
    unapplied_excluded: afterUnapplied.count === 2,
    qa_not_a_change: afterQa.count === 2,
    rendered_with_copy: rendered.visible && rendered.hasTitle && rendered.hasUpdate && rendered.hasCopy,
    status_done: /版本说明已生成/.test(rendered.status),
    noPageErrors: errs.length === 0,
  };
  console.log(JSON.stringify({ checks, afterTwo, afterUnapplied, afterQa, rendered, errs }, null, 2));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('E2E ERROR', e); process.exit(2); });
