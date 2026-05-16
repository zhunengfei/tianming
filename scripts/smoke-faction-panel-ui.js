#!/usr/bin/env node
// scripts/smoke-faction-panel-ui.js
// Guards the runtime faction panel shell and styling hooks.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-three-systems-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(src.includes('function openForcesRelationsPanel(selectedFacName)'), 'faction panel should accept selected faction name');
assert(src.includes('frp-shell'), 'faction panel shell missing');
assert(src.includes('frp-grid'), 'faction panel two-column grid missing');
assert(src.includes('frp-relation-board'), 'faction relation board missing');
assert(src.includes('global.viewFac = function(facName)'), 'viewFac should open selected faction panel');
assert(css.includes('.frp-shell'), 'faction panel CSS shell missing');
assert(css.includes('.frp-card'), 'faction card CSS missing');
assert(css.includes('.frp-relation-cell'), 'relation cell CSS missing');

let captured = null;
const ctx = {
  console,
  Math,
  Date,
  JSON,
  Object,
  Array,
  Number,
  String,
  Boolean,
  RegExp,
  isFinite,
  alert(msg) { throw new Error('unexpected alert: ' + msg); },
  prompt() { return null; },
  toast() {},
  openGenericModal(title, html) { captured = { title, html }; },
  GM: {
    turn: 3,
    facs: [
      { name:'明朝廷', leader:'朱由检', color:'#b89a53', strength:42, derivedStrength:{ value:42, label:'弱' }, derivedHealth:{ overall:42, militaryStability:31, labels:{ overall:'弱' } }, derivedEconomy:{ economyHealth:44, fiscalStress:56, annualTaxIncome:1000000, annualMilitaryCost:2200000 }, derivedCohesion:{ overall:55 }, lifePhase:'strained', isPlayer:true },
      { name:'后金', leader:'皇太极', color:'#7eb8a7', strength:90, derivedStrength:{ value:90, label:'健' }, derivedHealth:{ overall:90, militaryStability:88, labels:{ overall:'健' } }, derivedEconomy:{ economyHealth:86, fiscalStress:14, annualTaxIncome:600000, annualMilitaryCost:300000 }, derivedCohesion:{ overall:84 }, lifePhase:'consolidating' }
    ],
    _facIndex: {
      '明朝廷': { metrics:{ charCount:3, armyCount:1, totalSoldiers:120000, arrearsArmies:1, avgMutinyRisk:38, avgLoyalty:62, privatizedRatio:0.33 }, chars:[{ name:'袁崇焕', officialTitle:'蓟辽督师' }], armies:[{ name:'关宁军', soldiers:120000, garrison:'宁远', mutinyRisk:40 }] },
      '后金': { metrics:{ charCount:2, armyCount:1, totalSoldiers:80000, arrearsArmies:0, avgMutinyRisk:10, avgLoyalty:85, privatizedRatio:0 }, chars:[{ name:'皇太极', officialTitle:'汗' }], armies:[{ name:'两黄旗', soldiers:80000, garrison:'沈阳' }] }
    },
    factionRelations: [{ from:'明朝廷', to:'后金', type:'war', value:-90, desc:'辽东交兵' }],
    _factionMilitaryLog: [{ turn:2, faction:'后金', target:'明朝廷', action:'整兵辽阳', outcome:'边防紧张' }]
  },
  P: { playerInfo: { factionName:'明朝廷' } },
  TM: {}
};
ctx.GM.facs[1].npcMilitaryActions = [{ turn:3, action:'military_order', army:'BlueBanner', reason:'Frontier drill', effect:{ commanderFrom:'OldGeneral', commanderTo:'NewGeneral', trainingDelta:6, moraleDelta:4 } }];
ctx.GM.facs[1].npcDiplomacyActions = [{ turn:3, action:'diplomacy', to:'MingEnvoy', reason:'Probe peace terms', effect:{ relationFrom:-70, relationTo:-55 } }];
ctx.GM.facs[1].npcProvincePolicies = [{ turn:3, action:'province_policy', province:'Liaoyang', reason:'Move grain levy', effect:{ ownerFrom:'OldOwner', ownerTo:'NewOwner', revenueDelta:1200 } }];
ctx.GM.facs[1].npcFiscalActions = [{ turn:3, action:'fiscal_policy', resource:'money', amount:120000, reason:'War levy', effect:{ before:100000, after:220000 } }];
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx, { filename:'tm-three-systems-ui.js' });
ctx.openForcesRelationsPanel('后金');
assert(captured && captured.title === '势力天平', 'panel did not open expected modal');
assert(captured.html.includes('frp-shell') && captured.html.includes('后金') && captured.html.includes('关系棋盘'), 'rendered modal missing core content');

assert(captured.html.includes('BlueBanner') && captured.html.includes('Probe peace terms') && captured.html.includes('Liaoyang') && captured.html.includes('War levy'),
  'faction detail panel should surface expanded NPC LLM action trajectories');

ctx._tsInspectNpcInternal(ctx.GM.facs[1].name);
assert(captured && captured.html.includes('BlueBanner') && captured.html.includes('Probe peace terms') && captured.html.includes('Liaoyang') && captured.html.includes('War levy'),
  'NPC internal inspection panel should surface expanded NPC LLM action trajectories');

console.log('[smoke-faction-panel-ui] pass');
