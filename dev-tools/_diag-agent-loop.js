// 用 mock caller 跑通整条 agent loop·证明工具改动真落进 draft(API正常时#4不存在)
global.window = undefined;
var AA = require('../editor-authoring-agent.js');
console.log('AA loaded:', !!AA, 'runAuthoringLoop:', typeof AA.runAuthoringLoop);

var scenario = { id: 'sc-test', name: '原名', characters: [{ name: '甲', loyalty: 50 }], factions: [{ name: '某势力' }] };
var draft = AA.makeDraft(scenario);

var step = 0;
function mockCaller(conversation, tools, opts) {
  step++;
  if (step === 1) {
    return Promise.resolve({ text: '我来改剧本名和人物忠诚', toolCalls: [
      { id: 't1', name: 'applyEdit', input: { path: 'name', value: '【已改】新名', reason: '测试' } },
      { id: 't2', name: 'applyEdit', input: { path: 'characters.0.loyalty', value: 88, reason: '测试' } }
    ] });
  }
  return Promise.resolve({ text: '改完了', toolCalls: [{ id: 'tf', name: 'finish', input: { summary: '改了名和忠诚' } }] });
}

AA.runAuthoringLoop(draft, '把剧本名改成新名，甲忠诚改88', { caller: mockCaller, maxIterations: 5, blockingChecks: [] })
  .then(function (res) {
    console.log('finished:', res.finished, 'stopReason:', res.stopReason);
    console.log('draft.name:', draft.name, '(应=【已改】新名)');
    console.log('draft.characters[0].loyalty:', draft.characters[0].loyalty, '(应=88)');
    console.log('res.draft===draft:', res.draft === draft);
    console.log('summary:', res.summary);
    var ok = res.finished && draft.name === '【已改】新名' && draft.characters[0].loyalty === 88 && res.draft === draft;
    console.log(ok ? 'PASS: 整条 loop→draft 改动真落地' : 'FAIL');
    process.exit(ok ? 0 : 1);
  })
  .catch(function (e) { console.error('ERR', e && e.stack || e); process.exit(2); });
