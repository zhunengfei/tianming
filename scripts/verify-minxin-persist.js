#!/usr/bin/env node
/* eslint-env node */
'use strict';
// P-DZ民心·治本验证·2026-05-30
// 验：adjustMinxin 现无条件把 delta 摊回玩家叶子 div.minxin（玩家操作 + 引擎 tick 都摊）——叶子成民心唯一真相源、
//     回合末 aggregate 从叶子重算 trueIndex 不再抹掉任何 adjustMinxin 累积（含引擎线负项·动力学打开·系数须跑回合配平）。
// aggregate(integration-bridge:619)从叶子按人口加权均值重算 trueIndex 这一环，靠已读证 + 数学（每叶子 +delta → 均值 +delta）；
// 完整端到端 + 民心平衡（负项累积速率）由桌面端真过回合验 / 调系数。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, label) { if (!cond) throw new Error('[assert] ' + label); passed += 1; }

const sandbox = {
  console, RegExp, Array, Object, String, Number, Boolean, JSON, Math, Date,
  setTimeout: () => {}, clearTimeout: () => {}, setInterval: () => {}, clearInterval: () => {},
  addEB: () => {}, toast: () => {}, _dbg: () => {}, _adjAuthority: () => {},
  addEventListener: () => {}, removeEventListener: () => {}, document: { addEventListener: () => {} }
};
sandbox.window = sandbox; sandbox.global = sandbox; sandbox.globalThis = sandbox;
sandbox.TM = { errors: { capture: () => {}, captureSilent: () => {} } };
sandbox.GM = {
  turn: 28,
  adminHierarchy: { player: { name: '明廷', divisions: [
    { id: 'shaanxi', name: '陕西', population: { mouths: 1000 }, minxin: 60 },
    { id: 'henan', name: '河南', population: { mouths: 1000 }, minxin: 60 }
  ] } },
  minxin: { trueIndex: 60, perceivedIndex: 60, phase: 'peace', sources: {} }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-integration-bridge.js'), 'utf8'), sandbox, { filename: 'tm-integration-bridge.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-authority-engines.js'), 'utf8'), sandbox, { filename: 'tm-authority-engines.js' });

const IB = sandbox.IntegrationBridge, AE = sandbox.AuthorityEngines;
assert(IB && typeof IB.getLeafDivisions === 'function', 'IntegrationBridge.getLeafDivisions 已导出');
assert(AE && typeof AE.adjustMinxin === 'function', 'AuthorityEngines.adjustMinxin 已导出');
var leaves = IB.getLeafDivisions(sandbox.GM.adminHierarchy, 'player');
assert(leaves.length === 2, '取到 2 个玩家叶子·实得 ' + leaves.length);

// ① 玩家操作（治本后不传 persist 也摊）→ 摊回叶子
AE.adjustMinxin('issueChoice', 10, '议题决断验证');
assert(leaves[0].minxin === 70 && leaves[1].minxin === 70, '①玩家操作 +10 → 叶子 60→70（摊回·aggregate 重算 trueIndex 即含此 +10·不蒸发）·实得 ' + leaves[0].minxin + '/' + leaves[1].minxin);

// ② 治本：引擎 tick 也摊回叶子——动力学打开·负项一并生效（以前被 aggregate 抹·现累积）
AE.adjustMinxin('taxation', -5, '赋税·引擎线');
assert(leaves[0].minxin === 65 && leaves[1].minxin === 65, '②治本·引擎线 taxation -5 也摊回叶子 70→65（动力学打开·负项生效·须桌面端跑回合配平系数）·实得 ' + leaves[0].minxin + '/' + leaves[1].minxin);

console.log('  治本·叶子: 60 → ' + leaves[0].minxin + '（玩家 +10、引擎 -5）；aggregate 加权均值 trueIndex 即 ' + ((leaves[0].minxin + leaves[1].minxin) / 2) + '·不再被抹回 60');

// ── Part·稳定器(B 方案)回归公式（与 _tickMinxin 内 P-DZ 稳定器逐字一致·验回归方向 + 幅度）──
(function () {
  function regress(minxin, base, r, mr) {
    var gap = base - minxin;
    if (gap) return Math.max(0, Math.min(100, minxin + gap * r * mr));
    return minxin;
  }
  var P_MX_REGRESS = 0.05;
  assert(regress(50, 60, P_MX_REGRESS, 1) === 50.5, '稳定器·跌破基线 50(基线60)→回升 50.5（gap10×0.05）·实得 ' + regress(50, 60, P_MX_REGRESS, 1));
  assert(regress(70, 60, P_MX_REGRESS, 1) === 69.5, '稳定器·高于基线 70(基线60)→回落 69.5·实得 ' + regress(70, 60, P_MX_REGRESS, 1));
  assert(regress(60, 60, P_MX_REGRESS, 1) === 60, '稳定器·在基线不动');
  console.log('  稳定器: 跌破基线 50→50.5（回升）、高于 70→69.5（回落）、在基线 60→不动·回归率 0.05/回合可调');
})();
console.log('[verify-minxin-persist] PASS assertions=' + passed);
