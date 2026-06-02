#!/usr/bin/env node
// smoke-phase8-party-class-relation-forecast.js - ecology relations show route forecasts without direct commands.

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

const playerSignals = [];
const llmActions = [];
const classes = [
  {
    name: 'Canal Tenants',
    satisfaction: 26,
    influence: 58,
    currentDemand: 'reduce tax and levy pressure',
    demands: 'reduce tax and levy pressure',
    unrestLevels: { grievance: 30, petition: 38, strike: 64, revolt: 78 }
  }
];
const parties = [
  { name: 'Relief League', status: 'active', influence: 54, currentAgenda: 'carry tenant relief' },
  { name: 'Revenue Clique', status: 'active', influence: 68, currentAgenda: 'defend arrear collection' }
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
  _getTurnText: () => 'T23',
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
    TM: {
      PlayerActionSignals: {
        record(root, payload) {
          playerSignals.push({ root, payload });
          return { id: 'mock-player-action', payload };
        }
      },
      PartyClassLlmCalibrator: {
        notifyPlayerAction(payload) {
          llmActions.push(payload);
        }
      }
    }
  }
};
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;
sandbox.window.globalThis = sandbox.window;
sandbox.window.global = sandbox.window;
sandbox.GM = sandbox.window.GM = {
  turn: 23,
  classes,
  parties,
  partyState: {},
  _pendingTinyiTopics: [],
  partyClassRelations: {
    edges: {
      'canaltenants::reliefleague': {
        className: 'Canal Tenants',
        partyName: 'Relief League',
        affinity: 44,
        trust: 41,
        grievance: 61,
        status: 'wavering',
        lastTurn: 22,
        lastSource: 'smoke-ecology-apply-22',
        lastReason: 'ecology signal tax linked class pressure'
      },
      'canaltenants::revenueclique': {
        className: 'Canal Tenants',
        partyName: 'Revenue Clique',
        affinity: 24,
        trust: 25,
        grievance: 72,
        status: 'estranged',
        lastTurn: 22,
        lastSource: 'smoke-ecology-apply-22',
        lastReason: 'ecology signal tax linked class pressure'
      }
    },
    history: []
  },
  _partyClassEcology: {
    signalHistory: [
      { turn: 22, source: 'smoke-ecology-tax-22', kind: 'tax-pressure', categories: ['tax'], affectedClasses: ['Canal Tenants'], affectedParties: ['Relief League', 'Revenue Clique'] }
    ]
  }
};
sandbox.P = sandbox.window.P;
sandbox.TM = sandbox.window.TM;
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-party-goals.js'), 'utf8'), sandbox, { filename: 'tm-party-goals.js' });
sandbox.window.TM.PlayerActionSignals = {
  record(root, payload) {
    playerSignals.push({ root, payload });
    return { id: 'mock-player-action', payload };
  }
};
sandbox.window.TM.PartyClassLlmCalibrator = {
  notifyPlayerAction(payload) {
    llmActions.push(payload);
  }
};
sandbox.TM = sandbox.window.TM;

vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase8-formal-rightrail.js'), 'utf8'), sandbox, { filename: 'phase8-formal-rightrail.js' });

const bridgeSource = fs.readFileSync(path.join(ROOT, 'phase8-formal-bridge.js'), 'utf8');
assert(/\.tmrp-ecology-forecast/.test(bridgeSource), 'forecast rows should have explicit right-rail styling');
assert(!/\.tmrp-ecology-actions/.test(bridgeSource), 'forecast rows should not style direct relation command buttons');

let html = bridge.rightrail.renderers.ol();
assert(/tmrp-ecology-forecast/.test(html), 'ecology relation row should render forecast text');
assert(/预期/.test(html), 'forecast should be labeled as expected effect');
assert(/诏书/.test(html) && /奏疏/.test(html) && /问对/.test(html) && /朝议/.test(html) && /鸿雁/.test(html), 'forecast should point players to formal operation routes');
assert(/reduce tax and levy pressure/.test(html), 'forecast should name the class demand that formal routes can address');
assert(/Relief League\/Canal Tenants/.test(html), 'forecast should name the party-class relation being observed');
assert(/亲和 44/.test(html) && /信 41/.test(html) && /怨 61/.test(html), 'relation row should still show current relation state');
assert(/民变苗头/.test(html), 'forecast should surface class risk before intervention');
assert(/建议廷议/.test(html), 'high-risk relation should recommend court debate');
assert(!/data-forecast=/.test(html), 'forecast should remain display-only and not become action metadata');
assert(!/data-right-action="social-relation"/.test(html), 'forecast should not expose direct relation actions');
assert(!/data-relation-command=/.test(html), 'forecast should not expose direct relation commands');
assert(/data-right-action="social-action"[^>]*data-social-command="chaoyi"/.test(html), 'formal court route should remain available beside forecast');
assert(/data-right-action="social-action"[^>]*data-social-command="edict"/.test(html), 'formal edict route should remain available beside forecast');

bridge.rightrail.handleRightPanelAction('social-action', {
  actorType: 'class',
  name: 'Canal Tenants',
  socialCommand: 'chaoyi',
  buttonText: '付廷议'
});
assert(playerSignals.some(x => x.payload && x.payload.action === 'social-action' && /付廷议/.test(x.payload.text)), 'formal route should enter player action signal text');
assert(!playerSignals.some(x => x.payload && Object.prototype.hasOwnProperty.call(x.payload, 'relationForecast')), 'formal route payload should not carry direct relation forecast fields');
assert(llmActions.some(x => x && x.action === 'social-action' && /付廷议/.test(x.text)), 'formal route should notify LLM calibration path');
assert(!llmActions.some(x => x && Object.prototype.hasOwnProperty.call(x, 'relationForecast')), 'LLM calibration payload should not carry direct relation forecast fields');

console.log('[smoke-phase8-party-class-relation-forecast] PASS phase8 formal-route relation forecast');
