#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 验·P-ZV7 皇权 ③封顶 + ①A选择性衰减 + ⑤读档削平（同骨架·皇权自己的数·高位反噬另走民心倒U不在此）
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(c, l) { if (!c) throw new Error('[FAIL] ' + l); passed++; console.log('  ok ' + l); }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {}, setInterval: () => {}, clearInterval: () => {},
  addEB: () => {}, toast: () => {}, _dbg: () => {},
  addEventListener: () => {}, removeEventListener: () => {}, document: { addEventListener: () => {} }
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-integration-bridge.js'), 'utf8'), sandbox, { filename: 'tm-integration-bridge.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-authority-engines.js'), 'utf8'), sandbox, { filename: 'tm-authority-engines.js' });
const AE = sandbox.AuthorityEngines;
assert(AE && typeof AE.adjustHuangquan === 'function', 'AuthorityEngines.adjustHuangquan 已导出');
assert(typeof AE.regularizeHuangquanCaps === 'function', 'AuthorityEngines.regularizeHuangquanCaps 已导出');

function freshHQ(chars) {
  sandbox.GM = { turn: 5, chars: chars || [] };
  AE.init();
  var hq = sandbox.GM.huangquan;
  hq.index = 55;
  if (!hq.ministers) hq.ministers = {};
  return hq;
}

// A ③封顶·加分源：大狱清洗 ceiling +18
var hq = freshHQ();
AE.adjustHuangquan('purge', 30, '大狱清洗');
assert(hq.sources.purge === 18 && hq.index === 73, 'A 清洗 +30 → 削到 ceiling +18（index 55→73）·实得 index=' + hq.index + ' src=' + hq.sources.purge);
AE.adjustHuangquan('purge', 30, '再清洗');
assert(hq.sources.purge === 18 && hq.index === 73, 'A2 到顶再加无效·实得 index=' + hq.index);

// B ③封顶·扣分源：主少国疑 floor −25
hq = freshHQ();
AE.adjustHuangquan('youngOrIllness', -40, '主少国疑');
assert(hq.drains.youngOrIllness === 25 && hq.index === 30, 'B 主少国疑 −40 → 削到 floor −25（index 55→30）·实得 index=' + hq.index + ' drain=' + hq.drains.youngOrIllness);

// C ①A 事件类（军败）每回合衰 0.5 回血
hq = freshHQ();
AE.adjustHuangquan('militaryDefeat', -10, '大败');
AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.militaryDefeat === 9.5, 'C 军败(事件类) drain 每回合衰 0.5（10→9.5）·实得 ' + hq.drains.militaryDefeat);

// D ①A 状态类·权臣坐大：前因在 → 维持(不回暖)
hq = freshHQ([{ name: '严嵩', officialTitle: '内阁首辅', alive: true, _tenureMonths: 72, ambition: 80 }]);
hq.drains.trustedMinister = 10;
AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.trustedMinister >= 10, 'D 权臣仍坐大(前因在) → trustedMinister 不回暖（维持·实得 ' + hq.drains.trustedMinister.toFixed(2) + '）');

// E ①A 状态类·权臣倒台：前因消失 → 回暖
hq = freshHQ([]);
hq.drains.trustedMinister = 10;
AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.trustedMinister === 9.5, 'E 权臣倒台(前因消失) → trustedMinister 回暖 0.5（10→9.5）·实得 ' + hq.drains.trustedMinister);

// F 无前因信号的持续状态(内阁化)：不假回血也不乱衰
hq = freshHQ([]);
hq.drains.cabinetization = 12;
AE.tick({ turn: 6, monthRatio: 1 });
assert(hq.drains.cabinetization === 12, 'F 内阁化(暂无前因信号) → 不自动回暖/不假回血（仍 12）·实得 ' + hq.drains.cabinetization);

// G ⑤读档削平：老档超 cap 的 drain 夹回 + 回血 index
hq = freshHQ();
hq.drains.trustedMinister = 40; hq.index = 20;
var r = AE.regularizeHuangquanCaps(sandbox.GM);
assert(hq.drains.trustedMinister === 22, 'G 削平·权臣 drain 40 → 夹回 22·实得 ' + hq.drains.trustedMinister);
assert(hq.index === 38, 'G2 削平·超额 18 回血 index（20→38）·实得 ' + hq.index);
assert(r.adjusted >= 1, 'G3 regularize 报告调整项数·实得 ' + r.adjusted);

console.log('\nALL PASS · ' + passed + ' assertions · 皇权 ③①A⑤ 生效');
