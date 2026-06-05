global.window = undefined;
var AA = require('../editor-authoring-agent.js');
var sc = { id:'sc', name:'测试', characters:[{name:'甲'}], factions:[{name:'明'}] };
var draft = AA.makeDraft(sc);
var memory = '· [已应用] 06-05 · 「加武则天」→ 创建武则天+武周势力\n· [已应用] 06-05 · 「补开场白」→ 补全开场白';
var captured = {};
function mockCaller(conv, tools, opts){ captured.firstUser = conv[0] && conv[0].text; return Promise.resolve({text:'ok',toolCalls:[{id:'f',name:'finish',input:{summary:'done'}}]}); }
AA.runAuthoringLoop(draft, '继续加个李白', { caller: mockCaller, memory: memory, blockingChecks: [] }).then(function(){
  var hasMem = /跨会话记忆|武则天|武周/.test(captured.firstUser||'');
  console.log('初始user含跨会话记忆(武则天/武周)?', hasMem);
  console.log(hasMem ? 'PASS: 跨会话记忆已注入提示词' : 'FAIL');
  process.exit(hasMem?0:1);
}).catch(function(e){console.error('ERR',e);process.exit(2);});
