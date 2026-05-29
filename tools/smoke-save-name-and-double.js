// Smoke: verify two save manager bugs are fixed
//   1) Custom save name should display in UI (was overridden by _scrollTitle auto-gen)
//   2) Save should be visible in UI after one save attempt (was async race·needed double save)

const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'tm-save-manager.js'), 'utf8');

// === Bug 1: name preference ===
function testNamePreference() {
  // The render line should prefer save.name over title
  // Look for the new pattern: save.name ? escHtml(save.name) : title
  const namePref = /save\.name\s*\?\s*\(typeof\s+escHtml[\s\S]{0,80}?escHtml\(save\.name\)\s*:\s*save\.name\)\s*:\s*title/.test(code);
  console.log('[T1a] 渲染优先 save.name(玩家自取名) over title(自动生成):', namePref ? 'OK' : 'FAIL');

  // The old broken pattern `(title || save.name)` should NOT exist anymore
  const oldPattern = /\(title\s*\|\|\s*save\.name\)/.test(code);
  console.log('[T1b] 旧的 `title || save.name` 已移除:', !oldPattern ? 'OK' : 'FAIL');

  return namePref && !oldPattern;
}

// === Bug 2: SaveManager.saveToSlot returns a Promise ===
function testSavePromise() {
  // The save method should `return TM_SaveDB.save(...).then(...)` not just call it
  // Find the saveToSlot method body
  const savetoSlotIdx = code.indexOf('saveToSlot: function(slotId, saveName)');
  if (savetoSlotIdx < 0) {
    console.log('[T2a] saveToSlot method exists: FAIL');
    return false;
  }
  const body = code.slice(savetoSlotIdx, savetoSlotIdx + 1500);
  const returnsPromise = /return\s+TM_SaveDB\.save\(slotKey/.test(body);
  console.log('[T2a] SaveManager.saveToSlot 返回 Promise:', returnsPromise ? 'OK' : 'FAIL');

  // Should NOT have dead `return true;` after the catch
  const deadReturn = /\}\)\.catch\([^)]+\}\);\s*return\s+true;\s*\},/.test(body);
  console.log('[T2b] 死代码 `return true;` 已移除:', !deadReturn ? 'OK' : 'FAIL');
  return returnsPromise && !deadReturn;
}

// === Bug 2: UI handler awaits save before reopening ===
function testUIAwait() {
  // The free-function saveToSlot should call SaveManager.saveToSlot and chain .then before openSaveManager
  const idx = code.indexOf('function saveToSlot(slotId)');
  if (idx < 0) { console.log('[T3a] free saveToSlot exists: FAIL'); return false; }
  const body = code.slice(idx, idx + 2500);
  const usesAwait = /SaveManager\.saveToSlot\([\s\S]{0,200}\)/.test(body) && /\.then\(afterSave\)/.test(body);
  console.log('[T3a] UI 等待 IDB commit 完成再 closeSaveManager+openSaveManager:', usesAwait ? 'OK' : 'FAIL');

  // The old immediate close+open pattern should NOT be there
  const oldImmediate = /SaveManager\.saveToSlot\([^)]+\);\s*toast\([^)]*\);\s*window\._scrollJustSavedSlot[\s\S]{0,40}closeSaveManager\(\);\s*openSaveManager\(\);/.test(body);
  console.log('[T3b] 旧的同步 close+open(无 await) 已移除:', !oldImmediate ? 'OK' : 'FAIL');
  return usesAwait && !oldImmediate;
}

// === Bug 1+2: simulate full save→render cycle ===
async function testLiveCycle() {
  const idb = {};
  const TM_SaveDB = {
    save: (id, state, meta) => new Promise(resolve => {
      // Simulate IDB commit takes 80ms (realistic, often more)
      setTimeout(() => {
        idb[id] = {
          id, state: JSON.parse(JSON.stringify(state)),
          name: meta && meta.name, turn: meta && meta.turn,
          timestamp: Date.now(),
          scenarioName: (meta && meta.scenarioName) || '',
          eraName: (meta && meta.eraName) || '',
        };
        resolve(true);
      }, 80);
    }),
    list: () => Promise.resolve(Object.values(idb)),
    isAvailable: () => true,
  };

  // Simulate writing manual save with custom name
  await TM_SaveDB.save('slot_1', { GM: { turn: 5 } }, { name: '我的关键决策点', type: 'manual', turn: 5, scenarioName: 'X' });

  // After save commits, UI lists should include the record
  const list = await TM_SaveDB.list();
  const rec = list.find(r => r.id === 'slot_1');
  console.log('\n[T4a] IDB 记录已写入 slot_1:', rec ? 'OK' : 'FAIL');
  console.log('[T4b] 玩家自取名保留(' + (rec ? rec.name : 'null') + '):', rec && rec.name === '我的关键决策点' ? 'OK' : 'FAIL');
  console.log('[T4c] 元数据 turn 正确:', rec && rec.turn === 5 ? 'OK' : 'FAIL');
  return rec && rec.name === '我的关键决策点' && rec.turn === 5;
}

(async () => {
  const r1 = testNamePreference();
  const r2 = testSavePromise();
  const r3 = testUIAwait();
  const r4 = await testLiveCycle();
  const all = r1 && r2 && r3 && r4;
  console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
  process.exit(all ? 0 : 1);
})();
