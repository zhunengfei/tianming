// Dev-only probe: 列出国师面板顶部可见元素 + 诊断生成失败
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) {
    try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; }
    catch (e) { if (ch === null) throw e; }
  }
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await ctx.newPage();
  const netfail = [];
  page.on('requestfailed', r => netfail.push(r.url() + ' :: ' + (r.failure() && r.failure().errorText)));
  page.on('console', m => { if (/error|cors|fail/i.test(m.text())) console.log('CONSOLE', m.text()); });
  await page.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TM_AuthoringAgentUI && document.getElementById('tm-aa-panel'), { timeout: 15000 });
  await page.evaluate(() => { const p = document.getElementById('tm-aa-panel'); if (p) p.classList.add('open'); document.body.classList.add('je-guoshi-docked'); });
  await page.waitForTimeout(400);

  // 列出 #tm-aa-body 直接子元素 + 可见性
  const top = await page.evaluate(() => {
    const body = document.getElementById('tm-aa-body');
    if (!body) return 'NO BODY';
    return Array.from(body.children).map(el => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        cls: el.className || '',
        disp: cs.display,
        vis: cs.visibility,
        order: cs.order,
        h: Math.round(r.height),
        top: Math.round(r.top),
        txt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      };
    });
  });
  console.log('=== #tm-aa-body children (visible order by top) ===');
  top.filter(c => c.disp !== 'none' && c.h > 0).sort((a, b) => a.top - b.top).forEach(c => {
    console.log(`top=${c.top} h=${c.h} ord=${c.order} <${c.tag}#${c.id}.${c.cls}> "${c.txt}"`);
  });
  console.log('=== hidden children ===');
  top.filter(c => c.disp === 'none').forEach(c => console.log(`HIDDEN <${c.tag}#${c.id}.${c.cls}>`));

  // 诊断 mock 连通
  const probe = await page.evaluate(async () => {
    try {
      const api = JSON.parse(localStorage.getItem('tm_api') || '{}');
      const base = api.url || '';
      const res = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (api.key || '') },
        body: JSON.stringify({ model: api.model || 'gpt-4o', messages: [{ role: 'user', content: 'ping' }] })
      });
      const t = await res.text();
      return { ok: res.ok, status: res.status, base, body: t.slice(0, 200) };
    } catch (e) { return { err: String(e), base: (JSON.parse(localStorage.getItem('tm_api')||'{}').url) }; }
  });
  console.log('=== mock probe ===');
  console.log(JSON.stringify(probe, null, 2));
  console.log('=== netfail ===');
  netfail.forEach(n => console.log(n));

  await browser.close();
})().catch(e => { console.error('PROBE ERROR', e); process.exit(2); });
