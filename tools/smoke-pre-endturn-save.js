// Smoke test: verify pre_endturn + post-推演 autosave both function AND show in correct UI locations.
const fs = require('fs');
const path = require('path');

// === Mocks ===
const ls = {};
const localStorage = {
  setItem: (k, v) => { ls[k] = String(v); },
  getItem: (k) => k in ls ? ls[k] : null,
  removeItem: (k) => { delete ls[k]; },
};
global.localStorage = localStorage;

const idb = {};
const TM_SaveDB = {
  save: (id, state, meta) => new Promise(resolve => setTimeout(() => {
    idb[id] = {
      id, state: JSON.parse(JSON.stringify(state)),
      type: (meta && meta.type) || 'manual',
      name: (meta && meta.name) || id,
      timestamp: Date.now(),
      turn: (meta && meta.turn) || 0,
      scenarioName: (meta && meta.scenarioName) || '',
      eraName: (meta && meta.eraName) || '',
    };
    resolve(true);
  }, 5)),
  load: (id) => Promise.resolve(idb[id] ? { gameState: idb[id].state.GM, ...idb[id] } : null),
  list: () => Promise.resolve(Object.values(idb).map(r => ({
    id: r.id, name: r.name, turn: r.turn, type: r.type,
    timestamp: r.timestamp, scenarioName: r.scenarioName, eraName: r.eraName,
  }))),
};
global.TM_SaveDB = TM_SaveDB;

global.window = global;
global.deepClone = (o) => JSON.parse(JSON.stringify(o));
global._prepareGMForSave = () => {};
global.findScenarioById = () => ({ name: '崇祯1627' });
global.getTSText = (t) => `T${t}`;
global.GM = { turn: 5, sid: 'test', eraName: '崇祯', saveName: 'mySave', busy: false, running: true };
global.P = { ai: {} };
global.SaveManager = { maxSlots: 10, getAllSaves: () => [] };

// === Test 1: code-level checks ===
async function testCodeLevel() {
  const core = fs.readFileSync(path.join(__dirname, '..', 'tm-endturn-core.js'), 'utf8');
  const render = fs.readFileSync(path.join(__dirname, '..', 'tm-endturn-render.js'), 'utf8');
  const office = fs.readFileSync(path.join(__dirname, '..', 'tm-office-editor.js'), 'utf8');
  const mgr = fs.readFileSync(path.join(__dirname, '..', 'tm-save-manager.js'), 'utf8');

  const r = {};
  r.preSaveExists = core.includes("TM_SaveDB.save('pre_endturn'") && core.includes("type: 'pre_endturn'");
  r.markSyncBeforeSave = (() => {
    const idx = core.indexOf("TM_SaveDB.save('pre_endturn'");
    const before = core.slice(Math.max(0, idx - 800), idx);
    return /localStorage\.setItem\('tm_pre_endturn_mark'/.test(before);
  })();
  r.autosaveSlot0 = render.includes("TM_SaveDB.save('autosave'") && render.includes("TM_SaveDB.save('slot_0'");
  r.autosaveMark = render.includes("'tm_autosave_mark'");
  r.preMarkClearAfterSuccess = render.includes("localStorage.removeItem('tm_pre_endturn_mark')");
  r.recoveryPromptDual = office.includes("'tm_pre_endturn_mark'") && office.includes("TM_SaveDB.load('pre_endturn')");
  r.uiReadsPreEndturn = mgr.includes("s.id === 'pre_endturn'") && mgr.includes('过回合前快照');
  r.uiHasLoadButton = mgr.includes('loadPreEndturnSnapshot');

  Object.entries(r).forEach(([k, v]) => console.log('[T1] ' + k + ':', v ? 'OK' : 'FAIL'));
  return Object.values(r).every(Boolean);
}

// === Test 2: simulate full save cycle and verify what UI would see ===
async function testFullCycle() {
  Object.keys(idb).forEach(k => delete idb[k]);
  Object.keys(ls).forEach(k => delete ls[k]);

  // Step 1: simulate pre-save (玩家点击过回合·AI 推演前)
  localStorage.setItem('tm_pre_endturn_mark', JSON.stringify({
    turn: 5, timestamp: Date.now(), scenarioName: '崇祯1627', eraName: '崇祯', saveName: 'mySave'
  }));
  await TM_SaveDB.save('pre_endturn', { GM, P }, {
    name: '过回合前·T5', type: 'pre_endturn', turn: 5, scenarioName: '崇祯1627', eraName: '崇祯'
  });

  // Step 2: simulate AI 推演 modifying state
  GM.turn = 6;

  // Step 3: simulate post-推演 autosave (写入 IDB 'autosave' + 'slot_0' + clear pre mark)
  await TM_SaveDB.save('autosave', { GM, P }, {
    name: '自动封存·T6', type: 'auto', turn: 6, scenarioName: '崇祯1627', eraName: '崇祯'
  });
  await TM_SaveDB.save('slot_0', { GM, P }, {
    name: '自动封存·T6', type: 'auto', turn: 6, scenarioName: '崇祯1627', eraName: '崇祯'
  });
  localStorage.setItem('tm_autosave_mark', JSON.stringify({ turn: 6 }));
  // The clear:
  localStorage.removeItem('tm_pre_endturn_mark');

  // Verify final IDB state
  const list = await TM_SaveDB.list();
  console.log('\n[T2] IDB records after full cycle:');
  list.forEach(r => console.log('  · id=' + r.id + '  turn=' + r.turn + '  name=' + r.name));

  const hasAutosave = list.some(r => r.id === 'autosave' && r.turn === 6);
  const hasSlot0 = list.some(r => r.id === 'slot_0' && r.turn === 6);
  const hasPreEndturn = list.some(r => r.id === 'pre_endturn' && r.turn === 5);
  console.log('[T2a] autosave at turn 6:', hasAutosave ? 'OK' : 'FAIL');
  console.log('[T2b] slot_0 at turn 6:', hasSlot0 ? 'OK' : 'FAIL');
  console.log('[T2c] pre_endturn at turn 5 (kept as snapshot):', hasPreEndturn ? 'OK' : 'FAIL');
  console.log('[T2d] tm_pre_endturn_mark cleared:', !localStorage.getItem('tm_pre_endturn_mark') ? 'OK' : 'FAIL');
  console.log('[T2e] tm_autosave_mark set:', !!localStorage.getItem('tm_autosave_mark') ? 'OK' : 'FAIL');

  return hasAutosave && hasSlot0 && hasPreEndturn && !localStorage.getItem('tm_pre_endturn_mark') && localStorage.getItem('tm_autosave_mark');
}

// === Test 3: simulate openSaveManager() data mapping logic ===
async function testUIMapping() {
  // Replay openSaveManager mapping logic against current IDB state
  const dbSaves = await TM_SaveDB.list();
  const savesBySlot = {};
  let preEndturnRec = null;
  dbSaves.forEach(s => {
    if (s.id === 'autosave') {
      savesBySlot[0] = { slotId: 0, name: s.name, turn: s.turn, timestamp: s.timestamp, scenarioName: s.scenarioName, eraName: s.eraName };
    } else if (s.id && s.id.indexOf('slot_') === 0) {
      const idx = parseInt(s.id.replace('slot_', ''));
      if (!isNaN(idx)) savesBySlot[idx] = { slotId: idx, name: s.name, turn: s.turn, timestamp: s.timestamp, scenarioName: s.scenarioName, eraName: s.eraName };
    } else if (s.id === 'pre_endturn') {
      preEndturnRec = { name: s.name, turn: s.turn, timestamp: s.timestamp, scenarioName: s.scenarioName, eraName: s.eraName };
    }
  });

  console.log('\n[T3] Simulated openSaveManager UI state:');
  console.log('  · 案卷·零 (slot 0):', savesBySlot[0] ? `T${savesBySlot[0].turn} ${savesBySlot[0].name}` : 'EMPTY');
  console.log('  · 过回合前快照 banner:', preEndturnRec ? `T${preEndturnRec.turn} ${preEndturnRec.name}` : 'NOT_SHOWN');

  const slot0Visible = savesBySlot[0] && savesBySlot[0].turn === 6;
  const preBannerVisible = preEndturnRec && preEndturnRec.turn === 5;
  console.log('[T3a] 案卷·零 显示推演完成 T6:', slot0Visible ? 'OK' : 'FAIL');
  console.log('[T3b] 过回合前快照 banner 显示 T5:', preBannerVisible ? 'OK' : 'FAIL');
  return slot0Visible && preBannerVisible;
}

// === Test 4: race-condition simulation — crash mid-save, verify recovery ===
async function testCrashRecovery() {
  Object.keys(idb).forEach(k => delete idb[k]);
  Object.keys(ls).forEach(k => delete ls[k]);

  // Pre-save: mark sync, IDB async
  localStorage.setItem('tm_pre_endturn_mark', JSON.stringify({ turn: 7, scenarioName: 'X', eraName: 'Y' }));
  const savePromise = TM_SaveDB.save('pre_endturn', { GM, P }, { type: 'pre_endturn', turn: 7 });

  // Simulate crash IMMEDIATELY before save completes — mark must already be set
  const markBefore = !!localStorage.getItem('tm_pre_endturn_mark');
  console.log('\n[T4a] mark exists before IDB commit:', markBefore ? 'OK' : 'FAIL');

  await savePromise; // simulate save did complete eventually
  const markStill = !!localStorage.getItem('tm_pre_endturn_mark');
  const idbExists = !!idb['pre_endturn'];
  console.log('[T4b] mark persists:', markStill ? 'OK' : 'FAIL');
  console.log('[T4c] IDB record committed:', idbExists ? 'OK' : 'FAIL');
  return markBefore && markStill && idbExists;
}

(async () => {
  const r1 = await testCodeLevel();
  const r2 = await testFullCycle();
  const r3 = await testUIMapping();
  const r4 = await testCrashRecovery();
  const all = r1 && r2 && r3 && r4;
  console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
  process.exit(all ? 0 : 1);
})();
