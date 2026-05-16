#!/usr/bin/env node
/* eslint-env node */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const hongyan = fs.readFileSync(path.join(ROOT, 'tm-hongyan-office.js'), 'utf8');
const formal = fs.readFileSync(path.join(ROOT, 'phase8-formal-bridge.js'), 'utf8');

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
}

assert(hongyan.includes('function _edictUiRoot'), 'active edict UI root helper missing');
assert(hongyan.includes("document.getElementById('tm-action-edict-overlay')"), 'formal edict overlay is not preferred');
assert(hongyan.includes('function _edictEl'), 'scoped edict element helper missing');
assert(hongyan.includes('var el = _edictEl(cat.id);'), 'polish input collection is not scoped to active panel');
assert(hongyan.includes("var panel = _edictEl('edict-polished');"), 'polish result panel is not scoped to active panel');
assert(hongyan.includes("var ta = _edictEl('edict-polished-text');"), 'polished text apply is not scoped to active panel');
assert(hongyan.includes('window._polishEdicts = _polishEdicts;'), 'polish function is not explicitly exported');
assert(hongyan.includes('window._applyPolishedEdict = _applyPolishedEdict;'), 'apply-polished function is not explicitly exported');
assert(hongyan.includes("onclick=\"_hidePolishedEdict()\""), 'polish hide action still uses global duplicate id lookup');
assert(formal.includes("if(window._polishEdicts)window._polishEdicts();else"), 'formal edict polish button lacks loaded-state feedback');

console.log(`[smoke-formal-edict-polish-scope] PASS ${passed} assertions`);
