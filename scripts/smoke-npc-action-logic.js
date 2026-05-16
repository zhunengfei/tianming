#!/usr/bin/env node
// smoke-npc-action-logic.js - NPC action normalization, candidate actions, and empty-engine guard.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed++;
}

function load(ctx, rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(src, ctx, { filename: rel });
}

async function main() {
  const chars = [
    { id: 'c1', name: 'ZhangSan', alive: true, loyalty: 65, ambition: 82, intelligence: 75, integrity: 80, officialTitle: 'Minister', location: 'Capital' },
    { id: 'c2', name: 'LiSi', alive: true, loyalty: 50, ambition: 40, intelligence: 55, integrity: 45, officialTitle: 'Clerk', location: 'Capital' },
    { id: 'c3', name: 'GeneralWang', alive: true, loyalty: 58, ambition: 65, valor: 88, troops: 1000, officialTitle: 'General', location: 'Frontier' },
    { id: 'c4', name: 'RemoteZhao', alive: true, loyalty: 72, ambition: 35, intelligence: 70, officialTitle: 'Governor', location: 'Liaodong' }
  ];
  const events = [];
  let lastPrompt = '';

  const ctx = {
    console: console,
    setTimeout: function(fn) { if (typeof fn === 'function') fn(); return 1; },
    clearTimeout: function(){},
    Promise: Promise,
    Math: Math,
    Date: Date,
    JSON: JSON,
    Map: Map,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    RegExp: RegExp,
    P: {
      ai: { key: 'test-key', url: 'https://example.invalid/v1/chat/completions', model: 'test' },
      traitDefinitions: [],
      npcEngine: {
        enabled: true,
        behaviors: [
          { id: 'recommend', name: 'recommend', enabled: true, weight: { base: 20 } }
        ]
      }
    },
    GM: {
      turn: 3,
      vars: {},
      rels: {},
      facs: [],
      chars: chars,
      armies: [{ name: 'Border Army', commander: 'GeneralWang', training: 40, morale: 50 }],
      memorials: [],
      letters: [],
      _pendingNpcLetters: [],
      _pendingAudiences: [],
      _capital: 'Capital',
      officeTree: [
        { name: 'Court', positions: [
          { name: 'Minister', holder: 'ZhangSan', rank: '2' },
          { name: 'Clerk', holder: 'LiSi', rank: '7' }
        ] },
        { name: 'Army', positions: [
          { name: 'General', holder: 'GeneralWang', rank: '3' }
        ] },
        { name: 'Province', positions: [
          { name: 'Governor', holder: 'RemoteZhao', rank: '4' }
        ] }
      ],
      _turnContext: { npcActionsThisTurn: [] }
    },
    AICache: { cleanup: function(){} },
    _dbg: function(){},
    getTSText: function(turn) { return 'T' + turn; },
    getCompressionParams: function() { return { scale: 1 }; },
    findCharByName: function(name) { return chars.find(function(c) { return c.name === name; }) || null; },
    addEB: function(type, text) { events.push({ type: type, text: text }); },
    random: function() { return 0.2; },
    adjustCharacterLoyalty: function(ch, delta, reason, meta) {
      ch.loyalty += delta;
      ch._lastLoyaltyReason = reason;
      ch._lastLoyaltyMeta = meta;
    },
    callAI: async function(prompt) {
      lastPrompt = String(prompt || '');
      const behaviorContext = ctx.buildNpcBehaviorContext();
      const zhangPetition = ctx._buildNpcActionCandidates(chars[0], behaviorContext).find(function(c) { return c.behaviorType === 'petition'; });
      const wangTrain = ctx._buildNpcActionCandidates(chars[2], behaviorContext).find(function(c) { return c.behaviorType === 'train_troops'; });
      const zhaoLetter = ctx._buildNpcActionCandidates(chars[3], behaviorContext).find(function(c) { return c.behaviorType === 'send_letter'; });
      return JSON.stringify([
        { name: 'ZhangSan', actionId: zhangPetition.id, shouldExecute: true },
        { name: 'GeneralWang', actionId: wangTrain.id, shouldExecute: true },
        { name: 'RemoteZhao', actionId: zhaoLetter.id, shouldExecute: true }
      ]);
    },
    extractJSON: function(text) { return JSON.parse(text); }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  load(ctx, 'tm-npc-engine.js');
  load(ctx, 'tm-npc-decision.js');

  assert(typeof ctx.NpcEngine.hasExecutableBehaviors === 'function',
    'NpcEngine should expose hasExecutableBehaviors() for end-turn guard');
  assert(ctx.NpcEngine.hasExecutableBehaviors() === false,
    'data-only npcEngine behavior templates should be detected as non-executable');

  assert(typeof ctx._buildNpcActionCandidates === 'function',
    'NPC decision layer should expose candidate action builder');
  assert(typeof ctx._scoreNpcActionCandidate === 'function',
    'NPC decision layer should expose candidate scoring helper');

  const behaviorContext = ctx.buildNpcBehaviorContext();
  const courtCandidates = ctx._buildNpcActionCandidates(chars[0], behaviorContext);
  const militaryCandidates = ctx._buildNpcActionCandidates(chars[2], behaviorContext);
  const remoteCandidates = ctx._buildNpcActionCandidates(chars[3], behaviorContext);

  assert(courtCandidates.some(function(c) { return c.behaviorType === 'petition'; }),
    'court NPC should receive petition candidate');
  assert(courtCandidates.some(function(c) { return c.behaviorType === 'conspire'; }),
    'ambitious court NPC should receive conspire candidate');
  assert(militaryCandidates.some(function(c) { return c.behaviorType === 'train_troops'; }),
    'military NPC should receive train_troops candidate');
  assert(remoteCandidates.some(function(c) { return c.behaviorType === 'send_letter'; }),
    'remote NPC should receive send_letter candidate');
  assert(remoteCandidates.some(function(c) { return c.behaviorType === 'seek_audience'; }),
    'remote NPC should receive seek_audience candidate');
  assert(militaryCandidates.some(function(c) { return c.behaviorType === 'request_funds'; }),
    'military NPC should receive request_funds candidate');
  assert(courtCandidates.every(function(c) { return typeof c.score === 'number' && c.score > 0; }),
    'candidate actions should carry positive motivation scores');

  await ctx.executeNpcBehaviors();

  assert(ctx.GM.memorials.some(function(m) { return m.from === 'ZhangSan'; }),
    'candidate actionId petition should materialize as memorial');
  assert(ctx.GM.armies[0].training > 40,
    'candidate actionId train_troops should improve commanded army training');
  assert(ctx.GM._pendingNpcLetters.some(function(l) { return l.from === 'RemoteZhao'; }),
    'candidate actionId send_letter should enqueue NPC letter');
  assert(ctx.GM._turnContext.npcActionsThisTurn.indexOf('ZhangSan') >= 0,
    'executed supplemental NPC decision should be recorded in per-turn handled ledger');
  assert(events.some(function(e) { return /ZhangSan/.test(e.text); }),
    'supplemental NPC decision should leave a readable NPC event');
  assert(/actionId/.test(lastPrompt) && /npcact/.test(lastPrompt),
    'batch NPC prompt should expose actionId candidate action cards');

  const directOk = ctx._executeNormalizedNpcDecision({
    actor: 'ZhangSan',
    behaviorType: 'reward',
    target: 'LiSi',
    action: 'Reward LiSi',
    shouldExecute: true
  }, chars[0], behaviorContext);
  assert(directOk === true,
    'normalized actor/action decision should still execute direct behavior');
  assert(chars[1].loyalty === 55,
    'normalized actor/action reward should adjust target loyalty');

  const audienceOk = ctx._executeNormalizedNpcDecision({
    actor: 'RemoteZhao',
    behaviorType: 'seek_audience',
    action: 'Ask for audience',
    shouldExecute: true
  }, chars[3], behaviorContext);
  assert(audienceOk === true && ctx.GM._pendingAudiences.some(function(q) { return q.name === 'RemoteZhao'; }),
    'seek_audience behavior should enqueue pending audience');

  const memorialsBeforeFunds = ctx.GM.memorials.length;
  const fundsOk = ctx._executeNormalizedNpcDecision({
    actor: 'GeneralWang',
    behaviorType: 'request_funds',
    action: 'Request army funds',
    shouldExecute: true
  }, chars[2], behaviorContext);
  assert(fundsOk === true && ctx.GM.memorials.length === memorialsBeforeFunds + 1,
    'request_funds behavior should materialize as memorial');

  console.log('[smoke-npc-action-logic] PASS ' + passed + ' assertions');
}

main().catch(function(err) {
  console.error('[smoke-npc-action-logic] FAIL');
  console.error(err && err.stack || err);
  process.exit(1);
});
