// 高清截左中侧：左列(字段/章节导航) + 中间工作台，诊断"太乱/找不到"。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 940 }, deviceScaleFactor: 2 })).newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(600);
  // 左列高清
  await p.screenshot({ path: 'dev-tools/shot-left.png', clip: { x: 0, y: 70, width: 360, height: 860 } });
  // 中间工作台高清
  await p.screenshot({ path: 'dev-tools/shot-center.png', clip: { x: 360, y: 70, width: 720, height: 860 } });
  await browser.close();
  console.log('shot-left.png + shot-center.png written');
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
