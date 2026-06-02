#!/usr/bin/env node
// smoke-phase8-party-class-ecology-ui.js - right rail shows ecology-built party/class relationship causes.

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
    satisfaction: 32,
    influence: 56,
    demands: 'reduce tax and levy pressure',
    economicRole: 'tenant households carrying rent arrears'
  }
];

const parties = [
  {
    name: 'Relief League',
    status: 'active',
    influence: 54,
    currentAgenda: 'carry tenant relief'
  },
  {
    name: 'Revenue Clique',
    status: 'active',
    influence: 68,
    currentAgenda: 'defend arrear collection',
    rivalParty: 'Relief League'
  }
];

const bridge = {
  _state: { rightOutlineTab: 'classes', activePanel: 'ol' },
  _esc: esc,
  _attr: esc,
  _asset: v => v,
  _fmtNum: v => String(v),
  _miniRows: () => '',
  _actionButton: () => '',
  _moduleShell: () => '',
  _dossierRows: () => '',
  _ownerKey: () => '',
  _ownerName: () => '',
  _findFaction: () => null,
  _findPerson: name => ({ name, alive: true, location: 'capital', officialTitle: 'minister' }),
  _personKey: p => p && (p.name || p.id) || '',
  _getPeople: () => [],
  _getMapData: () => ({ regions: [] }),
  _getParties: () => parties,
  _getClasses: () => classes,
  _collectRecentEvents: () => [],
  _getTurnText: () => 'T21',
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
  _toast() {},
  openPanel(slot) { this._lastPanel = slot; this._state.activePanel = slot; },
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
  setTimeout: fn => { if (typeof fn === 'function') fn(); return 1; },
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
  turn: 21,
  classes,
  parties,
  _partyGoalRelationIndex: {
    classParties: { 'Canal Tenants': ['Relief League'] },
    partyClasses: { 'Relief League': ['Canal Tenants'] },
    evidence: [
      { className: 'Canal Tenants', partyName: 'Relief League', source: 'runtime-affinity', detail: 'affinity=52', affinity: 52, status: 'aligned', trust: 49, grievance: 33 },
      { className: 'Canal Tenants', partyName: 'Revenue Clique', source: 'runtime-estranged', detail: 'affinity=4', affinity: 4, status: 'estranged', trust: 21, grievance: 70 }
    ]
  },
  partyClassRelations: {
    edges: {
      'canaltenants::reliefleague': {
        className: 'Canal Tenants',
        partyName: 'Relief League',
        affinity: 52,
        trust: 49,
        grievance: 33,
        status: 'aligned',
        lastTurn: 21,
        lastSource: 'smoke-ecology-apply-21',
        lastReason: 'ecology signal tax linked class pressure to party agenda',
        evidence: [{ source: 'smoke-ecology-apply-21', detail: 'tax/commerce' }]
      },
      'canaltenants::revenueclique': {
        className: 'Canal Tenants',
        partyName: 'Revenue Clique',
        affinity: 4,
        trust: 21,
        grievance: 70,
        status: 'estranged',
        lastTurn: 21,
        lastSource: 'smoke-ecology-apply-21',
        lastReason: 'ecology signal tax linked class pressure to party agenda',
        evidence: [{ source: 'smoke-ecology-apply-21', detail: 'tax/commerce' }]
      }
    },
    history: [
      { turn: 20, className: 'Canal Tenants', partyName: 'Relief League', source: 'smoke-ecology-apply-20', delta: 11.8, after: 39.8, status: 'wavering' },
      { turn: 21, className: 'Canal Tenants', partyName: 'Relief League', source: 'smoke-ecology-apply-21', delta: 12.15, after: 52, status: 'aligned' },
      { turn: 21, className: 'Canal Tenants', partyName: 'Revenue Clique', source: 'smoke-ecology-apply-21', delta: -12.15, after: 4, status: 'estranged' }
    ]
  },
  _partyClassEcology: {
    signalHistory: [
      { turn: 20, source: 'smoke-ecology-tax-20', kind: 'tax-pressure', categories: ['tax', 'commerce'], affectedClasses: ['Canal Tenants'], affectedParties: ['Relief League', 'Revenue Clique'] },
      { turn: 21, source: 'smoke-ecology-tax-21', kind: 'tax-pressure', categories: ['tax', 'commerce'], affectedClasses: ['Canal Tenants'], affectedParties: ['Relief League', 'Revenue Clique'] }
    ]
  }
};
sandbox.P = sandbox.window.P;
sandbox.TM = sandbox.window.TM;
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail.js'), 'utf8'), sandbox, { filename: 'phase8-formal-rightrail.js' });

const bridgeSource = fs.readFileSync(path.join(ROOT, 'phase8-formal-bridge.js'), 'utf8');
assert(/\.tmrp-ecology/.test(bridgeSource), 'ecology relation rows should have explicit right-rail styling');
assert(/\.tmrp-ecology-edge/.test(bridgeSource), 'ecology relation edge rows should have explicit styling');

let html = bridge.rightrail.renderers.ol();
assert(/tmrp-ecology/.test(html), 'class card should render ecology relation block');
assert(/生态关系/.test(html), 'class card should label ecology relation block');
assert(/Relief League/.test(html) && /aligned/.test(html), 'class card should show aligned supporter from dynamic ecology');
assert(/Revenue Clique/.test(html) && /estranged/.test(html), 'class card should show estranged hostile party from dynamic ecology');
assert(/亲和 52/.test(html) && /信 49/.test(html) && /怨 33/.test(html), 'class card should show affinity/trust/grievance numbers');
assert(/tax-pressure/.test(html) && /smoke-ecology-tax-21/.test(html), 'class card should show recent ecology signal cause');
assert(/data-chain-kind="party"/.test(html) && /data-target="Relief League"/.test(html), 'ecology supporter should remain clickable through the social chain');

bridge._state.rightOutlineTab = 'parties';
html = bridge.rightrail.renderers.ol();
assert(/tmrp-ecology/.test(html), 'party card should render ecology relation block');
assert(/Canal Tenants/.test(html) && /aligned/.test(html), 'party card should show linked class from ecology relation');
assert(/smoke-ecology-apply-21/.test(html), 'party card should show relation update source');
assert(!/Revenue Clique<\/b><span>.*Revenue Clique/.test(html), 'party card should not list itself as a linked party');

console.log('[smoke-phase8-party-class-ecology-ui] PASS phase8 ecology relation UI');
