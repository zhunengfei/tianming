#!/usr/bin/env node
// smoke-postturn-court-turn-gating.js
// Ensures post-turn Shuochao decisions are attributed to the next turn only.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const promptSrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-prompt.js'), 'utf8');
const changchaoSrc = fs.readFileSync(path.join(ROOT, 'tm-chaoyi-changchao.js'), 'utf8');
const courtSrc = fs.readFileSync(path.join(ROOT, 'tm-court-meter.js'), 'utf8');

let passed = 0;
function assert(cond, label) {
  if (!cond) throw new Error('[assert] ' + label);
  passed++;
}

const sandbox = {
  console,
  window: null,
  global: null,
  TM: { Endturn: { AI: { prompt: {} } }, errors: { capture: function(){}, captureSilent: function(){} } }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(promptSrc, sandbox, { filename: 'tm-endturn-prompt.js' });

const promptApi = sandbox.TM.Endturn.AI.prompt;
assert(promptApi && typeof promptApi.getCurrentChangchaoDecisions === 'function', 'prompt exposes getCurrentChangchaoDecisions');
assert(promptSrc.indexOf('_getCurrentChangchaoDecisions(GM)') >= 0, 'prompt build reads gated Changchao decisions');
assert(changchaoSrc.indexOf('_lastChangchaoDecisionMeta') >= 0, 'Changchao persist writes decision targetTurn metadata');

const openBranch = courtSrc.match(/function _postTurnCourtChoose\(openCourt\)\s*\{([\s\S]*?)\}\s*else\s*\{/);
assert(!!openBranch, 'post-turn court open branch found');
const startIdx = openBranch[1].indexOf('_endTurnInternal();');
const courtUiIdx = openBranch[1].indexOf('setTimeout(function(){');
assert(startIdx >= 0, 'opening Shuochao starts end-turn pipeline');
assert(courtUiIdx >= 0, 'opening Shuochao schedules court UI');
assert(startIdx < courtUiIdx, 'end-turn pipeline starts before Shuochao UI schedule');
assert(openBranch[1].indexOf('courtDone: false') >= 0 && openBranch[1].indexOf('GM._isPostTurnCourt = true') >= 0, 'Shuochao marks deferred Shiji modal state before pipeline');

const postTurnGM = {
  turn: 1,
  _lastChangchaoDecisions: [{ action: 'approve', title: 'Post-turn Shuochao decision' }],
  _lastChangchaoDecisionMeta: { turn: 1, targetTurn: 2, phase: 'post-turn', mode: 'changchao' }
};
assert(promptApi.getCurrentChangchaoDecisions(postTurnGM).length === 0, 'post-turn decisions do not affect current ending turn');

postTurnGM.turn = 2;
assert(promptApi.getCurrentChangchaoDecisions(postTurnGM).length === 1, 'post-turn decisions affect their target turn');

const inTurnGM = {
  turn: 3,
  _lastChangchaoDecisions: [{ action: 'reject', title: 'In-turn court decision' }],
  _lastChangchaoDecisionMeta: { turn: 3, targetTurn: 3, phase: 'in-turn', mode: 'changchao' }
};
assert(promptApi.getCurrentChangchaoDecisions(inTurnGM).length === 1, 'in-turn decisions still affect current turn');

const legacyGM = {
  turn: 4,
  _lastChangchaoDecisions: [{ action: 'hold', title: 'Legacy decision without metadata' }]
};
assert(promptApi.getCurrentChangchaoDecisions(legacyGM).length === 1, 'legacy saves without metadata remain readable');

console.log('[smoke-postturn-court-turn-gating] pass assertions=' + passed);
