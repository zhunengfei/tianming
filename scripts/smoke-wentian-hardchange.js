// smoke-wentian-hardchange.js - guard Wentian console hard-change paths and Tianyi direct writes.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'tm-game-loop.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

const start = src.indexOf('function _wtNormalizeHardChangePath');
const end = src.indexOf('function _wtReviseFromPending');
assert(start >= 0 && end > start, 'Wentian hard-change helper block missing');

const context = {
  console,
  GM: {
    guoku: { money: 100, balance: 100 },
    huangquan: { index: 50 },
    huangwei: { index: 60, subDims: { court: { value: 60 }, military: { value: 60 } } },
    minxin: { trueIndex: 45 },
    corruption: {
      trueIndex: 70,
      overall: 70,
      perceivedIndex: 65,
      subDepts: {
        central: { true: 70, perceived: 64 },
        fiscal: { true: 72 }
      }
    },
    chars: [{ name: '甲', loyalty: 20 }],
    _listeners: { varChange: [] }
  },
  P: {},
  renderLeftPanel() {},
  renderGameState() {},
  renderGuokuPanel() {},
  renderNeitangPanel() {},
  renderRenwu() {},
  addEB() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(src.slice(start, end), context, { filename: 'wentian-hardchange-block.js' });

assert(context._wtNormalizeHardChangePath('vars.皇权.value') === 'huangquan.index', '皇权 vars alias should target real huangquan index');
assert(context._wtNormalizeHardChangePath('vars.皇威.value') === 'huangwei.index', '皇威 vars alias should target real huangwei index');
assert(context._wtNormalizeHardChangePath('vars.腐败.value') === 'corruption.trueIndex', '腐败 vars alias should target real corruption index');
assert(context._wtNormalizeHardChangePath('chars[0].loyalty') === 'chars.0.loyalty', 'bracket index path should normalize');

assert(context._wtApplyHardChange('vars.皇权.value', 'set', '88') === true, '皇权 alias hard change should apply');
assert(context.GM.huangquan.index === 88, '皇权 should write GM.huangquan.index');
assert(!context.GM.vars, 'Wentian should not create shadow GM.vars for core variables');

assert(context._wtApplyHardChange('vars.皇威.value', 'add', 5) === true, '皇威 alias hard change should apply');
assert(context.GM.huangwei.index === 65, '皇威 add should write GM.huangwei.index');
assert(context.GM.huangwei.subDims.court.value === 65, '皇威 direct set should sync sub dim values');

assert(context._wtApplyHardChange('vars.腐败.value', 'set', 25) === true, '腐败 alias hard change should apply');
assert(context.GM.corruption.trueIndex === 25, '腐败 should write trueIndex');
assert(context.GM.corruption.overall === 25, '腐败 should sync overall compatibility field');
assert(context.GM.corruption.subDepts.central.true === 25, '腐败 global direct set should sync sub dept true value');
assert(context.GM.corruption.subDepts.fiscal.true === 25, '腐败 global direct set should sync all sub dept true values');

assert(context._wtApplyHardChange('chars[0].loyalty', 'set', 99) === true, 'character bracket path should apply');
assert(context.GM.chars[0].loyalty === 99, 'character bracket path should write the indexed character');

assert(src.includes("p.category === 'absolute'") && src.includes('p.hardChange && p.hardChange.path') && src.includes('_wtApplyHardChange(ahc.path'), 'Tianyi branch should immediately apply hardChange payloads');
assert(src.includes('category":"narrative|setting|hardChange|edictSubstitute|absolute"'), 'Wentian parser JSON schema should allow absolute category');

console.log('[smoke-wentian-hardchange] PASS');
