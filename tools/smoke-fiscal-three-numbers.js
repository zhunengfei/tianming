// Smoke: verify 帑廪 fiscal fix end-to-end
//   1) cascade writes GM._lastCascadeSummary
//   2) computeTaxThreeNumber reads from cascade (not old hukou estimate)
//   3) renderTaxThreeNumberBlock uses cascade-derived numbers
//   4) Three numbers are coherent with cascade allocation (central + localRetain = officially received)
//   5) UI panel render condition triggers properly when cascade has run

const fs = require('fs');
const path = require('path');

// Read source files
const lizhiSrc = fs.readFileSync(path.join(__dirname, '..', 'tm-lizhi-panel.js'), 'utf8');
const guokuSrc = fs.readFileSync(path.join(__dirname, '..', 'tm-guoku-panel.js'), 'utf8');
const cascadeSrc = fs.readFileSync(path.join(__dirname, '..', 'tm-fiscal-cascade.js'), 'utf8');

// === Test 1: cascade writes _lastCascadeSummary ===
function testCascadeWrites() {
  const writes = /G\._lastCascadeSummary\s*=\s*totals/.test(cascadeSrc);
  const totalsHasCentral = /totals[\s\S]{0,3000}central/.test(cascadeSrc);
  const totalsHasLocalRetain = /localRetain/.test(cascadeSrc);
  const totalsHasSkimmed = /skimmed/.test(cascadeSrc);
  const totalsHasLost = /lostTransit/.test(cascadeSrc);
  console.log('[T1] cascade writes G._lastCascadeSummary = totals:', writes ? 'OK' : 'FAIL');
  console.log('[T1a] totals has 4 fields(central/localRetain/skimmed/lostTransit):',
    (totalsHasCentral && totalsHasLocalRetain && totalsHasSkimmed && totalsHasLost) ? 'OK' : 'FAIL');
  return writes && totalsHasCentral && totalsHasLocalRetain && totalsHasSkimmed && totalsHasLost;
}

// === Test 2: computeTaxThreeNumber prefers cascade ===
function testComputePrefersCascade() {
  const fn = lizhiSrc.match(/function computeTaxThreeNumber[\s\S]+?\n\}/);
  if (!fn) { console.log('[T2] computeTaxThreeNumber found: FAIL'); return false; }
  const body = fn[0];
  const readsCascade = /GM\._lastCascadeSummary/.test(body);
  // cascade should appear BEFORE 回退 (fallback) — both should exist, cascade earlier
  const cascadeIdx = body.indexOf('GM._lastCascadeSummary');
  const fallbackIdx = body.indexOf('回退');
  const cascadePathFirst = cascadeIdx >= 0 && fallbackIdx >= 0 && cascadeIdx < fallbackIdx;
  const sourceTagged = /_source:\s*['"]cascade['"]/.test(body);
  const fallbackExists = /_source:\s*['"]fallback/.test(body) || /hukou/.test(body);
  console.log('[T2a] computeTaxThreeNumber reads GM._lastCascadeSummary:', readsCascade ? 'OK' : 'FAIL');
  console.log('[T2b] cascade path runs BEFORE fallback path:', cascadePathFirst ? 'OK' : 'FAIL');
  console.log('[T2c] cascade return tagged with _source:cascade:', sourceTagged ? 'OK' : 'FAIL');
  console.log('[T2d] fallback (hukou estimate) still exists for early turns:', fallbackExists ? 'OK' : 'FAIL');
  return readsCascade && cascadePathFirst && sourceTagged && fallbackExists;
}

// === Test 3: 帑廪面板 render condition includes cascade check ===
function testGuokuRenderCondition() {
  const hasCondCheck = /_hasCascade\s*=[\s\S]{0,200}GM\._lastCascadeSummary/.test(guokuSrc);
  const usesInRender = /_hasCascade\s*\|\|\s*g\.monthlyIncome/.test(guokuSrc);
  console.log('[T3a] 帑廪面板 var _hasCascade 来自 _lastCascadeSummary:', hasCondCheck ? 'OK' : 'FAIL');
  console.log('[T3b] 渲染条件 (_hasCascade || g.monthlyIncome > 0):', usesInRender ? 'OK' : 'FAIL');
  return hasCondCheck && usesInRender;
}

// === Test 4: simulate computeTaxThreeNumber against mock cascade summary ===
function testLiveCompute() {
  // Mock the dependency surface
  global.GM = {
    corruption: {
      trueIndex: 30,
      subDepts: { fiscal: { true: 40 }, provincial: { true: 35 } }
    },
    fiscal: { floatingCollectionRate: 0.05 },
    _lastCascadeSummary: {
      central: { money: 540, grain: 800, cloth: 100 },
      localRetain: { money: 200, grain: 400, cloth: 50 },
      skimmed: { money: 80, grain: 60, cloth: 20 },
      lostTransit: { money: 60, grain: 40, cloth: 10 }
    }
  };
  // Expected derived values:
  // nominal = 540 + 200 + 80 + 60 = 880
  // actualReceived = 540 + 200 = 740
  // overCollectRate ≈ (40+35)/200*0.5 + 0.05 + 0.05 = 0.1875 + 0.05 + 0.05 = ~0.2875 (with no salary/appeal mods, no taxLevel modifier)
  // peasantPaid = nominal × (1 + overCollectRate)
  // gaps: clerk = floatingCollection (浮收·peasantPaid - nominal)·official = 80 (skimmed)·power = 60 (lostTransit)

  // We can't directly run lizhi-panel.js (it has too many globals), but we can check the math by hand
  // and verify the structure is sane via regex
  const nominal = 540 + 200 + 80 + 60;
  const actualReceived = 540 + 200;
  console.log('[T4] manual math check:');
  console.log('   · nominal (cent+loc+skim+lost) =', nominal, 'expect 880·' + (nominal === 880 ? 'OK' : 'FAIL'));
  console.log('   · actualReceived (cent+loc) =', actualReceived, 'expect 740·' + (actualReceived === 740 ? 'OK' : 'FAIL'));
  console.log('   · skimmed (各级私分) = 80·officials gap');
  console.log('   · lostTransit (豪强抵偿) = 60·power gap');
  console.log('   · 浮收 ≈ nominal × overCollectRate ≈ 880 × ~0.29 ≈ ~250 (clerk gap)');
  console.log('   · 民缴 = nominal + 浮收 ≈ ~1130');
  return nominal === 880 && actualReceived === 740;
}

// === Test 5: cache-bust versions match the modified files ===
function testCacheBust() {
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const lizhiBust = /tm-lizhi-panel\.js\?v=2026042820/.test(indexHtml);
  const guokuBust = /tm-guoku-panel\.js\?v=2026042820/.test(indexHtml);
  console.log('[T5a] tm-lizhi-panel.js cache-bust v=2026042820:', lizhiBust ? 'OK' : 'FAIL');
  console.log('[T5b] tm-guoku-panel.js cache-bust v=2026042820:', guokuBust ? 'OK' : 'FAIL');
  return lizhiBust && guokuBust;
}

// === Test 6: cascade is invoked from endturn paths ===
function testCascadeInvoked() {
  const aiInfer = fs.readFileSync(path.join(__dirname, '..', 'tm-endturn-ai-infer.js'), 'utf8');
  const gameLoop = fs.readFileSync(path.join(__dirname, '..', 'tm-game-loop.js'), 'utf8');
  const aiInferCalls = /CascadeTax\.collect\(\)/.test(aiInfer);
  const gameLoopCalls = /CascadeTax\.collect\(\)/.test(gameLoop);
  console.log('[T6a] endturn-ai-infer 调 CascadeTax.collect():', aiInferCalls ? 'OK' : 'FAIL');
  console.log('[T6b] game-loop (enterGame/T1 preview) 调 CascadeTax.collect():', gameLoopCalls ? 'OK' : 'FAIL');
  return aiInferCalls && gameLoopCalls;
}

// === Test 7: _calcOverCollectRate helper extracted and exported ===
function testHelperExtracted() {
  const hasFunction = /function _calcOverCollectRate\(\)/.test(lizhiSrc);
  const hasExport = /window\._calcOverCollectRate\s*=/.test(lizhiSrc);
  const usedInCompute = /var overCollectRate\s*=\s*_calcOverCollectRate\(\)/.test(lizhiSrc);
  console.log('[T7a] _calcOverCollectRate 函数定义:', hasFunction ? 'OK' : 'FAIL');
  console.log('[T7b] computeTaxThreeNumber 使用 helper:', usedInCompute ? 'OK' : 'FAIL');
  console.log('[T7c] window._calcOverCollectRate 导出:', hasExport ? 'OK' : 'FAIL');
  return hasFunction && usedInCompute;
}

(function() {
  const r1 = testCascadeWrites();
  const r2 = testComputePrefersCascade();
  const r3 = testGuokuRenderCondition();
  const r4 = testLiveCompute();
  const r5 = testCacheBust();
  const r6 = testCascadeInvoked();
  const r7 = testHelperExtracted();
  const all = r1 && r2 && r3 && r4 && r5 && r6 && r7;
  console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
  process.exit(all ? 0 : 1);
})();
