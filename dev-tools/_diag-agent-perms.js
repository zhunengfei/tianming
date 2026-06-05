global.window = undefined;
var AA = require('../editor-authoring-agent.js');
var sc = { id:'sc', name:'测试', characters:[{name:'甲'}] };
var draft = AA.makeDraft(sc);
var captured = {};
function mockCaller(conv, tools, opts){
  captured.system = opts.system;
  // 写一个剧本里完全不存在的自定义字段 + 嵌套结构
  return Promise.resolve({ text:'写自定义字段', toolCalls:[
    { id:'e1', name:'applyEdit', input:{ path:'customLore.legend', value:'武则天传说', reason:'扩展' } },
    { id:'e2', name:'applyEdit', input:{ path:'characters.0.secretBackstory', value:'隐藏身世', reason:'扩展' } },
    { id:'f', name:'finish', input:{ summary:'加了自定义字段' } }
  ] });
}
AA.runAuthoringLoop(draft, '加自定义字段', { caller: mockCaller, blockingChecks: [] }).then(function(res){
  var sysHas10 = /高权限|可写任意字段|自定义字段/.test(captured.system||'');
  var wroteCustom = draft.customLore && draft.customLore.legend === '武则天传说';
  var wroteNested = draft.characters[0].secretBackstory === '隐藏身世';
  console.log('系统提示词含⑩高权限?', sysHas10);
  console.log('写入非schema顶层字段 customLore.legend?', wroteCustom, '=', draft.customLore && draft.customLore.legend);
  console.log('写入人物非schema字段 secretBackstory?', wroteNested);
  console.log('默认maxIterations(放宽后)?', res.iterations, '(finished='+res.finished+')');
  console.log((sysHas10 && wroteCustom && wroteNested) ? 'PASS: 高权限·任意字段可写+提示词到位' : 'FAIL');
  process.exit((sysHas10 && wroteCustom && wroteNested)?0:1);
}).catch(function(e){console.error('ERR',e);process.exit(2);});
