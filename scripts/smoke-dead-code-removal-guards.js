const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function countMatches(src, pattern) {
  const matches = src.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'));
  return matches ? matches.length : 0;
}

const keju = read('tm-keju.js');
const kejuRuntime = read('tm-keju-runtime.js');
const playerSettings = read('tm-player-settings.js');
const saveLifecycle = read('tm-save-lifecycle.js');
const patches = read('tm-patches.js');
const gameLoop = read('tm-game-loop.js');
const launch = read('tm-launch.js');
const officeEditor = read('tm-office-editor.js');
const editorDetails = read('editor-details.js');
const electron = read('tm-electron.js');
const militaryUi = read('tm-military-ui.js');
const postTurnJobs = read('tm-post-turn-jobs.js');
const npcDecision = read('tm-npc-decision.js');
const threeSystemsUi = read('tm-three-systems-ui.js');
const editorAiGen = read('editor-ai-gen.js');
const courtMeter = read('tm-court-meter.js');
const editorAdministration = read('editor-administration.js');
const mapRecognition = read('map-recognition.js');
const integrationBridge = read('tm-integration-bridge.js');
const endturnHelpers = read('tm-endturn-helpers.js');
const verifyAll = read(path.join('scripts', 'verify-all.js'));

assert(!/function\s+manualStartKeju\s*\(/.test(keju), 'obsolete manualStartKeju direct exam launcher should be removed');
assert(/function\s+startKejuByMethod\s*\(/.test(keju), 'active keju method launcher should remain');
assert(/startKejuExam\s*\(\s*\{\s*type:\s*'zhengke'/.test(keju), 'active keju launcher should still call startKejuExam with method metadata');
assert(/绝不直接 startKejuExam|startKejuExam/.test(kejuRuntime), 'keju runtime design guard should remain visible');

[
  /function\s+importSaveFile\s*\(/,
  /function\s+doSaveGame\s*\(/,
  /async\s+function\s+doSaveGameDesktop\s*\(/,
  /function\s+openSettings\s*\(/
].forEach((pattern) => {
  assert(!pattern.test(playerSettings), 'tm-player-settings should no longer define obsolete overwritten entrypoint: ' + pattern);
});
assert(/doSaveGame\s*=\s*async\s*function\s*\(/.test(saveLifecycle), 'active doSaveGame override should remain in tm-save-lifecycle');
assert(/importSaveFile\s*=\s*function\s*\(/.test(saveLifecycle), 'active importSaveFile override should remain in tm-save-lifecycle');
assert(/openSettings\s*=\s*function\s*\(/.test(patches), 'active openSettings override should remain in tm-patches');

[
  /function\s+renderRulTab\s*\(/,
  /function\s+renderEvtTab\s*\(/,
  /function\s+renderTechTab\s*\(/,
  /function\s+renderMapTab\s*\(/,
  /async\s+function\s+aiGenOfficeEd\s*\(/
].forEach((pattern) => {
  assert(!pattern.test(launch), 'tm-launch obsolete editor stub should be removed: ' + pattern);
});
assert(/function\s+renderRulTab\s*\(/.test(officeEditor) || /window\.renderRulTab\s*=\s*function/.test(read('editor-details.js')), 'active renderRulTab should remain outside tm-launch');
assert(/function\s+renderEvtTab\s*\(/.test(officeEditor) || /window\.renderEvtTab\s*=\s*function/.test(read('editor-details.js')), 'active renderEvtTab should remain outside tm-launch');
assert(/function\s+renderTechTab\s*\(/.test(officeEditor) || /window\.renderTechTab\s*=\s*function/.test(read('editor-details.js')), 'active renderTechTab should remain outside tm-launch');
assert(/renderMapTab\s*=\s*function\s*\(/.test(electron), 'active renderMapTab override should remain in tm-electron');
assert(/function\s+aiGenOfficeEd\s*\(/.test(officeEditor), 'active aiGenOfficeEd should remain in tm-office-editor');
[
  /function\s+renderClassTab\s*\(/,
  /function\s+renderItmTab\s*\(/,
  /function\s+renderMilTab\s*\(/,
  /function\s+renderWldTab\s*\(/
].forEach((pattern) => {
  assert(!pattern.test(launch), 'tm-launch obsolete editor tab stub should be removed: ' + pattern);
});
assert(/window\.renderClassTab\s*=\s*function/.test(editorDetails), 'active renderClassTab should remain in editor-details');
assert(/window\.renderItmTab\s*=\s*function/.test(editorDetails), 'active renderItmTab should remain in editor-details');
assert(/window\.renderWldTab\s*=\s*function/.test(editorDetails), 'active renderWldTab should remain in editor-details');
assert(/wld-ref-section/.test(officeEditor), 'world tab reference-book enhancement should remain in tm-office-editor');
assert(/window\.renderMilTab\s*=\s*function/.test(militaryUi), 'active renderMilTab should remain in tm-military-ui');
assert(/function\s+addMilItem\s*\(/.test(launch), 'military UI helper addMilItem should remain in tm-launch');
assert(/function\s+editMilItem\s*\(/.test(launch), 'military UI helper editMilItem should remain in tm-launch');
assert(/function\s+deleteMilItem\s*\(/.test(launch), 'military UI helper deleteMilItem should remain in tm-launch');
assert(!/renderOfficeTab\s*=\s*function\s*\(/.test(patches), 'obsolete renderOfficeTab override should be removed from tm-patches');
assert(/function\s+renderOfficeTab\s*\(/.test(officeEditor), 'active renderOfficeTab should remain in tm-office-editor');
assert(/office-config-cost-panel/.test(officeEditor), 'active renderOfficeTab should retain officeConfig cost panel');

assert.strictEqual(countMatches(postTurnJobs, /async\s+function\s+_awaitPostTurnJobs\s*\(/g), 1, 'only the enhanced _awaitPostTurnJobs definition should remain');
assert.strictEqual(countMatches(postTurnJobs, /async\s+function\s+_awaitPostTurnJobsForSave\s*\(/g), 1, 'only the enhanced _awaitPostTurnJobsForSave definition should remain');
assert(/function\s+_detachRemainingPostTurnJobs\s*\(/.test(postTurnJobs), 'enhanced post-turn detach helper should remain');

assert(verifyAll.includes('smoke-dead-code-removal-guards.js'), 'verify-all should include dead code removal guard smoke');
assert(!/function\s+startGame\s*\(\s*sid\s*\)/.test(gameLoop), 'obsolete tm-game-loop startGame owner should be removed after active hooks are migrated');
assert(/startGame\s*=\s*async\s*function\s*\(\s*sid\s*\)/.test(patches), 'active startGame owner should remain in tm-patches');
assert(/function\s+_tmRefreshFactionDerivedRuntime\s*\(/.test(gameLoop), 'enterGame should retain migrated faction derived refresh helper');

[
  'executeRequestFundsBehavior',
  'executeOfficeDutyBehavior',
  'executePrivateLifeBehavior',
  'executeDevelopLocalBehavior',
  'executeReliefBehavior'
].forEach((name) => {
  assert.strictEqual(
    countMatches(npcDecision, new RegExp('function\\s+' + name + '\\s*\\(')),
    1,
    'legacy fixed-effect NPC behavior handler should be removed: ' + name
  );
});
assert(/function\s+_npcEnsureExecutionFactors\s*\(/.test(npcDecision), 'economy-aware NPC execution factors helper should remain');
assert.strictEqual(
  countMatches(threeSystemsUi, /function\s+openForcesRelationsPanel\s*\(/g),
  1,
  'obsolete unselected faction panel implementation should be removed'
);
assert(/function\s+openForcesRelationsPanel\s*\(\s*selectedFacName\s*\)/.test(threeSystemsUi), 'selected faction panel implementation should remain');
assert(!/function\s+_phaseColor\s*\(/.test(threeSystemsUi), 'obsolete faction phase color helper should be removed with the old panel');
assert(!/Legacy single-pass government/.test(editorAiGen), 'unreachable legacy government single-pass block should be removed');
assert(!/Legacy single-pass adminHierarchy/.test(editorAiGen), 'unreachable legacy adminHierarchy single-pass block should be removed');
assert(!/if\s*\(\s*false\s*&&\s*target\s*===\s*['"]government['"]\s*\)/.test(editorAiGen), 'editor-ai-gen should not keep if(false) government code');
assert(!/if\s*\(\s*false\s*&&\s*target\s*===\s*['"]adminHierarchy['"]\s*\)/.test(editorAiGen), 'editor-ai-gen should not keep if(false) adminHierarchy code');
assert(!/if\s*\(\s*false\s*&&\s*typeof\s+openChaoyi\s*===\s*['"]function['"]\s*\)/.test(courtMeter), 'post-turn court should not keep unreachable openChaoyi dead branch');
assert(!/_cc2_openPrepareDialog/.test(courtMeter), 'post-turn court should not keep removed _cc2 prepare-dialog references');
assert(!/var\s+cyBody\s*=\s*null\s*;\s*if\s*\(\s*cyBody\s*\)/.test(courtMeter), 'post-turn court should not keep null cyBody dead render branch');
assert.strictEqual(
  countMatches(editorAdministration, /function\s+initAdministrationPanel\s*\(/g),
  1,
  'obsolete overwritten initAdministrationPanel should be removed from editor-administration'
);
assert(/function\s+_adminBuildOfficialPositionOptions\s*\(/.test(editorAdministration), 'shared admin official option helper should exist');
assert(/function\s+_adminCollectLeafDivisionEntries\s*\(/.test(editorAdministration), 'shared admin leaf-division helper should exist');
assert(/function\s+_adminFindDivisionIn\s*\(/.test(editorAdministration), 'shared admin division lookup helper should exist');
assert.strictEqual(
  countMatches(editorAdministration, /function\s+collectOfficials\s*\(/g),
  0,
  'duplicate nested collectOfficials helpers should be collapsed'
);
assert.strictEqual(
  countMatches(editorAdministration, /function\s+collectLeafDivisions\s*\(/g),
  0,
  'duplicate nested collectLeafDivisions helpers should be collapsed'
);
assert.strictEqual(
  countMatches(editorAdministration, /function\s+findDivision\s*\(/g),
  0,
  'duplicate nested findDivision helpers should be collapsed'
);
assert(/function\s+_walkAdminDivisions\s*\(/.test(integrationBridge), 'shared IntegrationBridge division walker should exist');
assert(
  countMatches(integrationBridge, /function\s+walk\s*\(/g) <= 1,
  'IntegrationBridge should not keep duplicate nested walk helpers'
);
assert(/function\s+_walkOfficeTree\s*\(/.test(endturnHelpers), 'shared end-turn office tree walker should exist');
assert.strictEqual(
  countMatches(endturnHelpers, /function\s+walk\s*\(/g),
  0,
  'end-turn helpers should not keep duplicate nested office walk helpers'
);
[
  'buildColorMap',
  'calculateCenter',
  'extractRegionBoundary',
  'extractRegionColor',
  'pointToLineDistance',
  'simplifyBoundary'
].forEach((name) => {
  assert.strictEqual(
    countMatches(mapRecognition, new RegExp('function\\s+' + name + '\\s*\\(', 'g')),
    1,
    'obsolete overwritten map recognition helper should be removed: ' + name
  );
});

console.log('smoke-dead-code-removal-guards ok');
