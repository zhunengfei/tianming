// 只读截图：看剧本编辑器玩家首屏 + 载剧本后的整体布局，诊断左中侧"太乱/门槛高"。
const PW = process.env.PW_PATH || 'playwright';
const { chromium } = require(PW);
const URL = (process.env.AU_URL || 'http://127.0.0.1:8080') + '/preview/scenario-editor-reset-preview.html';
(async () => {
  let browser;
  for (const ch of ['msedge', 'chrome', null]) { try { browser = await chromium.launch(ch ? { channel: ch } : {}); break; } catch (e) { if (ch === null) throw e; } }
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 920 } })).newPage();
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.body && document.body.dataset.scenarioEditorResetApp === 'ready', { timeout: 20000 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'dev-tools/shot-A-firstscreen.png' });
  await p.evaluate(() => window.TM_SCENARIO_EDITOR_RESET_APP.loadOfficialScenario('tianqi7'));
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'dev-tools/shot-B-loaded.png' });
  await browser.close();
  console.log('shot-A-firstscreen.png + shot-B-loaded.png written');
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
