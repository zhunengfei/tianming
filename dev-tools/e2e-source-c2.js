// C2 e2e — 源码读取工具：readSource / listSource / grepSource（异步，经 dispatchTool）。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8080/demo-guoshi.html', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.TM && window.TM.AuthoringAgent && typeof window.TM.AuthoringAgent.dispatchTool === 'function', { timeout: 15000 });

  const r = await p.evaluate(async () => {
    var disp = window.TM.AuthoringAgent.dispatchTool;
    var list = await disp({}, 'listSource', { filter: 'tm-' }, []);
    var read = await disp({}, 'readSource', { path: 'editor-authoring-agent.js', limit: 6 }, []);
    var grep = await disp({}, 'grepSource', { query: 'RUNTIME_FIELD_SURFACES', glob: 'scenario-editor-reset-app', maxFiles: 2 }, []);
    var bad = await disp({}, 'readSource', { path: '../secret' }, []);
    return {
      list: { ok: list.ok, matched: list.matched, sample: (list.files || []).slice(0, 3) },
      read: { ok: read.ok, totalLines: read.totalLines, firstLineHasNum: /^1\t/.test(read.content || '') },
      grep: { ok: grep.ok, hitCount: (grep.hits || []).length, firstHit: (grep.hits || [])[0] },
      badPathSafe: bad.ok === false || (bad.path && bad.path.indexOf('..') < 0)
    };
  });

  const checks = {
    listSource_works: r.list.ok && r.list.matched > 5 && r.list.sample.every(f => /tm-/.test(f)),
    readSource_works: r.read.ok && r.read.totalLines > 100 && r.read.firstLineHasNum,
    grepSource_works: r.grep.ok && r.grep.hitCount > 0 && r.grep.firstHit && /RUNTIME_FIELD_SURFACES/.test(r.grep.firstHit.text),
    pathTraversal_safe: !!r.badPathSafe,
    noPageErrors: errs.length === 0
  };
  await b.close();
  console.log(JSON.stringify({ checks, r, errs }, null, 1));
  const pass = Object.values(checks).every(Boolean);
  console.log(pass ? 'E2E PASS' : 'E2E FAIL');
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(2); });
