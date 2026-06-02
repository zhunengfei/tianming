#!/usr/bin/env node
// smoke-phase8-social-political-cause-chain.js - right rail should expose social/political signal causes.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const classes = [
  {
    name: 'Canal Tenants',
    tags: ['tenant', 'tax', 'levy', 'peasant'],
    satisfaction: 52,
    influence: 48,
    demands: 'reduce emergency levy',
    unrestLevels: { grievance: 54, petition: 41 },
    supportingParties: [{ party: 'Relief League', affinity: 0.74 }]
  }
];

const parties = [
  {
    name: 'Relief League',
    tags: ['relief', 'tax', 'tenant'],
    status: 'active',
    influence: 50,
    cohesion: 52,
    currentAgenda: 'carry tenant relief',
    shortGoal: 'force emergency levy review',
    socialBase: ['Canal Tenants']
  }
];

const bridge = {
  _state: { rightOutlineTab: 'classes', activePanel: 'ol' },
  _esc: esc,
  _attr: esc,
  _asset: (v) => v,
  _fmtNum: (v) => String(v),
  _miniRows: () => '',
  _actionButton: () => '',
  _moduleShell: () => '',
  _dossierRows: () => '',
  _ownerKey: () => '',
  _ownerName: () => '',
  _findFaction: () => null,
  _findPerson: (name) => ({ name, alive: true, location: 'capital', officialTitle: 'minister' }),
  _personKey: (p) => p && (p.name || p.id) || '',
  _getPeople: () => [{ name: 'Minister Lin', alive: true, party: 'Relief League', location: 'capital', officialTitle: 'minister' }],
  _getMapData: () => ({ regions: [] }),
  _getParties: () => parties,
  _getClasses: () => classes,
  _collectRecentEvents: () => [],
  _getTurnText: () => 'T32',
  _firstArray: () => [],
  _actionBtn: () => '',
  _actionChip: () => '',
  _renderActionStats: () => '',
  _compactText: (v, n) => String(v || '').slice(0, n || 160),
  _getMemorials: () => [],
  _getIssues: () => [],
  _getActiveScenario: () => ({}),
  _getArmies: () => [],
  _issueIsResolved: () => false,
  _tmfRenwuPortrait: () => '',
  _toast: () => {},
  openPanel(slot) { this._lastPanel = slot; },
  openModule(kind, opts) { this._lastModule = { kind, opts }; },
  openGuoku() {},
  _openOfficeStandalone() {},
  _openShiluPreviewPanel() {},
  _openHongyanPreviewPanel() {},
  _closeModule() {},
  _closeDeskOverlay() {},
  _closeRightDrawer() {},
  _returnFormalHomeSoon() {},
  _saveFormalDraftsToGM() {},
  openRenwu() {},
  personAction() {},
  unpin() {}
};

const sandbox = {
  console,
  Math, Date, JSON, RegExp, Error,
  Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  document: { getElementById: () => null, createElement: () => ({ addEventListener(){}, remove(){}, style: {} }), body: { appendChild(){} } },
  window: {
    TMPhase8FormalBridge: bridge,
    GM: null,
    P: {},
    TM: {}
  }
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;
sandbox.window.globalThis = sandbox.window;
sandbox.GM = sandbox.window.GM = {
  turn: 32,
  classes,
  parties,
  partyState: {},
  turnChanges: {},
  _partyClassCourtIssueLinks: [
    { turn: 32, party: 'Relief League', className: 'Canal Tenants', topic: 'Emergency levy review', goalText: 'force emergency levy review' }
  ],
  _pendingTinyiTopics: [],
  _edictSuggestions: []
};
sandbox.P = sandbox.window.P;
sandbox.TM = sandbox.window.TM;
vm.createContext(sandbox);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
}

load('tm-engine-constants.js');
load('tm-class-engine.js');
load('tm-party-goals.js');
load('tm-party-class-ecology.js');
load('tm-social-political-signals.js');

const SPS = sandbox.TM && sandbox.TM.SocialPoliticalSignals;
assert(SPS && typeof SPS.recordTurnResult === 'function', 'SocialPoliticalSignals.recordTurnResult should exist');
assert(typeof SPS.getRecentCauses === 'function', 'SocialPoliticalSignals.getRecentCauses should exist');

const turnOut = SPS.recordTurnResult(sandbox.GM, {
  turnSummary: 'Emergency levy collection caused tenant unrest along the canal.',
  shizhengji: 'The Relief League demanded a review of emergency levy quotas.',
  zhengwen: 'Local officials pressed arrears and new levy quotas.'
}, {
  source: 'smoke-cause-chain-turn',
  turn: 32
});
assert(turnOut.recorded >= 1, 'turn-result should record at least one signal for cause-chain UI');

SPS.record(sandbox.GM, {
  sourceSystem: 'player-action',
  kind: 'memorial-decision-desk',
  turn: 32,
  tags: ['player-action', 'memorial', 'tax'],
  reason: 'Approved memorial to investigate Emergency levy review',
  linkedIssue: 'Emergency levy review',
  affectedClasses: [{ name: 'Canal Tenants', satisfactionDelta: 2, demand: 'keep levy review moving', reason: 'memorial approval reassured tenants' }],
  affectedParties: [{ name: 'Relief League', cohesionDelta: 1, shortGoal: 'claim credit for levy review', reason: 'memorial approval gives party leverage' }]
});

SPS.applyPending(sandbox.GM, { turn: 32, source: 'smoke-cause-chain-apply' });

const classCauses = SPS.getRecentCauses(sandbox.GM, 'class', 'Canal Tenants', { limit: 6 });
assert(classCauses.some(c => c.sourceLabel === '本回合推演' && /turn-result-tax-pressure/.test(c.kind || '')), 'class causes should include labeled turn-result pressure');
assert(classCauses.some(c => c.sourceLabel === '玩家操作' && /memorial/i.test(c.kind || '')), 'class causes should include labeled player action');
assert(classCauses.some(c => /满意/.test(c.summary || '') && /诉求/.test(c.summary || '')), 'class cause summary should expose numeric and demand impact');

load('phase8-formal-rightrail.js');
assert(bridge.rightrail && bridge.rightrail.renderers && typeof bridge.rightrail.renderers.ol === 'function', 'right rail outline renderer should load');

let html = bridge.rightrail.renderers.ol();
assert(/tmrp-signal-cause/.test(html), 'class card should render unified signal-cause chain');
assert(/本回合推演/.test(html), 'class card should show turn-result source label');
assert(/玩家操作/.test(html), 'class card should show player-action source label');
assert(/Emergency levy/.test(html), 'class card should show linked policy/court issue text');
assert(/满意/.test(html), 'class signal-cause summary should expose class impact');
assert(!/data-relation-command=/.test(html), 'right rail should not expose direct relation intervention commands');

bridge._state.rightOutlineTab = 'parties';
html = bridge.rightrail.renderers.ol();
assert(/tmrp-signal-cause/.test(html), 'party card should render unified signal-cause chain');
assert(/Relief League/.test(html), 'party card should still render target party');
assert(/玩家操作/.test(html), 'party card should show player-action source label');
assert(/凝聚|目标/.test(html), 'party signal-cause summary should expose party impact');
assert(!/data-relation-command=/.test(html), 'party card should not expose direct relation intervention commands');

const rightrailSource = fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail.js'), 'utf8');
assert(/SocialPoliticalSignals\.getRecentCauses/.test(rightrailSource), 'right rail should call SocialPoliticalSignals.getRecentCauses');

console.log('[smoke-phase8-social-political-cause-chain] PASS phase8 social/political cause chain');
